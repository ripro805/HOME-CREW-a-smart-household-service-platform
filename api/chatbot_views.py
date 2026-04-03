from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import requests
from django.conf import settings
from django.db.models import Q, Avg, Count, Max, Min
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from orders.models import Order, OrderItem
from services.models import Review, Service

from .models import SupportConversation, SupportMessage, AssistantChatSession, AssistantChatMessage
from .serializers import (
    ChatbotRequestSerializer,
    AssistantChatSessionListSerializer,
    AssistantChatSessionDetailSerializer,
)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

STATUS_TEXT = {
    Order.NOT_PAID: "Payment pending. Complete payment to confirm your booking.",
    Order.READY_TO_SHIP: "Booking confirmed. Technician scheduling is in progress.",
    Order.SHIPPED: "Technician on the way.",
    Order.DELIVERED: "Service completed successfully.",
    Order.CANCELLED: "This booking was cancelled.",
}

PROBLEM_KEYWORD_TO_SERVICE = {
    "ac": "AC",
    "air condition": "AC",
    "air conditioner": "AC",
    "fan": "Electrical",
    "light": "Electrical",
    "lights off": "Electrical",
    "switch": "Electrical",
    "socket": "Electrical",
    "wire": "Electrical",
    "wiring": "Electrical",
    "rong": "Painting",
    "paint": "Painting",
    "color": "Painting",
    "colour": "Painting",
    "wall": "Painting",
    "plumb": "Plumbing",
    "water leak": "Plumbing",
    "pipe": "Plumbing",
    "drain": "Plumbing",
    "dirty": "Cleaning",
    "clean": "Cleaning",
    "kitchen": "Cleaning",
    "bathroom": "Cleaning",
}

DEFAULT_BD_LOCATIONS = [
    "Dhaka",
    "Mirpur",
    "Dhanmondi",
    "Mohammadpur",
    "Gulshan",
    "Banani",
    "Uttara",
    "Badda",
    "Bashundhara",
    "Khilgaon",
    "Chattogram",
    "Cumilla",
    "Sylhet",
    "Rajshahi",
    "Khulna",
    "Barishal",
    "Rangpur",
    "Mymensingh",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _parse_json_from_text(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    cleaned = text.strip().replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def _to_json_safe(value: Any) -> Any:
    try:
        return json.loads(json.dumps(value, default=str))
    except Exception:
        return {}


def _load_bd_locations() -> list[str]:
    try:
        path = Path(__file__).with_name("bd_locations.json")
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            locations = data.get("locations", [])
            if isinstance(locations, list):
                return [str(item).strip() for item in locations if str(item).strip()]
        if isinstance(data, list):
            return [str(item).strip() for item in data if str(item).strip()]
    except Exception:
        pass
    return DEFAULT_BD_LOCATIONS


BD_LOCATIONS = _load_bd_locations()


def _make_chat_title(message: str) -> str:
    text = re.sub(r"\s+", " ", (message or "").strip())
    if not text:
        return "New Chat"
    return text[:70]


def _get_assistant_session(user, session_id: int | None, first_message: str | None = None) -> AssistantChatSession | None:
    if not getattr(user, "is_authenticated", False):
        return None

    if session_id:
        return AssistantChatSession.objects.filter(id=session_id, user=user).first()

    # Default behavior: continue in latest chat unless user explicitly creates a new one.
    latest = AssistantChatSession.objects.filter(user=user).order_by("-last_message_at", "-updated_at").first()
    if latest:
        return latest

    title = _make_chat_title(first_message or "")
    return AssistantChatSession.objects.create(user=user, title=title)


def _compact_services(limit: int = 20) -> list[dict[str, Any]]:
    services = (
        Service.objects.select_related("category")
        .only("id", "name", "price", "description", "category__name", "available_locations")
        .order_by("id")[:limit]
    )
    return [
        {
            "id": service.id,
            "name": service.name,
            "price": float(service.price),
            "category": service.category.name if service.category else "General",
            "description": (service.description or "")[:200],
            "available_locations": list(service.available_locations or []),
        }
        for service in services
    ]


def _find_services_by_text(text: str, limit: int = 5) -> list[Service]:
    normalized = _normalize(text)
    if not normalized:
        return []

    terms = [term for term in re.split(r"[^a-z0-9]+", normalized) if len(term) >= 2][:8]
    query = Q()
    for term in terms:
        query |= Q(name__icontains=term)
        query |= Q(description__icontains=term)
        query |= Q(category__name__icontains=term)

    if not query:
        return []

    return list(
        Service.objects.select_related("category")
        .filter(query)
        .distinct()
        .order_by("name")[:limit]
    )


def _is_service_list_query(message: str) -> bool:
    text = _normalize(message)
    return any(
        phrase in text
        for phrase in [
            "ki ki service",
            "what services",
            "service list",
            "available services",
            "services available",
            "kon kon service",
        ]
    )


def _is_small_talk(message: str) -> bool:
    text = _normalize(message)
    small_talk_tokens = {
        "hi",
        "hello",
        "hey",
        "yo",
        "assalamu alaikum",
        "salam",
        "thanks",
        "thank you",
        "ok",
        "okay",
        "k",
    }
    return text in small_talk_tokens


def _has_problem_signal(message: str) -> bool:
    text = _normalize(message)
    return any(
        token in text
        for token in [
            "problem",
            "issue",
            "not working",
            "broken",
            "noshto",
            "nosto",
            "fan",
            "light",
            "switch",
            "wiring",
            "wire",
            "wall",
            "paint",
            "rong",
        ]
    )


def _rules_intent(message: str) -> str:
    text = _normalize(message)

    if _is_small_talk(message):
        return "small_talk"

    if _is_service_list_query(message):
        return "service_info"

    # Prioritize review/rating signals before generic order keywords.
    if any(word in text for word in ["review", "rating", "feedback", "star", "rate"]):
        return "review_feedback"

    if (
        any(word in text for word in ["change", "update", "edit"])
        and any(word in text for word in ["location", "address", "thikana"]) 
        and any(word in text for word in ["order", "booking"])
    ):
        return "order_update"

    if any(word in text for word in ["track", "status", "order", "booking status", "on the way", "order status"]):
        return "order_tracking"

    if any(word in text for word in ["book", "booking", "reserve", "appointment", "confirm booking"]):
        return "booking_assistant"

    if any(word in text for word in ["available", "availability", "slot", "time slot", "location", "area"]):
        return "location_availability"

    if any(word in text for word in ["recommend", "suggest", "problem", "issue", "not working", "broken", "noshto", "nosto"]):
        return "service_recommendation"

    if any(word in text for word in ["price", "cost", "fee", "details", "faq", "time needed", "how much"]):
        return "service_info"

    return "service_recommendation"


def _handle_small_talk() -> tuple[str, dict[str, Any]]:
    return (
        "Hi! 👋 Ami HomeCrew AI Assistant. Apni service recommendation, booking, order status, ba feedback niye jiggesh korte paren.",
        {
            "feature": "small_talk",
            "hints": [
                "Fan problem, kon service lagbe?",
                "Ami booking korte chai",
                "Order status dekhbo",
            ],
        },
    )


def _extract_rating(message: str) -> float | None:
    text = _normalize(message)
    star_count = message.count("⭐")
    if 1 <= star_count <= 5:
        return float(star_count)

    decimal_match = re.search(r"\b([1-5](?:\.\d+)?)\s*(?:/\s*5)?\s*(?:star|stars?)\b", text)
    if decimal_match:
        value = float(decimal_match.group(1))
        if 1 <= value <= 5:
            return round(value, 1)

    match = re.search(r"\b([1-5])\s*(/\s*5|star|stars)\b", text)
    if match:
        return float(match.group(1))

    return None


def _extract_order_id(message: str, fallback: int | None = None) -> int | None:
    normalized = _normalize(message)
    match = re.search(r"(?:order|booking)\s*#?\s*(\d+)", normalized)
    if match:
        return int(match.group(1))

    # Natural sentence fallback: e.g. "53 er status bolo"
    numbers = re.findall(r"\b\d{1,10}\b", normalized)
    if numbers:
        return int(numbers[-1])

    only_number = re.fullmatch(r"\s*(\d{1,10})\s*", message or "")
    if only_number:
        return int(only_number.group(1))

    if fallback:
        return fallback

    return None


def _extract_date_text(message: str, fallback: str = "") -> str:
    normalized = _normalize(message)

    # ISO / numeric formats
    pattern = re.search(
        r"(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|today|tomorrow|next\s+[a-z]+)",
        normalized,
    )
    if pattern:
        return pattern.group(1)

    # Natural language formats: "9 april 2026" / "april 9 2026"
    month_names = (
        "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
        "jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
    )

    day_month_year = re.search(rf"\b(\d{{1,2}}\s+(?:{month_names})\s+\d{{2,4}})\b", normalized)
    if day_month_year:
        return day_month_year.group(1)

    month_day_year = re.search(rf"\b((?:{month_names})\s+\d{{1,2}}(?:st|nd|rd|th)?(?:,)?\s+\d{{2,4}})\b", normalized)
    if month_day_year:
        return month_day_year.group(1)

    return fallback or ""


def _extract_location_text(message: str, fallback: str = "") -> str:
    text = message or ""
    normalized = _normalize(text)

    def _clean_location_candidate(value: str) -> str:
        cleaned = (value or "").strip(" :,-")
        if not cleaned:
            return ""

        cleaned = re.sub(r"^(?:should\s*be|is|are|hobe|holo|to)\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.split(r"\b(?:sms|eta|dsi|dise|disi|please|pls)\b", cleaned, maxsplit=1, flags=re.IGNORECASE)[0]
        return cleaned.strip(" :,-")[:120]

    markers = ["location", "address", "area", "from", "at", "in"]
    for marker in markers:
        idx = normalized.find(f"{marker} ")
        if idx != -1:
            guessed = _clean_location_candidate(text[idx + len(marker) :])
            if guessed:
                return guessed

    # If user directly types area text (e.g. "mirpur dhaka"), keep the full input.
    compact_text = text.strip(" :,-")
    if compact_text and len(compact_text.split()) <= 6 and not re.search(r"\d{4}-\d{2}-\d{2}", compact_text):
        # Do not treat phone-like inputs as location.
        if re.fullmatch(r"\+?\d[\d\s\-]{8,18}\d", compact_text):
            return fallback or ""
        cleaned_compact = _clean_location_candidate(compact_text)
        if cleaned_compact:
            return cleaned_compact

    for area in sorted(BD_LOCATIONS, key=lambda x: len(x), reverse=True):
        if _normalize(area) in normalized:
            return area

    return fallback or ""


def _extract_phone_text(message: str, fallback: str = "") -> str:
    text = (message or "").strip()
    match = re.search(r"(\+?\d[\d\s\-]{8,18}\d)", text)
    if not match:
        return fallback or ""

    raw = match.group(1)
    digits = re.sub(r"\D", "", raw)
    if 10 <= len(digits) <= 15:
        return raw
    return fallback or ""


def _is_valid_phone(phone: str) -> bool:
    digits = re.sub(r"\D", "", phone or "")
    return 10 <= len(digits) <= 15


def _extract_name_text(message: str, fallback: str = "", allow_plain_name: bool = False) -> str:
    text = (message or "").strip()
    normalized = _normalize(text)

    # explicit format: "name: Rizvi" or "name - Rizvi"
    explicit = re.search(r"\bname\s*[:\-]\s*([a-zA-Z][a-zA-Z\s'.-]{1,80})", text, flags=re.IGNORECASE)
    if explicit:
        return explicit.group(1).strip()[:120]

    for prefix in ["my name is", "name is", "i am", "ami", "amar naam", "amar nam"]:
        if normalized.startswith(prefix):
            candidate = text[len(prefix):].strip(" :,-")
            if candidate:
                return candidate[:120]

    if allow_plain_name:
        candidate = text.strip(" :,-")
        if candidate and len(candidate.split()) <= 4:
            if re.fullmatch(r"[A-Za-z][A-Za-z\s'.-]{1,80}", candidate):
                blocked_terms = [
                    "confirm",
                    "booking",
                    "book",
                    "today",
                    "tomorrow",
                    "address",
                    "location",
                    "mirpur",
                    "dhaka",
                ]
                lowered = _normalize(candidate)
                if not any(term in lowered for term in blocked_terms):
                    return candidate[:120]

    # Don't infer arbitrary plain text as a name; collect name explicitly.
    return fallback or ""


def _to_service_payload(services: list[Service]) -> list[dict[str, Any]]:
    return [
        {
            "id": service.id,
            "name": service.name,
            "category": service.category.name if service.category else "General",
            "price": float(service.price),
            "description": (service.description or "")[:180],
            "available_locations": list(service.available_locations or []),
        }
        for service in services
    ]


def _call_groq_problem_classifier(message: str) -> dict[str, Any] | None:
    api_key = getattr(settings, "GROQ_API_KEY", "")
    if not api_key:
        return None

    services = _compact_services(limit=15)
    prompt = (
        "You are an intent and recommendation classifier for a Bangladesh household service chatbot. "
        "Users may write in English, Bangla, or Banglish. "
        "Return ONLY compact JSON with keys: intent, problem_summary, suggested_service_names. "
        "intent must be one of: service_info, booking_assistant, service_recommendation, order_tracking, review_feedback, location_availability.\n"
        f"Available services: {json.dumps(services, ensure_ascii=True)}\n"
        f"User message: {message}"
    )

    payload = {
        "model": getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile"),
        "messages": [
            {"role": "system", "content": "Respond with valid compact JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 240,
    }

    try:
        response = requests.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=12,
        )
        if response.status_code >= 400:
            return None

        data = response.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return _parse_json_from_text(text)
    except Exception:
        return None


def _recommended_services_from_problem(message: str, groq_data: dict[str, Any] | None) -> list[Service]:
    queryset = Service.objects.select_related("category").all()

    normalized = _normalize(message)

    # Fan issues should prioritize fan/electrical services (not AC by default)
    if "fan" in normalized:
        fan_matches = list(
            queryset.filter(
                Q(name__icontains="fan")
                | Q(description__icontains="fan")
                | Q(category__name__icontains="electrical")
                | Q(category__name__icontains="electric")
            )
            .exclude(Q(name__icontains="ac") | Q(category__name__icontains="ac repair"))[:5]
        )
        if fan_matches:
            return fan_matches

    # 1) Deterministic keyword mapping gets highest priority
    for keyword, hint in PROBLEM_KEYWORD_TO_SERVICE.items():
        if keyword in normalized:
            matches = list(queryset.filter(Q(name__icontains=hint) | Q(category__name__icontains=hint))[:5])
            if matches:
                return matches

    # 2) Then use model suggestions
    suggestions = []
    if groq_data:
        suggestions = groq_data.get("suggested_service_names") or []

    for suggested in suggestions:
        hit = queryset.filter(name__icontains=str(suggested)).first()
        if hit:
            return [hit]

    by_text = _find_services_by_text(message, limit=5)
    if by_text:
        return by_text

    return list(queryset.order_by("name")[:3])


def _select_service_from_text_or_context(message: str, context: dict[str, Any]) -> Service | None:
    service_id = context.get("service_id")
    if service_id:
        service = Service.objects.select_related("category").filter(id=service_id).first()
        if service:
            return service

    hits = _find_services_by_text(message, limit=3)
    return hits[0] if hits else None


def _handle_service_info(message: str) -> tuple[str, dict[str, Any]]:
    if _is_service_list_query(message):
        services = list(Service.objects.select_related("category").order_by("name"))
        categories = sorted({s.category.name for s in services if s.category})
        category_text = ", ".join(categories[:6]) if categories else "multiple categories"
        return (
            f"Available services include {category_text}. Showing all available services:",
            {"services": _to_service_payload(services), "feature": "service_info_faq"},
        )

    services = _find_services_by_text(message, limit=5)
    if not services:
        services = list(Service.objects.select_related("category").order_by("name")[:5])

    first = services[0]
    return (
        f"Top match: {first.name} ({first.category.name if first.category else 'General'}) costs around BDT {float(first.price):.2f}.",
        {"services": _to_service_payload(services), "feature": "service_info_faq"},
    )


def _handle_booking_assistant(user, message: str, context: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    service = _select_service_from_text_or_context(message, context)
    booking_date = _extract_date_text(message, fallback=context.get("booking_date", ""))
    location = _extract_location_text(message, fallback=context.get("location", ""))
    collecting_name_stage = bool(
        context.get("service_id")
        and context.get("booking_date")
        and context.get("location")
        and not context.get("booking_name")
    )
    booking_name = _extract_name_text(
        message,
        fallback=context.get("booking_name", ""),
        allow_plain_name=collecting_name_stage,
    )
    booking_phone = _extract_phone_text(message, fallback=context.get("booking_phone", ""))
    confirm_booking = bool(context.get("confirm_booking")) or any(
        token in _normalize(message) for token in ["confirm", "book it", "done", "yes confirm"]
    )

    if not service:
        picks = list(Service.objects.select_related("category").order_by("name")[:8])
        return (
            "Kon service book korte chan? Please service select korun ba naam likhun.",
            {
                "feature": "booking_assistant",
                "step": "choose_service",
                "services": _to_service_payload(picks),
                "context": {
                    **context,
                    "service_id": None,
                    "booking_date": booking_date,
                    "location": location,
                    "booking_name": booking_name,
                    "booking_phone": booking_phone,
                    "confirm_booking": False,
                },
            },
        )

    if not booking_date:
        return (
            f"{service.name} selected. Kon date e booking dibo?",
            {
                "feature": "booking_assistant",
                "step": "choose_date",
                "services": _to_service_payload([service]),
                "context": {
                    **context,
                    "service_id": service.id,
                    "booking_date": "",
                    "location": location,
                    "booking_name": "",
                    "booking_phone": "",
                    "confirm_booking": False,
                },
            },
        )

    if not location:
        return (
            f"Date noted: {booking_date}. Ebar location/address din.",
            {
                "feature": "booking_assistant",
                "step": "choose_location",
                "services": _to_service_payload([service]),
                "context": {
                    **context,
                    "service_id": service.id,
                    "booking_date": booking_date,
                    "location": "",
                    "booking_name": booking_name,
                    "booking_phone": booking_phone,
                    "confirm_booking": False,
                },
            },
        )

    if not booking_name:
        return (
            "Booking er jonno apnar full name din (example: Rifat Rizvi).",
            {
                "feature": "booking_assistant",
                "step": "collect_name",
                "services": _to_service_payload([service]),
                "context": {
                    **context,
                    "service_id": service.id,
                    "booking_date": booking_date,
                    "location": location,
                    "booking_name": "",
                    "booking_phone": booking_phone,
                    "confirm_booking": False,
                },
            },
        )

    if not booking_phone:
        return (
            "Booking er jonno phone number din (example: 01XXXXXXXXX).",
            {
                "feature": "booking_assistant",
                "step": "collect_phone",
                "services": _to_service_payload([service]),
                "context": {
                    **context,
                    "service_id": service.id,
                    "booking_date": booking_date,
                    "location": location,
                    "booking_name": booking_name,
                    "booking_phone": "",
                    "confirm_booking": False,
                },
            },
        )

    if not _is_valid_phone(booking_phone):
        return (
            "Phone number ta valid na. Please valid number din (10-15 digits).",
            {
                "feature": "booking_assistant",
                "step": "collect_phone",
                "services": _to_service_payload([service]),
                "context": {
                    **context,
                    "service_id": service.id,
                    "booking_date": booking_date,
                    "location": location,
                    "booking_name": booking_name,
                    "booking_phone": "",
                    "confirm_booking": False,
                },
            },
        )

    if not confirm_booking:
        return (
            (
                "Please confirm booking -> "
                f"Service: {service.name}, Date: {booking_date}, Location: {location}, "
                f"Name: {booking_name}, Phone: {booking_phone}. Reply with 'confirm'."
            ),
            {
                "feature": "booking_assistant",
                "step": "confirm",
                "services": _to_service_payload([service]),
                "context": {
                    **context,
                    "service_id": service.id,
                    "booking_date": booking_date,
                    "location": location,
                    "booking_name": booking_name,
                    "booking_phone": booking_phone,
                    "confirm_booking": False,
                },
            },
        )

    if not user.is_authenticated:
        return (
            "Booking create korte login lagbe. Please login kore abar confirm korun.",
            {
                "feature": "booking_assistant",
                "step": "login_required",
                "services": _to_service_payload([service]),
                "context": {
                    **context,
                    "service_id": service.id,
                    "booking_date": booking_date,
                    "location": location,
                    "booking_name": booking_name,
                    "booking_phone": booking_phone,
                    "confirm_booking": True,
                },
            },
        )

    order = Order.objects.create(
        client=user,
        total_price=service.price,
        status=Order.NOT_PAID,
        contact_name=booking_name,
        contact_phone=booking_phone,
        service_address=location,
        preferred_date=booking_date,
    )
    OrderItem.objects.create(order=order, service=service, quantity=1, price=service.price)

    try:
        conversation, _ = SupportConversation.objects.get_or_create(client=user)
        body = f"AI booking created -> Order #{order.id} | Service={service.name} | Date={booking_date} | Location={location}"
        message_obj = SupportMessage.objects.create(conversation=conversation, sender=user, body=body)
        conversation.last_message_at = message_obj.created_at
        conversation.client_last_read_at = message_obj.created_at
        if not conversation.subject:
            conversation.subject = "AI Booking Request"
        conversation.save(update_fields=["last_message_at", "client_last_read_at", "subject"])
    except Exception:
        pass

    return (
        f"Done! Order #{order.id} created with payment pending. Orders page theke payment kore booking confirm korte parben.",
        {
            "feature": "booking_assistant",
            "step": "completed",
            "services": _to_service_payload([service]),
            "order": {
                "id": order.id,
                "status": order.status,
                "status_text": STATUS_TEXT.get(order.status, order.status),
                "total_price": float(order.total_price),
            },
            "context": {
                "service_id": None,
                "booking_date": "",
                "location": "",
                "booking_name": "",
                "booking_phone": "",
                "confirm_booking": False,
                "awaiting_order_id": False,
                "pending_rating": None,
            },
        },
    )


def _handle_order_tracking(user, message: str, context: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    if not user.is_authenticated:
        return "Order tracking requires login.", {"feature": "order_tracking", "requires_auth": True}

    normalized = _normalize(message)
    wants_latest = any(token in normalized for token in ["latest", "recent", "newest", "last order", "latest order"])

    order_id = _extract_order_id(message, fallback=None if wants_latest else context.get("order_id"))

    queryset = Order.objects.prefetch_related("items__service").filter(client=user).order_by("-id")

    if wants_latest:
        order = queryset.first()
        if not order:
            return "I could not find any booking yet. Place a service order first.", {"feature": "order_tracking"}
    elif not order_id:
        recent = list(Order.objects.filter(client=user).order_by("-id").values_list("id", flat=True)[:5])
        suffix = f" Recent orders: {', '.join(str(x) for x in recent)}." if recent else ""
        return (
            f"Kon order status dekhte chan? Please Order ID din.{suffix}",
            {
                "feature": "order_tracking",
                "step": "ask_order_id",
                "context": {
                    **context,
                    "awaiting_order_id": True,
                    "order_id": None,
                },
            },
        )

    else:
        order = queryset.filter(id=order_id).first()

    if not order:
        return (
            f"Order #{order_id} paoa jai ni. Please correct order ID din.",
            {
                "feature": "order_tracking",
                "context": {
                    **context,
                    "awaiting_order_id": True,
                    "order_id": None,
                },
            },
        )

    item_names = [item.service.name for item in order.items.all()[:3]]
    return (
        f"Order #{order.id}: {STATUS_TEXT.get(order.status, order.status)}",
        {
            "feature": "order_tracking",
            "order": {
                "id": order.id,
                "status": order.status,
                "status_text": STATUS_TEXT.get(order.status, order.status),
                "created_at": order.created_at,
                "items": item_names,
                "total_price": float(order.total_price),
                "contact_name": order.contact_name,
                "contact_phone": order.contact_phone,
                "service_address": order.service_address,
                "preferred_date": order.preferred_date,
            },
            "context": {
                **context,
                "awaiting_order_id": False,
                "order_id": order.id,
            },
        },
    )


def _handle_order_update(user, message: str, context: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    if not user.is_authenticated:
        return "Order update করতে login লাগবে.", {"feature": "order_update", "requires_auth": True}

    normalized = _normalize(message)
    order_id = _extract_order_id(message, fallback=context.get("order_id"))

    # For existing order edit, avoid stale fallback location from booking context.
    new_location = _extract_location_text(message, fallback="")
    if context.get("awaiting_new_location") and not new_location:
        plain = (message or "").strip()
        if plain:
            new_location = plain[:120]

    if context.get("awaiting_update_order_id") and not order_id:
        return (
            "Kon order update korte chan? Please order ID din.",
            {
                "feature": "order_update",
                "step": "ask_order_id",
                "context": {
                    **context,
                    "awaiting_update_order_id": True,
                    "awaiting_new_location": False,
                },
            },
        )

    if not order_id:
        return (
            "Order location change korte order ID din (example: order 54).",
            {
                "feature": "order_update",
                "step": "ask_order_id",
                "context": {
                    **context,
                    "awaiting_update_order_id": True,
                    "awaiting_new_location": False,
                },
            },
        )

    order = Order.objects.filter(client=user, id=order_id).first()
    if not order:
        return (
            f"Order #{order_id} পাওয়া যায়নি. Correct order ID দিন.",
            {
                "feature": "order_update",
                "step": "ask_order_id",
                "context": {
                    **context,
                    "order_id": None,
                    "awaiting_update_order_id": True,
                    "awaiting_new_location": False,
                },
            },
        )

    if not new_location:
        return (
            f"Order #{order.id} এর নতুন location/address দিন.",
            {
                "feature": "order_update",
                "step": "ask_new_location",
                "order": {
                    "id": order.id,
                    "service_address": order.service_address,
                },
                "context": {
                    **context,
                    "order_id": order.id,
                    "awaiting_update_order_id": False,
                    "awaiting_new_location": True,
                },
            },
        )

    order.service_address = new_location
    order.save(update_fields=["service_address"])

    return (
        f"Done ✅ Order #{order.id} location updated to: {order.service_address}. (Your profile address unchanged)",
        {
            "feature": "order_update",
            "saved": True,
            "order": {
                "id": order.id,
                "service_address": order.service_address,
                "contact_name": order.contact_name,
                "contact_phone": order.contact_phone,
                "preferred_date": order.preferred_date,
            },
            "context": {
                **context,
                "order_id": order.id,
                "awaiting_update_order_id": False,
                "awaiting_new_location": False,
            },
        },
    )


def _latest_order_service_for_user(user, context: dict[str, Any]) -> Service | None:
    context_order_id = context.get("order_id")
    if context_order_id:
        item = (
            OrderItem.objects.select_related("service", "order")
            .filter(order__client=user, order_id=context_order_id)
            .order_by("-id")
            .first()
        )
        if item and item.service:
            return item.service

    item = (
        OrderItem.objects.select_related("service", "order")
        .filter(order__client=user)
        .order_by("-order__created_at", "-id")
        .first()
    )
    return item.service if item else None


def _latest_order_with_services_for_user(user) -> tuple[Order | None, list[Service]]:
    order = (
        Order.objects.filter(client=user)
        .prefetch_related("items__service")
        .order_by("-created_at", "-id")
        .first()
    )
    if not order:
        return None, []

    services: list[Service] = []
    seen: set[int] = set()
    for item in order.items.all():
        service = item.service
        if not service:
            continue
        if service.id in seen:
            continue
        seen.add(service.id)
        services.append(service)

    return order, services


def _services_for_order(user, order_id: int) -> tuple[Order | None, list[Service]]:
    order = (
        Order.objects.filter(client=user, id=order_id)
        .prefetch_related("items__service")
        .first()
    )
    if not order:
        return None, []

    services: list[Service] = []
    seen: set[int] = set()
    for item in order.items.all():
        service = item.service
        if not service:
            continue
        if service.id in seen:
            continue
        seen.add(service.id)
        services.append(service)

    return order, services


def _extract_review_comment(message: str) -> str:
    text = (message or "").strip()
    if not text:
        return ""

    cleaned = text
    cleaned = re.sub(r"[⭐★]+", " ", cleaned)
    cleaned = re.sub(r"\border\s*#?\s*\d+\s*:?(?:\s*(?:er\s+jnno|for))?", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:ami|i)\s*(?:give|gave|rate|rated|dilam|disi|dichi)?\s*[1-5](?:\.\d+)?\s*(?:/\s*5)?\s*stars?\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b[1-5](?:\.\d+)?\s*(?:/\s*5)?\s*stars?\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:rating|review|feedback)\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:dilam|disi|dichi)\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,:;-")
    return cleaned[:300]


def _explicit_service_from_message_for_user_orders(user, message: str) -> Service | None:
    text_hits = _find_services_by_text(message, limit=6)
    if not text_hits:
        return None

    ordered_service_ids = set(
        Service.objects.filter(orderitem__order__client=user)
        .distinct()
        .values_list("id", flat=True)
    )
    for service in text_hits:
        if service.id in ordered_service_ids:
            return service

    return None


def _handle_review_feedback(user, message: str, context: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    if not user.is_authenticated:
        return "Please login to submit a rating and feedback.", {"feature": "review_feedback", "requires_auth": True}

    rating = _extract_rating(message) or context.get("pending_rating")
    if not rating:
        return (
            "Please rating din (1-5 star).",
            {"feature": "review_feedback", "step": "collect_rating", "context": {**context, "pending_rating": None}},
        )

    rating_value = float(rating)
    if not (1 <= rating_value <= 5):
        return (
            "Rating must be between 1 and 5.",
            {"feature": "review_feedback", "step": "collect_rating", "context": {**context, "pending_rating": None}},
        )

    explicit_order_id = _extract_order_id(message, fallback=None)
    context_order_id = context.get("order_id")
    target_order_id = explicit_order_id or context_order_id

    target_services: list[Service] = []
    bound_order: Order | None = None

    # Highest priority: explicit/context order id -> review services from that order.
    if target_order_id:
        bound_order, target_services = _services_for_order(user, int(target_order_id))
        if explicit_order_id and not bound_order:
            return (
                f"Order #{explicit_order_id} paoa jai ni. Please correct order ID din.",
                {
                    "feature": "review_feedback",
                    "step": "collect_order_id",
                    "context": {**context, "pending_rating": rating_value, "order_id": None},
                },
            )

    # No order-id target found => fall back to explicit service in message, then latest order services.
    if not target_services:
        service = _explicit_service_from_message_for_user_orders(user, message)
        if not service:
            latest_order, latest_services = _latest_order_with_services_for_user(user)
            if latest_services:
                bound_order = latest_order
                target_services = latest_services
        else:
            target_services = [service]

    if not target_services:
        recent_services = list(
            Service.objects.filter(orderitem__order__client=user)
            .distinct()
            .select_related("category")
            .order_by("name")[:6]
        )
        return (
            "Kon service-er jonno feedback dite chan? Service select korun ba service name likhun.",
            {
                "feature": "review_feedback",
                "step": "choose_service",
                "services": _to_service_payload(recent_services),
                "context": {**context, "pending_rating": rating_value, "service_id": None},
            },
        )

    comment = _extract_review_comment(message)

    saved_reviews: list[dict[str, Any]] = []
    created_any = False
    for service in target_services:
        review, created = Review.objects.update_or_create(
            service=service,
            client=user,
            defaults={
                "rating": rating_value,
                "comment": comment,
            },
        )
        created_any = created_any or created

        service.avg_rating = service.reviews.aggregate(avg=Avg("rating"))["avg"] or 0
        service.save(update_fields=["avg_rating"])

        saved_reviews.append(
            {
                "id": review.id,
                "service_id": service.id,
                "service_name": service.name,
                "rating": float(review.rating),
                "comment": review.comment,
            }
        )

    saved_client_name = user.get_full_name() or user.email
    action_word = "saved" if created_any else "updated"
    service_names = ", ".join(item["service_name"] for item in saved_reviews)
    rating_text = f"{rating_value:.1f}".rstrip("0").rstrip(".")
    if bound_order:
        reply_text = (
            f"Thanks! Order #{bound_order.id} er service ({service_names}) e apnar {rating_text}-star feedback {action_word} hoyeche."
        )
    else:
        reply_text = f"Thanks! Your {rating_text}-star feedback for {service_names} has been {action_word}."

    return (
        reply_text,
        {
            "feature": "review_feedback",
            "saved": True,
            "review": {
                **saved_reviews[0],
                "client_name": saved_client_name,
            },
            "reviews": [
                {
                    **item,
                    "client_name": saved_client_name,
                }
                for item in saved_reviews
            ],
            "order": {"id": bound_order.id} if bound_order else None,
            "context": {
                **context,
                "pending_rating": None,
                "service_id": None,
                "order_id": bound_order.id if bound_order else context.get("order_id"),
            },
        },
    )


def _filter_services_for_location(location: str) -> list[Service]:
    normalized_location = _normalize(location)
    services = list(Service.objects.select_related("category").order_by("name"))

    matched = []
    for service in services:
        available_locations = [str(x).strip() for x in (service.available_locations or []) if str(x).strip()]
        if not available_locations:
            continue
        if any(_normalize(loc) in normalized_location or normalized_location in _normalize(loc) for loc in available_locations):
            matched.append(service)

    return matched


def _handle_location_availability(user, message: str, context: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    location = _extract_location_text(message, fallback=context.get("location", ""))

    if not location and user.is_authenticated:
        location = (getattr(user, "address", "") or "").strip()

    slots = ["09:00-11:00", "12:00-14:00", "16:00-18:00"]
    if not location:
        return (
            "Please area/location din (example: Mirpur, Dhanmondi, Uttara).",
            {
                "feature": "location_availability",
                "step": "collect_location",
                "slots": slots,
                "context": {**context, "location": ""},
            },
        )

    matched_services = _filter_services_for_location(location)

    if not matched_services:
        return (
            f"{location} area-r jonno exact service data pai ni. Please nearby popular areas: {', '.join(BD_LOCATIONS[:8])} try korun.",
            {
                "feature": "location_availability",
                "available": False,
                "location": location,
                "slots": slots,
                "services": [],
                "context": {**context, "location": location},
            },
        )

    return (
        f"{location} area-te service available. Preferred slots: {', '.join(slots)}.",
        {
            "feature": "location_availability",
            "available": True,
            "location": location,
            "slots": slots,
            "services": _to_service_payload(matched_services[:8]),
            "context": {**context, "location": location},
        },
    )


def _handle_recommendation(message: str, groq_data: dict[str, Any] | None) -> tuple[str, dict[str, Any]]:
    services = _recommended_services_from_problem(message, groq_data)
    payload = _to_service_payload(services)

    summary = groq_data.get("problem_summary") if groq_data else None

    primary = payload[0]["name"] if payload else "a suitable service"
    reply = f"Apnar problem onujayi recommend: {primary}."
    if summary:
        reply += f" Detected issue: {summary}."

    # Carry forward recommended service so next "book koro" can continue with same service.
    primary_service_id = payload[0]["id"] if payload else None

    return (
        reply,
        {
            "feature": "service_recommendation",
            "services": payload,
            "ai_used": bool(groq_data),
            "context": {
                "service_id": primary_service_id,
            },
        },
    )


def _is_admin_user(user) -> bool:
    return bool(getattr(user, "is_authenticated", False)) and (
        getattr(user, "role", "") == "admin" or getattr(user, "is_staff", False)
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assistant_admin_users(request):
    if not _is_admin_user(request.user):
        return Response({"detail": "Only admins can access AI activity."}, status=status.HTTP_403_FORBIDDEN)

    rows = (
        AssistantChatSession.objects.values(
            "user_id",
            "user__first_name",
            "user__last_name",
            "user__email",
            "user__role",
        )
        .annotate(
            session_count=Count("id", distinct=True),
            message_count=Count("messages", distinct=True),
            first_used_at=Min("created_at"),
            last_message_at=Max("last_message_at"),
        )
        .order_by("-last_message_at")
    )

    payload = []
    for row in rows:
        full_name = f"{(row.get('user__first_name') or '').strip()} {(row.get('user__last_name') or '').strip()}".strip()
        payload.append(
            {
                "id": row["user_id"],
                "name": full_name or row.get("user__email") or f"User {row['user_id']}",
                "email": row.get("user__email") or "",
                "role": row.get("user__role") or "client",
                "session_count": int(row.get("session_count") or 0),
                "message_count": int(row.get("message_count") or 0),
                "first_used_at": row.get("first_used_at"),
                "last_message_at": row.get("last_message_at"),
            }
        )

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assistant_admin_user_messages(request, user_id: int):
    if not _is_admin_user(request.user):
        return Response({"detail": "Only admins can access AI activity."}, status=status.HTTP_403_FORBIDDEN)

    sessions = (
        AssistantChatSession.objects.filter(user_id=user_id)
        .select_related("user")
        .prefetch_related("messages")
        .order_by("-last_message_at", "-updated_at")
    )

    user_session = sessions.first()
    if not user_session:
        return Response({"detail": "No AI chat history found for this user."}, status=status.HTTP_404_NOT_FOUND)

    user_obj = user_session.user
    full_name = f"{(getattr(user_obj, 'first_name', '') or '').strip()} {(getattr(user_obj, 'last_name', '') or '').strip()}".strip()

    session_items = []
    total_messages = 0
    for session in sessions:
        messages = list(session.messages.all())
        total_messages += len(messages)
        session_items.append(
            {
                "id": session.id,
                "title": session.title,
                "created_at": session.created_at,
                "updated_at": session.updated_at,
                "last_message_at": session.last_message_at,
                "message_count": len(messages),
                "messages": [
                    {
                        "id": message.id,
                        "role": message.role,
                        "text": message.text,
                        "data": _to_json_safe(message.data or {}),
                        "created_at": message.created_at,
                    }
                    for message in messages
                ],
            }
        )

    return Response(
        {
            "user": {
                "id": user_obj.id,
                "name": full_name or user_obj.email,
                "email": user_obj.email,
                "role": getattr(user_obj, "role", "client"),
            },
            "summary": {
                "session_count": len(session_items),
                "message_count": total_messages,
                "first_used_at": min((item["created_at"] for item in session_items), default=None),
                "last_message_at": max((item["last_message_at"] for item in session_items), default=None),
            },
            "sessions": session_items,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def assistant_chat(request):
    serializer = ChatbotRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    message = serializer.validated_data["message"]
    session_id = serializer.validated_data.get("session_id")
    request_context = serializer.validated_data.get("context") or {}

    session = _get_assistant_session(request.user, session_id=session_id, first_message=message)
    persisted_context = (session.context or {}) if session else {}
    context = {**persisted_context, **request_context}
    normalized_message = _normalize(message)

    booking_terms = [
        "book",
        "booking",
        "reserve",
        "appointment",
        "confirm",
        "date",
        "location",
        "address",
        "phone",
        "name",
    ]
    has_booking_state = any(
        bool(context.get(key))
        for key in ["booking_date", "location", "booking_name", "booking_phone", "confirm_booking"]
    )
    booking_context_active = bool(context.get("service_id")) and (
        has_booking_state or any(token in normalized_message for token in booking_terms)
    )

    review_signal = bool(_extract_rating(message)) or any(
        token in normalized_message for token in ["review", "rating", "feedback", "star", "rate"]
    )

    # Keep conversation state deterministic for multi-turn flows.
    if review_signal and (context.get("pending_rating") or _extract_order_id(message, fallback=None) or "order" in normalized_message):
        intent = "review_feedback"
        groq_data = None
    elif booking_context_active:
        intent = "booking_assistant"
        groq_data = None
    elif context.get("awaiting_update_order_id"):
        intent = "order_update"
        groq_data = None
    elif context.get("awaiting_new_location") and context.get("order_id"):
        intent = "order_update"
        groq_data = None
    # If previous step asked for Order ID, force tracking intent when user sends a number.
    elif context.get("awaiting_order_id") and _extract_order_id(message):
        intent = "order_tracking"
        groq_data = None
    elif context.get("pending_rating") and not context.get("service_id"):
        intent = "review_feedback"
        groq_data = None
    elif _is_small_talk(message):
        intent = "small_talk"
        groq_data = None
    else:
        groq_data = _call_groq_problem_classifier(message)
        intent = _rules_intent(message)

    if groq_data and groq_data.get("intent"):
        groq_intent = str(groq_data["intent"]).strip()
        allowed = {
            "service_info",
            "booking_assistant",
            "service_recommendation",
            "order_tracking",
            "order_update",
            "review_feedback",
            "location_availability",
        }
        if groq_intent in allowed:
            # Don't let model drift clear problem statements into generic service-info intent.
            if _has_problem_signal(message) and groq_intent == "service_info":
                groq_intent = "service_recommendation"
            intent = groq_intent

    if intent == "service_info":
        reply, data = _handle_service_info(message)
    elif intent == "small_talk":
        reply, data = _handle_small_talk()
    elif intent == "booking_assistant":
        reply, data = _handle_booking_assistant(request.user, message, context)
    elif intent == "order_tracking":
        reply, data = _handle_order_tracking(request.user, message, context)
    elif intent == "order_update":
        reply, data = _handle_order_update(request.user, message, context)
    elif intent == "review_feedback":
        reply, data = _handle_review_feedback(request.user, message, context)
    elif intent == "location_availability":
        reply, data = _handle_location_availability(request.user, message, context)
    else:
        reply, data = _handle_recommendation(message, groq_data)

    response_context = data.get("context", context)
    safe_data = _to_json_safe(data)
    safe_context = _to_json_safe(response_context)

    if session:
        AssistantChatMessage.objects.create(
            session=session,
            role=AssistantChatMessage.ROLE_USER,
            text=message,
            data={},
        )
        AssistantChatMessage.objects.create(
            session=session,
            role=AssistantChatMessage.ROLE_ASSISTANT,
            text=reply,
            data=safe_data,
        )

        if session.title == "New Chat":
            session.title = _make_chat_title(message)

        session.context = safe_context
        session.last_message_at = timezone.now()
        session.save(update_fields=["title", "context", "last_message_at", "updated_at"])

    return Response(
        {
            "intent": intent,
            "reply": reply,
            "data": safe_data,
            "context": safe_context,
            "session_id": session.id if session else None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def assistant_sessions(request):
    if request.method == "GET":
        queryset = AssistantChatSession.objects.filter(user=request.user).prefetch_related("messages")
        serialized = AssistantChatSessionListSerializer(queryset, many=True)
        return Response(serialized.data, status=status.HTTP_200_OK)

    title = (request.data.get("title") or "").strip() or "New Chat"
    session = AssistantChatSession.objects.create(user=request.user, title=title, context={})
    serialized = AssistantChatSessionDetailSerializer(session)
    return Response(serialized.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def assistant_session_detail(request, session_id: int):
    session = AssistantChatSession.objects.filter(id=session_id, user=request.user).prefetch_related("messages").first()
    if not session:
        return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serialized = AssistantChatSessionDetailSerializer(session)
    return Response(serialized.data, status=status.HTTP_200_OK)
