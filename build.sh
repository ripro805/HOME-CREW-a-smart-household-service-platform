#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Collect static files (will upload to Cloudinary in production)
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate

echo "Build completed successfully!"
echo "Static files uploaded to Cloudinary"
