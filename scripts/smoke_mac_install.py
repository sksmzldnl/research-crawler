"""Verify a Mac app after copying it, launching through Finder/LaunchServices.

Requires an actual Mac with a graphical login session. Not runnable on Linux.
"""
import csv
import json
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tempfile


def main():
    if sys.platform != "darwin":
        raise SystemExit("This check requires an actual Mac; static validation is a separate check.")
    source = Path(sys.argv[1]).resolve()
    with tempfile.TemporaryDirectory(prefix="Zero Waste Mac Install ") as temp:
        folder = Path(temp)
        installed = folder / "Applications" / source.name
        installed.parent.mkdir()
        shutil.copytree(source, installed, symlinks=True)
        output = folder / "research results"
        subprocess.run(["open", "-n", "-W", str(installed), "--args", "--smoke-test", str(output)],
                       check=True, timeout=75)
        report = json.loads((output / "report.json").read_text(encoding="utf-8"))
        assert report["rows"] > 0 and report["all_demo"] and report["columns"] == 14, report
        with (output / "demo.csv").open(encoding="utf-8-sig", newline="") as handle:
            assert len(list(csv.reader(handle))) == report["rows"] + 1
        assert (output / "demo.png").stat().st_size > 1000
        print(json.dumps({"macos": platform.mac_ver()[0], "architecture": platform.machine(),
                          "launch_services": "passed", "copied_app_ui_and_csv": "passed"}))


if __name__ == "__main__":
    main()
