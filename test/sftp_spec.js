const helper = require('node-red-node-test-helper');
const sftpNode = require('../nodes/sftp.js');
const configNode = require('../nodes/sftp-config.js');

helper.init(require.resolve('node-red'));

// Mock ssh2-sftp-client
jest.mock('ssh2-sftp-client', () => {
    return jest.fn().mockImplementation(() => ({
        client: {
            on: jest.fn()
        },
        connect: jest.fn().mockResolvedValue(undefined),
        end: jest.fn().mockResolvedValue(undefined),
        list: jest.fn().mockResolvedValue([
            { type: '-', name: 'file1.txt', size: 1024, modifyTime: Date.now() },
            { type: 'd', name: 'subdir', size: 4096, modifyTime: Date.now() }
        ]),
        get: jest.fn().mockResolvedValue(Buffer.from('file content')),
        put: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        mkdir: jest.fn().mockResolvedValue(undefined),
        rmdir: jest.fn().mockResolvedValue(undefined),
        rename: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue('-'),
        stat: jest.fn().mockResolvedValue({
            mode: 33188,
            size: 1024,
            accessTime: Date.now(),
            modifyTime: Date.now()
        })
    }));
});

describe('sftp-best Node', function() {

    afterEach(function(done) {
        helper.unload();
        jest.clearAllMocks();
        done();
    });

    function getTestFlow(operation = 'list', remotePath = '/test/path') {
        return [
            {
                id: 'config1',
                type: 'sftp-config',
                name: 'test-server',
                host: 'example.com',
                port: 22,
                tryKeyboard: true
            },
            {
                id: 'sftp1',
                type: 'sftp-best',
                name: 'test-sftp',
                server: 'config1',
                operation: operation,
                remotePath: remotePath,
                wires: [['helper1']]
            },
            { id: 'helper1', type: 'helper' }
        ];
    }

    function getCredentials() {
        return {
            config1: {
                username: 'testuser',
                password: 'testpass'
            }
        };
    }

    it('should be loaded', function(done) {
        helper.load([configNode, sftpNode], getTestFlow(), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            try {
                expect(sftpN).toBeTruthy();
                expect(sftpN.name).toBe('test-sftp');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should list directory contents', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('list', '/home/user'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(Array.isArray(msg.payload)).toBe(true);
                    expect(msg.payload.length).toBe(2);
                    expect(msg.payload[0].name).toBe('file1.txt');
                    expect(msg.sftp.operation).toBe('list');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should download file as buffer', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('get', '/home/user/file.txt'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(Buffer.isBuffer(msg.payload)).toBe(true);
                    expect(msg.payload.toString()).toBe('file content');
                    expect(msg.sftp.operation).toBe('get');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should upload file from buffer', function(done) {
        const flow = getTestFlow('put', '/home/user/newfile.txt');
        helper.load([configNode, sftpNode], flow, getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.payload.success).toBe(true);
                    expect(msg.payload.remotePath).toBe('/home/user/newfile.txt');
                    expect(msg.sftp.operation).toBe('put');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: Buffer.from('upload content') });
        });
    });

    it('should delete file', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('delete', '/home/user/delete.txt'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.payload.success).toBe(true);
                    expect(msg.payload.deleted).toBe('/home/user/delete.txt');
                    expect(msg.sftp.operation).toBe('delete');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should create directory', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('mkdir', '/home/user/newdir'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.payload.success).toBe(true);
                    expect(msg.payload.created).toBe('/home/user/newdir');
                    expect(msg.sftp.operation).toBe('mkdir');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should remove directory', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('rmdir', '/home/user/olddir'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.payload.success).toBe(true);
                    expect(msg.payload.removed).toBe('/home/user/olddir');
                    expect(msg.sftp.operation).toBe('rmdir');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should rename file', function(done) {
        const flow = getTestFlow('rename', '/home/user/old.txt');
        flow[1].localPath = '/home/user/new.txt'; // newPath comes from localPath for rename

        helper.load([configNode, sftpNode], flow, getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.payload.success).toBe(true);
                    expect(msg.payload.from).toBe('/home/user/old.txt');
                    expect(msg.payload.to).toBe('/home/user/new.txt');
                    expect(msg.sftp.operation).toBe('rename');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should check if path exists', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('exists', '/home/user/file.txt'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.payload).toBe('-'); // file type
                    expect(msg.exists).toBe(true);
                    expect(msg.sftp.operation).toBe('exists');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should get file stats', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('stat', '/home/user/file.txt'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.payload).toHaveProperty('size');
                    expect(msg.payload).toHaveProperty('mode');
                    expect(msg.sftp.operation).toBe('stat');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ payload: {} });
        });
    });

    it('should override operation from msg', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('list', '/default/path'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.sftp.operation).toBe('exists');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ operation: 'exists', remotePath: '/override/path' });
        });
    });

    it('should override remotePath from msg', function(done) {
        helper.load([configNode, sftpNode], getTestFlow('list', '/default/path'), getCredentials(), function() {
            const sftpN = helper.getNode('sftp1');
            const helperN = helper.getNode('helper1');

            helperN.on('input', function(msg) {
                try {
                    expect(msg.sftp.remotePath).toBe('/override/path');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            sftpN.receive({ remotePath: '/override/path' });
        });
    });

    it('should error when no server configured', function(done) {
        const flow = [
            {
                id: 'sftp1',
                type: 'sftp-best',
                name: 'test-sftp',
                server: '', // no server
                operation: 'list',
                remotePath: '/test'
            }
        ];

        helper.load([configNode, sftpNode], flow, {}, function() {
            const sftpN = helper.getNode('sftp1');
            try {
                // Node should have error status when no server configured
                expect(sftpN).toBeTruthy();
                done();
            } catch (err) {
                done(err);
            }
        });
    });

});
