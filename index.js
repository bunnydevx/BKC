require('v8-compile-cache');
const { BrowserWindow, app, dialog, ipcMain, protocol, shell, clipboard } = require('electron');
const https = require('https');
const path = require('path');
const localShortcut = require('electron-localshortcut');
const log = require('electron-log');
const store = require('electron-store');
const config = new store();

let settingsWindow, gameWindow, settingsCache = config.get('settings', {
    inProcessGPU: (process.platform === 'win32'),
    enableRPC: true,
    blockAds: false,
    enableCrosshair: false,
    crosshairPath: '',
});

if (settingsCache.enableRPC) new (require('./js/utils/rpcHandler'))();

const hasRun = config.get('hasRun', false);
if (!hasRun) config.set('hasRun', true);

class GameWindow {
    constructor() {
        const win = new BrowserWindow({
            width: config.get('window.width', 1500),
            height: config.get('window.height', 1000),
            x: config.get('window.x'),
            y: config.get('window.y'),
            show: false,
            title: '[BestKourClient] Kour',
            webPreferences: {
                contextIsolation: false,
                preload: path.join(__dirname, 'js/preload/game.js'),
                devTools: true,
            },
        });

        win.removeMenu();
        win.setBackgroundColor('#2f2f2f');

        if (config.get('window.maximized', false)) win.maximize();
        if (config.get('window.fullscreen', false)) win.setFullScreen(true);

        win.once('ready-to-show', () => { win.show(); });
        win.on('page-title-updated', (e) => { e.preventDefault(); });
        win.webContents.on('new-window', (e, url) => {
            e.preventDefault();
            shell.openExternal(url);
        });

        [
            ['Esc', () => {
                win.webContents.send('ESC');
            }],
            ['F3', () => {
                clipboard.writeText(win.webContents.getURL());
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
                    win.loadURL(txt);
                } else {
                    txt = 'https://kour.io/' + (txt.startsWith('#')) ? txt : '#' + txt;
                    win.loadURL(txt);
                    log.info(`[Join Hotkey] Attempting to join '${txt}'`)
                }
            }],
            ['F5', () => {
                win.reload();
            }],
            ['F6', () => {
                win.loadURL('https://kour.io');
            }],
            ['F8', () => {
                if (!settingsWindow?.focus) settingsWindow = new SettingsWindow();
                settingsWindow.focus();
            }],
            ['F11', () => {
                const isFullScreen = win.isFullScreen();
                config.set('window.fullscreen', !isFullScreen);
                win.setFullScreen(!isFullScreen);
            }],
            [
                ['CommandOrControl+F1', 'F12', 'CommandOrControl+Shift+I'], () => {
                    win.webContents.openDevTools({ mode: 'detach' });
                }
            ],
            ['Alt+F4', () => {
                win.close();
            }],
        ].forEach((k) => {
            try {
                localShortcut.register(win, k[0], k[1]);
            } catch (e) {
                log.info('[LocalShortcut] ERROR:', e);
            }
        });

        win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
            if (settingsCache.enableCrosshair && details.url.includes(`https://bkc.sexy/`)) {
                callback({
                    redirectURL: 'bkc://' + path.join(new URL(details.url).pathname),
                });
            } else {
                callback({});
            }
        });

        win.loadURL('https://kour.io/');

        win.on('close', () => {
            if (settingsWindow && settingsWindow?.close !== undefined) settingsWindow.close();

            const isMaximized = win.isMaximized();
            const isFullScreen = win.isFullScreen();
            const windowSize = win.getSize();
            const windowPosition = win.getPosition();

            config.set('window.maximized', isMaximized);
            config.set('window.fullscreen', isFullScreen);
            if (!(isMaximized || isFullScreen)) {
                config.set('window.width', windowSize[0]);
                config.set('window.height', windowSize[1]);
                config.set('window.x', windowPosition[0]);
                config.set('window.y', windowPosition[1]);
            }
        });

        return win;
    }
};

class SettingsWindow {
    constructor() {
        const win = new BrowserWindow({
            width: 400,
            height: 310,
            fullscreen: false,
            maximizable: false,
            resizable: false,
            alwaysOnTop: true,
            show: false,
            title: '[BestKourClient] Settings',
            webPreferences: {
                contextIsolation: false,
                preload: path.join(__dirname, 'js/preload/settings.js'),
                devTools: false,
            },
        });

        [
            ['Esc', () => {
                win.webContents.send('ESC');
            }],
            ['F5', () => {
                win.reload();
            }],
            ['Alt+F4', () => {
                win.close();
            }],
        ].forEach((k) => {
            try {
                localShortcut.register(win, k[0], k[1]);
            } catch (e) {
                log.info('[LocalShortcut] ERROR:', e);
            }
        });

        win.removeMenu();
        win.setBackgroundColor('#2f2f2f');

        win.once('ready-to-show', () => { win.show(); });
        win.on('page-title-updated', (e) => { e.preventDefault(); });

        win.loadURL(path.join(__dirname, 'html/settings.html'));

        win.on('close', () => {
            const windowPosition = win.getPosition();
            config.set('window2.x', windowPosition[0]);
            config.set('window2.y', windowPosition[1]);
            settingsWindow = null;
        });

        return win;
    }
};

// https://github.com/advisories/GHSA-mpjm-v997-c4h4 :D
delete require('electron').nativeImage.createThumbnailFromPath;

if (!app.requestSingleInstanceLock()) {
    console.log('[!] Other BestKourClient processes already exist. If you can\'t see the window, please kill all BestKourClient task(s) before trying again.');
    app.exit();
}

if (!['win32', 'darwin'].includes(process.platform)) app.commandLine.appendSwitch('no-sandbox');
if (settingsCache.inProcessGPU) app.commandLine.appendSwitch('in-process-gpu');

[
    ['autoplay-policy', 'no-user-gesture-required'],
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
    ['disable-dev-shm-usage'],
    ['use-angle', 'default'],
].forEach(x => app.commandLine.appendSwitch(...x));

ipcMain.handle('openFileDialog', (e, title = '', filtersArr = []) => {
    const result = dialog.showOpenDialogSync(null, {
        properties: ['openFile'],
        title: '[BestKourClient] ' + title,
        defaultPath: '.',
        filters: filtersArr,
    });
    return result;
});

ipcMain.on('updateSettingsCache', (e, key, val) => {
    settingsCache[key] = val;
    gameWindow.webContents.send('updateSettingsCache', key, val);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

const appVersion = app.getVersion();
app.whenReady().then(() => {
    protocol.registerFileProtocol('bkc', (request, callback) => callback(decodeURI(request.url.replace(/^bkc:\//, ''))));
    gameWindow = new GameWindow();
});

const isNewerVersion = (a) => {
    const oV = appVersion.split('.');
    const nV = a.split('.');
    for (let i = 0; i < nV.length; i++) {
        const a = ~~nV[i];
        const b = ~~oV[i];
        if (a > b) return true;
        if (a < b) return false;
    }
    return false;
};

let updateCheckResult = [hasRun, false, false, appVersion, ''];
try {
    https.get('https://api.github.com/repos/AceSilentKill/BKC/releases/latest', {
        headers: { 'User-Agent': 'Mozilla/5.0 BestKourClient/' + app.getVersion(), },
        timeout: 10000,
    }, (res) => {
        let data = '';
        res.on('data', (chk) => { data += chk; });
        res.on('end', () => {
            const version = JSON.parse(data).name;
            if (!version) {
                updateCheckResult[0] = true;
                log.warn('[Updater] Error: Invalid version info response...');
                return;
            }

            if (isNewerVersion(version)) {
                log.info(`[Updater] Update is available (${appVersion} -> ${version})`);
                updateCheckResult[0] = true;
                updateCheckResult[2] = version;
            } else {
                log.info(`[Updater] App is up-to-date :D`);
                updateCheckResult[2] = version;
            }
        });
    }).on('error', (e) => {
        updateCheckResult[0] = true;
        log.warn('[Updater]', e)
    });
} catch (e) {
    updateCheckResult[0] = true;
    log.warn('[Updater]', e);
}

ipcMain.handleOnce('getUpdaterMSG', () => {
    ipcMain.handle('getUpdaterMSG', () => false);
    return updateCheckResult;
});