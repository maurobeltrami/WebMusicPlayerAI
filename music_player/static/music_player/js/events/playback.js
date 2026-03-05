import { safeSetClick, safeSetInput } from '../utils/helpers.js';
import * as audioEngine from '../core/audioEngine.js';
import * as pl from '../data/playlist.js';

export function setupPlaybackControls(audioPlayer, loadTrackCallback, renderUICallback) {
    const handlePlayPause = async () => {
        if (!audioEngine.audioContext) await audioEngine.initAudio(audioPlayer);
        
        const playIcon = document.getElementById('playPauseIcon');
        const playIconBottom = document.getElementById('playPauseIconBottom');
        
        if (audioPlayer.paused) { 
            audioPlayer.play(); 
            pl.setPlaying(true); 
            if (playIcon) playIcon.classList.replace('fa-play', 'fa-pause');
            if (playIconBottom) playIconBottom.classList.replace('fa-play', 'fa-pause');
        } else { 
            audioPlayer.pause(); 
            pl.setPlaying(false); 
            if (playIcon) playIcon.classList.replace('fa-pause', 'fa-play');
            if (playIconBottom) playIconBottom.classList.replace('fa-pause', 'fa-play');
        }
        if (renderUICallback) renderUICallback();
    };

    safeSetClick('playPauseBtn', handlePlayPause);
    safeSetClick('playPauseBtnBottom', handlePlayPause);

    safeSetClick('shuffleBtn', () => {
        pl.toggleShuffle();
        loadTrackCallback(0, pl.isPlaying);
    });

    const goNext = () => loadTrackCallback(pl.getNextTrackIndex(), true);
    const goPrev = () => loadTrackCallback(pl.getPrevTrackIndex(), true);

    safeSetClick('nextBtn', goNext);
    safeSetClick('nextBtnBottom', goNext);
    
    safeSetClick('prevBtn', goPrev);
    safeSetClick('prevBtnBottom', goPrev);

    const handleVolume = (e) => { 
        audioPlayer.volume = e.target.value; 
        const vol1 = document.getElementById('volumeSlider');
        const vol2 = document.getElementById('volumeSliderBottom');
        if (vol1 && vol1 !== e.target) vol1.value = e.target.value;
        if (vol2 && vol2 !== e.target) vol2.value = e.target.value;
    };

    safeSetInput('volumeSlider', handleVolume);
    safeSetInput('volumeSliderBottom', handleVolume);
}
