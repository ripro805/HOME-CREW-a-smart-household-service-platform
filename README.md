# HomeCrew — Smart Household Service Platform

HomeCrew is a full-stack household service platform built with **Django + DRF** and **React + Vite**.  
It supports complete service booking workflows, role-based dashboards, payment handling, support conversations, and a multilingual AI assistant (text + voice + image).

---

## 🚀 Live Links

- **Frontend:** https://home-crew-a-smart-household-service-hv7v.onrender.com/
- **Backend API Root:** https://home-crew-a-smart-household-service-b93r.onrender.com/api/v1/
- **Admin Panel:** https://home-crew-a-smart-household-service-b93r.onrender.com/admin/

---

## ✨ What’s Included (Updated)

### 🔐 Auth & User System

- Custom user model (email-based login, no username)
- Roles: `admin`, `client`, `technician`
- JWT auth via Djoser + SimpleJWT
- Activation + password reset email flow
- Profile API with Cloudinary profile picture support

### 🧰 Services & Categories

- Full CRUD for categories and services
- Service images (Cloudinary)
- Assigned technician mapping per service
- Filtering/search/ordering (`price`, `avg_rating`, category, name, description)
- Nested routes for service reviews and images

### 🛒 Cart, Orders & Technician Workflow

- Cart create/get, add/remove/update items
- Place order from cart (contact fields + preferred date)
- Order lifecycle: `NOT_PAID → READY_TO_SHIP → SHIPPED → DELIVERED`
- Client cancellation protection for ongoing/completed jobs
- Technician-specific flows:
  - `my_assigned`
  - `accept_job`
  - `technician_update_status`

### 💳 Payments (SSLCommerz)

- Order-based payment session creation
- Success/fail/cancel callbacks
- IPN listener support
- Assistant-aware payment redirect flow for chatbot checkout UX

### 💬 Support Chat + Contact

- Contact form endpoint (emails admin)
- Client-admin support conversation threads
- Conversation status management (open/resolved)
- Unread counts, last message preview, bounded message retrieval

### 🤖 AI Assistant (Major Module)

- Multilingual message handling (Bangla, Banglish, English)
- Intent routing:
  - service info
  - booking assistant
  - recommendations
  - order tracking
  - review feedback
  - location availability
  - order location update
- Hybrid model flow (**Groq + Gemini**)
- Image issue detection endpoint with fallback logic
- Persistent session-based chat history
- Voice input (frontend speech recognition)
- Smart replies + recommendation cards
- Admin AI activity analytics (users + per-user chat history)

### 📊 Analytics & Admin Intelligence

- `/analytics/` endpoint with:
  - revenue/order trends
  - status distribution
  - top services/categories/technicians
  - KPI summary + AI highlights
- `client-ai-insights` endpoint:
  - reminders
  - usage-based recommendations
  - budget forecast trend
  - churn-risk nudge
  - review sentiment intelligence

### 🛡️ Business Rule (Enforced)

- Electrical category orders are force-assigned to **Technician One** (auto + protected manual assignment path).

---

## 🏗️ Project Structure

```text
HouseHoldservice/
├── accounts/               # user model, auth/profile APIs
├── api/                    # root API, analytics, support, assistant flows
├── orders/                 # cart, orders, payment, technician actions
├── services/               # service/category/review/image modules
├── house_hold_service/     # Django settings, root URLs
├── homecrew-client/        # React + Vite frontend app
├── fixtures/               # seed data
├── scripts/                # data/backfill utilities
├── media/                  # uploaded media
├── staticfiles/            # collected static
├── build.sh
├── render.yaml
├── requirements.txt
└── README.md
```

---

## 🔌 API Overview

Base path: `/api/v1/`

### Core
- `accounts/*`
- `services/*`
- `orders/*`
- `users/*`
- `carts/*`
- `categories/*`
- `reviews/*`

### AI Assistant
- `POST assistant/chat/`
- `POST detect-image/`
- `GET/POST assistant/sessions/`
- `GET/DELETE assistant/sessions/<id>/`
- `GET assistant/admin/users/`
- `GET assistant/admin/users/<id>/messages/`

### Support & Contact
- `POST contact/`
- `support/conversations/*`

### Analytics
- `GET analytics/?days=7|30|90|180|365`

### Auth
- `auth/*` (Djoser + JWT)

> Full schema UI: `/swagger/` and `/redoc/`

---

## 🖥️ Frontend Routes (Main)

- Public/client: `/`, `/services`, `/services/:id`, `/cart`, `/orders`, `/orders/:id`, `/profile`, `/messages`, `/ai-assistant`, `/contact`
- Auth: `/login`, `/register`, `/activate/:uid/:token`, `/forgot-password`, `/password/reset/confirm/:uid/:token`
- Payment feedback: `/payment/success`, `/payment/fail`, `/payment/cancel`
- Admin: `/admin-dashboard`
- Technician: `/technician-dashboard/*`

---

## 🛠️ Tech Stack

### Backend
- Django 6
- Django REST Framework
- Djoser + SimpleJWT
- django-filter
- drf-yasg
- drf-nested-routers
- Cloudinary + django-cloudinary-storage
- SSLCommerz
- WhiteNoise

### Frontend
- React 18
- Vite 6
- React Router
- Axios
- Tailwind CSS
- Recharts
- Heroicons

### Infra / Deployment
- Render
- PostgreSQL (via `DATABASE_URL`)

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
python manage.py runserver
```

### 3) Frontend

```bash
cd homecrew-client
npm install
npm run dev
```

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://localhost:5173`

---

## 🔐 Environment Variables

### Backend (`.env`)

```env
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com

# Database
DATABASE_URL=postgres://...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=5432

# Cloudinary
CLOUDINARY_URL=cloudinary://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=...
ADMIN_CONTACT_EMAIL=...

# Frontend/backend URL glue
FRONTEND_PROTOCOL=http
FRONTEND_DOMAIN=localhost:5173
BACKEND_URL=http://localhost:8000

# SSLCommerz
SSLCOMMERZ_STORE_ID=...
SSLCOMMERZ_STORE_PASSWORD=...
SSLCOMMERZ_IS_SANDBOX=True

# AI
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-latest
GEMINI_VISION_MODEL=gemini-flash-latest
GEMINI_TIMEOUT_SECONDS=3
```

### Frontend (`homecrew-client/.env`)

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 📌 Notes for Contributors

- `requirements.txt` currently contains repeated dependency blocks. It still works, but cleaning duplicates is recommended.
- Use `python manage.py check` before deployment.
- For render deployment details, follow [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md).

---

## 📸 Screenshots

Screenshots are available in `scrennshots/` and include:

- home hero variations
- about/services/contact pages
- service detail and related services
- admin dashboard overview + payments views

---

## 🤝 Contributing

PRs are welcome. For major features/architecture changes, please open an issue first.

---

## 📄 License

MIT License
