# music_player/views.py
import os
import json
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from django.http import FileResponse, Http404
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.id3 import ID3NoHeaderError
import mimetypes
from django.shortcuts import render 
from .models import Track

# Cartella per i file delle playlist (all'interno della cartella MUSIC_ROOT)
PLAYLIST_DIR = Path(settings.MUSIC_ROOT) / "_playlists"

# --- HELPER PER METADATI ---

def get_track_metadata(file_path):
    """Estrae i metadati base da un file audio."""
    extension = file_path.suffix.lower()
    title, artist, album = file_path.stem, 'Sconosciuto', 'Sconosciuto'
    
    try:
        if extension == '.mp3':
            try:
                audio = MP3(file_path)
                tags = audio.tags
                if tags:
                    title = str(tags.get('TIT2', [file_path.stem])[0])
                    artist = str(tags.get('TPE1', ['Sconosciuto'])[0])
                    album = str(tags.get('TALB', ['Sconosciuto'])[0])
            except ID3NoHeaderError:
                pass
        elif extension == '.flac':
            audio = FLAC(file_path)
            title = audio.get('title', [file_path.stem])[0]
            artist = audio.get('artist', ['Sconosciuto'])[0]
            album = audio.get('album', ['Sconosciuto'])[0]
        
        relative_filepath = file_path.relative_to(settings.MUSIC_ROOT)
        
        # Cerca una copertina nella stessa cartella
        cover_url = None
        try:
            parent_dir = file_path.parent
            # Cerca primo file immagine supportato
            for item in parent_dir.iterdir():
                if item.is_file() and item.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.bmp'):
                    cover_url = f"music_stream/{str(item.relative_to(settings.MUSIC_ROOT))}"
                    break
        except Exception:
            pass

        return {
            'id': str(relative_filepath),
            'title': title,
            'artist': artist,
            'album': album,
            'url': f"music_stream/{str(relative_filepath)}",
            'cover_url': cover_url
        }
    except Exception as e:
        print(f"Errore lettura {file_path.name}: {e}")
        return None

# --- VIEWS ---

class TrackListView(APIView):
    """Restituisce la lista di tutti i brani dal database."""
    permission_classes = [AllowAny]

    def get(self, request):
        tracks = Track.objects.all()
        
        # Filtro per origine (locale o google drive)
        source_param = request.query_params.get('source', '')
        if source_param:
            tracks = tracks.filter(source=source_param)

        # Filtro per cartella
        folder_param = request.query_params.get('folder', '')
        if folder_param:
            tracks = tracks.filter(folder_path=folder_param)

        tracks_data = []
        for track in tracks:
            tracks_data.append({
                'id': track.file_path,  # Use file_path as ID for compatibility
                'title': track.title,
                'artist': track.artist,
                'album': track.album,
                'url': f"music_stream/{track.file_path}" if track.source == 'local' else f"gdrive_stream/{track.file_path}",
                'cover_url': track.cover_url,
                'source': track.source
            })
            
        return Response(tracks_data)

class DirectoryListView(APIView):
    """Restituisce le sottocartelle di un dato percorso."""
    permission_classes = [AllowAny]

    def get(self, request):
        source_param = request.query_params.get('source', 'local')
        current_path_param = request.query_params.get('path', '')
        
        # Security check semplificato per impedire navigation trasversale
        if '..' in current_path_param:
             return Response({"error": "Accesso negato"}, status=403)

        directories = []

        if source_param == 'gdrive':
            # --- Navigazione virtuale su Database (Google Drive) ---
            
            # Estraiamo tutti i percorsi unici non vuoti per GDrive
            all_paths = Track.objects.filter(
                source='gdrive'
            ).exclude(
                folder_path=''
            ).exclude(
                folder_path__isnull=True
            ).values_list('folder_path', flat=True).distinct()
            
            subdirs = set()
            
            for path in all_paths:
                # Se stiamo cercando folder root
                if not current_path_param:
                    # Prendi il primo componente del percorso (es. in "A/B/C" prende "A")
                    first_level = path.split('/')[0]
                    subdirs.add(first_level)
                else:
                    # Se il percorso inizia con la cartella che stiamo ispezionando
                    if path.startswith(current_path_param + '/') or path == current_path_param:
                        # Rimuoviamo il prefisso corrente
                        remainder = path[len(current_path_param):].lstrip('/')
                        if remainder:
                            # Prendi il livello successivo
                            next_level = remainder.split('/')[0]
                            subdirs.add(f"{current_path_param}/{next_level}")

            for subdir in subdirs:
                # Mostriamo solo il nome finale ricavandolo dal path completo
                folder_name = subdir.split('/')[-1]
                directories.append({
                    'name': folder_name,
                    'path': subdir
                })
                
        else:
            # --- Navigazione fisica su File System (Local Disk) ---
            music_root = Path(settings.MUSIC_ROOT)
            target_dir = music_root
            if current_path_param:
                target_dir = music_root / current_path_param

            if not target_dir.exists() or not target_dir.is_dir():
                return Response({"error": "Cartella non trovata"}, status=404)

            for item in target_dir.iterdir():
                if item.is_dir() and not item.name.startswith('.'):
                    directories.append({
                        'name': item.name,
                        'path': str(item.relative_to(music_root))
                    })
        
        # Sort directories a-z
        directories.sort(key=lambda x: x['name'].lower())
        
        return Response({
            'current_path': current_path_param,
            'directories': directories
        })

from django.views import View
from django.http import JsonResponse, StreamingHttpResponse
import requests

class MusicStreamView(View):
    """Gestisce lo streaming dei file audio permettendo l'accesso alle sottocartelle o Google Drive."""
    def get(self, request, filepath):
        # Cerca la traccia nel db
        try:
            track = Track.objects.get(file_path=filepath)
            
            if track.source == 'gdrive':
                from music_player.gdrive_service import get_drive_service
                service, creds = get_drive_service()
                
                # Usa un token Auth per scaricare il file. 
                # L'URL di download diretto dell'API v3 richiede il token di accesso.
                headers = {"Authorization": f"Bearer {creds.token}"}
                
                # Inoltra il Range header se presente (fondamentale per i browser e lo stream HTML5)
                client_range = request.headers.get('Range')
                if client_range:
                    headers['Range'] = client_range

                url = f"https://www.googleapis.com/drive/v3/files/{track.drive_file_id}?alt=media"
                
                # Richiesta in streaming a Google Drive
                r = requests.get(url, headers=headers, stream=True)
                
                if r.status_code not in (200, 206):
                    return JsonResponse({"error": f"Drive API Error: {r.text}"}, status=r.status_code)
                    
                response = StreamingHttpResponse(
                    r.iter_content(chunk_size=65536), 
                    content_type=r.headers.get('Content-Type', 'audio/mpeg'),
                    status=r.status_code
                )
                response['Accept-Ranges'] = 'bytes'
                response['Content-Disposition'] = 'inline'
                
                # Passa la dimensione e il range se Google la fornisce
                if 'Content-Length' in r.headers:
                    response['Content-Length'] = r.headers['Content-Length']
                if 'Content-Range' in r.headers:
                    response['Content-Range'] = r.headers['Content-Range']
                
                return response
                
        except Track.DoesNotExist:
            pass # Fallback al vecchio path per sicurezza se non è nel db
            
        file_path = Path(settings.MUSIC_ROOT) / filepath 
        if not file_path.is_file(): 
            raise Http404("File audio non trovato")
            
        mime_type, _ = mimetypes.guess_type(file_path)
        try:
            f = open(file_path, 'rb')
            # Increase block size to 64KB for better streaming performance
            response = FileResponse(f, content_type=mime_type or 'audio/mpeg')
            response.block_size = 65536  # 64KB chunk size
            response['Accept-Ranges'] = 'bytes'
            # Force inline disposition to ensure browser treats it as a stream/displayable media
            response['Content-Disposition'] = 'inline'
            return response
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

class MetadataFilterView(APIView):
    """Restituisce liste uniche di artisti e album per i filtri del frontend dal Database."""
    def get(self, request):
        artists = Track.objects.exclude(artist='Sconosciuto').values_list('artist', flat=True).distinct().order_by('artist')
        albums = Track.objects.exclude(album='Sconosciuto').values_list('album', flat=True).distinct().order_by('album')

        return Response({
            'artists': list(artists),
            'albums': list(albums),
        })

class PlaylistConfigView(APIView):
    """Gestisce il salvataggio e il caricamento di file .json per le playlist."""
    def get(self, request):
        if not PLAYLIST_DIR.exists(): PLAYLIST_DIR.mkdir(parents=True)
        playlists = []
        for f in PLAYLIST_DIR.glob('*.json'):
            try:
                with open(f, 'r', encoding='utf-8') as file:
                    playlists.append(json.load(file))
            except Exception:
                continue
        return Response(playlists)

    def post(self, request):
        if not PLAYLIST_DIR.exists(): PLAYLIST_DIR.mkdir(parents=True)
        data = request.data 
        if 'name' not in data:
            return Response({"error": "Nome mancante"}, status=400)
            
        filename = f"{data['name'].replace(' ', '_').lower()}.json"
        with open(PLAYLIST_DIR / filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        return Response({"status": "playlist salvata con successo"})

    def delete(self, request):
        name = request.query_params.get('name')
        if not name: return Response(status=400)
        
        filename = f"{name.replace(' ', '_').lower()}.json"
        file_path = PLAYLIST_DIR / filename
        if file_path.exists():
            os.remove(file_path)
            return Response({"status": "playlist eliminata"})
        return Response({"status": "file non trovato"}, status=404)

def player_view(request):
    """Renderizza la pagina principale del player."""
    return render(request, 'music_player/index.html', {})