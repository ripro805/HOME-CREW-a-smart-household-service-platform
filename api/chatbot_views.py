from __future__ import annotations

import json
import re
import base64
import ast
from pathlib import Path
from typing import Any

import requests
from django.conf import settings
from django.db.models import Q, Avg, Count, Max, Min, OuterRef, Subquery
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from orders.models import Order, OrderItem
from orders.service import OrderService
from services.models import Review, Service

from .models import SupportConversation, SupportMessage, AssistantChatSession, AssistantChatMessage
from .serializers import (
    ChatbotRequestSerializer,
    AssistantChatSessionListSerializer,
    AssistantChatSessionDetailSerializer,
)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

ALLOWED_AI_INTENTS = {
    "service_info",
    "booking_assistant",
    "service_recommendation",
    "order_tracking",
    "review_feedback",
    "location_availability",
}


def _gemini_api_url() -> str:
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-flash-latest")
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"


def _gemini_vision_api_url() -> str:
    model_name = getattr(settings, "GEMINI_VISION_MODEL", "gemini-flash-latest")
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"


def _gemini_vision_models_to_try() -> list[str]:
    candidates = [
        getattr(settings, "GEMINI_VISION_MODEL", ""),
        getattr(settings, "GEMINI_MODEL", ""),
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ]
    cleaned: list[str] = []
    for model_name in candidates:
        value = str(model_name or "").strip()
        if value and value not in cleaned:
            cleaned.append(value)
    return cleaned


def _build_ai_classifier_prompt(message: str, services: list[dict[str, Any]]) -> str:
    schema = {
        "intent": "one of service_info|booking_assistant|service_recommendation|order_tracking|review_feedback|location_availability",
        "problem_summary": "short one-line issue summary in plain text",
        "suggested_service_names": ["service names from available services list only"],
    }

    examples = [
        {
            "user": "amar ac thanda kom dicche, best option bolen",
            "json": {
                "intent": "service_recommendation",
                "problem_summary": "AC cooling issue",
                "suggested_service_names": ["AC Servicing"],
            },
        },
        {
            "user": "booking korte chai kal dhaka mirpur e",
            "json": {
                "intent": "booking_assistant",
                "problem_summary": "User wants to create booking",
                "suggested_service_names": [],
            },
        },
        {
            "user": "order 152 status bolo",
            "json": {
                "intent": "order_tracking",
                "problem_summary": "User asked for order status",
                "suggested_service_names": [],
            },
        },
        {
            "user": "ghar nongra hoye ase",
            "json": {
                "intent": "service_recommendation",
                "problem_summary": "Home needs cleaning",
                "suggested_service_names": ["House Cleaning - Basic"],
            },
        },
        {
            "user": "plug e spark hocche, socket e agun er moto",
            "json": {
                "intent": "service_recommendation",
                "problem_summary": "Electrical spark/fire risk",
                "suggested_service_names": ["Socket & Switch Repair"],
            },
        },
        {
            "user": "fridge thanda kore na",
            "json": {
                "intent": "service_recommendation",
                "problem_summary": "Fridge cooling issue",
                "suggested_service_names": ["Appliance Repair - Refrigerator Repair"],
            },
        },
    ]

    available_categories = sorted({str(item.get("category") or "General") for item in services})

    return (
        "You are an intent + recommendation classifier for a Bangladesh household service assistant. "
        "User messages can be Bengali, Banglish, or English.\n"
        "Rules:\n"
        "1) Return strictly valid compact JSON only. No markdown, no prose.\n"
        "2) Keep intent exactly from allowed values.\n"
        "3) suggested_service_names must use only names from available services when possible.\n"
        "4) If uncertain, prefer service_recommendation intent.\n"
        "5) Keep problem_summary short and practical.\n"
        "6) Do NOT suggest unrelated categories (example: sofa/furniture/wood problems must map to Carpentry, not AC or Cleaning).\n"
        "7) Priority category mapping: "
        "dirty/nongra/moila=>House Cleaning or Deep Cleaning; "
        "spark/fire/socket/wiring=>Electrical Work; "
        "fridge/washing machine/microwave/oven=>Appliance Repair; "
        "door/wood/furniture=>Carpentry; "
        "leak/pipe/drain=>Plumbing; "
        "paint/rong/wall=>Painting; "
        "insect/mosquito/cockroach=>Pest Control; "
        "shift/move/packing=>Moving Services; "
        "clothes/wash/iron/laundry=>Laundry Services; "
        "garden/grass/tree=>Gardening; "
        "ac/cooling=>AC Repair.\n"
        "8) suggested_service_names must be from the provided service list and should best match the detected category.\n"
        f"Allowed intents: {sorted(ALLOWED_AI_INTENTS)}\n"
        f"Available categories: {json.dumps(available_categories, ensure_ascii=False)}\n"
        f"Output schema: {json.dumps(schema, ensure_ascii=False)}\n"
        f"Few-shot examples: {json.dumps(examples, ensure_ascii=False)}\n"
        f"Available services: {json.dumps(services, ensure_ascii=False)}\n"
        f"User message: {message}"
    )

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
    "ceiling fan": "Electrical",
    "pakha": "Electrical",
    "পাখা": "Electrical",
    "ফ্যান": "Electrical",
    "light": "Electrical",
    "lights off": "Electrical",
    "switch": "Electrical",
    "socket": "Electrical",
    "plug": "Electrical",
    "outlet": "Electrical",
    "switchboard": "Electrical",
    "wire": "Electrical",
    "wiring": "Electrical",
    "electric": "Electrical",
    "electrical": "Electrical",
    "charge": "Electrical",
    "charging": "Electrical",
    "charger": "Electrical",
    "short": "Electrical",
    "short circuit": "Electrical",
    "spark": "Electrical",
    "fire": "Electrical",
    "smoke": "Electrical",
    "burn": "Electrical",
    "burning": "Electrical",
    "আগুন": "Electrical",
    "স্পার্ক": "Electrical",
    "শর্ট": "Electrical",
    "সকেট": "Electrical",
    "প্লাগ": "Electrical",
    "তার": "Electrical",
    "ধোঁয়া": "Electrical",
    "ধোঁয়া": "Electrical",
    "পুড়ে": "Electrical",
    "পোড়া": "Electrical",
    "rong": "Painting",
    "রং": "Painting",
    "রঙ": "Painting",
    "পেইন্ট": "Painting",
    "painting": "Painting",
    "দেয়াল": "Painting",
    "দেয়াল": "Painting",
    "খসে": "Painting",
    "খসে পড়": "Painting",
    "খসে পড়ে": "Painting",
    "চুন": "Painting",
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
    "kitchen dirty": "Deep Cleaning",
    "kitchen nongra": "Deep Cleaning",
    "rannaghor": "Deep Cleaning",
    "ranna ghor": "Deep Cleaning",
    "রান্নাঘর": "Deep Cleaning",
    "রান্না ঘর": "Deep Cleaning",
    "রান্নাঘর নোংরা": "Deep Cleaning",
    "রান্নাঘর ময়লা": "Deep Cleaning",
    "bathroom": "Cleaning",
    "nongra": "Cleaning",
    "nogra": "Cleaning",
    "noṅgra": "Cleaning",
    "moila": "Cleaning",
    "নোংরা": "Cleaning",
    "ময়লা": "Cleaning",
    "ময়লা": "Cleaning",
    "ঘর নোংরা": "Cleaning",
    "বাসা নোংরা": "Cleaning",
    "house dirty": "Cleaning",
    "mosha": "Pest",
    "মশা": "Pest",
    "cockroach": "Pest",
    "তেলাপোকা": "Pest",
    "pest": "Pest",
    "shift": "Moving",
    "moving": "Moving",
    "relocation": "Moving",
    "laundry": "Laundry",
    "wash & fold": "Laundry",
    "garden": "Gardening",
    "bagan": "Gardening",
    "baganer": "Gardening",
    "ghash": "Gardening",
    "fridge": "Appliance",
    "refrigerator": "Appliance",
    "washing machine": "Appliance",
    "sofa": "Carpentry",
    "furniture": "Carpentry",
    "wood": "Carpentry",
    "carpentry": "Carpentry",
    "cabinet": "Carpentry",
    "wardrobe": "Carpentry",
    "table": "Carpentry",
    "chair": "Carpentry",
    "door": "Carpentry",
    "window": "Carpentry",
    "hinge": "Carpentry",
    "ভাঙা": "Carpentry",
    "broken sofa": "Carpentry",
    "আলমারি": "Carpentry",
    "কাঠ": "Carpentry",
    "কাঠের": "Carpentry",
    "দরজা": "Carpentry",
    "জানালা": "Carpentry",
}


CATEGORY_KEYWORD_HINTS: dict[str, list[str]] = {
    "Carpentry": [
        "sofa", "couch", "furniture", "wood", "wooden", "carpentry", "carpenter", "cabinet", "wardrobe",
        "table", "chair", "door", "window", "hinge", "shelf", "bed", "drawer",
        "ভাঙা", "কাঠ", "কাঠের", "দরজা", "জানালা", "আলমারি", "ফার্নিচার", "সোফা",
    ],
    "Painting": [
        "paint", "painting", "rong", "রং", "রঙ", "পেইন্ট", "দেয়াল", "দেয়াল", "wall", "color", "colour", "খসে",
    ],
    "Plumbing": [
        "plumb", "pipe", "drain", "leak", "water leak", "tap", "faucet", "toilet", "washroom", "পানি", "লিক", "পাইপ",
    ],
    "Electrical Work": [
        "fan", "ceiling fan", "pakha", "পাখা", "ফ্যান", "light", "switch", "socket", "plug", "outlet", "switchboard", "wire", "wiring", "electric", "electrical",
        "charge", "charging", "charger", "short", "short circuit", "spark", "fire", "smoke", "burning",
        "বিদ্যুৎ", "কারেন্ট", "ফ্যান", "লাইট", "সকেট", "প্লাগ", "তার", "আগুন", "স্পার্ক", "শর্ট", "ধোঁয়া", "ধোঁয়া",
    ],
    "AC Repair": [
        "ac", "air condition", "air conditioner", "cooling", "compressor", "এসি",
    ],
    "House Cleaning": [
        "clean", "cleaning", "dirty", "kitchen", "bathroom", "mop", "sanitize", "home cleaning", "house cleaning",
        "nongra", "nogra", "moila", "ghar", "basha", "নোংরা", "ময়লা", "ময়লা", "ঘর নোংরা", "বাসা নোংরা", "বাসা পরিষ্কার", "ঘর পরিষ্কার", "পরিষ্কার",
    ],
    "Deep Cleaning": [
        "deep clean", "deep cleaning", "full clean", "intensive clean", "stain removal", "sanitize full",
        "deep", "kitchen dirty", "kitchen nongra", "rannaghor", "ranna ghor", "রান্নাঘর", "রান্না ঘর",
        "grease", "oily", "ডিপ ক্লিন", "গভীর পরিষ্কার", "পুরা বাসা পরিষ্কার", "রান্নাঘর নোংরা",
    ],
    "Appliance Repair": [
        "fridge", "refrigerator", "washing machine", "washer", "microwave", "oven", "geyser", "heater", "tv", "dishwasher", "freezer",
        "appliance", "electronic item", "ফ্রিজ", "ওয়াশিং মেশিন", "ওয়াশিং মেশিন", "মাইক্রোওয়েভ", "মাইক্রোওয়েভ", "গিজার", "হিটার", "টিভি",
    ],
    "Pest Control": [
        "pest", "mosquito", "mosha", "cockroach", "insect", "termite", "rat", "bed bug", "bug", "fumigation",
        "মশা", "তেলাপোকা", "উই", "ইঁদুর", "পোকা", "পেস্ট",
    ],
    "Moving Services": [
        "move", "moving", "shift", "shifting", "basha shift", "ghar shift", "relocate", "relocation", "packers", "pack", "transport",
        "বাসা বদল", "শিফট", "মুভ", "প্যাকিং", "বহন", "স্থানান্তর",
    ],
    "Laundry Services": [
        "laundry", "wash clothes", "washing", "iron", "press", "dry clean", "garments clean", "cloth cleaning",
        "কাপড়", "কাপড়", "ধোয়া", "ধোয়া", "ইস্ত্রি", "লন্ড্রি", "ড্রাই ক্লিন",
    ],
    "Gardening": [
        "garden", "gardening", "grass", "lawn", "tree", "plant", "prune", "hedge", "watering",
        "bagan", "baganer", "ghash", "বাগান", "ঘাস", "গাছ", "গার্ডেন", "ছাঁটাই", "পানি দেওয়া", "পানি দেওয়া",
    ],
}


CATEGORY_DETECTION_PRIORITY = [
    "Electrical Work",
    "Plumbing",
    "Carpentry",
    "Appliance Repair",
    "Pest Control",
    "Moving Services",
    "Laundry Services",
    "Gardening",
    "AC Repair",
    "Painting",
    "Deep Cleaning",
    "House Cleaning",
]

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
        # Try extracting first JSON object if model adds extra prose around it.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            chunk = cleaned[start : end + 1]
            try:
                parsed = json.loads(chunk)
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                # Fallback for python-like dict outputs with single quotes
                try:
                    parsed = ast.literal_eval(chunk)
                    return parsed if isinstance(parsed, dict) else None
                except Exception:
                    return None
        return None


def _clean_llm_text(text: str) -> str:
    cleaned = (text or "").replace("```json", "").replace("```", "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip("\"'")


def _canonical_service_label(value: str) -> str:
    label = _normalize(value)
    mapping = {
        "electrician": "Electrical Work",
        "electrical": "Electrical Work",
        "electrical work": "Electrical Work",
        "plumber": "Plumbing",
        "plumbing": "Plumbing",
        "ac technician": "AC Repair",
        "ac": "AC Repair",
        "ac repair": "AC Repair",
        "painter": "Painting",
        "painting": "Painting",
        "cleaning service": "House Cleaning",
        "cleaning": "House Cleaning",
        "house cleaning": "House Cleaning",
        "deep cleaning": "Deep Cleaning",
        "carpentry": "Carpentry",
        "carpenter": "Carpentry",
        "pest": "Pest Control",
        "pest control": "Pest Control",
        "moving": "Moving Services",
        "moving services": "Moving Services",
        "laundry": "Laundry Services",
        "laundry services": "Laundry Services",
        "gardening": "Gardening",
        "appliance": "Appliance Repair",
        "appliance repair": "Appliance Repair",
        "general": "General Technician",
        "general technician": "General Technician",
    }
    return mapping.get(label, value.strip() or "General Technician")


def _extract_detection_fields_from_text(text: str) -> dict[str, str]:
    """Best-effort extraction when model returns malformed JSON-like text."""
    raw = _clean_llm_text(text)
    if not raw:
        return {}

    def _grab(field: str) -> str:
        # Supports: "field": "value" or 'field': 'value'
        pattern = rf"['\"]?{field}['\"]?\s*:\s*['\"]([^'\"]+)['\"]"
        match = re.search(pattern, raw, flags=re.IGNORECASE)
        return _clean_llm_text(match.group(1)) if match else ""

    result = {
        "problem_type": _grab("problem_type"),
        "suggested_service": _grab("suggested_service"),
        "explanation": _grab("explanation"),
    }
    return {k: v for k, v in result.items() if v}


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


def _service_catalog_for_prompt(limit: int = 180) -> list[dict[str, Any]]:
    """Compact catalog for AI prompts so model can choose from a wider service set."""
    queryset = Service.objects.select_related("category").only("id", "name", "category__name").order_by("name")
    if limit and limit > 0:
        queryset = queryset[:limit]

    return [
        {
            "id": service.id,
            "name": service.name,
            "category": service.category.name if service.category else "General",
        }
        for service in queryset
    ]


def _find_services_by_text(text: str, limit: int = 5) -> list[Service]:
    normalized = _normalize(text)
    if not normalized:
        return []

    # Unicode-aware tokenization so Bangla/Banglish/English all get searchable terms.
    terms = [term for term in re.split(r"[^\w]+", normalized, flags=re.UNICODE) if len(term) >= 2][:10]
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
            "ceiling fan",
            "pakha",
            "পাখা",
            "ফ্যান",
            "light",
            "switch",
            "socket",
            "plug",
            "wiring",
            "wire",
            "charge",
            "charging",
            "charger",
            "short",
            "spark",
            "fire",
            "smoke",
            "আগুন",
            "স্পার্ক",
            "শর্ট",
            "সকেট",
            "wall",
            "paint",
            "rong",
            "রং",
            "রঙ",
            "দেয়াল",
            "দেয়াল",
            "খসে",
            "পেইন্ট",
            "sofa",
            "furniture",
            "wood",
            "ভাঙা",
            "কাঠ",
            "dirty",
            "clean",
            "nongra",
            "moila",
            "নোংরা",
            "ময়লা",
            "ময়লা",
            "ঘর",
            "বাসা",
        ]
    )


def _detect_problem_category(message: str) -> str | None:
    text = _normalize(message)

    kitchen_tokens = ["kitchen", "rannaghor", "ranna ghor", "রান্নাঘর", "রান্না ঘর"]
    dirty_tokens = ["dirty", "nongra", "nogra", "moila", "messy", "grease", "oily", "নোংরা", "ময়লা", "ময়লা"]
    if any(token in text for token in kitchen_tokens) and any(token in text for token in dirty_tokens):
        return "Deep Cleaning"

    scores: dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORD_HINTS.items():
        hit_count = sum(1 for keyword in keywords if keyword in text)
        if hit_count:
            scores[category] = hit_count

    if not scores:
        return None

    priority_map = {name: idx for idx, name in enumerate(CATEGORY_DETECTION_PRIORITY)}

    return max(
        scores.items(),
        key=lambda item: (
            item[1],
            -priority_map.get(item[0], 10_000),
        ),
    )[0]


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

    # Common Bangla relative date words.
    for token in ["আগামীকাল", "agamikal", "agami kal", "পরশু", "আজ", "aj", "কাল", "next day"]:
        if re.search(rf"\b{re.escape(token)}\b", normalized):
            return token

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

    day_month_year = re.search(rf"\b(\d{{1,2}}\s+(?:{month_names})\s*,?\s*\d{{2,4}})\b", normalized)
    if day_month_year:
        return day_month_year.group(1)

    month_day_year = re.search(rf"\b((?:{month_names})\s+\d{{1,2}}(?:st|nd|rd|th)?\s*,?\s*\d{{2,4}})\b", normalized)
    if month_day_year:
        return month_day_year.group(1)

    return fallback or ""


def _extract_location_text(message: str, fallback: str = "", infer_plain_text: bool = True) -> str:
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
        marker_match = re.search(rf"\b{re.escape(marker)}\b\s+(.+)", text, flags=re.IGNORECASE)
        if marker_match:
            guessed = _clean_location_candidate(marker_match.group(1))
            if guessed:
                return guessed

    # If user directly types area text (e.g. "mirpur dhaka"), keep the full input.
    # This heuristic should be disabled in stages where arbitrary text (e.g., full name)
    # must not override already collected location.
    if infer_plain_text:
        compact_text = text.strip(" :,-")
        if compact_text and len(compact_text.split()) <= 6 and not re.search(r"\d{4}-\d{2}-\d{2}", compact_text):
            # Do not treat phone-like inputs as location.
            if re.fullmatch(r"\+?\d[\d\s\-]{8,18}\d", compact_text):
                return fallback or ""

            compact_normalized = _normalize(compact_text)
            has_digit = bool(re.search(r"\d", compact_text))
            location_hint_tokens = [
                "road", "rd", "street", "st", "sector", "block", "house", "flat", "lane", "area",
                "district", "thana", "upazila", "union", "village", "para", "city", "town",
                "r/a", "doHS", "বাসা", "বাড়ি", "বাড়ি", "রোড", "লেন", "এলাকা", "থানা", "জেলা",
            ]
            has_hint_token = any(token in compact_normalized for token in location_hint_tokens)
            has_known_area = any(_normalize(area) in compact_normalized for area in BD_LOCATIONS)

            # Avoid mapping plain personal names to location/address.
            if not (has_digit or has_hint_token or has_known_area):
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

    services = _service_catalog_for_prompt(limit=180)
    prompt = _build_ai_classifier_prompt(message, services)

    payload = {
        "model": getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile"),
        "messages": [
            {
                "role": "system",
                "content": (
                    "Respond with valid compact JSON only. "
                    "No markdown. No additional keys."
                ),
            },
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


def _decide_ai_model(message: str) -> str:
    text = _normalize(message)
    gemini_keywords = ["best", "recommend", "compare", "nearby", "cheap"]

    if any(keyword in text for keyword in gemini_keywords):
        return "gemini"

    if len((message or "").strip()) > 50:
        return "gemini"

    return "groq"


def _call_gemini_problem_classifier(message: str) -> dict[str, Any] | None:
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return None

    services = _service_catalog_for_prompt(limit=180)
    prompt = _build_ai_classifier_prompt(message, services)

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "Respond with valid compact JSON only. No markdown.\n"
                            f"{prompt}"
                        )
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 240,
        },
    }

    try:
        response = requests.post(
            _gemini_api_url(),
            params={"key": api_key},
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=getattr(settings, "GEMINI_TIMEOUT_SECONDS", 3),
        )
        if response.status_code >= 400:
            return None

        data = response.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        return _parse_json_from_text(text)
    except Exception:
        return None


def _call_ai_problem_classifier(message: str) -> tuple[dict[str, Any] | None, str]:
    selected = _decide_ai_model(message)

    if selected == "gemini":
        gemini_data = _call_gemini_problem_classifier(message)
        if gemini_data:
            return gemini_data, "gemini"

        groq_data = _call_groq_problem_classifier(message)
        if groq_data:
            return groq_data, "groq"
        return None, "groq"

    groq_data = _call_groq_problem_classifier(message)
    if groq_data:
        return groq_data, "groq"

    gemini_data = _call_gemini_problem_classifier(message)
    if gemini_data:
        return gemini_data, "gemini"

    return None, "groq"


def _infer_service_from_detection_text(text: str) -> str:
    normalized = _normalize(text)

    electrical_keywords = [
        "fire", "flame", "burn", "burning", "spark", "short", "short circuit", "smoke", "overheat",
        "socket", "plug", "outlet", "switch", "wire", "wiring", "electric", "electrical",
        "আগুন", "স্পার্ক", "শর্ট", "কারেন্ট", "প্লাগ", "সকেট", "তার", "পুড়ে",
    ]
    if any(keyword in normalized for keyword in electrical_keywords):
        return "Electrical Work"

    carpentry_keywords = [
        "door",
        "window",
        "sofa",
        "furniture",
        "wood",
        "wooden",
        "cabinet",
        "wardrobe",
        "drawer",
        "hinge",
        "carpentry",
        "carpenter",
        "ভাঙা",
        "কাঠ",
        "দরজা",
        "জানালা",
        "আলমারি",
        "সোফা",
        "ফার্নিচার",
    ]
    if any(keyword in normalized for keyword in carpentry_keywords):
        return "Carpentry"

    for keyword, hint in PROBLEM_KEYWORD_TO_SERVICE.items():
        if keyword in normalized:
            return _canonical_service_label(str(hint))
    return "General Technician"


def _image_detection_fallback_service(user_text: str) -> str:
    combined = _normalize(user_text or "")

    detected_category = _detect_problem_category(combined)
    if detected_category:
        return detected_category

    inferred = _canonical_service_label(_infer_service_from_detection_text(combined))
    if inferred != "General Technician":
        return inferred

    # Safety-first default for unknown image analysis failures.
    return "Electrical Work"


def _call_gemini_image_detector(image_bytes: bytes, mime_type: str, user_text: str = "") -> dict[str, Any] | None:
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return None

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    prompt = (
        "You are an image-based issue detector for Bangladesh household services. "
        "Analyze the image and optional user note, then return ONLY strict JSON with keys: "
        "problem_type, suggested_service, explanation. "
        "suggested_service should be one suitable service category label from this list only: "
        "Painting, Electrical Work, Appliance Repair, Carpentry, Deep Cleaning, Gardening, House Cleaning, Pest Control, Moving Services, AC Repair, Plumbing, Laundry Services. "
        "If image shows broken door/window/furniture/wood, suggested_service MUST be Carpentry. "
        "If image shows burning plug/socket/wire, smoke, spark or short-circuit signs, suggested_service MUST be Electrical Work. "
        "Keep explanation short. "
        f"User note: {user_text or 'N/A'}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": image_b64,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 300,
        },
    }

    try:
        timeout_seconds = max(8, getattr(settings, "GEMINI_TIMEOUT_SECONDS", 3))
        for model_name in _gemini_vision_models_to_try():
            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent",
                params={"key": api_key},
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=timeout_seconds,
            )
            if response.status_code >= 400:
                continue

            data = response.json()
            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            parsed = _parse_json_from_text(text)
            if parsed:
                parsed["problem_type"] = _clean_llm_text(str(parsed.get("problem_type") or "Detected household issue"))
                if not parsed.get("suggested_service"):
                    parsed["suggested_service"] = _infer_service_from_detection_text(
                        f"{parsed.get('problem_type', '')} {parsed.get('explanation', '')} {user_text}"
                    )
                else:
                    parsed["suggested_service"] = _canonical_service_label(
                        _clean_llm_text(str(parsed.get("suggested_service")))
                    )
                parsed["explanation"] = _clean_llm_text(str(parsed.get("explanation") or "Image analyzed successfully."))
                parsed.setdefault("model", model_name)
                return parsed

            if text:
                safe_text = _clean_llm_text(text)
                extracted = _extract_detection_fields_from_text(safe_text)
                combined_text = " ".join(
                    [
                        extracted.get("problem_type", ""),
                        extracted.get("suggested_service", ""),
                        extracted.get("explanation", ""),
                        safe_text,
                        user_text,
                    ]
                )
                return {
                    "problem_type": extracted.get("problem_type") or "Detected household issue",
                    "suggested_service": _canonical_service_label(
                        extracted.get("suggested_service") or _infer_service_from_detection_text(combined_text)
                    ),
                    "explanation": (extracted.get("explanation") or safe_text or "Image analyzed; please proceed with suggested service.")[:220],
                    "model": model_name,
                }

        return None
    except Exception:
        return None


def _recommended_services_from_problem(message: str, groq_data: dict[str, Any] | None) -> list[Service]:
    queryset = Service.objects.select_related("category").all()

    normalized = _normalize(message)

    # Kitchen dirty messages should prioritize Deep Cleaning.
    kitchen_tokens = ["kitchen", "rannaghor", "ranna ghor", "রান্নাঘর", "রান্না ঘর"]
    dirty_tokens = ["dirty", "nongra", "nogra", "moila", "messy", "grease", "oily", "নোংরা", "ময়লা", "ময়লা"]
    if any(token in normalized for token in kitchen_tokens) and any(token in normalized for token in dirty_tokens):
        strict_deep_clean = list(
            queryset.filter(category__name__iexact="Deep Cleaning")[:6]
        )

        def _deep_clean_rank(service: Service) -> tuple[int, int]:
            name = _normalize(service.name or "")
            has_deep_name = 1 if "deep clean" in name or "deep cleaning" in name else 0
            has_kitchen = 1 if "kitchen" in name or "রান্নাঘর" in name else 0
            return (has_deep_name, has_kitchen)

        if strict_deep_clean:
            strict_deep_clean.sort(key=_deep_clean_rank, reverse=True)
            return strict_deep_clean

        deep_clean_matches = list(
            queryset.filter(
                Q(category__name__icontains="deep cleaning")
                | Q(name__icontains="deep clean")
                | Q(description__icontains="deep clean")
            )[:6]
        )
        if deep_clean_matches:
            deep_clean_matches.sort(key=_deep_clean_rank, reverse=True)
            return deep_clean_matches

    # 0) Strong category-first detection from multilingual keywords (e.g., sofa broken => Carpentry)
    detected_category = _detect_problem_category(message)
    if detected_category:
        category_matches = list(
            queryset.filter(
                Q(category__name__icontains=detected_category)
                | Q(name__icontains=detected_category)
                | Q(description__icontains=detected_category)
            )[:6]
        )
        if category_matches:
            return category_matches

    # Painting issues should strongly prioritize painting services for Bangla/Banglish prompts.
    if any(token in normalized for token in ["paint", "painting", "rong", "রং", "রঙ", "পেইন্ট", "দেয়াল", "দেয়াল", "খসে"]):
        paint_matches = list(
            queryset.filter(
                Q(name__icontains="paint")
                | Q(category__name__icontains="paint")
                | Q(category__name__icontains="painting")
            )[:6]
        )
        if paint_matches:
            return paint_matches

    # Fan issues should prioritize fan/electrical services (not AC by default)
    if any(token in normalized for token in ["fan", "ceiling fan", "pakha", "পাখা", "ফ্যান"]):
        fan_matches = list(
            queryset.filter(
                Q(name__icontains="fan")
                | Q(description__icontains="fan")
                | Q(name__icontains="ceiling")
                | Q(description__icontains="ceiling")
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
        suggestion_text = str(suggested)
        if detected_category:
            hit = queryset.filter(
                Q(name__icontains=suggestion_text)
                & (
                    Q(category__name__icontains=detected_category)
                    | Q(name__icontains=detected_category)
                    | Q(description__icontains=detected_category)
                )
            ).first()
            if hit:
                return [hit]

        hit = queryset.filter(name__icontains=suggestion_text).first()
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

    normalized_message = _normalize(message)
    has_explicit_location_marker = any(
        re.search(rf"\b{marker}\b", normalized_message)
        for marker in ["location", "address", "area", "from", "at", "in"]
    )

    # Parse fields in a stage-aware way so later-step replies (e.g. full name)
    # never overwrite earlier fields like location/address.
    booking_date = _extract_date_text(message, fallback=context.get("booking_date", ""))

    location_prompt_stage = bool(
        context.get("service_id")
        and context.get("booking_date")
        and not context.get("location")
    )

    location = context.get("location", "")
    if context.get("location") or location_prompt_stage or has_explicit_location_marker:
        location = _extract_location_text(
            message,
            fallback=context.get("location", ""),
            infer_plain_text=location_prompt_stage,
        )

    collecting_name_stage = bool(
        context.get("service_id")
        and context.get("booking_date")
        and context.get("location")
        and not context.get("booking_name")
    )
    booking_name = context.get("booking_name", "")
    if context.get("booking_name") or collecting_name_stage:
        booking_name = _extract_name_text(
            message,
            fallback=context.get("booking_name", ""),
            allow_plain_name=collecting_name_stage,
        )

    collecting_phone_stage = bool(
        context.get("service_id")
        and context.get("booking_date")
        and context.get("location")
        and context.get("booking_name")
        and not context.get("booking_phone")
    )
    booking_phone = context.get("booking_phone", "")
    if context.get("booking_phone") or collecting_phone_stage:
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "service",
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "date",
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "location",
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "name",
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "phone",
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "phone",
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "confirm",
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
                    "booking_in_progress": True,
                    "awaiting_booking_field": "confirm",
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
    OrderService.auto_assign_technician(order, service_ids=[service.id])

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
                "booking_in_progress": False,
                "awaiting_booking_field": None,
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
    booking_field_waiting = str(context.get("awaiting_booking_field") or "").strip().lower()
    booking_context_active = bool(context.get("booking_in_progress")) or (
        bool(context.get("service_id")) and (
            has_booking_state or any(token in normalized_message for token in booking_terms)
        )
    )
    if booking_field_waiting in {"service", "date", "location", "name", "phone", "confirm"}:
        booking_context_active = True

    review_signal = bool(_extract_rating(message)) or any(
        token in normalized_message for token in ["review", "rating", "feedback", "star", "rate"]
    )

    # Keep conversation state deterministic for multi-turn flows.
    ai_source = "groq"
    groq_data = None

    try:
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
            groq_data, ai_source = _call_ai_problem_classifier(message)
            intent = _rules_intent(message)

        if groq_data and groq_data.get("intent"):
            groq_intent = str(groq_data["intent"]).strip()
            allowed = set(ALLOWED_AI_INTENTS) | {"order_update"}
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
    except Exception:
        # Never fail hard for user chat; degrade gracefully to rules-based recommendation.
        intent = "service_recommendation"
        ai_source = "rules-fallback"
        reply, data = _handle_recommendation(message, None)

    response_context = data.get("context", context)
    safe_data = _to_json_safe(data)
    safe_context = _to_json_safe(response_context)

    if isinstance(safe_data, dict):
        safe_data.setdefault("source", ai_source)

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
            "source": ai_source,
            "data": safe_data,
            "context": safe_context,
            "session_id": session.id if session else None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def assistant_detect_image(request):
    image = request.FILES.get("image")
    user_message = (request.data.get("message") or "").strip()
    session_id_raw = request.data.get("session_id")

    session_id = None
    try:
        if session_id_raw not in (None, "", "null"):
            session_id = int(session_id_raw)
    except (TypeError, ValueError):
        session_id = None

    if not image:
        return Response({"detail": "Image file is required."}, status=status.HTTP_400_BAD_REQUEST)

    mime_type = getattr(image, "content_type", "") or "image/jpeg"
    if not mime_type.startswith("image/"):
        return Response({"detail": "Only image files are allowed."}, status=status.HTTP_400_BAD_REQUEST)

    image_bytes = image.read()
    if not image_bytes:
        return Response({"detail": "Uploaded image is empty."}, status=status.HTTP_400_BAD_REQUEST)

    session = _get_assistant_session(
        request.user,
        session_id=session_id,
        first_message=user_message or "Image upload",
    )

    detected = _call_gemini_image_detector(image_bytes=image_bytes, mime_type=mime_type, user_text=user_message)
    if not detected:
        fallback_service = _image_detection_fallback_service(user_message)
        fail_reply = (
            "Image analysis service temporary unavailable. "
            f"Safety-first recommendation: {fallback_service} (Wiring inspection)."
        )

        if session:
            AssistantChatMessage.objects.create(
                session=session,
                role=AssistantChatMessage.ROLE_USER,
                text=user_message or "📷 Image uploaded",
                data={
                    "message_type": "image",
                    "mime_type": mime_type,
                    "image_name": getattr(image, "name", "uploaded-image"),
                },
            )
            AssistantChatMessage.objects.create(
                session=session,
                role=AssistantChatMessage.ROLE_ASSISTANT,
                text=fail_reply,
                data={
                    "source": "rules-fallback",
                    "feature": "image_detection_fallback",
                    "problem_type": "Image analysis temporarily unavailable",
                    "suggested_service": fallback_service,
                    "explanation": "Used fallback recommendation while image AI service was unavailable.",
                },
            )

            if session.title == "New Chat":
                session.title = _make_chat_title(user_message or "Image upload")
            session.last_message_at = timezone.now()
            session.save(update_fields=["title", "last_message_at", "updated_at"])

        return Response(
            {
                "reply": fail_reply,
                "source": "rules-fallback",
                "data": {
                    "problem_type": "Image analysis temporarily unavailable",
                    "suggested_service": fallback_service,
                    "explanation": "Used fallback recommendation while image AI service was unavailable.",
                },
                "session_id": session.id if session else None,
            },
            status=status.HTTP_200_OK,
        )

    problem_type = _clean_llm_text(str(detected.get("problem_type") or "Detected household issue"))
    suggested_service = _canonical_service_label(_clean_llm_text(
        str(
            detected.get("suggested_service")
            or _infer_service_from_detection_text(f"{problem_type} {user_message}")
        )
    ))
    explanation = _clean_llm_text(str(detected.get("explanation") or "Image analyzed successfully."))

    if explanation.startswith("{") or explanation.startswith("\"{"):
        explanation = "Image analyzed successfully."

    inferred_service = _infer_service_from_detection_text(f"{problem_type} {explanation} {user_message}")
    detected_category = _detect_problem_category(f"{problem_type} {explanation} {user_message}")
    if detected_category:
        suggested_service = detected_category
    elif suggested_service.lower() in {"general technician", "general technician service", "technician", "general"} and inferred_service != "General Technician":
        suggested_service = inferred_service
    elif suggested_service.lower() in {"general technician", "general technician service", "technician", "general"}:
        fallback_services = _recommended_services_from_problem(f"{problem_type} {explanation} {user_message}", None)
        if fallback_services and fallback_services[0].category:
            suggested_service = fallback_services[0].category.name

    reply = (
        f"Image analysis complete ✅\n"
        f"Problem: {problem_type}\n"
        f"Suggested service: {suggested_service}\n"
        f"Note: {explanation}"
    )

    if session:
        AssistantChatMessage.objects.create(
            session=session,
            role=AssistantChatMessage.ROLE_USER,
            text=user_message or "📷 Image uploaded",
            data={
                "message_type": "image",
                "mime_type": mime_type,
                "image_name": getattr(image, "name", "uploaded-image"),
            },
        )
        AssistantChatMessage.objects.create(
            session=session,
            role=AssistantChatMessage.ROLE_ASSISTANT,
            text=reply,
            data={
                "source": "gemini",
                "feature": "image_detection",
                "problem_type": problem_type,
                "suggested_service": suggested_service,
                "explanation": explanation,
            },
        )

        if session.title == "New Chat":
            session.title = _make_chat_title(user_message or "Image upload")
        session.last_message_at = timezone.now()
        session.save(update_fields=["title", "last_message_at", "updated_at"])

    return Response(
        {
            "reply": reply,
            "source": "gemini",
            "data": {
                "problem_type": problem_type,
                "suggested_service": suggested_service,
                "explanation": explanation,
            },
            "session_id": session.id if session else None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def assistant_sessions(request):
    if request.method == "GET":
        latest_message_subquery = (
            AssistantChatMessage.objects.filter(session_id=OuterRef("pk"))
            .order_by("-created_at")
            .values("text")[:1]
        )

        queryset = AssistantChatSession.objects.filter(user=request.user).annotate(
            last_message_text=Subquery(latest_message_subquery)
        )
        serialized = AssistantChatSessionListSerializer(queryset, many=True)
        return Response(serialized.data, status=status.HTTP_200_OK)

    title = (request.data.get("title") or "").strip() or "New Chat"
    session = AssistantChatSession.objects.create(user=request.user, title=title, context={})
    serialized = AssistantChatSessionDetailSerializer(session)
    return Response(serialized.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def assistant_session_detail(request, session_id: int):
    session = AssistantChatSession.objects.filter(id=session_id, user=request.user).first()
    if not session:
        return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    try:
        limit_raw = request.query_params.get("limit")
        messages_limit = int(limit_raw) if limit_raw else 120
    except (TypeError, ValueError):
        messages_limit = 120

    if messages_limit <= 0:
        messages_limit = 120

    serialized = AssistantChatSessionDetailSerializer(session, context={"messages_limit": messages_limit})
    return Response(serialized.data, status=status.HTTP_200_OK)
