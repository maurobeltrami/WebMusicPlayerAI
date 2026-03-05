# Roadmap Sviluppo Web Music Player (Open Source)

Questo documento riassume i principali punti di intervento per trasformare l'attuale lettore musicale in un solido progetto open source, accattivante e facile da usare per la community.

## 1. 🐳 Dockerizzazione (Facilità d'uso)
Per permettere a chiunque di installare il player in pochi secondi (es. su NAS, Raspberry Pi, server domestici):
* Creare un `Dockerfile` per pacchettizzare l'app Django.
* Creare un `docker-compose.yml` che permetta di avviare l'app e montare la propria libreria musicale come volume (es. `- /path/alla/musica:/music_data:ro`).
* Questo elimina la necessità per gli utenti di installare Python, creare virtual environment o installare dipendenze manualmente.

## 2. ⚡ Indicizzazione nel Database (Performance)
Attualmente l'API scansiona l'intero disco (`glob('**/*')`) e legge i tag (`mutagen`) ad ogni caricamento, il che è insostenibile per librerie di grandi dimensioni.
* **Database:** Creare un modello Django `Track` (es. titolo, artista, album, path, durata).
* **Scansione:** Sviluppare un comando personalizzato (es. `python manage.py scan_music`) o una task in background che popoli il database leggendo i file una sola volta.
* **API Veloci:** Modificare le view (`TrackListView`, `MetadataFilterView`) affinché peschino i dati direttamente dal database SQLite (risposte in millisecondi anziché minuti).

## 3. 🖼️ Gestione Avanzata Copertine
Il sistema attuale cerca un'immagine `folder.jpg` nella cartella.
* **Copertine Incorporate:** Aggiornare lo script di parsing con `mutagen` per supportare l'estrazione delle copertine incorporate nei file audio (tag APIC per MP3, Picture per FLAC).
* **Caching:** Salvare queste immagini estratte in una cartella di cache dei media, così da avere copertine perfette anche per file mixati nella stessa cartella.

## 4. 📱 PWA e Frontend Moderno
Migliorare l'esperienza lato client per renderla simile a un'app nativa:
* **Progressive Web App (PWA):** Aggiungere un `manifest.json` e un *Service Worker*. Questo permetterà agli utenti di "installare" il sito web come un'app sul telefono (aggiungendola alla home screen).
* **Framework futuri (Opzionale):** Valutare la migrazione del frontend Vanilla JS verso framework più strutturati (es. React, Svelte, Vue) se il progetto cresce in complessità.

## 5. 📝 Developer Experience (DX) e Presentazione
Rendere la repository GitHub più professionale per attrarre contributori:
* **Visuals nel README:** Aggiungere screenshot e GIF animate che mostrino il player in azione (soprattutto i visualizzatori a tempo di musica e lo stile punk).
* **Gestione Dipendenze:** Generare un file `requirements.txt` aggiornato o passare a sistemi come `poetry` per bloccare le versioni.
* **CONTRIBUTING.md:** Aggiungere un file che spieghi ad altri programmatori come configurare l'ambiente di sviluppo e come aiutarti a migliorare il codice.

## 6. 🎛️ Pagina di Equalizzazione Professionale
Aggiungere una sezione o una pagina dedicata esclusivamente all'audio processing:
* **Equalizzatore Parametrico:** Implementare un EQ grafico o parametrico utilizzando la Web Audio API, permettendo agli utenti di calibrare il suono con precisione.
* **Effetti e Preset:** Possibilità di applicare effetti sonori o salvare i propri preset di equalizzazione preferiti.

## 7. 🎨 Selettore di Stili (Temi)
Permettere un'alta personalizzazione estetica del player:
* **Cambio Tema Rapido:** Introdurre un semplice bottone o menu a tendina per passare tra diversi temi (es. "Punk", "Dark Mode", "Retro", "Minimal") con un solo clic.
* **Variabili CSS:** Assicurarsi che tutto lo styling si basi su variabili CSS dinamiche per supportare un cambio istantaneo senza ricaricare la pagina.
