# music_player/urls.py (CORRETTO: MusicStreamView Rimosso)

from django.urls import path
from .views import TrackListView, player_view, MetadataFilterView 

urlpatterns = [
    # Path root per il frontend
    path('', player_view, name='player-root'), 
    
    # API per ottenere la lista di tutti i brani
    path('tracks/', TrackListView.as_view(), name='track-list'),
    
    # API per Artisti e Album unici
    path('filters/', MetadataFilterView.as_view(), name='metadata-filters'), 
    
    # ❌ RIGA RIMOSSA/COMMENTATA: Non serve più e causa errori 404 sui file
    # path('music_stream/<path:filepath>', MusicStreamView.as_view(), name='music-stream'),

    # Percorso placeholder per la generazione di playlist AI
    # path('ai-playlist/', AIPlaylistView.as_view(), name='ai-playlist-generate'), 
]