// visualizer.js - Solo logica di rendering grafica

/**
 * Funzione principale di disegno. 
 * Riceve l'analyser direttamente da audio-engine.js
 */
export function draw(ctx, canvas, type, isPlaying, frame, analyser) {
    const W = canvas.width;
    const H = canvas.height;

    // Sfondo scuro costante
    ctx.fillStyle = 'rgb(31, 41, 55)';
    ctx.fillRect(0, 0, W, H);

    // Se il visualizzatore è spento o non c'è segnale audio
    if (type === 'none' || !analyser || !isPlaying) {
        ctx.font = "16px Inter";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.fillText("VISUALIZZATORE DISATTIVATO", W / 2, H / 2);
        return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Selezione del tipo di visualizzazione
    if (type === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);
        drawWaveform(ctx, dataArray, W, H, frame);
    } else {
        analyser.getByteFrequencyData(dataArray);
        if (type === 'bars') drawBars(ctx, dataArray, W, H);
        if (type === 'circles') drawCircles(ctx, dataArray, W, H, frame);
    }
}

/**
 * Aggiorna la precisione dell'analizzatore in base alla modalità
 */
export function updateFFT(analyser, type) {
    if (!analyser) return;
    analyser.fftSize = (type === 'waveform') ? 2048 : (type === 'circles' ? 512 : 256);
}

// --- FUNZIONI DI DISEGNO INTERNE ---

function drawWaveform(ctx, data, W, H, frame) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = `hsl(${(frame * 0.5) % 360}, 100%, 70%)`;
    ctx.beginPath();
    let sliceWidth = W / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
        let v = data[i] / 128.0;
        let y = v * H / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
}

function drawBars(ctx, data, W, H) {
    let barWidth = (W / data.length) * 2.5;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
        let barHeight = (data[i] / 255) * H;
        // Gradiente dal blu al viola
        ctx.fillStyle = `hsl(${(i / data.length) * 120 + 240}, 100%, 50%)`;
        ctx.fillRect(x, H - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

function drawCircles(ctx, data, W, H, frame) {
    const centerX = W / 2, centerY = H / 2;
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        const radius = (i / 10) * (Math.min(W, H) / 2) + (data[i * 5] / 255) * 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsl(${(i * 20 + frame) % 360}, 100%, 50%)`;
        ctx.stroke();
    }
}