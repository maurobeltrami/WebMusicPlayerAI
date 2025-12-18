// player.js - Gestione URL e Costanti Audio
export const DJANGO_BASE_HOST = 'http://127.0.0.1:8000/';
export const DJANGO_MEDIA_PREFIX = 'media/';
export const MAX_SAFE_VOLUME = 0.9;

/**
 * Pulisce l'URL del brano rimuovendo i prefissi API e concatenando host e media.
 */
export function getFinalAudioSrc(rawUrl) {
    if (!rawUrl) return '';

    // Logica di pulizia verificata
    let relativeUrl = rawUrl.replace(/^\/api\/music_stream\//, '')
        .replace(/^\/api\//, '')
        .replace(/^music_stream\//, '')
        .replace(/^\//, '');

    const encodedFilepath = encodeURIComponent(relativeUrl);
    return DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;
}