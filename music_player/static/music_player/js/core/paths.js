// player.js - Gestione URL e Costanti Audio
export const DJANGO_BASE_HOST = '/';
export const DJANGO_MEDIA_PREFIX = 'music_stream/';
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

    const encodedFilepath = relativeUrl.split('/').map(encodeURIComponent).join('/');
    return DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;
}