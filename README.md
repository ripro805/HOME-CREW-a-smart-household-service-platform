# HomeCrew - Smart Household Service Platform

HomeCrew is a full-stack, production-ready household service platform built with **Django + DRF** (backend) and **React + Vite** (frontend).  
It supports service browsing, order lifecycle management, SSLCommerz payments, support chat, and an advanced multilingual AI assistant with text, voice, and image understanding.

---

## 🚀 Live Links

- **Frontend:** https://home-crew-a-smart-household-service-hv7v.onrender.com/
- **Backend API Root:** https://home-crew-a-smart-household-service-b93r.onrender.com/api/v1/
- **Admin Panel:** https://home-crew-a-smart-household-service-b93r.onrender.com/admin/

---

## ✨ Full Website Features

### 👤 Authentication & User Account

- Email-based signup/login with JWT auth (Djoser + SimpleJWT)
- Profile management (name, phone, address, profile details)
- Role-aware access: admin, client, technician

### 🧰 Service Discovery & Catalog

- Category-based service browsing
- Service search/filter/sort support
- Service detail pages with price, description, images, and rating
- Related service recommendations in detail view

### 🛒 Cart, Booking & Order Lifecycle

- Add/remove/update cart items
- Place order with contact details and preferred date/location
- Order status tracking from NOT_PAID → READY_TO_SHIP → SHIPPED → DELIVERED
- Cancel/update flow where applicable

### 💳 Payments

- SSLCommerz payment initialization
- Success/fail/cancel/IPN callback handling
- Payment-aware order status transitions

### ⭐ Reviews & Feedback

- Client reviews with rating + comment
- Pending review awareness for delivered orders
- Admin review visibility

### 💬 Support & Communication

- Contact form email to admin
- Client ↔ admin support conversation threads
- Admin-side support management

### 🤖 AI Assistant (Major Capability)

- Hybrid AI flow (Groq + Gemini)
- Multilingual understanding: **Bangla, Banglish, English**
- Contextual intent routing (service info, booking, tracking, feedback, availability)
- Category-grounded recommendation across all website categories
- Voice input + smart reply suggestions + recommendation cards
- Image upload detection endpoint (`/detect-image/`) with robust fallback
- Persistent multi-session assistant history
- Admin AI activity monitoring (user list + per-user chat history)

### 🧠 Recommendation/Routing Improvements

- Deterministic category-first detection for tricky cases (electrical/carpentry/deep cleaning/etc.)
- Kitchen-dirty/rannaghor intent prioritizes **Deep Cleaning**
- Fan/fan Bangla variants forced to **Electrical Work** recommendations
- Electrical image/fire/spark/socket signals map to electrical recommendations
- Image provider temporary failure still returns safe fallback recommendation

### 🛡️ Assignment Rule

- Electrical category orders are locked to **Technician One** (auto + manual assignment protection)

---

## 🏗️ Project Structure

```text
HouseHoldservice/
├── accounts/                  # Auth, users, profiles
├── api/                       # API root, analytics, assistant/chat endpoints
├── orders/                    # Cart, orders, assignment, payment
├── services/                  # Categories, services, images, reviews
├── house_hold_service/        # Django project settings/urls
├── homecrew-client/           # React + Vite frontend
├── fixtures/                  # Seed/dummy data
├── staticfiles/               # Collected static output
├── media/                     # Uploaded media
├── build.sh                   # Render backend build script
├── render.yaml                # Render infra blueprint
├── requirements.txt           # Backend dependencies
└── README.md
```

---

## 🧠 Business Rules (Current)

- **Electrical category orders:** assigned technician must be **Technician One**.
  - Auto assignment enforces this.
  - Manual admin assignment for electrical orders is also locked to Technician One.

---

## 🔌 Key API Endpoints

Base path: `/api/v1/`

- `POST assistant/chat/` – AI chat
- `POST detect-image/` – image issue analysis
- `GET/POST assistant/sessions/` – chat sessions
- `GET/DELETE assistant/sessions/<id>/` – session detail/history
- `GET assistant/admin/users/` – admin AI usage users list
- `GET assistant/admin/users/<id>/messages/` – admin AI history per user
- `GET analytics/` – admin analytics summary
- `POST contact/` – contact message
- `auth/*` – djoser auth routes
- plus CRUD routes via DRF routers for users/services/orders/carts/reviews/support

---

## 🛠️ Tech Stack

- **Backend:** Django 6, DRF, Djoser, SimpleJWT, django-filter
- **Frontend:** React, Vite, Axios, Tailwind CSS
- **DB:** PostgreSQL (Render/Supabase compatible)
- **Media:** Cloudinary
- **Payments:** SSLCommerz
- **AI:** Groq + Gemini (text + vision)
- **Deployment:** Render

---

## ⚡ Local Setup

### 1) Clone

```bash
git clone https://github.com/ripro805/HOME-CREW-a-smart-household-service-platform.git
cd HOME-CREW-a-smart-household-service-platform
```

### 2) Backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
d:/KnowledgeVault/Project/HouseHoldservice/.venv/Scripts/python.exe manage.py runserver
```

> Windows note: if plain `python manage.py runserver` fails due to interpreter mismatch, use the full venv python path above.

### 3) Frontend

```bash
cd homecrew-client
npm install
npm run dev
```

- Frontend local URL: usually `http://localhost:5173` (or next free port)
- Backend local URL: `http://127.0.0.1:8000`

---

## 🔐 Environment Variables

### Backend `.env`

```env
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com

DATABASE_URL=postgres://...

CLOUDINARY_URL=cloudinary://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=...
ADMIN_CONTACT_EMAIL=...

FRONTEND_PROTOCOL=http
FRONTEND_DOMAIN=localhost:5173
BACKEND_URL=http://localhost:8000

SSLCOMMERZ_STORE_ID=...
SSLCOMMERZ_STORE_PASSWORD=...
SSLCOMMERZ_IS_SANDBOX=True

GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-latest
GEMINI_VISION_MODEL=gemini-flash-latest
GEMINI_TIMEOUT_SECONDS=20
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 📈 Performance & Reliability Improvements Included

- Assistant session list optimized (reduced N+1 query pattern)
- Session detail supports message limits for faster reload
- Frontend session-open flow now requests bounded history payload
- Chatbot routing strengthened with deterministic category-first logic
- Image detection parser hardened against malformed model outputs
- Graceful fallback for temporary image AI provider issues

---

## 🧪 Developer Notes

- Run backend checks:

```bash
d:/KnowledgeVault/Project/HouseHoldservice/.venv/Scripts/python.exe manage.py check
```

- If Vite reports occupied port, it auto-selects next available one.

---

## 🚀 Deployment

Detailed Render deployment steps are in:  
[`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md)

---

## 📸 Screenshots (With Proper Titles)

All screenshots are loaded from `scrennshots/`.

### Public Website Pages

| Home Hero (Electrical Theme) | Home Hero (Painting Theme) |
| --- | --- |
| ![Home Hero - Electrical](scrennshots/home-hero-electrical.png) | ![Home Hero - Painting](scrennshots/home-hero-painting.png) |

| About Page | Services Listing Page |
| --- | --- |
| ![About Page](scrennshots/about-page.png) | ![Services Page](scrennshots/services-page.png) |

| Contact Page | Service Detail - Overview |
| --- | --- |
| ![Contact Page](scrennshots/contact-page.png) | ![Service Detail Overview](scrennshots/service-detail-overview.png) |

| Service Detail - Related Services |
| --- |
| ![Service Detail Related Services](scrennshots/service-detail-related-services.png) |

### Admin Dashboard Views

| Admin Dashboard - Overview | Admin Dashboard - Payments Overview |
| --- | --- |
| ![Admin Dashboard Overview](scrennshots/admin-dashboard-overview.png) | ![Admin Payments Overview](scrennshots/admin-payments-overview.png) |

| Admin Dashboard - Payments Table |
| --- |
| ![Admin Payments Table](scrennshots/admin-payments-table.png) |

---

## 🤝 Contributing

PRs are welcome. For major feature or architectural changes, please open an issue first.

---

## 📄 License

MIT License
