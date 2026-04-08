import json
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "house_hold_service.settings")

import django  # noqa: E402

django.setup()

from accounts.models import User  # noqa: E402


fixture_path = Path("fixtures/dummy_data.json")
records = json.loads(fixture_path.read_text(encoding="utf-8"))
tech_rows = [
    row
    for row in records
    if row.get("model") == "accounts.user"
    and row.get("fields", {}).get("role") == "technician"
]

existing_users = {
    u.email: u
    for u in User.objects.filter(email__in=[r["fields"].get("email") for r in tech_rows]).only(
        "id",
        "email",
        "first_name",
        "last_name",
        "address",
        "phone_number",
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
        "password",
    )
}

to_create = []
to_update = []

for row in tech_rows:
    fields = row["fields"]
    email = fields.get("email")
    if not email:
        continue

    candidate = {
        "first_name": fields.get("first_name", ""),
        "last_name": fields.get("last_name", ""),
        "address": fields.get("address"),
        "phone_number": fields.get("phone_number"),
        "role": "technician",
        "is_active": fields.get("is_active", True),
        "is_staff": fields.get("is_staff", False),
        "is_superuser": fields.get("is_superuser", False),
        "password": fields.get("password"),
    }

    existing = existing_users.get(email)
    if existing is None:
        to_create.append(
            User(
                email=email,
                first_name=candidate["first_name"],
                last_name=candidate["last_name"],
                address=candidate["address"],
                phone_number=candidate["phone_number"],
                role=candidate["role"],
                is_active=candidate["is_active"],
                is_staff=candidate["is_staff"],
                is_superuser=candidate["is_superuser"],
                password=candidate["password"] or "",
            )
        )
        continue

    changed = False
    for attr in [
        "first_name",
        "last_name",
        "address",
        "phone_number",
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
    ]:
        if getattr(existing, attr) != candidate[attr]:
            setattr(existing, attr, candidate[attr])
            changed = True

    if candidate["password"] and existing.password != candidate["password"]:
        existing.password = candidate["password"]
        changed = True

    if changed:
        to_update.append(existing)

if to_create:
    User.objects.bulk_create(to_create, batch_size=200)

if to_update:
    User.objects.bulk_update(
        to_update,
        [
            "first_name",
            "last_name",
            "address",
            "phone_number",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "password",
        ],
        batch_size=200,
    )

created = len(to_create)
updated = len(to_update)

print(
    "created",
    created,
    "updated",
    updated,
    "total_technicians_db",
    User.objects.filter(role="technician").count(),
)
