require('v8-compile-cache');
const { ipcRenderer } = require('electron');
const log = require('electron-log');
const store = require('electron-store');
const config = new store();

const getVal = (key, defaultVal = false) => document.getElementById(key).checked = config.get(`settings.${key}`, defaultVal);

let allowOFD = true;

window.openFileDialog = () => {
    if (!allowOFD) return;
    allowOFD = false;

    ipcRenderer.invoke('openFileDialog', 'Crosshair Image Picker', [{ name: 'Raster Image', extensions: ['jpg', 'png', 'webp'] }])
    .then(val => {
        if (!val) {
            log.info(`[Settings] No File Selected, kept old value for 'settings.crosshairPath'`);

            return;
        }

        config.set('settings.crosshairPath', val);
        ipcRenderer.send('updateSettingsCache', 'crosshairPath', val);

        log.info(`[Settings] Set 'settings.crosshairPath' to '${val}'`);
    })
    .catch(err => {
        log.info('[Settings] Error:', err);
    })
    .finally(() => {
        allowOFD = true;
    })
};

window.handleSwitch = (element) => {
    config.set(`settings.${element.id}`, element.checked);
    ipcRenderer.send('updateSettingsCache', element.id, element.checked);

    log.info(`[Settings] Set 'settings.${element.id}' to '${element.checked}'`);
};

document.addEventListener("DOMContentLoaded", () => {
    getVal('inProcessGPU', (process.platform === 'win32'));
    getVal('enableRPC');
    getVal('blockAds');
    getVal('enableCrosshair');
});

ipcRenderer.on('ESC', () => { document.exitPointerLock(); });