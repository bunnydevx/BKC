require('v8-compile-cache');
const { ipcRenderer, webFrame } = require('electron');
const store = require('electron-store');
const config = new store();
const Toastify = require('toastify-js')

webFrame.insertCSS(`
/*!
* Toastify js 1.12.0
* https://github.com/apvarun/toastify-js
* @license MIT licensed
*
* Copyright (C) 2018 Varun A P
*/
.toastify{padding:12px 20px;color:#fff;display:inline-block;box-shadow:0 3px 6px -1px rgba(0,0,0,.12),0 10px 36px -4px rgba(77,96,232,.3);background:-webkit-linear-gradient(315deg,#73a5ff,#5477f5);background:linear-gradient(135deg,#73a5ff,#5477f5);position:fixed;opacity:0;transition:all .4s cubic-bezier(.215, .61, .355, 1);border-radius:2px;cursor:pointer;text-decoration:none;max-width:calc(50% - 20px);z-index:2147483647}.toastify.on{opacity:1}.toast-close{background:0 0;border:0;color:#fff;cursor:pointer;font-family:inherit;font-size:1em;opacity:.4;padding:0 5px}.toastify-right{right:15px}.toastify-left{left:15px}.toastify-top{top:-150px}.toastify-bottom{bottom:-150px}.toastify-rounded{border-radius:25px}.toastify-avatar{width:1.5em;height:1.5em;margin:-7px 5px;border-radius:2px}.toastify-center{margin-left:auto;margin-right:auto;left:0;right:0;max-width:fit-content;max-width:-moz-fit-content}@media only screen and (max-width:360px){.toastify-left,.toastify-right{margin-left:auto;margin-right:auto;left:0;right:0;max-width:fit-content}}
`)

const log = (...a) => {
    console.log('%cBestKourClient', 'font-size:12px;font-weight:bold;color:white;background-color:blue;border-radius:4px;padding:2px 6px;', ...a);
};

const settingsCache = config.get('settings', {
    blockAds: false,
    enableCrosshair: false,
    crosshairPath: '',
});

ipcRenderer.on('updateSettingsCache', (e, key, val) => {
    log('Settings Cache Updated:', key, val);
    settingsCache[key] = val;

    switch (key) {
        case 'enableCrosshair':
        case 'crosshairPath':
            initCustomCrosshair();
            break;
        default:
            break;
    }
});

ipcRenderer.on('ESC', () => document.exitPointerLock());

const initAdBlock = (addWarnings = false) => {
    if (!settingsCache.blockAds) return;

    if (addWarnings) {
        const showAdToast = () => {
            window.unityInstance.SendMessage('MainManager', 'OnDaReveresedFinishedJS', 'Failed');

            Toastify({
                text: 'You must disable \'blockAds\' in settings!',
                duration: 6000,
                newWindow: true,
                close: true,
                gravity: 'top',
                position: 'left',
                stopOnFocus: true,
                style: {
                    background: 'linear-gradient(to right, #00b09b, #96c93d)',
                },
                onClick: () => { }
            }).showToast();
        };

        window.showMid = showAdToast;
        window.showRe = showAdToast;
    } else {
        Object.defineProperty(window, 'isPokiPlayground', {
            value: true,
            writable: false,
        });
    }
};

const initCustomCrosshair = () => {
    if (!settingsCache.crosshairPath) return;
    document.getElementById('customCrosshair')?.remove();
    if (settingsCache.enableCrosshair) document.body.insertAdjacentHTML('beforeEnd', `<img id="customCrosshair" src="https://bkc.sexy/${settingsCache.crosshairPath}" style="user-select: none; pointer-events: none; position: absolute; z-index: 99999999; top: 0; left:0; right:0; bottom:0; margin:auto;"></img>`);
};

initAdBlock();

document.addEventListener('DOMContentLoaded', () => {
    log('Hi :D');

    initAdBlock(true);
    initCustomCrosshair();

    ipcRenderer.invoke('getUpdaterMSG').then((arr) => {
        if (!arr) return;
        const [hasRun, updaterError, updateAvailable, currentVersion, newVersion] = arr;

        if (!hasRun) {
            Toastify({
                text: 'Welcome To BestKourClient :D\nClick this message to join our Discord',
                duration: 12000,
                newWindow: true,
                close: true,
                gravity: 'top',
                position: 'left',
                stopOnFocus: true,
                onClick: () => { window.open('https://discord.gg/WxJGrgZnZT') },
            }).showToast();
        }

        if (updaterError) {
            Toastify({
                text: 'Error checking for updates...',
                duration: 6000,
                newWindow: true,
                close: true,
                gravity: 'top',
                position: 'left',
                stopOnFocus: true,
                style: {
                    background: `linear-gradient(to right, #ff2100, #ba2121)`,
                },
                onClick: (updateAvailable) ? () => { window.open('https://github.com/AceSilentKill/BCK/releases/latest'); } : () => { },
            }).showToast();
            return;
        }

        Toastify({
            text: (updateAvailable) ? `A BKC update is available (${currentVersion} -> ${newVersion})` : 'BKC is up-to-date :D',
            duration: 6000,
            newWindow: true,
            close: true,
            gravity: 'top',
            position: 'left',
            stopOnFocus: true,
            style: {
                background: `linear-gradient(to right, ${(updateAvailable) ? '#ff2100, #ba2121' : '#96c93d, #269400'})`,
            },
            onClick: (updateAvailable) ? () => { window.open('https://github.com/AceSilentKill/BCK/releases/latest'); } : () => { },
        }).showToast();
    });
});