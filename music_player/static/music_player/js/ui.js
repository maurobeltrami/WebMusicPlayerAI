// ui.js - Gestione Interfaccia e Utilità
export const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

export function updatePlaylistView(playlist, currentIndex, isPlaying, elements, actions) {
    const { playlistEl, nextBtn, prevBtn, shuffleBtn } = elements;
    playlistEl.innerHTML = '';

    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-3 rounded-lg shadow-sm mb-2 transition-all duration-200 ' +
            (index === currentIndex ? 'bg-blue-600 text-white scale-[1.02]' : 'bg-white hover:bg-gray-100 text-gray-800');

        // Contenitore info brano
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 truncate mr-2 cursor-pointer';
        infoDiv.innerHTML = `<span class="font-bold opacity-50 mr-2">${index + 1}.</span> ${track.title} - ${track.artist}`;
        infoDiv.onclick = () => actions.onLoadTrack(index);

        // Contenitore bottoni
        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex items-center space-x-3';

        // NUOVO: Tasto Aggiungi a Playlist (+)
        const addBtn = document.createElement('button');
        addBtn.innerHTML = '<i class="fas fa-plus-circle"></i>';
        addBtn.className = (index === currentIndex ? 'text-blue-200' : 'text-blue-500') + ' hover:scale-110 transition-transform';
        addBtn.title = "Gestisci playlist brano";
        addBtn.onclick = (e) => {
            e.stopPropagation();
            actions.onAddToPlaylist(track.id);
        };

        // Bottone Rimuovi dalla coda (X)
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.className = (index === currentIndex ? 'text-white/70' : 'text-gray-300') + ' hover:text-red-500 transition-colors p-1';
        removeBtn.title = "Rimuovi dalla coda";
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            actions.onRemoveTrack(index);
        };

        btnGroup.appendChild(addBtn);
        btnGroup.appendChild(removeBtn);

        li.appendChild(infoDiv);
        li.appendChild(btnGroup);
        playlistEl.appendChild(li);

        if (index === currentIndex && isPlaying) {
            li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    const hasTracks = playlist.length > 0;
    nextBtn.disabled = !hasTracks;
    prevBtn.disabled = !hasTracks;
    shuffleBtn.classList.toggle('active', actions.isShuffling);
}