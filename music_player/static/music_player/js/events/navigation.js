import { safeSetClick } from '../utils/helpers.js';
import * as lib from '../data/library.js';
import * as pl from '../data/playlist.js';

export function setupNavigation(browseToCallback) {
    safeSetClick('dirUpBtn', () => {
        if (!lib.currentFolder) return;
        const parts = lib.currentFolder.split('/');
        parts.pop();
        browseToCallback(parts.join('/'));
    });
}

// Extracting strictly folder rendering orchestration from original app.js
export async function browseTo(path, loadTrackCallback, populateFiltersCallback) {
    lib.setFolder(path);
    try {
        const data = await lib.fetchDirectories(path);
        const display = document.getElementById('currentDirDisplay');
        if (display) display.textContent = data.current_path || "/";

        const dirList = document.getElementById('dirList');
        if (dirList) {
            dirList.innerHTML = data.directories.map(d => `
                <div class="dir-item cursor-pointer bg-box-bg hover:bg-theme-accent hover:text-white p-3 mb-1 flex items-center text-sm font-primary text-theme-text border-b border-box-border-color touch-manipulation" data-path="${d.path}">
                    <i class="fas fa-folder text-yellow-500 mr-3 text-lg"></i>
                    <span class="truncate font-bold">${d.name}</span>
                </div>
            `).join('');

            dirList.querySelectorAll('.dir-item').forEach(el => {
                el.onclick = () => browseTo(el.dataset.path, loadTrackCallback, populateFiltersCallback);
            });
        }

        const library = await lib.fetchLibraryTracks(path);
        pl.setPlaylists(library);
        
        if (populateFiltersCallback) populateFiltersCallback();

        const trackDisplay = document.getElementById('currentTrack');
        const playlistUI = document.getElementById('playlist');
        
        if (pl.currentPlaylist.length > 0) {
            loadTrackCallback(0, false);
            if (trackDisplay) trackDisplay.textContent = "Pronto alla riproduzione";
        } else {
            if (trackDisplay) trackDisplay.textContent = "Nessun brano trovato in questa cartella";
            if (playlistUI) playlistUI.innerHTML = '<li class="text-center text-gray-400 text-xs p-2">Cartella vuota</li>';
        }
    } catch (e) {
        console.error("Errore fetch directories/library:", e);
    }
}
