/**
 * Whisper 기반 오디오 → 타임스탬프 가사 줄 추출 (가사자막 팝업·타임라인 공용)
 */
const SEGMENT_SEC = 10;
const SAMPLE_RATE = 16000;

export async function loadAudioSamplesFromBlob(blob, { offsetSec = 0, durationSec = null } = {}) {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        const sr = audioBuffer.sampleRate;
        const channel = audioBuffer.getChannelData(0);
        const totalDur = channel.length / sr;
        const clipDur = durationSec != null ? durationSec : Math.max(0.1, totalDur - offsetSec);
        const start = Math.max(0, Math.floor(offsetSec * sr));
        const end = Math.min(channel.length, Math.ceil((offsetSec + clipDur) * sr));
        if (end <= start) throw new Error('분석할 오디오 구간이 비어 있습니다.');
        return channel.subarray(start, end);
    } finally {
        try { await audioCtx.close(); } catch (e) { /* ignore */ }
    }
}

export async function loadAudioSamplesFromUrl(src, media) {
    const response = await fetch(src);
    if (!response.ok) throw new Error('오디오/비디오 파일을 불러올 수 없습니다.');
    const blob = await response.blob();
    return loadAudioSamplesFromBlob(blob, {
        offsetSec: media.mediaOffset || 0,
        durationSec: media.clipDuration
    });
}

function splitIntoSegments(samples) {
    const segLen = SEGMENT_SEC * SAMPLE_RATE;
    const segments = [];
    for (let i = 0; i < samples.length; i += segLen) {
        segments.push(samples.subarray(i, Math.min(i + segLen, samples.length)));
    }
    return segments.length ? segments : [new Float32Array(0)];
}

/** Whisper 무음·끝 구간 환각(중국어 등) 필터 */
const WHISPER_HALLUCINATION_RE = /^(谢谢大家|感谢观看|感谢收听|字幕由|字幕提供|请不吝点赞|订阅|点赞|转发|明镜|点点栏目|中文字幕|english subtitles|subtitle)/i;
const CJK_WITHOUT_HANGUL_RE = /^[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\s，。！？、；：""''（）【】·…]+$/;

export function isWhisperHallucinationLine(text) {
    const t = String(text || '').trim();
    if (!t) return true;
    if (WHISPER_HALLUCINATION_RE.test(t)) return true;
    if (CJK_WITHOUT_HANGUL_RE.test(t) && !/[\uac00-\ud7a3]/.test(t) && t.length <= 24) return true;
    return false;
}

export function normalizeWhisperChunks(result) {
    if (!result) return [];
    if (Array.isArray(result.chunks) && result.chunks.length) {
        return result.chunks
            .map((c) => ({
                text: (c.text || '').trim(),
                start: c.timestamp?.[0] ?? 0,
                end: c.timestamp?.[1]
            }))
            .filter((c) => c.text && !isWhisperHallucinationLine(c.text));
    }
    const single = result.text && String(result.text).trim();
    if (single && !isWhisperHallucinationLine(single)) {
        return [{ text: single, start: 0, end: null }];
    }
    return [];
}

/**
 * @param {{
 *   onStatus?: (msg: string) => void,
 *   onSegment?: (chunks: Array<{text:string,start:number,end?:number|null}>, offsetSec: number) => void,
 *   onComplete?: (cueCount: number) => void,
 *   onError?: (message: string) => void
 * }} callbacks
 */
export function createWhisperLyricsExtractor(callbacks = {}) {
    let worker = null;
    let session = null;

    function setStatus(msg) {
        callbacks.onStatus?.(msg);
    }

    function terminateWorker() {
        if (worker) {
            try { worker.terminate(); } catch (e) { /* ignore */ }
            worker = null;
        }
    }

    function createWorker() {
        terminateWorker();
        worker = new Worker(new URL('./whisper-worker.js', import.meta.url), { type: 'module' });
        worker.onerror = (e) => {
            console.error('Whisper worker load error:', e);
            callbacks.onError?.('AI 모듈 로드 실패 (네트워크·CDN 확인)');
            destroy();
        };
        return worker;
    }

    function sendNextSegment() {
        if (!session || session.stopped || session.finishing) return;
        if (session.paused || session.segmentIndex >= session.segments.length) {
            finish();
            return;
        }

        const idx = session.segmentIndex;
        const seg = session.segments[idx];
        session.waitingSegment = true;
        const total = session.segments.length;
        const pct = total ? Math.round((idx / total) * 100) : 0;
        setStatus(session.paused
            ? `일시정지 (${idx}/${total}구간)`
            : `AI 가사 추출 ${idx + 1}/${total}구간 (${pct}%)…`);

        const copy = seg.slice();
        worker.postMessage(
            {
                cmd: 'segment',
                audioBuffer: copy.buffer,
                segmentIndex: idx,
                offsetSec: idx * SEGMENT_SEC
            },
            [copy.buffer]
        );
    }

    function finish() {
        if (!session || session.finishing) return;
        session.finishing = true;
        const cueCount = session.cueCount || 0;
        terminateWorker();
        const s = session;
        session = null;
        callbacks.onComplete?.(cueCount);
    }

    function setupHandlers(w) {
        w.onmessage = (event) => {
            const data = event.data;
            if (!session || session.stopped || session.finishing) return;

            if (data.type === 'progress') {
                if (data.info?.status === 'progress' && data.info.progress != null) {
                    setStatus(`모델 다운로드: ${Math.round(data.info.progress)}%`);
                }
            } else if (data.type === 'ready') {
                sendNextSegment();
            } else if (data.type === 'segment_complete') {
                session.waitingSegment = false;
                const chunks = normalizeWhisperChunks(data.result);
                const offsetSec = data.offsetSec || 0;
                if (chunks.length) {
                    session.cueCount += chunks.length;
                    callbacks.onSegment?.(chunks, offsetSec);
                }
                session.segmentIndex += 1;

                if (session.paused || session.pauseAfterSegment) {
                    session.pauseAfterSegment = false;
                    setStatus(`일시정지 (${session.segmentIndex}/${session.segments.length}구간) — ▶ 재개`);
                    return;
                }
                sendNextSegment();
            } else if (data.type === 'error') {
                console.error('Whisper error:', data.error);
                callbacks.onError?.(data.error || '자막 추출 오류');
                if ((session.cueCount || 0) > 0) {
                    finish();
                } else {
                    destroy();
                }
            }
        };
    }

    async function run(samples) {
        if (session) return;
        const segments = splitIntoSegments(samples);
        session = {
            segments,
            segmentIndex: 0,
            cueCount: 0,
            paused: false,
            pauseAfterSegment: false,
            waitingSegment: false,
            stopped: false,
            finishing: false
        };

        setStatus('AI 모델 로딩 중… (최초 1회 다운로드)');
        const w = createWorker();
        setupHandlers(w);
        w.postMessage({ cmd: 'init' });
    }

    async function runFromBlob(blob, options) {
        setStatus('오디오 분석 준비 중…');
        const samples = await loadAudioSamplesFromBlob(blob, options);
        await run(samples);
    }

    return {
        async runFromBlob(blob, options) {
            return runFromBlob(blob, options);
        },
        async runFromSamples(samples) {
            return run(samples);
        },
        pause() {
            if (!session) return;
            if (session.waitingSegment) {
                session.pauseAfterSegment = true;
                setStatus('현재 구간 처리 후 일시정지…');
            } else {
                session.paused = true;
                setStatus(`일시정지 (${session.segmentIndex}/${session.segments.length}구간) — ▶ 재개`);
            }
        },
        resume() {
            if (!session?.paused) return;
            session.paused = false;
            session.pauseAfterSegment = false;
            if (session.segmentIndex >= session.segments.length) {
                finish();
            } else {
                sendNextSegment();
            }
        },
        stop() {
            if (!session) return;
            session.stopped = true;
            finish();
        },
        isActive() {
            return !!session && !session.finishing;
        },
        isPaused() {
            return !!session?.paused;
        },
        destroy() {
            session = { stopped: true, finishing: true, cueCount: session?.cueCount || 0 };
            terminateWorker();
            session = null;
        }
    };
}
