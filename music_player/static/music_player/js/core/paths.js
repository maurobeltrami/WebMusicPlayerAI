// paths.js - Gestione URL e Costanti Audio
export const DJANGO_BASE_HOST = '/';
export const DJANGO_MEDIA_PREFIX = 'music_stream/';
export const MAX_SAFE_VOLUME = 0.9;

/**
 * Pulisce l'URL del brano rimuovendo i prefissi API e concatenando host e l'endpoint corretto.
 */
export function getFinalAudioSrc(rawUrl) {
    if (!rawUrl) return '';

    // Se l'URL (che arriva dal backend) inizia già con gdrive_stream, 
    // lo manteniamo preservando il parametro, altrimenti usiamo il music_stream standard.
    
    let isGdrive = rawUrl.indexOf('gdrive_stream/') >= 0;
    
    let relativeUrl = rawUrl.replace(/^\/api\/music_stream\//, '')
        .replace(/^\/api\/gdrive_stream\//, '')
        .replace(/^\/api\//, '')
        .replace(/^music_stream\//, '')
        .replace(/^gdrive_stream\//, '')
        .replace(/^\//, '');

    const encodedFilepath = relativeUrl.split('/').map(encodeURIComponent).join('/');
    
    const prefix = isGdrive ? 'gdrive_stream/' : DJANGO_MEDIA_PREFIX;
    return DJANGO_BASE_HOST + prefix + encodedFilepath;
}