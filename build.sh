#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Build React frontend
# Since Django and React are on the same domain on Render, /api/v1 works as a relative URL.
# Locally VITE_API_URL falls back to http://localhost:8000/api/v1 in axios.js
echo "Building React frontend..."
cd homecrew-client && npm install && VITE_API_URL="https://home-crew-a-smart-household-service-hv7v.onrender.com/api/v1" npm run build
cd ..
echo "React build complete."

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate
