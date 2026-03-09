#!/bin/bash
# Installazione pacchetti di sistema
pkg update && pkg upgrade -y
pkg install python python-cryptography binutils rust termux-api -y

# Setup ambiente virtuale
python -m venv --system-site-packages venv
source venv/bin/activate

# Installazione requisiti Python
pip install --upgrade pip
pip install django djangorestframework django-cors-headers mutagen requests google-api-python-client google-auth-httplib2 google-auth-oauthlib

# Preparazione cartella musica e database
mkdir -p media_music
python manage.py migrate
python manage.py scan_music --gdrive

echo "Setup completato. Usa './start.sh' per avviare il server."
