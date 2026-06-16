const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fssync = require('fs');
const { pathToFileURL } = require('url');

const APP_ROOT = path.join(__dirname, '..');
const MOTION_SUBDIR = 'motionEditor';

protocol.registerSchemesAsPrivileged([
    {
        scheme: 'app',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            stream: true
        }
    }
]);

function resolveAppPath(urlPath) {
    let p = decodeURIComponent(urlPath);
    if (p.startsWith('/')) p = p.slice(1);
    const filePath = path.normalize(path.join(APP_ROOT, p));
    const rootNorm = path.normalize(APP_ROOT);
    if (!filePath.startsWith(rootNorm)) return null;
    return filePath;
}

function registerAppProtocol() {
    protocol.handle('app', (request) => {
        const filePath = resolveAppPath(new URL(request.url).pathname);
        if (!filePath || !fssync.existsSync(filePath)) {
            return new Response('Not Found', { status: 404 });
        }
        return net.fetch(pathToFileURL(filePath).href);
    });

}

function motionEditorPath(baseDir) {
    return path.join(baseDir, MOTION_SUBDIR);
}

async function ensureMotionEditorDir(baseDir) {
    const dir = motionEditorPath(baseDir);
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

function sanitizeProjectName(name) {
    return String(name || '')
        .trim()
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/g, '')
        .slice(0, 80);
}

async function ensureProjectDir(baseDir, projectName) {
    const safeName = sanitizeProjectName(projectName);
    if (!safeName) throw new Error('프로젝트 이름이 비어 있습니다.');
    const dir = path.join(baseDir, safeName);
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    mainWindow.loadURL('app://./index.html');

    if (!app.isPackaged && process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
}

app.whenReady().then(() => {
    registerAppProtocol();

    ipcMain.handle('pick-directory', async (_e, { mode }) => {
        const props = mode === 'read' ? ['openDirectory'] : ['openDirectory', 'createDirectory'];
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: props,
            title: mode === 'read' ? '프로젝트 폴더 열기' : '프로젝트 저장 폴더 선택'
        });
        if (result.canceled || !result.filePaths.length) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('ensure-motion-editor-dir', async (_e, baseDir) => {
        return ensureMotionEditorDir(baseDir);
    });

    ipcMain.handle('ensure-project-dir', async (_e, { baseDir, projectName }) => {
        return ensureProjectDir(baseDir, projectName);
    });

    ipcMain.handle('write-project-file', async (_e, { projectDir, fileName, data }) => {
        const buf = Buffer.from(data);
        const target = path.join(projectDir, fileName);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, buf);
        return true;
    });

    ipcMain.handle('read-project-file', async (_e, { projectDir, fileName }) => {
        const target = path.join(projectDir, fileName);
        const buf = await fs.readFile(target);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    });

    ipcMain.handle('project-file-exists', async (_e, { projectDir, fileName }) => {
        try {
            await fs.access(path.join(projectDir, fileName));
            return true;
        } catch {
            return false;
        }
    });

    ipcMain.handle('save-blob-file', async (_e, { defaultName, data, filters }) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: defaultName,
            filters: filters || [{ name: 'All', extensions: ['*'] }]
        });
        if (result.canceled || !result.filePath) return { ok: false };

        await fs.writeFile(result.filePath, Buffer.from(data));
        return { ok: true, path: result.filePath };
    });

    ipcMain.handle('pick-save-file', async (_e, { defaultName, filters }) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: defaultName,
            filters: filters || [{ name: 'All', extensions: ['*'] }]
        });
        if (result.canceled || !result.filePath) return { ok: false };
        return { ok: true, path: result.filePath };
    });

    ipcMain.handle('pick-audio-file', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{
                name: 'Audio',
                extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'flac']
            }]
        });
        if (result.canceled || !result.filePaths.length) return { ok: false };
        const filePath = result.filePaths[0];
        const buf = await fs.readFile(filePath);
        return {
            ok: true,
            filePath,
            data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        };
    });

    ipcMain.handle('write-file-path', async (_e, { filePath, data }) => {
        await fs.writeFile(filePath, Buffer.from(data));
        return { ok: true, filePath };
    });

    ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
