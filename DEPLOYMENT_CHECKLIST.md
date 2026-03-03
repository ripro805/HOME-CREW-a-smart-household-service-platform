# 🚀 Quick Deployment Checklist

এই file টি দেখে আপনি step-by-step deployment করতে পারবেন।

## ✅ Pre-Deployment Checklist

### 1. Code Ready
- [ ] All features tested locally
- [ ] Payment integration working
- [ ] Database migrations applied
- [ ] Static files configured

### 2. Required Accounts
- [ ] GitHub account (code push করার জন্য)
- [ ] Render account (https://render.com - FREE)
- [ ] Cloudinary account (image storage - FREE)
- [ ] Gmail App Password (email এর জন্য)

---

## 📝 Step-by-Step Deployment

### Step 1: Prepare Code (5 minutes)

```bash
# 1. Commit all changes
git add .
git commit -m "Prepare for Render deployment"

# 2. Push to GitHub
git push dash-origin main
```

---

### Step 2: Create PostgreSQL Database (2 minutes)

1. Go to: https://dashboard.render.com
2. Click: **New +** → **PostgreSQL**
3. Fill:
   ```
   Name: homecrew-db
   Database: homecrew
   User: homecrew_user
   Region: Oregon (US West)
   Plan: Free
   ```
4. Click: **Create Database**
5. ⚠️ **IMPORTANT**: Copy the **Internal Database URL**

---

### Step 3: Deploy Backend (10 minutes)

1. Click: **New +** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   ```
   Name: homecrew-backend
   Region: Oregon (US West)
   Branch: main
   Runtime: Python 3
   Build Command: ./build.sh
   Start Command: gunicorn house_hold_service.wsgi:application
   Plan: Free
   ```

4. **Environment Variables** (copy-paste):
   ```env
   SECRET_KEY=django-insecure-CHANGE-THIS-TO-RANDOM-STRING
   DEBUG=False
   ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
   DATABASE_URL=YOUR_POSTGRES_INTERNAL_URL_FROM_STEP_2
   CLOUDINARY_URL=cloudinary://YOUR_API_KEY:YOUR_API_SECRET@YOUR_CLOUD_NAME
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   EMAIL_HOST_USER=your.email@gmail.com
   EMAIL_HOST_PASSWORD=your_16_char_app_password
   SSLCOMMERZ_STORE_ID=testbox
   SSLCOMMERZ_STORE_PASSWORD=qwerty
   SSLCOMMERZ_IS_SANDBOX=True
   BACKEND_URL=https://homecrew-backend.onrender.com
   FRONTEND_PROTOCOL=https
   FRONTEND_DOMAIN=homecrew-frontend.onrender.com
   ```

5. Click: **Create Web Service**
6. ⏳ Wait 5-10 minutes for first deploy
7. 📝 Your backend URL: `https://homecrew-backend.onrender.com`

---

### Step 4: Deploy Frontend (5 minutes)

1. Click: **New +** → **Static Site**
2. Connect your GitHub repo
3. Configure:
   ```
   Name: homecrew-frontend
   Region: Oregon (US West)
   Branch: main
   Root Directory: homecrew-client
   Build Command: npm install && npm run build
   Publish Directory: dist
   Plan: Free
   ```

4. **Environment Variable**:
   ```env
   VITE_API_URL=https://homecrew-backend.onrender.com/api/v1
   ```

5. **Redirects/Rewrites** (Important for React Router):
   ```
   Source: /*
   Destination: /index.html
   Action: Rewrite
   ```

6. Click: **Create Static Site**
7. 📝 Your frontend URL: `https://homecrew-frontend.onrender.com`

---

### Step 5: Create Superuser (2 minutes)

1. Go to backend service
2. Click **Shell** tab
3. Run:
   ```bash
   python manage.py createsuperuser
   ```
4. Enter email and password

---

## 🎯 Testing Checklist

Visit your deployed app and test:

- [ ] Frontend loads: `https://homecrew-frontend.onrender.com`
- [ ] API works: `https://homecrew-backend.onrender.com/swagger/`
- [ ] Admin login: `https://homecrew-backend.onrender.com/admin/`
- [ ] User registration
- [ ] User login
- [ ] Browse services
- [ ] Add to cart
- [ ] Create order
- [ ] Payment flow

---

## 🐛 Common Issues

### Issue: Build Failed
```bash
# Fix: Make build.sh executable
git update-index --chmod=+x build.sh
git commit -m "Fix build.sh permissions"
git push
```

### Issue: Database Connection Error
- ✅ Use **Internal Database URL**
- ✅ Check DATABASE_URL is correctly set
- ✅ Wait for database to be fully created

### Issue: Static Files Not Loading
- ✅ Check Cloudinary credentials in environment variables
- ✅ Verify `CLOUDINARY_URL` format: `cloudinary://api_key:api_secret@cloud_name`
- ✅ Check Cloudinary Dashboard → Media Library for uploaded static files
- ✅ Production uses Cloudinary, Development uses WhiteNoise

### Issue: CORS Error
- ✅ Verify FRONTEND_DOMAIN is correct
- ✅ Check CORS_ALLOWED_ORIGINS in settings

### Issue: Cold Start (Free Plan)
- ⏳ First request after 15 mins = 30-50 seconds
- ✅ This is normal for free plan
- ✅ Upgrade to paid plan to remove sleep

---

## 📊 Expected Timeline

- Total deployment time: ~25 minutes
- Database creation: 2 minutes
- Backend first deploy: 10 minutes
- Frontend deploy: 3 minutes
- Testing: 10 minutes

---

## 🎉 Success!

If all tests pass:
1. ✅ Your app is LIVE!
2. ✅ Share frontend URL with users
3. ✅ Monitor from Render dashboard
4. ✅ Check logs for any errors

---

## 📚 Full Documentation

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed guide.

---

## 💡 Tips

- **Free Plan Limits**: 750 hours/month, sleeps after 15 min inactivity
- **Custom Domain**: Add in Render dashboard (Settings → Custom Domain)
- **Environment Variables**: Update anytime, will auto-redeploy
- **Logs**: Real-time logs in Render dashboard
- **Backup**: Export database regularly

**Happy Deploying! 🚀**
