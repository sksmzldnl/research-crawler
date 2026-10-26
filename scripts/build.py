"""Build on the target OS; no keys or user settings enter the package."""
import hashlib
import platform
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    subprocess.run([sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "packaging/app.spec"], cwd=ROOT, check=True)
    system, arch = platform.system(), platform.machine()
    name = f"ZeroWasteListener-0.1.0-{system}-{arch}"
    dist = ROOT / "dist"
    if system == "Darwin":
        staging = ROOT / "build" / "dmg"
        if staging.exists():
            shutil.rmtree(staging)
        staging.mkdir(parents=True)
        shutil.copytree(dist / "ZeroWasteListener.app", staging / "ZeroWasteListener.app", symlinks=True)
        (staging / "Applications").symlink_to("/Applications")
        output = dist / (name + ".dmg")
        subprocess.run(["hdiutil", "create", "-ov", "-volname", "ZeroWasteListener", "-srcfolder", str(staging),
                        "-format", "UDZO", str(output)], check=True)
    else:
        # Windows zip is also useful as a portable fallback; installer is built by CI.
        output = Path(shutil.make_archive(str(dist / name), "zip", root_dir=dist, base_dir="ZeroWasteListener"))
    checksum = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix(output.suffix + ".sha256").write_text(f"{checksum}  {output.name}\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
