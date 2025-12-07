// Variabili globali
let currentPlaylist = [];
let currentTrackIndex = 0;
let fullLibrary = [];
let isShuffling = false;
let originalPlaylistOrder = [];
let isPlaying = false; // Stato di riproduzione

// --- VARIABILI CHIAVE PER GESTIRE CLICK/DBLCLICK E REPLAY ---
let isDblClicking = false; // Flag utilizzato per distinguere click singolo da doppio
let clickTimer = null; // Timer per ritardare l'azione di seeking
const DBL_CLICK_DELAY = 300; // 300ms, il ritardo massimo per un doppio click
// -----------------------------------------------------------


// Elementi DOM
const audioPlayer = document.getElementById('audioPlayer');
const playlistEl = document.getElementById('playlist');
const currentTrackDisplay = document.getElementById('currentTrack');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

// Filtri
const artistFilter = document.getElementById('artistFilter');
const albumFilter = document.getElementById('albumFilter');
const filterStatus = document.getElementById('filterStatus');

// Nuovi elementi per la ricerca
const searchTrackInput = document.getElementById('searchTrackInput');

// Controlli iPod
const shuffleBtn = document.getElementById('shuffleBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const playPauseIcon = document.getElementById('playPauseIcon');
const volumeSlider = document.getElementById('volumeSlider');

// Pulsanti e Controlli
const visualizerSelector = document.getElementById('visualizerSelector');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('time-display');
const progressControl = document.getElementById('progressControl');
const muteToggleBtn = document.getElementById('muteToggleBtn');

// Elemento Visualizzatore
const displayScreen = document.getElementById('displayScreen');

// Logica AI (Placeholder)
const aiPromptInput = document.getElementById('aiPrompt');
const generatePlaylistBtn = document.getElementById('generatePlaylistBtn');
const aiStatus = document.getElementById('aiStatus');


// URL Base del Backend Django
const DJANGO_BASE_HOST = 'http://127.0.0.1:8000/';
const DJANGO_API_BASE = DJANGO_BASE_HOST + 'api/';
const DJANGO_MEDIA_PREFIX = 'media/';

// --- Variabili Visualizzatore ---
let audioContext = null;
let analyser;
let source;
let canvasContext;
const canvas = document.getElementById('visualizer');
if (canvas) {
    canvasContext = canvas.getContext('2d');
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
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function updateProgressBar() {
    const duration = audioPlayer.duration;
    const currentTime = audioPlayer.currentTime;
    if (isFinite(duration) && duration > 0) {
        const percentage = (currentTime / duration) * 100;
        progressBar.style.width = `${percentage}%`;
        progressControl.style.setProperty('--current-percentage', `${percentage}%`);
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    } else {
        progressBar.style.width = '0%';
        progressControl.style.setProperty('--current-percentage', `0%`);
        timeDisplay.textContent = '0:00 / 0:00';
    }
}

// FUNZIONE SEEKING (Spostamento sulla barra - Click Singolo)
function seekTrack(e) {
    if (!audioPlayer.src || !progressControl) return;

    if (isNaN(audioPlayer.duration) || audioPlayer.duration === 0) {
        aiStatus.textContent = "Carica un brano prima di cercare.";
        return;
    }

    const controlRect = progressControl.getBoundingClientRect();
    const clickX = e.clientX - controlRect.left;
    const barWidth = controlRect.width;

    const percentage = clickX / barWidth;
    const newTime = percentage * audioPlayer.duration;

    if (isFinite(newTime)) {
        audioPlayer.currentTime = newTime;
        aiStatus.textContent = `Spostato a ${formatTime(newTime)}. 🕒`;
    }
}


// FUNZIONE MUTE (Attiva/Disattiva Muto)
function toggleMute() {
    audioPlayer.muted = !audioPlayer.muted;

    const iconEl = muteToggleBtn.querySelector('i');

    if (audioPlayer.muted) {
        if (audioPlayer.volume > 0) {
            volumeSlider.dataset.lastVolume = audioPlayer.volume;
        }
        iconEl.classList.replace('fa-volume-up', 'fa-volume-mute');
        muteToggleBtn.classList.add('active');
        volumeSlider.value = 0;
        volumeSlider.disabled = true;

    } else {
        const lastVolume = parseFloat(volumeSlider.dataset.lastVolume) || 0.75;
        audioPlayer.volume = lastVolume;
        volumeSlider.value = lastVolume;

        iconEl.classList.replace('fa-volume-mute', 'fa-volume-up');
        muteToggleBtn.classList.remove('active');
        volumeSlider.disabled = false;
    }
}


// --- FUNZIONI DI RIPRODUZIONE ---

function skipForward(seconds = 10) {
    if (!audioPlayer.src || isNaN(audioPlayer.duration)) return;
    let newTime = audioPlayer.currentTime + seconds;
    if (newTime > audioPlayer.duration) {
        newTime = audioPlayer.duration;
    }
    audioPlayer.currentTime = newTime;
    console.log(`Saltato in avanti di ${seconds}s a ${formatTime(newTime)}`);
}

function skipBackward(seconds = 10) {
    if (!audioPlayer.src || isNaN(audioPlayer.duration)) return;
    let newTime = audioPlayer.currentTime - seconds;
    if (newTime < 0) {
        newTime = 0;
    }
    audioPlayer.currentTime = newTime;
    console.log(`Saltato indietro di ${seconds}s a ${formatTime(newTime)}`);
}


async function togglePlayPause() {
    if (currentPlaylist.length === 0) {
        aiStatus.textContent = "Carica una playlist per iniziare.";
        return;
    }

    if (!audioPlayer.src || audioPlayer.src.endsWith('undefined')) {
        loadTrack(0);
        return;
    }

    await setupVisualizer();

    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
    } else {
        if (audioContext && audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                console.log("AudioContext ripreso con successo.");
            } catch (err) {
                console.error("Errore nel riprendere l'AudioContext:", err);
                aiStatus.textContent = "Errore Audio: Impossibile riattivare il contesto.";
                return;
            }
        }

        // Tentativo di play, il 'canplay' listener è ora più importante.
        audioPlayer.play().then(() => {
            isPlaying = true;
            playPauseIcon.classList.replace('fa-play', 'fa-pause');
        }).catch(e => {
            if (e.name === "NotAllowedError") {
                aiStatus.textContent = "Permesso negato. Premi Play per sbloccare la riproduzione automatica.";
            } else if (e.name !== "AbortError") {
                console.error("Riproduzione fallita:", e);
                aiStatus.textContent = "Errore di riproduzione. Riprova o controlla la console.";
            }
            isPlaying = false;
            playPauseIcon.classList.replace('fa-pause', 'fa-play');
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
    relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '').replace(/^\/api\//, '').replace(/^music_stream\//, '').replace(/^\//, '');
    const encodedFilepath = encodeURIComponent(relativeUrl);
    const finalSrc = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;

    if (audioPlayer.src !== finalSrc) {
        audioPlayer.src = finalSrc;
        audioPlayer.load();
        console.log("SRC Caricato:", finalSrc);
    }

    currentTrackDisplay.textContent = `${track.title} - ${track.artist} (${track.album})`;

    updatePlaylistView();

    // Logica di riproduzione gestita ora dal listener 'canplay'
    if (isPlaying) {
        setupVisualizer(); // Assicurati che l'analizzatore sia attivo
    } else {
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
    }
}

function updatePlaylistView() {
    playlistEl.innerHTML = '';

    currentPlaylist.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${track.title} - ${track.artist} (${track.album})`;
        li.dataset.index = index;

        li.classList.add('p-2', 'rounded-lg', 'cursor-pointer', 'shadow-sm', 'bg-white', 'hover:bg-gray-200', 'transition', 'duration-150', 'ease-in-out');

        if (index === currentTrackIndex) {
            li.classList.add('active');
            if (currentTrackIndex > 0 || isPlaying) {
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        li.addEventListener('click', async () => {
            loadTrack(index);
            if (!isPlaying) await togglePlayPause();
        });
        playlistEl.appendChild(li);
    });

    const hasTracks = currentPlaylist.length > 0;
    nextBtn.disabled = !hasTracks;
    prevBtn.disabled = !hasTracks;

    shuffleBtn.classList.toggle('active', isShuffling);
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
        originalPlaylistOrder = [...fullLibrary];
        currentPlaylist = shuffleArray([...currentPlaylist]);
    } else {
        applyFilters();
    }

    if (currentTrack) {
        currentTrackIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
        if (currentTrackIndex === -1) currentTrackIndex = 0;
    } else {
        currentTrackIndex = 0;
    }

    updatePlaylistView();
}


// --- LOGICA VISUALIZZATORE (MULTIPLA) ---

async function setupVisualizer() {
    if (audioContext === null) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'playback',
            });
            analyser = audioContext.createAnalyser();
            analyser.smoothingTimeConstant = 0.8;

            source = audioContext.createMediaElementSource(audioPlayer);

            source.connect(analyser);
            analyser.connect(audioContext.destination);
            audioConnected = true;

            drawVisualizer();

        } catch (e) {
            console.error("Web Audio API non supportata o errore di inizializzazione:", e);
            aiStatus.textContent = "Errore Audio: Contesto non inizializzato.";
            return;
        }
    }
    if (audioContext && audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
        } catch (err) {
            console.error("Errore nel riprendere l'AudioContext:", err);
        }
    }
    setAnalyserFFTSize(currentVisualizerType);
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

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    canvasContext.fillStyle = 'rgb(31, 41, 55)';
    canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

    if (audioPlayer.paused && !isPlaying) {
        canvasContext.font = "20px Inter, sans-serif";
        canvasContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
        canvasContext.textAlign = 'center';
        canvasContext.fillText("PAUSA", WIDTH / 2, HEIGHT / 2);
        return;
    }

    frame++;
    canvasContext.shadowBlur = 0;

    switch (currentVisualizerType) {
        case 'waveform':
            drawWaveform(WIDTH, HEIGHT);
            break;
        case 'bars':
            drawBars(WIDTH, HEIGHT);
            break;
        case 'circles':
            drawCircles(WIDTH, HEIGHT);
            break;
    }
}

function drawWaveform(WIDTH, HEIGHT) {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    canvasContext.lineWidth = 2;
    const hue = (frame * 0.5) % 360;
    canvasContext.strokeStyle = `hsl(${hue}, 100%, 70%)`;
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
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const displayLength = Math.floor(bufferLength / 2);
    const barWidth = (WIDTH / displayLength) * 0.9;
    let barX = 0;

    for (let i = 0; i < displayLength; i++) {
        let barHeight = dataArray[i] / 255 * HEIGHT * 0.9;

        const hue = (i / displayLength) * 120 + 240;
        canvasContext.fillStyle = `hsl(${hue % 360}, 100%, ${30 + barHeight / (HEIGHT * 2)}%)`;
        canvasContext.shadowBlur = 5;
        canvasContext.shadowColor = canvasContext.fillStyle;

        canvasContext.fillRect(barX, HEIGHT - barHeight, barWidth, barHeight);

        barX += barWidth + 2;
    }
}

function drawCircles(WIDTH, HEIGHT) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    const maxRadius = Math.min(WIDTH, HEIGHT) / 2 * 0.9;
    const numCircles = 10;

    const bassValue = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const overallAmplitude = bassValue / 255;

    for (let i = 1; i <= numCircles; i++) {
        const index = Math.floor((i / numCircles) * bufferLength / 2);
        const value = dataArray[index] || 0;

        const radius = (i / numCircles) * maxRadius + (overallAmplitude * 10);

        canvasContext.beginPath();
        canvasContext.arc(centerX, centerY, radius, 0, Math.PI * 2);

        const hue = (index * 5 + frame * 0.8) % 360;
        const lightness = 40 + (value / 255) * 40;

        canvasContext.strokeStyle = `hsl(${hue}, 100%, ${lightness}%)`;
        canvasContext.lineWidth = 1 + (value / 255) * 2;
        canvasContext.shadowBlur = 10;
        canvasContext.shadowColor = `hsl(${hue}, 100%, 50%)`;

        canvasContext.stroke();
    }
    canvasContext.shadowBlur = 0;
}

// --- GESTIONE EVENTI PLAYER ---

playPauseBtn.addEventListener('click', togglePlayPause);
nextBtn.addEventListener('click', () => loadTrack(currentTrackIndex + 1));
prevBtn.addEventListener('click', () => loadTrack(currentTrackIndex - 1));
shuffleBtn.addEventListener('click', toggleShuffle);
muteToggleBtn.addEventListener('click', toggleMute);

volumeSlider.addEventListener('input', (event) => {
    const newVolume = parseFloat(event.target.value);
    audioPlayer.volume = newVolume;

    if (audioPlayer.muted && newVolume > 0) {
        audioPlayer.muted = false;
        muteToggleBtn.querySelector('i').classList.replace('fa-volume-mute', 'fa-volume-up');
        muteToggleBtn.classList.remove('active');
        volumeSlider.disabled = false;
    }
    else if (!audioPlayer.muted && newVolume === 0) {
        audioPlayer.muted = true;
        muteToggleBtn.querySelector('i').classList.replace('fa-volume-up', 'fa-volume-mute');
        muteToggleBtn.classList.add('active');
    }

    if (newVolume > 0) {
        volumeSlider.dataset.lastVolume = newVolume;
    }
});


visualizerSelector.addEventListener('change', (event) => {
    currentVisualizerType = event.target.value;
    setAnalyserFFTSize(currentVisualizerType);
});

// Quando il brano finisce, carica il successivo
audioPlayer.addEventListener('ended', () => {
    const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    loadTrack(nextIndex);
});

audioPlayer.addEventListener('timeupdate', updateProgressBar);
audioPlayer.addEventListener('loadedmetadata', updateProgressBar);

// *** LISTENER PER AUTOPLAY ***
audioPlayer.addEventListener('canplay', () => {
    if (isPlaying) {
        audioPlayer.play().catch(e => {
            console.error("Auto-play bloccato:", e);
            aiStatus.textContent = "Auto-play bloccato dal browser. Premi Play. ⚠️";
            isPlaying = false;
            playPauseIcon.classList.replace('fa-pause', 'fa-play');
        });
    }
});
// *****************************************


// --- NUOVA LOGICA: DOPPIO CLICK SULL'AREA DEL VISUALIZZATORE (Skip Avanti/Indietro) ---
if (displayScreen) {
    displayScreen.addEventListener('dblclick', (event) => {
        // Ignora il click se il brano non è riproducibile
        if (!audioPlayer.src || isNaN(audioPlayer.duration) || currentPlaylist.length === 0) {
            aiStatus.textContent = "Carica un brano per usare lo skip. 🖱️";
            return;
        }

        const controlRect = displayScreen.getBoundingClientRect();
        const clickX = event.clientX - controlRect.left;
        const barWidth = controlRect.width;

        // Se clicca nella metà sinistra, skip backward
        if (clickX / barWidth < 0.5) {
            skipBackward(10);
            aiStatus.textContent = "Saltato indietro di 10 secondi. ⏪";
        } else {
            // Se clicca nella metà destra, skip forward
            skipForward(10);
            aiStatus.textContent = "Saltato avanti di 10 secondi. ⏩";
        }
    });
}
// -----------------------------------------------------------------------------


// --- LOGICA CHIAVE PER BARRA DI PROGRESSO: CLICK SINGOLO (Seeking) E DOPPIO CLICK (Ignorato) ---
if (progressControl) {

    // 1. GESTIONE DOPPIO CLICK (Per prevenire l'esecuzione del click singolo)
    progressControl.addEventListener('dblclick', (event) => {
        // Cancella il timer per impedire che l'evento click in ritardo esegua il seek
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
        }

        isDblClicking = true;
        // Non facciamo nulla qui, ma questo previene l'azione di seeking accidentale al dblclick
        // e imposta il flag.

        // Timeout di sicurezza per resettare il flag
        setTimeout(() => {
            isDblClicking = false;
        }, 100);
    });

    // 2. GESTIONE CLICK SINGOLO (Seeking normale)
    progressControl.addEventListener('click', (event) => {
        // Se siamo in un dblclick appena avvenuto, ignora
        if (isDblClicking) {
            isDblClicking = false;
            return;
        }

        // Cancella qualsiasi timer precedente (evita seeking doppi)
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
        }

        // Ritarda l'azione di seeking: se un dblclick avviene prima che scatti il timer, 
        // l'azione seek viene annullata dal gestore dblclick.
        clickTimer = setTimeout(() => {
            seekTrack(event);
            clickTimer = null;
        }, DBL_CLICK_DELAY);
    });
}
// ---------------------------------------------------------------------------------


// Placeholder per il bottone AI - non fa nulla senza un'implementazione Django
generatePlaylistBtn.addEventListener('click', () => {
    aiStatus.textContent = "Funzione AI non implementata: richiede un backend Django e un modello Gemini.";
});


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
            aiStatus.textContent = "Errore di connessione: il server Django non risponde all'API /tracks/. Usando dati fittizi.";
            console.error(`Errore HTTP: ${response.status}`);
            return simulateTracks();
        }
        return await response.json();
    } catch (error) {
        aiStatus.textContent = `Errore di comunicazione con il server: ${error.message}. Usando dati fittizi.`;
        console.error('API Error:', error);
        return simulateTracks();
    }
}

// --- DATI FITTIZI DI BACKUP ---
function simulateTracks() {
    return [
        { id: 1, title: "Chillwave Dream", artist: "Synth Rider", album: "Neon Horizon", url: "media/music/track1.mp3" },
        { id: 2, title: "Jazzy Mood", artist: "Blue Note Trio", album: "Midnight Session", url: "media/music/track2.mp3" },
        { id: 3, title: "Lofi Study Beats", artist: "Rainy Days", album: "Focus Sessions", url: "media/music/track3.mp3" },
        { id: 4, title: "Epic Orchestral", artist: "Cinema Score", album: "The Odyssey", url: "media/music/track4.mp3" },
        { id: 5, title: "Acoustic Sunset", artist: "Ella May", album: "Summer Vibes", url: "media/music/track5.mp3" },
    ];
}

function simulateFilters(tracks) {
    const artists = [...new Set(tracks.map(t => t.artist))].sort();
    const albums = [...new Set(tracks.map(t => t.album))].sort();
    return { artists, albums };
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
    const searchTerm = (searchTrackInput ? searchTrackInput.value : '').toLowerCase().trim();

    let filteredTracks = fullLibrary.filter(track => {
        const matchArtist = selectedArtist === 'all' || track.artist === selectedArtist;
        const matchAlbum = selectedAlbum === 'all' || track.album === selectedAlbum;

        let matchSearch = true;
        if (searchTerm.length > 0) {
            matchSearch = track.title.toLowerCase().includes(searchTerm) ||
                track.artist.toLowerCase().includes(searchTerm) ||
                track.album.toLowerCase().includes(searchTerm);
        }

        return matchArtist && matchAlbum && matchSearch;
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
        let relativeUrl = track.url;
        relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '').replace(/^\/api\//, '').replace(/^music_stream\//, '').replace(/^\//, '');

        const encodedFilepath = encodeURIComponent(relativeUrl);

        audioPlayer.src = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;
        currentTrackDisplay.textContent = `${track.title} - ${track.artist} (${track.album})`;

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

if (searchTrackInput) {
    searchTrackInput.addEventListener('input', applyFilters);
}

async function initializePlayer() {
    let tracks = await fetchTracks('tracks/');
    let filters = null;

    if (tracks.length === 0) {
        tracks = simulateTracks();
        filters = simulateFilters(tracks);
    } else {
        filters = await fetchTracks('filters/');
        if (!filters || Object.keys(filters).length === 0 || !Array.isArray(filters.artists)) {
            filters = simulateFilters(tracks);
        }
    }

    if (tracks.length > 0) {
        fullLibrary = tracks;
        currentPlaylist = tracks;
        originalPlaylistOrder = [...tracks];

        populateFilters(filters);

        const initialVolume = parseFloat(volumeSlider.value);
        audioPlayer.volume = initialVolume;
        volumeSlider.dataset.lastVolume = initialVolume;

        applyFilters();

    } else {
        currentTrackDisplay.textContent = 'Nessun brano trovato sul server.';
    }

    updatePlaylistView();
    await setupVisualizer();
}

document.addEventListener('DOMContentLoaded', initializePlayer);