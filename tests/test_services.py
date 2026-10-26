import json
import gzip
import threading

import httpx
import pytest

from zerowaste_listener.ai import Translator, chunks
from zerowaste_listener.network import Cancelled, ServiceError, Transport
from zerowaste_listener.providers import SearchProvider


def transport(handler):
    return Transport(threading.Event(), httpx.Client(transport=httpx.MockTransport(handler)), interval=0)


def test_naver_pagination_and_cleaning():
    starts = []
    def handler(request):
        starts.append(int(request.url.params["start"]))
        assert request.headers["X-Naver-Client-Id"] == "id"
        items = [{"title": "<b>리필</b> &amp; 용기", "description": "본문", "link": "https://example.com/post", "postdate": "20261001"}]
        return httpx.Response(200, json={"total": 101, "items": items * (100 if starts[-1] == 1 else 1)})
    with_http = transport(handler)
    provider = SearchProvider(with_http, {"NAVER_CLIENT_ID": "id", "NAVER_CLIENT_SECRET": "secret"})
    rows = list(provider.search("naver", '"리필"'))
    assert len(rows) == 101 and starts == [1, 101]
    assert rows[0].title == "리필 & 용기"
    assert str(rows[0].published) == "2026-10-01"


def test_daum_authorization_and_end():
    def handler(request):
        assert request.url.host == "dapi.kakao.com"
        assert request.headers["Authorization"] == "KakaoAK secret"
        return httpx.Response(200, json={"documents": [{"title": "리필", "contents": "내용", "url": "https://example.com/1", "datetime": "2026-10-01T14:00:00+09:00"}], "meta": {"is_end": True}})
    rows = list(SearchProvider(transport(handler), {"KAKAO_REST_API_KEY": "secret"}).search("daum", "리필"))
    assert len(rows) == 1 and str(rows[0].published) == "2026-10-01"


def test_reddit_cursor_and_deleted_content():
    cursors = []
    def handler(request):
        assert request.headers["Authorization"] == "Bearer token"
        assert request.url.params["q"] == '"zero waste" AND "refill"'
        cursors.append(request.url.params.get("after"))
        return httpx.Response(200, json={"data": {"after": "next" if len(cursors) == 1 else None, "children": [
            {"data": {"title": "refill", "selftext": "body", "permalink": "/r/ZeroWaste/1", "created_utc": 1790812800}},
            {"data": {"selftext": "[deleted]"}},
        ]}})
    rows = list(SearchProvider(transport(handler), {"REDDIT_ACCESS_TOKEN": "token", "REDDIT_USER_AGENT": "app/1 by user"}).search("reddit", '"zero waste" "refill"'))
    assert len(rows) == 2 and cursors == [None, "next"]
    assert rows[0].completeness == "Reddit API 본문"


@pytest.mark.parametrize("provider", ["GPT", "Gemini"])
def test_ai_full_translation_and_summary(provider):
    sources = []
    def handler(request):
        body = json.loads(request.content)
        if provider == "GPT":
            source = json.loads(body["messages"][1]["content"])["source"]
        else:
            assert request.headers["x-goog-api-key"] == "secret"
            source = json.loads(body["contents"][0]["parts"][0]["text"])["source"]
        sources.append(source)
        result = json.dumps({"text": source}, ensure_ascii=False)
        if provider == "GPT":
            return httpx.Response(200, json={"choices": [{"finish_reason": "stop", "message": {"content": result}}]})
        return httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": result}]}}]})
    text = "제로웨이스트 경험과 불편." * 800
    summary, translated = Translator(transport(handler), {"GPT_API_KEY": "secret", "GEMINI_API_KEY": "secret"}, provider).translate(text)
    pieces = list(chunks(text))
    assert sources[:len(pieces)] == pieces
    assert translated.replace("\n", "") == text
    assert summary


def test_truncated_ai_output_is_failure():
    http = transport(lambda r: httpx.Response(200, json={"choices": [{"finish_reason": "length", "message": {"content": '{"text":"부분"}'}}]}))
    with pytest.raises(ServiceError, match="완료되지"):
        Translator(http, {"GPT_API_KEY": "secret"}, "GPT").translate("source")


def test_retry_after_and_secret_redaction():
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(429 if len(calls) == 1 else 200, headers={"Retry-After": "2"}, json={})
    http = transport(handler)
    waits = []
    http.wait = lambda delay=0: waits.append(delay)
    assert http.request("GET", "https://example.com").status_code == 200
    assert 2 in waits and len(calls) == 2
    failing = transport(lambda r: httpx.Response(401, text="super-secret-token"))
    with pytest.raises(ServiceError) as error:
        failing.request("GET", "https://example.com/?key=super-secret-token")
    assert "super-secret" not in str(error.value)


def test_cancellation_and_download_bound():
    http = transport(lambda r: httpx.Response(200, content=b"123456"))
    with pytest.raises(ServiceError, match="크기"):
        http.request("GET", "https://example.com", max_bytes=5)
    http.cancel.set()
    with pytest.raises(Cancelled):
        http.request("GET", "https://example.com")


def test_compressed_api_responses_are_decoded_once():
    http = transport(lambda r: httpx.Response(200, content=gzip.compress(b'{"items":[]}'),
                                             headers={"Content-Encoding": "gzip", "Content-Type": "application/json"}))
    assert http.request("GET", "https://example.com").json() == {"items": []}


@pytest.mark.parametrize("host,status,expected", [
    ("openapi.naver.com", 401, "Client ID와 Client Secret"),
    ("dapi.kakao.com", 401, "REST API 키"),
    ("oauth.reddit.com", 401, "OAuth 액세스 토큰"),
    ("oauth.reddit.com", 403, "사용 승인"),
    ("openapi.naver.com", 429, "요청 속도 제한"),
])
def test_search_errors_explain_actual_status_without_exposing_response(host, status, expected):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(status, text="server accidentally echoed private-key", headers={"Retry-After": "0"})
    http = transport(handler)
    with pytest.raises(ServiceError) as failure:
        http.request("GET", f"https://{host}/search")
    error = failure.value
    assert error.status_code == status and error.blocks_service
    assert expected in str(error) and f"HTTP {status}" in str(error)
    assert "private-key" not in str(error)
    if status in {401, 403}:
        assert len(calls) == 1
        assert "할당량" not in str(error) and "호출 한도" not in str(error)


def test_long_retry_after_keeps_status_for_engine_circuit_breaker():
    http = transport(lambda r: httpx.Response(429, headers={"Retry-After": "3600"}))
    with pytest.raises(ServiceError) as failure:
        http.request("GET", "https://openapi.naver.com/search")
    assert failure.value.status_code == 429 and failure.value.blocks_service
