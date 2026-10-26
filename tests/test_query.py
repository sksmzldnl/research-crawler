import pytest

from zerowaste_listener.query import parse_bundle


def test_precedence_and_unicode_matching():
    bundle = parse_bundle('제로웨이스트 OR "zero waste" AND refill')
    assert bundle.matched("제로웨이스트") == ["제로웨이스트"]
    assert bundle.matched("ZERO WASTE refill") == ["zero waste", "refill"]
    assert not bundle.matched("zero waste")
    assert bundle.matched("ｚｅｒｏ ｗａｓｔｅ REFILL")


def test_parentheses_expand_for_search_apis():
    bundle = parse_bundle('(제로웨이스트 OR "zero waste") and (리필 OR refill)')
    assert len(bundle.searches()) == 4
    assert '"zero waste" "refill"' in bundle.searches()
    assert not bundle.matched("제로웨이스트 샴푸")
    assert bundle.matched("제로웨이스트 리필") == ["제로웨이스트", "리필"]


@pytest.mark.parametrize("query", ["", "a b", "a AND", "OR a", "(a OR b", '"oops', "a)", '""'])
def test_invalid_grammar(query):
    with pytest.raises(ValueError):
        parse_bundle(query)


def test_limits_combinatorial_expansion():
    with pytest.raises(ValueError):
        parse_bundle(" AND ".join(["(a OR b)"] * 6))
