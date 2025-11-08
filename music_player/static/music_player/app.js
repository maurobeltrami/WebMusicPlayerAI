// music_player/static/music_player/app.js (VERSIONE DEFINITIVA E FUNZIONANTE)

// Variabili globali
let currentPlaylist = [];
let currentTrackIndex = 0;
let fullLibrary = [];
let isShuffling = false;
let originalPlaylistOrder = [];

// --- Variabili Visualizzatore ---
let audioContext = null;
let analyser;
let source;
let canvasContext;
const canvas = document.getElementById('visualizer');
const WIDTH = 400;
const HEIGHT = 200;
if (canvas) {
    canvasContext = canvas.getContext('2d');
}
let currentVisualizerType = 'waveform';
let frame = 0;
let audioConnected = false;

// Elementi DOM
const audioPlayer = document.getElementById('audioPlayer');
const playlistEl = document.getElementById('playlist');
const currentTrackDisplay = document.getElementById('currentTrack');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const aiPromptInput = document.getElementById('aiPrompt');
const generatePlaylistBtn = document.getElementById('generatePlaylistBtn');
const aiStatus = document.getElementById('aiStatus');

const artistFilter = document.getElementById('artistFilter');
const albumFilter = document.getElementById('albumFilter');
const filterStatus = document.getElementById('filterStatus');

const shuffleBtn = document.getElementById('shuffleBtn');
const visualizerSelector = document.getElementById('visualizerSelector');

// URL Base del Backend Django
const DJANGO_BASE_HOST = 'http://127.0.0.1:8000/'; // URL Base
const DJANGO_API_BASE = DJANGO_BASE_HOST + 'api/';
const DJANGO_MEDIA_PREFIX = 'media/'; // Prefisso Media di Django


// --- FUNZIONI DI RIPRODUZIONE ---

function loadTrack(index) {
    if (currentPlaylist.length === 0) return;

    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[currentTrackIndex];

    let relativeUrl = track.url;

    // ⬅️ CORREZIONE CRITICA: PULIZIA E REINDIRIZZAMENTO VERSO /media/

    // 1. Rimuove tutti i prefissi non necessari in un colpo solo
    // (es. "/api/music_stream/brano.mp3" -> "brano.mp3")
    relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '');
    relativeUrl = relativeUrl.replace(/^\/api\//, '');
    relativeUrl = relativeUrl.replace(/^music_stream\//, '');
    relativeUrl = relativeUrl.replace(/^\//, ''); // Rimuove eventuali slash iniziali rimanenti

    // 2. Codifica il percorso rimanente
    const encodedFilepath = encodeURIComponent(relativeUrl);

    // 3. Costruisce l'SRC finale corretto: http://127.0.0.1:8000/media/NomeFile.mp3
    audioPlayer.src = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;

    console.log("SRC Caricato (VERIFICA QUESTO):", audioPlayer.src);

    currentTrackDisplay.textContent = `${track.title} - ${track.artist} (${track.album})`;

    updatePlaylistView();

    // Tentiamo il play (gestione DOMException per riproduzione automatica bloccata dal browser)
    audioPlayer.play().catch(e => {
        // Ignora i permessi negati, ma logga altri errori (es. 404).
        if (e.name !== "NotAllowedError" && e.name !== "AbortError") {
            console.error("Errore di riproduzione. Controlla il log Network per 404/file non idoneo.", e);
        } else {
            console.warn("Riproduzione automatica bloccata dal browser. Clicca play.", e);
        }
    });

    // Riconnessione Visualizzatore
    if (audioContext && !audioConnected) {
        setupVisualizer();
    }
}

function updatePlaylistView() {
    playlistEl.innerHTML = '';

    currentPlaylist.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${track.title} - ${track.artist} (${track.album})`;
        li.dataset.index = index;

        if (index === currentTrackIndex) {
            li.classList.add('active');
            li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        li.addEventListener('click', () => loadTrack(index));
        playlistEl.appendChild(li);
    });

    const hasTracks = currentPlaylist.length > 0;
    nextBtn.disabled = !hasTracks;
    prevBtn.disabled = !hasTracks;

    if (isShuffling) {
        shuffleBtn.classList.add('active');
        shuffleBtn.textContent = '🔀 Shuffle ON';
    } else {
        shuffleBtn.classList.remove('active');
        shuffleBtn.textContent = 'Shuffle OFF';
    }
}

// --- LOGICA SHUFFLE ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function toggleShuffle() {
    isShuffling = !isShuffling;

    const currentTrack = currentPlaylist[currentTrackIndex];

    if (isShuffling) {
        originalPlaylistOrder = [...currentPlaylist];
        currentPlaylist = shuffleArray(currentPlaylist);
    } else {
        currentPlaylist = [...originalPlaylistOrder];
    }

    currentTrackIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);

    if (currentTrackIndex === -1) currentTrackIndex = 0;

    updatePlaylistView();
}


// --- LOGICA VISUALIZZATORE (MULTIPLA) ---

function setupVisualizer() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.smoothingTimeConstant = 0.8;

            // Crea il source solo la prima volta
            source = audioContext.createMediaElementSource(audioPlayer);
            audioConnected = false;

            drawVisualizer();

        } catch (e) {
            console.error("Web Audio API non supportata o errore di inizializzazione:", e);
        }
    }

    if (audioContext && !audioConnected) {
        try {
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            audioConnected = true;

            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            setAnalyserFFTSize(currentVisualizerType);

        } catch (e) {
            console.warn("Errore di connessione Web Audio:", e);
        }
    }
}

function setAnalyserFFTSize(visualizerType) {
    if (!analyser) return;
    switch (visualizerType) {
        case 'waveform':
            analyser.fftSize = 2048;
            break;
        case 'bars':
            analyser.fftSize = 256;
            break;
        case 'circles':
            analyser.fftSize = 512;
            break;
        default:
            analyser.fftSize = 256;
    }
}

function drawVisualizer() {
    if (!analyser || !canvasContext) {
        requestAnimationFrame(drawVisualizer);
        return;
    }

    requestAnimationFrame(drawVisualizer);
    frame++;

    canvasContext.clearRect(0, 0, WIDTH, HEIGHT);

    switch (currentVisualizerType) {
        case 'waveform':
            drawWaveform();
            break;
        case 'bars':
            drawBars();
            break;
        case 'circles':
            drawCircles();
            break;
        default:
            drawWaveform();
    }
}

function drawWaveform() {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    canvasContext.fillStyle = 'rgba(0, 0, 0, 0.05)';
    canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

    canvasContext.lineWidth = 2;
    canvasContext.strokeStyle = `hsl(${frame * 0.8 % 360}, 100%, 50%)`;
    canvasContext.shadowBlur = 10;
    canvasContext.shadowColor = canvasContext.strokeStyle;

    canvasContext.beginPath();

    const sliceWidth = WIDTH * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * HEIGHT / 2;

        if (i === 0) {
            canvasContext.moveTo(x, y);
        } else {
            canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasContext.lineTo(WIDTH, HEIGHT / 2);
    canvasContext.stroke();

    canvasContext.shadowBlur = 0;
}

function drawBars() {
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasContext.fillStyle = 'rgb(0, 0, 0)';
    canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

    const barWidth = (WIDTH / bufferLength) * 2;
    let barX = 0;

    for (let i = 0; i < bufferLength; i++) {
        let barHeight = dataArray[i] / 255 * HEIGHT;

        const hue = (i / bufferLength) * 360;
        canvasContext.fillStyle = `hsl(${hue}, 100%, ${50 + barHeight / (HEIGHT * 2)}%)`;

        canvasContext.fillRect(barX, HEIGHT - barHeight, barWidth, barHeight);

        barX += barWidth + 1;
    }
}

function drawCircles() {
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasContext.fillStyle = 'rgba(0, 0, 0, 0.1)';
    canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    const maxRadius = Math.min(WIDTH, HEIGHT) / 2 - 10;

    for (let i = 0; i < bufferLength; i += 5) {
        const value = dataArray[i];
        const radius = (value / 255) * maxRadius;

        canvasContext.beginPath();
        canvasContext.arc(centerX, centerY, radius, 0, Math.PI * 2);

        const hue = (i / bufferLength * 360 + frame * 0.2) % 360;
        const lightness = 30 + (value / 255) * 50;

        canvasContext.strokeStyle = `hsl(${hue}, 100%, ${lightness}%)`;
        canvasContext.lineWidth = 1 + (value / 255) * 2;
        canvasContext.shadowBlur = 5;
        canvasContext.shadowColor = `hsl(${hue}, 100%, 50%)`;

        canvasContext.stroke();
    }
    canvasContext.shadowBlur = 0;
}

// --- GESTIONE EVENTI PLAYER (AGGIORNATA) ---

nextBtn.addEventListener('click', () => loadTrack(currentTrackIndex + 1));
prevBtn.addEventListener('click', () => loadTrack(currentTrackIndex - 1));
shuffleBtn.addEventListener('click', toggleShuffle);

visualizerSelector.addEventListener('change', (event) => {
    currentVisualizerType = event.target.value;
    setAnalyserFFTSize(currentVisualizerType);
});

audioPlayer.addEventListener('ended', () => {
    const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    loadTrack(nextIndex);
});

// Chiamiamo setupVisualizer al primo evento 'play' causato da un'interazione utente
audioPlayer.addEventListener('play', setupVisualizer, { once: true });


// --- FUNZIONI API ---
async function fetchTracks(endpoint = 'tracks/', method = 'GET', body = null) {
    try {
        const url = DJANGO_API_BASE + endpoint;
        const config = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null,
        };

        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        aiStatus.textContent = `Errore di comunicazione con il server: ${error.message}`;
        console.error('API Error:', error);
        return [];
    }
}

// --- LOGICA FILTRI E INIZIALIZZAZIONE ---

function populateFilters(filters) {
    filters.artists.forEach(artist => {
        const option = new Option(artist, artist);
        artistFilter.add(option);
    });

    filters.albums.forEach(album => {
        const option = new Option(album, album);
        albumFilter.add(option);
    });
}

function applyFilters() {
    const selectedArtist = artistFilter.value;
    const selectedAlbum = albumFilter.value;

    let filteredTracks = fullLibrary.filter(track => {
        const matchArtist = selectedArtist === 'all' || track.artist === selectedArtist;
        const matchAlbum = selectedAlbum === 'all' || track.album === selectedAlbum;
        return matchArtist && matchAlbum;
    });

    if (filteredTracks.length === 0) {
        filterStatus.textContent = "Nessun brano trovato con questi filtri.";
        currentPlaylist = [];
        audioPlayer.pause();
        audioPlayer.src = '';
    } else {
        filterStatus.textContent = `Trovati ${filteredTracks.length} brani.`;
        currentPlaylist = filteredTracks;
    }

    isShuffling = false;
    originalPlaylistOrder = [...currentPlaylist];

    // Se ci sono brani, pre-imposta l'SRC del primo brano, ma NON chiamare loadTrack() per evitare il play automatico
    currentTrackIndex = 0;

    if (currentPlaylist.length > 0) {
        const track = currentPlaylist[0];
        // Costruzione dell'SRC per l'elemento audio (ripetiamo la logica di pulizia)
        let relativeUrl = track.url;
        relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '');
        relativeUrl = relativeUrl.replace(/^\/api\//, '');
        relativeUrl = relativeUrl.replace(/^music_stream\//, '');
        relativeUrl = relativeUrl.replace(/^\//, '');

        const encodedFilepath = encodeURIComponent(relativeUrl);

        audioPlayer.src = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;
        currentTrackDisplay.textContent = `${track.title} - ${track.artist} (${track.album})`;
        // audioPlayer.load(); // Opzionale: pre-carica i metadati
    } else {
        currentTrackDisplay.textContent = 'Seleziona un brano dalla playlist.';
        audioPlayer.src = '';
    }

    updatePlaylistView();
}

artistFilter.addEventListener('change', applyFilters);
albumFilter.addEventListener('change', applyFilters);

async function initializePlayer() {
    const tracks = await fetchTracks('tracks/');

    if (tracks.length > 0) {
        fullLibrary = tracks;
        currentPlaylist = tracks;
        originalPlaylistOrder = [...tracks];

        const filters = await fetchTracks('filters/');
        populateFilters(filters);

        // Chiama applyFilters per impostare l'SRC iniziale senza tentare il play
        applyFilters();

    } else {
        currentTrackDisplay.textContent = 'Nessun brano trovato sul server.';
    }
    updatePlaylistView();
}

// --- LOGICA AI (Placeholder) ---

generatePlaylistBtn.addEventListener('click', async () => {
    const prompt = aiPromptInput.value.trim();
    if (!prompt) return;

    aiStatus.textContent = "Generazione playlist in corso...";
    generatePlaylistBtn.disabled = true;

    // SIMULAZIONE
    setTimeout(() => {
        aiStatus.textContent = `[SIMULAZIONE] Richiesta ricevuta: "${prompt}". Implementare l'AI nel Backend.`;
        generatePlaylistBtn.disabled = false;
    }, 1500);
});

document.addEventListener('DOMContentLoaded', initializePlayer);