#!/bin/bash
source venv/bin/activate
# Impedisce al telefono di sospendere la CPU
termux-wake-lock 
python manage.py runserver 0.0.0.0:8250
