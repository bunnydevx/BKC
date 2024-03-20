require('v8-compile-cache');
const { ipcRenderer } = require('electron');
const store = require('electron-store');
const config = new store();

const crosshairImage = config.get('settings.crosshairPath', '');
const enableCrosshair = config.get('settings.enableCrosshair', '');

document.addEventListener('DOMContentLoaded', () => {
    if (enableCrosshair && crosshairImage) {
        document.body.insertAdjacentHTML('beforeEnd', `<img src="https://bkc.sexy/${crosshairImage}" style="pointer-events: none; position: absolute; z-index: 99999999; top: 0; left:0; right:0; bottom:0; margin:auto;"></img>`);
    }
});

ipcRenderer.on('ESC', () => document.exitPointerLock());