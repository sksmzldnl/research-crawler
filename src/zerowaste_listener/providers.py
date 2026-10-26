import html
import re
from datetime import date, datetime, timezone

from .models import Document
from .network import ServiceError

ENGINE_NAMES = {"naver": "네이버 블로그", "daum": "다음 블로그", "reddit": "Reddit"}
REQUIRED = {
    "naver": ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
    "daum": ["KAKAO_REST_API_KEY"],
    "reddit": ["REDDIT_ACCESS_TOKEN", "REDDIT_USER_AGENT"],
    "Gemini": ["GEMINI_API_KEY"], "GPT": ["GPT_API_KEY"],
}


def clean(value):
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def parse_date(value):
    try:
        if len(value) == 8 and value.isdigit():
            return datetime.strptime(value, "%Y%m%d").date()
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None


class SearchProvider:
    def __init__(self, transport, credentials):
        self.http = transport
        self.keys = credentials

    def search(self, engine, query):
        if engine == "naver":
            yield from self.naver(query)
        elif engine == "daum":
            yield from self.daum(query)
        elif engine == "reddit":
            yield from self.reddit(query)
        else:
            raise ValueError("지원하지 않는 엔진")

    def naver(self, query):
        for start in range(1, 1000, 100):
            data = self.http.request("GET", "https://openapi.naver.com/v1/search/blog.json", params={
                "query": query, "display": 100, "start": start, "sort": "date",
            }, headers={"X-Naver-Client-Id": self.keys["NAVER_CLIENT_ID"],
                        "X-Naver-Client-Secret": self.keys["NAVER_CLIENT_SECRET"]}).json()
            items = data.get("items", [])
            for item in items:
                yield Document(clean(item.get("title")), clean(item.get("description")), "naver",
                               item.get("link", ""), parse_date(item.get("postdate", "")))
            if len(items) < 100 or start + 100 > data.get("total", 0):
                break

    def daum(self, query):
        for page in range(1, 51):
            data = self.http.request("GET", "https://dapi.kakao.com/v2/search/blog", params={
                "query": query, "size": 50, "page": page, "sort": "recency",
            }, headers={"Authorization": "KakaoAK " + self.keys["KAKAO_REST_API_KEY"]}).json()
            for item in data.get("documents", []):
                yield Document(clean(item.get("title")), clean(item.get("contents")), "daum",
                               item.get("url", ""), parse_date(item.get("datetime", "")))
            if data.get("meta", {}).get("is_end", True):
                break

    def reddit(self, query):
        after = None
        seen = set()
        for _ in range(10):
            params = {"q": query.replace('" "', '" AND "'), "limit": 100, "sort": "new", "type": "link", "raw_json": 1}
            if after:
                params["after"] = after
            data = self.http.request("GET", "https://oauth.reddit.com/search", params=params, headers={
                "Authorization": "Bearer " + self.keys["REDDIT_ACCESS_TOKEN"],
                "User-Agent": self.keys["REDDIT_USER_AGENT"],
            }).json().get("data", {})
            for child in data.get("children", []):
                item = child["data"]
                text = item.get("selftext", "")
                if text in {"[removed]", "[deleted]"}:
                    continue
                yield Document(item.get("title", ""), text or item.get("title", ""), "reddit",
                               "https://www.reddit.com" + item.get("permalink", ""),
                               datetime.fromtimestamp(item["created_utc"], timezone.utc).date(),
                               "Reddit API 본문" if text else "Reddit API 제목 (링크 게시물)",
                               bool(item.get("promoted")))
            after = data.get("after")
            if not after or after in seen:
                break
            seen.add(after)

    def check(self, service):
        if service in ENGINE_NAMES:
            next(self.search(service, '"zero waste"'), None)
            return "검색 API 연결 성공"
        raise ServiceError("지원하지 않는 서비스")
