// visualizer.js
let coverImage = new Image();
let lastUrl = "";

export function renderVisualizer(ctx, canvas, type, isPlaying, frame, analyser, coverUrl) {
    // FIX MOBILE: Ridimensiona il canvas se necessario
    if (canvas.width !== canvas.clientWidth) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = 'rgb(31, 41, 55)';
    ctx.fillRect(0, 0, W, H);

    if (!isPlaying || !analyser) {
        ctx.font = "bold 16px Inter";
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.textAlign = "center";
        ctx.fillText("MAURO MUSIC", W / 2, H / 2);
        return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    if (type === 'cover') {
        if (coverUrl && coverUrl !== lastUrl) {
            coverImage.src = coverUrl;
            lastUrl = coverUrl;
        }

        const isOk = coverImage.complete && coverImage.naturalWidth > 0;
        if (isOk) {
            const aspect = coverImage.naturalWidth / coverImage.naturalHeight;
            let dw = W, dh = W / aspect;
            if (dh > H) { dh = H; dw = H * aspect; }
            ctx.drawImage(coverImage, (W - dw) / 2, (H - dh) / 2, dw, dh);

            analyser.getByteTimeDomainData(dataArray);
            drawWave(ctx, dataArray, W, H, frame, true);
        } else {
            // Se non c'è immagine, onde colorate!
            analyser.getByteTimeDomainData(dataArray);
            drawWave(ctx, dataArray, W, H, frame, false);
        }
    } else if (type === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);
        drawWave(ctx, dataArray, W, H, frame, false);
    } else if (type === 'bars') {
        analyser.getByteFrequencyData(dataArray);
        drawBars(ctx, dataArray, W, H);
    } else if (type === 'circles') {
        analyser.getByteFrequencyData(dataArray);
        drawCircles(ctx, dataArray, W, H, frame);
    }
}

function drawWave(ctx, data, W, H, frame, onCover) {
    ctx.lineWidth = onCover ? 1.5 : 3;
    const hue = (frame * 2) % 360;
    ctx.strokeStyle = onCover ? "rgba(255,255,255,0.7)" : `hsl(${hue}, 90%, 65%)`;
    if (!onCover) { ctx.shadowBlur = 15; ctx.shadowColor = `hsl(${hue}, 90%, 65%)`; }

    ctx.beginPath();
    let sliceWidth = W / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
        let y = (data[i] / 128.0) * (H / 2);
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
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
        const radius = (i / 12) * (Math.min(W, H) / 2.5) + (data[i * 10] / 255) * 50;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsl(${(i * 30 + frame) % 360}, 80%, 60%)`;
        ctx.stroke();
    }
}