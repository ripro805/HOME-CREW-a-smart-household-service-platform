import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "house_hold_service.settings")

import django  # noqa: E402

django.setup()

from django.db.models import Count  # noqa: E402
from accounts.models import User  # noqa: E402
from services.models import Service  # noqa: E402


def main():
    technicians = User.objects.filter(role="technician").order_by("id")
    empty_techs = list(technicians.exclude(assigned_services__isnull=False).distinct())

    candidate_services = list(
        Service.objects.annotate(review_count=Count("reviews"))
        .filter(review_count__gt=0)
        .order_by("-review_count", "id")
    )

    if not candidate_services:
        candidate_services = list(Service.objects.order_by("id"))

    if not candidate_services:
        print("No services found. Nothing to assign.")
        return

    through_model = Service.assigned_technicians.through
    link_rows = []

    for index, tech in enumerate(empty_techs):
        primary_service = candidate_services[index % len(candidate_services)]
        secondary_service = candidate_services[(index + 7) % len(candidate_services)]

        link_rows.append(
            through_model(service_id=primary_service.id, user_id=tech.id)
        )
        if secondary_service.id != primary_service.id:
            link_rows.append(
                through_model(service_id=secondary_service.id, user_id=tech.id)
            )

    if link_rows:
        through_model.objects.bulk_create(link_rows, batch_size=1000, ignore_conflicts=True)

    updated = len(empty_techs)

    remaining_empty = technicians.exclude(assigned_services__isnull=False).count()
    print(
        "updated_technicians",
        updated,
        "remaining_empty",
        remaining_empty,
        "total_technicians",
        technicians.count(),
    )


if __name__ == "__main__":
    main()
