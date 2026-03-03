#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Build React frontend (Render Python services have Node/npm available)
# RENDER_EXTERNAL_URL is set by Render automatically (e.g. https://app.onrender.com)
cd homecrew-client && npm install && VITE_API_URL="${RENDER_EXTERNAL_URL}/api/v1" npm run build && cd ..

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate
