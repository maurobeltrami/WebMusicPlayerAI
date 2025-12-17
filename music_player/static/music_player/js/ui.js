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
        li.className = 'flex justify-between items-center p-3 rounded-lg cursor-pointer shadow-sm mb-2 transition-all duration-200 ' +
            (index === currentIndex ? 'bg-blue-600 text-white scale-[1.02]' : 'bg-white hover:bg-gray-100 text-gray-800');

        // Testo del brano
        const infoSpan = document.createElement('span');
        infoSpan.className = 'flex-1 truncate mr-2';
        infoSpan.textContent = `${index + 1}. ${track.title} - ${track.artist}`;
        infoSpan.onclick = () => actions.onLoadTrack(index);

        // Bottone per rimuovere (solo frontend)
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        removeBtn.className = 'text-red-400 hover:text-red-600 transition-colors p-1';
        removeBtn.title = "Rimuovi dalla coda";
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            actions.onRemoveTrack(index);
        };

        li.appendChild(infoSpan);
        li.appendChild(removeBtn);
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