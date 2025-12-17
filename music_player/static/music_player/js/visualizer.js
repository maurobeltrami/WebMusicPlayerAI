// visualizer.js - Web Audio API e Canvas
export let audioContext = null;
export let analyser = null;
export let source = null;

export async function setupVisualizer(audioPlayer, canvas, type) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.smoothingTimeConstant = 0.8;
        source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    }
    updateFFT(type);
}

export function updateFFT(type) {
    if (!analyser) return;
    analyser.fftSize = (type === 'waveform') ? 2048 : (type === 'circles' ? 512 : 256);
}

export function draw(ctx, canvas, type, isPlaying, frame) {
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = 'rgb(31, 41, 55)';
    ctx.fillRect(0, 0, W, H);

    if (type === 'none' || !analyser) {
        ctx.font = "16px Inter"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textAlign = "center";
        ctx.fillText("VISUALIZZATORE DISATTIVATO", W / 2, H / 2);
        return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    if (type === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);
        drawWaveform(ctx, dataArray, W, H, frame);
    } else {
        analyser.getByteFrequencyData(dataArray);
        if (type === 'bars') drawBars(ctx, dataArray, W, H);
        if (type === 'circles') drawCircles(ctx, dataArray, W, H, frame);
    }
}

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
        ctx.fillStyle = `hsl(${(i / data.length) * 120 + 240}, 100%, 50%)`;
        ctx.fillRect(x, H - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

function drawCircles(ctx, data, W, H, frame) {
    const centerX = W / 2, centerY = H / 2;
    for (let i = 0; i < 10; i++) {
        const radius = (i / 10) * (Math.min(W, H) / 2) + (data[i * 5] / 255) * 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsl(${(i * 20 + frame) % 360}, 100%, 50%)`;
        ctx.stroke();
    }
}