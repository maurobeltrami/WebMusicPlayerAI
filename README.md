# 🎵 Web Music Player AI (Django + Web Audio API)

Un lettore musicale web moderno e scalabile costruito con **Django** (Backend API) e **JavaScript/HTML/CSS** (Frontend), con funzionalità di **visualizzazione audio in tempo reale** e una struttura predisposta per l'integrazione di un'Intelligenza Artificiale (AI) per la generazione di playlist.

---

## ✨ Caratteristiche Principali

* **Lettore Multitraccia:** Supporta la riproduzione di file audio comuni (**mp3**, **ogg**, **flac**, ecc.) serviti staticamente.
* **Gestione Playlist:** Include funzionalità di riproduzione, avanzamento, precedente e **Shuffle**.
* **Filtri Dinamici:** Permette di filtrare la libreria musicale per **Artista** e **Album**, leggendo i metadati audio tramite la libreria `mutagen` (**ID3 tag**).
* **Visualizzatore Audio:** Implementa la visualizzazione reattiva delle **forme d'onda** e delle frequenze utilizzando la **Web Audio API**.
* **Scalabilità AI:** Struttura pronta per l'integrazione di un motore AI per la generazione di playlist tematiche (funzionalità in sviluppo).

---

## 💻 Guida Completa all'Installazione e Avvio

Questa sezione contiene tutti i comandi necessari per clonare, configurare l'ambiente e avviare l'applicazione in locale.

### Fase 1: Clonazione e Setup dell'Ambiente

1.  **Clona il Repository:**
    Apri il tuo terminale e usa il seguente comando per clonare il codice sorgente:

    ```bash
    git clone https://github.com/maurobeltrami/WebMusicPlayerAI
    cd WebMusicPlayerAI
    ```

2.  **Crea l'Ambiente Virtuale (venv):**
    Crea un ambiente virtuale per isolare le dipendenze del progetto:

    ```bash
    python3 -m venv venv
    ```

3.  **Attiva l'Ambiente Virtuale:**
    Attiva l'ambiente per lavorare nel contesto isolato:

    ```bash
    # Su Linux/macOS
    source venv/bin/activate
    
    # Su Windows (Command Prompt)
    .\venv\Scripts\activate
    ```

### Fase 2: Installazione delle Dipendenze

1.  **Installa i Pacchetti Python:**
    Installa le librerie Django, Django Rest Framework e le dipendenze per i metadati (`mutagen`) e le API (`django-cors-headers`):

    ```bash
    pip install Django djangorestframework django-cors-headers mutagen
    ```

    *Nota: Se desideri un file `requirements.txt`, crea il file ed esegui `pip freeze > requirements.txt`, quindi installa in un ambiente pulito con `pip install -r requirements.txt`.*

### Fase 3: Configurazione del Database e dei File Statici

1.  **Esegui le Migrazioni del Database:**
    Applica le migrazioni di Django (utilizzando SQLite come database predefinito):

    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```

2.  **Raccogli i File Statici:**
    Prepara i file statici (CSS, JavaScript, ecc.) per essere serviti:

    ```bash
    python manage.py collectstatic --noinput
    ```

### Fase 4: Avvio dell'Applicazione

1.  **Avvia il Server di Sviluppo:**
    Avvia l'applicazione Django. Il server sarà disponibile per l'accesso locale:

    ```bash
    python manage.py runserver
    ```

2.  **Accesso:**
    Apri il tuo browser all'indirizzo `http://127.0.0.1:8000/` per visualizzare il Web Music Player.

---

## 🧠 Integrazione AI (Sviluppo Futuro)

Il progetto è pensato per integrare un motore di intelligenza artificiale per l'elaborazione di playlist basate su prompt.

* **Strumenti Previsti:** L'integrazione avverrà tramite **Ollama** per l'esecuzione di **LLM (Large Language Models)** locali che interagiranno con l'API del Player.