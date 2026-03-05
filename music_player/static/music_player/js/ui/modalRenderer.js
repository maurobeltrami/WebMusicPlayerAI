// ui/modalRenderer.js - UI per i modali

export function renderTrackSelection(listEl, library, filterText = '', selectedIds = []) {
    if (!listEl) return;
    if (library.length === 0) {
        listEl.innerHTML = '<p class="p-4 text-gray-500 text-center text-sm">Nessun brano trovato nella libreria.</p>';
        return;
    }

    const tracks = library.filter(t =>
        !filterText ||
        t.title.toLowerCase().includes(filterText.toLowerCase()) ||
        t.artist.toLowerCase().includes(filterText.toLowerCase())
    );

    if (tracks.length === 0) {
        listEl.innerHTML = '<p class="p-4 text-gray-500 text-center text-sm">Nessuna corrispondenza.</p>';
        return;
    }

    listEl.innerHTML = tracks.map(t => {
        const isChecked = selectedIds.includes(String(t.id)) ? 'checked' : '';
        const safeId = String(t.id).replace(/"/g, '&quot;');
        return `
            <div class="flex items-center p-2 border-b border-gray-200 hover:bg-gray-100">
                <input type="checkbox" class="track-checkbox mr-3 h-5 w-5 accent-black"
                       value="${safeId}" ${isChecked}>
                <div class="truncate text-sm select-none cursor-pointer" onclick="this.previousElementSibling.click()">
                    <span class="font-bold">${t.title}</span>
                    <span class="text-xs text-gray-500">- ${t.artist}</span>
                </div>
            </div>
        `;
    }).join('');
}
