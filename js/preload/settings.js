require('v8-compile-cache');
const { ipcRenderer } = require('electron');
const log = require('electron-log');
const store = require('electron-store');
const config = new store();

const getVal = (key, defaultVal) => document.getElementById(key).checked = config.get(`settings.${key}`, defaultVal);

let allowOFD = true;

window.openFileDialog = () => {
    if (!allowOFD) return;
    allowOFD = false;

    ipcRenderer.invoke('openFileDialog', 'Crosshair Image Picker', [{ name: 'Raster Image', extensions: ['jpg', 'png', 'webp'] }])
    .then(val => {
        const key = 'settings.crosshairPath';

        config.set(key, val);
        ipcRenderer.send('updateSettingsCache', key, val);

        log.info(`[Settings] Set '${key}' to '${val}'`);
    })
    .catch(err => {
        log.info('[Settings] Error:', err);
    })
    .finally(() => {
        allowOFD = true;
    })
};

window.handleSwitch = (element) => {
    const key = `settings.${element.id}`;
    const val = element.checked;

    config.set(key, val);
    ipcRenderer.send('updateSettingsCache', key, val);

    log.info(`[Settings] Set '${key}' to '${val}'`);
};

document.addEventListener("DOMContentLoaded", () => {
    getVal('blockAds');
    getVal('enableCrosshair');
});

ipcRenderer.on('ESC', () => { document.exitPointerLock(); });