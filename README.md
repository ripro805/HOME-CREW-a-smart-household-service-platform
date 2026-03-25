# HomeCrew - A Smart Household Service Platform

HomeCrew is a full-stack household service platform built with Django (backend) and React (frontend). It supports user registration, service discovery, order placement, online payment via SSLCommerz, direct support messaging, and admin-side service management.

---

## 🚀 Live Demo
- **Frontend:** https://home-crew-a-smart-household-service-hv7v.onrender.com/
- **Backend API:** https://home-crew-a-smart-household-service-b93r.onrender.com/api/v1/
- **Admin:** https://home-crew-a-smart-household-service-b93r.onrender.com/admin/

---

## Screenshots

### Public Website

| Home Hero - Electrical | Home Hero - Painting |
| --- | --- |
| ![Home hero electrical](scrennshots/home-hero-electrical.png) | ![Home hero painting](scrennshots/home-hero-painting.png) |

| About Page | Services Page |
| --- | --- |
| ![About page](scrennshots/about-page.png) | ![Services page](scrennshots/services-page.png) |

| Contact Page | Service Detail Overview |
| --- | --- |
| ![Contact page](scrennshots/contact-page.png) | ![Service detail overview](scrennshots/service-detail-overview.png) |

| Service Detail Related Services | Admin Dashboard Overview |
| --- | --- |
| ![Service detail related services](scrennshots/service-detail-related-services.png) | ![Admin dashboard overview](scrennshots/admin-dashboard-overview.png) |

### Admin Dashboard

| Payments Overview | Payments Table |
| --- | --- |
| ![Admin payments overview](scrennshots/admin-payments-overview.png) | ![Admin payments table](scrennshots/admin-payments-table.png) |

---

## 🏗️ Project Structure

```
HouseHoldservice/
├── accounts/         # Django app: user accounts, registration, profile
├── api/              # Django app: API root, versioning
├── orders/           # Django app: order management, payment
├── services/         # Django app: service categories, listings
├── house_hold_service/ # Django project settings, URLs
├── homecrew-client/  # React frontend (Vite)
├── fixtures/         # Sample data for development
├── staticfiles/      # Collected static files
├── media/            # Uploaded media files
├── build.sh          # Backend build script for Render
├── render.yaml       # Render deployment blueprint
├── requirements.txt  # Python dependencies
├── README.md         # Project documentation
└── ...
```

---

## ✨ Features
- User registration, login, password reset (Djoser JWT)
- Service browsing & search
- Order placement & order history
- Service detail pages with ratings and reviews
- Online payment (SSLCommerz integration)
- Contact form that sends email to the admin inbox
- Real-time style support chat between client and admin
- Admin dashboard with orders, reviews, users, and support inbox
- Responsive UI (React + Tailwind CSS)

---

## Recent Updates
- Added `About Us` and `Contact` pages to the frontend navigation
- Added client-to-admin support messaging with a dedicated chat page
- Added admin support inbox with live conversations plus demo tickets
- Fixed support chat database migration on the production database
- Improved service detail reviews, related services, and order page UI

---

## 🛠️ Tech Stack
- **Backend:** Django, Django REST Framework, Djoser, PostgreSQL
- **Frontend:** React, Vite, Tailwind CSS, Axios
- **Payments:** SSLCommerz
- **Messaging:** Django REST API + JWT-authenticated client/admin chat flow
- **Media:** Cloudinary
- **Deployment:** Render.com

---

## ⚡ Quick Start (Local)

### 1. Clone the repository
```bash
git clone https://github.com/ripro805/HOME-CREW-a-smart-household-service-platform.git
cd HOME-CREW-a-smart-household-service-platform
```

### 2. Backend Setup
```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate (Windows)
pip install -r requirements.txt
cp .env.example .env  # Fill in your secrets
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd homecrew-client
cp .env.example .env  # Set VITE_API_URL=http://localhost:8000/api/v1
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000/api/v1

Note: run `python manage.py migrate` after pulling new backend changes so support chat and other recent features get their database tables.

---

## 🚀 Deployment (Render.com)
See [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md) for full step-by-step Render deployment guide.

---

## 📝 Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
DATABASE_URL=your-postgres-url
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
EMAIL_HOST_USER=your-gmail
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-from-email
ADMIN_CONTACT_EMAIL=your-admin-inbox
FRONTEND_PROTOCOL=https
FRONTEND_DOMAIN=your-frontend-url
BACKEND_URL=your-backend-url
SSLCOMMERZ_STORE_ID=your-store-id
SSLCOMMERZ_STORE_PASSWORD=your-store-password
SSLCOMMERZ_IS_SANDBOX=True
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend-url/api/v1
```

---

## Key User Flows
- Clients can browse services, open a service detail page, read reviews, and place orders
- Clients can use the `Contact` page to send an email directly to the admin inbox
- Logged-in clients can open the message icon in the navbar and chat with admin from the support page
- Admins can manage support conversations from the dashboard support tab and reply back to clients

---

## 🧑‍💻 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
This project is licensed under the MIT License.

---

## 🙏 Acknowledgements
- [Django](https://www.djangoproject.com/)
- [React](https://react.dev/)
- [Render](https://render.com/)
- [SSLCommerz](https://www.sslcommerz.com/)
- [Cloudinary](https://cloudinary.com/)
