# music_player/views.py
import os
import json
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.http import FileResponse, Http404
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.id3 import ID3NoHeaderError
import mimetypes
from django.shortcuts import render 

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
        return {
            'id': str(relative_filepath),
            'title': title,
            'artist': artist,
            'album': album,
            'url': f"music_stream/{str(relative_filepath)}",
        }
    except Exception as e:
        print(f"Errore lettura {file_path.name}: {e}")
        return None

# --- VIEWS ---

class TrackListView(APIView):
    """Restituisce la lista di tutti i brani trovati sul disco (o in una sottocartella)."""
    def get(self, request):
        music_root = Path(settings.MUSIC_ROOT)
        if not music_root.exists():
            return Response({"error": "MUSIC_ROOT non trovata"}, status=500)
        
        # Gestione sottocartella opzionale
        folder_param = request.query_params.get('folder', '')
        search_root = music_root
        if folder_param:
            potential_root = music_root / folder_param
            # Security check: ensure we stay within lawful bounds
            try:
                if music_root in potential_root.resolve().parents or potential_root.resolve() == music_root:
                     if potential_root.exists() and potential_root.is_dir():
                        search_root = potential_root
            except Exception:
                pass # Fallback to music_root if invalid

        tracks_data = []
        # Cerca file audio ricorsivamente
        for file_path in search_root.glob('**/*'): 
            if file_path.is_file() and file_path.suffix.lower() in ('.mp3', '.wav', '.flac', '.ogg'):
                track = get_track_metadata(file_path)
                if track: tracks_data.append(track)
        return Response(tracks_data)

class DirectoryListView(APIView):
    """Restituisce le sottocartelle di un dato percorso."""
    def get(self, request):
        music_root = Path(settings.MUSIC_ROOT)
        current_path_param = request.query_params.get('path', '')
        
        target_dir = music_root
        if current_path_param:
            target_dir = music_root / current_path_param
            
        # Security check
        try:
            resolved_target = target_dir.resolve()
            if not (resolved_target == music_root or music_root in resolved_target.parents):
                return Response({"error": "Accesso negato"}, status=403)
        except Exception:
             return Response({"error": "Percorso non valido"}, status=400)

        if not target_dir.exists() or not target_dir.is_dir():
            return Response({"error": "Cartella non trovata"}, status=404)

        directories = []
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

class MusicStreamView(APIView):
    """Gestisce lo streaming dei file audio permettendo l'accesso alle sottocartelle."""
    def get(self, request, filepath):
        file_path = Path(settings.MUSIC_ROOT) / filepath 
        if not file_path.is_file(): 
            raise Http404("File audio non trovato")
            
        mime_type, _ = mimetypes.guess_type(file_path)
        try:
            f = open(file_path, 'rb')
            # Increase block size to 64KB for better streaming performance
            response = FileResponse(f, content_type=mime_type or 'audio/mpeg')
            response.block_size = 65536  # 64KB chunk size
            response['Content-Length'] = os.path.getsize(file_path)
            response['Accept-Ranges'] = 'bytes'
            # Force inline disposition to ensure browser treats it as a stream/displayable media
            response['Content-Disposition'] = 'inline'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class MetadataFilterView(APIView):
    """Restituisce liste uniche di artisti e album per i filtri del frontend."""
    def get(self, request):
        music_root = Path(settings.MUSIC_ROOT)
        artists = set()
        albums = set()

        for file_path in music_root.glob('**/*'): 
            if file_path.is_file() and file_path.suffix.lower() in ('.mp3', '.wav', '.flac', '.ogg'):
                track = get_track_metadata(file_path)
                if track:
                    artists.add(track['artist'])
                    albums.add(track['album'])

        return Response({
            'artists': sorted(list(artists)),
            'albums': sorted(list(albums)),
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