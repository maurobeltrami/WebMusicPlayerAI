import * as audioEngine from '../core/audioEngine.js';
import * as vis from '../ui/visualizer.js';
import * as pl from '../data/playlist.js';
import * as mediaLoader from '../core/mediaLoader.js';
import * as uiRenderer from '../ui/playlistRenderer.js?v=8';
import { setupRouter } from '../ui/router.js';
import { initTheme } from '../ui/themeManager.js';

import { setupAudioEvents } from '../events/audio.js';
import { setupPlaybackControls } from '../events/playback.js';
import { setupFilters } from '../events/filters.js';
import { setupNavigation, browseTo } from '../events/navigation.js?v=2';
import { setupModals, uiFetchPlaylists, openTrackPlaylistModal } from '../events/modals.js';
import { setupEqualizer } from '../events/equalizer.js';

export async function initApp() {
    try {
        // Inizializza il tema come primissima cosa per evitare flash
        initTheme();

        const audioPlayer = document.getElementById('audioPlayer');
        const ctx = document.getElementById('visualizer')?.getContext('2d');

        // Define a centralized render UI callback to pass to event handlers
        const renderUICallback = () => {
            uiRenderer.updatePlaylistView(pl.currentPlaylist, pl.currentTrackIndex, pl.isPlaying, {
                playlistEl: document.getElementById('playlist'),
                nextBtn: document.getElementById('nextBtn'),
                prevBtn: document.getElementById('prevBtn'),
                shuffleBtn: document.getElementById('shuffleBtn')
            }, {
                onLoadTrack: (idx) => loadTrackCallback(idx, true),
                onRemoveTrack: (idx) => { pl.removeTrack(idx); renderUICallback(); },
                onAddToPlaylist: (id) => openTrackPlaylistModal(id),
                isShuffling: pl.isShuffling
            });
            const countEl = document.getElementById('playlistCount');
            if (countEl) countEl.textContent = pl.currentPlaylist.length;
        };

        const loadTrackCallback = (index, autoPlay) => {
            mediaLoader.loadTrack(audioPlayer, index, autoPlay, renderUICallback);
        };

        const loadNextTrackCallback = () => {
            loadTrackCallback(pl.getNextTrackIndex(), true);
        };

        const populateFiltersCallback = () => {
            const artSel = document.getElementById('artistFilter');
            const albSel = document.getElementById('albumFilter');
            
            // Wait for library from setupNavigation, assume lib has fullLibrary ready 
            // Better to pull from lib.js module dynamically inside filter init
            // For now, let setupFilters or browseTo handle it directly, 
            // since we exported fullLibrary as let in lib.js, we can just let `events/filters.js` do it,
            // or we'll trigger `populateFilters` inside `app.js` equivalents.
            import('../data/library.js').then(lib => {
                if (artSel) {
                    artSel.innerHTML = '<option value="">Tutti gli Artisti</option>';
                    [...new Set(lib.fullLibrary.map(t => t.artist))].filter(Boolean).sort().forEach(a => artSel.add(new Option(a, a)));
                }
                if (albSel) {
                    albSel.innerHTML = '<option value="">Tutti gli Album</option>';
                    [...new Set(lib.fullLibrary.map(t => t.album))].filter(Boolean).sort().forEach(a => albSel.add(new Option(a, a)));
                }
            });
        };

        // Wire Events
        setupAudioEvents(audioPlayer, loadNextTrackCallback);
        setupPlaybackControls(audioPlayer, loadTrackCallback, renderUICallback);
        setupFilters(loadTrackCallback, renderUICallback);
        setupModals(loadTrackCallback);
        setupEqualizer();

        const boundBrowseTo = (path) => browseTo(path, loadTrackCallback, populateFiltersCallback);
        setupNavigation(boundBrowseTo);
        setupRouter();

        // Initial Boot sequence
        await boundBrowseTo('');
        await uiFetchPlaylists(loadTrackCallback);

        // Visualizer Loop
        const animate = () => {
            if (ctx) {
                const selectorValue = document.getElementById('visualizerSelector')?.value || 'cover';
                vis.renderVisualizer(ctx, document.getElementById('visualizer'), selectorValue, pl.isPlaying, 0, audioEngine.analyser, pl.currentCoverUrl);
            }
            requestAnimationFrame(animate);
        };
        animate();

    } catch (err) {
        console.error("Errore inizializzazione applicazione root:", err);
    }
}
