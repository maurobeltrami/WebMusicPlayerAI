// themeManager.js - Gestisce il cambio di stile dell'app

const THEME_KEY = 'mauro_music_player_theme';
const DEFAULT_THEME = 'dark';

export function initTheme() {
    // 1. Leggi tema salvato
    const savedTheme = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
    
    // 2. Applica al DOM
    applyTheme(savedTheme);

    // 3. Imposta il select dell'UI per rispecchiare il tema pre-selezionato
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
        themeSelector.value = savedTheme;
        
        // 4. Collega event listener al selettore
        themeSelector.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            applyTheme(newTheme);
            localStorage.setItem(THEME_KEY, newTheme);
        });
    }
}

function applyTheme(themeName) {
    if (themeName === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (themeName === 'punk') {
        document.documentElement.setAttribute('data-theme', 'punk');
    } else {
        // default fallback to 'dark'
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
