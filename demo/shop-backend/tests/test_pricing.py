from src.shop.pricing import with_tax


def test_with_tax_pk():
    assert with_tax(100, "pk") == 117.0
