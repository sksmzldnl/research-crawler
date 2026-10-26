"""Create a shareable source archive, excluding local state and API credentials."""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    target = ROOT / "dist" / "ZeroWasteListener-0.1.0-source.zip"
    target.parent.mkdir(exist_ok=True)
    files = [ROOT / name for name in ("README.md", "THIRD_PARTY_NOTICES.md", "pyproject.toml", "uv.lock", ".gitignore")]
    for name in ("src", "tests", "scripts", "packaging", ".github"):
        files.extend(path for path in (ROOT / name).rglob("*") if path.is_file() and "__pycache__" not in path.parts)
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(files):
            archive.write(file, Path("research-crawler") / file.relative_to(ROOT))
    print(target)


if __name__ == "__main__":
    main()
