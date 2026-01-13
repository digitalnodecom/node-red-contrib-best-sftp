module.exports = function(RED) {
    'use strict';

    function SFTPConfigNode(config) {
        RED.nodes.createNode(this, config);

        // Non-sensitive configuration
        this.name = config.name;
        this.host = config.host;
        this.port = config.port || 22;
        this.tryKeyboard = config.tryKeyboard;

        // Credentials (stored encrypted)
        const creds = this.credentials || {};
        this.username = creds.username;
        this.password = creds.password;
        this.privateKey = creds.privateKey;
        this.passphrase = creds.passphrase;
    }

    RED.nodes.registerType('sftp-config', SFTPConfigNode, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
            privateKey: { type: 'password' },
            passphrase: { type: 'password' }
        }
    });
};
