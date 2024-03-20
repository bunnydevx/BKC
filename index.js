require('v8-compile-cache');
const { BrowserWindow, app, dialog, ipcMain, protocol } = require('electron');
const path = require('path');
const localShortcut = require('electron-localshortcut');
const log = require('electron-log');
const store = require('electron-store');
const config = new store();

let settingsWindow, gameWindow, settingsCache = config.get('settings', {
    blockAds: false,
    enableCrosshair: false,
    crosshairPath: '',
});

class BigBlackCock {
    constructor() {
        const cock = new BrowserWindow({
            width: config.get('window.width', 1500),
            height: config.get('window.height', 1000),
            x: config.get('window.x'),
            y: config.get('window.y'),
            show: false,
            title: '[BKC Client] Kour',
            webPreferences: {
                contextIsolation: false,
                preload: path.join(__dirname, 'js', 'preload', 'game.js'),
                devTools: true,
            },
        });

        cock.removeMenu();
        cock.setBackgroundColor('#2f2f2f');

        if (config.get('window.maximized', false)) cock.maximize();
        if (config.get('window.fullscreen', false)) cock.setFullScreen(true);

        cock.once('ready-to-show', () => { cock.show(); });
        cock.on('page-title-updated', (e) => { e.preventDefault(); });

        [
            ['Esc', () => {
                cock.webContents.send('ESC');
            }],
            ['F4', () => {
                let txt = clipboard.readText();
                if (!txt) return;
                let hostname;
                try {
                    hostname = new URL(txt).hostname;
                } catch {
                    hostname = '';
                }
                if (hostname === 'kour.io') {
                    cock.loadURL(txt);
                } else {
                    txt = 'https://kour.io#' + txt;
                    cock.loadURL(txt);
                    log.info(`[Join Hotkey] Attempted to join '${txt}'`)
                }
            }],
            ['F5', () => {
                cock.reload();
            }],
            ['F6', () => {
                cock.loadURL('https://kour.io');
            }],
            ['F7', () => {
                clipboard.writeText(cock.webContents.getURL());
            }],
            ['F8', () => {
                if (!settingsWindow?.focus) settingsWindow = new MediumBlackCock();
                settingsWindow.focus();
            }],
            ['F11', () => {
                const isFullScreen = cock.isFullScreen();
                config.set('window.fullscreen', !isFullScreen);
                cock.setFullScreen(!isFullScreen);
            }],
            [
                ['CommandOrControl+F1', 'F12', 'CommandOrControl+Shift+I'], () => {
                    cock.webContents.openDevTools();
                }
            ],
            ['Alt+F4', () => {
                cock.close();
            }],
        ].forEach((k) => {
            try {
                localShortcut.register(cock, k[0], k[1]);
            } catch (e) {
                log.info('[LocalShortcut] ERROR:', e);
            }
        });

        cock.webContents.session.webRequest.onBeforeRequest((details, callback) => {
            if (settingsCache.blockAds && details.url && (details.url.includes('poki.com') || details.url.includes('poki.io'))) {
                callback({
                    redirectURL: 'https://google.com',
                });
            } else if (settingsCache.enableCrosshair && details.url && details.url.includes('bkc.sexy')) {
                callback({
                    redirectURL: 'bkc://' + path.join(new URL(details.url).pathname),
                });
            } else {
                callback({});
            }
        });

        cock.loadURL('https://kour.io');

        cock.on('close', () => {
            if (settingsWindow && settingsWindow?.close !== undefined) settingsWindow.close();

            const isMaximized = cock.isMaximized();
            const isFullScreen = cock.isFullScreen();
            const windowSize = cock.getSize();
            const windowPosition = cock.getPosition();

            config.set('window.maximized', isMaximized);
            config.set('window.fullscreen', isFullScreen);
            if (!(isMaximized || isFullScreen)) {
                config.set('window.width', windowSize[0]);
                config.set('window.height', windowSize[1]);
                config.set('window.x', windowPosition[0]);
                config.set('window.y', windowPosition[1]);
            }
        });

        return cock;
    }
};

class MediumBlackCock {
    constructor() {
        const cock = new BrowserWindow({
            width: 400,
            height: 260,
            fullscreen: false,
            maximizable: false,
            resizable: false,
            alwaysOnTop: true,
            x: config.get('window2.x'),
            y: config.get('window2.y'),
            show: false,
            title: '[BKC Client] Settings',
            webPreferences: {
                contextIsolation: false,
                preload: path.join(__dirname, 'js', 'preload', 'settings.js'),
                devTools: false,
            },
        });

        [
            ['Esc', () => {
                cock.webContents.send('ESC');
            }],
            ['F5', () => {
                cock.reload();
            }],
            ['Alt+F4', () => {
                cock.close();
            }],
        ].forEach((k) => {
            try {
                localShortcut.register(cock, k[0], k[1]);
            } catch (e) {
                log.info('[LocalShortcut] ERROR:', e);
            }
        });

        cock.removeMenu();
        cock.setBackgroundColor('#2f2f2f');

        cock.once('ready-to-show', () => { cock.show(); });
        cock.on('page-title-updated', (e) => { e.preventDefault(); });

        cock.loadURL(path.join(__dirname, 'html', 'settings.html'));

        cock.on('close', () => {
            const windowPosition = cock.getPosition();
            config.set('window2.x', windowPosition[0]);
            config.set('window2.y', windowPosition[1]);
            settingsWindow = null;
        });

        return cock;
    }
};

// https://github.com/advisories/GHSA-mpjm-v997-c4h4
delete require('electron').nativeImage.createThumbnailFromPath;

// Single Instance
if (!app.requestSingleInstanceLock()) {
    console.log('[!] Other BKC processes already exist. If you can\'t see the window, please kill all BKC task(s) before trying again.');
    app.exit();
}

// Flags
[
    ['disable-frame-rate-limit'],
    ['disable-gpu-vsync'],
    ['max-gum-fps', '9999'],
    ['enable-gpu-rasterization'],
    ['enable-oop-rasterization'],
    ['disable-zero-copy'],
    ['enable-webgl2-compute-context'],
    ['enable-highres-timer'],
    ['enable-high-resolution-time'],
    ['disable-renderer-backgrounding'],
    ['disable-background-timer-throttling'],
    ['enable-javascript-harmony'],
    ['enable-future-v8-vm-features'],
    ['enable-webgl'],
    ['disable-2d-canvas-clip-aa'],
    ['disable-bundled-ppapi-flash'],
    ['disable-logging'],
    ['disable-breakpad'],
    ['disable-print-preview'],
    ['disable-hang-monitor'],
    ['disable-component-update'],
    ['disable-metrics-repo'],
    ['disable-metrics'],
    ['max-active-webgl-contexts', '100'],
    ['webrtc-max-cpu-consumption-percentage', '100'],
    ['renderer-process-limit', '100'],
    ['ignore-gpu-blacklist'],
    ['enable-accelerated-2d-canvas'],
    ['enable-quic'],
    ['enable-native-gpu-memory-buffers'],
    ['high-dpi-support', '1'],
    ['no-pings'],
    ['disable-low-end-device-mode'],
    ['enable-accelerated-video-decode'],
    ['no-proxy-server'],
].forEach(x => app.commandLine.appendSwitch(...x));

ipcMain.handle('openFileDialog', (e, title = '', filtersArr = []) => {
    const result = dialog.showOpenDialogSync(null, {
        properties: ['openFile'],
        title: '[BKC Client] ' + title,
        defaultPath: '.',
        filters: filtersArr,
    });
    return result;
});

ipcMain.on('updateSettingsCache', (e, key, val) => {
    settingsCache[key] = val;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(() => {
    protocol.registerFileProtocol('bkc', (request, callback) => callback(decodeURI(request.url.replace(/^bkc:\//, ''))));
    gameWindow = new BigBlackCock();
})