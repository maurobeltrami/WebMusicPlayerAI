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

Questa applicazione è stata ottimizzata per girare perfettamente su **Termux** per Android. Puoi utilizzare lo script automatico fornito oppure eseguire l'installazione manuale per bypassare i tipici errori di compilazione e autorizzazione file.

### 🚀 Installazione Rapida (Consigliata)

Apri Termux e utilizza gli script automatizzati per configurare e avviare l'app in pochi minuti:

1. **Clona il repository:**
   ```bash
   pkg install git
   git clone https://github.com/maurobeltrami/WebMusicPlayerAI
   cd WebMusicPlayerAI
   ```

2. **Esegui lo script di setup automatico:**
   Questo script installerà le dipendenze di sistema corrette (incluso python-cryptography pre-compilato), creerà l'ambiente Python e configurerà le cartelle necessarie.
   ```bash
   chmod +x setup_termux.sh
   ./setup_termux.sh
   ```

3. **Avvia il server:**
   Usa lo script di avvio che impedisce ad Android di sospendere la CPU e lancia il server sulla porta 8250.
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

4. **Ascolta la tua libreria:**
   Metti la tua musica nella cartella `media_music/` all'interno del progetto, oppure abilita lo streaming proxy configurando l'API di Google Drive (vedi sotto).
   Apri il browser del telefono: `http://localhost:8250`

### 🛠️ Installazione Manuale

Se preferisci controllare ogni passaggio per evitare compilatori pesanti su cellulare:

1. **Installazione dipendenze di sistema:**
   Evitiamo la compilazione pesante di `cryptography` installando il pacchetto pre-compilato di Termux:
   ```bash
   pkg update && pkg upgrade -y
   pkg install python python-cryptography binutils rust termux-api -y
   ```

2. **Creazione Ambiente Virtuale VENV:**
   Usiamo `--system-site-packages` per agganciare i pacchetti pre-compilati.
   ```bash
   python -m venv --system-site-packages venv
   source venv/bin/activate
   ```

3. **Installazione requisiti applicativi in Python:**
   ```bash
   pip install --upgrade pip
   pip install django djangorestframework google-api-python-client google-auth-oauthlib mutagen
   ```

4. **Preparazione cartelle e Database:**
   Creiamo la cartella `media_music` direttamente dentro il progetto per aggirare i blocchi dei Symlink (SDCard Proxying) in Termux.
   ```bash
   mkdir -p media_music
   python manage.py migrate
   python manage.py scan_music --gdrive
   ```
   *(Ricordati di inserire il file `client_secret.json` scaricato dalla Google Cloud Console nella cartella principale se attivi GDrive.)*

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