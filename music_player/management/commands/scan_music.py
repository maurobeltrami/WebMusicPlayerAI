from django.core.management.base import BaseCommand
from pathlib import Path
from django.conf import settings
from music_player.models import Track
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.id3 import ID3NoHeaderError
import os

class Command(BaseCommand):
    help = 'Esegue la scansione della cartella musicale e popola il database con i metadati dei brani locali e/o da Google Drive.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--gdrive',
            action='store_true',
            help='Scansiona i brani da Google Drive invece che dal disco locale',
        )

    def handle(self, *args, **kwargs):
        use_gdrive = kwargs['gdrive']

        if use_gdrive:
            self.scan_gdrive()
        else:
            self.scan_local()

    def scan_gdrive(self):
        from music_player.gdrive_service import get_drive_service
        self.stdout.write(self.style.SUCCESS(f'Inizio scansione da Google Drive... (Potrebbe richiedere login sul browser)'))
        
        try:
            service, creds = get_drive_service()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Errore autenticazione Drive: {e}'))
            return

        tracks_created = 0
        tracks_updated = 0
        errors = 0

        # Mappa Cartelle (ID -> {name, parent_id})
        self.stdout.write('1/2. Caricamento struttura cartelle da Drive...')
        folders_map = {}
        page_token = None
        folder_query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        
        while True:
            try:
                results = service.files().list(
                    q=folder_query,
                    pageSize=1000,
                    fields="nextPageToken, files(id, name, parents)",
                    pageToken=page_token
                ).execute()
                
                for item in results.get('files', []):
                    parent_id = item.get('parents', [None])[0]
                    folders_map[item['id']] = {
                        'name': item['name'],
                        'parent_id': parent_id
                    }
                
                page_token = results.get('nextPageToken', None)
                if page_token is None:
                    break
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Errore nel caricamento cartelle: {e}'))
                break

        # Funzione helper ricorsiva per estrarre percorso, artista e album
        def get_metadata_from_hierarchy(current_parent_id):
            path_parts = []
            curr_id = current_parent_id
            
            while curr_id and curr_id in folders_map:
                folder = folders_map[curr_id]
                path_parts.insert(0, folder['name'])
                curr_id = folder['parent_id']
                
            folder_path = "/".join(path_parts) if path_parts else ""
            
            artist = 'Sconosciuto (Drive)'
            album = 'Sconosciuto (Drive)'
            
            # Se la cartella ha almeno 2 livelli (es. Root/Artista/Album)
            # consideriamo il penultimo come Artista e l'ultimo come Album.
            # Se ha solo 1 livello, lo consideriamo come Artista.
            if len(path_parts) >= 2:
                artist = path_parts[-2]
                album = path_parts[-1]
            elif len(path_parts) == 1:
                artist = path_parts[0]
                album = 'Singoli' # Se non c'è la cartella dell'album
                
            return artist, album, folder_path

        self.stdout.write('2/2. Scansione file audio e associazione metadati...')
        
        # Query for audio files
        audio_query = "mimeType contains 'audio/' and trashed = false"
        page_token = None
        
        while True:
            try:
                results = service.files().list(
                    q=audio_query,
                    pageSize=1000,
                    fields="nextPageToken, files(id, name, parents, mimeType, size)",
                    pageToken=page_token
                ).execute()
                
                items = results.get('files', [])

                for item in items:
                    file_id = item['id']
                    filename = item['name']
                    parent_id = item.get('parents', [None])[0]
                    
                    # Estrai titolo stimato dal nome del file
                    estimated_title = os.path.splitext(filename)[0]
                    
                    # Ricava metadati dalle cartelle genitrici
                    artist, album, folder_path = get_metadata_from_hierarchy(parent_id)
                    
                    obj, created = Track.objects.update_or_create(
                        drive_file_id=file_id,
                        source='gdrive',
                        defaults={
                            'file_path': file_id,
                            'folder_path': folder_path,
                            'title': estimated_title,
                            'artist': artist,
                            'album': album,
                            'cover_url': ''
                        }
                    )
                    
                    if created:
                        tracks_created += 1
                        self.stdout.write(f'Nuovo [{artist} - {album}]: {estimated_title}')
                    else:
                        tracks_updated += 1
                        # self.stdout.write(f'Aggiornato: {estimated_title}')

                page_token = results.get('nextPageToken', None)
                if page_token is None:
                    break
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Errore durante la scansione audio: {e}'))
                errors += 1
                break

        self.stdout.write(self.style.SUCCESS(
            f'\nScansione Google Drive completata!\n'
            f'- Struttura cartelle analizzate: {len(folders_map)}\n'
            f'- Nuovi brani inseriti: {tracks_created}\n'
            f'- Brani aggiornati/sincronizzati: {tracks_updated}\n'
            f'- Errori: {errors}'
        ))


    def scan_local(self):
        music_root = Path(settings.MUSIC_ROOT)
        
        if not music_root.exists():
            self.stdout.write(self.style.ERROR(f'MUSIC_ROOT non trovata: {music_root}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Inizio scansione in: {music_root}'))
        
        tracks_created = 0
        tracks_updated = 0
        errors = 0

        # Trova tutti i file audio supportati
        for file_path in music_root.glob('**/*'):
            if file_path.is_file() and file_path.suffix.lower() in ('.mp3', '.wav', '.flac', '.ogg'):
                # Extract metadata logic (adapted from views.py)
                extension = file_path.suffix.lower()
                title, artist, album = file_path.stem, 'Sconosciuto', 'Sconosciuto'
                
                try:
                    if extension == '.mp3':
                        try:
                            audio = MP3(file_path)
                            if audio.tags:
                                title = str(audio.tags.get('TIT2', [file_path.stem])[0])
                                artist = str(audio.tags.get('TPE1', ['Sconosciuto'])[0])
                                album = str(audio.tags.get('TALB', ['Sconosciuto'])[0])
                        except ID3NoHeaderError:
                            pass
                    elif extension == '.flac':
                        audio = FLAC(file_path)
                        title = audio.get('title', [file_path.stem])[0]
                        artist = audio.get('artist', ['Sconosciuto'])[0]
                        album = audio.get('album', ['Sconosciuto'])[0]
                    
                    relative_filepath = str(file_path.relative_to(music_root))
                    
                    # Copertina
                    cover_url = ''
                    try:
                        parent_dir = file_path.parent
                        for item in parent_dir.iterdir():
                            if item.is_file() and item.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.bmp'):
                                cover_url = f"music_stream/{str(item.relative_to(settings.MUSIC_ROOT))}"
                                break
                    except Exception:
                        pass
                    
                    # Usa update_or_create per non duplicare le canzoni se si rilancia lo script
                    obj, created = Track.objects.update_or_create(
                        file_path=relative_filepath,
                        source='local',
                        defaults={
                            'title': title,
                            'artist': artist,
                            'album': album,
                            'cover_url': cover_url
                        }
                    )
                    
                    if created:
                        tracks_created += 1
                        self.stdout.write(f'Aggiunto: {artist} - {title}')
                    else:
                        tracks_updated += 1
                        
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Errore elaborazione {file_path.name}: {e}'))
                    errors += 1

        self.stdout.write(self.style.SUCCESS(
            f'Scansione Locale completata!\n'
            f'- Nuovi brani inseriti: {tracks_created}\n'
            f'- Brani aggiornati: {tracks_updated}\n'
            f'- Errori: {errors}'
        ))
