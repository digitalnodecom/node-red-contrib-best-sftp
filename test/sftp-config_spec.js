const helper = require('node-red-node-test-helper');
const configNode = require('../nodes/sftp-config.js');

helper.init(require.resolve('node-red'));

describe('sftp-config Node', function() {

    afterEach(function(done) {
        helper.unload();
        done();
    });

    it('should be loaded with defaults', function(done) {
        const flow = [
            { id: 'n1', type: 'sftp-config', name: 'test-server', host: 'example.com' }
        ];
        helper.load(configNode, flow, function() {
            const n1 = helper.getNode('n1');
            try {
                expect(n1).toBeTruthy();
                expect(n1.name).toBe('test-server');
                expect(n1.host).toBe('example.com');
                expect(n1.port).toBe(22); // default port
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should use custom port', function(done) {
        const flow = [
            { id: 'n1', type: 'sftp-config', name: 'custom-port', host: 'example.com', port: 2222 }
        ];
        helper.load(configNode, flow, function() {
            const n1 = helper.getNode('n1');
            try {
                expect(n1.port).toBe(2222);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should store tryKeyboard setting', function(done) {
        const flow = [
            { id: 'n1', type: 'sftp-config', name: 'keyboard-test', host: 'example.com', tryKeyboard: true }
        ];
        helper.load(configNode, flow, function() {
            const n1 = helper.getNode('n1');
            try {
                expect(n1.tryKeyboard).toBe(true);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should load credentials', function(done) {
        const flow = [
            { id: 'n1', type: 'sftp-config', name: 'cred-test', host: 'example.com' }
        ];
        const credentials = {
            n1: {
                username: 'testuser',
                password: 'testpass'
            }
        };
        helper.load(configNode, flow, credentials, function() {
            const n1 = helper.getNode('n1');
            try {
                expect(n1.username).toBe('testuser');
                expect(n1.password).toBe('testpass');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

});
