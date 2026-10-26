# Third-party software

Zero Waste Listener uses third-party libraries. Their copyrights and licenses remain with their respective authors. This notice is an index, not a replacement for the complete license texts shipped with those packages.

| Component | License / upstream |
| --- | --- |
| Python | [PSF License](https://docs.python.org/3/license.html) |
| PySide6 / Shiboken6 / Qt | [LGPL v3 / GPL v3 / commercial, with Qt component-specific notices](https://doc.qt.io/qtforpython-6/licenses.html) |
| HTTPX | [BSD-3-Clause](https://github.com/encode/httpx/blob/master/LICENSE.md) |
| trafilatura | [Apache-2.0](https://github.com/adbar/trafilatura/blob/master/LICENSE) |
| keyring | [MIT](https://github.com/jaraco/keyring/blob/main/LICENSE) |
| PyInstaller | [GPL v2 with bootloader distribution exception](https://pyinstaller.org/en/stable/license.html) |

The dependency inventory and exact versions are in `uv.lock`. The installer includes dependency metadata/license files collected during packaging. Keep the entire packaged directory, including shared Qt libraries and license notices, together. Distributors must review the complete applicable dependency licenses, including transitive dependencies and Qt's LGPL requirements.
