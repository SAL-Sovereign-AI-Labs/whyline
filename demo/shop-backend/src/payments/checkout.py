from ..shop.pricing import with_tax


def checkout(order, region="pk"):
    return with_tax(order.total(), region)
