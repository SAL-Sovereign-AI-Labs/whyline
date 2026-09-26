from dataclasses import dataclass, field


@dataclass
class Order:
    items: list = field(default_factory=list)

    def total(self):
        return sum(price * qty for price, qty in self.items)
