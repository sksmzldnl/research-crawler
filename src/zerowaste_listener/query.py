"""Small, bounded Boolean grammar. AND binds more tightly than OR."""
import re
import unicodedata
from dataclasses import dataclass
from itertools import product


def normalize(text: str) -> str:
    return unicodedata.normalize("NFKC", text).casefold()


@dataclass(frozen=True)
class Bundle:
    source: str
    clauses: tuple[tuple[str, ...], ...]

    def matched(self, text: str) -> list[str]:
        haystack = normalize(text)
        clauses = [c for c in self.clauses if all(normalize(t) in haystack for t in c)]
        return list(dict.fromkeys(t for c in clauses for t in c))

    def searches(self) -> list[str]:
        # Each conjunction is a separate API search. Local matching enforces the grammar.
        return [" ".join('"' + t.replace('"', '') + '"' for t in c) for c in self.clauses]


def parse_bundle(source: str) -> Bundle:
    if not source.strip() or len(source) > 2000:
        raise ValueError("쿼리는 1~2000자로 입력하세요.")
    tokens = re.findall(r'"[^"\n]+"|\(|\)|[^\s()"]+|"', source)
    pos = 0

    def atom():
        nonlocal pos
        if pos >= len(tokens):
            raise ValueError("연산자 다음에 검색어가 필요합니다.")
        token = tokens[pos]
        pos += 1
        if token == "(":
            value = expression()
            if pos >= len(tokens) or tokens[pos] != ")":
                raise ValueError("닫는 괄호가 필요합니다.")
            pos += 1
            return value
        if token.upper() in {"AND", "OR"} or token in {")", '"'}:
            raise ValueError("검색어와 AND / OR 연산자를 확인하세요.")
        return [(token.strip('"'),)]

    def conjunction():
        nonlocal pos
        left = atom()
        while pos < len(tokens) and tokens[pos].upper() == "AND":
            pos += 1
            right = atom()
            if len(left) * len(right) > 32:
                raise ValueError("검색 조합은 번들당 최대 32개입니다.")
            left = [a + b for a, b in product(left, right)]
        return left

    def expression():
        nonlocal pos
        left = conjunction()
        while pos < len(tokens) and tokens[pos].upper() == "OR":
            pos += 1
            left += conjunction()
            if len(left) > 32:
                raise ValueError("검색 조합은 번들당 최대 32개입니다.")
        return left

    try:
        clauses = expression()
    except RecursionError:
        raise ValueError("괄호 중첩이 너무 깊습니다.") from None
    if pos != len(tokens):
        raise ValueError('검색어 사이는 AND 또는 OR로 연결하세요. 구문은 "zero waste"처럼 따옴표로 묶으세요.')
    return Bundle(source.strip(), tuple(clauses))
