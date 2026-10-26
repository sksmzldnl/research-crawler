"""Assemble an offline-installable macOS .app using verified native binaries.

Can run on Linux. Static validation is intentionally distinct from execution on a Mac.
The native PyInstaller/DMG path remains available in build.py.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import stat
import subprocess
import tarfile
import tempfile
import zipfile

import httpx

from verify_mac_bundle import verify_bundle

ROOT = Path(__file__).resolve().parents[1]


def sha256(path):
    with Path(path).open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def get_runtime(manifest, arch):
    spec = manifest["architectures"][arch]
    cache = ROOT / "build/mac-downloads"
    cache.mkdir(parents=True, exist_ok=True)
    target = cache / spec["filename"]
    if target.exists() and sha256(target) == spec["sha256"]:
        return target
    partial = target.with_suffix(".partial")
    # TLS verification and the inherited session proxy stay enabled.
    with httpx.stream("GET", manifest["source"] + "/" + spec["filename"], follow_redirects=True,
                      timeout=120, trust_env=True) as response:
        if response.status_code != 200:
            raise RuntimeError(f"Python runtime download failed: HTTP {response.status_code}")
        with partial.open("wb") as handle:
            for piece in response.iter_bytes():
                handle.write(piece)
    if sha256(partial) != spec["sha256"]:
        partial.unlink()
        raise RuntimeError("Python runtime checksum mismatch; refusing to package it")
    partial.replace(target)
    return target


def write_zip(folder, output):
    """Preserve executable permissions and symlinks for macOS Archive Utility."""
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(Path(folder).rglob("*")):
            relative = path.relative_to(folder).as_posix()
            if path.is_symlink():
                info = zipfile.ZipInfo(relative)
                info.create_system = 3
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
                archive.writestr(info, os.readlink(path))
            elif path.is_file():
                archive.write(path, relative)
            elif path.is_dir():
                info = zipfile.ZipInfo(relative + "/")
                info.create_system = 3
                info.external_attr = (stat.S_IFDIR | 0o755) << 16
                archive.writestr(info, b"")


def trim_unused_qt_plugins(packages):
    # This app uses QWidget, not QML, Designer, SQL drivers or a virtual keyboard.
    # Essentials includes optional plugins for Addons and system SQL clients;
    # exclude those instead of shipping broken references to absent libraries.
    for name in ("qml", "plugins/designer", "plugins/sqldrivers", "plugins/qmltooling", "plugins/platforminputcontexts"):
        path = packages / "PySide6/Qt" / name
        if path.is_dir():
            shutil.rmtree(path)
    (packages / "PySide6/Qt/plugins/imageformats/libqpdf.dylib").unlink(missing_ok=True)


def build(arch):
    manifest = json.loads((ROOT / "packaging/mac_runtime.json").read_text())
    runtime_archive = get_runtime(manifest, arch)
    cache = str(ROOT.parent / ".cache/uv")
    environment = dict(os.environ, UV_CACHE_DIR=cache)
    (ROOT / "build").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"mac-{arch}-", dir=ROOT / "build") as temp:
        staging = Path(temp)
        app = staging / "ZeroWasteListener.app"
        contents = app / "Contents"
        resources = contents / "Resources"
        macos = contents / "MacOS"
        macos.mkdir(parents=True)
        resources.mkdir()
        extracted = staging / "extracted"
        extracted.mkdir()
        with tarfile.open(runtime_archive, "r:gz") as archive:
            archive.extractall(extracted, filter="data")
        shutil.move(str(extracted / "python"), resources / "runtime")
        requirements = staging / "runtime-requirements.txt"
        subprocess.run(["uv", "export", "--frozen", "--no-dev", "--no-emit-project", "--format", "requirements-txt",
                        "--output-file", str(requirements), "--quiet"], cwd=ROOT, env=environment, check=True)
        subprocess.run(["uv", "pip", "install", "--python-platform", manifest["architectures"][arch]["platform"],
                        "--python-version", manifest["version"], "--target", str(resources / "packages"),
                        "--only-binary", ":all:", "--require-hashes", "-r", str(requirements)],
                       cwd=ROOT, env=environment, check=True)
        trim_unused_qt_plugins(resources / "packages")
        source = resources / "application/zerowaste_listener"
        shutil.copytree(ROOT / "src/zerowaste_listener", source,
                        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        for name in ("README.md", "THIRD_PARTY_NOTICES.md", "uv.lock"):
            shutil.copy2(ROOT / name, resources / name)
        shutil.copy2(ROOT / "packaging/mac_bootstrap.py", resources / "bootstrap.py")
        shutil.copy2(ROOT / "packaging/mac_launcher.sh", macos / "ZeroWasteListener")
        (macos / "ZeroWasteListener").chmod(0o755)
        shutil.copy2(ROOT / "packaging/MAC_INSTALL_KO.txt", staging / "설치 안내.txt")
        shutil.copy2(ROOT / "packaging/MAC_INSTALL_KO.txt", resources / "설치 안내.txt")
        info = {"CFBundleName": "ZeroWasteListener", "CFBundleDisplayName": "새로듣기",
                "CFBundleIdentifier": "org.zerowasteresearch.listener", "CFBundlePackageType": "APPL",
                "CFBundleExecutable": "ZeroWasteListener", "CFBundleVersion": "1",
                "CFBundleShortVersionString": "0.1.0", "NSHighResolutionCapable": True,
                "LSMinimumSystemVersion": "12.0", "LSArchitecturePriority": [arch],
                "LSMultipleInstancesProhibited": True,
                "CFBundleDevelopmentRegion": "ko", "CFBundleLocalizations": ["ko", "en"]}
        with (contents / "Info.plist").open("wb") as handle:
            plistlib.dump(info, handle)
        (contents / "PkgInfo").write_bytes(b"APPL????")
        report = verify_bundle(app, arch)
        report.update(python_version=manifest["version"], python_runtime_sha256=manifest["architectures"][arch]["sha256"],
                      dependency_lock_sha256=sha256(ROOT / "uv.lock"))
        (resources / "build-info.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        output_dir = ROOT / "dist" / f"mac-{arch}"
        if output_dir.exists():
            shutil.rmtree(output_dir)
        output_dir.mkdir(parents=True)
        shutil.move(str(app), output_dir / app.name)
        shutil.copy2(staging / "설치 안내.txt", output_dir / "설치 안내.txt")
    output = ROOT / "dist" / f"ZeroWasteListener-0.1.0-macOS-{arch}-test.zip"
    write_zip(output_dir, output)
    output.with_suffix(output.suffix + ".sha256").write_text(f"{sha256(output)}  {output.name}\n", encoding="utf-8")
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
    print(json.dumps({"artifact": str(output), "bytes": output.stat().st_size, "mach_o_files": report["mach_o_files"],
                      "dylib_references_checked": report["dylib_references_checked"], "native_execution": "not_run"}, ensure_ascii=False))
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arch", choices=["arm64", "x86_64", "all"], default="arm64")
    arguments = parser.parse_args()
    for architecture in (["arm64", "x86_64"] if arguments.arch == "all" else [arguments.arch]):
        build(architecture)
