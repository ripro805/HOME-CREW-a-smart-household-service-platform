# Render Deployment - Environment Variables Setup

এই guide অনুসরণ করে Render এ environment variables সঠিকভাবে configure করুন।

## 📋 Backend Environment Variables (Django)

Render Dashboard → Your Web Service → Environment → Add Environment Variables

```env
# ============================================
# Required - Django Core Settings
# ============================================
SECRET_KEY=<generate-using-python-secrets-token-urlsafe-50>
DEBUG=False
ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1

# ============================================
# Required - Database
# ============================================
DATABASE_URL=<copy-from-render-postgresql-internal-url>
# Example: postgresql://user:pass@hostname:5432/dbname

# ============================================
# Required - Cloudinary (Image Storage)
# ============================================
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>

# ============================================
# Required - Email Configuration
# ============================================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=<your-gmail-address>
EMAIL_HOST_PASSWORD=<your-gmail-app-password>
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=<your-gmail-address>

# ============================================
# Required - Payment Gateway (SSLCommerz)
# ============================================
SSLCOMMERZ_STORE_ID=testbox
SSLCOMMERZ_STORE_PASSWORD=qwerty
SSLCOMMERZ_IS_SANDBOX=True

# ============================================
# Required - URLs Configuration
# ============================================
BACKEND_URL=https://homecrew-backend.onrender.com
FRONTEND_PROTOCOL=https
FRONTEND_DOMAIN=homecrew-frontend.onrender.com
```

---

## 🎨 Frontend Environment Variables (React/Vite)

Render Dashboard → Your Static Site → Environment → Add Environment Variables

```env
# ============================================
# Required - API URL
# ============================================
VITE_API_URL=https://homecrew-backend.onrender.com/api/v1
```

---

## 🔐 How to Generate SECRET_KEY

Terminal এ Python দিয়ে generate করুন:

```python
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

অথবা Django shell এ:

```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

---

## 📧 Gmail App Password Setup

1. Gmail account এ যান
2. Google Account Settings → Security
3. 2-Step Verification enable করুন
4. App Passwords section এ যান
5. "Mail" select করে password generate করুন
6. Generated password টি `EMAIL_HOST_PASSWORD` এ use করুন

---

## ☁️ Cloudinary Setup

1. https://cloudinary.com এ sign up করুন
2. Dashboard থেকে এই তথ্য কপি করুন:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Environment variables এ set করুন

---

## 🗄️ Database URL (PostgreSQL)

1. Render Dashboard → PostgreSQL Database
2. **Internal Database URL** কপি করুন (External নয়!)
3. Format: `postgresql://user:password@hostname:5432/dbname`
4. `DATABASE_URL` variable এ paste করুন

---

## ✅ Verification Checklist

Backend deploy করার আগে check করুন:

- [ ] `SECRET_KEY` - Strong random key generated
- [ ] `DEBUG=False` - Production এ always False
- [ ] `ALLOWED_HOSTS` - Render domain included
- [ ] `DATABASE_URL` - PostgreSQL Internal URL set
- [ ] `CLOUDINARY_*` - All 4 Cloudinary variables set
- [ ] `EMAIL_*` - Gmail credentials configured
- [ ] `SSLCOMMERZ_*` - Payment gateway credentials
- [ ] `BACKEND_URL` - Your backend Render URL
- [ ] `FRONTEND_DOMAIN` - Your frontend Render URL

Frontend deploy করার আগে check করুন:

- [ ] `VITE_API_URL` - Backend API URL সঠিক

---

## 🔄 Update করার পর

Environment variables update করার পর:

1. Render automatically redeploy করবে
2. Build logs check করুন
3. Application test করুন
4. Error থাকলে logs check করুন: Dashboard → Logs

---

## 🚨 Common Mistakes

### ❌ Avoid These:

1. **External Database URL ব্যবহার করা** - Always use Internal URL
2. **DEBUG=True রাখা** - Production এ security risk
3. **SECRET_KEY expose করা** - Never commit to git
4. **Wrong CORS domains** - Frontend domain mismatch
5. **Cloudinary URL format ভুল** - Must include all parts
6. **Gmail app password না ব্যবহার করা** - Regular password কাজ করবে না

---

## 📝 Environment Variables Priority

Render এ environment variables এর priority order:

1. **Render Dashboard Variables** (Highest) - Production use
2. **.env file** (Local only) - Development use
3. **settings.py defaults** (Lowest) - Fallback values

Production এ শুধু Render Dashboard variables ব্যবহার হয়। .env file deploy হয় না (gitignored)।

---

## 🔒 Security Best Practices

1. ✅ Never commit `.env` file to git
2. ✅ Use `.env.example` as template only
3. ✅ Store sensitive data only in Render Dashboard
4. ✅ Regularly rotate SECRET_KEY and passwords
5. ✅ Enable 2FA on all accounts (GitHub, Render, Cloudinary)
6. ✅ Use strong, unique passwords
7. ✅ Monitor access logs regularly

---

## 📞 Need Help?

যদি environment variables নিয়ে সমস্যা হয়:

1. Render logs check করুন: Dashboard → Logs
2. Variable spelling ভুল নেই কিনা verify করুন
3. Value তে extra spaces নেই কিনা check করুন
4. Format সঠিক আছে কিনা confirm করুন
5. Redeploy করে দেখুন: Manual Deploy → Deploy Latest Commit

---

**Happy Deploying! 🚀**
