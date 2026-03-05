// audio-engine.js - Gestione Normalizzazione e Analizzatore
export let audioContext;
export let analyser;
export let compressor;

export async function initAudio(audioElement) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audioElement);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        compressor = audioContext.createDynamicsCompressor();

        // Impostazioni iniziali
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(30, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);

        source.connect(analyser);
        analyser.connect(compressor);
        compressor.connect(audioContext.destination);
    }

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    return { audioContext, analyser, compressor };
}

/**
 * Aggiorna i parametri del compressore in tempo reale
 */
export function updateCompressor(param, value) {
    if (!compressor || !audioContext) return;
    // Transizione fluida di 0.1 secondi per evitare "pop" nell'audio
    compressor[param].setTargetAtTime(value, audioContext.currentTime, 0.1);
}