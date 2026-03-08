# 🎵 Web Music Player (SPA + Django + GDrive Proxy)

Un lettore musicale web moderno, scalabile e completamente Responsive costruito con **Django** (Backend API & Proxy) e **JavaScript/HTML/CSS** (Frontend Architettura Single Page Application), con funzionalità avanzate di **streaming da Google Drive** e un Database interno per l'indicizzazione ultrarapida.

---

## ✨ Caratteristiche Principali

* **Architettura SPA (Single Page Application):** Navigazione fluida e istantanea in puro Javascript, la musica non si interrompe mai passando tra Libreria, Playlist e l'Equalizzatore Master.
* **Lettore Multitraccia e Proxy Cloud:** Supporta la riproduzione locale di file audio (mp3, wav, flac, ogg) e lo **streaming proxy da Google Drive**, permettendo di ascoltare l'intera libreria cloud senza occupare spazio sul dispositivo.
* **Equalizzatore Master:** Include un equalizzatore a 3 bande (Bassi, Medi, Alti), controllo del guadagno, Bass Boost e un Compressore Dinamico integrato via Web Audio API. 
* **Gestione Playlist Avanzata:** Database SQLite per indicizzare file e salvare Playlist personalizzate richiamabili rapidamente.
* **Visualizzatore Audio:** Implementa visualizzazioni reattive (Forma d'onda, Barre, Cerchi) in tempo reale analizzando le frequenze audio.

---

## 📱 Guida all'Installazione su Android tramite Termux

Questa applicazione è stata testata ed è perfettamente compatibile con **Termux** su Android, poiché utilizza dipendenze pure in Python (senza estensioni C complesse che richiedono compilatori).

### Fase 1: Setup di Base su Termux

1.  Apri Termux e aggiorna i pacchetti base:
    ```bash
    pkg update && pkg upgrade
    ```
2.  Installa Python, Git e sqlite (fondimentale per il database di Django):
    ```bash
    pkg install python git sqlite
    ```
3.  Dai a Termux il permesso di accedere alla memoria del telefono (per leggere la tua musica locale):
    ```bash
    termux-setup-storage
    ```

### Fase 2: Clonazione e Installazione

1.  Clona il repository nella memoria interna:
    ```bash
    cd ~/storage/shared/
    git clone https://github.com/maurobeltrami/WebMusicPlayerAI
    cd WebMusicPlayerAI
    ```
2.  (Opzionale ma consigliato) Crea l'Ambiente Virtuale:
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```
3.  Installa i requisiti indispensabili:
    ```bash
    pip install django djangorestframework django-cors-headers mutagen requests
    ```
4.  Installa i pacchetti opzionali per l'accesso a Google Drive (se intendi streammare dal cloud):
    ```bash
    pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
    ```

### Fase 3: Avvio e Scansione

1.  Avvia le migrazioni del database:
    ```bash
    python manage.py migrate
    ```
2.  Avvia la scansione della tua memoria per cercare la musica.
    *Assicurati che la variabile `MUSIC_ROOT` nel file `core/settings.py` punti a una cartella valida del tuo telefono (es. `/storage/emulated/0/Music`).*
    ```bash
    python manage.py scan_music
    ```
3.  Se vuoi aggiungere anche Google Drive, esegui:
    ```bash
    python manage.py scan_music --gdrive
    ```
    *(Nota: richiede il caricamento preventivo del tuo file `client_secret.json` scaricato dalla Google Cloud Console nella root del progetto).*
4.  Avvia il server per accedere all'app dal browser del telefono:
    ```bash
    python manage.py runserver 0.0.0.0:8000
    ```
5.  Apri Chrome o il tuo browser preferito su Android e digita: `http://localhost:8000`

---

## 💻 Installazione Standard (Mac/Linux/Windows)

I passaggi sono identici a Termux, utilizza il tuo terminale standard e assicurati di avere Python 3.10+ installato.
Per ambiente di sviluppo locale rapido:
```bash
python -m venv venv
source venv/bin/activate
pip install django djangorestframework django-cors-headers mutagen requests google-api-python-client google-auth-httplib2 google-auth-oauthlib
python manage.py migrate
python manage.py scan_music
python manage.py runserver
```