import { safeSetClick, safeSetInput } from '../utils/helpers.js';
import * as lib from '../data/library.js';
import * as pl from '../data/playlist.js';
import * as selectionUI from '../ui/modalRenderer.js';
import * as selectionData from '../data/selection.js';
import { navigateTo } from '../ui/router.js';

// --- MODAL UTILS ---
export async function uiFetchPlaylists(loadTrackCallback) {
    try {
        const data = await pl.getSavedPlaylists();
        const selector = document.getElementById('savedPlaylistSelector');
        if (selector) {
            selector.innerHTML = '<option value="all">Tutta la Libreria</option>';
            data.forEach(p => selector.add(new Option(p.name, p.name)));
        }

        const list = document.getElementById('savedPlaylistsList');
        if (list) {
            list.innerHTML = data.map(p => `
                <li class="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm">
                    <span class="text-sm font-bold text-gray-700">${p.name}</span>
                    <div class="flex gap-2">
                        <button class="edit-pl-btn bg-yellow-500 text-white px-2 py-1 rounded text-[10px] font-bold" data-name="${p.name}">MODIFICA</button>
                        <button class="load-pl-btn bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold" data-name="${p.name}">PLAY</button>
                    </div>
                </li>
            `).join('');

            list.querySelectorAll('.load-pl-btn').forEach(btn => {
                btn.onclick = () => {
                    const savedPl = data.find(p => p.name === btn.dataset.name);
                    const tracks = savedPl.tracks.map(id => lib.fullLibrary.find(t => String(t.id) === String(id))).filter(t => t);
                    pl.setPlaylists(tracks);
                    loadTrackCallback(0, true);
                    navigateTo('view-home');
                    if (selector) selector.value = savedPl.name;
                };
            });

            list.querySelectorAll('.edit-pl-btn').forEach(btn => {
                btn.onclick = () => {
                    const savedPl = data.find(p => p.name === btn.dataset.name);
                    document.getElementById('playlistNameInput').value = savedPl.name;
                    const listEl = document.getElementById('trackSelectionList');
                    selectionUI.renderTrackSelection(listEl, lib.fullLibrary, '', savedPl.tracks.map(id => String(id)));
                };
            });
        }
    } catch (e) {
        console.error("Errore fetchPlaylists:", e);
    }
}

export async function openTrackPlaylistModal(trackId) {
    selectionData.setTrackTargetId(trackId);
    document.getElementById('trackPlaylistModal')?.classList.remove('hidden');
    
    const list = document.getElementById('trackPlaylistList');
    if (!list) return;
    list.innerHTML = '<p class="text-center text-gray-500">Caricamento...</p>';

    try {
        const playlists = await pl.getSavedPlaylists();
        if (playlists.length === 0) {
            list.innerHTML = '<p class="text-center text-gray-500 p-4">Nessuna playlist creata.</p>';
            return;
        }

        list.innerHTML = playlists.map(p => `
            <div class="playlist-add-item p-3 border-b hover:bg-gray-100 cursor-pointer flex justify-between items-center" data-name="${p.name}">
                <span class="font-bold">${p.name}</span>
                <span class="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-full">${p.tracks.length} brani</span>
            </div>
        `).join('');

        list.querySelectorAll('.playlist-add-item').forEach(item => {
            item.onclick = async () => {
                const savedPl = playlists.find(p => p.name === item.dataset.name);
                if (!savedPl.tracks.includes(selectionData.trackTargetId)) {
                    savedPl.tracks.push(selectionData.trackTargetId);
                    await pl.savePlaylistToServer(savedPl.name, savedPl.tracks);
                    alert(`Aggiunto a ${savedPl.name}!`);
                } else {
                    alert("Il brano è già presente nella playlist.");
                }
                document.getElementById('trackPlaylistModal').classList.add('hidden');
            };
        });
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p class="text-red-500 text-center">Errore caricamento.</p>';
    }
}

// --- SETUP CONFIGURATIONS ---
export function setupModals(loadTrackCallback) {
    safeSetClick('menuBtn', () => {
        navigateTo('view-playlists');
        uiFetchPlaylists(loadTrackCallback);
        selectionUI.renderTrackSelection(document.getElementById('trackSelectionList'), lib.fullLibrary, '', []);
    });

    safeSetClick('closeModal', () => {
        navigateTo('view-home');
        document.getElementById('playlistNameInput').value = '';
        selectionUI.renderTrackSelection(document.getElementById('trackSelectionList'), lib.fullLibrary, '', []);
    });

    safeSetInput('modalSearchInput', (e) => {
        const currentlySelected = Array.from(document.querySelectorAll('.track-checkbox:checked')).map(cb => cb.value);
        selectionUI.renderTrackSelection(document.getElementById('trackSelectionList'), lib.fullLibrary, e.target.value, currentlySelected);
    });

    safeSetClick('savePlaylistBtn', async () => {
        const nameInput = document.getElementById('playlistNameInput');
        const name = nameInput.value.trim();
        if (!name) return alert("Inserisci un nome per la playlist!");

        const selectedIds = Array.from(document.querySelectorAll('.track-checkbox:checked')).map(cb => cb.value);
        try {
            const res = await pl.savePlaylistToServer(name, selectedIds);
            if (res.ok) {
                alert("Playlist salvata!");
                uiFetchPlaylists(loadTrackCallback);
                nameInput.value = '';
            } else alert("Errore durante il salvataggio.");
        } catch (e) {
            console.error(e);
            alert("Errore di connessione.");
        }
    });

    safeSetClick('closeTrackModal', () => {
        document.getElementById('trackPlaylistModal')?.classList.add('hidden');
    });
}
