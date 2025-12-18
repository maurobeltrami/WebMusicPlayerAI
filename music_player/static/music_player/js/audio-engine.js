// audio-engine.js
export let audioContext;
export let analyser;

export async function initAudio(audioElement) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audioElement);

        analyser = audioContext.createAnalyser();
        const compressor = audioContext.createDynamicsCompressor();

        // Impostazioni normalizzazione
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);

        // Catena: Source -> Analyser -> Compressor -> Destination
        source.connect(analyser);
        analyser.connect(compressor);
        compressor.connect(audioContext.destination);
    }
    return { audioContext, analyser };
}