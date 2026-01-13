module.exports = function(RED) {
    'use strict';

    const Client = require('ssh2-sftp-client');

    function SFTPNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Get config node reference
        this.server = RED.nodes.getNode(config.server);
        this.operation = config.operation || 'list';
        this.remotePath = config.remotePath || '/';
        this.localPath = config.localPath || '';
        this.recursive = config.recursive || false;

        if (!this.server) {
            node.error('No SFTP server configured');
            node.status({ fill: 'red', shape: 'ring', text: 'no server' });
            return;
        }

        node.on('input', async function(msg, send, done) {
            send = send || function() { node.send.apply(node, arguments); };

            const sftp = new Client();
            const password = node.server.password;

            // Build connection config
            const tryKeyboard = node.server.tryKeyboard !== false;
            const connectionConfig = {
                host: msg.host || node.server.host,
                port: msg.port || node.server.port || 22,
                username: msg.username || node.server.username,
                tryKeyboard: tryKeyboard,
                readyTimeout: 30000
            };

            // Add password if provided
            if (password) {
                connectionConfig.password = password;
            }

            // Add private key if provided
            if (node.server.privateKey) {
                connectionConfig.privateKey = node.server.privateKey;
                if (node.server.passphrase) {
                    connectionConfig.passphrase = node.server.passphrase;
                }
            }

            // Handle keyboard-interactive authentication
            if (connectionConfig.tryKeyboard) {
                sftp.client.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
                    finish(prompts.map(() => password));
                });
            }

            // Get operation parameters from msg or config
            const operation = msg.operation || node.operation;
            // Only use msg.payload as path if it's a non-empty string
            let remotePath = node.remotePath || '/';
            if (msg.remotePath && typeof msg.remotePath === 'string') {
                remotePath = msg.remotePath;
            } else if (msg.payload && typeof msg.payload === 'string' && msg.payload.startsWith('/')) {
                remotePath = msg.payload;
            }
            const localPath = msg.localPath || node.localPath;
            const recursive = msg.recursive !== undefined ? msg.recursive : node.recursive;

            try {
                node.status({ fill: 'yellow', shape: 'dot', text: 'connecting...' });
                await sftp.connect(connectionConfig);
                node.status({ fill: 'green', shape: 'dot', text: 'connected' });

                let result;

                switch (operation) {
                    case 'list':
                        node.status({ fill: 'blue', shape: 'dot', text: 'listing...' });
                        result = await sftp.list(remotePath);
                        msg.payload = result;
                        break;

                    case 'get':
                        node.status({ fill: 'blue', shape: 'dot', text: 'downloading...' });
                        if (localPath) {
                            await sftp.get(remotePath, localPath);
                            msg.payload = { success: true, localPath: localPath };
                        } else {
                            // Return as buffer
                            result = await sftp.get(remotePath);
                            msg.payload = result;
                        }
                        break;

                    case 'put':
                        node.status({ fill: 'blue', shape: 'dot', text: 'uploading...' });
                        if (Buffer.isBuffer(msg.payload)) {
                            await sftp.put(msg.payload, remotePath);
                        } else if (localPath) {
                            await sftp.put(localPath, remotePath);
                        } else {
                            throw new Error('put operation requires msg.payload as Buffer or localPath');
                        }
                        msg.payload = { success: true, remotePath: remotePath };
                        break;

                    case 'delete':
                        node.status({ fill: 'blue', shape: 'dot', text: 'deleting...' });
                        await sftp.delete(remotePath);
                        msg.payload = { success: true, deleted: remotePath };
                        break;

                    case 'mkdir':
                        node.status({ fill: 'blue', shape: 'dot', text: 'creating dir...' });
                        await sftp.mkdir(remotePath, recursive);
                        msg.payload = { success: true, created: remotePath };
                        break;

                    case 'rmdir':
                        node.status({ fill: 'blue', shape: 'dot', text: 'removing dir...' });
                        await sftp.rmdir(remotePath, recursive);
                        msg.payload = { success: true, removed: remotePath };
                        break;

                    case 'rename':
                        node.status({ fill: 'blue', shape: 'dot', text: 'renaming...' });
                        const newPath = msg.newPath || localPath;
                        if (!newPath) {
                            throw new Error('rename operation requires msg.newPath or localPath');
                        }
                        await sftp.rename(remotePath, newPath);
                        msg.payload = { success: true, from: remotePath, to: newPath };
                        break;

                    case 'exists':
                        node.status({ fill: 'blue', shape: 'dot', text: 'checking...' });
                        result = await sftp.exists(remotePath);
                        msg.payload = result; // false, 'd', '-', or 'l'
                        msg.exists = result !== false;
                        break;

                    case 'stat':
                        node.status({ fill: 'blue', shape: 'dot', text: 'getting stats...' });
                        result = await sftp.stat(remotePath);
                        msg.payload = result;
                        break;

                    default:
                        throw new Error('Unknown operation: ' + operation);
                }

                // Add metadata
                msg.sftp = {
                    operation: operation,
                    remotePath: remotePath,
                    host: connectionConfig.host,
                    port: connectionConfig.port
                };

                node.status({ fill: 'green', shape: 'dot', text: 'done' });
                send(msg);

                // Clear status after 2 seconds
                setTimeout(() => {
                    node.status({});
                }, 2000);

                if (done) {
                    done();
                }

            } catch (err) {
                node.status({ fill: 'red', shape: 'ring', text: err.message.substring(0, 20) });
                if (done) {
                    done(err);
                } else {
                    node.error(err.message, msg);
                }
            } finally {
                try {
                    await sftp.end();
                } catch (e) {
                    // Ignore close errors
                }
            }
        });

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType('sftp-best', SFTPNode);
};
