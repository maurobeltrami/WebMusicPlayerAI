// app.js - ROOT ENTRY POINT
// Questa app è architetturata secondo i principi "Extreme Modularization"

import { initApp } from './init/boot.js?v=8';

window.addEventListener('DOMContentLoaded', initApp);