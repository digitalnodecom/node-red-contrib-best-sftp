# node-red-contrib-best-sftp

A reliable SFTP client node for Node-RED with keyboard-interactive authentication support.

## Features

- **Multiple authentication methods**: Password, keyboard-interactive, and SSH private key
- **9 SFTP operations**: list, get, put, delete, mkdir, rmdir, rename, exists, stat
- **Keyboard-interactive auth**: Works with servers that require interactive authentication
- **Dynamic configuration**: Override settings via message properties
- **Status indicators**: Visual feedback for connection and operation states
- **Secure credential storage**: Passwords and keys encrypted by Node-RED

## Installation

### Via Node-RED Palette Manager

1. Open Node-RED
2. Go to Menu → Manage Palette → Install
3. Search for `node-red-contrib-best-sftp`
4. Click Install

### Via npm

```bash
cd ~/.node-red
npm install node-red-contrib-best-sftp
```

Then restart Node-RED.

## Nodes

### sftp-config

Configuration node that stores SFTP server connection settings.

| Property | Type | Description |
|----------|------|-------------|
| Host | string | SFTP server hostname or IP |
| Port | number | SFTP port (default: 22) |
| Username | string | Authentication username |
| Password | string | Authentication password |
| Keyboard Auth | boolean | Enable keyboard-interactive authentication |
| Private Key | string | SSH private key (optional) |
| Passphrase | string | Private key passphrase (optional) |

### sftp-best

Main SFTP operations node.

| Property | Type | Description |
|----------|------|-------------|
| Server | sftp-config | Reference to server configuration |
| Operation | string | SFTP operation to perform |
| Remote Path | string | Path on the remote server |
| Local Path | string | Local file path (for get/put operations) |
| Recursive | boolean | Recursive mode for mkdir/rmdir |

## Operations

### list
Lists contents of a remote directory.

**Input:** `msg.remotePath` or `msg.payload` (path string)
**Output:** `msg.payload` - Array of file objects with `name`, `type`, `size`, `modifyTime`

### get
Downloads a file from the remote server.

**Input:** `msg.remotePath` - Remote file path
**Output:** `msg.payload` - File contents as Buffer, or `{success, localPath}` if local path specified

### put
Uploads a file to the remote server.

**Input:** `msg.payload` - Buffer with file contents, or use `msg.localPath` for local file
**Output:** `msg.payload` - `{success: true, remotePath}`

### delete
Deletes a file on the remote server.

**Input:** `msg.remotePath` - File to delete
**Output:** `msg.payload` - `{success: true, deleted}`

### mkdir
Creates a directory on the remote server.

**Input:** `msg.remotePath` - Directory path, `msg.recursive` - Create parent directories
**Output:** `msg.payload` - `{success: true, created}`

### rmdir
Removes a directory on the remote server.

**Input:** `msg.remotePath` - Directory path, `msg.recursive` - Remove contents
**Output:** `msg.payload` - `{success: true, removed}`

### rename
Renames or moves a file/directory.

**Input:** `msg.remotePath` - Source path, `msg.newPath` - Destination path
**Output:** `msg.payload` - `{success: true, from, to}`

### exists
Checks if a path exists on the remote server.

**Input:** `msg.remotePath` - Path to check
**Output:** `msg.payload` - `'d'` (directory), `'-'` (file), `'l'` (link), or `false`; `msg.exists` - boolean

### stat
Gets file/directory information.

**Input:** `msg.remotePath` - Path to stat
**Output:** `msg.payload` - Stats object with `size`, `mode`, `accessTime`, `modifyTime`

## Message Properties

All operations add metadata to the output message:

```javascript
msg.sftp = {
    operation: 'list',
    remotePath: '/home/user/files',
    host: 'sftp.example.com',
    port: 22
}
```

### Input Overrides

You can override node configuration via message properties:

| Property | Description |
|----------|-------------|
| `msg.operation` | Override the operation type |
| `msg.remotePath` | Override the remote path |
| `msg.localPath` | Override the local path |
| `msg.newPath` | Destination path for rename |
| `msg.recursive` | Override recursive setting |
| `msg.host` | Override server host |
| `msg.port` | Override server port |
| `msg.username` | Override username |

## Examples

### List Directory

```javascript
msg.remotePath = '/home/user/documents';
msg.operation = 'list';
return msg;
```

### Download File to Buffer

```javascript
msg.remotePath = '/home/user/data.csv';
msg.operation = 'get';
return msg;
// Output: msg.payload contains file buffer
```

### Upload from Buffer

```javascript
msg.payload = Buffer.from('Hello World');
msg.remotePath = '/home/user/hello.txt';
msg.operation = 'put';
return msg;
```

### Check if File Exists

```javascript
msg.remotePath = '/home/user/config.json';
msg.operation = 'exists';
return msg;
// Output: msg.exists = true/false
```

## Status Indicators

| Status | Meaning |
|--------|---------|
| Yellow dot | Connecting to server |
| Green dot | Connected / Operation complete |
| Blue dot | Operation in progress |
| Red ring | Error occurred |

## Requirements

- Node.js >= 18.0.0
- Node-RED >= 2.0.0

## License

MIT

## Contributing

Issues and pull requests welcome at [GitHub](https://github.com/digitalnodecom/node-red-contrib-best-sftp).

## Author

Trajche <trajche@kralev.eu>
