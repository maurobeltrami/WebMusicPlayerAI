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

// Filtri
const artistFilter = document.getElementById('artistFilter');
const albumFilter = document.getElementById('albumFilter');
const filterStatus = document.getElementById('filterStatus');

// Nuovi elementi per la ricerca
const searchTrackInput = document.getElementById('searchTrackInput'); // *** NUOVO ELEMENTO DOM ***

// Controlli iPod
const shuffleBtn = document.getElementById('shuffleBtn');
const playPauseBtn = document.getElementById('playPauseBtn'); // Pulsante centrale Play/Pause
const playPauseIcon = document.getElementById('playPauseIcon');
const volumeSlider = document.getElementById('volumeSlider');

// Pulsanti e Controlli
const visualizerSelector = document.getElementById('visualizerSelector');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('time-display');
const progressControl = document.getElementById('progressControl'); // Contenitore cliccabile della barra
const muteToggleBtn = document.getElementById('muteToggleBtn'); // Pulsante Mute aggiornato nell'HTML

// Logica AI (Placeholder)
const aiPromptInput = document.getElementById('aiPrompt');
const generatePlaylistBtn = document.getElementById('generatePlaylistBtn'); // Pulsante AI effettivo
const aiStatus = document.getElementById('aiStatus');


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
    // Imposta la dimensione basandosi sul contenitore per un layout fluido
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function updateProgressBar() {
    const duration = audioPlayer.duration;
    const currentTime = audioPlayer.currentTime;
    if (isFinite(duration) && duration > 0) {
        const percentage = (currentTime / duration) * 100;
        progressBar.style.width = `${percentage}%`;

        // Aggiorna la variabile CSS per il thumb di trascinamento
        progressControl.style.setProperty('--current-percentage', `${percentage}%`);

        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    } else {
        progressBar.style.width = '0%';
        progressControl.style.setProperty('--current-percentage', `0%`);
        timeDisplay.textContent = '0:00 / 0:00';
    }
}

// FUNZIONE SEEKING (Spostamento sulla barra)
function seekTrack(e) {
    if (!audioPlayer.src || !progressControl) return;

    // Controlla se l'audio è caricato
    if (isNaN(audioPlayer.duration) || audioPlayer.duration === 0) {
        aiStatus.textContent = "Carica un brano prima di cercare.";
        return;
    }

    // Assicurati che l'utente abbia cliccato sulla barra
    if (e.target.closest('#progressControl') !== progressControl) return;

    const controlRect = progressControl.getBoundingClientRect();
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

    const iconEl = muteToggleBtn.querySelector('i');

    if (audioPlayer.muted) {
        // Salva l'ultimo volume non muto prima di silenziare
        if (audioPlayer.volume > 0) {
            volumeSlider.dataset.lastVolume = audioPlayer.volume;
        }

        // Aggiorna l'interfaccia
        iconEl.classList.replace('fa-volume-up', 'fa-volume-mute');
        muteToggleBtn.classList.add('active');
        // Imposta lo slider a 0 ma disabilitalo per visualizzare lo stato mute
        volumeSlider.value = 0;
        volumeSlider.disabled = true;

    } else {
        // Alza il volume ripristinando l'ultimo valore non muto
        const lastVolume = parseFloat(volumeSlider.dataset.lastVolume) || 0.75; // 0.75 è il valore di default in HTML
        audioPlayer.volume = lastVolume;
        volumeSlider.value = lastVolume;

        // Aggiorna l'interfaccia
        iconEl.classList.replace('fa-volume-mute', 'fa-volume-up');
        muteToggleBtn.classList.remove('active');
        volumeSlider.disabled = false;
    }
}


// --- FUNZIONI DI RIPRODUZIONE ---

async function togglePlayPause() {
    if (currentPlaylist.length === 0) {
        aiStatus.textContent = "Carica una playlist per iniziare.";
        return;
    }

    // Se l'SRC è vuoto, carica il primo brano
    if (!audioPlayer.src || audioPlayer.src.endsWith('undefined')) {
        loadTrack(0);
        return;
    }

    // Assicurati che l'AudioContext sia pronto prima di riprodurre
    await setupVisualizer(); // Attendiamo che l'inizializzazione sia completa

    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
    } else {
        // Riprendi l'AudioContext se sospeso dal browser
        if (audioContext && audioContext.state === 'suspended') {
            try {
                // *** CRUCIALE: Attendiamo la ripresa per la stabilità USB ***
                await audioContext.resume();
                console.log("AudioContext ripreso con successo.");
            } catch (err) {
                console.error("Errore nel riprendere l'AudioContext:", err);
                // Se non riusciamo a riprendere, non tentiamo il play
                aiStatus.textContent = "Errore Audio: Impossibile riattivare il contesto.";
                return;
            }
        }

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
    // Logica di pulizia e reindirizzamento (assicurati che sia consistente con il backend)
    relativeUrl = relativeUrl.replace(/^\/api\/music_stream\//, '').replace(/^\/api\//, '').replace(/^music_stream\//, '').replace(/^\//, '');
    const encodedFilepath = encodeURIComponent(relativeUrl);
    const finalSrc = DJANGO_BASE_HOST + DJANGO_MEDIA_PREFIX + encodedFilepath;

    if (audioPlayer.src !== finalSrc) {
        audioPlayer.src = finalSrc;
        audioPlayer.load(); // Forziamo il ricaricamento
        console.log("SRC Caricato:", finalSrc);
    }

    currentTrackDisplay.textContent = `${track.title} - ${track.artist} (${track.album})`;

    updatePlaylistView();

    // Tenta il play se era in riproduzione o se è il primo brano
    if (isPlaying || index === 0) {
        // Non chiamiamo togglePlayPause direttamente qui, ma aspettiamo il loadeddata
        // per avviare la riproduzione. Chiamiamo setupVisualizer in modo preventivo.
        setupVisualizer();
    }
}

function updatePlaylistView() {
    playlistEl.innerHTML = '';

    currentPlaylist.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${track.title} - ${track.artist} (${track.album})`;
        li.dataset.index = index;

        // Aggiungi classi Tailwind per l'aspetto della lista
        li.classList.add('p-2', 'rounded-lg', 'cursor-pointer', 'shadow-sm', 'bg-white', 'hover:bg-gray-200', 'transition', 'duration-150', 'ease-in-out');

        if (index === currentTrackIndex) {
            li.classList.add('active');
            // Scrolla per la traccia corrente
            if (currentTrackIndex > 0 || isPlaying) {
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        li.addEventListener('click', async () => {
            loadTrack(index);
            // Dopo aver caricato, assicuriamoci di riprodurre
            if (!isPlaying) await togglePlayPause();
        });
        playlistEl.appendChild(li);
    });

    const hasTracks = currentPlaylist.length > 0;
    nextBtn.disabled = !hasTracks;
    prevBtn.disabled = !hasTracks;

    // Aggiorna lo stato dello shuffle sul bottone
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
        // Salva l'ordine attuale prima di rimescolare
        originalPlaylistOrder = [...fullLibrary]; // Deve usare l'intera libreria non filtrata
        currentPlaylist = shuffleArray([...currentPlaylist]); // Mescola la playlist filtrata
    } else {
        // Ripristina l'ordine originale della lista filtrata
        applyFilters(); // Riaplica i filtri per ripristinare l'ordine originale
    }

    if (currentTrack) {
        // Trova l'indice del brano corrente nel nuovo/vecchio ordine
        currentTrackIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
        // Se non trova l'ID (impossibile se applyFilters è corretto), riporta a 0
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
            // *** MODIFICA CHIAVE: Latenza impostata su 'playback' per maggiore stabilità DAC ***
            audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'playback',
            });
            analyser = audioContext.createAnalyser();
            analyser.smoothingTimeConstant = 0.8;

            // Connette l'elemento audio (HTMLMediaElement)
            source = audioContext.createMediaElementSource(audioPlayer);

            // Connessione completa
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            audioConnected = true;

            // Inizia il loop di disegno
            drawVisualizer();

        } catch (e) {
            console.error("Web Audio API non supportata o errore di inizializzazione:", e);
            aiStatus.textContent = "Errore Audio: Contesto non inizializzato.";
            return;
        }
    }
    // Riprendi se sospeso (necessario dopo l'interazione utente)
    if (audioContext && audioContext.state === 'suspended') {
        try {
            // Tentativo di ripresa
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
            analyser.fftSize = 2048; // Più dettagliato per la forma d'onda
            break;
        case 'bars':
            analyser.fftSize = 256; // Più reattivo per le barre
            break;
        case 'circles':
            analyser.fftSize = 512; // Compromesso per l'effetto cerchi
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

    // Sfondo costante per tutti i tipi di visualizzatore
    canvasContext.fillStyle = 'rgb(31, 41, 55)'; // Colore scuro da Tailwind (gray-800 o simile)
    canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

    if (audioPlayer.paused && !isPlaying) {
        // Disegna testo di pausa quando non è in riproduzione
        canvasContext.font = "20px Inter, sans-serif";
        canvasContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
        canvasContext.textAlign = 'center';
        canvasContext.fillText("PAUSA", WIDTH / 2, HEIGHT / 2);
        return;
    }

    frame++;

    // Reset shadow per evitare artefatti
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
    // Tonalità che cambia lentamente
    const hue = (frame * 0.5) % 360;
    canvasContext.strokeStyle = `hsl(${hue}, 100%, 70%)`;

    // Ombra/bagliore
    canvasContext.shadowBlur = 10;
    canvasContext.shadowColor = canvasContext.strokeStyle;

    canvasContext.beginPath();

    const sliceWidth = WIDTH * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        // La forma d'onda è centrata verticalmente (tra 0 e 2) - 1.0 = centro
        const v = dataArray[i] / 128.0;
        const y = v * HEIGHT / 2;

        if (i === 0) {
            canvasContext.moveTo(x, y);
        } else {
            canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
    }

    // Linea per chiudere il percorso (opzionale, ma mantiene la linea più pulita)
    canvasContext.lineTo(WIDTH, HEIGHT / 2);
    canvasContext.stroke();

    canvasContext.shadowBlur = 0;
}

function drawBars(WIDTH, HEIGHT) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Usa solo metà delle barre per un effetto migliore (meno barre, più grandi)
    const displayLength = Math.floor(bufferLength / 2);
    const barWidth = (WIDTH / displayLength) * 0.9;
    let barX = 0;

    for (let i = 0; i < displayLength; i++) {
        let barHeight = dataArray[i] / 255 * HEIGHT * 0.9;

        const hue = (i / displayLength) * 120 + 240; // Da blu a magenta
        canvasContext.fillStyle = `hsl(${hue % 360}, 100%, ${30 + barHeight / (HEIGHT * 2)}%)`;
        canvasContext.shadowBlur = 5;
        canvasContext.shadowColor = canvasContext.fillStyle;


        // Disegna le barre
        canvasContext.fillRect(barX, HEIGHT - barHeight, barWidth, barHeight);

        barX += barWidth + 2; // Spazio tra le barre
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

    // Estrai il valore medio delle prime frequenze (bassi)
    const bassValue = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const overallAmplitude = bassValue / 255;

    for (let i = 1; i <= numCircles; i++) {
        const index = Math.floor((i / numCircles) * bufferLength / 2);
        const value = dataArray[index] || 0;

        // Variazione del raggio basata sul valore e sull'ampiezza generale
        const radius = (i / numCircles) * maxRadius + (overallAmplitude * 10);

        canvasContext.beginPath();
        canvasContext.arc(centerX, centerY, radius, 0, Math.PI * 2);

        // Colore che ruota (effetto psichedelico)
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

    // Se stiamo aumentando il volume da 0, disattiva il mute se era attivo
    if (audioPlayer.muted && newVolume > 0) {
        audioPlayer.muted = false;
        muteToggleBtn.querySelector('i').classList.replace('fa-volume-mute', 'fa-volume-up');
        muteToggleBtn.classList.remove('active');
        volumeSlider.disabled = false;
    }
    // Se stiamo mettendo a 0 il volume, attiva il mute e aggiorna l'icona
    else if (!audioPlayer.muted && newVolume === 0) {
        audioPlayer.muted = true;
        muteToggleBtn.querySelector('i').classList.replace('fa-volume-up', 'fa-volume-mute');
        muteToggleBtn.classList.add('active');
        // Lo slider rimane a 0 e disabilitato (gestito in toggleMute, ma qui non disabilitiamo)
    }

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
audioPlayer.addEventListener('loadedmetadata', updateProgressBar);

if (progressControl) {
    // Usa un listener sull'elemento genitore per intercettare i click
    progressControl.addEventListener('click', seekTrack);
}

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
            // Simula un errore HTTP per mostrare che l'API non risponde correttamente
            aiStatus.textContent = "Errore di connessione: il server Django non risponde all'API /tracks/. Usando dati fittizi.";
            console.error(`Errore HTTP: ${response.status}`);
            return simulateTracks(); // Carica dati fittizi se l'API fallisce
        }
        return await response.json();
    } catch (error) {
        aiStatus.textContent = `Errore di comunicazione con il server: ${error.message}. Usando dati fittizi.`;
        console.error('API Error:', error);
        return simulateTracks(); // Carica dati fittizi se l'API fallisce
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
    // Ottiene il termine di ricerca (se l'elemento esiste) e lo normalizza
    const searchTerm = (searchTrackInput ? searchTrackInput.value : '').toLowerCase().trim(); // *** NUOVA LOGICA DI RICERCA ***


    let filteredTracks = fullLibrary.filter(track => {
        const matchArtist = selectedArtist === 'all' || track.artist === selectedArtist;
        const matchAlbum = selectedAlbum === 'all' || track.album === selectedAlbum;

        // Filtra in base al termine di ricerca (su titolo, artista o album)
        let matchSearch = true;
        if (searchTerm.length > 0) {
            matchSearch = track.title.toLowerCase().includes(searchTerm) ||
                track.artist.toLowerCase().includes(searchTerm) ||
                track.album.toLowerCase().includes(searchTerm);
        }

        // Unisce tutti i filtri
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
    // Ri-setta l'originale in base ai filtri, se non siamo in shuffle
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

// *** NUOVO LISTENER: Lancia applyFilters ad ogni input nel campo di ricerca ***
if (searchTrackInput) {
    searchTrackInput.addEventListener('input', applyFilters);
}

async function initializePlayer() {
    // Tenta di caricare le tracce dall'API
    let tracks = await fetchTracks('tracks/');
    let filters = null;

    if (tracks.length === 0) {
        // Se la chiamata API fallisce e non ci sono dati simulati, usa i dati fittizi
        tracks = simulateTracks();
        filters = simulateFilters(tracks);
    } else {
        // Se la chiamata API ha successo, ottieni i filtri
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

        // Imposta il volume iniziale e lo stato del mute
        const initialVolume = parseFloat(volumeSlider.value);
        audioPlayer.volume = initialVolume;
        volumeSlider.dataset.lastVolume = initialVolume;

        // Chiama applyFilters per impostare l'SRC iniziale senza tentare il play
        applyFilters();

    } else {
        currentTrackDisplay.textContent = 'Nessun brano trovato sul server.';
    }

    updatePlaylistView();
    // Inizializza il contesto audio con l'hint di latenza
    await setupVisualizer();
}

document.addEventListener('DOMContentLoaded', initializePlayer);