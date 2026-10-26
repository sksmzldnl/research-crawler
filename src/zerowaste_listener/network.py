"""Verified HTTPS, bounded retries and cancellable per-host pacing."""
import threading
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit

import httpx


class Cancelled(Exception):
    pass


class ServiceError(Exception):
    pass


class Transport:
    def __init__(self, cancel: threading.Event, client=None, interval=1.0):
        self.cancel = cancel
        self.client = client or httpx.Client(timeout=30, follow_redirects=False, trust_env=True)
        self.interval = interval
        self.last = {}

    def wait(self, seconds=0):
        if self.cancel.wait(seconds):
            raise Cancelled()

    def request(self, method, url, *, accepted=(), max_bytes=4_000_000, **kwargs):
        host = urlsplit(url).hostname
        for attempt in range(4):
            self.wait(max(0, self.interval - (time.monotonic() - self.last.get(host, 0))))
            self.last[host] = time.monotonic()
            try:
                with self.client.stream(method, url, **kwargs) as incoming:
                    chunks = []
                    size = 0
                    for chunk in incoming.iter_bytes():
                        self.wait()
                        size += len(chunk)
                        if size > max_bytes:
                            raise ServiceError(f"{host}: 응답 크기 한도를 초과했습니다.")
                        chunks.append(chunk)
                    headers = httpx.Headers(incoming.headers)
                    # iter_bytes already decompresses; do not decode compressed responses twice.
                    headers.pop("Content-Encoding", None)
                    headers.pop("Content-Length", None)
                    response = httpx.Response(incoming.status_code, headers=headers,
                                              content=b"".join(chunks), request=incoming.request)
            except httpx.HTTPError:
                if attempt == 3:
                    raise ServiceError(f"{host}: 연결 실패. 네트워크와 인증서를 확인하세요.") from None
                self.wait(2 ** attempt)
                continue
            if response.status_code in {429, 502, 503, 504} and attempt < 3:
                delay = 2 ** (attempt + 1)
                retry = response.headers.get("Retry-After", "")
                try:
                    delay = float(retry)
                except ValueError:
                    try:
                        delay = (parsedate_to_datetime(retry) - datetime.now(timezone.utc)).total_seconds()
                    except (ValueError, TypeError, OverflowError):
                        pass
                if delay > 120:
                    raise ServiceError(f"{host}: API가 긴 대기 시간을 요구합니다. 나중에 다시 시도하세요.")
                self.wait(max(0, delay))
                continue
            if response.status_code >= 400 and response.status_code not in accepted:
                # Never include bodies, request headers, tokens or signed URLs in errors.
                raise ServiceError(f"{host}: HTTP {response.status_code}. API 권한·키·할당량을 확인하세요.")
            return response
        raise ServiceError(f"{host}: 재시도 한도를 초과했습니다.")

    def close(self):
        self.client.close()
