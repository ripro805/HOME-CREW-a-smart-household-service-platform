# Render Deployment Guide

এই guide অনুসরণ করে আপনি Render-এ আপনার সম্পূর্ণ application (Backend, Database, Frontend) deploy করতে পারবেন।

## 📋 Prerequisites

1. **GitHub Account** - আপনার code GitHub-এ push করা থাকতে হবে
2. **Render Account** - [render.com](https://render.com) এ sign up করুন
3. **Cloudinary Account** - Image storage এর জন্য [cloudinary.com](https://cloudinary.com)
4. **Gmail App Password** - Email এর জন্য

---

## 🚀 Deployment Steps

### Step 1: GitHub এ Code Push করুন

```bash
git add .
git commit -m "Prepare for Render deployment"
git push dash-origin main
```

---

### Step 2: Render Dashboard Setup

#### 2.1 PostgreSQL Database তৈরি করুন

1. Render Dashboard এ যান: https://dashboard.render.com
2. **New +** ক্লিক করে **PostgreSQL** সিলেক্ট করুন
3. নিচের তথ্য দিন:
   - **Name**: `homecrew-db`
   - **Database**: `homecrew`
   - **User**: `homecrew_user`
   - **Region**: `Oregon (US West)`
   - **Plan**: `Free`
4. **Create Database** ক্লিক করুন
5. Database তৈরি হলে **Internal Database URL** কপি করে রাখুন

---

#### 2.2 Django Backend Deploy করুন

1. **New +** → **Web Service** সিলেক্ট করুন
2. আপনার GitHub repository connect করুন
3. নিচের তথ্য দিন:

   **Basic Info:**
   - **Name**: `homecrew-backend`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: (খালি রাখুন)
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn house_hold_service.wsgi:application`
   - **Plan**: `Free`

4. **Environment Variables** সেকশনে যান এবং নিচের variables যোগ করুন:

   ```env
   # Django Settings
   SECRET_KEY=<generate-a-strong-random-key>
   DEBUG=False
   ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
   
   # Database (Step 2.1 এ কপি করা URL)
   DATABASE_URL=<your-postgres-internal-url>
   
   # Cloudinary
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   CLOUDINARY_CLOUD_NAME=<your-cloud-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>
   
   # Email
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=<your-gmail>
   EMAIL_HOST_PASSWORD=<your-app-password>
   EMAIL_USE_TLS=True
   DEFAULT_FROM_EMAIL=<your-gmail>
   
   # SSLCommerz
   SSLCOMMERZ_STORE_ID=testbox
   SSLCOMMERZ_STORE_PASSWORD=qwerty
   SSLCOMMERZ_IS_SANDBOX=True
   
   # URLs (এখনো খালি রাখুন, পরে update করবেন)
   BACKEND_URL=https://homecrew-backend.onrender.com
   FRONTEND_PROTOCOL=https
   FRONTEND_DOMAIN=homecrew-frontend.onrender.com
   ```

5. **Create Web Service** ক্লিক করুন
6. Deploy শেষ হলে আপনার backend URL হবে: `https://homecrew-backend.onrender.com`

---

#### 2.3 React Frontend Deploy করুন

1. **New +** → **Static Site** সিলেক্ট করুন
2. আপনার GitHub repository connect করুন
3. নিচের তথ্য দিন:

   **Basic Info:**
   - **Name**: `homecrew-frontend`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `homecrew-client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: `Free`

4. **Environment Variables** যোগ করুন:

   ```env
   VITE_API_URL=https://homecrew-backend.onrender.com/api/v1
   ```

5. **Create Static Site** ক্লিক করুন
6. Deploy শেষ হলে আপনার frontend URL হবে: `https://homecrew-frontend.onrender.com`

---

### Step 3: URLs Update করুন

#### 3.1 Backend Environment Variables Update

1. Backend service এ যান (`homecrew-backend`)
2. **Environment** ট্যাবে যান
3. Update করুন:
   ```env
   BACKEND_URL=https://homecrew-backend.onrender.com
   FRONTEND_DOMAIN=homecrew-frontend.onrender.com
   ```
4. **Save Changes** - এটি automatically redeploy করবে

#### 3.2 Frontend Build এ Routing Add করুন

Frontend static site এ:
1. **Redirects/Rewrites** সেকশনে যান
2. Add rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`

---

### Step 4: Superuser তৈরি করুন

Backend deploy হওয়ার পর:

1. Backend service এ যান
2. **Shell** ট্যাবে ক্লিক করুন
3. নিচের command রান করুন:

```bash
python manage.py createsuperuser
```

আপনার admin email এবং password দিন।

---

### Step 5: Test করুন

1. **Frontend URL**: `https://homecrew-frontend.onrender.com`
2. **Backend Admin**: `https://homecrew-backend.onrender.com/admin/`
3. **API Docs**: `https://homecrew-backend.onrender.com/swagger/`

---

## 🔧 Common Issues & Solutions

### Issue 1: Build Failed

**Solution:** 
- `build.sh` file এর permission চেক করুন
- Terminal এ: `git update-index --chmod=+x build.sh`
- Commit এবং push করুন

### Issue 2: Database Connection Error

**Solution:**
- `DATABASE_URL` সঠিকভাবে set করা আছে কিনা চেক করুন
- Internal Database URL ব্যবহার করুন (External নয়)

### Issue 3: Static Files লোড হচ্ছে না

**Solution:**
- `STATIC_ROOT` এবং `STATICFILES_STORAGE` settings চেক করুন
- Reload করুন: Dashboard → Manual Deploy → Deploy Latest Commit

### Issue 4: CORS Error

**Solution:**
- Backend environment variable `FRONTEND_DOMAIN` সঠিক আছে কিনা চেক করুন
- `CSRF_TRUSTED_ORIGINS` এ frontend URL আছে কিনা verify করুন

### Issue 5: Free Plan Sleep

**Info:**
- Render Free plan এ 15 মিনিট inactivity পর service sleep করে
- First request এ 30-50 সেকেন্ড লাগতে পারে
- এটি normal behaviour
- Paid plan এ এই issue নেই

---

## 📝 Important Notes

### Free Plan Limitations:
- ✅ PostgreSQL: 1GB storage
- ✅ Backend: 750 hours/month (sleep after inactivity)
- ✅ Frontend: Unlimited bandwidth
- ⚠️ Cold start: প্রথম request 30-50s লাগতে পারে

### Production Checklist:
- ✅ `DEBUG=False` set করা
- ✅ Strong `SECRET_KEY` ব্যবহার করা
- ✅ `ALLOWED_HOSTS` সঠিকভাবে configure করা
- ✅ Database backup strategy
- ✅ Environment variables secure রাখা
- ✅ HTTPS enabled (Render automatically করে)

---

## 🔄 Redeploy Process

Code update করার পর:

```bash
git add .
git commit -m "Your update message"
git push dash-origin main
```

Render automatically detect করবে এবং redeploy করবে। Manual deploy ও করতে পারেন:
- Dashboard → Your Service → Manual Deploy → Deploy Latest Commit

---

## 📞 Support

- **Render Docs**: https://docs.render.com
- **Django Deployment**: https://docs.djangoproject.com/en/stable/howto/deployment/
- **Vite Build**: https://vitejs.dev/guide/build.html

---

## ✨ Next Steps

Deploy সফল হলে:
1. ✅ Admin panel এ login করুন
2. ✅ Test registration/login করুন
3. ✅ Service create করুন
4. ✅ Order এবং payment test করুন
5. ✅ Custom domain add করুন (Optional)

**Happy Deploying! 🚀**
