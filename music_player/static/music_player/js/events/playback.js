import { safeSetClick, safeSetInput } from '../utils/helpers.js';
import * as audioEngine from '../core/audioEngine.js';
import * as pl from '../data/playlist.js';

export function setupPlaybackControls(audioPlayer, loadTrackCallback, renderUICallback) {
    safeSetClick('playPauseBtn', async () => {
        if (!audioEngine.audioContext) await audioEngine.initAudio(audioPlayer);
        
        const playIcon = document.getElementById('playPauseIcon');
        if (audioPlayer.paused) { 
            audioPlayer.play(); 
            pl.setPlaying(true); 
            if (playIcon) playIcon.classList.replace('fa-play', 'fa-pause');
        } else { 
            audioPlayer.pause(); 
            pl.setPlaying(false); 
            if (playIcon) playIcon.classList.replace('fa-pause', 'fa-play');
        }
        if (renderUICallback) renderUICallback();
    });

    safeSetClick('shuffleBtn', () => {
        pl.toggleShuffle();
        loadTrackCallback(0, pl.isPlaying);
    });

    safeSetClick('nextBtn', () => loadTrackCallback(pl.getNextTrackIndex(), true));
    safeSetClick('prevBtn', () => loadTrackCallback(pl.getPrevTrackIndex(), true));

    safeSetInput('volumeSlider', (e) => { 
        audioPlayer.volume = e.target.value; 
    });
}
