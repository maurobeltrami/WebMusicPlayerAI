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
if (audioPlayer) audioPlayer.crossOrigin = "anonymous";
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

// --- POPOLAMENTO FILTRI ---
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
                        <button class="del-pl-btn text-red-400 hover:text-red-600 px-1" data-name="${pl.name}"><i class="fas fa-trash"></i></button>
                    </div>
                </li>
            `).join('');

            document.querySelectorAll('.load-pl-btn').forEach(btn => {
                btn.onclick = () => {
                    const pl = data.find(p => p.name === btn.dataset.name);
                    // Forza il confronto ID come stringa per evitare fallimenti di mapping
                    currentPlaylist = pl.tracks.map(id => fullLibrary.find(t => String(t.id) === String(id))).filter(t => t);
                    originalPlaylistOrder = [...currentPlaylist];
                    loadTrack(0, true);
                    document.getElementById('playlistModal').classList.add('hidden');
                };
            });

            document.querySelectorAll('.edit-pl-btn').forEach(btn => {
                btn.onclick = () => {
                    const pl = data.find(p => p.name === btn.dataset.name);
                    document.getElementById('playlistNameInput').value = pl.name;
                    // Passiamo gli ID attuali per "spuntarli" nella lista globale
                    renderTrackSelection('', pl.tracks.map(id => String(id)));
                };
            });

            document.querySelectorAll('.del-pl-btn').forEach(btn => {
                btn.onclick = async () => {
                    if (confirm(`Eliminare ${btn.dataset.name}?`)) {
                        await fetch(`/api/playlists/?name=${btn.dataset.name}`, { method: 'DELETE', headers: { 'X-CSRFToken': getCookie('csrftoken') } });
                        fetchPlaylists();
                    }
                };
            });
        }
    } catch (e) { console.error("Errore fetchPlaylists:", e); }
}

// --- GESTIONE TASTO + (MODALE RAPIDA) ---
function openTrackPlaylistModal(trackId) {
    trackTargetId = String(trackId);
    document.getElementById('trackPlaylistModal')?.classList.remove('hidden');
    fetchPlaylistsForQuickAdd();
}

async function fetchPlaylistsForQuickAdd() {
    const list = document.getElementById('trackPlaylistList');
    if (!list) return;

    try {
        const res = await fetch('/api/playlists/');
        const data = await res.json();
        list.innerHTML = '';

        data.forEach(pl => {
            const isIncluded = pl.tracks.some(id => String(id) === trackTargetId);

            const btn = document.createElement('button');
            btn.className = `w-full text-left p-4 border-b transition-all flex justify-between items-center ${isIncluded ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-600'
                }`;

            btn.innerHTML = `
                <div class="flex items-center pointer-events-none">
                    <i class="${isIncluded ? 'fas fa-check-circle text-blue-500' : 'far fa-circle text-gray-300'} mr-3 fa-lg"></i>
                    <span class="font-bold">${pl.name}</span>
                </div>
                <span class="text-[10px] opacity-40 pointer-events-none font-bold italic">${pl.tracks.length} BRANI</span>
            `;

            btn.onclick = async (e) => {
                e.preventDefault();
                let newTracks;
                if (isIncluded) {
                    newTracks = pl.tracks.filter(id => String(id) !== trackTargetId);
                } else {
                    newTracks = [...new Set([...pl.tracks, trackTargetId])];
                }

                await fetch('/api/playlists/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ name: pl.name, tracks: newTracks })
                });

                document.getElementById('trackPlaylistModal').classList.add('hidden');
                aiStatus.textContent = isIncluded ? "Rimosso!" : "Aggiunto!";
                fetchPlaylists();
            };
            list.appendChild(btn);
        });
    } catch (e) { console.error(e); }
}

function renderTrackSelection(filterText = '', selectedIds = []) {
    const container = document.getElementById('trackSelectionList');
    if (!container) return;

    // Assicuriamoci che selectedIds siano stringhe per il confronto
    const selectedSet = new Set(selectedIds.map(id => String(id)));

    const filtered = fullLibrary.filter(t =>
        t.title.toLowerCase().includes(filterText.toLowerCase()) ||
        t.artist.toLowerCase().includes(filterText.toLowerCase())
    );

    container.innerHTML = filtered.map(track => `
        <label class="flex items-center p-2 border-b text-xs cursor-pointer hover:bg-gray-100 transition-colors">
            <input type="checkbox" class="track-checkbox mr-2" value="${track.id}" ${selectedSet.has(String(track.id)) ? 'checked' : ''}>
            <div class="truncate">
                <span class="font-bold">${track.title}</span><br>
                <span class="text-gray-400 text-[9px] uppercase">${track.artist}</span>
            </div>
        </label>
    `).join('');
}

// --- PLAYER CORE ---
function loadTrack(index, autoPlay = isPlaying) {
    if (currentPlaylist.length === 0) return;
    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[currentTrackIndex];
    audioPlayer.src = playerTools.getFinalAudioSrc(track.url);
    audioPlayer.load();
    document.getElementById('currentTrack').textContent = `${track.title} - ${track.artist}`;
    currentCoverUrl = track.url.substring(0, track.url.lastIndexOf('/') + 1) + "cover.jpg";
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
    document.getElementById('playlistCount').textContent = currentPlaylist.length;
}

// --- EVENTI ---
safeSetClick('playPauseBtn', async () => {
    if (!audioEngine.audioContext) await audioEngine.initAudio(audioPlayer);
    if (audioPlayer.paused) { audioPlayer.play(); isPlaying = true; }
    else { audioPlayer.pause(); isPlaying = false; }
    renderUI();
});

safeSetClick('shuffleBtn', () => {
    isShuffling = !isShuffling;
    if (isShuffling) {
        currentPlaylist = [...currentPlaylist].sort(() => Math.random() - 0.5);
    } else {
        currentPlaylist = [...originalPlaylistOrder];
    }
    currentTrackIndex = 0;
    loadTrack(0, isPlaying);
});

safeSetClick('nextBtn', () => loadTrack(currentTrackIndex + 1, true));
safeSetClick('prevBtn', () => loadTrack(currentTrackIndex - 1, true));
safeSetClick('menuBtn', () => {
    document.getElementById('playlistModal').classList.remove('hidden');
    fetchPlaylists();
    renderTrackSelection();
});
safeSetClick('closeModal', () => document.getElementById('playlistModal').classList.add('hidden'));
safeSetClick('closeTrackModal', () => document.getElementById('trackPlaylistModal').classList.add('hidden'));

safeSetClick('savePlaylistBtn', async () => {
    const name = document.getElementById('playlistNameInput').value.trim();
    const ids = Array.from(document.querySelectorAll('.track-checkbox:checked')).map(cb => cb.value);
    if (!name || ids.length === 0) return alert("Inserisci un nome e seleziona almeno un brano");

    await fetch('/api/playlists/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({ name, tracks: ids })
    });

    document.getElementById('playlistNameInput').value = "";
    fetchPlaylists();
    aiStatus.textContent = "Playlist Aggiornata!";
});

// Ricerca dinamica nella modale di creazione/modifica
safeSetInput('modalSearchInput', (e) => {
    const term = e.target.value;
    const currentSelected = Array.from(document.querySelectorAll('.track-checkbox:checked')).map(cb => cb.value);
    renderTrackSelection(term, currentSelected);
});

safeSetInput('searchTrackInput', (e) => {
    const term = e.target.value.toLowerCase();
    currentPlaylist = fullLibrary.filter(t => t.title.toLowerCase().includes(term) || t.artist.toLowerCase().includes(term));
    renderUI();
});

safeSetChange('artistFilter', (e) => {
    currentPlaylist = e.target.value ? fullLibrary.filter(t => t.artist === e.target.value) : [...fullLibrary];
    renderUI();
});

safeSetChange('albumFilter', (e) => {
    currentPlaylist = e.target.value ? fullLibrary.filter(t => t.album === e.target.value) : [...fullLibrary];
    renderUI();
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

safeSetInput('volumeSlider', (e) => { audioPlayer.volume = e.target.value; });

// --- INIT ---
window.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/api/tracks/');
    fullLibrary = await res.json();
    currentPlaylist = [...fullLibrary];
    originalPlaylistOrder = [...fullLibrary];
    populateFilters();
    await fetchPlaylists();
    loadTrack(0, false);
    let frame = 0;
    const animate = () => {
        if (ctx) vis.renderVisualizer(ctx, document.getElementById('visualizer'), document.getElementById('visualizerSelector').value, isPlaying, frame++, audioEngine.analyser, currentCoverUrl);
        requestAnimationFrame(animate);
    };
    animate();
});