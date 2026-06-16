(function () {
    const MIN_DURATION = 0.1;

    function isValid(d) {
        return Number.isFinite(d) && d >= MIN_DURATION && d < 86400 * 24;
    }

    function readElementDuration(el) {
        const d = Number(el.duration);
        if (isValid(d)) return d;
        try {
            if (el.seekable && el.seekable.length > 0) {
                const end = el.seekable.end(el.seekable.length - 1);
                if (isValid(end)) return end;
            }
        } catch (_) {}
        return 0;
    }

    function waitMediaEvent(el, event, timeoutMs) {
        return new Promise((resolve) => {
            let settled = false;
            const done = () => {
                if (settled) return;
                settled = true;
                el.removeEventListener(event, onEvt);
                clearTimeout(timer);
                resolve();
            };
            const onEvt = done;
            const timer = setTimeout(done, timeoutMs);
            el.addEventListener(event, onEvt);
        });
    }

    async function probeVideoElement(el, options = {}) {
        const hint = Number(options.hintSec);
        const trustHint = options.trustHint === true;
        const preferSeekProbe = options.preferSeekProbe === true;
        const metadataDur = readElementDuration(el);
        const timeoutMs = options.timeoutMs ?? 8000;
        el.preload = 'auto';

        if (!preferSeekProbe && isValid(metadataDur)) return metadataDur;

        try {
            const seekTarget = (trustHint && isValid(hint)) ? Math.max(hint - 0.05, 0) : 1e101;
            el.currentTime = seekTarget;
            await waitMediaEvent(el, 'seeked', timeoutMs);
            const seekDur = el.currentTime;
            if (isValid(seekDur)) {
                if (isValid(metadataDur)) return Math.max(metadataDur, seekDur);
                return seekDur;
            }
        } catch (_) {}

        try {
            if (el.seekable && el.seekable.length > 0) {
                const end = el.seekable.end(el.seekable.length - 1);
                el.currentTime = Math.max(0, end - 0.05);
                await waitMediaEvent(el, 'seeked', timeoutMs);
                const seekDur = el.currentTime;
                if (isValid(seekDur)) {
                    if (isValid(metadataDur)) return Math.max(metadataDur, seekDur);
                    return seekDur;
                }
            }
        } catch (_) {}

        if (isValid(metadataDur)) return metadataDur;
        if (trustHint && isValid(hint)) return hint;
        return Math.max(MIN_DURATION, Number(options.fallbackSec) || 5);
    }

    async function probeVideoBlob(blob, options = {}) {
        const url = URL.createObjectURL(blob);
        try {
            const el = document.createElement('video');
            el.preload = 'auto';
            el.muted = true;
            el.playsInline = true;
            await new Promise((resolve, reject) => {
                el.onloadedmetadata = resolve;
                el.onerror = () => resolve();
                el.src = url;
                el.load();
            });
            return await probeVideoElement(el, { preferSeekProbe: true, ...options });
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function repairWebmBlobDuration(blob, durationSec) {
        if (!blob || !isValid(durationSec)) return blob;
        const type = blob.type || '';
        if (!type.includes('webm')) return blob;
        try {
            const ab = await blob.arrayBuffer();
            const u8 = new Uint8Array(ab);
            const durationMs = durationSec * 1000;
            for (let i = 0; i < u8.length - 11; i++) {
                if (u8[i] !== 0x44 || u8[i + 1] !== 0x89) continue;
                const sizeCode = u8[i + 2];
                if (sizeCode === 0x88) {
                    new DataView(u8.buffer, u8.byteOffset + i + 3, 8).setFloat64(0, durationMs);
                    return new Blob([u8], { type: type || 'video/webm' });
                }
                if (sizeCode === 0x84) {
                    new DataView(u8.buffer, u8.byteOffset + i + 3, 4).setFloat32(0, durationMs);
                    return new Blob([u8], { type: type || 'video/webm' });
                }
            }
        } catch (e) {
            console.warn('[MediaDuration] WebM duration patch failed', e);
        }
        return blob;
    }

    window.MediaDuration = {
        isValid,
        readElementDuration,
        probeVideoElement,
        probeVideoBlob,
        repairWebmBlobDuration
    };
})();
