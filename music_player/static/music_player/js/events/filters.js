import { safeSetInput, safeSetChange } from '../utils/helpers.js';
import * as lib from '../data/library.js';
import * as pl from '../data/playlist.js';

export function setupFilters(loadTrackCallback, renderUICallback) {
    safeSetInput('searchTrackInput', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = lib.fullLibrary.filter(t => 
            t.title.toLowerCase().includes(term) || 
            t.artist.toLowerCase().includes(term)
        );
        pl.updatePlaylistFromFilter(filtered);
        if (renderUICallback) renderUICallback();
    });

    safeSetChange('sourceFilter', (e) => {
        const filtered = e.target.value 
            ? lib.fullLibrary.filter(t => t.source === e.target.value) 
            : [...lib.fullLibrary];
        pl.setPlaylists(filtered);
        loadTrackCallback(0, pl.isPlaying);
    });

    safeSetChange('artistFilter', (e) => {
        const filtered = e.target.value 
            ? lib.fullLibrary.filter(t => t.artist === e.target.value) 
            : [...lib.fullLibrary];
        pl.setPlaylists(filtered);
        loadTrackCallback(0, pl.isPlaying);
    });

    safeSetChange('albumFilter', (e) => {
        const filtered = e.target.value 
            ? lib.fullLibrary.filter(t => t.album === e.target.value) 
            : [...lib.fullLibrary];
        pl.setPlaylists(filtered);
        loadTrackCallback(0, pl.isPlaying);
    });

    safeSetChange('savedPlaylistSelector', async (e) => {
        if (e.target.value === "all") {
            pl.setPlaylists(lib.fullLibrary);
        } else {
            const data = await pl.getSavedPlaylists();
            const savedPl = data.find(p => p.name === e.target.value);
            if (savedPl) {
                const tracks = savedPl.tracks.map(id => 
                    lib.fullLibrary.find(t => String(t.id) === String(id))
                ).filter(t => t);
                pl.setPlaylists(tracks);
            }
        }
        loadTrackCallback(0, true);
    });
}
