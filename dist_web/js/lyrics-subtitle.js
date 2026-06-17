/**
 * 가사 자막 — 줄별 수동 타임 → 완료 시 타임라인 적용 · 로컬 저장은 클립보내기 사용
 */
import { calcLyricsFlowX } from './lyrics-flow.js';
import {
    buildMp3WithLyrics,
    canSaveMp3WithLyrics,
    extractEmbeddedLyricsFromMp3,
    isMp3Blob
} from './lyrics-mp3.js';
import { createWhisperLyricsExtractor, isWhisperHallucinationLine } from './lyrics-whisper-extract.js';

const OVERLAY_TRACK = window.TimelinePlacement?.OVERLAY4_INDEX ?? 3;

const state = {
    title: '가사',
    lines: [],
    audioSrc: '',
    audioName: '',
    audioBlob: null,
    duration: 0,
    clipStart: 0,
    activeLineIndex: -1,
    /** @type {{ type: 'path', filePath: string } | { type: 'handle', handle: FileSystemFileHandle } | { type: 'none' } | null} */
    audioSaveTarget: null,
    /** 타임라인에서 연 오디오 클립 (AUDIO1 추가 없음) */
    timelineAudioRef: null
};

const LRC_TIMESTAMP_RE = /^\[\d{1,2}:\d{2}/;
const STRUCTURE_TAG_ONLY_RE = /^\s*(\[[^\]]+\]|\([^)]+\)|\{[^}]+\}|【[^】]+】)\s*$/i;
const INLINE_STRUCTURE_TAG_RE = /^\s*(\[[^\]]+\]|\([^)]*\)|\{[^}]*\}|【[^】]*】)\s*/i;
const TRAILING_STRUCTURE_TAG_RE = /\s*(\[[^\]]+\]|\([^)]*\)|\{[^}]*\}|【[^】]*】)\s*$/i;

let focusTrapEl = null;
let tabTrapHandler = null;
/** @type {ReturnType<createWhisperLyricsExtractor> | null} */
let whisperExtractor = null;
/** MP3 내장 가사 — [가사자막 만들기] 시 타임 유지용 */
let embeddedLinesCache = null;
let isSavingMp3Lyrics = false;

function $(id) {
    return document.getElementById(id);
}

function formatTimeShort(sec) {
    sec = Math.max(0, sec || 0);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`;
}

function formatLrcTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function showToast(msg, ms = 3000) {
    if (window.showToast) window.showToast(msg, ms);
}

function clearLyricsInput() {
    const ta = $('lyricsTextInput');
    if (ta) ta.value = '';
}

function isPlausibleLyricsText(text) {
    const t = String(text || '').trim();
    if (!t) return false;
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

function isStructureTagOnly(line) {
    const t = line.trim();
    if (!t || LRC_TIMESTAMP_RE.test(t)) return false;
    if (STRUCTURE_TAG_ONLY_RE.test(t)) return true;
    if (/^\[(verse|chorus|bridge|intro|outro|pre-chorus|hook|interlude|후렴|절|간주)/i.test(t)) return true;
    return false;
}

function stripStructureTagsFromLine(line) {
    let t = String(line || '');
    if (LRC_TIMESTAMP_RE.test(t.trim())) return t.trim();
    let prev;
    do {
        prev = t;
        t = t.replace(INLINE_STRUCTURE_TAG_RE, '');
        t = t.replace(TRAILING_STRUCTURE_TAG_RE, '');
    } while (t !== prev);
    return t.trim();
}

function sanitizeLyricsText(text) {
    return text
        .split(/\r?\n/)
        .map(stripStructureTagsFromLine)
        .filter((t) => t && !isStructureTagOnly(t) && !isWhisperHallucinationLine(t))
        .join('\n');
}

function parseLyricsText(text) {
    return sanitizeLyricsText(text)
        .split(/\r?\n/)
        .filter(Boolean)
        .map((text) => ({ text, time: null }));
}

function parseLrcTimestampToSec(minStr, secStr, fracStr) {
    const m = parseInt(minStr, 10) || 0;
    const s = parseInt(secStr, 10) || 0;
    let frac = 0;
    if (fracStr != null && fracStr !== '') {
        const cs = String(fracStr).padEnd(2, '0').slice(0, 2);
        frac = parseInt(cs, 10) / 100;
    }
    return m * 60 + s + frac;
}

function parseLrcToLines(lrcText) {
    const lines = [];
    const ti = lrcText.match(/^\[ti:\s*(.*?)\s*\]\s*$/im);
    if (ti?.[1]) state.title = ti[1].trim();

    for (const raw of lrcText.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        const timed = line.match(/^\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]\s*(.*)$/);
        if (timed) {
            const textRaw = stripStructureTagsFromLine(timed[4]);
            const text = textRaw ? textRaw.replace(/\\n/g, '\n') : '';
            if (!text || isWhisperHallucinationLine(text)) continue;
            lines.push({
                text,
                time: parseLrcTimestampToSec(timed[1], timed[2], timed[3])
            });
            continue;
        }
        if (/^\[(ar|al|ti|by):/i.test(line)) continue;
        if (isStructureTagOnly(line)) continue;
        const textRaw = stripStructureTagsFromLine(line);
        const text = textRaw ? textRaw.replace(/\\n/g, '\n') : '';
        if (text && !isWhisperHallucinationLine(text)) lines.push({ text, time: null });
    }
    return lines;
}

function resetLyricsModalState() {
    stopWhisperExtraction();
    state.lines = [];
    state.activeLineIndex = -1;
    state.audioSrc = '';
    state.audioName = '';
    state.audioBlob = null;
    state.duration = 0;
    state.audioSaveTarget = null;
    state.timelineAudioRef = null;
    state.title = '가사';
    embeddedLinesCache = null;
    clearLyricsInput();
    const audio = $('lyricsAudioEl');
    if (audio) {
        audio.pause();
        audio.removeAttribute('src');
    }
    if ($('lyricsAudioFileName')) $('lyricsAudioFileName').textContent = '없음';
    const list = $('lyricsLineList');
    if (list) list.innerHTML = '';
    const box = $('lyricsFlowPreview');
    if (box) box.classList.remove('is-visible');
    if ($('lyricsFlowPreviewText')) $('lyricsFlowPreviewText').textContent = '';
    setExtractingUI(false);
}

function enterWorkPhaseFromEmbedded(embedded) {
    const lrcText = typeof embedded === 'string' ? embedded : embedded?.lrcText;
    if (!lrcText?.trim()) return false;
    if (!isPlausibleLyricsText(lrcText)) return false;

    const lines = parseLrcToLines(lrcText);
    if (!lines.length) return false;

    const validLines = lines.filter((l) => l.text && !isWhisperHallucinationLine(l.text));
    if (!validLines.length) return false;

    embeddedLinesCache = validLines;
    state.lines = validLines.map((l) => ({ text: l.text, time: l.time }));
    state.activeLineIndex = -1;
    const ta = $('lyricsTextInput');
    const text = validLines.map((l) => l.text).join('\n');
    if (ta) ta.value = text;
    showPhase('work');
    renderLineList();
    updateLyricsFlowPreview(0);
    updateMp3SaveButtonState();

    const timedCount = validLines.filter((l) => l.time != null).length;
    setStatus(
        timedCount > 0
            ? `MP3 내장 가사 ${validLines.length}줄 (타임 ${timedCount}개) — 수정 후 [완료]`
            : `MP3 내장 가사 ${validLines.length}줄 — 재생하며 타임을 맞춘 뒤 [완료]`
    );
    return true;
}

async function tryLoadEmbeddedMp3Lyrics(blob, fileName) {
    if (!isMp3Blob(blob, fileName)) return false;
    try {
        const embedded = await extractEmbeddedLyricsFromMp3(await blob.arrayBuffer());
        if (!embedded?.lrcText) return false;
        return enterWorkPhaseFromEmbedded(embedded);
    } catch (e) {
        console.warn('MP3 embedded lyrics read failed', e);
        return false;
    }
}

function getTimedLinesSorted() {
    return state.lines
        .map((line, index) => ({ ...line, index }))
        .filter((l) => l.time != null)
        .sort((a, b) => a.time - b.time);
}

function getActiveCueAt(t) {
    const timed = getTimedLinesSorted();
    if (!timed.length) return null;
    for (let i = timed.length - 1; i >= 0; i--) {
        if (t >= timed[i].time) {
            const next = timed[i + 1];
            return {
                line: timed[i],
                index: timed[i].index,
                end: next ? next.time : (state.duration || timed[i].time + 4)
            };
        }
    }
    return null;
}

function getSeekTimeForLine(index) {
    const line = state.lines[index];
    if (line?.time != null) return line.time;
    const timed = getTimedLinesSorted().filter((l) => l.index < index);
    if (timed.length) return timed[timed.length - 1].time;
    return 0;
}

function updateLyricsFlowPreview(t) {
    const box = $('lyricsFlowPreview');
    const textEl = $('lyricsFlowPreviewText');
    if (!box || !textEl) return;
    const active = getActiveCueAt(t);
    if (!active) {
        box.classList.remove('is-visible');
        textEl.textContent = '';
        textEl.style.transform = '';
        return;
    }
    const cueDur = Math.max(0.35, active.end - active.line.time);
    const prog = Math.max(0, Math.min(1, (t - active.line.time) / cueDur));
    const cw = box.clientWidth || 400;
    const textW = textEl.scrollWidth || 200;
    const left = calcLyricsFlowX(cw, textW, prog);
    box.classList.add('is-visible');
    textEl.textContent = active.line.text;
    textEl.style.transform = `translateX(${left}px)`;
    state.activeLineIndex = active.index;
}

function setStatus(msg) {
    const el = $('lyricsStatus');
    if (el) el.textContent = msg;
}

function showPhase(name) {
    $('lyricsInputPhase')?.classList.toggle('hidden', name !== 'input');
    $('lyricsWorkPhase')?.classList.toggle('hidden', name !== 'work');
}

function isWorkPhaseVisible() {
    const el = $('lyricsWorkPhase');
    return el && !el.classList.contains('hidden');
}

function hasLyricsLines() {
    return state.lines.some((l) => (l.text || '').trim() && !isWhisperHallucinationLine(l.text));
}

function hasLyricsLineText(line) {
    return !!String(line?.text || '').trim();
}

function getLyricsLinesWithText(lines = state.lines) {
    return (lines || [])
        .filter(hasLyricsLineText)
        .map((l) => ({ text: String(l.text || '').trim(), time: l.time }));
}

function getTimedLyricsLinesWithText(lines = state.lines) {
    return getLyricsLinesWithText(lines).filter((l) => l.time != null);
}

function getInputLyricsText() {
    return ($('lyricsTextInput')?.value || '').trim();
}

function isExtractingLyrics() {
    return whisperExtractor?.isActive?.() ?? false;
}

function setExtractingUI(active) {
    const prog = $('lyricsExtractProgress');
    const stopBtn = $('lyricsExtractStopBtn');
    if (prog) prog.classList.toggle('hidden', !active);
    if (stopBtn) stopBtn.classList.toggle('hidden', !active);
}

function updatePlayPauseBtnLabel() {
    const btn = $('lyricsPlayPauseBtn');
    const audio = $('lyricsAudioEl');
    if (!btn) return;
    if (isExtractingLyrics()) {
        btn.textContent = whisperExtractor?.isPaused?.() ? '▶ 추출 재개' : '⏸ 추출 일시정지';
        return;
    }
    btn.textContent = audio && !audio.paused ? '⏸ 일시정지' : '▶ 재생';
}

function appendWhisperChunksToLines(chunks, offsetSec) {
    chunks.forEach((chunk) => {
        if (isWhisperHallucinationLine(chunk.text)) return;
        const relStart = offsetSec + chunk.start;
        state.lines.push({
            text: chunk.text,
            time: relStart
        });
    });
    state.lines.sort((a, b) => (a.time ?? 9999) - (b.time ?? 9999));
}

function stopWhisperExtraction() {
    if (whisperExtractor) {
        whisperExtractor.destroy();
        whisperExtractor = null;
    }
    setExtractingUI(false);
    const prog = $('lyricsExtractProgress');
    if (prog) prog.textContent = '';
    updatePlayPauseBtnLabel();
}

async function startAutoLyricsExtract() {
    if (!state.audioBlob || isExtractingLyrics()) return;

    stopModalAudio();
    state.lines = [];
    state.activeLineIndex = -1;
    setExtractingUI(true);
    const prog = $('lyricsExtractProgress');
    if (prog) prog.textContent = 'AI 가사 추출을 시작합니다…';
    setStatus('AI 가사 추출 중… (최초 실행 시 모델 다운로드)');

    whisperExtractor = createWhisperLyricsExtractor({
        onStatus: (msg) => {
            setStatus(msg);
            if (prog) prog.textContent = msg;
        },
        onSegment: (chunks, offsetSec) => {
            appendWhisperChunksToLines(chunks, offsetSec);
            renderLineList();
            updateMp3SaveButtonState();
        },
        onComplete: (cueCount) => {
            whisperExtractor = null;
            setExtractingUI(false);
            if (cueCount > 0) {
                showPhase('work');
                renderLineList();
                updateLyricsFlowPreview(0);
                updateMp3SaveButtonState();
                setStatus(`AI 가사 ${cueCount}구간 추출 완료 — 확인 후 [완료]`);
                showToast(`가사 ${cueCount}구간을 자동 추출했습니다`, 3500);
            } else {
                setStatus('가사를 인식하지 못했습니다. 직접 입력해 주세요.');
                showToast('가사를 인식하지 못했습니다', 3000);
            }
            updatePlayPauseBtnLabel();
        },
        onError: (msg) => {
            whisperExtractor = null;
            setExtractingUI(false);
            setStatus(msg);
            if (prog) prog.textContent = '';
            showToast(msg, 4000);
            updatePlayPauseBtnLabel();
        }
    });

    try {
        await whisperExtractor.runFromBlob(state.audioBlob);
    } catch (e) {
        console.error(e);
        whisperExtractor = null;
        setExtractingUI(false);
        setStatus('오류: ' + (e.message || e));
        showToast('가사 추출 실패: ' + (e.message || e), 4000);
        updatePlayPauseBtnLabel();
    }
}

function getFocusableInModal() {
    const root = $('lyricsSubtitleModal');
    if (!root) return [];
    return [...root.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.offsetParent !== null);
}

function enableFocusTrap() {
    const modal = $('lyricsSubtitleModal');
    const panel = modal?.querySelector('.lyrics-modal-content');
    if (!modal || !panel) return;

    document.body.classList.add('lyrics-modal-open');
    focusTrapEl = panel;

    tabTrapHandler = (e) => {
        if (modal.style.display !== 'flex') return;
        const items = getFocusableInModal();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };
    document.addEventListener('keydown', tabTrapHandler);
    setTimeout(() => {
        const items = getFocusableInModal();
        (items[0] || panel).focus();
    }, 0);
}

function disableFocusTrap() {
    document.body.classList.remove('lyrics-modal-open');
    if (tabTrapHandler) {
        document.removeEventListener('keydown', tabTrapHandler);
        tabTrapHandler = null;
    }
    focusTrapEl = null;
}

function openModal({ reset = true } = {}) {
    const modal = $('lyricsSubtitleModal');
    if (!modal) return;
    if (reset) {
        resetLyricsModalState();
        showPhase('input');
    } else {
        clearLyricsInput();
    }
    modal.style.display = 'flex';
    enableFocusTrap();
}

function closeModal() {
    const modal = $('lyricsSubtitleModal');
    if (modal) modal.style.display = 'none';
    disableFocusTrap();
    stopWhisperExtraction();
    stopModalAudio();
    state.activeLineIndex = -1;
    const box = $('lyricsFlowPreview');
    if (box) box.classList.remove('is-visible');
}

function stopModalAudio() {
    const audio = $('lyricsAudioEl');
    if (audio) {
        audio.pause();
    }
}

function pathSidecar(filePath, ext) {
    const i = filePath.lastIndexOf('.');
    const base = i >= 0 ? filePath.slice(0, i) : filePath;
    return base + ext;
}

function rememberSavePath(filePath) {
    if (filePath) state.audioSaveTarget = { type: 'path', filePath };
}

async function saveBlobToAudioSource(blob, { defaultName, accept, targetPath, forceSaveDialog = false } = {}) {
    const pathToUse = forceSaveDialog
        ? null
        : (targetPath || (state.audioSaveTarget?.type === 'path' ? state.audioSaveTarget.filePath : null));

    if (pathToUse && window.writeBlobToFilePath) {
        const r = await window.writeBlobToFilePath(blob, pathToUse);
        if (r?.ok) {
            rememberSavePath(pathToUse);
            return { ok: true, path: pathToUse };
        }
    }

    if (!forceSaveDialog && state.audioSaveTarget?.type === 'handle' && state.audioSaveTarget.handle) {
        try {
            const wr = await state.audioSaveTarget.handle.createWritable();
            await wr.write(blob);
            await wr.close();
            return { ok: true };
        } catch (e) {
            console.error(e);
        }
    }

    const r = await window.saveClipToDiskDetailed?.(blob, defaultName, accept)
        || { ok: await window.saveClipToDisk(blob, defaultName, accept) };
    if (r.ok) {
        if (r.path) rememberSavePath(r.path);
        else if (r.handle) state.audioSaveTarget = { type: 'handle', handle: r.handle };
    }
    return r;
}

async function loadAudioBlob(blob, name, saveTarget = null) {
    state.audioBlob = blob;
    state.audioName = name || 'audio';
    state.title = name.replace(/\.[^.]+$/, '') || '가사';
    state.lines = [];
    state.activeLineIndex = -1;
    embeddedLinesCache = null;
    clearLyricsInput();
    if (saveTarget) state.audioSaveTarget = saveTarget;
    const url = URL.createObjectURL(blob);
    state.audioSrc = url;
    const audio = $('lyricsAudioEl');
    if (!audio) return;
    audio.src = url;
    await new Promise((res) => {
        audio.onloadedmetadata = () => res();
        audio.onerror = () => res();
    });
    state.duration = audio.duration || 0;
    const seek = $('lyricsAudioSeek');
    if (seek) seek.max = Math.max(1, Math.floor(state.duration * 10));
    if ($('lyricsAudioDur')) $('lyricsAudioDur').textContent = formatTimeShort(state.duration);
    if ($('lyricsAudioCur')) $('lyricsAudioCur').textContent = '00:00';
    updateMp3SaveButtonState();
}

function renderLineList() {
    const list = $('lyricsLineList');
    if (!list) return;
    list.innerHTML = '';
    state.lines.forEach((line, index) => {
        const row = document.createElement('div');
        row.dataset.index = String(index);
        const classes = ['lyrics-line-row'];
        if (line.time != null) classes.push('is-timed');
        if (index === state.activeLineIndex) classes.push('is-active');
        row.className = classes.join(' ');

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'lyrics-line-play-btn';
        playBtn.textContent = '▶';
        playBtn.title = line.time != null
            ? `${formatTimeShort(line.time)}부터 재생·타임 조정`
            : '이전 타임 위치부터 재생';
        playBtn.addEventListener('click', () => playFromLine(index));

        const timeBtn = document.createElement('button');
        timeBtn.type = 'button';
        timeBtn.className = 'lyrics-line-time-btn';
        timeBtn.textContent = '타임';
        timeBtn.addEventListener('click', () => markLineTime(index));

        const timeLabel = document.createElement('span');
        timeLabel.className = 'lyrics-line-time-label';
        timeLabel.textContent = line.time != null ? formatTimeShort(line.time) : '--:--';

        const input = document.createElement('textarea');
        input.className = 'lyrics-line-input';
        input.value = line.text;
        input.rows = 1;
        input.style.setProperty('resize', 'none', 'important');
        input.style.setProperty('overflow-y', 'hidden', 'important');
        input.style.setProperty('font-family', 'inherit', 'important');
        input.style.setProperty('line-height', '1.4', 'important');
        input.style.setProperty('padding', '3px 8px', 'important');
        input.style.setProperty('box-sizing', 'border-box', 'important');
        input.style.setProperty('min-height', '24px', 'important');
        
        const adjustHeight = () => {
            input.style.setProperty('height', 'auto', 'important');
            const sh = input.scrollHeight;
            const lineCount = (input.value || '').split('\n').length;
            const minEstimate = Math.max(24, lineCount * 18 + 6);
            const targetHeight = Math.max(minEstimate, sh + 2);
            input.style.setProperty('height', targetHeight + 'px', 'important');
        };
        
        input.addEventListener('input', () => {
            line.text = input.value;
            adjustHeight();
        });
        
        input.addEventListener('focus', () => {
            adjustHeight();
        });
        
        adjustHeight();
        requestAnimationFrame(() => adjustHeight());

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'lyrics-line-add-btn';
        addBtn.textContent = '+';
        addBtn.title = '바로 아래에 가사/타임 입력 줄 추가';
        addBtn.addEventListener('click', () => insertLineAfter(index));

        row.appendChild(playBtn);
        row.appendChild(timeBtn);
        row.appendChild(timeLabel);
        row.appendChild(input);
        row.appendChild(addBtn);
        list.appendChild(row);
    });
    highlightActiveRow(state.activeLineIndex, true);
}

function insertLineAfter(index) {
    const insertAt = Math.max(0, Math.min(state.lines.length, index + 1));
    state.lines.splice(insertAt, 0, { text: '', time: null });
    state.activeLineIndex = insertAt;
    renderLineList();
    updateMp3SaveButtonState();
    setStatus(`${insertAt + 1}줄 입력창 추가됨 — 가사를 입력하고 타임을 기록하세요`);

    requestAnimationFrame(() => {
        const list = $('lyricsLineList');
        const row = list?.querySelector(`.lyrics-line-row[data-index="${insertAt}"]`);
        const input = row?.querySelector('.lyrics-line-input');
        input?.focus();
    });
}

function highlightActiveRow(index, scroll) {
    const list = $('lyricsLineList');
    if (!list) return;
    [...list.children].forEach((row, i) => {
        row.classList.toggle('is-active', i === index);
        row.classList.toggle('is-timed', state.lines[i]?.time != null);
    });
    if (scroll && index >= 0 && list.children[index]) {
        list.children[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function playFromLine(index) {
    const audio = $('lyricsAudioEl');
    if (!audio) return;
    const t = getSeekTimeForLine(index);
    audio.currentTime = t;
    state.activeLineIndex = index;
    renderLineList();
    audio.play().catch(() => {});
    updatePlayPauseBtnLabel();
    updateLyricsFlowPreview(t);
    setStatus(`${index + 1}줄 — ${formatTimeShort(t)}부터 재생 (타임 버튼으로 조정)`);
}

function markLineTime(index) {
    const audio = $('lyricsAudioEl');
    const t = Math.max(0, (audio?.currentTime ?? 0) - 0.2);
    const line = state.lines[index];
    if (!line) return;
    line.time = t;
    state.activeLineIndex = index;
    renderLineList();
    updateLyricsFlowPreview(t);
    updateMp3SaveButtonState();
    const next = state.lines.findIndex((l, i) => i > index && l.time == null);
    setStatus(next >= 0
        ? `${index + 1}줄 기록됨 — 다음: ${next + 1}줄`
        : '모든 줄 타임 기록됨 — 수정 후 [완료]를 누르세요');
}

function buildLrc() {
    const out = [`[ti:${state.title}]`];
    const sorted = getLyricsLinesWithText().sort((a, b) => (a.time ?? 9999) - (b.time ?? 9999));
    sorted.forEach((line) => {
        const textEscaped = (line.text || '').replace(/\r?\n/g, '\\n');
        if (line.time != null) out.push(`[${formatLrcTime(line.time)}]${textEscaped}`);
        else out.push(textEscaped);
    });
    return out.join('\n');
}

function buildLrcFromLines(lines, title = state.title) {
    const out = [`[ti:${title || '가사'}]`];
    const sorted = getLyricsLinesWithText(lines).sort((a, b) => (a.time ?? 9999) - (b.time ?? 9999));
    sorted.forEach((line) => {
        const textEscaped = (line.text || '').replace(/\r?\n/g, '\\n');
        if (line.time != null) out.push(`[${formatLrcTime(line.time)}]${textEscaped}`);
        else out.push(textEscaped);
    });
    return out.join('\n');
}

async function blobToBase64(blob) {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function buildClipPayload() {
    return {
        version: 3,
        type: 'lyricsClip',
        title: state.title,
        audioName: state.audioName,
        duration: state.duration,
        clipStart: state.clipStart,
        overlayTrack: OVERLAY_TRACK,
        lines: getLyricsLinesWithText(),
        lrc: buildLrc(),
        createdAt: new Date().toISOString()
    };
}

async function buildClipPayloadWithAudio() {
    const payload = buildClipPayload();
    if (state.audioSaveTarget?.type === 'path') {
        payload.sourceAudioPath = state.audioSaveTarget.filePath;
    }
    if (state.audioBlob) {
        payload.audioMime = state.audioBlob.type || 'application/octet-stream';
        payload.audioBase64 = await blobToBase64(state.audioBlob);
    }
    return payload;
}

function findLyricsOverlayForAudio(audioObj) {
    const canvas = window.canvas;
    if (!canvas || !audioObj) return null;
    if (audioObj.lyricsClipId) {
        return canvas.getObjects().find((o) => o.isLyricsFlowClip && o.lyricsClipId === audioObj.lyricsClipId);
    }
    const name = audioObj.layerName;
    return canvas.getObjects().find((o) =>
        o.isLyricsFlowClip && o.layerName === name
        && Math.abs((o.startTime || 0) - (audioObj.startTime || 0)) < 0.05
    );
}

function getLyricsClipExportTarget() {
    const obj = window.canvas?.getActiveObject?.() || window.lastSelectedObj;
    if (!obj) return null;
    if (obj.isLyricsFlowClip && obj.lyricsClipPayload) {
        const title = obj.lyricsClipPayload.title || obj.layerName || 'lyrics';
        const lines = Array.isArray(obj.subtitleCues)
            ? obj.subtitleCues.map((cue) => ({ text: cue.text, time: cue.start }))
            : (obj.lyricsClipPayload.lines || []);
        return {
            payload: {
                ...obj.lyricsClipPayload,
                title,
                lines,
                lrc: buildLrcFromLines(lines, title)
            },
            title
        };
    }
    if (obj.trackType === 'audio') {
        const overlay = findLyricsOverlayForAudio(obj);
        if (overlay?.lyricsClipPayload) {
            const title = overlay.lyricsClipPayload.title || overlay.layerName || obj.layerName || 'lyrics';
            const lines = Array.isArray(overlay.subtitleCues)
                ? overlay.subtitleCues.map((cue) => ({ text: cue.text, time: cue.start }))
                : (overlay.lyricsClipPayload.lines || []);
            return {
                payload: {
                    ...overlay.lyricsClipPayload,
                    title,
                    lines,
                    lrc: buildLrcFromLines(lines, title)
                },
                title
            };
        }
    }
    return null;
}

function buildSubtitleCues() {
    const sorted = getTimedLyricsLinesWithText()
        .sort((a, b) => a.time - b.time);
    return sorted.map((line, i) => {
        const next = sorted[i + 1];
        const end = next ? next.time : line.time + 4;
        return { text: line.text, start: line.time, end: Math.max(end, line.time + 0.5) };
    });
}

function resolveLyricsTimelineRange() {
    const dur = state.duration || 10;
    const name = state.audioName || state.title;
    const preferred = typeof window.getTimelineCurrentTime === 'function'
        ? window.getTimelineCurrentTime()
        : 0;
    if (window.TimelinePlacement?.resolveLyricsPlacement) {
        const p = window.TimelinePlacement.resolveLyricsPlacement(name, dur, { preferredStart: preferred });
        if (p.matchedAudio) state.timelineAudioRef = p.matchedAudio;
        else if (p.mode === 'empty') state.timelineAudioRef = null;
        return { start: p.start, dur: p.dur, mode: p.mode };
    }
    return { start: preferred, dur, mode: 'empty' };
}

function applyLyricsToTimeline(clipPayload, lyricsClipId, placement) {
    const Fabric = window.fabric;
    const canvas = window.canvas;
    if (!Fabric?.IText || !canvas) {
        showToast('타임라인을 사용할 수 없습니다', 3000);
        return null;
    }

    const resolved = placement || resolveLyricsTimelineRange();
    const start = resolved.start;
    const dur = resolved.dur;
    state.clipStart = start;
    const cues = buildSubtitleCues();

    const textObj = new Fabric.IText(cues[0]?.text || state.title, {
        left: canvas.width / 2,
        top: canvas.height - 120,
        fontFamily: 'Pretendard',
        fontSize: 56,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 4,
        originX: 'center',
        originY: 'center',
        fontWeight: 'bold',
        textAlign: 'center',
        opacity: 0
    });

    textObj.isTimedSubtitleClip = true;
    textObj.isLyricsFlowClip = true;
    textObj.subtitleCues = cues;
    textObj.startTime = start;
    textObj.endTime = start + dur;
    textObj.trackType = 'overlay';
    textObj.trackIndex = OVERLAY_TRACK;
    textObj.layerName = state.title;
    textObj.baseOpacity = 1;
    textObj.baseLeft = canvas.width / 2;
    textObj.baseTop = canvas.height - 120;
    textObj.trimStart = 0;
    textObj.lyricsClipId = lyricsClipId;
    textObj.lyricsClipPayload = clipPayload;

    if (state.timelineAudioRef) {
        state.timelineAudioRef.lyricsClipId = lyricsClipId;
    }

    canvas.add(textObj);
    if (typeof window.sortCanvasLayers === 'function') window.sortCanvasLayers();
    if (typeof window.renderTracks === 'function') window.renderTracks();
    if (typeof window.applyTimedSubtitleVisibility === 'function') window.applyTimedSubtitleVisibility();
    canvas.requestRenderAll();
    return textObj;
}

async function completeWorkflow() {
    const timed = getTimedLyricsLinesWithText();
    if (!timed.length) {
        showToast('최소 한 줄에 타임을 기록한 뒤 완료하세요', 3500);
        return;
    }
    const untimed = state.lines.length - timed.length;
    if (untimed > 0) {
        showToast(`${untimed}개 줄은 타임 없음 — 제외하고 저장합니다`, 3500);
    }
    state.lines = timed;

    const lyricsClipId = 'lyrics_' + Date.now();
    const payload = await buildClipPayloadWithAudio();
    const placement = resolveLyricsTimelineRange();

    applyLyricsToTimeline(payload, lyricsClipId, placement);

    if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();
    const msg = placement.mode === 'sync'
        ? `「${state.title}」 가사자막 → OVERLAY 4 (동일 오디오에 맞춤)`
        : `「${state.title}」 가사자막 → OVERLAY 4 빈 구간`;
    showToast(msg + ' — 로컬 저장으로 파일 보관', 4500);
    closeModal();
}

async function openLyricsFromTimelineSelection() {
    const obj = window.lastSelectedObj;
    if (!obj || obj.trackType !== 'audio' || !obj.audio?.src) {
        showToast('타임라인에서 오디오 클립을 먼저 선택하세요', 3000);
        return false;
    }
    try {
        const resp = await fetch(obj.audio.src);
        const blob = await resp.blob();
        const audioName = obj.layerName || 'audio.mp3';
        state.timelineAudioRef = obj;
        const saveTarget = obj.sourceFilePath
            ? { type: 'path', filePath: obj.sourceFilePath }
            : { type: 'none' };
        await loadAudioBlob(blob, audioName, saveTarget);
        if ($('lyricsAudioFileName')) {
            $('lyricsAudioFileName').textContent = audioName;
        }
        openModal({ reset: false });
        showPhase('input');
        if (await tryLoadEmbeddedMp3Lyrics(blob, audioName)) {
            showToast('MP3 내장 가사를 불러왔습니다. 수정 후 완료하세요.', 3000);
            return true;
        }
        return true;
    } catch {
        showToast('오디오를 불러올 수 없습니다', 3000);
        return false;
    }
}

async function updateMp3SaveButtonState() {
    const btn = $('lyricsSaveMp3Btn');
    if (!btn) return;
    const timed = getTimedLyricsLinesWithText().length > 0;
    if (!state.audioBlob || !timed) {
        btn.disabled = true;
        btn.title = '타임 기록 후 MP3 가사 저장 가능';
        return;
    }
    const cap = await canSaveMp3WithLyrics(state.audioBlob, state.audioName);
    btn.disabled = !cap.ok;
    if (!cap.ok) {
        btn.title = 'MP3 변환 불가 — MP3 파일만 직접 저장 가능';
    } else if (cap.mode === 'embed') {
        btn.title = '불러온 MP3 원본 위치에 가사(USLT) 삽입 저장';
    } else {
        btn.title = 'MP3로 변환 후 원본 위치(또는 저장 대화상자)에 가사 삽입';
    }
}

async function saveMp3WithLyrics() {
    if (isSavingMp3Lyrics) return;
    const timed = getTimedLyricsLinesWithText();
    if (!timed.length || !state.audioBlob) {
        showToast('타임이 있는 가사와 오디오가 필요합니다', 3000);
        return;
    }
    state.lines = timed;
    const lrc = buildLrc();
    const srcPath = state.audioSaveTarget?.type === 'path' ? state.audioSaveTarget.filePath : null;
    const sourceName = (srcPath ? srcPath.split(/[/\\]/).pop() : state.audioName) || '';
    const defaultName = /\.mp3$/i.test(sourceName)
        ? sourceName
        : `${sourceName.replace(/\.[^.]+$/, '') || state.title || 'lyrics'}.mp3`;

    let saveTarget;
    try {
        saveTarget = await window.pickSaveFileTarget?.(defaultName, { 'audio/mpeg': ['.mp3'] });
    } catch (e) {
        console.error(e);
        showToast('저장 위치 선택 실패: ' + (e.message || '저장창 열기 실패'), 4500);
        return;
    }
    if (!saveTarget?.ok) {
        showToast('MP3 저장을 취소했습니다', 2000);
        return;
    }

    const saveBtn = $('lyricsSaveMp3Btn');
    isSavingMp3Lyrics = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';
    }
    try {
        const mp3 = await buildMp3WithLyrics(state.audioBlob, state.audioName, lrc, state.title);
        const r = await window.writeBlobToSaveTarget(mp3, saveTarget);
        if (r.ok) {
            state.audioBlob = mp3;
            if (r.path) state.audioSaveTarget = { type: 'path', filePath: r.path };
            else if (r.handle) state.audioSaveTarget = { type: 'handle', handle: r.handle };
            const url = URL.createObjectURL(mp3);
            state.audioSrc = url;
            const audio = $('lyricsAudioEl');
            if (audio) audio.src = url;
            await updateMp3SaveButtonState();
            showToast('MP3 가사가 저장되었습니다', 3500);
        } else {
            showToast('MP3 저장을 취소했습니다', 2000);
        }
    } catch (e) {
        console.error(e);
        showToast('MP3 저장 실패: ' + (e.message || '파일 저장 불가'), 4500);
    } finally {
        isSavingMp3Lyrics = false;
        if (saveBtn) {
            saveBtn.textContent = 'MP3 가사 저장';
            await updateMp3SaveButtonState();
        }
    }
}

async function applyClipPayloadToTimeline(payload, atTime) {
    const payloadTitle = payload.title || '가사';
    state.title = payloadTitle;
    state.audioName = payload.audioName || 'audio';
    state.duration = payload.duration || 0;
    const payloadLines = (payload.lines || []).map((l) => ({ text: l.text, time: l.time }));
    state.lines = payloadLines;
    state.clipStart = atTime ?? payload.clipStart ?? 0;

    if (payload.audioBase64) {
        const mime = payload.audioMime || 'audio/mpeg';
        const bin = atob(payload.audioBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const saveTarget = payload.sourceAudioPath
            ? { type: 'path', filePath: payload.sourceAudioPath }
            : { type: 'none' };
        await loadAudioBlob(new Blob([bytes], { type: mime }), state.audioName, saveTarget);
        state.title = payloadTitle;
        state.duration = payload.duration || state.duration;
        state.lines = payloadLines;
        state.clipStart = atTime ?? payload.clipStart ?? 0;
    } else {
        showToast('오디오 데이터가 없는 클립입니다', 3500);
        return false;
    }

    const lyricsClipId = 'lyrics_' + Date.now();
    const fullPayload = { ...payload, clipStart: state.clipStart };
    const placement = resolveLyricsTimelineRange();
    applyLyricsToTimeline(fullPayload, lyricsClipId, placement);
    if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();
    if (typeof window.renderTracks === 'function') window.renderTracks();
    const msg = placement.mode === 'sync'
        ? `가사 클립을 OVERLAY 4에 맞춤 (동일 오디오)`
        : `가사 클립을 OVERLAY 4 빈 구간에 배치`;
    showToast(msg, 3500);
    return true;
}

window.saveSelectedLyricsClipLocal = async function () {
    const target = getLyricsClipExportTarget();
    if (!target) return false;
    if (!target.payload?.lines?.length) {
        showToast('저장할 가사 내용이 없습니다', 3000);
        return true;
    }
    const name = (document.getElementById('clipPresetNameInput')?.value || '').trim()
        || target.title || 'lyrics';
    const blob = new Blob([JSON.stringify(target.payload, null, 2)], { type: 'application/json' });
    const srcPath = target.payload?.sourceAudioPath
        || (state.audioSaveTarget?.type === 'path' ? state.audioSaveTarget.filePath : null);
    const sidecar = srcPath ? pathSidecar(srcPath, '.lyricsclip.json') : null;
    const r = await saveBlobToAudioSource(blob, {
        defaultName: name + '.lyricsclip.json',
        accept: { 'application/json': ['.json', '.lyricsclip.json'] },
        targetPath: sidecar
    });
    if (r.ok) {
        showToast(sidecar ? `가사 클립이 원본 옆에 저장됨` : `가사 클립 「${name}」 저장됨`, 3000);
        const nameInput = document.getElementById('clipPresetNameInput');
        if (nameInput) nameInput.value = '';
    }
    return !!r.ok;
};

window.importLyricsClipFile = async function (file) {
    if (!file) return false;
    try {
        const payload = JSON.parse(await file.text());
        if (payload?.type !== 'lyricsClip' || !Array.isArray(payload.lines)) {
            showToast('가사 클립(.lyricsclip.json) 형식이 아닙니다', 3000);
            return false;
        }
        const at = typeof window.getTimelineCurrentTime === 'function'
            ? window.getTimelineCurrentTime()
            : 0;
        await applyClipPayloadToTimeline(payload, at);
        return true;
    } catch {
        showToast('가사 클립 파일을 읽을 수 없습니다', 3000);
        return false;
    }
};

window.loadLyricsClipIntoModal = async function (file) {
    if (!file) return false;
    try {
        const payload = JSON.parse(await file.text());
        if (payload?.type !== 'lyricsClip') {
            showToast('가사 클립(.lyricsclip.json) 형식이 아닙니다', 3000);
            return false;
        }

        const payloadTitle = payload.title || file.name.replace(/\.(lyricsclip\.)?json$/i, '') || '가사';
        const linesFromPayload = Array.isArray(payload.lines)
            ? payload.lines.map((l) => ({ text: l?.text || '', time: l?.time }))
            : [];
        const linesFromCues = Array.isArray(payload.subtitleCues)
            ? payload.subtitleCues.map((c) => ({ text: c?.text || '', time: c?.start }))
            : [];
        const linesFromLrc = (!linesFromPayload.length && !linesFromCues.length && typeof payload.lrc === 'string')
            ? parseLrcToLines(payload.lrc)
            : [];
        const mergedLines = (linesFromPayload.length ? linesFromPayload
            : (linesFromCues.length ? linesFromCues : linesFromLrc))
            .filter((l) => (l.text || '').trim())
            .map((l) => ({ text: stripStructureTagsFromLine(l.text), time: l.time ?? null }));

        if (!mergedLines.length) {
            showToast('가사 클립에 표시할 가사 내용이 없습니다', 3000);
            return false;
        }

        const loadedLines = mergedLines.map((l) => ({ text: l.text, time: l.time }));

        state.title = payloadTitle;
        state.audioName = payload.audioName || state.audioName || 'audio';
        state.duration = payload.duration || state.duration || 0;
        state.clipStart = payload.clipStart || 0;
        state.lines = loadedLines.map((l) => ({ text: l.text, time: l.time }));
        embeddedLinesCache = loadedLines.map((l) => ({ text: l.text, time: l.time }));

        const ta = $('lyricsTextInput');
        if (ta) ta.value = state.lines.map((l) => l.text).join('\n');

        if (payload.audioBase64) {
            const mime = payload.audioMime || 'audio/mpeg';
            const bin = atob(payload.audioBase64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            await loadAudioBlob(new Blob([bytes], { type: mime }), state.audioName, { type: 'none' });
            state.title = payloadTitle;
            state.duration = payload.duration || state.duration;
            state.lines = loadedLines.map((l) => ({ text: l.text, time: l.time }));
            embeddedLinesCache = loadedLines.map((l) => ({ text: l.text, time: l.time }));
            if (ta) ta.value = state.lines.map((l) => l.text).join('\n');
            if ($('lyricsAudioFileName')) $('lyricsAudioFileName').textContent = state.audioName;
        }

        state.activeLineIndex = -1;
        showPhase('work');
        renderLineList();
        updateLyricsFlowPreview(0);
        updateMp3SaveButtonState();
        setStatus('가사 클립을 불러왔습니다. 지금 바로 타임을 수정할 수 있습니다.');
        return true;
    } catch (e) {
        console.error(e);
        showToast('가사 클립 파일을 읽을 수 없습니다', 3000);
        return false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = $('lyricsSubtitleBtn');
    if (!openBtn) return;

    const modal = $('lyricsSubtitleModal');
    if (modal) modal.style.display = 'none';
    clearLyricsInput();
    showPhase('input');

    openBtn.addEventListener('click', async () => {
        const sel = window.lastSelectedObj;
        if (sel?.trackType === 'audio' && sel.audio?.src) {
            resetLyricsModalState();
            await openLyricsFromTimelineSelection();
            return;
        }
        openModal({ reset: true });
    });

    $('lyricsModalCloseBtn')?.addEventListener('click', closeModal);

    async function pickLyricsAudioFile() {
        try {
            if (window.motionDesktop?.pickAudioFile) {
                const r = await window.motionDesktop.pickAudioFile();
                if (!r?.ok) return;
                const blob = new Blob([r.data], { type: 'audio/mpeg' });
                const name = r.filePath.split(/[/\\]/).pop();
                state.timelineAudioRef = null;
                await loadAudioBlob(blob, name, { type: 'path', filePath: r.filePath });
                if ($('lyricsAudioFileName')) $('lyricsAudioFileName').textContent = name;
                if (await tryLoadEmbeddedMp3Lyrics(blob, name)) {
                    showToast('MP3 내장 가사를 불러왔습니다', 2500);
                }
                updateMp3SaveButtonState();
                return;
            }
            if (window.showOpenFilePicker) {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Audio',
                        accept: {
                            'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.flac']
                        }
                    }],
                    multiple: false
                });
                const file = await handle.getFile();
                state.timelineAudioRef = null;
                await loadAudioBlob(file, file.name, { type: 'handle', handle });
                if ($('lyricsAudioFileName')) $('lyricsAudioFileName').textContent = file.name;
                if (await tryLoadEmbeddedMp3Lyrics(file, file.name)) {
                    showToast('MP3 내장 가사를 불러왔습니다', 2500);
                }
                updateMp3SaveButtonState();
                return;
            }
        } catch (e) {
            if (e?.name === 'AbortError') return;
            console.error(e);
        }
        $('lyricsAudioFile')?.click();
    }

    $('lyricsAudioPickBtn')?.addEventListener('click', () => pickLyricsAudioFile());
    $('lyricsAudioFile')?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        state.timelineAudioRef = null;
        await loadAudioBlob(f, f.name, { type: 'none' });
        if ($('lyricsAudioFileName')) $('lyricsAudioFileName').textContent = f.name;
        if (await tryLoadEmbeddedMp3Lyrics(f, f.name)) {
            showToast('MP3 내장 가사를 불러왔습니다', 2500);
        }
        updateMp3SaveButtonState();
    });

    $('lyricsPrepareBtn')?.addEventListener('click', () => {
        if (!state.audioSrc) {
            showToast('오디오 파일을 선택하세요', 3000);
            return;
        }
        const raw = getInputLyricsText();
        if (!raw) {
            state.lines = [];
            state.activeLineIndex = -1;
            showPhase('work');
            renderLineList();
            updateLyricsFlowPreview(0);
            updateMp3SaveButtonState();
            setStatus('가사가 없습니다. ▶ 재생으로 AI 가사를 추출할 수 있습니다.');
            return;
        }
        const cleaned = sanitizeLyricsText(raw);
        const ta = $('lyricsTextInput');
        if (ta && cleaned !== raw) {
            ta.value = cleaned;
            showToast('구조 태그([Verse] 등)를 제거했습니다', 2500);
        }
        if (!cleaned) {
            showToast('가사 본문이 없습니다 (태그만 있었을 수 있음)', 3000);
            return;
        }
        if (embeddedLinesCache?.length) {
            const editedLines = cleaned.split(/\r?\n/).filter(Boolean);
            state.lines = editedLines.map((text, index) => ({
                text,
                time: embeddedLinesCache[index]?.time ?? null
            }));
            embeddedLinesCache = null;
        } else {
            state.lines = parseLyricsText(cleaned);
            embeddedLinesCache = null;
        }
        state.activeLineIndex = -1;
        showPhase('work');
        renderLineList();
        updateLyricsFlowPreview(0);
        updateMp3SaveButtonState();
        setStatus('▶ 재생 후 각 줄 [▶]·[타임]으로 시간을 맞추세요');
    });

    $('lyricsPlayPauseBtn')?.addEventListener('click', async () => {
        if (!isWorkPhaseVisible()) return;
        if (!state.audioSrc) {
            showToast('오디오 파일을 선택하세요', 3000);
            return;
        }

        if (isExtractingLyrics()) {
            if (whisperExtractor.isPaused()) whisperExtractor.resume();
            else whisperExtractor.pause();
            updatePlayPauseBtnLabel();
            return;
        }

        if (!hasLyricsLines()) {
            await startAutoLyricsExtract();
            return;
        }

        const audio = $('lyricsAudioEl');
        if (!audio) return;
        if (audio.paused) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
        updatePlayPauseBtnLabel();
    });

    $('lyricsExtractStopBtn')?.addEventListener('click', () => {
        if (!isExtractingLyrics()) return;
        stopWhisperExtraction();
        if (state.lines.length) {
            showPhase('work');
            renderLineList();
            setStatus('추출을 중지했습니다. 지금까지 인식된 가사를 확인하세요.');
        } else {
            setStatus('추출을 중지했습니다. 가사를 입력하거나 다시 재생하세요.');
        }
    });

    const audio = $('lyricsAudioEl');
    if (audio) {
        audio.addEventListener('timeupdate', () => {
            const t = audio.currentTime;
            if ($('lyricsAudioCur')) $('lyricsAudioCur').textContent = formatTimeShort(t);
            const seek = $('lyricsAudioSeek');
            if (seek && state.duration) seek.value = Math.floor(t * 10);
            const cue = getActiveCueAt(t);
            const nextIdx = cue ? cue.index : -1;
            if (nextIdx !== state.activeLineIndex) {
                state.activeLineIndex = nextIdx;
                highlightActiveRow(nextIdx, true);
            }
            updateLyricsFlowPreview(t);
        });
        audio.addEventListener('ended', () => updatePlayPauseBtnLabel());
        audio.addEventListener('pause', () => {
            const t = audio.currentTime;
            updateLyricsFlowPreview(t);
            updatePlayPauseBtnLabel();
        });
        audio.addEventListener('play', () => updatePlayPauseBtnLabel());
    }

    $('lyricsAudioSeek')?.addEventListener('input', () => {
        const audio = $('lyricsAudioEl');
        const seek = $('lyricsAudioSeek');
        if (audio && seek) audio.currentTime = Number(seek.value) / 10;
    });

    $('lyricsCompleteBtn')?.addEventListener('click', () => completeWorkflow());
    $('lyricsSaveMp3Btn')?.addEventListener('click', () => saveMp3WithLyrics());

    const modalClipInput = $('lyricsModalClipInput');
    $('lyricsModalClipImportBtn')?.addEventListener('click', () => modalClipInput?.click());
    modalClipInput?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (f) {
            await window.loadLyricsClipIntoModal(f);
        }
        e.target.value = '';
    });

    const loadLyricsInput = document.getElementById('loadLyricsClipInput');
    const loadClipLocalBtn = document.getElementById('loadClipLocalBtn');
    if (loadClipLocalBtn && loadLyricsInput) {
        loadClipLocalBtn.addEventListener('click', () => {
            loadLyricsInput.value = '';
            loadLyricsInput.click();
        });
        loadLyricsInput.addEventListener('change', async (e) => {
            const f = e.target.files?.[0];
            if (f) {
                const name = (f.name || '').toLowerCase();
                if (name.endsWith('.json') || name.endsWith('.lyricsclip.json')) {
                    await window.importLyricsClipFile(f);
                } else if (typeof window.importLocalMediaClipFile === 'function') {
                    await window.importLocalMediaClipFile(f);
                } else {
                    showToast('이 파일 형식은 불러올 수 없습니다', 3000);
                }
            }
            e.target.value = '';
        });
    }
});

window.lyricsSubtitle = {
    buildLrc,
    buildClipPayload,
    sanitizeLyricsText,
    stripStructureTagsFromLine,
    openLyricsFromTimelineSelection,
    parseLrcToLines,
    tryLoadEmbeddedMp3Lyrics
};
