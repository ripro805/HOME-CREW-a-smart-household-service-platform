# HomeCrew - A Smart Household Service Platform

HomeCrew is a full-stack web application for managing household services, built with Django (backend) and React (frontend). It supports user registration, service browsing, order placement, and online payment via SSLCommerz.

---

## 🚀 Live Demo
- **Frontend:** https://home-crew-a-smart-household-service-hv7v.onrender.com/
- **Backend API:** https://home-crew-a-smart-household-service-b93r.onrender.com/api/v1/
- **Admin:** https://home-crew-a-smart-household-service-b93r.onrender.com/admin/

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
- Online payment (SSLCommerz integration)
- Email notifications
- Admin dashboard
- Responsive UI (React + Tailwind CSS)

---

## 🛠️ Tech Stack
- **Backend:** Django, Django REST Framework, Djoser, PostgreSQL
- **Frontend:** React, Vite, Tailwind CSS, Axios
- **Payments:** SSLCommerz
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
