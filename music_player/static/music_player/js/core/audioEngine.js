// audio-engine.js - Gestione Normalizzazione e Analizzatore
export let audioContext;
export let analyser;
export let compressor;

export let eqFilters = {};

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

        // Creazione filtri EQ
        eqFilters.bassBoost = audioContext.createBiquadFilter();
        eqFilters.bassBoost.type = 'lowshelf';
        eqFilters.bassBoost.frequency.value = 80;
        eqFilters.bassBoost.gain.value = 0;

        eqFilters.low = audioContext.createBiquadFilter();
        eqFilters.low.type = 'lowshelf';
        eqFilters.low.frequency.value = 60;
        eqFilters.low.gain.value = 0;

        eqFilters.mid = audioContext.createBiquadFilter();
        eqFilters.mid.type = 'peaking';
        eqFilters.mid.frequency.value = 1000;
        eqFilters.mid.Q.value = 1;
        eqFilters.mid.gain.value = 0;

        eqFilters.high = audioContext.createBiquadFilter();
        eqFilters.high.type = 'highshelf';
        eqFilters.high.frequency.value = 10000;
        eqFilters.high.gain.value = 0;

        // Routing Chain
        source.connect(analyser);
        analyser.connect(eqFilters.bassBoost);
        eqFilters.bassBoost.connect(eqFilters.low);
        eqFilters.low.connect(eqFilters.mid);
        eqFilters.mid.connect(eqFilters.high);
        eqFilters.high.connect(compressor);
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

/**
 * Aggiorna i guadagni dell'equalizzatore
 */
export function updateEQ(band, gainValue) {
    if (!eqFilters[band] || !audioContext) return;
    eqFilters[band].gain.setTargetAtTime(gainValue, audioContext.currentTime, 0.1);
}

export let isBassBoostActive = false;
export function toggleBassBoost() {
    isBassBoostActive = !isBassBoostActive;
    if (eqFilters.bassBoost && audioContext) {
        const targetGain = isBassBoostActive ? 15 : 0; // +15dB di spinta sui bassi
        eqFilters.bassBoost.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.1);
    }
    return isBassBoostActive;
}