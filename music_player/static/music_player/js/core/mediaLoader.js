import * as paths from './paths.js';
import * as pl from '../data/playlist.js';
import * as ui from '../ui/playlistRenderer.js';

export function loadTrack(audioPlayer, index, autoPlay, renderUICallback) {
    if (pl.currentPlaylist.length === 0) return;
    pl.setCurrentTrackIndex(index);
    const track = pl.getCurrentTrack();

    audioPlayer.src = paths.getFinalAudioSrc(track.url);
    audioPlayer.load();

    const trackDisplay = document.getElementById('currentTrack');
    if (trackDisplay) {
        trackDisplay.textContent = `${track.title} - ${track.artist}`;
    }

    let cover = track.cover_url 
        ? paths.getFinalAudioSrc(track.cover_url) 
        : track.url.substring(0, track.url.lastIndexOf('/') + 1) + "cover.jpg";
    pl.setCoverUrl(cover);

    const playIcon = document.getElementById('playPauseIcon');

    if (autoPlay) {
        audioPlayer.play().then(() => {
            pl.setPlaying(true);
            if (playIcon) playIcon.classList.replace('fa-play', 'fa-pause');
        }).catch(() => { });
    } else {
        pl.setPlaying(false);
        if (playIcon) playIcon.classList.replace('fa-pause', 'fa-play');
    }
    
    if (renderUICallback) renderUICallback();
}
