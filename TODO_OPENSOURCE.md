# Roadmap Sviluppo Web Music Player (Open Source)

Questo documento riassume i principali punti di intervento per trasformare l'attuale lettore musicale in un solido progetto open source, accattivante e facile da usare per la community.

## ✅ Obiettivi Raggiunti (Completati)

### ⚡ Indicizzazione nel Database (Performance)
* **Database & Scansione:** Implementato il modello Django `Track` e il comando `scan_music` per salvare i metadati dei brani.
* **API Veloci:** Le view interrogano SQLite anziché il filesystem, fornendo tempi di risposta istantanei.

### 🎛️ Pagina di Equalizzazione Professionale
* **Equalizzatore Parametrico:** Implementato l'EQ grafico a 3 bande, compressore e controllo volume via Web Audio API.

### 🎨 Selettore di Stili (Temi)
* **Cambio Tema:** Introdotti `themeManager.js` e i file CSS dedicati per i temi ("Modern", "Punk").
* **Variabili CSS:** L'intero progetto usa variabili architettate per cambi di tema istantanei.

### 📱 Supporto Mobile (Android/Termux)
* **Script Automatici:** Introdotti script di auto-configurazione per l'ambiente Termux Android (`setup_termux.sh`, `start.sh`).
* **Path Dinamici:** Adattamento automatico dei percorsi di memoria in base al dispositivo in uso.

---

## 🚀 Prossimi Passi (Da Fare)

### 1. 🐳 Dockerizzazione (Facilità d'uso)
Per permettere a chiunque di installare il player in pochi secondi (es. su NAS, Raspberry Pi, server domestici):
* Creare un `Dockerfile` per pacchettizzare l'app Django.
* Creare un `docker-compose.yml` che permetta di avviare l'app e montare la propria libreria musicale come volume (es. `- /path/alla/musica:/music_data:ro`).
* Questo elimina la necessità per gli utenti di installare Python, creare virtual environment o installare dipendenze manualmente.

### 2. 🖼️ Gestione Avanzata Copertine
Il sistema attuale cerca un'immagine supportata nella cartella.
* **Copertine Incorporate:** Aggiornare lo script di parsing con `mutagen` per supportare l'estrazione delle copertine incorporate nei file audio (tag APIC per MP3, Picture per FLAC).
* **Caching:** Salvare queste immagini estratte in una cartella di cache dei media, così da avere copertine perfette anche per file mixati nella stessa cartella senza appesantire il database.

### 3. 📱 PWA e Frontend Moderno
Migliorare l'esperienza lato client per renderla simile a un'app nativa da installare sui dispositivi:
* **Progressive Web App (PWA):** Aggiungere un `manifest.json` e un *Service Worker*. Questo permetterà agli utenti di "installare" il sito web come un'app sul telefono (aggiungendola alla home screen), permettendo di utilizzarlo a schermo intero senza interfaccia browser.
* **Funzionamento Offline:** Implementare la logica nel Service Worker per rendere l'interfaccia dell'app disponibile senza rete, gestendo la cache e le chiamate API base.

### 4. 📝 Developer Experience (DX) e Presentazione
Rendere la repository GitHub più professionale per attrarre contributori e utenti:
* **Visuals nel README:** Aggiungere screenshot e GIF animate che mostrino il player in azione (soprattutto i visualizzatori a tempo di musica, l'equalizzatore e lo stile punk).
* **Gestione Dipendenze:** Generare un file `requirements.txt` aggiornato e pulito per facilitare l'installazione locale standard.
* **CONTRIBUTING.md:** Aggiungere un file che spieghi ad altri programmatori come configurare l'ambiente di sviluppo e come aiutarti a migliorare il codice (es. convenzioni su JS/Python, struttura moduli).
