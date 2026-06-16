const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('motionDesktop', {
    isElectron: true,
    pickDirectory: (opts) => ipcRenderer.invoke('pick-directory', opts || {}),
    ensureMotionEditorDir: (baseDir) => ipcRenderer.invoke('ensure-motion-editor-dir', baseDir),
    ensureProjectDir: (baseDir, projectName) => ipcRenderer.invoke('ensure-project-dir', { baseDir, projectName }),
    writeProjectFile: (projectDir, fileName, data) =>
        ipcRenderer.invoke('write-project-file', { projectDir, fileName, data }),
    readProjectFile: (projectDir, fileName) =>
        ipcRenderer.invoke('read-project-file', { projectDir, fileName }),
    projectFileExists: (projectDir, fileName) =>
        ipcRenderer.invoke('project-file-exists', { projectDir, fileName }),
    saveBlobFile: (opts) => ipcRenderer.invoke('save-blob-file', opts),
    pickSaveFile: (opts) => ipcRenderer.invoke('pick-save-file', opts),
    pickAudioFile: () => ipcRenderer.invoke('pick-audio-file'),
    writeFilePath: (filePath, data) => ipcRenderer.invoke('write-file-path', { filePath, data }),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path')
});
