import csv
import hashlib
import re
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .models import COLUMNS, Document
from .network import Cancelled, ServiceError
from .providers import ENGINE_NAMES
from .query import normalize

AD_MARKERS = ("#광고", "#협찬", "유료광고", "소정의 원고료", "제품을 제공받", "sponsored", "paid partnership", "#ad ")


def canonical_url(url):
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if not k.lower().startswith("utm_")
             and k.lower() not in {"fbclid", "gclid"}]
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), urlencode(sorted(query)), ""))


def content_hash(text):
    return hashlib.sha256(re.sub(r"\s+", "", normalize(text)).encode()).hexdigest()


def demo_search(engine, query):
    # Explicitly synthetic examples: never represented as live evidence.
    samples = [
        ("제로웨이스트 리필 경험", "제로웨이스트 생활을 시작했지만 동네에 리필 매장이 적어 불편했다. 용기 무게를 재는 과정이 더 쉬우면 좋겠다. zero waste refill", False),
        ("제로웨이스트 용기 선택", "제로웨이스트 소비자로서 가벼운 다회용 용기와 읽기 쉬운 라벨이 필요하다. zero waste reusable", False),
        ("광고 예시", "#광고 제로웨이스트 리필 제품을 제공받았습니다. zero waste refill", True),
    ]
    for i, (title, text, ad) in enumerate(samples):
        yield Document(title, text, engine, f"https://example.invalid/demo/{engine}/{i}",
                       datetime.now(timezone.utc).date(), "시연용 가상 원문", ad)


def run(options, provider, translator, loader, cancel, emit, progress):
    if cancel.is_set():
        raise Cancelled()
    streams = [(b, e, iter(demo_search(e, q) if options.demo else provider.search(e, q)))
               for b in options.bundles for e in options.engines for q in b.searches()]
    urls, hashes = set(), set()
    count = scanned = 0
    errors = []
    blocked_engines = set()
    # Fair round robin across engine/query searches; result target is global, not per engine.
    while streams and count < options.limit:
        for stream in list(streams):
            if cancel.is_set():
                raise Cancelled()
            bundle, engine, iterator = stream
            if engine in blocked_engines:
                continue
            try:
                doc = next(iterator)
            except StopIteration:
                streams.remove(stream)
                continue
            except (ServiceError, ValueError, KeyError, TypeError) as error:
                errors.append(f"{ENGINE_NAMES[engine]} 검색 실패: {error if isinstance(error, ServiceError) else 'API 응답 형식 오류'}")
                if isinstance(error, ServiceError) and error.blocks_service:
                    blocked_engines.add(engine)
                    streams = [s for s in streams if s[1] != engine]
                    errors[-1] += " 이번 조사의 해당 엔진 요청을 중단합니다. 설정을 수정한 뒤 새로 시작하세요."
                else:
                    streams.remove(stream)
                progress(count, scanned, errors[-1])
                continue
            scanned += 1
            progress(count, scanned, f"{ENGINE_NAMES[engine]} 자료 확인 중")
            if options.start and (doc.published is None or doc.published < options.start):
                continue
            if options.end and (doc.published is None or doc.published > options.end):
                continue
            url_key = canonical_url(doc.url)
            if options.deduplicate and url_key in urls:
                continue
            if options.full_text and not options.demo:
                doc = loader.enrich(doc)
            text = doc.title + "\n" + doc.text
            if any(normalize(word) in normalize(text) for word in options.exclusions):
                continue
            matched = bundle.matched(text)
            if not matched:
                continue
            ad = doc.ad or any(marker in normalize(text) for marker in AD_MARKERS)
            if options.remove_ads and ad:
                continue
            hashed = content_hash(doc.text)
            if options.deduplicate and hashed in hashes:
                continue
            row = {"bundle": bundle.source, "matched": " | ".join(matched), "original": text,
                   "engine": ENGINE_NAMES[engine], "url": doc.url, "published": doc.published.isoformat() if doc.published else "미상",
                   "title": doc.title, "completeness": doc.completeness, "summary_ko": "", "translation_ko": "",
                   "translation_status": "대기", "collected_at": datetime.now(timezone.utc).isoformat(),
                   "ad_note": "광고 단서 감지" if ad else "광고 단서 미감지 (보증 아님)", "mode": "시연용 가상 자료" if options.demo else "실제 API"}
            if options.demo:
                row.update(summary_ko="[시연] 리필 매장 접근성과 용기 사용 편의에 대한 가상 의견입니다.",
                           translation_ko=text, translation_status="시연 (AI 호출 없음)")
            else:
                try:
                    row["summary_ko"], row["translation_ko"] = translator.translate(text)
                    row["translation_status"] = "확보한 원문 범위 번역 완료"
                except (ServiceError, ValueError, KeyError, TypeError, IndexError) as error:
                    row["translation_status"] = str(error) if isinstance(error, ServiceError) else "AI 응답 형식 오류"
                    errors.append("번역 실패: " + row["translation_status"])
            urls.add(url_key)
            hashes.add(hashed)
            count += 1
            emit(row)
            progress(count, scanned, f"{count}개 확보 / 목표 {options.limit}개")
            if count >= options.limit:
                break
    return count, scanned, errors


def safe_cell(value):
    text = str(value)
    # Protect spreadsheet users from formulas, including whitespace-prefixed payloads.
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) or text.startswith(("\t", "\r")) else text


def export_csv(path, rows):
    with open(path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(COLUMNS.values())
        for row in rows:
            writer.writerow([safe_cell(row.get(key, "")) for key in COLUMNS])
