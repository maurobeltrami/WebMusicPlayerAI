# music_player/urls.py
from django.urls import path
from .views import (
    TrackListView, 
    player_view, 
    MetadataFilterView, 
    MusicStreamView,      
    PlaylistConfigView    
)

urlpatterns = [
    path('', player_view, name='player-root'), 
    path('api/tracks/', TrackListView.as_view(), name='track-list'),
    path('api/filters/', MetadataFilterView.as_view(), name='metadata-filters'), 
    path('api/playlists/', PlaylistConfigView.as_view(), name='playlist-config'),
    path('music_stream/<path:filepath>', MusicStreamView.as_view(), name='music-stream'),
]