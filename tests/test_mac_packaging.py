import importlib.util
import os
from pathlib import Path
import stat
import struct
import subprocess
import sys
import zipfile

import pytest

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
from build_mac_bundle import write_zip
from verify_mac_bundle import macho_slices, inspect_slice, check_dylib_links

ROOT = SCRIPTS.parent


def thin_macho(cpu, minimum=(12 << 16), commands=b"", count=0):
    build = struct.pack("<6I", 0x32, 24, 1, minimum, minimum, 0)
    signature = struct.pack("<4I", 0x1D, 16, 0, 0)
    data = build + signature + commands
    return struct.pack("<8I", 0xFEEDFACF, cpu, 0, 2, count + 2, len(data), 0, 0) + data


def test_macho_architecture_and_minimum_os(tmp_path):
    binary = tmp_path / "python"
    binary.write_bytes(thin_macho(0x0100000C))
    assert macho_slices(binary) == [(0, "arm64")]
    assert inspect_slice(binary, 0) == ((12, 0, 0), True)


def test_universal_binary_slices(tmp_path):
    arm = thin_macho(0x0100000C)
    intel = thin_macho(0x01000007)
    first = 48
    second = first + len(arm)
    data = struct.pack(">II", 0xCAFEBABE, 2)
    data += struct.pack(">5I", 0x0100000C, 0, first, len(arm), 0)
    data += struct.pack(">5I", 0x01000007, 0, second, len(intel), 0)
    binary = tmp_path / "universal"
    binary.write_bytes(data + arm + intel)
    assert macho_slices(binary) == [(first, "arm64"), (second, "x86_64")]
    assert inspect_slice(binary, second)[0] == (12, 0, 0)


def test_dylib_resolution_fails_for_developer_only_dependency(tmp_path):
    name = b"/usr/local/opt/missing/lib.dylib\0"
    command = struct.pack("<6I", 0xC, 24 + len(name), 24, 0, 0, 0) + name
    binary = tmp_path / "python"
    binary.write_bytes(thin_macho(0x0100000C, commands=command, count=1))
    with pytest.raises(ValueError, match="Unresolved"):
        check_dylib_links(binary, 0, binary)


def test_mac_zip_keeps_executables_symlinks_and_unicode(tmp_path):
    folder = tmp_path / "archive"
    executable = folder / "App.app/Contents/MacOS/launch"
    executable.parent.mkdir(parents=True)
    executable.write_text("#!/bin/sh\nexit 0\n")
    executable.chmod(0o755)
    link = executable.with_name("alias")
    link.symlink_to("launch")
    (folder / "설치 안내.txt").write_text("응용 프로그램으로 복사하세요", encoding="utf-8")
    output = tmp_path / "mac.zip"
    write_zip(folder, output)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert archive.getinfo("App.app/Contents/MacOS/launch").external_attr >> 16 & stat.S_IXUSR
        assert stat.S_ISLNK(archive.getinfo("App.app/Contents/MacOS/alias").external_attr >> 16)
        assert archive.read("App.app/Contents/MacOS/alias") == b"launch"
        assert archive.read("설치 안내.txt").decode() == "응용 프로그램으로 복사하세요"


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX shell launcher; Windows uses its own executable")
def test_launcher_bundled_python_path_with_spaces(tmp_path):
    contents = tmp_path / "Folder with spaces 한글/App.app/Contents"
    macos = contents / "MacOS"
    runtime = contents / "Resources/runtime/bin"
    macos.mkdir(parents=True)
    runtime.mkdir(parents=True)
    launcher = macos / "ZeroWasteListener"
    launcher.write_bytes((ROOT / "packaging/mac_launcher.sh").read_bytes())
    python = runtime / "python3.12"
    python.write_text('#!/bin/sh\nprintf "%s\\n" "$@" > "$TEST_ARGUMENTS"\n')
    python.chmod(0o755)
    output = tmp_path / "arguments.txt"
    subprocess.run(["/bin/sh", str(launcher), "--smoke-test", "path with spaces"], check=True,
                   env=dict(os.environ, ZEROWASTE_LOG_DIR=str(tmp_path / "logs"), TEST_ARGUMENTS=str(output)))
    arguments = output.read_text().splitlines()
    assert arguments[0] == "-I"
    assert arguments[1].endswith("Resources/bootstrap.py")
    assert arguments[2:] == ["--smoke-test", "path with spaces"]
