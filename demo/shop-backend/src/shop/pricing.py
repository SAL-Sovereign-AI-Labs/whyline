from .rates import rate_for


def with_tax(amount, region):
    return round(amount * (1 + rate_for(region)), 2)
