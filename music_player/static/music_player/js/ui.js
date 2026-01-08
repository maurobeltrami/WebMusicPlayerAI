export const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

export function updatePlaylistView(playlist, currentIndex, isPlaying, elements, actions) {
    const { playlistEl, nextBtn, prevBtn, shuffleBtn } = elements;
    if (!playlistEl) return;
    playlistEl.innerHTML = '';

    playlist.forEach((track, index) => {
        const isCurrent = index === currentIndex;
        const li = document.createElement('li');

        li.className = `flex justify-between items-center p-3 rounded-lg shadow-sm mb-2 transition-all duration-200 ${isCurrent
            ? 'bg-blue-600 text-white scale-[1.02] border-l-4 border-blue-300'
            : 'bg-white hover:bg-gray-100 text-gray-800 border-l-4 border-transparent'
            }`;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 truncate mr-2 cursor-pointer';
        infoDiv.innerHTML = `
            <span class="font-bold opacity-50 mr-2">${index + 1}.</span>
            <span class="font-semibold">${track.title}</span> 
            <span class="text-[10px] uppercase opacity-70 ml-1">- ${track.artist}</span>
        `;
        infoDiv.onclick = () => actions.onLoadTrack(index);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex items-center space-x-4';

        const addBtn = document.createElement('button');
        addBtn.innerHTML = '<i class="fas fa-plus-circle fa-lg pointer-events-none"></i>';
        addBtn.className = `transition-transform hover:scale-125 p-1 ${isCurrent ? 'text-blue-200 hover:text-white' : 'text-blue-500 hover:text-blue-700'}`;
        addBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.onAddToPlaylist(track.id);
        };

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times pointer-events-none"></i>';
        removeBtn.className = `transition-colors p-1 ${isCurrent ? 'text-white/70 hover:text-red-300' : 'text-gray-300 hover:text-red-500'}`;
        removeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.onRemoveTrack(index);
        };

        btnGroup.appendChild(addBtn);
        btnGroup.appendChild(removeBtn);
        li.appendChild(infoDiv);
        li.appendChild(btnGroup);
        playlistEl.appendChild(li);

        if (isCurrent && isPlaying) {
            li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    if (nextBtn) nextBtn.disabled = playlist.length === 0;
    if (prevBtn) prevBtn.disabled = playlist.length === 0;

    if (shuffleBtn) {
        if (actions.isShuffling) {
            shuffleBtn.classList.add('bg-blue-100', 'text-blue-700', 'rounded-full', 'p-2', 'shadow-inner');
        } else {
            shuffleBtn.classList.remove('bg-blue-100', 'text-blue-700', 'rounded-full', 'p-2', 'shadow-inner');
        }
    }
}