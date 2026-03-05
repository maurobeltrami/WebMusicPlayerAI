// playlist.js - Gestione della coda di riproduzione e shuffle
export let currentPlaylist = [];
export let originalPlaylistOrder = [];
export let currentTrackIndex = 0;
export let isPlaying = false;
export let isShuffling = false;
export let currentCoverUrl = null;

export function setPlaylists(tracks) {
    currentPlaylist = [...tracks];
    originalPlaylistOrder = [...tracks];
}

export function updatePlaylistFromFilter(tracks) {
    currentPlaylist = [...tracks];
}

// Fisher-Yates shuffle with Web Crypto API
function getSecureRandomDouble() {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
}

export function toggleShuffle() {
    isShuffling = !isShuffling;
    if (isShuffling) {
        for (let i = currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(getSecureRandomDouble() * (i + 1));
            [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]];
        }
    } else {
        currentPlaylist = [...originalPlaylistOrder];
    }
    return isShuffling;
}

export function getNextTrackIndex() {
    if (currentPlaylist.length === 0) return 0;
    return (currentTrackIndex + 1) % currentPlaylist.length;
}

export function getPrevTrackIndex() {
    if (currentPlaylist.length === 0) return 0;
    return (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
}

export function removeTrack(index) {
    currentPlaylist.splice(index, 1);
}

export function setCurrentTrackIndex(index) {
    if (currentPlaylist.length === 0) return;
    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
}

export function getCurrentTrack() {
    if (currentPlaylist.length === 0) return null;
    return currentPlaylist[currentTrackIndex];
}

export function setPlaying(playing) {
    isPlaying = playing;
}

export function setCoverUrl(url) {
    currentCoverUrl = url;
}

// Backend Playlists Fetch
export async function getSavedPlaylists() {
    const res = await fetch('/api/playlists/');
    if (!res.ok) throw new Error("Errore fetch playlists");
    return await res.json();
}

export async function savePlaylistToServer(name, selectedIds) {
    return await fetch('/api/playlists/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, tracks: selectedIds })
    });
}
