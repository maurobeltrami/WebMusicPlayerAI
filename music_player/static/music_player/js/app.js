import * as ui from './ui.js';
import * as vis from './visualizer.js';
import * as playerTools from './player.js';
import * as filterTools from './filters.js';
import * as audioEngine from './audio-engine.js';

// --- STATO GLOBALE ---
let fullLibrary = [];
let currentPlaylist = [];
let originalPlaylistOrder = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffling = false;
let trackTargetId = null;

// --- ELEMENTI DOM ---
const audioPlayer = document.getElementById('audioPlayer');
const canvas = document.getElementById('visualizer');
const ctx = canvas ? canvas.getContext('2d') : null;
const aiStatus = document.getElementById('aiStatus');
const playPauseIcon = document.getElementById('playPauseIcon');

// --- LOGICA PLAYLIST (.JSON) ---

function renderTrackSelection(filterText = '', selectedIds = []) {
    const container = document.getElementById('trackSelectionList');
    if (!container) return;
    const filtered = fullLibrary.filter(t =>
        t.title.toLowerCase().includes(filterText.toLowerCase()) ||
        t.artist.toLowerCase().includes(filterText.toLowerCase())
    );
    container.innerHTML = filtered.map(track => `
        <label class="flex items-center p-2 hover:bg-white rounded cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
            <input type="checkbox" class="track-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 mr-3" 
                   value="${track.id}" ${selectedIds.includes(track.id) ? 'checked' : ''}>
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
        const list = document.getElementById('savedPlaylistsList');

        // Render della lista nel Modal con distinzione tra Carica (ascolta) e Modifica
        list.innerHTML = data.map(pl => `
            <li class="flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-2">
                <div class="flex justify-between items-center">
                    <p class="text-sm font-bold text-gray-800">${pl.name}</p>
                    <button class="del-pl-btn text-gray-300 hover:text-red-500 p-1" data-name="${pl.name}">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
                <div class="flex space-x-2">
                    <button class="load-pl-btn bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold flex-1 hover:bg-blue-600 hover:text-white transition-colors" data-name="${pl.name}">
                        ASCOLTA
                    </button>
                    <button class="edit-pl-btn bg-gray-50 text-gray-600 px-2 py-1 rounded text-[10px] font-bold flex-1 hover:bg-orange-500 hover:text-white transition-colors" data-name="${pl.name}">
                        MODIFICA
                    </button>
                </div>
            </li>
        `).join('');

        const selector = document.getElementById('savedPlaylistSelector');
        selector.innerHTML = '<option value="all">Tutta la Libreria</option>';
        data.forEach(pl => {
            selector.add(new Option(`${pl.name} (${pl.tracks.length})`, pl.name));
        });

        // Eventi
        document.querySelectorAll('.load-pl-btn').forEach(btn => {
            btn.onclick = () => loadSavedPlaylist(data.find(p => p.name === btn.dataset.name));
        });
        document.querySelectorAll('.edit-pl-btn').forEach(btn => {
            btn.onclick = () => prepareEditPlaylist(data.find(p => p.name === btn.dataset.name));
        });
        document.querySelectorAll('.del-pl-btn').forEach(btn => {
            btn.onclick = () => deletePlaylist(btn.dataset.name);
        });
    } catch (err) { console.error(err); }
}

// Funzione per caricare i brani della playlist nel form di creazione senza chiudere il menu
function prepareEditPlaylist(plData) {
    if (!plData) return;
    document.getElementById('playlistNameInput').value = plData.name;
    renderTrackSelection('', plData.tracks);
    aiStatus.textContent = `Modifica: ${plData.name}`;
}

async function openTrackPlaylistModal(trackId) {
    trackTargetId = trackId;
    const modal = document.getElementById('trackPlaylistModal');
    const container = document.getElementById('trackPlaylistOptions');
    modal.classList.remove('hidden');
    container.innerHTML = '<p class="text-xs text-center">Caricamento...</p>';
    try {
        const res = await fetch('/api/playlists/');
        const playlists = await res.json();
        container.innerHTML = playlists.map(pl => `
            <label class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span class="text-sm font-medium text-gray-700">${pl.name}</span>
                <input type="checkbox" class="playlist-check w-5 h-5" data-plname="${pl.name}" ${pl.tracks.includes(trackId) ? 'checked' : ''}>
            </label>
        `).join('');
        document.querySelectorAll('.playlist-check').forEach(check => {
            check.onchange = (e) => toggleTrackInPlaylist(e.target);
        });
    } catch (err) { console.error(err); }
}

async function toggleTrackInPlaylist(checkbox) {
    const plName = checkbox.dataset.plname;
    const shouldAdd = checkbox.checked;
    try {
        const res = await fetch('/api/playlists/');
        const all = await res.json();
        const pl = all.find(p => p.name === plName);
        if (pl) {
            if (shouldAdd) { if (!pl.tracks.includes(trackTargetId)) pl.tracks.push(trackTargetId); }
            else { pl.tracks = pl.tracks.filter(id => id !== trackTargetId); }
            await fetch('/api/playlists/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                body: JSON.stringify(pl)
            });
            fetchPlaylists();
        }
    } catch (err) { console.error(err); }
}

function loadSavedPlaylist(plData) {
    if (!plData) return;
    currentPlaylist = plData.tracks
        .map(id => fullLibrary.find(t => t.id === id))
        .filter(t => t !== undefined);
    originalPlaylistOrder = [...currentPlaylist];
    isShuffling = false;
    currentTrackIndex = 0;
    loadTrack(0, true);
    document.getElementById('playlistModal').classList.add('hidden');
}

async function saveCurrentPlaylist() {
    const name = document.getElementById('playlistNameInput').value.trim();
    const selectedIds = Array.from(document.querySelectorAll('.track-checkbox:checked')).map(cb => cb.value);
    if (!name || selectedIds.length === 0) return alert("Inserisci nome e brani");
    try {
        await fetch('/api/playlists/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ name, tracks: selectedIds })
        });
        document.getElementById('playlistNameInput').value = '';
        fetchPlaylists();
        renderTrackSelection(); // Reset della lista checkbox
        aiStatus.textContent = "Salvataggio completato!";
    } catch (err) { console.error(err); }
}

async function deletePlaylist(name) {
    if (!confirm(`Eliminare "${name}"?`)) return;
    await fetch(`/api/playlists/?name=${name}`, { method: 'DELETE', headers: { 'X-CSRFToken': getCookie('csrftoken') } });
    fetchPlaylists();
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
    audioPlayer.src = playerTools.getFinalAudioSrc(track.url);
    audioPlayer.load();
    document.getElementById('currentTrack').textContent = `${track.title} - ${track.artist}`;
    if (autoPlay) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playPauseIcon.classList.replace('fa-play', 'fa-pause');
        }).catch(() => { });
    }
    renderUI();
}

async function togglePlayPause() {
    if (currentPlaylist.length === 0) return;
    if (!audioEngine.audioContext) {
        await audioEngine.initAudio(audioPlayer);
        audioEngine.updateCompressor('threshold', parseFloat(document.getElementById('thresholdSlider').value));
        audioEngine.updateCompressor('ratio', parseFloat(document.getElementById('ratioSlider').value));
        audioPlayer.volume = document.getElementById('volumeSlider').value;
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
            originalPlaylistOrder = originalPlaylistOrder.filter(t => currentPlaylist.includes(t));
            renderUI();
        },
        onAddToPlaylist: (trackId) => openTrackPlaylistModal(trackId),
        isShuffling: isShuffling
    });
    document.getElementById('playlistCount').textContent = currentPlaylist.length;
}

// --- EVENT LISTENERS ---

document.getElementById('volumeSlider').oninput = (e) => {
    audioPlayer.volume = e.target.value;
};

document.getElementById('shuffleBtn').onclick = () => {
    if (currentPlaylist.length < 2) return;
    isShuffling = !isShuffling;
    const currentTrack = currentPlaylist[currentTrackIndex];
    if (isShuffling) {
        currentPlaylist = [...currentPlaylist].sort(() => Math.random() - 0.5);
    } else {
        currentPlaylist = [...originalPlaylistOrder].filter(t => currentPlaylist.includes(t));
    }
    currentTrackIndex = currentPlaylist.indexOf(currentTrack);
    renderUI();
};

document.getElementById('thresholdSlider').oninput = (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('thresholdVal').textContent = val;
    if (audioEngine.audioContext) audioEngine.updateCompressor('threshold', val);
};
document.getElementById('ratioSlider').oninput = (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('ratioVal').textContent = val;
    if (audioEngine.audioContext) audioEngine.updateCompressor('ratio', val);
};

document.getElementById('playPauseBtn').onclick = togglePlayPause;
document.getElementById('nextBtn').onclick = () => loadTrack(currentTrackIndex + 1, true);
document.getElementById('prevBtn').onclick = () => loadTrack(currentTrackIndex - 1, true);
document.getElementById('menuBtn').onclick = () => {
    document.getElementById('playlistModal').classList.remove('hidden');
    fetchPlaylists();
    renderTrackSelection();
};
document.getElementById('closeModal').onclick = () => document.getElementById('playlistModal').classList.add('hidden');
document.getElementById('closeTrackModal').onclick = () => document.getElementById('trackPlaylistModal').classList.add('hidden');
document.getElementById('savePlaylistBtn').onclick = saveCurrentPlaylist;
document.getElementById('modalSearchInput').oninput = (e) => renderTrackSelection(e.target.value);

document.getElementById('savedPlaylistSelector').onchange = async (e) => {
    const plName = e.target.value;
    if (plName === 'all') {
        currentPlaylist = [...fullLibrary];
    } else {
        const res = await fetch('/api/playlists/');
        const data = await res.json();
        const pl = data.find(p => p.name === plName);
        if (pl) currentPlaylist = pl.tracks.map(id => fullLibrary.find(t => t.id === id)).filter(t => t);
    }
    originalPlaylistOrder = [...currentPlaylist];
    isShuffling = false;
    currentTrackIndex = 0;
    loadTrack(0, true);
};

document.getElementById('artistFilter').onchange = (e) => {
    currentPlaylist = filterTools.filterLibrary(fullLibrary, e.target.value, '', '');
    originalPlaylistOrder = [...currentPlaylist];
    isShuffling = false;
    loadTrack(0, false);
};

document.getElementById('albumFilter').onchange = (e) => {
    currentPlaylist = filterTools.filterLibrary(fullLibrary, '', e.target.value, '');
    originalPlaylistOrder = [...currentPlaylist];
    isShuffling = false;
    loadTrack(0, false);
};

document.getElementById('searchTrackInput').oninput = (e) => {
    currentPlaylist = filterTools.filterLibrary(fullLibrary, '', '', e.target.value);
    originalPlaylistOrder = [...currentPlaylist];
    isShuffling = false;
    renderUI();
};

document.getElementById('progressControl').onclick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = pos * audioPlayer.duration;
};

audioPlayer.ontimeupdate = () => {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progressBar').style.width = `${progress || 0}%`;
    document.getElementById('time-display').textContent = `${ui.formatTime(audioPlayer.currentTime)} / ${ui.formatTime(audioPlayer.duration)}`;
};

audioPlayer.onended = () => loadTrack(currentTrackIndex + 1, true);

let frame = 0;
function animate() {
    if (ctx && canvas) {
        const type = document.getElementById('visualizerSelector').value;
        vis.renderVisualizer(ctx, canvas, type, isPlaying, frame++, audioEngine.analyser);
    }
    requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/tracks/');
        fullLibrary = await response.json();
        currentPlaylist = [...fullLibrary];
        originalPlaylistOrder = [...fullLibrary];

        const artSel = document.getElementById('artistFilter');
        const albSel = document.getElementById('albumFilter');
        artSel.innerHTML = '<option value="">Tutti gli Artisti</option>';
        albSel.innerHTML = '<option value="">Tutti gli Album</option>';
        filterTools.getUniqueMetadata(fullLibrary, 'artist').forEach(a => artSel.add(new Option(a, a)));
        filterTools.getUniqueMetadata(fullLibrary, 'album').forEach(a => albSel.add(new Option(a, a)));

        await fetchPlaylists();
        loadTrack(0, false);
        animate();
        aiStatus.textContent = "MauroMusic Pronto";
    } catch (e) { aiStatus.textContent = "Errore Init"; }
});