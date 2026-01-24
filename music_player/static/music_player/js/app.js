import * as ui from './ui.js';
import * as vis from './visualizer.js';
import * as playerTools from './player.js';
import * as filterTools from './filters.js';
import * as audioEngine from './audio-engine.js';

// --- STATO ---
let fullLibrary = [];
let currentPlaylist = [];
let originalPlaylistOrder = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffling = false;
let currentCoverUrl = null;
let trackTargetId = null;

const audioPlayer = document.getElementById('audioPlayer');
const ctx = document.getElementById('visualizer')?.getContext('2d');
const aiStatus = document.getElementById('aiStatus');

// --- UTILS ---
const safeSetClick = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
const safeSetInput = (id, fn) => { const el = document.getElementById(id); if (el) el.oninput = fn; };
const safeSetChange = (id, fn) => { const el = document.getElementById(id); if (el) el.onchange = fn; };

function getCookie(name) {
    let v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? decodeURIComponent(v[2]) : null;
}

// --- LOGICA PROGRESSO & AUTOMAZIONE ---
audioPlayer.ontimeupdate = () => {
    const progressBar = document.getElementById('progressBar');
    const timeDisplay = document.getElementById('time-display');
    if (audioPlayer.duration) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (timeDisplay) {
            timeDisplay.textContent = `${ui.formatTime(audioPlayer.currentTime)} / ${ui.formatTime(audioPlayer.duration)}`;
        }
    }
};

audioPlayer.onended = () => {
    loadTrack(currentTrackIndex + 1, true);
};

// --- FILTRI & POPOLAMENTO ---
function populateFilters() {
    const artSel = document.getElementById('artistFilter');
    const albSel = document.getElementById('albumFilter');
    if (artSel) {
        artSel.innerHTML = '<option value="">Tutti gli Artisti</option>';
        [...new Set(fullLibrary.map(t => t.artist))].filter(Boolean).sort().forEach(a => artSel.add(new Option(a, a)));
    }
    if (albSel) {
        albSel.innerHTML = '<option value="">Tutti gli Album</option>';
        [...new Set(fullLibrary.map(t => t.album))].filter(Boolean).sort().forEach(a => albSel.add(new Option(a, a)));
    }
}

// --- GESTIONE PLAYLIST ---
async function fetchPlaylists() {
    try {
        const res = await fetch('/api/playlists/');
        const data = await res.json();

        const selector = document.getElementById('savedPlaylistSelector');
        if (selector) {
            selector.innerHTML = '<option value="all">Tutta la Libreria</option>';
            data.forEach(pl => selector.add(new Option(pl.name, pl.name)));
        }

        const list = document.getElementById('savedPlaylistsList');
        if (list) {
            list.innerHTML = data.map(pl => `
                <li class="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm">
                    <span class="text-sm font-bold text-gray-700">${pl.name}</span>
                    <div class="flex gap-2">
                        <button class="edit-pl-btn bg-yellow-500 text-white px-2 py-1 rounded text-[10px] font-bold" data-name="${pl.name}">MODIFICA</button>
                        <button class="load-pl-btn bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold" data-name="${pl.name}">PLAY</button>
                    </div>
                </li>
            `).join('');

            list.querySelectorAll('.load-pl-btn').forEach(btn => {
                btn.onclick = () => {
                    const pl = data.find(p => p.name === btn.dataset.name);
                    currentPlaylist = pl.tracks.map(id => fullLibrary.find(t => String(t.id) === String(id))).filter(t => t);
                    originalPlaylistOrder = [...currentPlaylist];
                    loadTrack(0, true);
                    document.getElementById('playlistModal').classList.add('hidden');
                };
            });

            list.querySelectorAll('.edit-pl-btn').forEach(btn => {
                btn.onclick = () => {
                    const pl = data.find(p => p.name === btn.dataset.name);
                    document.getElementById('playlistNameInput').value = pl.name;
                    renderTrackSelection('', pl.tracks.map(id => String(id)));
                };
            });
        }
    } catch (e) { console.error("Errore fetchPlaylists:", e); }
}

// --- PLAYER CORE ---
function loadTrack(index, autoPlay = isPlaying) {
    if (currentPlaylist.length === 0) return;
    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[currentTrackIndex];

    audioPlayer.src = playerTools.getFinalAudioSrc(track.url);
    audioPlayer.load();

    document.getElementById('currentTrack').textContent = `${track.title} - ${track.artist}`;

    if (track.cover_url) {
        currentCoverUrl = playerTools.getFinalAudioSrc(track.cover_url);
    } else {
        // Fallback: try to guess standard cover
        currentCoverUrl = track.url.substring(0, track.url.lastIndexOf('/') + 1) + "cover.jpg";
    }

    if (autoPlay) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            document.getElementById('playPauseIcon')?.classList.replace('fa-play', 'fa-pause');
        }).catch(() => { });
    }
    renderUI();
}

function renderUI() {
    ui.updatePlaylistView(currentPlaylist, currentTrackIndex, isPlaying, {
        playlistEl: document.getElementById('playlist'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        shuffleBtn: document.getElementById('shuffleBtn')
    }, {
        onLoadTrack: (idx) => loadTrack(idx, true),
        onRemoveTrack: (idx) => { currentPlaylist.splice(idx, 1); renderUI(); },
        onAddToPlaylist: (id) => openTrackPlaylistModal(id),
        isShuffling: isShuffling
    });

    const countEl = document.getElementById('playlistCount');
    if (countEl) countEl.textContent = currentPlaylist.length;
}

// --- EVENTI CONTROLLI ---
safeSetClick('playPauseBtn', async () => {
    if (!audioEngine.audioContext) await audioEngine.initAudio(audioPlayer);
    if (audioPlayer.paused) { audioPlayer.play(); isPlaying = true; }
    else { audioPlayer.pause(); isPlaying = false; }
    renderUI();
});

safeSetClick('shuffleBtn', () => {
    isShuffling = !isShuffling;
    if (isShuffling) {
        for (let i = currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
        }
    } else {
        currentPlaylist = [...originalPlaylistOrder];
    }
    loadTrack(0, isPlaying);
});

safeSetClick('progressControl', (e) => {
    const rect = document.getElementById('progressControl').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    if (audioPlayer.duration) audioPlayer.currentTime = percent * audioPlayer.duration;
});

safeSetClick('nextBtn', () => loadTrack(currentTrackIndex + 1, true));
safeSetClick('prevBtn', () => loadTrack(currentTrackIndex - 1, true));

// --- EVENTI FILTRI & RICERCA (REFRESH ISTANTANEO) ---
safeSetInput('searchTrackInput', (e) => {
    const term = e.target.value.toLowerCase();
    currentPlaylist = fullLibrary.filter(t =>
        t.title.toLowerCase().includes(term) || t.artist.toLowerCase().includes(term)
    );
    renderUI();
});

safeSetChange('artistFilter', (e) => {
    const artist = e.target.value;
    currentPlaylist = artist ? fullLibrary.filter(t => t.artist === artist) : [...fullLibrary];
    originalPlaylistOrder = [...currentPlaylist];
    loadTrack(0, isPlaying);
});

safeSetChange('albumFilter', (e) => {
    const album = e.target.value;
    currentPlaylist = album ? fullLibrary.filter(t => t.album === album) : [...fullLibrary];
    originalPlaylistOrder = [...currentPlaylist];
    loadTrack(0, isPlaying);
});

safeSetChange('savedPlaylistSelector', async (e) => {
    if (e.target.value === "all") {
        currentPlaylist = [...fullLibrary];
    } else {
        const res = await fetch('/api/playlists/');
        const data = await res.json();
        const pl = data.find(p => p.name === e.target.value);
        currentPlaylist = pl.tracks.map(id => fullLibrary.find(t => String(t.id) === String(id))).filter(t => t);
    }
    originalPlaylistOrder = [...currentPlaylist];
    loadTrack(0, true);
});

// --- GESTIONE MODALI ---
safeSetClick('menuBtn', () => {
    document.getElementById('playlistModal').classList.remove('hidden');
    fetchPlaylists();
});

safeSetClick('closeModal', () => document.getElementById('playlistModal').classList.add('hidden'));

// --- FOLDER NAVIGATION ---
let currentFolder = '';

async function fetchDirectories(path) {
    try {
        const res = await fetch(`/api/directories/?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error("Errore caricamento cartelle");
        const data = await res.json();

        const display = document.getElementById('currentDirDisplay');
        if (display) display.textContent = data.current_path || "/";

        const dirList = document.getElementById('dirList');
        if (dirList) {
            dirList.innerHTML = data.directories.map(d => `
                <div class="dir-item cursor-pointer hover:bg-blue-50 p-1 rounded flex items-center text-xs text-gray-600" data-path="${d.path}">
                    <i class="fas fa-folder text-yellow-500 mr-2"></i>
                    <span class="truncate">${d.name}</span>
                </div>
            `).join('');

            dirList.querySelectorAll('.dir-item').forEach(el => {
                el.onclick = () => browseTo(el.dataset.path);
            });
        }
    } catch (e) {
        console.error("Errore fetchDirectories:", e);
    }
}

async function browseTo(path) {
    currentFolder = path;
    await fetchDirectories(path);
    await loadLibrary(path); // Ricarica la libreria filtrata per questa cartella
}

async function loadLibrary(folder = '') {
    try {
        const res = await fetch(`/api/tracks/?folder=${encodeURIComponent(folder)}`);
        fullLibrary = await res.json();
        currentPlaylist = [...fullLibrary];
        originalPlaylistOrder = [...fullLibrary]; // Reset order

        populateFilters();
        // Reset player state
        if (currentPlaylist.length > 0) {
            loadTrack(0, false); // Don't autoplay on folder change
            document.getElementById('currentTrack').textContent = "Pronto alla riproduzione";
        } else {
            document.getElementById('currentTrack').textContent = "Nessun brano trovato in questa cartella";
            document.getElementById('playlist').innerHTML = '<li class="text-center text-gray-400 text-xs p-2">Cartella vuota</li>';
        }
    } catch (err) { console.error("Errore loadLibrary:", err); }
}

safeSetClick('dirUpBtn', () => {
    if (!currentFolder) return;
    // Calcola il percorso genitore
    const parts = currentFolder.split('/');
    parts.pop();
    const parent = parts.join('/');
    browseTo(parent);
});

// --- INIT ---
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await browseTo(''); // Carica root all'avvio

        await fetchPlaylists();

        const animate = () => {
            if (ctx) vis.renderVisualizer(ctx, document.getElementById('visualizer'), document.getElementById('visualizerSelector').value, isPlaying, 0, audioEngine.analyser, currentCoverUrl);
            requestAnimationFrame(animate);
        };
        animate();
    } catch (err) { console.error("Errore inizializzazione:", err); }
});

function openTrackPlaylistModal(trackId) {
    trackTargetId = String(trackId);
    document.getElementById('trackPlaylistModal')?.classList.remove('hidden');
}

safeSetInput('volumeSlider', (e) => { audioPlayer.volume = e.target.value; });