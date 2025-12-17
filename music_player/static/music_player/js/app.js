import * as ui from './ui.js';
import * as vis from './visualizer.js';

// --- STATO GLOBALE ---
let currentPlaylist = [];
let fullLibrary = [];
let originalPlaylistOrder = []; // Memorizza l'ordine pre-shuffle
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffling = false;
const MAX_SAFE_VOLUME = 0.9;

// Costanti URL ripristinate dal tuo file funzionante
const DJANGO_BASE_HOST = 'http://127.0.0.1:8000/';
const DJANGO_MEDIA_PREFIX = 'media/';

// --- ELEMENTI DOM ---
const audioPlayer = document.getElementById('audioPlayer');
const canvas = document.getElementById('visualizer');
const ctx = canvas ? canvas.getContext('2d') : null;
const aiStatus = document.getElementById('aiStatus');
const volumeSlider = document.getElementById('volumeSlider');
const playPauseIcon = document.getElementById('playPauseIcon');

// --- LOGICA FILTRI ---
function applyFilters() {
    const selectedArtist = document.getElementById('artistFilter').value;
    const selectedAlbum = document.getElementById('albumFilter').value;
    const searchTerm = document.getElementById('searchTrackInput').value.toLowerCase().trim();

    // Filtra dalla libreria completa
    let filtered = fullLibrary.filter(track => {
        const matchArtist = selectedArtist === 'all' || track.artist === selectedArtist;
        const matchAlbum = selectedAlbum === 'all' || track.album === selectedAlbum;
        const matchSearch = track.title.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm) ||
            track.album.toLowerCase().includes(searchTerm);
        return matchArtist && matchAlbum && matchSearch;
    });

    currentPlaylist = filtered;
    isShuffling = false; // Reset dello shuffle quando si applicano nuovi filtri

    if (currentPlaylist.length > 0) {
        currentTrackIndex = 0;
        loadTrack(0, false);
        aiStatus.textContent = `Trovati ${currentPlaylist.length} brani.`;
    } else {
        document.getElementById('currentTrack').textContent = "Nessun brano trovato";
        audioPlayer.src = '';
        aiStatus.textContent = "Nessun match per i filtri selezionati.";
    }

    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) shuffleBtn.classList.remove('text-purple-600');

    renderUI();
}

function populateFilters(tracks) {
    const artists = [...new Set(tracks.map(t => t.artist))].sort();
    const albums = [...new Set(tracks.map(t => t.album))].sort();
    const artSelect = document.getElementById('artistFilter');
    const albSelect = document.getElementById('albumFilter');

    if (artSelect && albSelect) {
        artSelect.innerHTML = '<option value="all">Tutti gli Artisti</option>';
        albSelect.innerHTML = '<option value="all">Tutti gli Album</option>';
        artists.forEach(a => artSelect.add(new Option(a, a)));
        albums.forEach(a => albSelect.add(new Option(a, a)));
    }
}

// --- CORE PLAYER (LOGICA DI CARICAMENTO ORIGINALE) ---
function loadTrack(index, autoPlay = isPlaying) {
    if (currentPlaylist.length === 0) return;

    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[currentTrackIndex];

    // Pulizia stringa URL (Logica copiata dal file funzionante)
    let relativeUrl = track.url;
    relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '')
        .replace(/^\/api\//, '')
        .replace(/^music_stream\//, '')
        .replace(/^\//, '');

    const encodedFilepath = encodeURIComponent(relativeUrl);
    const finalSrc = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;

    if (audioPlayer.src !== finalSrc) {
        audioPlayer.src = finalSrc;
        audioPlayer.load();
        console.log("Audio caricato correttamente:", finalSrc);
    }

    document.getElementById('currentTrack').textContent = `${track.title} - ${track.artist}`;

    if (autoPlay) {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                playPauseIcon.classList.replace('fa-play', 'fa-pause');
            })
            .catch(e => {
                console.warn("Riproduzione bloccata o errore file:", e);
                isPlaying = false;
                playPauseIcon.classList.replace('fa-pause', 'fa-play');
            });
    }
    renderUI();
}

// --- LOGICA SHUFFLE (VERSIONE INTEGRALE) ---
function toggleShuffle() {
    if (currentPlaylist.length === 0) return;

    isShuffling = !isShuffling;
    const shuffleBtn = document.getElementById('shuffleBtn');

    if (isShuffling) {
        // Salviamo l'ordine originale per poterlo ripristinare
        originalPlaylistOrder = [...currentPlaylist];

        // Mischia TUTTI i brani della playlist (Algoritmo Fisher-Yates)
        for (let i = currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
        }

        // Dopo aver mischiato tutto, ricomincia dal primo brano della nuova lista
        currentTrackIndex = 0;
        loadTrack(0, isPlaying); // Carica il nuovo primo brano

        aiStatus.textContent = "Playlist mischiata totalmente 🎲";
        if (shuffleBtn) shuffleBtn.classList.add('text-purple-600');
    } else {
        // Ripristina l'ordine basato sui filtri correnti o sull'ordine originale
        applyFilters();
        aiStatus.textContent = "Ordine originale ripristinato";
        if (shuffleBtn) shuffleBtn.classList.remove('text-purple-600');
    }

    renderUI();
}

async function togglePlayPause() {
    if (currentPlaylist.length === 0) return;

    if (!vis.audioContext && isPlaying === false) {
        await vis.setupVisualizer(audioPlayer, canvas, document.getElementById('visualizerSelector').value);
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

function removeTrack(index) {
    if (currentPlaylist.length <= 1) {
        aiStatus.textContent = "Impossibile svuotare la coda.";
        return;
    }
    const isRemovingCurrent = (index === currentTrackIndex);
    currentPlaylist.splice(index, 1);

    if (isRemovingCurrent) {
        loadTrack(currentTrackIndex % currentPlaylist.length, isPlaying);
    } else if (index < currentTrackIndex) {
        currentTrackIndex--;
    }
    renderUI();
}

function renderUI() {
    ui.updatePlaylistView(
        currentPlaylist,
        currentTrackIndex,
        isPlaying,
        {
            playlistEl: document.getElementById('playlist'),
            nextBtn: document.getElementById('nextBtn'),
            prevBtn: document.getElementById('prevBtn'),
            shuffleBtn: document.getElementById('shuffleBtn')
        },
        {
            onLoadTrack: (idx) => loadTrack(idx, true),
            onRemoveTrack: removeTrack,
            isShuffling: isShuffling
        }
    );
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

volumeSlider.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (val > MAX_SAFE_VOLUME) {
        val = MAX_SAFE_VOLUME;
        e.target.value = MAX_SAFE_VOLUME;
    }
    audioPlayer.volume = val;
});

document.getElementById('visualizerSelector').addEventListener('change', (e) => {
    vis.updateFFT(e.target.value);
});

audioPlayer.addEventListener('timeupdate', () => {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = `${progress || 0}%`;

    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
        timeDisplay.textContent = `${ui.formatTime(audioPlayer.currentTime)} / ${ui.formatTime(audioPlayer.duration)}`;
    }
});

audioPlayer.addEventListener('ended', () => loadTrack(currentTrackIndex + 1, true));

// --- ANIMAZIONE E INIT ---
let frame = 0;
function animate() {
    if (ctx && canvas) {
        vis.draw(ctx, canvas, document.getElementById('visualizerSelector').value, isPlaying, frame++);
    }
    requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', async () => {
    aiStatus.textContent = "Caricamento libreria...";
    try {
        const response = await fetch('/api/tracks/');
        if (!response.ok) throw new Error('API non raggiungibile');

        fullLibrary = await response.json();
        currentPlaylist = [...fullLibrary];

        populateFilters(fullLibrary);
        loadTrack(0, false);
        animate();
        aiStatus.textContent = "Libreria caricata";
    } catch (e) {
        aiStatus.textContent = "Errore: server Django non connesso.";
        console.error("Errore Init:", e);
    }
});