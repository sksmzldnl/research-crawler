import csv
import threading
from datetime import date

import pytest

from zerowaste_listener.models import COLUMNS, Document, Options
from zerowaste_listener.network import Cancelled, ServiceError
from zerowaste_listener.pipeline import canonical_url, export_csv, run
from zerowaste_listener.query import parse_bundle


class Provider:
    def __init__(self, docs):
        self.docs = docs

    def search(self, engine, query):
        yield from self.docs[engine]


class AI:
    def translate(self, text):
        return "요약", "번역: " + text


def doc(text, url, published=date(2026, 10, 1), engine="naver"):
    return Document("리필 후기", text, engine, url, published)


def execute(options, provider, ai=None):
    rows, messages = [], []
    result = run(options, provider, ai or AI(), None, threading.Event(), rows.append,
                 lambda a, b, c: messages.append(c))
    return rows, result, messages


def options(**kwargs):
    return Options([parse_bundle("리필")], ["naver"], full_text=False, **kwargs)


def test_filters_and_both_duplicate_keys():
    docs = [doc("리필 사용 경험", "https://example.com/1?utm_source=x"),
            doc("리필 사용 경험 수정본", "https://example.com/1"),
            doc("리필   사용 경험", "https://example.com/2"),
            doc("리필 #광고", "https://example.com/3"),
            doc("리필 공동구매", "https://example.com/4"),
            doc("리필 날짜 미상", "https://example.com/5", None),
            doc("리필 오래된 글", "https://example.com/6", date(2020, 1, 1))]
    rows, (count, scanned, errors), _ = execute(options(start=date(2026, 1, 1), end=date(2026, 12, 31), exclusions=["공동구매"]), Provider({"naver": docs}))
    assert count == 1 and scanned == 7 and not errors
    assert rows[0]["original"] == "리필 후기\n리필 사용 경험"
    assert rows[0]["translation_ko"] == "번역: " + rows[0]["original"]


def test_toggles_and_target_enforced():
    docs = [doc("리필 #광고", "https://example.com/1")] * 5
    rows, result, _ = execute(options(remove_ads=False, deduplicate=False, limit=3), Provider({"naver": docs}))
    assert len(rows) == 3 and result[:2] == (3, 3)


def test_round_robin_between_selected_engines():
    settings = options(limit=2)
    settings.engines = ["naver", "daum"]
    rows, _, _ = execute(settings, Provider({"naver": [doc("리필 네이버", "https://a.com/1")] * 5,
                                            "daum": [doc("리필 다음", "https://b.com/1", engine="daum")]}))
    assert [r["engine"] for r in rows] == ["네이버 블로그", "다음 블로그"]


def test_translation_failure_retains_evidence():
    class FailingAI:
        def translate(self, text):
            raise ServiceError("할당량 부족")
    rows, result, _ = execute(options(), Provider({"naver": [doc("리필 경험", "https://example.com/1")]}), FailingAI())
    assert result[0] == 1 and len(result[2]) == 1
    assert rows[0]["original"] and not rows[0]["translation_ko"]
    assert rows[0]["translation_status"] == "할당량 부족"


def test_one_engine_failure_does_not_lose_others():
    class PartlyBroken:
        def search(self, engine, query):
            if engine == "naver":
                raise ServiceError("권한 없음")
            yield doc("리필 경험", "https://example.com/1", engine="daum")
    settings = options()
    settings.engines = ["naver", "daum"]
    rows, result, messages = execute(settings, PartlyBroken())
    assert len(rows) == 1 and result[2] and "권한 없음" in messages[0]


def test_demo_never_calls_live_services():
    settings = options(demo=True)
    rows, result, _ = execute(settings, None, object())
    assert len(rows) == 1 and rows[0]["mode"] == "시연용 가상 자료"
    assert "시연" in rows[0]["translation_status"] and result[0] == 1


def test_csv_columns_bom_multiline_and_formula_safety(tmp_path):
    path = tmp_path / "result.csv"
    export_csv(path, [{"original": '=HYPERLINK("url")', "title": " 	+1", "summary_ko": '한글, 쉼표\n다음 줄'}])
    assert path.read_bytes().startswith(b"\xef\xbb\xbf")
    with path.open(encoding="utf-8-sig", newline="") as handle:
        records = list(csv.reader(handle))
    assert records[0] == list(COLUMNS.values())
    assert records[1][list(COLUMNS).index("original")].startswith("'=")
    assert records[1][list(COLUMNS).index("title")].startswith("'")
    assert records[1][list(COLUMNS).index("summary_ko")] == '한글, 쉼표\n다음 줄'


def test_cancel_does_not_emit():
    event = threading.Event()
    event.set()
    with pytest.raises(Cancelled):
        run(options(), None, None, None, event, lambda r: pytest.fail("unexpected row"), lambda *args: None)


def test_canonical_keeps_meaningful_query_parameters():
    assert canonical_url("https://Example.com/p/?id=1&utm_medium=x#top") == "https://example.com/p?id=1"
