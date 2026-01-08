// filters.js - Gestione della libreria e manipolazione array

/**
 * Filtra la libreria in base ad artista, album e termine di ricerca.
 */
export function filterLibrary(library, artist, album, search) {
    const searchTerm = search.toLowerCase().trim();
    return library.filter(track => {
        // Usiamo stringa vuota per indicare "Nessun filtro" (Tutti)
        const matchArtist = artist === "" || track.artist === artist;
        const matchAlbum = album === "" || track.album === album;

        const matchSearch = track.title.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm) ||
            track.album.toLowerCase().includes(searchTerm);

        return matchArtist && matchAlbum && matchSearch;
    });
}

/**
 * Esegue lo shuffle integrale (Fisher-Yates) su un array.
 */
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Ottiene i valori unici per i filtri (Artisti e Album).
 */
export function getUniqueMetadata(tracks, key) {
    return [...new Set(tracks.map(t => t[key]))].sort();
}