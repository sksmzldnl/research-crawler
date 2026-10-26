import threading

import httpx
import pytest

from zerowaste_listener import articles
from zerowaste_listener.models import Document
from zerowaste_listener.network import Transport, ServiceError


def loader(handler):
    return articles.ArticleLoader(Transport(threading.Event(), httpx.Client(transport=httpx.MockTransport(handler)), interval=0))


def test_private_targets_rejected_without_fetch():
    for url in ["file:///etc/passwd", "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/", "http://user:password@example.com/"]:
        with pytest.raises(ServiceError):
            articles.public_url(url)


def test_robots_denial_keeps_snippet(monkeypatch):
    from urllib.parse import urlsplit
    monkeypatch.setattr(articles, "public_url", urlsplit)
    paths = []
    def handler(request):
        paths.append(request.url.path)
        return httpx.Response(200, text="User-agent: *\nDisallow: /", headers={"Content-Type": "text/plain"})
    doc = loader(handler).enrich(Document("제목", "검색 발췌", "naver", "https://example.com/post", None))
    assert paths == ["/robots.txt"]
    assert doc.text == "검색 발췌" and "전문 미확보" in doc.completeness


def test_public_html_extraction_and_robots_cache(monkeypatch):
    from urllib.parse import urlsplit
    monkeypatch.setattr(articles, "public_url", urlsplit)
    requests = []
    def handler(request):
        requests.append(request.url.path)
        if request.url.path == "/robots.txt":
            return httpx.Response(404)
        return httpx.Response(200, text="<html><body><article><h1>리필 후기</h1><p>" + "제로웨이스트 생활에서 리필 용기 무게를 재는 것이 어려웠다. " * 12 + "</p></article></body></html>", headers={"Content-Type": "text/html; charset=utf-8"})
    reader = loader(handler)
    for path in ["one", "two"]:
        doc = reader.enrich(Document("제목", "검색 발췌", "naver", "https://example.com/" + path, None))
        assert "HTML" in doc.completeness and "리필 용기" in doc.text
    assert requests.count("/robots.txt") == 1


def test_redirect_to_private_host_is_not_fetched(monkeypatch):
    original = articles.public_url
    from urllib.parse import urlsplit
    def validate(url):
        if "example.com" in url:
            return urlsplit(url)
        return original(url)
    monkeypatch.setattr(articles, "public_url", validate)
    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(404)
        assert request.url.host == "example.com"
        return httpx.Response(302, headers={"Location": "http://127.0.0.1/private"})
    doc = loader(handler).enrich(Document("제목", "발췌", "naver", "http://example.com/post", None))
    assert doc.text == "발췌" and "전문 미확보" in doc.completeness
