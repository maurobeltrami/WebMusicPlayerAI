# music_player/views.py (COMPLETO E CORRETTO)

import os
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


# --- Funzione Helper per l'Estrazione dei Metadati ---

def get_track_metadata(file_path):
    """Estrae titolo, artista, album, e genere da un file audio con mutagen."""
    
    extension = file_path.suffix.lower()
    
    # Valori di default
    title = file_path.stem
    artist = 'Sconosciuto'
    album = 'Sconosciuto'
    genre = 'Sconosciuto'
    
    try:
        # ... (Logica di estrazione metadati MP3/FLAC invariata) ...
        if extension == '.mp3':
            audio = MP3(file_path)
            title_tag = audio.get('TIT2', [file_path.stem]) 
            artist_tag = audio.get('TPE1', ['Sconosciuto'])
            album_tag = audio.get('TALB', ['Sconosciuto']) 
            genre_tag = audio.get('TCON', ['Sconosciuto']) 
            
            title = title_tag[0].text if title_tag and hasattr(title_tag[0], 'text') else file_path.stem
            artist = artist_tag[0].text if artist_tag and hasattr(artist_tag[0], 'text') else 'Sconosciuto'
            album = album_tag[0].text if album_tag and hasattr(album_tag[0], 'text') else 'Sconosciuto'
            genre = genre_tag[0].text if genre_tag and hasattr(genre_tag[0], 'text') else 'Sconosciuto'

        elif extension == '.flac':
            audio = FLAC(file_path)
            title = audio.get('title', [file_path.stem])[0]
            artist = audio.get('artist', ['Sconosciuto'])[0]
            album = audio.get('album', ['Sconosciuto'])[0]
            genre = audio.get('genre', ['Sconosciuto'])[0]
            
        elif extension in ('.wav', '.ogg', '.wma'):
            pass
        else:
            pass

        
        # ⬅️ CORREZIONE A: Usiamo il percorso relativo (che include la sottocartella)
        relative_filepath = file_path.relative_to(settings.MUSIC_ROOT)
        
        return {
            'id': file_path.stem, 
            'title': str(title).strip(),
            'artist': str(artist).strip(),
            'album': str(album).strip(),
            'genre': str(genre).strip(),
            'filename': str(relative_filepath), # ⬅️ ADESSO È IL PERCORSO RELATIVO
            'url': f"music_stream/{str(relative_filepath)}",
        }

    except ID3NoHeaderError:
        # ... (Logica ID3NoHeaderError modificata per usare relative_filepath) ...
        relative_filepath = file_path.relative_to(settings.MUSIC_ROOT)
        return {
            'id': file_path.stem,
            'title': file_path.stem,
            'artist': 'Sconosciuto',
            'album': 'Sconosciuto',
            'genre': 'Sconosciuto',
            'filename': str(relative_filepath),
            'url': f"music_stream/{str(relative_filepath)}", 
        }
    except Exception as e:
        print(f"Errore nella lettura del file {file_path.name}: {e}")
        return None

# --- View per l'Elenco dei Brani (APIView) ---
# ... (TrackListView invariata) ...
class TrackListView(APIView):
    """Restituisce la lista JSON di tutti i brani nella cartella configurata."""
    def get(self, request):
        music_root = Path(settings.MUSIC_ROOT)
        # ... (Logica TrackListView invariata) ...
        if not music_root.is_dir():
            print(f"Errore: La directory musicale '{music_root}' non è valida o inaccessibile.")
            return Response(
                {"error": "Impossibile accedere alla cartella musicale. Controlla MUSIC_ROOT in settings.py."},
                status=500
            )

        tracks_data = []
        
        for file_path in music_root.glob('**/*'): 
            if file_path.is_file() and file_path.suffix.lower() in ('.mp3', '.wav', '.flac', '.ogg'):
                
                track = get_track_metadata(file_path)
                if track:
                    tracks_data.append(track)
                    
        return Response(tracks_data)


# --- View per lo Streaming dei Brani (APIView) ---

class MusicStreamView(APIView):
    """Serve un file musicale specifico in streaming al browser."""
    
    # ⬅️ CORREZIONE B: Accetta 'filepath' che include le sottocartelle
    def get(self, request, filepath):
        
        music_root = Path(settings.MUSIC_ROOT)
        # file_path è ora costruito usando l'intero filepath
        file_path = music_root / filepath 
        filename = file_path.name # Usiamo solo il nome per gli header Content-Disposition
        
        if not file_path.is_file():
            # Mostra l'errore se il percorso completo non esiste
            print(f"File non trovato: {file_path}")
            raise Http404("Il brano richiesto non è stato trovato.")
        
        try:
            # Controllo di sicurezza
            file_path.relative_to(music_root)
        except ValueError:
            raise Http404("Accesso al file non consentito (violazione percorso).")

        mime_type, encoding = mimetypes.guess_type(file_path)
        
        if not mime_type:
            # Fallback specifico per i formati comuni
            if filename.lower().endswith('.mp3'):
                mime_type = 'audio/mpeg'
            elif filename.lower().endswith('.flac'):
                mime_type = 'audio/flac'
            elif filename.lower().endswith('.ogg'):
                mime_type = 'audio/ogg'
            else:
                mime_type = 'application/octet-stream' 
        
        try:
            f = open(file_path, 'rb')
            response = FileResponse(f, content_type=mime_type)
            
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            response['Accept-Ranges'] = 'bytes' 
            response['Content-Length'] = os.path.getsize(file_path) 
            
            return response
            
        except Exception as e:
            print(f"Errore nello streaming del file {filepath}: {e}")
            return Response({"error": "Impossibile effettuare lo streaming del brano."}, status=500)


# --- NUOVA VIEW: Metadati per i Filtri ---
# ... (MetadataFilterView invariata) ...
class MetadataFilterView(APIView):
    """Restituisce la lista unica di Artisti e Album disponibili."""
    def get(self, request):
        music_root = Path(settings.MUSIC_ROOT)
        
        if not music_root.is_dir():
            return Response({"error": "Impossibile accedere alla cartella musicale."}, status=500)

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


# --- View per il Rendering del Frontend ---

def player_view(request):
    """Renderizza la pagina HTML del player (il frontend)."""
    return render(request, 'music_player/index.html', {})