/**
 * MP3 ID3 USLT 가사 삽입 · (가능 시) lamejs로 MP3 변환
 */

function readSyncsafe(u8, offset) {
    return ((u8[offset] & 0x7f) << 21)
        | ((u8[offset + 1] & 0x7f) << 14)
        | ((u8[offset + 2] & 0x7f) << 7)
        | (u8[offset + 3] & 0x7f);
}

function writeSyncsafe(n) {
    return Uint8Array.from([
        (n >> 21) & 0x7f,
        (n >> 14) & 0x7f,
        (n >> 7) & 0x7f,
        n & 0x7f
    ]);
}

function writeFrame(frameId, body) {
    const header = new Uint8Array(10);
    for (let i = 0; i < 4; i++) header[i] = frameId.charCodeAt(i);
    const size = body.length;
    header[4] = (size >> 24) & 0xff;
    header[5] = (size >> 16) & 0xff;
    header[6] = (size >> 8) & 0xff;
    header[7] = size & 0xff;
    const out = new Uint8Array(10 + body.length);
    out.set(header);
    out.set(body, 10);
    return out;
}

function encodeUtf16LeWithBom(text, terminate = true) {
    const str = String(text || '');
    const bytes = new Uint8Array(2 + str.length * 2 + (terminate ? 2 : 0));
    let o = 0;
    bytes[o++] = 0xff;
    bytes[o++] = 0xfe;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        bytes[o++] = code & 0xff;
        bytes[o++] = (code >> 8) & 0xff;
    }
    if (terminate) {
        bytes[o++] = 0;
        bytes[o++] = 0;
    }
    return bytes;
}

function buildUsltBody(lrcText, title) {
    // ID3 encoding 1 = UTF-16 with BOM. This is required for Korean lyrics
    // to survive round-trips in common MP3 players and tag readers.
    const enc = 1;
    const lang = 'kor';
    const desc = title ? String(title).slice(0, 60) : '';
    const text = String(lrcText || '');
    const descBytes = encodeUtf16LeWithBom(desc, true);
    const textBytes = encodeUtf16LeWithBom(text, true);
    const body = new Uint8Array(1 + 3 + descBytes.length + textBytes.length);
    let o = 0;
    body[o++] = enc;
    body[o++] = lang.charCodeAt(0);
    body[o++] = lang.charCodeAt(1);
    body[o++] = lang.charCodeAt(2);
    body.set(descBytes, o);
    o += descBytes.length;
    body.set(textBytes, o);
    return body;
}

function buildId3TagFromBody(body) {
    const header = new Uint8Array(10);
    header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
    header.set(writeSyncsafe(body.length), 6);
    const tag = new Uint8Array(10 + body.length);
    tag.set(header);
    tag.set(body, 10);
    return tag;
}

function buildId3Tag(frames) {
    let bodyLen = 0;
    frames.forEach((f) => { bodyLen += f.length; });
    const body = new Uint8Array(bodyLen);
    let off = 0;
    frames.forEach((f) => {
        body.set(f, off);
        off += f.length;
    });
    return buildId3TagFromBody(body);
}

function stripFramesFromBody(body, version, frameIds) {
    const kept = [];
    let offset = 0;
    while (offset + 10 <= body.length) {
        const id = String.fromCharCode(body[offset], body[offset + 1], body[offset + 2], body[offset + 3]);
        if (id === '\0\0\0\0' || id.charCodeAt(0) === 0) break;
        const size = version === 4
            ? readSyncsafe(body, offset + 4)
            : ((body[offset + 4] << 24) | (body[offset + 5] << 16) | (body[offset + 6] << 8) | body[offset + 7]) >>> 0;
        const frameEnd = offset + 10 + size;
        if (size <= 0 || frameEnd > body.length) break;
        if (!frameIds.includes(id)) kept.push(body.slice(offset, frameEnd));
        offset = frameEnd;
    }

    const total = kept.reduce((sum, frame) => sum + frame.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    kept.forEach((frame) => {
        out.set(frame, pos);
        pos += frame.length;
    });
    return out;
}

function findAudioStart(u8) {
    for (let i = 0; i < u8.length - 1; i++) {
        if (u8[i] === 0xff && (u8[i + 1] & 0xe0) === 0xe0) return i;
    }
    return u8.length;
}

function decodeId3Text(bytes, encoding) {
    if (!bytes?.length) return '';
    if (encoding === 1 || encoding === 2) {
        try {
            return new TextDecoder(encoding === 1 ? 'utf-16' : 'utf-16be').decode(bytes).replace(/\0/g, '');
        } catch {
            return '';
        }
    }
    if (encoding === 3) {
        return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '');
    }
    return new TextDecoder('latin1').decode(bytes).replace(/\0/g, '');
}

function findEncodedTerminator(body, offset, encoding) {
    if (encoding === 1 || encoding === 2) {
        for (let i = offset; i < body.length - 1; i += 2) {
            if (body[i] === 0 && body[i + 1] === 0) return i + 2;
        }
        return body.length;
    }
    for (let i = offset; i < body.length; i++) {
        if (body[i] === 0) return i + 1;
    }
    return body.length;
}

function isPlausibleLyricsText(text) {
    const t = String(text || '').trim();
    if (t.length < 2) return false;
    const replacementCount = (t.match(/\uFFFD/g) || []).length;
    const privateUseCount = (t.match(/[\uE000-\uF8FF]/g) || []).length;
    if (replacementCount || privateUseCount) return false;

    const chars = [...t].filter((ch) => !/\s/.test(ch));
    if (!chars.length) return false;

    const readable = chars.filter((ch) =>
        /[\uAC00-\uD7A3a-zA-Z0-9]/.test(ch)
        || /[.,!?'"():;\-\[\]{}\/&%+*=~#@가-힣]/.test(ch)
    ).length;
    return readable / chars.length >= 0.55;
}

function parseUsltFrameBody(body) {
    if (!body?.length) return '';
    const enc = body[0];
    const textOffset = findEncodedTerminator(body, 4, enc);
    const text = decodeId3Text(body.subarray(textOffset), enc).trim();
    return isPlausibleLyricsText(text) ? text : '';
}

function readId3FrameSize(u8, offset, version) {
    if (version === 4) return readSyncsafe(u8, offset + 4);
    return ((u8[offset + 4] << 24) | (u8[offset + 5] << 16) | (u8[offset + 6] << 8) | u8[offset + 7]) >>> 0;
}

/** @returns {{ lrcText: string } | null} */
export function extractEmbeddedLyricsFromMp3(arrayBuffer) {
    const u8 = new Uint8Array(arrayBuffer);
    if (u8.length < 10 || u8[0] !== 0x49 || u8[1] !== 0x44 || u8[2] !== 0x33) return null;

    const version = u8[3];
    const tagSize = readSyncsafe(u8, 6);
    let offset = 10;
    const tagEnd = Math.min(u8.length, 10 + tagSize);
    let best = '';

    while (offset + 10 <= tagEnd) {
        const id = String.fromCharCode(u8[offset], u8[offset + 1], u8[offset + 2], u8[offset + 3]);
        if (id === '\0\0\0\0' || id.charCodeAt(0) === 0) break;

        const frameSize = readId3FrameSize(u8, offset, version);
        offset += 10;
        if (frameSize <= 0 || offset + frameSize > tagEnd) break;

        const body = u8.subarray(offset, offset + frameSize);
        if (id === 'USLT') {
            const text = parseUsltFrameBody(body);
            if (text.length > best.length) best = text;
        }
        offset += frameSize;
    }

    const lrcText = best.trim();
    return lrcText ? { lrcText } : null;
}

export function isMp3Blob(blob, name = '') {
    const t = (blob?.type || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return t.includes('mpeg') || t.includes('mp3') || n.endsWith('.mp3');
}

export async function embedLyricsInMp3Buffer(arrayBuffer, lrcText, title = '') {
    const u8 = new Uint8Array(arrayBuffer);
    const uslt = writeFrame('USLT', buildUsltBody(lrcText, title));
    const tit2 = title
        ? writeFrame('TIT2', Uint8Array.from([1, ...encodeUtf16LeWithBom(title, true)]))
        : null;
    const frames = tit2 ? [tit2, uslt] : [uslt];

    if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
        const version = u8[3];
        const tagSize = readSyncsafe(u8, 6);
        const tagEnd = 10 + tagSize;
        const oldBody = u8.slice(10, tagEnd);
        const cleanedBody = stripFramesFromBody(oldBody, version, ['USLT', 'SYLT', 'TIT2']);
        const appendFrames = tit2 ? [tit2, uslt] : [uslt];
        const appendLen = appendFrames.reduce((sum, frame) => sum + frame.length, 0);
        const newBody = new Uint8Array(cleanedBody.length + appendLen);
        newBody.set(cleanedBody);
        let pos = cleanedBody.length;
        appendFrames.forEach((frame) => {
            newBody.set(frame, pos);
            pos += frame.length;
        });
        const merged = buildId3TagFromBody(newBody);
        const audio = u8.slice(tagEnd);
        return new Blob([merged, audio], { type: 'audio/mpeg' });
    }

    const tag = buildId3Tag(frames);
    const audioStart = findAudioStart(u8);
    const audio = u8.slice(audioStart);
    return new Blob([tag, audio], { type: 'audio/mpeg' });
}

export async function loadLamejs() {
    if (window.lamejs?.Mp3Encoder) return window.lamejs;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('lamejs load failed'));
        document.head.appendChild(s);
    });
    return window.lamejs;
}

export async function canSaveMp3WithLyrics(blob, fileName = '') {
    if (isMp3Blob(blob, fileName)) return { ok: true, mode: 'embed' };
    try {
        await loadLamejs();
        return { ok: true, mode: 'convert' };
    } catch {
        return { ok: false, mode: 'none' };
    }
}

function floatTo16(src) {
    const out = new Int16Array(src.length);
    for (let i = 0; i < src.length; i++) {
        const s = Math.max(-1, Math.min(1, src[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
}

export async function convertBlobToMp3(blob) {
    const lame = await loadLamejs();
    const ctx = new AudioContext();
    const ab = await blob.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(ab.slice(0));
    await ctx.close();

    const channels = audioBuf.numberOfChannels;
    const sampleRate = audioBuf.sampleRate;
    const left = floatTo16(audioBuf.getChannelData(0));
    const right = channels > 1 ? floatTo16(audioBuf.getChannelData(1)) : left;
    const encoder = new lame.Mp3Encoder(channels, sampleRate, 128);
    const block = 1152;
    const mp3Data = [];

    for (let i = 0; i < left.length; i += block) {
        const l = left.subarray(i, i + block);
        const r = right.subarray(i, i + block);
        const buf = channels > 1
            ? encoder.encodeBuffer(l, r)
            : encoder.encodeBuffer(l);
        if (buf.length) mp3Data.push(buf);
    }
    const end = encoder.flush();
    if (end.length) mp3Data.push(end);

    const total = mp3Data.reduce((n, b) => n + b.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    mp3Data.forEach((b) => {
        out.set(b, off);
        off += b.length;
    });
    return new Blob([out], { type: 'audio/mpeg' });
}

export async function buildMp3WithLyrics(blob, fileName, lrcText, title) {
    let mp3Blob;
    if (isMp3Blob(blob, fileName)) {
        mp3Blob = await embedLyricsInMp3Buffer(await blob.arrayBuffer(), lrcText, title);
    } else {
        const converted = await convertBlobToMp3(blob);
        mp3Blob = await embedLyricsInMp3Buffer(await converted.arrayBuffer(), lrcText, title);
    }
    return mp3Blob;
}
