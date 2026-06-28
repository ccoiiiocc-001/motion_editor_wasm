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
            const dv = new DataView(ab);

            // EBML 가변 길이 정수 파싱 (VINT)
            function readVint(pos) {
                const b = u8[pos];
                if (b === 0) return { val: 0, len: 1 };
                let mask = 0x80, width = 1;
                while (!(b & mask) && width < 8) { mask >>= 1; width++; }
                let val = b & (mask - 1);
                for (let k = 1; k < width; k++) val = (val * 256) + u8[pos + k];
                return { val, len: width };
            }

            // 4바이트 EBML ID 읽기
            function readId4(pos) {
                return (u8[pos] << 24) | (u8[pos+1] << 16) | (u8[pos+2] << 8) | u8[pos+3];
            }
            function readId3(pos) {
                return (u8[pos] << 16) | (u8[pos+1] << 8) | u8[pos+2];
            }
            function readId2(pos) {
                return (u8[pos] << 8) | u8[pos+1];
            }

            const EBML_ID  = 0x1A45DFA3;
            const SEG_ID   = 0x18538067;
            const INFO_ID  = 0x1549A966;
            const DUR_ID   = 0x4489;      // 2바이트
            const TIMESCALE_ID = 0x2AD7B1; // 3바이트

            let pos = 0, limit = u8.length;

            // EBML Header 건너뛰기
            while (pos < limit - 4) {
                if (readId4(pos) === EBML_ID) {
                    pos += 4;
                    const sv = readVint(pos); pos += sv.len;
                    pos += sv.val; // EBML header body skip
                    break;
                }
                pos++;
            }

            // Segment 찾기
            let segBodyStart = -1;
            while (pos < limit - 4) {
                if (readId4(pos) === SEG_ID) {
                    pos += 4;
                    const sv = readVint(pos); pos += sv.len;
                    segBodyStart = pos;
                    break;
                }
                pos++;
            }
            if (segBodyStart < 0) return blob;

            // Segment 안에서 Info 찾기 (Cluster 이전까지만)
            let infoBodyStart = -1, infoBodyEnd = -1;
            pos = segBodyStart;
            while (pos < Math.min(segBodyStart + 1024 * 256, limit - 4)) {
                const id4 = readId4(pos);
                if (id4 === INFO_ID) {
                    pos += 4;
                    const sv = readVint(pos); pos += sv.len;
                    infoBodyStart = pos;
                    infoBodyEnd = pos + sv.val;
                    break;
                }
                // 다른 최상위 요소이면 건너뛰기
                pos += 4;
                if (pos >= limit) break;
                const sv = readVint(pos); pos += sv.len + sv.val;
            }
            if (infoBodyStart < 0) return blob;

            // Info 안에서 TimecodeScale 읽기 (기본 1000000 = 1ms)
            let timecodeScale = 1000000;
            let durationPos = -1, durationSizeCode = 0;
            pos = infoBodyStart;
            while (pos < infoBodyEnd - 2) {
                const id2 = readId2(pos);
                if (id2 === DUR_ID) {
                    durationPos = pos + 2;
                    durationSizeCode = u8[durationPos];
                    break;
                }
                const id3 = readId3(pos);
                if (id3 === TIMESCALE_ID) {
                    pos += 3;
                    const sv = readVint(pos); pos += sv.len;
                    let ts = 0;
                    for (let k = 0; k < sv.val && k < 8; k++) ts = ts * 256 + u8[pos + k];
                    if (ts > 0) timecodeScale = ts;
                    pos += sv.val;
                    continue;
                }
                // 알 수 없는 요소: 2바이트 ID 시도 후 VINT size 건너뛰기
                pos += 2;
                if (pos >= infoBodyEnd) break;
                const sv = readVint(pos);
                if (!sv || sv.val > infoBodyEnd) break;
                pos += sv.len + sv.val;
            }

            if (durationPos < 0) return blob; // Duration 필드 없음

            // Duration은 timecodeScale 단위의 float
            // timecodeScale=1000000(1ms) → durationUnits = durationSec * 1000
            const durationUnits = durationSec * (1e9 / timecodeScale);

            if (durationSizeCode === 0x88) {
                // 8바이트 float64
                dv.setFloat64(durationPos + 1, durationUnits);
                return new Blob([u8], { type: type || 'video/webm' });
            }
            if (durationSizeCode === 0x84) {
                // 4바이트 float32
                dv.setFloat32(durationPos + 1, durationUnits);
                return new Blob([u8], { type: type || 'video/webm' });
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
