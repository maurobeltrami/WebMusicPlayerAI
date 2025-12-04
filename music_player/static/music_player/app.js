// music_player/static/music_player/app.js (VERSIONE DEFINITIVA E FUNZIONANTE)

// Variabili globali
let currentPlaylist = [];
let currentTrackIndex = 0;
let fullLibrary = [];
let isShuffling = false;
let originalPlaylistOrder = [];
let isPlaying = false; // Stato di riproduzione

// Elementi DOM
const audioPlayer = document.getElementById('audioPlayer');
const playlistEl = document.getElementById('playlist');
const currentTrackDisplay = document.getElementById('currentTrack');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

// Mantengo gli input AI, ma il bottone 'generatePlaylistBtn' verrà riutilizzato per il Mute.
const aiPromptInput = document.getElementById('aiPrompt');
const aiStatus = document.getElementById('aiStatus');

const artistFilter = document.getElementById('artistFilter');
const albumFilter = document.getElementById('albumFilter');
const filterStatus = document.getElementById('filterStatus');

const shuffleBtn = document.getElementById('shuffleBtn');
const visualizerSelector = document.getElementById('visualizerSelector');

// Controlli iPod
const playPauseBtn = document.getElementById('playPauseBtn');
const playPauseIcon = document.getElementById('playPauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('time-display');

// Contenitore cliccabile della barra di progresso (ASSICURARSI CHE QUESTO ID SIA NELL'HTML!)
const progressControl = document.getElementById('progressControl');

// Il vecchio generatePlaylistBtn è ora il Mute Toggle Button
const muteToggleBtn = document.getElementById('generatePlaylistBtn');


// URL Base del Backend Django
const DJANGO_BASE_HOST = 'http://127.0.0.1:8000/'; // URL Base
const DJANGO_API_BASE = DJANGO_BASE_HOST + 'api/';
const DJANGO_MEDIA_PREFIX = 'media/'; // Prefisso Media di Django

// --- Variabili Visualizzatore ---
let audioContext = null;
let analyser;
let source;
let canvasContext;
const canvas = document.getElementById('visualizer');
if (canvas) {
    canvasContext = canvas.getContext('2d');
    // Set iniziale della dimensione del canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}
let currentVisualizerType = 'waveform';
let frame = 0;
let audioConnected = false;


// --- UTILITY FUNZIONI ---

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    // Imposta la dimensione del canvas per adattarsi al suo contenitore
    canvas.width = container.clientWidth - 20; // -20 per padding
    canvas.height = 200;
}

function updateProgressBar() {
    const duration = audioPlayer.duration;
    const currentTime = audioPlayer.currentTime;
    if (isFinite(duration) && duration > 0) {
        const percentage = (currentTime / duration) * 100;
        progressBar.style.width = `${percentage}%`;
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    } else {
        progressBar.style.width = '0%';
        timeDisplay.textContent = '0:00 / 0:00';
    }
}

// FUNZIONE SEEKING (Spostamento sulla barra)
function seekTrack(e) {
    if (!audioPlayer.src || !progressControl) return;

    const controlRect = progressControl.getBoundingClientRect();

    // Calcola la posizione X del click relativa al contenitore
    const clickX = e.clientX - controlRect.left;
    const barWidth = controlRect.width;

    const percentage = clickX / barWidth;
    const newTime = percentage * audioPlayer.duration;

    if (isFinite(newTime)) {
        audioPlayer.currentTime = newTime;
    }
}


// FUNZIONE MUTE (Attiva/Disattiva Muto)
function toggleMute() {
    audioPlayer.muted = !audioPlayer.muted;

    // Aggiorna l'icona del bottone Mute
    if (audioPlayer.muted) {
        // Salva l'ultimo volume non muto prima di silenziare
        volumeSlider.dataset.lastVolume = audioPlayer.volume;

        // Aggiorna il bottone
        muteToggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Mute ON';
        muteToggleBtn.classList.add('active');

    } else {
        // Alza il volume ripristinando l'ultimo valore non muto
        const lastVolume = parseFloat(volumeSlider.dataset.lastVolume) || 0.5;
        audioPlayer.volume = lastVolume; // Ripristina il volume nel player
        volumeSlider.value = lastVolume; // Aggiorna lo slider UI

        // Aggiorna il bottone
        muteToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> Mute OFF';
        muteToggleBtn.classList.remove('active');
    }
}


// --- FUNZIONI DI RIPRODUZIONE ---

function togglePlayPause() {
    if (currentPlaylist.length === 0) return;

    // Se il brano non è ancora caricato, carichiamo il primo e poi giochiamo
    if (!audioPlayer.src) {
        loadTrack(0);
        return;
    }

    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
    } else {
        // La prima volta che si preme play, si inizializza l'AudioContext
        setupVisualizer();

        audioPlayer.play().then(() => {
            isPlaying = true;
            playPauseIcon.classList.replace('fa-play', 'fa-pause');
        }).catch(e => {
            console.error("Riproduzione fallita (forse problema URL o permessi):", e);
            aiStatus.textContent = "Errore: Impossibile riprodurre il brano. Controlla la console.";
        });
    }
}

function loadTrack(index) {
    if (currentPlaylist.length === 0) {
        currentTrackDisplay.textContent = 'Nessun brano in playlist.';
        audioPlayer.src = '';
        isPlaying = false;
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
        return;
    }

    currentTrackIndex = (index + currentPlaylist.length) % currentPlaylist.length;
    const track = currentPlaylist[currentTrackIndex];

    let relativeUrl = track.url;

    // Logica di pulizia e reindirizzamento
    relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '');
    relativeUrl = relativeUrl.replace(/^\/api\//, '');
    relativeUrl = relativeUrl.replace(/^music_stream\//, '');
    relativeUrl = relativeUrl.replace(/^\//, '');

    const encodedFilepath = encodeURIComponent(relativeUrl);
    const finalSrc = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;

    // Controlla se l'SRC è cambiato, altrimenti evita di ricaricare il brano se si preme Prev/Next velocemente
    if (audioPlayer.src !== finalSrc) {
        audioPlayer.src = finalSrc;
        console.log("SRC Caricato:", finalSrc);
    }


    currentTrackDisplay.textContent = `${track.title} - ${track.artist} (${track.album})`;

    updatePlaylistView();

    // Riprova il play (fondamentale per next/prev)
    if (isPlaying || index === 0) { // Se è in riproduzione o è il primo brano (tentativo play)
        audioPlayer.play().catch(e => {
            if (e.name !== "NotAllowedError" && e.name !== "AbortError") {
                console.error("Errore di riproduzione:", e);
            } else {
                console.warn("Riproduzione bloccata dal browser. Clicca play.");
            }
            isPlaying = false;
            playPauseIcon.classList.replace('fa-pause', 'fa-play');
        });
        isPlaying = true;
        playPauseIcon.classList.replace('fa-play', 'fa-pause');
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
            // Scrolla solo se il player è attivo (per evitare scroll a vuoto all'inizializzazione)
            if (currentTrackIndex > 0) {
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        li.addEventListener('click', () => loadTrack(index));
        playlistEl.appendChild(li);
    });

    const hasTracks = currentPlaylist.length > 0;
    nextBtn.disabled = !hasTracks;
    prevBtn.disabled = !hasTracks;

    // Aggiorna lo stato dello shuffle sul bottone
    shuffleBtn.classList.toggle('active', isShuffling);
    shuffleBtn.innerHTML = isShuffling ? '<i class="fas fa-random"></i> Shuffle ON' : '<i class="fas fa-random"></i> Shuffle OFF';
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

    const currentTrack = currentPlaylist.length > 0 ? currentPlaylist[currentTrackIndex] : null;

    if (isShuffling) {
        // Salva l'ordine attuale prima di rimescolare
        originalPlaylistOrder = [...currentPlaylist];
        currentPlaylist = shuffleArray([...currentPlaylist]); // Mescola una copia
    } else {
        // Ripristina l'ordine originale
        currentPlaylist = [...originalPlaylistOrder];
    }

    if (currentTrack) {
        // Trova l'indice del brano corrente nel nuovo/vecchio ordine
        currentTrackIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    } else {
        currentTrackIndex = 0;
    }

    updatePlaylistView();
}


// --- LOGICA VISUALIZZATORE (MULTIPLA) ---

function setupVisualizer() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.smoothingTimeConstant = 0.8;
            source = audioContext.createMediaElementSource(audioPlayer);
            audioConnected = false;

            // Inizia il loop di disegno
            drawVisualizer();

        } catch (e) {
            console.error("Web Audio API non supportata o errore di inizializzazione:", e);
            return;
        }
    }

    // Connetti se non è già connesso
    if (audioContext && !audioConnected) {
        try {
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            audioConnected = true;

            // Riprendi se sospeso (necessario dopo l'interazione utente)
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
    requestAnimationFrame(drawVisualizer);
    if (!analyser || !canvasContext || !canvas) return;

    // Non disegnare se l'audio non è connesso o in pausa
    if (!audioConnected || audioPlayer.paused) {
        // Disegna uno sfondo scuro statico
        canvasContext.fillStyle = 'rgb(26, 26, 26)';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    frame++;

    // Pulisce solo se ci sono effetti di scia (come in waveform/circles)
    if (currentVisualizerType === 'waveform' || currentVisualizerType === 'circles') {
        canvasContext.fillStyle = 'rgba(0, 0, 0, 0.05)';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Aggiorna le dimensioni se necessario (gestito da resizeCanvas, ma utile qui)
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;


    switch (currentVisualizerType) {
        case 'waveform':
            drawWaveform(currentWidth, currentHeight);
            break;
        case 'bars':
            drawBars(currentWidth, currentHeight);
            break;
        case 'circles':
            drawCircles(currentWidth, currentHeight);
            break;
    }
}

function drawWaveform(WIDTH, HEIGHT) {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

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

function drawBars(WIDTH, HEIGHT) {
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

function drawCircles(WIDTH, HEIGHT) {
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

// --- GESTIONE EVENTI PLAYER (DEFINITIVA) ---

playPauseBtn.addEventListener('click', togglePlayPause);
nextBtn.addEventListener('click', () => loadTrack(currentTrackIndex + 1));
prevBtn.addEventListener('click', () => loadTrack(currentTrackIndex - 1));

shuffleBtn.addEventListener('click', toggleShuffle);

// CORREZIONE VOLUME: Lo slider controlla direttamente la proprietà volume (0.0 a 1.0)
volumeSlider.addEventListener('input', (event) => {
    // Usa il valore dello slider direttamente come volume (assume che l'input range sia tra 0 e 1 o sia normalizzato)
    const newVolume = parseFloat(event.target.value);
    audioPlayer.volume = newVolume;

    // Se l'utente sposta lo slider sopra 0 mentre è muto, disattiva il muto
    if (audioPlayer.muted && newVolume > 0) {
        audioPlayer.muted = false;
        muteToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> Mute OFF';
        muteToggleBtn.classList.remove('active');
    }

    // Se l'utente sposta lo slider a 0, non lo forziamo a muto, ma aggiorniamo il 'lastVolume'
    if (newVolume > 0) {
        volumeSlider.dataset.lastVolume = newVolume;
    }
});


visualizerSelector.addEventListener('change', (event) => {
    currentVisualizerType = event.target.value;
    setAnalyserFFTSize(currentVisualizerType);
});

audioPlayer.addEventListener('ended', () => {
    const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    loadTrack(nextIndex);
});

audioPlayer.addEventListener('timeupdate', updateProgressBar);
audioPlayer.addEventListener('loadedmetadata', updateProgressBar); // Aggiorna i tempi quando i metadati sono caricati

// Evento: Seeking sulla barra di controllo
if (progressControl) {
    progressControl.addEventListener('click', seekTrack);
}

// Evento: Bottone Mute (generatePlaylistBtn ora è muteToggleBtn)
muteToggleBtn.addEventListener('click', toggleMute);


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
    artistFilter.innerHTML = '<option value="all">Tutti</option>';
    albumFilter.innerHTML = '<option value="all">Tutti</option>';

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
        isPlaying = false;
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
        currentTrackDisplay.textContent = 'Nessun brano in riproduzione.';
    } else {
        filterStatus.textContent = `Trovati ${filteredTracks.length} brani.`;
        currentPlaylist = filteredTracks;
    }

    isShuffling = false;
    originalPlaylistOrder = [...currentPlaylist];

    currentTrackIndex = 0;

    if (currentPlaylist.length > 0) {
        const track = currentPlaylist[0];
        // Costruzione dell'SRC per l'elemento audio (logica di pulizia replicata)
        let relativeUrl = track.url;
        relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '');
        relativeUrl = relativeUrl.replace(/^\/api\//, '');
        relativeUrl = relativeUrl.replace(/^music_stream\//, '');
        relativeUrl = relativeUrl.replace(/^\//, '');

        const encodedFilepath = encodeURIComponent(relativeUrl);

        audioPlayer.src = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;
        currentTrackDisplay.textContent = `${track.title} - ${track.artist} (${track.album})`;
        // Forza il ripristino dell'icona play quando cambiano i filtri
        isPlaying = false;
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
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

        // Imposta il volume iniziale e lo stato del mute
        // ASSUME CHE L'INPUT RANGE HTML ABBIA MIN=0 E MAX=1
        audioPlayer.volume = volumeSlider.value;
        volumeSlider.dataset.lastVolume = volumeSlider.value; // Salva il valore iniziale non muto

        // Imposta il bottone Mute sullo stato iniziale (NON muto)
        muteToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> Mute OFF';
        muteToggleBtn.classList.remove('active');

        // Chiama applyFilters per impostare l'SRC iniziale senza tentare il play
        applyFilters();

    } else {
        currentTrackDisplay.textContent = 'Nessun brano trovato sul server.';
    }
    updatePlaylistView();
}

document.addEventListener('DOMContentLoaded', initializePlayer);