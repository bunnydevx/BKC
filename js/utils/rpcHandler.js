const log = require('electron-log');
const err = (...e) => log.warn('[RPC] Error:', ...e);

module.exports = class {
    constructor() {
        this.client = new (require('discord-rpc-revamp').Client)();
        this.client.connect({ clientId: '1219948059233095690' }).catch(err);
        this.client.on('ready', () => {
            this.client.setActivity({
                state: 'Playing Kour on BKC',
                largeImageKey: 'logo',
                smallImageKey: 'kour',
                startTimestamp: Date.now(),
                buttons: [
                    {
                        label: 'Get BestKourClient',
                        url: 'https://github.com/repos/AceSilentKill/BKC',
                    },
                ],
            }).catch(err);
        });
    }
};