// library.js - Gestione directory e fetch libreria

export let fullLibrary = [];
export let currentFolder = '';

export async function fetchLibraryTracks(folder = '', sourceFilter = '') {
    let url = `/api/tracks/?folder=${encodeURIComponent(folder)}`;
    if (sourceFilter && sourceFilter !== 'all') {
        url += `&source=${encodeURIComponent(sourceFilter)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Errore fetch libreria");
    fullLibrary = await res.json();
    return fullLibrary;
}

export async function fetchDirectories(path, sourceFilter = '') {
    const url = new URL(window.location.origin + '/api/directories/');
    url.searchParams.append('path', path);
    if (sourceFilter && sourceFilter !== 'all') {
        url.searchParams.append('source', sourceFilter);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Errore caricamento cartelle");
    return await res.json();
}

export function setFolder(folder) {
    currentFolder = folder;
}
