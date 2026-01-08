// visualizer.js

let coverImage = new Image();
let currentCoverUrl = "";

export function renderVisualizer(ctx, canvas, type, isPlaying, frame, analyser, coverUrl) {
    const W = canvas.width;
    const H = canvas.height;

    // 1. Pulisci sempre lo sfondo
    ctx.fillStyle = 'rgb(31, 41, 55)';
    ctx.fillRect(0, 0, W, H);

    // 2. Se non c'è musica o l'analyser è assente, mostra il nome e ferma tutto
    if (!isPlaying || !analyser) {
        drawStaticMessage(ctx, W, H, "MAURO MUSIC");
        return;
    }

    // 3. Prepara i dati audio (Sempre necessari per i prossimi passi)
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // 4. LOGICA DI DISEGNO
    if (type === 'cover') {
        // Gestione immagine
        if (coverUrl && coverUrl !== currentCoverUrl) {
            coverImage.src = coverUrl;
            currentCoverUrl = coverUrl;
        }

        const isImageOk = coverImage.complete && coverImage.naturalWidth > 0;

        if (isImageOk) {
            // DISEGNA COPERTINA
            const imgAspect = coverImage.naturalWidth / coverImage.naturalHeight;
            const canvasAspect = W / H;
            let drawW, drawH;

            if (imgAspect > canvasAspect) {
                drawW = W; drawH = W / imgAspect;
            } else {
                drawH = H; drawW = H * imgAspect;
            }

            const offsetX = (W - drawW) / 2;
            const offsetY = (H - drawH) / 2;

            ctx.drawImage(coverImage, offsetX, offsetY, drawW, drawH);

            // Onde bianche sopra la cover
            analyser.getByteTimeDomainData(dataArray);
            drawWaveform(ctx, dataArray, W, H, frame, true);
        } else {
            // FALLBACK: Se la cover non c'è, vai di onde psichedeliche
            analyser.getByteTimeDomainData(dataArray);
            drawWaveform(ctx, dataArray, W, H, frame, false);
        }
    }
    else if (type === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);
        drawWaveform(ctx, dataArray, W, H, frame, false);
    }
    else if (type === 'bars') {
        analyser.getByteFrequencyData(dataArray);
        drawBars(ctx, dataArray, W, H);
    }
    else if (type === 'circles') {
        analyser.getByteFrequencyData(dataArray);
        drawCircles(ctx, dataArray, W, H, frame);
    }
    else {
        // Se type è 'none'
        drawStaticMessage(ctx, W, H, "MAURO MUSIC");
    }
}

// --- FUNZIONI DI SUPPORTO ---

function drawStaticMessage(ctx, W, H, text) {
    ctx.font = "bold 16px Inter";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "center";
    ctx.fillText(text, W / 2, H / 2);
}

function drawWaveform(ctx, data, W, H, frame, onCover) {
    ctx.lineWidth = onCover ? 1.5 : 3;
    const hue = (frame * 2) % 360;

    ctx.strokeStyle = onCover ? "rgba(255, 255, 255, 0.7)" : `hsl(${hue}, 90%, 65%)`;
    if (!onCover) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
    }

    ctx.beginPath();
    let sliceWidth = W / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
        let v = data[i] / 128.0;
        let y = v * (H / 2);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawBars(ctx, data, W, H) {
    let barWidth = (W / data.length) * 2.5;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
        let barHeight = (data[i] / 255) * H;
        ctx.fillStyle = `hsl(${(i / data.length) * 360}, 80%, 60%)`;
        ctx.fillRect(x, H - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

function drawCircles(ctx, data, W, H, frame) {
    const centerX = W / 2, centerY = H / 2;
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
        const radius = (i / 12) * (Math.min(W, H) / 2.5) + (data[i * 10] / 255) * 50;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsl(${(i * 30 + frame) % 360}, 80%, 60%)`;
        ctx.stroke();
    }
}

export function updateFFT(analyser, type) {
    if (!analyser) return;
    analyser.fftSize = 2048;
}