// Domain Lock Security Check (Moved to server-side in index.php)

const audioTrackData=[];
window.audioTrackData = audioTrackData;
function refreshPresetList(){}
function saveState(){}

// WebAssembly 인스턴스 전역 저장소
window.wasmInstance = null;

// Wasm 메모리 문자열 디코더 (UTF-16)
function readWasmString(instance, ptr) {
    if (!ptr) return "";
    const view = new DataView(instance.exports.memory.buffer);
    const byteLen = view.getUint32(ptr - 4, true);
    const charArray = new Uint16Array(instance.exports.memory.buffer, ptr, byteLen / 2);
    let str = "";
    for (let i = 0; i < charArray.length; i++) {
        str += String.fromCharCode(charArray[i]);
    }
    return str;
}

// 1. hexToRgb: 오직 WebAssembly를 통해서만 작동. 실패 시 에러 발생 (WASM 미로딩 시 JS 대체 작동)
function hexToRgb(hex) {
    if (!hex) return 'rgb(0,0,0)';
    const cleanHex = hex.replace('#', '');
    let doubleHex = cleanHex;
    if (cleanHex.length === 3) {
        const r1 = cleanHex.substring(0, 1);
        const g1 = cleanHex.substring(1, 2);
        const b1 = cleanHex.substring(2, 3);
        doubleHex = r1 + r1 + g1 + g1 + b1 + b1;
    }
    
    if (!window.wasmInstance) {
        const r = parseInt(doubleHex.substring(0, 2), 16) || 0;
        const g = parseInt(doubleHex.substring(2, 4), 16) || 0;
        const b = parseInt(doubleHex.substring(4, 6), 16) || 0;
        return `rgb(${r},${g},${b})`;
    }
    
    const hexVal = parseInt(doubleHex, 16);
    if (isNaN(hexVal)) return 'rgb(0,0,0)';
    
    const rgbPacked = window.wasmInstance.exports.hexToIntRgb(hexVal);
    const r = (rgbPacked >> 16) & 0xFF;
    const g = (rgbPacked >> 8) & 0xFF;
    const b = rgbPacked & 0xFF;
    return `rgb(${r},${g},${b})`;
}

// 2. rgbToHex: 오직 WebAssembly를 통해서만 작동. 실패 시 에러 발생 (WASM 미로딩 시 JS 대체 작동)
function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    if (rgb.startsWith('#')) return rgb;
    const result = rgb.match(/\d+/g);
    if (!result) return '#000000';
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);

    if (!window.wasmInstance) {
        const toHex = (c) => {
            const hex = c.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
    const ptr = window.wasmInstance.exports.rgbToHex(r, g, b);
    return readWasmString(window.wasmInstance, ptr);
}

// 3. formatTime: 오직 WebAssembly를 통해서만 작동. 실패 시 에러 발생 (WASM 미로딩 시 JS 대체 작동)
function formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    if (!window.wasmInstance) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    const ptr = window.wasmInstance.exports.formatTime(seconds);
    return readWasmString(window.wasmInstance, ptr);
}

// Wasm 비동기 초기화 함수
async function initWasm() {
    try {
        const response = await fetch('build/release.wasm');
        if (!response.ok) throw new Error(`Wasm fetch failed: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        const wasmModule = await WebAssembly.instantiate(buffer, {
            env: {
                abort(message, fileName, lineNumber, columnNumber) {
                    console.error(`Wasm aborted: message=${message}, file=${fileName}, line=${lineNumber}:${columnNumber}`);
                }
            }
        });
        window.wasmInstance = wasmModule.instance;
        console.log("WebAssembly module loaded successfully!");
    } catch (err) {
        console.error("Critical: Failed to load WebAssembly. Editor logic disabled.", err);
    }
}

// 실행 즉시 Wasm 초기화 구동
initWasm();

window.hexToRgb = hexToRgb;
window.rgbToHex = rgbToHex;
window.formatTime = formatTime;