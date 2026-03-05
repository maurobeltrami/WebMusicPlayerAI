// library.js - Gestione directory e fetch libreria

export let fullLibrary = [];
export let currentFolder = '';

export async function fetchLibraryTracks(folder = '') {
    const res = await fetch(`/api/tracks/?folder=${encodeURIComponent(folder)}`);
    if (!res.ok) throw new Error("Errore fetch libreria");
    fullLibrary = await res.json();
    return fullLibrary;
}

export async function fetchDirectories(path) {
    const res = await fetch(`/api/directories/?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error("Errore caricamento cartelle");
    return await res.json();
}

export function setFolder(folder) {
    currentFolder = folder;
}
