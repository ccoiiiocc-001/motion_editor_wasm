/**
 * 미디어(blob URL, video/audio element) 안전 해제.
 * undo/redo 히스토리·다른 클립이 같은 src를 쓰는 경우 revoke 하지 않음.
 */
(function () {
    function isBlobUrl(url) {
        return typeof url === 'string' && url.startsWith('blob:');
    }

    function elementSrc(el) {
        if (!el) return '';
        return el.src || el.currentSrc || '';
    }

    function forEachHistorySnapshot(fn) {
        const ah = window.getActionHistory?.() || [];
        const rh = window.getRedoHistory?.() || [];
        ah.forEach(fn);
        rh.forEach(fn);
    }

    function collectInUseMediaUrls() {
        const urls = new Set();

        const addUrl = (url) => { if (url) urls.add(url); };

        const canvas = window.canvas;
        if (canvas) {
            canvas.getObjects().forEach((obj) => {
                if (!obj || (obj.type !== 'image' && !obj.isVideo)) return;
                const el = typeof obj.getElement === 'function' ? obj.getElement() : null;
                addUrl(elementSrc(el));
            });
        }

        (window.audioTrackData || []).forEach((track) => {
            addUrl(elementSrc(track?.audio));
        });

        const clip = window.clipboardClip;
        if (clip) {
            if (clip.trackType === 'audio') addUrl(elementSrc(clip.audio));
            else if (clip.getElement) addUrl(elementSrc(clip.getElement()));
        }

        forEachHistorySnapshot((snap) => {
            (snap.canvasObjs || []).forEach((obj) => {
                if (!obj || (obj.type !== 'image' && !obj.isVideo)) return;
                const el = typeof obj.getElement === 'function' ? obj.getElement() : null;
                addUrl(elementSrc(el));
            });
            (snap.audioObjs || []).forEach((track) => {
                addUrl(elementSrc(track?.audio));
            });
        });

        return urls;
    }

    function collectReferencedObjects() {
        const refs = new Set();
        const canvas = window.canvas;
        if (canvas) canvas.getObjects().forEach((o) => refs.add(o));
        (window.audioTrackData || []).forEach((o) => refs.add(o));
        if (window.clipboardClip) refs.add(window.clipboardClip);
        forEachHistorySnapshot((snap) => {
            (snap.canvasObjs || []).forEach((o) => refs.add(o));
            (snap.audioObjs || []).forEach((o) => refs.add(o));
        });
        return refs;
    }

    function isReferencedInEditorHistory(obj) {
        if (!obj) return false;
        let found = false;
        forEachHistorySnapshot((snap) => {
            if (found) return;
            if ((snap.canvasObjs || []).includes(obj) || (snap.audioObjs || []).includes(obj)) found = true;
        });
        return found;
    }

    function revokeBlobUrlIfUnused(url) {
        if (!isBlobUrl(url)) return;
        const inUse = collectInUseMediaUrls();
        if (!inUse.has(url)) {
            try { URL.revokeObjectURL(url); } catch (_) { /* noop */ }
        }
    }

    function pauseElement(el) {
        if (!el) return;
        try { if (typeof el.pause === 'function') el.pause(); } catch (_) { /* noop */ }
    }

    /** 캔버스/Fabric에 붙어 있지 않은 element — 교체·해제 후 호출 */
    function releaseDetachedElement(el, knownSrc) {
        if (!el) return;
        const src = knownSrc || elementSrc(el);
        pauseElement(el);
        try {
            el.removeAttribute?.('src');
            el.src = '';
            if (typeof el.load === 'function') el.load();
        } catch (_) { /* noop */ }
        revokeBlobUrlIfUnused(src);
    }

    function releaseAttachedElement(el) {
        if (!el) return;
        const src = elementSrc(el);
        pauseElement(el);
        try {
            el.removeAttribute?.('src');
            el.src = '';
            if (typeof el.load === 'function') el.load();
        } catch (_) { /* noop */ }
        revokeBlobUrlIfUnused(src);
    }

    function disposeFabricClip(obj, options) {
        if (!obj) return;
        const full = !!(options && options.full);
        if (obj.isVideo || obj.type === 'image') {
            const el = typeof obj.getElement === 'function' ? obj.getElement() : null;
            releaseAttachedElement(el);
        }
        if (full) {
            if (obj.thumbUrl) delete obj.thumbUrl;
            if (typeof obj.dispose === 'function') {
                try { obj.dispose(); } catch (_) { /* noop */ }
            }
        }
    }

    function disposeAudioTrack(track, options) {
        if (!track) return;
        const full = !!(options && options.full);
        releaseAttachedElement(track.audio);
        if (full) track.audio = null;
    }

    function disposeSnapshotOrphans(snapshot) {
        if (!snapshot) return;
        const refs = collectReferencedObjects();
        (snapshot.canvasObjs || []).forEach((obj) => {
            if (!refs.has(obj)) disposeFabricClip(obj, { full: true });
        });
        (snapshot.audioObjs || []).forEach((track) => {
            if (!refs.has(track)) disposeAudioTrack(track, { full: true });
        });
    }

    function disposeAllHistorySnapshots() {
        const ah = window.getActionHistory?.() || [];
        const rh = window.getRedoHistory?.() || [];
        [...ah, ...rh].forEach((snap) => disposeSnapshotOrphans(snap));
    }

    function teardownProjectMedia() {
        disposeAllHistorySnapshots();
        window.clearEditorHistories?.();

        const canvas = window.canvas;
        if (canvas) {
            canvas.getObjects().slice().forEach((obj) => {
                disposeFabricClip(obj, { full: true });
                canvas.remove(obj);
            });
        }
        (window.audioTrackData || []).slice().forEach((track) => {
            disposeAudioTrack(track, { full: true });
        });
        if (window.audioTrackData) window.audioTrackData.length = 0;
        canvas?.discardActiveObject?.();
        canvas?.requestRenderAll?.();
    }

    function releaseFabricObjectElementBeforeReplace(fabricObj) {
        if (!fabricObj || typeof fabricObj.getElement !== 'function') return;
        const oldEl = fabricObj.getElement();
        const oldSrc = elementSrc(oldEl);
        releaseDetachedElement(oldEl, oldSrc);
    }

    function markTimelineUiDirty() {
        window._timelineUiDirty = true;
    }

    window.MediaDispose = {
        isBlobUrl,
        revokeBlobUrlIfUnused,
        releaseDetachedElement,
        releaseAttachedElement,
        releaseFabricObjectElementBeforeReplace,
        disposeFabricClip,
        disposeAudioTrack,
        disposeSnapshotOrphans,
        teardownProjectMedia,
        markTimelineUiDirty,
        isReferencedInEditorHistory
    };
})();
