"""Exercise a packaged GUI, its worker, CSV writer and bundled extraction imports."""
import csv
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def main():
    binary = Path(sys.argv[1]).resolve()
    with tempfile.TemporaryDirectory(prefix="zerowaste-smoke-") as temp:
        env = dict(os.environ, QT_QPA_PLATFORM="offscreen")
        subprocess.run([str(binary), "--smoke-test", temp], env=env, check=True, timeout=75)
        report = json.loads((Path(temp) / "report.json").read_text(encoding="utf-8"))
        assert report["rows"] > 0 and report["all_demo"], report
        with (Path(temp) / "demo.csv").open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.reader(handle))
        assert len(rows) == report["rows"] + 1
        assert len(rows[0]) == report["columns"] == 14
        assert (Path(temp) / "demo.png").stat().st_size > 1000
        print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
