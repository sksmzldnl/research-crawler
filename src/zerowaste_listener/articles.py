"""Only public, robots-permitted HTML. No authentication or challenge bypass."""
import ipaddress
import socket
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import trafilatura

from .network import ServiceError

USER_AGENT = "ZeroWasteListener/0.1 (academic research; public pages only)"


def public_url(url):
    parts = urlsplit(url)
    if parts.scheme not in {"http", "https"} or not parts.hostname or parts.username or parts.password:
        raise ServiceError("공개 웹 URL만 사용할 수 있습니다.")
    if parts.port not in {None, 80, 443}:
        raise ServiceError("표준 웹 포트만 허용됩니다.")
    try:
        addresses = socket.getaddrinfo(parts.hostname, parts.port or 443, type=socket.SOCK_STREAM)
    except OSError:
        raise ServiceError("원문 도메인을 확인할 수 없습니다.") from None
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ServiceError("내부 네트워크 주소는 수집하지 않습니다.")
    return parts


class ArticleLoader:
    def __init__(self, transport):
        self.http = transport
        self.robots = {}

    def permitted(self, url):
        parts = public_url(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        if origin not in self.robots:
            response = self.http.request("GET", origin + "/robots.txt", headers={"User-Agent": USER_AGENT},
                                         accepted=(401, 403, 404, 410), max_bytes=512_000)
            parser = RobotFileParser()
            # Redirected or unavailable policies are treated conservatively.
            if response.status_code in {404, 410}:
                parser.parse([])
            elif response.status_code != 200:
                parser.parse(["User-agent: *", "Disallow: /"])
            else:
                parser.parse(response.text.splitlines())
            self.robots[origin] = parser
        parser = self.robots[origin]
        if not parser.can_fetch(USER_AGENT, url):
            raise ServiceError("robots.txt에서 원문 수집을 허용하지 않습니다.")
        delay = parser.crawl_delay(USER_AGENT) or parser.crawl_delay("*") or 0
        if delay > 120:
            raise ServiceError("사이트의 수집 대기 시간이 너무 깁니다.")
        self.http.wait(delay)

    def enrich(self, doc):
        if doc.completeness == "Reddit API 본문":
            return doc
        try:
            url = doc.url
            for _ in range(5):
                self.permitted(url)
                response = self.http.request("GET", url, headers={"User-Agent": USER_AGENT})
                if response.status_code in {301, 302, 303, 307, 308}:
                    target = urljoin(url, response.headers.get("Location", ""))
                    if urlsplit(url).scheme == "https" and urlsplit(target).scheme != "https":
                        raise ServiceError("안전하지 않은 리디렉션")
                    url = target
                    continue
                if "text/html" not in response.headers.get("Content-Type", "").lower():
                    raise ServiceError("HTML 원문이 아닙니다.")
                text = trafilatura.extract(response.text, include_comments=False, include_tables=True)
                if not text or len(text) < 80:
                    raise ServiceError("본문 추출 불가 (로그인·동적 페이지 등)")
                doc.text = text
                doc.completeness = "공개 HTML에서 추출한 본문 (메뉴·댓글 제외)"
                return doc
            raise ServiceError("리디렉션 한도 초과")
        except (ServiceError, ValueError) as error:
            doc.completeness += f" / 전문 미확보: {error}"
            return doc
