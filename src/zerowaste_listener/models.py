from dataclasses import dataclass, field
from datetime import date

from .query import Bundle


@dataclass
class Document:
    title: str
    text: str
    engine: str
    url: str
    published: date | None
    completeness: str = "검색 API 발췌문"
    ad: bool = False


@dataclass
class Options:
    bundles: list[Bundle]
    engines: list[str]
    exclusions: list[str] = field(default_factory=list)
    remove_ads: bool = True
    deduplicate: bool = True
    start: date | None = None
    end: date | None = None
    limit: int = 100
    ai: str = "Gemini"
    full_text: bool = True
    demo: bool = False


# Ordered CSV columns; provenance and failure states travel with every row.
COLUMNS = {
    "bundle": "검색 쿼리 번들", "matched": "원문에 포함된 쿼리", "summary_ko": "한국어 요약",
    "translation_ko": "원문 한국어 번역", "original": "요약 전 원문", "engine": "검색 엔진",
    "url": "원문 URL", "published": "게시일", "title": "제목", "completeness": "원문 확보 범위",
    "translation_status": "번역 상태", "collected_at": "수집 시각 (UTC)", "ad_note": "광고 판정",
    "mode": "자료 구분",
}
