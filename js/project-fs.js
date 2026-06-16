/**
 * 브라우저 File System Access API ↔ Electron 데스크톱 파일 API 브리지
 */
(function () {
    function isElectron() {
        return !!(window.motionDesktop && window.motionDesktop.isElectron);
    }

    window.pickProjectDirectory = async function (mode) {
        if (isElectron()) {
            const base = await window.motionDesktop.pickDirectory({ mode });
            if (!base) return null;
            return { type: 'electron', root: base, name: base.split(/[\\/]/).pop() || 'project' };
        }
        if (!window.showDirectoryPicker) return null;
        const handle = await window.showDirectoryPicker({
            mode: mode === 'read' ? 'read' : 'readwrite',
            id: 'motionEditorSession'
        });
        return { type: 'browser', handle, name: handle.name || 'project' };
    };

    window.saveSrcToProjectDir = async function (src, fileName, dirRef) {
        const resp = await fetch(src);
        const blob = await resp.blob();
        const buf = await blob.arrayBuffer();

        if (dirRef.type === 'electron') {
            await window.motionDesktop.writeProjectFile(dirRef.root, fileName, buf);
            return fileName;
        }

        const fh = await dirRef.handle.getFileHandle(fileName, { create: true });
        const wr = await fh.createWritable();
        await wr.write(blob);
        await wr.close();
        return fileName;
    };

    window.readProjectMediaBlob = async function (dirRef, fileName) {
        if (dirRef.type === 'electron') {
            const exists = await window.motionDesktop.projectFileExists(dirRef.root, fileName);
            if (!exists) throw new Error('file not found');
            const buf = await window.motionDesktop.readProjectFile(dirRef.root, fileName);
            return new Blob([buf]);
        }
        const fh = await dirRef.handle.getFileHandle(fileName);
        return await fh.getFile();
    };

    window.writeProjectJson = async function (dirRef, jsonText) {
        const enc = new TextEncoder();
        const buf = enc.encode(jsonText).buffer;
        if (dirRef.type === 'electron') {
            await window.motionDesktop.writeProjectFile(dirRef.root, 'project.motionproj', buf);
            return;
        }
        const fh = await dirRef.handle.getFileHandle('project.motionproj', { create: true });
        const wr = await fh.createWritable();
        await wr.write(new Blob([jsonText], { type: 'application/json' }));
        await wr.close();
    };

    window.readProjectJson = async function (dirRef) {
        if (dirRef.type === 'electron') {
            const buf = await window.motionDesktop.readProjectFile(dirRef.root, 'project.motionproj');
            return new TextDecoder().decode(buf);
        }
        const fh = await dirRef.handle.getFileHandle('project.motionproj');
        const f = await fh.getFile();
        return await f.text();
    };

    window.saveClipToDisk = async function (blob, defaultName, accept) {
        const r = await window.saveClipToDiskDetailed(blob, defaultName, accept);
        return r.ok;
    };

    /** @returns {{ ok: boolean, path?: string, handle?: FileSystemFileHandle }} */
    window.saveClipToDiskDetailed = async function (blob, defaultName, accept) {
        const buf = await blob.arrayBuffer();
        if (isElectron()) {
            const filters = accept
                ? [{ name: 'Media', extensions: Object.values(accept).flat().map(s => s.replace('.', '')) }]
                : undefined;
            const r = await window.motionDesktop.saveBlobFile({ defaultName, data: buf, filters });
            return { ok: !!r.ok, path: r.path };
        }
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultName,
                    types: [{ description: 'Media', accept: accept || {} }]
                });
                const wr = await handle.createWritable();
                await wr.write(blob);
                await wr.close();
                return { ok: true, handle };
            } catch (err) {
                if (err.name === 'AbortError') return { ok: false };
                throw err;
            }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        return { ok: true };
    };

    window.pickSaveFileTarget = async function (defaultName, accept) {
        if (isElectron()) {
            const filters = accept
                ? [{ name: 'Media', extensions: Object.values(accept).flat().map(s => s.replace('.', '')) }]
                : undefined;
            const r = await window.motionDesktop.pickSaveFile({ defaultName, filters });
            return r?.ok ? { ok: true, type: 'path', path: r.path } : { ok: false };
        }
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultName,
                    types: [{ description: 'Media', accept: accept || {} }]
                });
                return { ok: true, type: 'handle', handle };
            } catch (err) {
                if (err.name === 'AbortError') return { ok: false };
                throw err;
            }
        }
        return { ok: true, type: 'download', defaultName };
    };

    window.writeBlobToSaveTarget = async function (blob, target) {
        if (!target?.ok) return { ok: false };
        if (target.type === 'path') {
            const r = await window.writeBlobToFilePath(blob, target.path);
            return r?.ok ? { ok: true, path: target.path } : { ok: false };
        }
        if (target.type === 'handle') {
            const wr = await target.handle.createWritable();
            await wr.write(blob);
            await wr.close();
            return { ok: true, handle: target.handle };
        }
        if (target.type === 'download') {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = target.defaultName;
            a.click();
            URL.revokeObjectURL(url);
            return { ok: true };
        }
        return { ok: false };
    };

    window.writeBlobToFilePath = async function (blob, filePath) {
        const buf = await blob.arrayBuffer();
        if (isElectron() && window.motionDesktop?.writeFilePath) {
            return window.motionDesktop.writeFilePath(filePath, buf);
        }
        return { ok: false };
    };
})();
