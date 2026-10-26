"""Static inspection of a macOS bundle; this does not execute macOS code."""
import json
from pathlib import Path
import plistlib
import stat
import struct
import sys

CPU_TYPES = {0x01000007: "x86_64", 0x0100000C: "arm64"}


def macho_slices(path):
    with Path(path).open("rb") as handle:
        header = handle.read(8)
        if len(header) < 8:
            return []
        magic = header[:4]
        if magic in {b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf"}:
            order = "<" if magic[0] == 0xCF else ">"
            return [(0, CPU_TYPES.get(struct.unpack(order + "I", header[4:8])[0], "unknown"))]
        if magic in {b"\xca\xfe\xba\xbe", b"\xca\xfe\xba\xbf"}:
            count = struct.unpack(">I", header[4:8])[0]
            if not 0 < count < 16:
                raise ValueError(f"Invalid fat Mach-O header: {path}")
            entries = []
            for _ in range(count):
                record = handle.read(32 if magic[-1] == 0xBF else 20)
                cpu, _, offset = struct.unpack(">IIQ" if magic[-1] == 0xBF else ">III", record[:16 if magic[-1] == 0xBF else 12])
                entries.append((offset, CPU_TYPES.get(cpu, "unknown")))
            return entries
    return []


def inspect_slice(path, offset):
    with Path(path).open("rb") as handle:
        handle.seek(offset)
        header = handle.read(32)
        order = "<" if header[:4] == b"\xcf\xfa\xed\xfe" else ">"
        fields = struct.unpack(order + "8I", header)
        ncmds, size = fields[4:6]
        if ncmds > 10000 or size > 4_000_000:
            raise ValueError(f"Invalid Mach-O commands: {path}")
        commands = handle.read(size)
    cursor, minimum, signatures = 0, (0, 0, 0), False
    for _ in range(ncmds):
        command, length = struct.unpack_from(order + "II", commands, cursor)
        if length < 8 or cursor + length > len(commands):
            raise ValueError(f"Truncated Mach-O: {path}")
        if command == 0x24:  # LC_VERSION_MIN_MACOSX
            value = struct.unpack_from(order + "I", commands, cursor + 8)[0]
            minimum = max(minimum, (value >> 16, (value >> 8) & 0xFF, value & 0xFF))
        elif command == 0x32:  # LC_BUILD_VERSION
            platform, value = struct.unpack_from(order + "II", commands, cursor + 8)
            if platform != 1:
                raise ValueError(f"Non-macOS binary in app: {path}")
            minimum = max(minimum, (value >> 16, (value >> 8) & 0xFF, value & 0xFF))
        signatures |= command == 0x1D
        cursor += length
    return minimum, signatures


def check_dylib_links(path, offset, executable):
    """Check bundled dylib paths without relying on a developer's Homebrew install."""
    with Path(path).open("rb") as handle:
        handle.seek(offset)
        header = handle.read(32)
        order = "<" if header[:4] == b"\xcf\xfa\xed\xfe" else ">"
        fields = struct.unpack(order + "8I", header)
        commands = handle.read(fields[5])
    cursor, rpaths, dependencies = 0, [], []
    for _ in range(fields[4]):
        command, length = struct.unpack_from(order + "II", commands, cursor)
        if command in {0xC, 0x8000001C, 0x8000001F, 0x80000023}:
            start = struct.unpack_from(order + "I", commands, cursor + 8)[0]
            name = commands[cursor + start:cursor + length].split(b"\0")[0].decode()
            (rpaths if command == 0x8000001C else dependencies).append(name)
        cursor += length

    def expand(value):
        return value.replace("@loader_path", str(path.parent)).replace("@executable_path", str(executable.parent))

    for dependency in dependencies:
        if dependency.startswith(("/System/Library/", "/usr/lib/")):
            continue
        if dependency.startswith("@rpath/"):
            candidates = [Path(expand(r)) / dependency[len("@rpath/"):] for r in rpaths]
        else:
            candidates = [Path(expand(dependency))]
        if not any(candidate.is_file() for candidate in candidates):
            raise ValueError(f"Unresolved bundled library in {path.name}: {dependency}")
    return len(dependencies)


def verify_bundle(app, architecture):
    app = Path(app).resolve()
    contents = app / "Contents"
    with (contents / "Info.plist").open("rb") as handle:
        info = plistlib.load(handle)
    assert info["CFBundleIdentifier"] == "org.zerowasteresearch.listener"
    assert info["CFBundlePackageType"] == "APPL"
    launcher = contents / "MacOS" / info["CFBundleExecutable"]
    assert launcher.is_file() and launcher.stat().st_mode & stat.S_IXUSR
    assert launcher.read_bytes().startswith(b"#!/bin/sh\n")
    resources = contents / "Resources"
    required = [resources / "runtime/bin/python3.12", resources / "bootstrap.py",
                resources / "application/zerowaste_listener/app.py",
                resources / "packages/PySide6/QtCore.abi3.so",
                resources / "packages/PySide6/QtGui.abi3.so",
                resources / "packages/PySide6/QtWidgets.abi3.so",
                resources / "packages/PySide6/Qt/plugins/platforms/libqcocoa.dylib",
                resources / "packages/certifi/cacert.pem", resources / "THIRD_PARTY_NOTICES.md"]
    for path in required:
        if not path.is_file():
            raise ValueError(f"Missing bundle file: {path.relative_to(app)}")
    binaries, unsigned, minimum, links = 0, [], (12, 0, 0), 0
    for path in app.rglob("*"):
        if path.is_symlink():
            if not path.resolve().is_relative_to(app) or not path.exists():
                raise ValueError(f"Broken or external app symlink: {path.relative_to(app)}")
            continue
        if not path.is_file():
            continue
        with path.open("rb") as handle:
            magic = handle.read(4)
        if magic == b"\x7fELF":
            raise ValueError(f"Linux ELF in Mac app: {path.relative_to(app)}")
        slices = macho_slices(path)
        if slices:
            if architecture not in {arch for _, arch in slices}:
                raise ValueError(f"Incorrect architecture in {path.relative_to(app)}")
            binaries += 1
            for offset, arch in slices:
                if arch == architecture:
                    target, signed = inspect_slice(path, offset)
                    links += check_dylib_links(path, offset, required[0])
                    minimum = max(minimum, target)
                    if not signed:
                        unsigned.append(str(path.relative_to(app)))
    # Runtime, Qt modules, platform plugin and extraction extensions must be native macOS files.
    for path in [required[0], *required[3:7]]:
        assert architecture in {arch for _, arch in macho_slices(path)}, path
    assert binaries > 10
    declared = tuple(int(n) for n in info["LSMinimumSystemVersion"].split("."))
    declared = declared + (0,) * (3 - len(declared))
    if declared < minimum:
        raise ValueError(f"Bundle declares macOS {declared}, binaries require {minimum}")
    return {"architecture": architecture, "mach_o_files": binaries,
            "dylib_references_checked": links,
            "minimum_macos": ".".join(map(str, minimum)), "unsigned_mach_o_files": unsigned,
            "bundle_structure": "passed", "native_execution": "not_run", "developer_id_notarization": "not_applied"}


if __name__ == "__main__":
    print(json.dumps(verify_bundle(sys.argv[1], sys.argv[2]), ensure_ascii=False, indent=2))
