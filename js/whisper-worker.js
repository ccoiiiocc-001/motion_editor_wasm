import { pipeline, env } from '../vendor/transformers/transformers.min.js';

const TRANSFORMERS_VER = '2.17.2';
env.backends.onnx.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/@xenova/transformers@${TRANSFORMERS_VER}/dist/`;
env.backends.onnx.logLevel = 'error';
env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriber = null;

async function ensureTranscriber(progressCallback) {
    if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
            progress_callback: progressCallback
        });
    }
    return transcriber;
}

self.addEventListener('message', async (event) => {
    const { cmd, audioBuffer, segmentIndex, offsetSec } = event.data;

    try {
        if (cmd === 'init') {
            await ensureTranscriber((info) => {
                self.postMessage({ type: 'progress', info });
            });
            self.postMessage({ type: 'ready' });
            return;
        }

        if (cmd !== 'segment' || !audioBuffer) {
            throw new Error('잘못된 worker 요청입니다.');
        }

        const samples = new Float32Array(audioBuffer);
        if (!samples.length) {
            self.postMessage({
                type: 'segment_complete',
                segmentIndex,
                offsetSec: offsetSec || 0,
                result: { chunks: [] }
            });
            return;
        }

        await ensureTranscriber((info) => {
            self.postMessage({ type: 'progress', info });
        });

        const result = await transcriber(samples, {
            chunk_length_s: 10,
            stride_length_s: 2,
            language: 'korean',
            task: 'transcribe',
            return_timestamps: true
        });

        self.postMessage({
            type: 'segment_complete',
            segmentIndex,
            offsetSec: offsetSec || 0,
            result
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error?.message || String(error),
            segmentIndex
        });
    }
});
