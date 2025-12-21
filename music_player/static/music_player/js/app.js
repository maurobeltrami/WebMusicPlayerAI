import * as ui from './ui.js';
import * as vis from './visualizer.js';
import * as playerTools from './player.js';
import * as filterTools from './filters.js';
import * as audioEngine from './audio-engine.js';

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

// --- LOGICA PLAYLIST PERMANENTE (.JSON) ---

function renderTrackSelection(filterText = '') {
    const container = document.getElementById('trackSelectionList');
    if (!container) return;

    const filtered = fullLibrary.filter(t =>
        t.title.toLowerCase().includes(filterText.toLowerCase()) ||
        t.artist.toLowerCase().includes(filterText.toLowerCase())
    );

    container.innerHTML = filtered.map(track => `
        <label class="flex items-center p-2 hover:bg-white rounded cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
            <input type="checkbox" class="track-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 mr-3" value="${track.id}">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 truncate leading-tight">${track.title}</p>
                <p class="text-[10px] text-gray-500 truncate uppercase tracking-wider">${track.artist}</p>
            </div>
        </label>
    `).join('');
}

async function fetchPlaylists() {
    try {
        const res = await fetch('/api/playlists/');
        const data = await res.json();

        // 1. Popola il Modal
        const list = document.getElementById('savedPlaylistsList');
        list.innerHTML = data.map(pl => `
            <li class="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <button class="load-pl-btn text-left flex-1" data-name="${pl.name}">
                    <p class="text-sm font-bold text-gray-800">${pl.name}</p>
                    <p class="text-[10px] text-blue-500 font-bold tracking-widest uppercase">${pl.tracks.length} brani</p>
                </button>
                <button class="del-pl-btn text-gray-300 hover:text-red-500 transition-colors p-2" data-name="${pl.name}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </li>
        `).join('');

        // 2. Popola il Selettore in Sidebar
        const selector = document.getElementById('savedPlaylistSelector');
        selector.innerHTML = '<option value="all">Tutta la Libreria</option>';
        data.forEach(pl => {
            const opt = new Option(`${pl.name} (${pl.tracks.length})`, pl.name);
            selector.add(opt);
        });

        // Eventi per i pulsanti del modal
        document.querySelectorAll('.load-pl-btn').forEach(btn => {
            btn.onclick = () => loadSavedPlaylist(data.find(p => p.name === btn.dataset.name));
        });
        document.querySelectorAll('.del-pl-btn').forEach(btn => {
            btn.onclick = () => deletePlaylist(btn.dataset.name);
        });
    } catch (err) {
        console.error("Errore fetch playlists:", err);
    }
}

function loadSavedPlaylist(plData) {
    if (!plData) return;
    currentPlaylist = plData.tracks
        .map(id => fullLibrary.find(t => t.id === id))
        .filter(t => t !== undefined);

    currentTrackIndex = 0;
    loadTrack(0, true);
    document.getElementById('playlistModal').classList.add('hidden');
    aiStatus.textContent = `Playlist: ${plData.name}`;
}

async function saveCurrentPlaylist() {
    const nameInput = document.getElementById('playlistNameInput');
    const name = nameInput.value.trim();
    const selectedIds = Array.from(document.querySelectorAll('.track-checkbox:checked')).map(cb => cb.value);

    if (!name || selectedIds.length === 0) {
        alert("Inserisci un nome e seleziona i brani!");
        return;
    }

    const data = { name: name, tracks: selectedIds };

    try {
        const res = await fetch('/api/playlists/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            nameInput.value = '';
            document.getElementById('modalSearchInput').value = '';
            await fetchPlaylists();
            renderTrackSelection();
            aiStatus.textContent = "Playlist salvata!";
        }
    } catch (err) {
        console.error("Errore salvataggio:", err);
    }
}

async function deletePlaylist(name) {
    if (!confirm(`Eliminare "${name}"?`)) return;
    try {
        await fetch(`/api/playlists/?name=${name}`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });
        await fetchPlaylists();
    } catch (err) {
        console.error("Errore cancellazione:", err);
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// --- CORE PLAYER ---

function loadTrack(index, autoPlay = isPlaying) {
    if (currentPlaylist.length === 0) return;
    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[currentTrackIndex];
    const finalSrc = playerTools.getFinalAudioSrc(track.url);

    if (audioPlayer.src !== finalSrc) {
        audioPlayer.src = finalSrc;
        audioPlayer.load();
    }

    document.getElementById('currentTrack').textContent = `${track.title} - ${track.artist}`;

    if (autoPlay) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playPauseIcon.classList.replace('fa-play', 'fa-pause');
        }).catch(e => { console.warn("Interazione richiesta"); });
    }
    renderUI();
}

async function togglePlayPause() {
    if (currentPlaylist.length === 0) return;
    if (!audioEngine.audioContext) await audioEngine.initAudio(audioPlayer);

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
    if (countEl) countEl.textContent = `${currentPlaylist.length}`;
}

// --- EVENT LISTENERS ---

// Cambio playlist dal selettore sidebar
document.getElementById('savedPlaylistSelector').addEventListener('change', async (e) => {
    const plName = e.target.value;
    if (plName === 'all') {
        currentPlaylist = [...fullLibrary];
        aiStatus.textContent = "Libreria completa";
    } else {
        const res = await fetch('/api/playlists/');
        const data = await res.json();
        const pl = data.find(p => p.name === plName);
        if (pl) {
            currentPlaylist = pl.tracks
                .map(id => fullLibrary.find(t => t.id === id))
                .filter(t => t !== undefined);
            aiStatus.textContent = `Playlist: ${pl.name}`;
        }
    }
    currentTrackIndex = 0;
    loadTrack(0, true);
});

document.getElementById('menuBtn').onclick = () => {
    document.getElementById('playlistModal').classList.remove('hidden');
    fetchPlaylists();
    renderTrackSelection();
};

document.getElementById('closeModal').onclick = () => {
    document.getElementById('playlistModal').classList.add('hidden');
};

document.getElementById('savePlaylistBtn').onclick = saveCurrentPlaylist;
document.getElementById('playPauseBtn').onclick = togglePlayPause;
document.getElementById('nextBtn').onclick = () => loadTrack(currentTrackIndex + 1, true);
document.getElementById('prevBtn').onclick = () => loadTrack(currentTrackIndex - 1, true);

document.getElementById('modalSearchInput').oninput = (e) => renderTrackSelection(e.target.value);

document.getElementById('thresholdSlider').oninput = (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('thresholdVal').textContent = val;
    audioEngine.updateCompressor('threshold', val);
};

document.getElementById('ratioSlider').oninput = (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('ratioVal').textContent = val;
    audioEngine.updateCompressor('ratio', val);
};

document.getElementById('artistFilter').addEventListener('change', (e) => {
    const artist = e.target.value;
    currentPlaylist = filterTools.filterLibrary(fullLibrary, artist, '', '');
    loadTrack(0, false);
});

document.getElementById('searchTrackInput').addEventListener('input', (e) => {
    const search = e.target.value;
    currentPlaylist = filterTools.filterLibrary(fullLibrary, '', '', search);
    renderUI();
});

audioPlayer.ontimeupdate = () => {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    const pBar = document.getElementById('progressBar');
    if (pBar) pBar.style.width = `${progress || 0}%`;
    const tDisp = document.getElementById('time-display');
    if (tDisp) tDisp.textContent = `${ui.formatTime(audioPlayer.currentTime)} / ${ui.formatTime(audioPlayer.duration)}`;
};

audioPlayer.onended = () => loadTrack(currentTrackIndex + 1, true);

// --- ANIMAZIONE E INIT ---

let frame = 0;
function animate() {
    if (ctx && canvas) {
        const type = document.getElementById('visualizerSelector').value;
        vis.renderVisualizer(ctx, canvas, type, isPlaying, frame++, audioEngine.analyser);
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

        await fetchPlaylists();
        loadTrack(0, false);
        animate();
        aiStatus.textContent = "MauroMusic Pronto";
    } catch (e) {
        aiStatus.textContent = "Errore Init";
    }
});