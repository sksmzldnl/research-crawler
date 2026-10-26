"""Record CI delivery progress in a dedicated branch when API reads are unavailable.

Only explicitly selected non-secret metadata and optional test logs are recorded.
The workflow never supplies application credentials to its smoke tests.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import subprocess


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", required=True, choices=["running", "passed", "failed", "published"])
    parser.add_argument("--stage", required=True)
    parser.add_argument("--channel", default=platform.machine())
    parser.add_argument("--log")
    parser.add_argument("--release-url")
    args = parser.parse_args()
    run = os.environ["GITHUB_RUN_ID"]
    attempt = os.environ.get("GITHUB_RUN_ATTEMPT", "1")
    repository = os.environ["GITHUB_REPOSITORY"]
    report = {"state": args.state, "stage": args.stage, "architecture": platform.machine(),
              "source_sha": os.environ["GITHUB_SHA"], "run_id": run,
              "run_url": f"https://github.com/{repository}/actions/runs/{run}",
              "updated_at": datetime.now(timezone.utc).isoformat()}
    if args.release_url:
        report["release_url"] = args.release_url
    if args.log and Path(args.log).is_file():
        report["test_log_tail"] = "\n".join(Path(args.log).read_text(errors="replace").splitlines()[-150:])[-30000:]
    path = Path("ci-delivery") / (args.channel + ".json")
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    subprocess.run(["git", "add", str(path)], check=True)
    subprocess.run(["git", "-c", "user.name=github-actions[bot]", "-c",
                    "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "--only",
                    "-m", f"Report Mac delivery: {args.stage} ({args.state})", "--", str(path)], check=True)
    branch = f"codex/delivery-{run}-{attempt}-{args.channel}"
    subprocess.run(["git", "push", "origin", "HEAD:refs/heads/" + branch], check=True)


if __name__ == "__main__":
    main()
