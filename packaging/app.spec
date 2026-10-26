import sys
import importlib.metadata
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, copy_metadata

root = Path(SPECPATH).parent
datas = [(str(root / "README.md"), "."), (str(root / "THIRD_PARTY_NOTICES.md"), ".")]
for package in ("trafilatura", "courlan", "htmldate", "dateparser", "certifi"):
    datas += collect_data_files(package)
for distribution in importlib.metadata.distributions():
    # Preserve package licenses and metadata, including Qt's component notices.
    datas += copy_metadata(distribution.metadata["Name"])

a = Analysis([str(root / "scripts" / "desktop_entry.py")],
             pathex=[str(root / "src")], binaries=[], datas=datas,
             hiddenimports=["keyring.backends.macOS"] if sys.platform == "darwin" else
                           ["keyring.backends.Windows"] if sys.platform == "win32" else
                           ["keyring.backends.SecretService"],
             excludes=["PySide6.QtWebEngineCore", "PySide6.QtWebEngineWidgets", "tkinter"],
             noarchive=False)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name="ZeroWasteListener",
          debug=False, strip=False, upx=False, console=False,
          contents_directory="_internal")
collection = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="ZeroWasteListener")
if sys.platform == "darwin":
    app = BUNDLE(collection, name="ZeroWasteListener.app", bundle_identifier="org.zerowasteresearch.listener",
                 info_plist={"CFBundleShortVersionString": "0.1.0", "NSHighResolutionCapable": True,
                             "LSMinimumSystemVersion": "12.0"})
