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
    def __init__(self, message, *, status_code=None):
        super().__init__(message)
        self.status_code = status_code

    @property
    def blocks_service(self):
        return self.status_code in {401, 403, 429}


SERVICE_NAMES = {
    "openapi.naver.com": "네이버 검색 API",
    "dapi.kakao.com": "다음 검색 API (Kakao)",
    "oauth.reddit.com": "Reddit 검색 API",
    "api.openai.com": "GPT API",
    "generativelanguage.googleapis.com": "Gemini API",
}


def http_error(host, status):
    service = SERVICE_NAMES.get(host, host)
    prefix = f"{service} ({host}): HTTP {status}. "
    if status == 401:
        advice = {
            "openapi.naver.com": "같은 네이버 개발자 앱에서 발급한 Client ID와 Client Secret을 입력하세요.",
            "dapi.kakao.com": "Kakao 앱의 REST API 키를 입력하세요. JavaScript 키·네이티브 앱 키와 다릅니다.",
            "oauth.reddit.com": "유효한 OAuth 액세스 토큰을 입력하세요. Client ID·Client Secret을 토큰 칸에 넣지 마세요. 만료된 토큰은 갱신하세요.",
        }.get(host, "API 키가 유효한지, 만료되거나 삭제되지 않았는지 확인하세요.")
        message = "인증 실패입니다. " + advice
    elif status == 403:
        advice = {
            "openapi.naver.com": "네이버 개발자센터에서 이 앱의 검색 API 사용 설정과 접근 권한을 확인하세요.",
            "dapi.kakao.com": "Kakao Developers에서 이 앱의 다음 검색 API 사용 권한을 확인하세요.",
            "oauth.reddit.com": "Reddit API 사용 승인, OAuth 권한, 앱을 식별하는 User-Agent를 확인하세요.",
        }.get(host, "이 계정·프로젝트가 해당 API와 모델을 사용할 권한이 있는지 확인하세요.")
        message = "접근이 거부되었습니다. " + advice
    elif status == 429:
        message = ("호출 한도 또는 요청 속도 제한에 도달했습니다. "
                   "서비스 개발자 콘솔에서 해당 앱·프로젝트의 사용량과 한도를 확인하세요. "
                   "속도 제한은 대기 후 다시 시도하고, 일일 한도 초과는 한도 초기화 또는 제공자의 승인이 필요합니다.")
    elif status == 404:
        message = "요청한 API 또는 모델을 찾을 수 없습니다. 지원 여부와 접근 권한을 확인하세요."
    elif status >= 500:
        message = "제공자 서버 오류입니다. 잠시 후 다시 시도하세요."
    else:
        message = "API가 요청을 거부했습니다. 요청 설정과 해당 서비스의 API 안내를 확인하세요."
    return ServiceError(prefix + message, status_code=status)


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
                    raise ServiceError(f"{SERVICE_NAMES.get(host, host)} ({host}): HTTP {response.status_code}. "
                                       "API가 2분보다 긴 대기 시간을 요구합니다. 지금 요청을 멈추고 나중에 다시 시도하세요.",
                                       status_code=response.status_code)
                self.wait(max(0, delay))
                continue
            if response.status_code >= 400 and response.status_code not in accepted:
                # Never include bodies, request headers, tokens or signed URLs in errors.
                raise http_error(host, response.status_code)
            return response
        raise ServiceError(f"{host}: 재시도 한도를 초과했습니다.")

    def close(self):
        self.client.close()
