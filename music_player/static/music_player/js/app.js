import * as ui from './ui.js';
import * as vis from './visualizer.js';
import * as playerTools from './player.js';
import * as filterTools from './filters.js';
import * as audioEngine from './audio-engine.js'; // Nuovo import

// --- STATO GLOBALE ---
let fullLibrary = [];
let currentPlaylist = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffling = false;

// --- ELEMENTI DOM ---
const audioPlayer = document.getElementById('audioPlayer');
const canvas = document.getElementById('visualizer');
const ctx = canvas ? canvas.getContext('2d') : null;
const aiStatus = document.getElementById('aiStatus');
const playPauseIcon = document.getElementById('playPauseIcon');

// --- CORE PLAYER ---
function loadTrack(index, autoPlay = isPlaying) {
    if (currentPlaylist.length === 0) return;

    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[currentTrackIndex];
    const finalSrc = playerTools.getFinalAudioSrc(track.url);

    if (audioPlayer.src !== finalSrc) {
        audioPlayer.src = finalSrc;
        audioPlayer.load();
        console.log("Audio caricato via modulo:", finalSrc);
    }

    document.getElementById('currentTrack').textContent = `${track.title} - ${track.artist}`;

    if (autoPlay) {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                playPauseIcon.classList.replace('fa-play', 'fa-pause');
            })
            .catch(e => console.warn("Interazione richiesta per autoplay"));
    }
    renderUI();
}

// --- AZIONI ---
function applyFilters() {
    const artist = document.getElementById('artistFilter').value;
    const album = document.getElementById('albumFilter').value;
    const search = document.getElementById('searchTrackInput').value;

    currentPlaylist = filterTools.filterLibrary(fullLibrary, artist, album, search);
    isShuffling = false;
    currentTrackIndex = 0;

    if (currentPlaylist.length > 0) {
        loadTrack(0, false);
        aiStatus.textContent = `Filtrati: ${currentPlaylist.length} brani.`;
    } else {
        document.getElementById('currentTrack').textContent = "Nessun match";
        audioPlayer.src = '';
    }

    const sBtn = document.getElementById('shuffleBtn');
    if (sBtn) sBtn.classList.remove('text-purple-600');
    renderUI();
}

function toggleShuffle() {
    if (currentPlaylist.length === 0) return;

    isShuffling = !isShuffling;
    const shuffleBtn = document.getElementById('shuffleBtn');

    if (isShuffling) {
        currentPlaylist = filterTools.shuffleArray(currentPlaylist);
        currentTrackIndex = 0;
        loadTrack(0, isPlaying);
        aiStatus.textContent = "Shuffle integrale 🎲";
        if (shuffleBtn) shuffleBtn.classList.add('text-purple-600');
    } else {
        applyFilters();
        if (shuffleBtn) shuffleBtn.classList.remove('text-purple-600');
    }
    renderUI();
}

async function togglePlayPause() {
    if (currentPlaylist.length === 0) return;

    // INIZIALIZZA MOTORE AUDIO E COMPRESSORE AL PRIMO PLAY
    if (!audioEngine.audioContext) {
        await audioEngine.initAudio(audioPlayer);
    }

    if (audioPlayer.paused) {
        audioPlayer.play();
        isPlaying = true;
        playPauseIcon.classList.replace('fa-play', 'fa-pause');
    } else {
        audioPlayer.pause();
        isPlaying = false;
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
    }
}

function renderUI() {
    ui.updatePlaylistView(currentPlaylist, currentTrackIndex, isPlaying, {
        playlistEl: document.getElementById('playlist'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        shuffleBtn: document.getElementById('shuffleBtn')
    }, {
        onLoadTrack: (idx) => loadTrack(idx, true),
        onRemoveTrack: (idx) => {
            currentPlaylist.splice(idx, 1);
            renderUI();
        },
        isShuffling: isShuffling
    });
    const countEl = document.getElementById('playlistCount');
    if (countEl) countEl.textContent = `${currentPlaylist.length} brani`;
}

// --- EVENT LISTENERS ---
document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
document.getElementById('nextBtn').addEventListener('click', () => loadTrack(currentTrackIndex + 1, true));
document.getElementById('prevBtn').addEventListener('click', () => loadTrack(currentTrackIndex - 1, true));
document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
document.getElementById('artistFilter').addEventListener('change', applyFilters);
document.getElementById('albumFilter').addEventListener('change', applyFilters);
document.getElementById('searchTrackInput').addEventListener('input', applyFilters);

document.getElementById('volumeSlider').addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (val > playerTools.MAX_SAFE_VOLUME) val = playerTools.MAX_SAFE_VOLUME;
    audioPlayer.volume = val;
});

audioPlayer.addEventListener('timeupdate', () => {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    const pBar = document.getElementById('progressBar');
    if (pBar) pBar.style.width = `${progress || 0}%`;
    const tDisp = document.getElementById('time-display');
    if (tDisp) tDisp.textContent = `${ui.formatTime(audioPlayer.currentTime)} / ${ui.formatTime(audioPlayer.duration)}`;
});

audioPlayer.addEventListener('ended', () => loadTrack(currentTrackIndex + 1, true));

// --- ANIMAZIONE E INIT ---
let frame = 0;
function animate() {
    if (ctx && canvas) {
        // Passiamo l'analyser dal motore audio al visualizzatore
        const type = document.getElementById('visualizerSelector').value;
        vis.draw(ctx, canvas, type, isPlaying, frame++, audioEngine.analyser);
    }
    requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', async () => {
    aiStatus.textContent = "Caricamento...";
    try {
        const response = await fetch('/api/tracks/');
        fullLibrary = await response.json();
        currentPlaylist = [...fullLibrary];

        const artSel = document.getElementById('artistFilter');
        const albSel = document.getElementById('albumFilter');
        filterTools.getUniqueMetadata(fullLibrary, 'artist').forEach(a => artSel.add(new Option(a, a)));
        filterTools.getUniqueMetadata(fullLibrary, 'album').forEach(a => albSel.add(new Option(a, a)));

        loadTrack(0, false);
        animate();

        aiStatus.textContent = "Libreria Pronta";
    } catch (e) {
        aiStatus.textContent = "Errore API";
        console.error(e);
    }
});