# 🚀 HOME_CREW: Smart Household Service Platform

![License](https://img.shields.io/badge/license-MIT-blue)
![License](https://img.shields.io/badge/license-BSD-blue)
![Django](https://img.shields.io/badge/Django-6.0.2-green)
![DRF](https://img.shields.io/badge/DRF-3.14.0-orange)

---

## 🏡 What is HOME_CREW?
HOME_CREW is a modern, scalable platform for booking household services—like cleaning, shifting, and repairs. Clients can easily book, review, and manage services, while admins control everything from a powerful dashboard.

---

## ✨ Key Features
- 🔒 **User Registration:** Default role is `client`; admin can promote users to `admin`.
- 🛡️ **JWT Authentication:** Secure login and token management (Djoser).
- 🛍️ **Cart & Order System:** Add services to cart, place orders, track status.
- 🗂️ **Service Listings & Reviews:** Browse, review, and rate services.
- 🏷️ **Categories & Images:** Rich service categorization and image support.
- 📦 **API Versioning:** All endpoints under `/api/v1/`.
- 📚 **Swagger UI:** Interactive API docs for developers.
- 🛠️ **Admin Controls:** Manage users, services, orders, and roles.

---

## 🚦 Quick Start
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run migrations
python manage.py migrate

# 3. Create superuser
python manage.py createsuperuser --email admin@example.com

# 4. Start server
python manage.py runserver
```

- Access Swagger UI: [http://127.0.0.1:8000/swagger/](http://127.0.0.1:8000/swagger/)

---

## 🔗 API Endpoints
| Endpoint                | Description                |
|------------------------|----------------------------|
| `/api/v1/auth/users/`  | User registration          |
| `/api/v1/auth/jwt/create/` | JWT login                |
| `/api/v1/services/`    | Service listing            |
| `/api/v1/orders/`      | Order management           |
| `/api/v1/carts/`       | Cart operations            |
| `/api/v1/accounts/`    | User account info          |

---

## 👤 User Role Logic
- Registration = `client` role (by default)
- Only admin can change user role to `admin` (via Django admin panel)
- Users cannot change their own role

---

## 📄 Documentation
Registration always creates a user with role `client`. Only admin can change user role to `admin` via Django admin panel. Users cannot change their own role. This ensures secure, role-based access and prevents privilege escalation.

---

## 🤝 Contributing
1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Submit a pull request

---

## 📝 License
MIT License

---

> For support, feature requests, or bug reports, open an issue on GitHub.

---

![HomeCrew Banner](https://img.freepik.com/free-vector/house-cleaning-service-banner_33099-1687.jpg)
