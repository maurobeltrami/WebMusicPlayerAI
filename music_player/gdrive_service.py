# music_player/gdrive_service.py
import os
import json
from pathlib import Path
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from django.conf import settings

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def get_drive_service(user_id=None):
    """
    Ottiene e rinfresca le credenziali OAuth2 per Google Drive.
    Ritorna un oggetto build('drive', 'v3', credentials=creds) 
    o semplicemente le credenziali per le API REST.
    """
    creds = None
    token_path = Path(settings.BASE_DIR) / 'token.json'
    client_secret_path = Path(settings.BASE_DIR) / 'client_secret.json'

    # The file token.json stores the user's access and refresh tokens
    if token_path.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
        except ValueError:
            print(f"File {token_path} non valido o senza refresh_token. Lo elimino per forzare una nuova autenticazione.")
            token_path.unlink()
            creds = None
        
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not client_secret_path.exists():
                raise FileNotFoundError(
                    f"File '{client_secret_path}' non trovato. "
                    "Assicurati di aver scaricato il JSON dal Google Cloud Console e rinominato in client_secret.json."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(client_secret_path), SCOPES)
            
            # Use run_local_server for local development with fixed port
            # to avoid redirect_uri_mismatch
            creds = flow.run_local_server(port=8080, open_browser=False, prompt='consent', access_type='offline')
            
        # Save the credentials for the next run
        with open(token_path, 'w') as token:
            token.write(creds.to_json())

    from googleapiclient.discovery import build
    service = build('drive', 'v3', credentials=creds)
    return service, creds
