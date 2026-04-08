import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "house_hold_service.settings")

import django  # noqa: E402

django.setup()

from orders.models import Order  # noqa: E402
from orders.service import OrderService  # noqa: E402


def main():
    pending = Order.objects.filter(assigned_technician__isnull=True).order_by("-id")
    updated = 0

    for order in pending:
        service_ids = list(order.items.values_list("service_id", flat=True))
        before = order.assigned_technician_id
        OrderService.auto_assign_technician(order, service_ids=service_ids)
        order.refresh_from_db(fields=["assigned_technician"])
        if before is None and order.assigned_technician_id is not None:
            updated += 1

    remaining = Order.objects.filter(assigned_technician__isnull=True).count()
    print("updated", updated, "remaining_unassigned", remaining)


if __name__ == "__main__":
    main()
