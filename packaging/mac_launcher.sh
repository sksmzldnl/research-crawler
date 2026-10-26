#!/bin/sh
# Launch only the interpreter shipped in this app; do not depend on system Python.
set -eu
macos_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
resources_dir="$macos_dir/../Resources"
log_dir="${ZEROWASTE_LOG_DIR:-$HOME/Library/Logs/ZeroWasteListener}"
mkdir -p "$log_dir"
set +e
"$resources_dir/runtime/bin/python3.12" -I "$resources_dir/bootstrap.py" "$@" >> "$log_dir/app.log" 2>&1
app_status=$?
set -e
if [ "$app_status" -ne 0 ]; then
    /usr/bin/osascript -e 'display alert "새로듣기 실행 오류" message "앱을 시작하지 못했습니다. 사용자 Library/Logs/ZeroWasteListener/app.log 파일을 확인하세요." as critical' || true
fi
exit "$app_status"
