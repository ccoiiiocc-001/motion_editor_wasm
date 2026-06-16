// ============================================================================
// 1. 레트로 효과 이름 및 버튼 UI 생성
// ============================================================================
const retroFxNames = {
    1: "미세한 바람 흔들림", 2: "왕복 보행 착시", 3: "물에 잠긴 효과", 4: "귀퉁이 접기", 5: "종이 말림/펴짐",
    6: "이미지 찢기", 7: "물감 흘러내림(유화)", 8: "벽 구멍 투시", 9: "퍼즐 조각화", 10: "원통형 말림",
    11: "호수 잔물결", 12: "소용돌이 물결", 13: "세로 폭포 왜곡", 14: "유리병 반사", 15: "물방울 파동",
    16: "수면 굴절", 17: "거울 굴절", 18: "기름막 무지개 왜곡", 19: "얼음 큐브 굴절", 20: "비 오는 유리창",
    21: "그라데이션 플래시", 22: "무지개 스트로브", 23: "색상 채널 분리(RGB)", 24: "네온 테두리 점멸", 25: "빛 방울(Lens Flare)",
    26: "오로라 그라데이션", 27: "십자 별빛 반짝임", 28: "CRT 스캔라인", 29: "색상 밴딩(Posterize)", 30: "모노크롬 발광",
    31: "매직아이 생성", 32: "스테레오 입체 착시", 33: "회전 착시 스피너", 34: "애니모프 왜곡", 35: "홀로그램 줄무늬",
    36: "프리즘 분광", 37: "돔 렌즈 굴절", 38: "어안 렌즈", 39: "다중 노출 잔상", 40: "몽환 소프트 글로우",
    41: "픽셀 흩날림", 42: "블록 셔플(격자 이동)", 43: "색상 반전 플래시", 44: "데이터 손실(글리치)", 45: "픽셀 타일링",
    46: "도트 매트릭스", 47: "옛날 웹 브라우저 질감", 48: "저해상도 변환", 49: "픽셀 회오리", 50: "모자이크 흐림",
    51: "비트 크러시", 52: "CRC 데이터 오류", 53: "스캔라인 글리치", 54: "VHS 트래킹 노이즈", 55: "디지털 고스트",
    56: "RGB 채널 지연", 57: "프레임 드롭", 58: "JPEG 압축 흔적", 59: "웨이브 서머", 60: "매트릭스 코드줄",
    61: "입자(Particle) 분해", 62: "안개 속 발광", 63: "금가루 날림", 64: "불꽃 튀기기", 65: "연기 텍스처",
    66: "눈 내리는 효과", 67: "꽃잎 휘날림", 68: "별 가루", 69: "먼지 입자", 70: "비눗방울 생성",
    71: "모래바람 스윕", 72: "번개 섬광", 73: "무지개 아치", 74: "일출 그라데이션", 75: "달빛 실루엣",
    76: "이슬 맺힘", 77: "안개 레이어", 78: "태풍 회전", 79: "가을 낙엽", 80: "여름 소나기",
    81: "좌우 롤링(무한)", 82: "위아래 바운싱", 83: "줌 인/아웃(숨쉬기)", 84: "회전 발광", 85: "색상 순환(Cycling)",
    86: "네온 루프", 87: "그림자 잔상", 88: "번개 깜빡임", 89: "데이터 스트림", 90: "오버레이 점멸",
    91: "캔버스 찢기(왜곡)", 92: "유리 깨짐(왜곡)", 93: "열기 왜곡(아지랑이)", 94: "종이 텍스처 합치기", 95: "필름 노이즈",
    96: "브라운관 흔들림", 97: "옛날 TV 노이즈", 98: "흑백 반전 루프", 99: "포스터 컬러 변환", 100: "최종 믹스(All FX)"
};
window.retroFxNames = retroFxNames;

const retroFxContainer = document.getElementById('retro-fx-container');
if (retroFxContainer) {
    retroFxContainer.innerHTML = ''; 
    for (let i = 1; i <= 100; i++) {
        const btn = document.createElement('button');
        btn.innerText = i + ". " + (retroFxNames[i] || "특수 효과 " + i);
        btn.style.background = "#ff9800"; 
        btn.style.color = "#ffffff"; 
        btn.style.fontWeight = "bold"; 
        btn.style.marginBottom = "5px";
        btn.onclick = (function(id) { return function() { window.applyRetroFx(id); }; })(i);
        retroFxContainer.appendChild(btn);
    }
}

// ============================================================================
// 2. Fabric.js 픽셀 마스킹 필터 모음
// ============================================================================
fabric.Image.filters.WindDistortion = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'WindDistortion', amplitude: 10, frequency: 0.05, phase: 0, maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data; const w = options.imageData.width; const h = options.imageData.height; const copyData = new Uint8ClampedArray(data);
        for (let y = 0; y < h; y++) {
            const maxOffset = Math.sin(y * this.frequency + this.phase) * this.amplitude;
            for (let x = 0; x < w; x++) {
                let dstIdx = (y * w + x) * 4; let weight = 1;
                if (this.maskObj && this.maskObj.data) {
                    const mX = Math.floor((x / w) * this.maskObj.width); const mY = Math.floor((y / h) * this.maskObj.height);
                    const safeX = Math.min(Math.max(mX, 0), this.maskObj.width - 1); const safeY = Math.min(Math.max(mY, 0), this.maskObj.height - 1);
                    const maskIdx = (safeY * this.maskObj.width + safeX) * 4; weight = this.maskObj.data[maskIdx] / 255; if (isNaN(weight)) weight = 1;
                }
                let offset = Math.round(maxOffset * weight); let srcX = Math.max(0, Math.min(w - 1, x - offset)); let srcIdx = (y * w + srcX) * 4;
                data[dstIdx] = copyData[srcIdx]; data[dstIdx+1] = copyData[srcIdx+1]; data[dstIdx+2] = copyData[srcIdx+2]; data[dstIdx+3] = copyData[srcIdx+3];
            }
        }
    }
});

fabric.Image.filters.WiggleIllusion = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'WiggleIllusion', offset: 0, maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data; const w = options.imageData.width; const h = options.imageData.height; const copyData = new Uint8ClampedArray(data);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let dstIdx = (y * w + x) * 4; let weight = 1;
                if (this.maskObj && this.maskObj.data) {
                    const mX = Math.floor((x / w) * this.maskObj.width); const mY = Math.floor((y / h) * this.maskObj.height);
                    const safeX = Math.min(Math.max(mX, 0), this.maskObj.width - 1); const safeY = Math.min(Math.max(mY, 0), this.maskObj.height - 1);
                    const maskIdx = (safeY * this.maskObj.width + safeX) * 4; weight = this.maskObj.data[maskIdx] / 255; if (isNaN(weight)) weight = 1;
                }
                let shift = Math.round(this.offset * weight); let srcX = Math.max(0, Math.min(w - 1, x - shift)); let srcIdx = (y * w + srcX) * 4;
                data[dstIdx] = copyData[srcIdx]; data[dstIdx+1] = copyData[srcIdx+1]; data[dstIdx+2] = copyData[srcIdx+2]; data[dstIdx+3] = copyData[srcIdx+3];
            }
        }
    }
});

const PAPER_ROLL_DIRS = ['left', 'right', 'top', 'bottom'];

function sampleBilinear(copyData, w, h, sx, sy) {
    sx = Math.max(0, Math.min(w - 1.001, sx));
    sy = Math.max(0, Math.min(h - 1.001, sy));
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const x1 = Math.min(x0 + 1, w - 1);
    const y1 = Math.min(y0 + 1, h - 1);
    const fx = sx - x0;
    const fy = sy - y0;
    const i00 = (y0 * w + x0) * 4;
    const i10 = (y0 * w + x1) * 4;
    const i01 = (y1 * w + x0) * 4;
    const i11 = (y1 * w + x1) * 4;
    const out = [0, 0, 0, 255];
    for (let c = 0; c < 4; c++) {
        out[c] = copyData[i00 + c] * (1 - fx) * (1 - fy)
            + copyData[i10 + c] * fx * (1 - fy)
            + copyData[i01 + c] * (1 - fx) * fy
            + copyData[i11 + c] * fx * fy;
    }
    return out;
}

function mapPaperRollPixel(x, y, w, h, amount, radius, direction) {
    const R = Math.max(24, radius);
    const maxCurl = amount * (direction === 'left' || direction === 'right' ? w : h) * 0.9;
    if (amount <= 0.001 || maxCurl <= 1) {
        return { sx: x, sy: y, mode: 'front', shade: 1 };
    }

    if (direction === 'right') {
        const line = w - maxCurl;
        if (x < line) return { sx: x, sy: y, mode: 'front', shade: 1 };
        const d = x - line;
        const theta = d / R;
        if (theta <= Math.PI * 0.5) {
            return { sx: line + R * Math.sin(theta), sy: y, mode: 'front', shade: 1 - (d / maxCurl) * 0.35 };
        }
        if (theta <= Math.PI) {
            return { sx: x, sy: y, mode: 'back', shade: 0.55 + ((theta - Math.PI * 0.5) / (Math.PI * 0.5)) * 0.25 };
        }
        return { sx: -1, sy: y, mode: 'hide', shade: 0 };
    }

    if (direction === 'left') {
        const line = maxCurl;
        if (x > line) return { sx: x, sy: y, mode: 'front', shade: 1 };
        const d = line - x;
        const theta = d / R;
        if (theta <= Math.PI * 0.5) {
            return { sx: line - R * Math.sin(theta), sy: y, mode: 'front', shade: 1 - (d / maxCurl) * 0.35 };
        }
        if (theta <= Math.PI) {
            return { sx: x, sy: y, mode: 'back', shade: 0.55 + ((theta - Math.PI * 0.5) / (Math.PI * 0.5)) * 0.25 };
        }
        return { sx: -1, sy: y, mode: 'hide', shade: 0 };
    }

    if (direction === 'top') {
        const line = maxCurl;
        if (y > line) return { sx: x, sy: y, mode: 'front', shade: 1 };
        const d = line - y;
        const theta = d / R;
        if (theta <= Math.PI * 0.5) {
            return { sx: x, sy: line - R * Math.sin(theta), mode: 'front', shade: 1 - (d / maxCurl) * 0.35 };
        }
        if (theta <= Math.PI) {
            return { sx: x, sy: y, mode: 'back', shade: 0.55 + ((theta - Math.PI * 0.5) / (Math.PI * 0.5)) * 0.25 };
        }
        return { sx: x, sy: -1, mode: 'hide', shade: 0 };
    }

    const line = h - maxCurl;
    if (y < line) return { sx: x, sy: y, mode: 'front', shade: 1 };
    const d = y - line;
    const theta = d / R;
    if (theta <= Math.PI * 0.5) {
        return { sx: x, sy: line + R * Math.sin(theta), mode: 'front', shade: 1 - (d / maxCurl) * 0.35 };
    }
    if (theta <= Math.PI) {
        return { sx: x, sy: y, mode: 'back', shade: 0.55 + ((theta - Math.PI * 0.5) / (Math.PI * 0.5)) * 0.25 };
    }
    return { sx: x, sy: -1, mode: 'hide', shade: 0 };
}

fabric.Image.filters.PaperRoll = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PaperRoll',
    amount: 0,
    radius: 40,
    direction: 2,
    shadow: 0.45,
    backColor: '#e8e0d5',
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const dir = PAPER_ROLL_DIRS[Math.round(this.direction) % 4] || 'right';
        const hex = (this.backColor || '#e8e0d5').replace('#', '');
        const rBack = parseInt(hex.substring(0, 2), 16) || 232;
        const gBack = parseInt(hex.substring(2, 4), 16) || 224;
        const bBack = parseInt(hex.substring(4, 6), 16) || 213;
        const shadowMix = Math.max(0, Math.min(1, this.shadow));

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                let weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                const mapped = mapPaperRollPixel(x, y, w, h, this.amount, this.radius, dir);
                let r = copyData[dstIdx];
                let g = copyData[dstIdx + 1];
                let b = copyData[dstIdx + 2];
                let a = copyData[dstIdx + 3];

                if (weight > 0.001) {
                    if (mapped.mode === 'front' && mapped.sx >= 0 && mapped.sy >= 0) {
                        const px = sampleBilinear(copyData, w, h, mapped.sx, mapped.sy);
                        const shade = mapped.shade * (1 - shadowMix * 0.15);
                        r = px[0] * shade;
                        g = px[1] * shade;
                        b = px[2] * shade;
                        a = px[3];
                    } else if (mapped.mode === 'back') {
                        const shade = mapped.shade * (1 - shadowMix * 0.35);
                        r = rBack * shade;
                        g = gBack * shade;
                        b = bBack * shade;
                        a = 255;
                    } else if (mapped.mode === 'hide') {
                        r = rBack * 0.35;
                        g = gBack * 0.35;
                        b = bBack * 0.35;
                        a = 255;
                    }
                }

                data[dstIdx] = r * weight + copyData[dstIdx] * (1 - weight);
                data[dstIdx + 1] = g * weight + copyData[dstIdx + 1] * (1 - weight);
                data[dstIdx + 2] = b * weight + copyData[dstIdx + 2] * (1 - weight);
                data[dstIdx + 3] = a * weight + copyData[dstIdx + 3] * (1 - weight);
            }
        }
    }
});

function tearEdgeNoise(t, jagged, seed) {
    return Math.sin(t * 0.11 + seed) * jagged * 0.55
        + Math.sin(t * 0.24 + seed * 2.17) * jagged * 0.28
        + Math.sin(t * 0.51 + seed * 0.83) * jagged * 0.17;
}

// ----------------------------------------------------------------------------
// 6번(tear-static) 초기 구현: ImageTear 필터 (정적)
// ----------------------------------------------------------------------------

function computeMaskBounds(maskObj) {
    if (!maskObj?.data) return null;
    const mw = maskObj.width;
    const mh = maskObj.height;
    let minX = mw;
    let minY = mh;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    for (let my = 0; my < mh; my++) {
        for (let mx = 0; mx < mw; mx++) {
            if (maskObj.data[(my * mw + mx) * 4] > 16) {
                found = true;
                if (mx < minX) minX = mx;
                if (mx > maxX) maxX = mx;
                if (my < minY) minY = my;
                if (my > maxY) maxY = my;
            }
        }
    }
    if (!found) return null;
    return { minX, minY, maxX, maxY, mw, mh };
}

function getMaskWeightInTear(maskObj, x, y, w, h) {
    if (!maskObj?.data) return 0;
    return getMaskWeightAt(maskObj, x, y, w, h);
}

fabric.Image.filters.ImageTear = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'ImageTear',
    amount: 0,
    roughness: 10,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const amt = Math.max(0, Math.min(1, this.amount));
        
        if (amt < 0.001) return;
        
        const copyData = new Uint8ClampedArray(data);
        const rough = Math.max(0, this.roughness);
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                
                if (weight > 0.5) {
                    const nx = Math.sin(y * 0.1) + Math.sin(y * 0.03) * 0.5;
                    const ny = Math.sin(x * 0.1) + Math.sin(x * 0.03) * 0.5;
                    
                    const dispX = nx * rough * amt;
                    const dispY = ny * rough * amt;
                    
                    const srcX = Math.round(x + dispX);
                    const srcY = Math.round(y + dispY);
                    
                    if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
                        const srcWeight = getMaskWeightAt(this.maskObj, srcX, srcY, w, h);
                        if (srcWeight <= 0.5) {
                            data[dstIdx] = 0;
                            data[dstIdx + 1] = 0;
                            data[dstIdx + 2] = 0;
                            data[dstIdx + 3] = 0;
                        } else {
                            data[dstIdx] = 0;
                            data[dstIdx + 1] = 0;
                            data[dstIdx + 2] = 0;
                            data[dstIdx + 3] = 0;
                        }
                    } else {
                        data[dstIdx] = 0;
                        data[dstIdx + 1] = 0;
                        data[dstIdx + 2] = 0;
                        data[dstIdx + 3] = 0;
                    }
                }
            }
        }
    }
});

fabric.Image.filters.PaintDrip = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PaintDrip',
    amount: 0,
    dripLen: 120,
    wobble: 18,
    phase: 0,
    viscosity: 0.6,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const amt = Math.max(0, Math.min(1, this.amount));
        const maxDrip = amt * this.dripLen;
        const visc = Math.max(0.1, this.viscosity);

        for (let y = 0; y < h; y++) {
            const yNorm = y / h;
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                let sx = x;
                let sy = y;
                if (weight > 0.001 && maxDrip > 0.5) {
                    const drip = maxDrip * Math.pow(Math.max(0, yNorm - 0.08), visc);
                    const wob = Math.sin(x * 0.06 + this.phase) * this.wobble * amt
                        + Math.sin(x * 0.14 + y * 0.03 + this.phase * 1.3) * this.wobble * 0.35 * amt;
                    sy = y - drip - wob;
                    const px = sampleBilinear(copyData, w, h, sx, sy);
                    data[dstIdx] = px[0] * weight + copyData[dstIdx] * (1 - weight);
                    data[dstIdx + 1] = px[1] * weight + copyData[dstIdx + 1] * (1 - weight);
                    data[dstIdx + 2] = px[2] * weight + copyData[dstIdx + 2] * (1 - weight);
                    data[dstIdx + 3] = px[3] * weight + copyData[dstIdx + 3] * (1 - weight);
                } else {
                    data[dstIdx] = copyData[dstIdx];
                    data[dstIdx + 1] = copyData[dstIdx + 1];
                    data[dstIdx + 2] = copyData[dstIdx + 2];
                    data[dstIdx + 3] = copyData[dstIdx + 3];
                }
            }
        }
    }
});

fabric.Image.filters.HolePerspective = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'HolePerspective',
    amount: 0,
    angle: 0,
    holeSize: 0.45,
    depth: 1.2,
    vignette: 0.5,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const cx = w * 0.5;
        const cy = h * 0.5;
        const maxR = Math.min(cx, cy);
        const holeR = maxR * Math.max(0.05, Math.min(0.95, this.holeSize));
        const amt = Math.max(0, Math.min(1, this.amount));
        
        if (amt < 0.001) return;

        const perspectiveDepth = 0.3 * amt * (this.depth || 1.2);
        const steps = 30;
        const checkIsHole = (px, py) => {
            if (px < 0 || px >= w || py < 0 || py >= h) return false;
            if (this.maskObj) {
                return getMaskWeightAt(this.maskObj, px, py, w, h) > 0.5;
            } else {
                return Math.hypot(px - cx, py - cy) < holeR;
            }
        };

        const angleRad = (this.angle || 0) * Math.PI / 180;
        const dxProj = Math.cos(angleRad);
        const dyProj = Math.sin(angleRad);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const isHole = checkIsHole(x, y);

                if (isHole) {
                    let hit = false;
                    let hitX = x;
                    let hitY = y;
                    let hitT = 0;

                    for (let step = 1; step <= steps; step++) {
                        const t = step / steps;
                        const px = Math.round(x + dxProj * t * perspectiveDepth * w);
                        const py = Math.round(y + dyProj * t * perspectiveDepth * w);
                        
                        if (!checkIsHole(px, py)) {
                            hit = true;
                            hitX = px;
                            hitY = py;
                            hitT = t;
                            break;
                        }
                    }
                    
                    if (hit) {
                        const nx = hitX - cx;
                        const ny = hitY - cy;
                        const R = Math.hypot(nx, ny) || 1;
                        const ang = Math.atan2(ny, nx);
                        const u = ang * R;
                        const z = hitT * perspectiveDepth * 100;
                        
                        const brickL = 50; 
                        const brickH = 20;
                        
                        const row = Math.floor(u / brickH);
                        const offsetZ = (row % 2 === 0) ? 0 : (brickL / 2);
                        
                        let shiftedZ = z + offsetZ;
                        shiftedZ = ((shiftedZ % brickL) + brickL) % brickL;
                        let shiftedU = ((u % brickH) + brickH) % brickH;
                        
                        const isMortar = (shiftedZ < 2 || shiftedU < 2);
                        
                        let rCol, gCol, bCol;
                        if (isMortar) {
                            rCol = 190; gCol = 190; bCol = 190; 
                        } else {
                            const col = Math.floor((z + offsetZ) / brickL);
                            const noise = ((Math.abs(row * 37 + col * 19)) % 30) - 15;
                            const gray = 135 + noise;
                            rCol = gray; gCol = gray; bCol = gray;
                        }
                        
                        const lighting = 0.5 + 0.5 * (1 - hitT);
                        const depthShadow = 1 - hitT * (0.4 + this.vignette * 0.4);
                        const shade = Math.max(0, lighting * depthShadow);
                        
                        data[dstIdx] = rCol * shade;
                        data[dstIdx + 1] = gCol * shade;
                        data[dstIdx + 2] = bCol * shade;
                        data[dstIdx + 3] = 255;
                    } else {
                        data[dstIdx] = 0;
                        data[dstIdx + 1] = 0;
                        data[dstIdx + 2] = 0;
                        data[dstIdx + 3] = 0;
                    }
                } else {
                    data[dstIdx] = copyData[dstIdx];
                    data[dstIdx + 1] = copyData[dstIdx + 1];
                    data[dstIdx + 2] = copyData[dstIdx + 2];
                    data[dstIdx + 3] = copyData[dstIdx + 3];
                }
            }
        }
    }
});

fabric.Image.filters.PuzzleShuffle = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PuzzleShuffle',
    amount: 0,
    cols: 6,
    rows: 4,
    rotate: 0.15,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const cols = Math.max(2, Math.round(this.cols));
        const rows = Math.max(2, Math.round(this.rows));
        const cellW = w / cols;
        const cellH = h / rows;
        const amt = Math.max(0, Math.min(1, this.amount));
        
        if (amt < 0.001) return;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                
                if (weight > 0.001) {
                    const ci = Math.min(cols - 1, Math.floor(x / cellW));
                    const cj = Math.min(rows - 1, Math.floor(y / cellH));
                    
                    const hash = (ci * 17 + cj * 31) % 97;
                    const rot = ((hash % 5) - 2) * this.rotate * amt;
                    
                    let lx = x - (ci + 0.5) * cellW;
                    let ly = y - (cj + 0.5) * cellH;
                    
                    const cos = Math.cos(rot);
                    const sin = Math.sin(rot);
                    
                    const sx = Math.round((ci + 0.5) * cellW + lx * cos - ly * sin);
                    const sy = Math.round((cj + 0.5) * cellH + lx * sin + ly * cos);
                    
                    let px = [0, 0, 0, 0];
                    if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                        const sIdx = (sy * w + sx) * 4;
                        px = [copyData[sIdx], copyData[sIdx+1], copyData[sIdx+2], copyData[sIdx+3]];
                    }
                    
                    let bevel = 1.0;
                    const bSize = 3;
                    let ltx = lx + cellW * 0.5;
                    let lty = ly + cellH * 0.5;
                    
                    if (ltx < bSize && lty < bSize) bevel = 1.4; 
                    else if (ltx > cellW - bSize && lty > cellH - bSize) bevel = 0.6; 
                    else if (ltx < bSize) bevel = 1.2; 
                    else if (lty < bSize) bevel = 1.2; 
                    else if (ltx > cellW - bSize) bevel = 0.8; 
                    else if (lty > cellH - bSize) bevel = 0.8; 
                    
                    data[dstIdx] = Math.min(255, px[0] * bevel);
                    data[dstIdx + 1] = Math.min(255, px[1] * bevel);
                    data[dstIdx + 2] = Math.min(255, px[2] * bevel);
                    data[dstIdx + 3] = px[3];
                }
            }
        }
    }
});

fabric.Image.filters.CylinderRoll = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'CylinderRoll',
    amount: 0,
    fov: 0.85,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const cx = w * 0.5;
        const wrap = Math.max(0, Math.min(1, this.amount)) * Math.PI * 0.95 * this.fov;
        const br = 42; const bg = 37; const bb = 32;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                const nx = (x - cx) / Math.max(1, cx);
                const theta = nx * wrap;
                const cosT = Math.cos(theta);
                let r = br; let g = bg; let b = bb; let a = 255;

                if (weight > 0.001 && wrap > 0.02 && Math.abs(cosT) > 0.04) {
                    const sx = cx + (Math.sin(theta) / cosT) * cx * 0.92;
                    const sy = y;
                    if (sx >= 0 && sx < w) {
                        const px = sampleBilinear(copyData, w, h, sx, sy);
                        const edge = Math.min(1, Math.abs(cosT) * 1.15);
                        r = px[0] * edge;
                        g = px[1] * edge;
                        b = px[2] * edge;
                        a = px[3];
                    }
                } else if (weight > 0.001 && wrap <= 0.02) {
                    r = copyData[dstIdx]; g = copyData[dstIdx + 1]; b = copyData[dstIdx + 2]; a = copyData[dstIdx + 3];
                }

                data[dstIdx] = r * weight + copyData[dstIdx] * (1 - weight);
                data[dstIdx + 1] = g * weight + copyData[dstIdx + 1] * (1 - weight);
                data[dstIdx + 2] = b * weight + copyData[dstIdx + 2] * (1 - weight);
                data[dstIdx + 3] = a * weight + copyData[dstIdx + 3] * (1 - weight);
            }
        }
    }
});

fabric.Image.filters.MagicEye = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'MagicEye', stripWidth: 60, depthFactor: 15, depthMapData: null, noiseCanvas: null,
    applyTo: function(options) {
        const data = options.imageData.data; const w = options.imageData.width; const h = options.imageData.height; const copyData = new Uint8ClampedArray(data);
        if (!this.noiseCanvas || this.noiseCanvas.width !== this.stripWidth || this.noiseCanvas.height !== h) {
            this.noiseCanvas = document.createElement('canvas'); this.noiseCanvas.width = this.stripWidth; this.noiseCanvas.height = h;
            const noiseCtx = this.noiseCanvas.getContext('2d'); const noiseData = noiseCtx.createImageData(this.stripWidth, h);
            for (let i = 0; i < noiseData.data.length; i += 4) {
                const origX = Math.floor((i / 4) % this.stripWidth); const origY = Math.floor((i / 4) / this.stripWidth); const origIdx = (origY * w + origX) * 4;
                const rN = Math.random() * 60 - 30;
                noiseData.data[i] = Math.max(0, Math.min(255, copyData[origIdx] + rN)); noiseData.data[i+1] = Math.max(0, Math.min(255, copyData[origIdx+1] + rN)); noiseData.data[i+2] = Math.max(0, Math.min(255, copyData[origIdx+2] + rN)); noiseData.data[i+3] = copyData[origIdx+3];
            }
            noiseCtx.putImageData(noiseData, 0, 0);
        }
        const noisePixels = this.noiseCanvas.getContext('2d').getImageData(0, 0, this.stripWidth, h).data;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4; const origIdx = (y * w + x) * 4;
                if (x < this.stripWidth) {
                    const noiseIdx = (y * this.stripWidth + x) * 4; data[dstIdx] = noisePixels[noiseIdx]; data[dstIdx+1] = noisePixels[noiseIdx+1]; data[dstIdx+2] = noisePixels[noiseIdx+2]; data[dstIdx+3] = noisePixels[noiseIdx+3];
                } else {
                    let zDepth = 0;
                    if (this.depthMapData && this.depthMapData.data) {
                        const mX = Math.floor((x / w) * this.depthMapData.width); const mY = Math.floor((y / h) * this.depthMapData.height);
                        const safeX = Math.min(Math.max(mX, 0), this.depthMapData.width - 1); const safeY = Math.min(Math.max(mY, 0), this.depthMapData.height - 1);
                        const maskIdx = (safeY * this.depthMapData.width + safeX) * 4; zDepth = this.depthMapData.data[maskIdx] / 255; if(isNaN(zDepth)) zDepth = 0;
                    }
                    const shift = Math.floor(zDepth * this.depthFactor); let srcX = x - this.stripWidth + shift; if (srcX < 0) srcX = 0;
                    const srcIdx = (y * w + srcX) * 4; data[dstIdx] = data[srcIdx]; data[dstIdx+1] = data[srcIdx+1]; data[dstIdx+2] = data[srcIdx+2]; data[dstIdx+3] = copyData[origIdx+3];
                }
            }
        }
    }
});

// ============================================================================
// 3. 공용 유틸리티 (마스크 렌더링, 깊이 렌더링, UI 컨트롤러)
// ============================================================================
function getLogicalCanvasDimensions() {
    const c = window.canvas;
    if (!c) return { w: 1, h: 1 };
    const zoom = c.getZoom() || 1;
    return {
        w: Math.max(1, Math.round(c.getWidth() / zoom)),
        h: Math.max(1, Math.round(c.getHeight() / zoom))
    };
}

function renderMaskObjectsToSceneCanvas(objects, logicalW, logicalH) {
    const sceneCanvas = document.createElement('canvas');
    sceneCanvas.width = logicalW;
    sceneCanvas.height = logicalH;
    const ctx = sceneCanvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, logicalW, logicalH);

    objects.forEach((obj) => {
        const savedStroke = obj.stroke;
        const savedFill = obj.fill;
        const savedOpacity = obj.opacity;
        const savedCaching = obj.objectCaching;
        obj.objectCaching = false;
        obj.stroke = '#ffffff';
        let isClosed = false;
        if (obj.type === 'path' && obj.path && obj.path.length > 2) {
            try {
                const first = obj.path[0];
                const last = obj.path[obj.path.length - 1];
                let fx = first[1] || 0, fy = first[2] || 0;
                let lx = last[last.length - 2] || 0, ly = last[last.length - 1] || 0;
                const dist = Math.hypot(fx - lx, fy - ly);
                if (dist < 60) isClosed = true;
            } catch (e) {
                console.error(e);
            }
        }
        obj.fill = (obj.type === 'path' && !isClosed) ? '' : '#ffffff';
        obj.opacity = 1;
        ctx.save();
        obj.render(ctx);
        ctx.restore();
        obj.stroke = savedStroke;
        obj.fill = savedFill;
        obj.opacity = savedOpacity;
        obj.objectCaching = savedCaching;
    });

    return sceneCanvas;
}

function getMaskTempObjects() {
    return window.canvas?.getObjects().filter(o => o.__isTempMask) || [];
}

function commitMaskRegion(targetObj) {
    const shapes = getMaskTempObjects();
    if (shapes.length === 0) return;
    try {
        const feather = targetObj.retroSettings?.feather || 20;
        const maskObj = generateMaskData(targetObj, shapes, feather);
        targetObj.retroSettings.maskObj = maskObj;
        const activeId = targetObj.retroSettings.activeFxId || 1;
        if (window.globalRetroMemory[activeId]) window.globalRetroMemory[activeId].maskObj = maskObj;
        const activeFilter = targetObj.filters && targetObj.filters.find(f => f.maskObj !== undefined);
        if (activeFilter) {
            activeFilter.maskObj = maskObj;
            targetObj.dirty = true;
            targetObj.applyFilters();
        } else if (targetObj.waterTween) {
            targetObj.dirty = true;
            if (typeof targetObj._waterRender === 'function') targetObj._waterRender();
        }
        shapes.forEach(p => window.canvas.remove(p));
    } catch (err) {
        console.error(err);
    }
}

function clearMaskDrawHandlers() {
    const c = window.canvas;
    if (!c) return;
    c.off('mouse:down', onMaskShapeMouseDown);
    c.off('mouse:move', onMaskShapeMouseMove);
    c.off('mouse:up', onMaskShapeMouseUp);
}

function restoreDefaultPathCreatedHandler() {
    const c = window.canvas;
    if (!c) return;
    c.off('path:created');
    c.on('path:created', function(e) {
        c.sendToBack(e.path);
        c.discardActiveObject();
        c.requestRenderAll();
    });
}

function exitMaskDrawMode(applyMask) {
    const state = window.maskDrawState;
    if (!state) return;
    const c = window.canvas;
    const targetObj = state.targetObj;

    if (applyMask && targetObj) commitMaskRegion(targetObj);

    c.isDrawingMode = false;
    c.defaultCursor = 'default';
    clearMaskDrawHandlers();
    c.off('path:created');

    c.getObjects().forEach(o => {
        if (o._tempEvented !== undefined) {
            o.set({ evented: o._tempEvented, selectable: o._tempSelectable });
            delete o._tempEvented;
            delete o._tempSelectable;
        }
    });

    restoreDefaultPathCreatedHandler();
    if (targetObj) c.setActiveObject(targetObj);
    window.maskDrawState = null;
    updateMaskToolButtons();
    c.renderAll();
}

function enterMaskDrawMode(targetObj, tool) {
    const c = window.canvas;
    if (!c || !targetObj) return;

    if (!window.maskDrawState?.active) {
        window.maskDrawState = { active: true, tool, targetObj, isDragging: false, startPointer: null, previewShape: null };
        c.discardActiveObject();
        c.getObjects().forEach(o => {
            if (!o.__isTempMask) {
                o._tempEvented = o.evented;
                o._tempSelectable = o.selectable;
                o.set({ evented: false, selectable: false });
            }
        });
    } else {
        window.maskDrawState.tool = tool;
        if (window.maskDrawState.isDragging && window.maskDrawState.previewShape) {
            c.remove(window.maskDrawState.previewShape);
            window.maskDrawState.isDragging = false;
            window.maskDrawState.startPointer = null;
            window.maskDrawState.previewShape = null;
        }
    }

    clearMaskDrawHandlers();
    c.off('path:created');
    c.isDrawingMode = false;

    if (tool === 'brush') {
        c.isDrawingMode = true;
        c.defaultCursor = 'crosshair';
        c.freeDrawingBrush = new fabric.PencilBrush(c);
        c.freeDrawingBrush.color = 'rgba(233, 30, 99, 0.5)';
        c.freeDrawingBrush.width = targetObj.retroSettings?.brushSize || 40;
        c.on('path:created', (e) => {
            if (window.maskDrawState?.active && window.maskDrawState.tool === 'brush') {
                e.path.__isTempMask = true;
            }
        });
    } else {
        c.defaultCursor = 'crosshair';
        c.on('mouse:down', onMaskShapeMouseDown);
        c.on('mouse:move', onMaskShapeMouseMove);
        c.on('mouse:up', onMaskShapeMouseUp);
    }

    updateMaskToolButtons();
    c.requestRenderAll();
}

function onMaskShapeMouseDown(opt) {
    const state = window.maskDrawState;
    if (!state?.active || state.tool === 'brush') return;
    const c = window.canvas;
    if (opt.target && !opt.target.__isTempMask) return;

    const ptr = c.getPointer(opt.e);
    state.isDragging = true;
    state.startPointer = { x: ptr.x, y: ptr.y };

    if (state.tool === 'rect') {
        state.previewShape = new fabric.Rect({
            left: ptr.x,
            top: ptr.y,
            width: 0,
            height: 0,
            fill: 'rgba(233, 30, 99, 0.5)',
            stroke: '#ffffff',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            objectCaching: false,
            __isTempMask: true
        });
    } else {
        state.previewShape = new fabric.Ellipse({
            left: ptr.x,
            top: ptr.y,
            rx: 0,
            ry: 0,
            fill: 'rgba(233, 30, 99, 0.5)',
            stroke: '#ffffff',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            objectCaching: false,
            __isTempMask: true
        });
    }
    c.add(state.previewShape);
}

function updateMaskPreviewShape(state, ptr, ctrlKey) {
    const start = state.startPointer;
    if (!start || !state.previewShape) return;
    const dx = ptr.x - start.x;
    const dy = ptr.y - start.y;

    if (state.tool === 'rect') {
        let width = Math.abs(dx);
        let height = Math.abs(dy);
        if (ctrlKey) {
            const size = Math.max(width, height);
            width = size;
            height = size;
        }
        const left = dx >= 0 ? start.x : start.x - width;
        const top = dy >= 0 ? start.y : start.y - height;
        state.previewShape.set({ left, top, width, height });
    } else {
        let rx = Math.abs(dx) / 2;
        let ry = Math.abs(dy) / 2;
        let left = Math.min(start.x, ptr.x);
        let top = Math.min(start.y, ptr.y);
        if (ctrlKey) {
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            rx = ry = size / 2;
            left = dx >= 0 ? start.x : start.x - size;
            top = dy >= 0 ? start.y : start.y - size;
        }
        state.previewShape.set({ left, top, rx, ry });
    }
    state.previewShape.setCoords();
}

function onMaskShapeMouseMove(opt) {
    const state = window.maskDrawState;
    if (!state?.isDragging || !state.previewShape || !state.startPointer) return;
    const ptr = window.canvas.getPointer(opt.e);
    const ctrlKey = opt.e.ctrlKey || opt.e.metaKey;
    updateMaskPreviewShape(state, ptr, ctrlKey);
    window.canvas.requestRenderAll();
}

function onMaskShapeMouseUp(opt) {
    const state = window.maskDrawState;
    if (!state?.isDragging) return;
    const c = window.canvas;
    const shape = state.previewShape;
    state.isDragging = false;
    state.startPointer = null;
    state.previewShape = null;

    if (shape) {
        const tooSmall = shape.type === 'rect'
            ? (shape.width < 4 || shape.height < 4)
            : (shape.rx < 2 || shape.ry < 2);
        if (tooSmall) c.remove(shape);
    }
    c.requestRenderAll();
}

function updateMaskToolButtons() {
    const state = window.maskDrawState;
    const active = state?.active;
    const tool = state?.tool;
    document.querySelectorAll('[data-mask-tool]').forEach(btn => {
        const isActive = active && btn.getAttribute('data-mask-tool') === tool;
        btn.style.backgroundColor = isActive ? '#4caf50' : '#e91e63';
        btn.style.fontWeight = isActive ? 'bold' : 'normal';
    });
    const doneBtn = document.getElementById('mask-done-btn');
    if (doneBtn) {
        doneBtn.textContent = active ? '✅ 영역 지정 완료' : '✅ 영역 지정 시작';
        doneBtn.style.backgroundColor = active ? '#4caf50' : '#607d8b';
    }
}

function setupMaskUI(id, targetObj) {
    const slidersContainer = document.getElementById('filter-sliders');

    const toolRow = document.createElement('div');
    toolRow.style.display = 'flex';
    toolRow.style.gap = '5px';
    toolRow.style.marginTop = '15px';
    toolRow.style.flexWrap = 'wrap';

    const tools = [
        { id: 'brush', label: '🖌️ 붓' },
        { id: 'rect', label: '⬜ 사각형' },
        { id: 'circle', label: '⭕ 원형' }
    ];
    tools.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-mask-tool', id);
        btn.textContent = label;
        btn.style.flex = '1';
        btn.style.minWidth = '70px';
        btn.style.backgroundColor = '#e91e63';
        btn.onclick = () => enterMaskDrawMode(targetObj, id);
        toolRow.appendChild(btn);
    });
    slidersContainer.appendChild(toolRow);

    const hint = document.createElement('div');
    hint.textContent = 'Ctrl+드래그: 정사각형 / 정원';
    hint.style.fontSize = '11px';
    hint.style.color = '#888';
    hint.style.marginTop = '4px';
    slidersContainer.appendChild(hint);

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.id = 'mask-done-btn';
    doneBtn.textContent = '✅ 영역 지정 시작';
    doneBtn.style.marginTop = '8px';
    doneBtn.style.width = '100%';
    doneBtn.style.backgroundColor = '#607d8b';
    doneBtn.onclick = () => {
        if (window.maskDrawState?.active) {
            exitMaskDrawMode(true);
        } else {
            enterMaskDrawMode(targetObj, 'brush');
        }
    };
    slidersContainer.appendChild(doneBtn);

    const resetMaskBtn = document.createElement('button');
    resetMaskBtn.innerText = '전체 영역으로 복구 (초기화)';
    resetMaskBtn.style.marginTop = '5px';
    resetMaskBtn.style.backgroundColor = '#607d8b';
    resetMaskBtn.onclick = () => {
        getMaskTempObjects().forEach(o => window.canvas.remove(o));
        targetObj.retroSettings.maskObj = null;
        if (window.globalRetroMemory[id]) window.globalRetroMemory[id].maskObj = null;
        const activeFilter = targetObj.filters && targetObj.filters.find(f => f.maskObj !== undefined);
        if (activeFilter) {
            activeFilter.maskObj = null;
            targetObj.dirty = true;
            targetObj.applyFilters();
        } else if (targetObj.waterTween) {
            targetObj.dirty = true;
            if (typeof targetObj._waterRender === 'function') targetObj._waterRender();
        }
        window.canvas.renderAll();
    };
    slidersContainer.appendChild(resetMaskBtn);

    targetObj._maskUiTargetId = id;
    updateMaskToolButtons();
}

function sampleSceneCanvasToImageMask(sceneCanvas, targetObj, logicalW, logicalH) {
    const w = Math.max(1, Math.round(targetObj.width));
    const h = Math.max(1, Math.round(targetObj.height));
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    mCtx.fillStyle = '#000000';
    mCtx.fillRect(0, 0, w, h);

    const matrix = targetObj.calcTransformMatrix();
    const shift = [1, 0, 0, 1, -w / 2, -h / 2];
    const forward = fabric.util.multiplyTransformMatrices(matrix, shift);
    const inv = fabric.util.invertTransform(forward);

    mCtx.save();
    mCtx.setTransform(inv[0], inv[1], inv[2], inv[3], inv[4], inv[5]);
    mCtx.drawImage(sceneCanvas, 0, 0, logicalW, logicalH);
    mCtx.restore();

    const img = mCtx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = Math.max(d[i], d[i + 1], d[i + 2]);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
    }
    return { data: d, width: w, height: h };
}

function applyFeatherToMaskData(mask, featherValue) {
    if (!featherValue || featherValue <= 0) return mask;
    const { width: w, height: h, data } = mask;
    const src = document.createElement('canvas');
    src.width = w;
    src.height = h;
    const srcCtx = src.getContext('2d');
    const srcImg = srcCtx.createImageData(w, h);
    srcImg.data.set(data);
    srcCtx.putImageData(srcImg, 0, 0);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const outCtx = out.getContext('2d', { willReadFrequently: true });
    outCtx.filter = `blur(${featherValue}px)`;
    outCtx.drawImage(src, 0, 0);
    outCtx.filter = 'none';
    const blurred = outCtx.getImageData(0, 0, w, h);
    return { data: blurred.data, width: w, height: h };
}

function generateMaskData(targetObj, maskObjects, featherValue) {
    const { w: logicalW, h: logicalH } = getLogicalCanvasDimensions();
    const sceneCanvas = renderMaskObjectsToSceneCanvas(maskObjects, logicalW, logicalH);
    let mask = sampleSceneCanvasToImageMask(sceneCanvas, targetObj, logicalW, logicalH);
    mask = applyFeatherToMaskData(mask, featherValue);
    return mask;
}

window.generateDepthMap = {
    fromText: function(text, targetW, targetH) {
        const dCanvas = document.createElement('canvas'); dCanvas.width = targetW; dCanvas.height = targetH;
        const ctx = dCanvas.getContext('2d'); ctx.fillStyle = 'black'; ctx.fillRect(0, 0, targetW, targetH); ctx.fillStyle = 'white';
        const fontSize = Math.floor(targetW * 0.25); ctx.font = `bold ${fontSize}px 'Arial'`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, targetW / 2, targetH / 2);
        return { data: ctx.getImageData(0, 0, targetW, targetH).data, width: targetW, height: targetH };
    },
    fromImage: function(imgElement, targetW, targetH) {
        const dCanvas = document.createElement('canvas'); dCanvas.width = targetW; dCanvas.height = targetH;
        const ctx = dCanvas.getContext('2d'); ctx.fillStyle = 'black'; ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(imgElement, 0, 0, imgElement.width, imgElement.height, 0, 0, targetW, targetH);
        return { data: ctx.getImageData(0, 0, targetW, targetH).data, width: targetW, height: targetH };
    }
};

function getMaskWeightAt(maskObj, x, y, w, h) {
    if (!maskObj?.data) return 1;
    const mX = Math.floor((x / w) * maskObj.width);
    const mY = Math.floor((y / h) * maskObj.height);
    const safeX = Math.min(Math.max(mX, 0), maskObj.width - 1);
    const safeY = Math.min(Math.max(mY, 0), maskObj.height - 1);
    const v = maskObj.data[(safeY * maskObj.width + safeX) * 4] / 255;
    return isNaN(v) ? 1 : v;
}

function computeMaskCentroid(maskObj, w, h) {
    if (!maskObj?.data) return { cx: w * 0.5, cy: h * 0.5 };
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (let my = 0; my < maskObj.height; my++) {
        for (let mx = 0; mx < maskObj.width; mx++) {
            const a = maskObj.data[(my * maskObj.width + mx) * 4] / 255;
            if (a < 0.01) continue;
            sx += ((mx + 0.5) / maskObj.width) * w * a;
            sy += ((my + 0.5) / maskObj.height) * h * a;
            sw += a;
        }
    }
    if (sw < 1) return { cx: w * 0.5, cy: h * 0.5 };
    return { cx: sx / sw, cy: sy / sw };
}

/**
 * 영역 바깥(접힘 각도)에서 바라본 때, 해당 점의 테두리 단면이 보이는지 (-1~1)
 * 양수 = 앞쪽(두께·안쪽선), 음수 = 뒤쪽(찢긴 경계만)
 */
function getOutsideViewFacing(x, y, cx, cy, foldAngleRad, foldSide) {
    const vx = x - cx;
    const vy = y - cy;
    const vLen = Math.hypot(vx, vy);
    if (vLen < 1.5) return 1;
    const viewNx = Math.sin(foldAngleRad);
    const viewNy = -Math.cos(foldAngleRad);
    let facing = (vx * viewNx + vy * viewNy) / vLen;
    if (foldSide === 1) facing = -facing;
    return facing;
}

/** 인쇄 K% 회색 → RGB (0% = 흰색, 100% = 검정) */
function grayPercentToRgb(percentBlack) {
    const v = Math.round(255 * (1 - percentBlack / 100));
    return { r: v, g: v, b: v };
}

function edgeLineStrength(dist, center, halfWidth) {
    const d = Math.abs(dist - center);
    if (d >= halfWidth) return 0;
    return 1 - d / halfWidth;
}

/**
 * 바깥 0px → 테두리 중심에서 지정 두께까지 점진 증가 (같은 d로 비교하면 항상 참이 되는 버그 방지)
 * radial = 경계에서 안쪽 거리, rampWidth = 그 위치에서 허용되는 두께 폭
 */
function isInTaperedThickBand(d, lineHalf, bandPx, bandCenter) {
    if (bandPx <= 0 || d <= lineHalf || d >= bandPx) return false;
    const radial = d - lineHalf;
    const span = bandPx - lineHalf;
    const toCenter = Math.max(1, bandCenter - lineHalf);
    const t = Math.min(1, radial / toCenter);
    const rampWidth = span * t * t;
    return radial < rampWidth;
}

function buildMaskInwardDistance(maskObj) {
    const mw = maskObj.width;
    const mh = maskObj.height;
    const md = maskObj.data;
    const n = mw * mh;
    const dist = new Float32Array(n);
    dist.fill(-1);
    const q = new Int32Array(n);
    let qh = 0;
    let qt = 0;
    const insideAt = (x, y) => md[(y * mw + x) * 4] / 255 > 0.35;

    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            if (!insideAt(x, y)) continue;
            let isEdge = false;
            for (let oy = -1; oy <= 1 && !isEdge; oy++) {
                for (let ox = -1; ox <= 1 && !isEdge; ox++) {
                    if (!ox && !oy) continue;
                    const nx = x + ox;
                    const ny = y + oy;
                    if (nx < 0 || ny < 0 || nx >= mw || ny >= mh || !insideAt(nx, ny)) isEdge = true;
                }
            }
            if (isEdge) {
                const idx = y * mw + x;
                dist[idx] = 0;
                q[qt++] = idx;
            }
        }
    }

    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (qh < qt) {
        const idx = q[qh++];
        const cx = idx % mw;
        const cy = (idx / mw) | 0;
        const base = dist[idx];
        for (let k = 0; k < neighbors.length; k++) {
            const nx = cx + neighbors[k][0];
            const ny = cy + neighbors[k][1];
            if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
            const ni = ny * mw + nx;
            if (dist[ni] >= 0) continue;
            if (!insideAt(nx, ny)) continue;
            dist[ni] = base + (k < 4 ? 1 : 1.414);
            q[qt++] = ni;
        }
    }

    let maxD = 0;
    for (let i = 0; i < n; i++) {
        if (dist[i] >= 0 && dist[i] > maxD) maxD = dist[i];
    }
    return { dist, maxD, mw, mh };
}

function getMaskInwardDistance(maskObj) {
    if (!maskObj?.data) return null;
    if (maskObj._inwardDist?.src === maskObj.data) return maskObj._inwardDist;
    const built = buildMaskInwardDistance(maskObj);
    built.src = maskObj.data;
    maskObj._inwardDist = built;
    return built;
}

function sampleMaskInwardDistPx(distInfo, x, y, w, h) {
    const u = (x + 0.5) / w * distInfo.mw - 0.5;
    const v = (y + 0.5) / h * distInfo.mh - 0.5;
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const x1 = Math.min(x0 + 1, distInfo.mw - 1);
    const y1 = Math.min(y0 + 1, distInfo.mh - 1);
    const fx = u - x0;
    const fy = v - y0;
    const sample = (mx, my) => {
        const d = distInfo.dist[my * distInfo.mw + mx];
        return d < 0 ? null : d;
    };
    const d00 = sample(Math.max(0, x0), Math.max(0, y0));
    const d10 = sample(x1, Math.max(0, y0));
    const d01 = sample(Math.max(0, x0), y1);
    const d11 = sample(x1, y1);
    const vals = [d00, d10, d01, d11].filter(v => v !== null);
    if (!vals.length) return null;
    if (d00 === null || d10 === null || d01 === null || d11 === null) {
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    const top = d00 * (1 - fx) + d10 * fx;
    const bot = d01 * (1 - fx) + d11 * fx;
    return top * (1 - fy) + bot * fy;
}

/** 투명 영역(마스크) 안쪽은 alpha=0, 경계는 종이 찢김 테두리·그림자 (초기 구현 버전) */
function applyPaperTornTransparentRegion(imageData, maskObj, opts) {
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const jagged = opts.jagged ?? 18;
    const roughness = opts.roughness ?? 0.65;
    const edgeWidth = opts.edgeWidth ?? 0.14;
    const shadow = opts.shadow ?? 0.42;
    const fiber = opts.fiber ?? 0.55;
    const seed = opts.seed ?? 1.37;
    const paperR = 245;
    const paperG = 238;
    const paperB = 228;
    const shadowReach = edgeWidth + 0.1;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const hole = getMaskWeightAt(maskObj, x, y, w, h);
            if (hole <= 0.001) continue;

            const i = (y * w + x) * 4;
            const n = tearEdgeNoise(x * 1.31 + y * 0.57, jagged, seed) / Math.max(jagged * 1.6, 1);
            const cut = 0.5 + n * roughness * 0.36;
            const origA = src[i + 3];

            if (hole >= cut + edgeWidth * 0.45) {
                src[i + 3] = 0;
                continue;
            }

            if (hole >= cut - edgeWidth * 0.5) {
                const band = edgeWidth * 1.05 || 0.01;
                const t = Math.max(0, Math.min(1, (hole - (cut - edgeWidth * 0.5)) / band));
                const edgeMix = Math.pow(t, 0.85);
                src[i] = src[i] * (1 - edgeMix * fiber) + paperR * edgeMix * fiber;
                src[i + 1] = src[i + 1] * (1 - edgeMix * fiber) + paperG * edgeMix * fiber;
                src[i + 2] = src[i + 2] * (1 - edgeMix * fiber) + paperB * edgeMix * fiber;
                src[i + 3] = Math.round(origA * (1 - edgeMix * 0.98));
                continue;
            }

            if (hole >= cut - shadowReach) {
                const span = shadowReach - edgeWidth * 0.5 || 0.01;
                const st = Math.max(0, Math.min(1, (hole - (cut - shadowReach)) / span));
                const shade = 1 - shadow * (1 - st) * 0.85;
                src[i] = Math.round(src[i] * shade);
                src[i + 1] = Math.round(src[i + 1] * shade);
                src[i + 2] = Math.round(src[i + 2] * shade);
            }
        }
    }
}

window.bakeTornHoleToObject = function(obj) {
    if (!obj || obj.type !== 'image') return false;
    const rs = obj.retroSettings;
    if (!rs?.maskObj?.data) {
        alert('투명하게 뚫을 영역을 [영역 지정]으로 먼저 그려주세요.');
        return false;
    }
    if (typeof window.ensureFabricOriginalElement === 'function') {
        window.ensureFabricOriginalElement(obj);
    }
    const source = obj.originalElement;
    if (!source || !(source instanceof HTMLCanvasElement)) {
        alert('원본 이미지를 읽을 수 없습니다.');
        return false;
    }
    const w = source.width;
    const h = source.height;
    const work = document.createElement('canvas');
    work.width = w;
    work.height = h;
    const ctx = work.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    applyPaperTornTransparentRegion(imageData, rs.maskObj, rs);
    ctx.putImageData(imageData, 0, 0);
    const baked = window.cloneElementToCanvas ? window.cloneElementToCanvas(work) : work;
    if (!baked) return false;

    obj.filters = (obj.filters || []).filter(f => f.type !== 'ImageTear');
    obj.setElement(baked);
    obj.set({ width: baked.width, height: baked.height });
    obj.dirty = true;
    window.canvas?.requestRenderAll();
    return true;
};

function compositeCanvasWithMask(ctx, img, w, h, maskObj) {
    if (!maskObj?.data) return;
    const frame = ctx.getImageData(0, 0, w, h);
    const fd = frame.data;
    const origCanvas = document.createElement('canvas');
    origCanvas.width = w;
    origCanvas.height = h;
    origCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const od = origCanvas.getContext('2d').getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const weight = getMaskWeightAt(maskObj, x, y, w, h);
            if (weight >= 0.999) continue;
            const inv = 1 - weight;
            const i = (y * w + x) * 4;
            fd[i] = fd[i] * weight + od[i] * inv;
            fd[i + 1] = fd[i + 1] * weight + od[i + 1] * inv;
            fd[i + 2] = fd[i + 2] * weight + od[i + 2] * inv;
        }
    }
    ctx.putImageData(frame, 0, 0);
}

window.exitMaskDrawMode = exitMaskDrawMode;
window.globalRetroMemory = window.globalRetroMemory || {};

window.applyRetroFx = function(id) {
    const obj = window.canvas.getActiveObject();
    if (!obj || obj.type !== 'image') {
        if (window.maskDrawState?.active || window.canvas.isDrawingMode) return;
        return alert("이미지 객체를 선택해주세요.");
    }

    const settings = window.getTimelineSettings();
    gsap.killTweensOf(obj);
    if (obj.retroSettings) gsap.killTweensOf(obj.retroSettings);
    if (obj.activeTween) obj.activeTween.kill();
    if (obj.fxLoop) clearInterval(obj.fxLoop);
    if (typeof window.ensureFabricOriginalElement === 'function') {
        window.ensureFabricOriginalElement(obj);
    }

    // 💡 함수 이름 동적 생성 (예: window.applyRetroEffect1)
    const targetFunction = window['applyRetroEffect' + id];

    if (typeof targetFunction === 'function') {
        targetFunction(obj, settings, id);
        if (typeof window.setEffectPlaybackRunning === 'function') {
            window.setEffectPlaybackRunning(obj);
        }
    } else {
        alert(id + "번 「" + (retroFxNames[id] || '특수 효과') + "」은 아직 준비 중입니다.");
    }
};

// ============================================================================
// 5. 개별 효과 함수 (파일 맨 끝에 독립적으로 계속 이어붙이는 공간)
// ============================================================================

window.applyRetroEffect31 = function(obj, settings, id) {
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = { stripWidth: 60, depthFactor: 15, hiddenText: "3D", depthMapData: null };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };

    obj.filters = obj.filters.filter(f => f.type !== 'MagicEye');
    obj.applyFilters();
    window.canvas.renderAll();

    const panel = document.getElementById('filter-settings-panel');
    const titleEl = document.getElementById('filter-title');
    const slidersContainer = document.getElementById('filter-sliders');
    const emptyMsg = document.getElementById('filter-empty-msg');
    
    if(emptyMsg) emptyMsg.style.display = 'none';
    titleEl.innerText = "👁️ 매직아이 제작 (단계별)";
    slidersContainer.innerHTML = '';
    panel.style.display = 'block';

    const stepInfo = document.createElement('div');
    stepInfo.innerHTML = "<p style='color:#00bcd4; font-size:12px; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;'>✔️ 1. 캔버스 로드 ➡️ ✔️ 2. 효과 선택<br><br>👉 3. 숨길 형상 지정 ➡️ 4. 만들기 ➡️ 5. 실행</p>";
    slidersContainer.appendChild(stepInfo);

    const nativeW = Math.max(1, Math.round(obj.width));
    const nativeH = Math.max(1, Math.round(obj.height));

    const textWrapper = document.createElement('div');
    textWrapper.style.marginBottom = '10px'; textWrapper.style.display = 'flex'; textWrapper.style.flexDirection = 'column'; textWrapper.style.gap = '5px';
    const textLabel = document.createElement('label'); textLabel.innerText = "3-1. 숨길 글자 입력:"; textLabel.style.fontSize = '12px'; textLabel.style.color = '#ccc';
    const textInput = document.createElement('input'); textInput.type = 'text'; textInput.value = obj.retroSettings.hiddenText || "3D";
    textInput.style.padding = '5px'; textInput.style.backgroundColor = '#333'; textInput.style.color = '#00bcd4'; textInput.style.border = '1px solid #00bcd4'; textInput.style.borderRadius = '4px';
    
    textInput.oninput = (e) => {
        obj.retroSettings.hiddenText = e.target.value;
        obj.retroSettings.uploadedImg = null; 
    };
    textWrapper.appendChild(textLabel); textWrapper.appendChild(textInput); slidersContainer.appendChild(textWrapper);

    const fileBtn = document.createElement('button'); fileBtn.innerText = "3-2. 🖼️ 숨길 그림 업로드"; fileBtn.style.marginBottom = '20px'; fileBtn.style.backgroundColor = "#9c27b0";
    fileBtn.onclick = () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader(); reader.onload = (re) => {
                const img = new Image(); img.onload = () => {
                    obj.retroSettings.uploadedImg = img;
                    fileBtn.innerText = "✅ 그림 업로드 완료"; fileBtn.style.backgroundColor = "#4caf50";
                    textInput.value = ""; 
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };
    slidersContainer.appendChild(fileBtn);

    const makeBtn = document.createElement('button'); makeBtn.innerText = "4. 🛠️ 심도 맵 만들기"; makeBtn.style.marginBottom = '10px'; makeBtn.style.backgroundColor = "#e91e63";
    let isReady = false;
    
    makeBtn.onclick = () => {
        if (obj.retroSettings.uploadedImg) {
            obj.retroSettings.depthMapData = window.generateDepthMap.fromImage(obj.retroSettings.uploadedImg, nativeW, nativeH);
        } else {
            const txt = textInput.value || "3D";
            obj.retroSettings.depthMapData = window.generateDepthMap.fromText(txt, nativeW, nativeH);
            window.globalRetroMemory[id].hiddenText = txt;
        }
        window.globalRetroMemory[id].depthMapData = obj.retroSettings.depthMapData;
        makeBtn.innerText = "✅ 심도 맵 준비 완료"; makeBtn.style.backgroundColor = "#4caf50";
        isReady = true;
    };
    slidersContainer.appendChild(makeBtn);

    const execBtn = document.createElement('button'); execBtn.innerText = "5. ▶️ 매직아이 실행"; execBtn.style.backgroundColor = "#ff9800";
    execBtn.onclick = () => {
        if (!isReady && !obj.retroSettings.depthMapData) {
            alert("먼저 '4. 🛠️ 심도 맵 만들기' 버튼을 눌러 형상을 준비해주세요!"); return;
        }
        
        let filter = obj.filters.find(f => f.type === 'MagicEye');
        if (!filter) {
            filter = new fabric.Image.filters.MagicEye({ 
                stripWidth: obj.retroSettings.stripWidth || 60, 
                depthFactor: obj.retroSettings.depthFactor || 15,
                depthMapData: obj.retroSettings.depthMapData
            });
            obj.filters = [filter];
        } else {
            filter.depthMapData = obj.retroSettings.depthMapData;
        }
        
        obj.dirty = true; obj.applyFilters(); window.canvas.renderAll();
        execBtn.innerText = "✅ 매직아이 렌더링 완료";
    };
    slidersContainer.appendChild(execBtn);
};

// 💡 1번: 바람 흔들림
window.applyRetroEffect1 = function(obj, settings, id) {
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = { amplitude: 10, frequency: 0.05, speed: 2, phase: 0, brushSize: 40, feather: 20, maskObj: null };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };

    window.showFilterControls("바람 흔들림 조절", [
        { id: 'amplitude', label: '흔들림 폭', min: 1, max: 200, step: 0.5, value: obj.retroSettings.amplitude },
        { id: 'frequency', label: '물결 파장', min: 0.001, max: 0.5, step: 0.001, value: obj.retroSettings.frequency },
        { id: 'speed', label: '바람 속도', min: 0.1, max: 20, step: 0.1, value: obj.retroSettings.speed },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val; window.globalRetroMemory[id][pid] = val; 
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
    });

    setupMaskUI(id, obj);

    let filter = obj.filters.find(f => f.type === 'WindDistortion');
    if (!filter) { 
        filter = new fabric.Image.filters.WindDistortion({ amplitude: obj.retroSettings.amplitude, frequency: obj.retroSettings.frequency, phase: obj.retroSettings.phase, maskObj: obj.retroSettings.maskObj }); 
        obj.filters = [filter]; 
    }
    obj.dirty = true; obj.applyFilters(); window.canvas.renderAll();

    const startPhase = obj.retroSettings.phase || 0;
    obj.activeTween = gsap.to(obj.retroSettings, {
        phase: startPhase + (Math.PI * 2 * obj.retroSettings.speed), duration: settings.duration, repeat: settings.repeat, ease: "none", 
        onUpdate: () => {
            filter.amplitude = obj.retroSettings.amplitude; filter.frequency = obj.retroSettings.frequency; filter.phase = obj.retroSettings.phase; filter.maskObj = obj.retroSettings.maskObj;
            obj.dirty = true; obj.applyFilters(); window.canvas.renderAll();
        }
    });
};

// 💡 2번: 왕복 보행 착시
window.applyRetroEffect2 = function(obj, settings, id) {
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = { amplitude: 15, speed: 0.5, brushSize: 40, feather: 20, maskObj: null };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };

    window.showFilterControls("왕복 보행 착시", [
        { id: 'amplitude', label: '이동 폭 (좌우)', min: 1, max: 100, step: 1, value: obj.retroSettings.amplitude },
        { id: 'speed', label: '왕복 속도 (초)', min: 0.1, max: 2, step: 0.1, value: obj.retroSettings.speed },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val; window.globalRetroMemory[id][pid] = val; 
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid === 'speed' && obj.activeTween) obj.activeTween.duration(val);
    });

    setupMaskUI(id, obj);

    let filter = obj.filters.find(f => f.type === 'WiggleIllusion');
    if (!filter) { 
        filter = new fabric.Image.filters.WiggleIllusion({ offset: 0, maskObj: obj.retroSettings.maskObj }); 
        obj.filters = [filter]; 
    }
    obj.dirty = true; obj.applyFilters(); window.canvas.renderAll();

    let proxy = { offset: -obj.retroSettings.amplitude };
    obj.activeTween = gsap.to(proxy, {
        offset: obj.retroSettings.amplitude, duration: obj.retroSettings.speed, repeat: settings.repeat, yoyo: true, ease: "power1.inOut", 
        onUpdate: () => {
            filter.offset = proxy.offset; filter.maskObj = obj.retroSettings.maskObj;
            obj.dirty = true; obj.applyFilters(); window.canvas.renderAll();
        }
    });
};

// 💡 3번: 물에 잠긴 효과 (호수 물결 + 영역 마스크)
window.applyRetroEffect3 = function(obj, settings, id) {
    window.ensureFabricOriginalElement(obj);
    const img = obj.originalElement || obj.getElement();
    if (!img || !window.isImageElementReadable(img)) {
        alert('이미지 원본을 불러올 수 없습니다. 이미지를 다시 불러와 주세요.');
        return;
    }
    if (!obj.originalElement) obj.originalElement = window.cloneElementToCanvas(img);
    const source = obj.originalElement;
    const w = source.width || source.naturalWidth;
    const h = source.height || source.naturalHeight;

    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            waterLevel: 0.6, amplitude: 15, frequency: 0.05, horizontalSpread: 0.03,
            speed: 15, tintOpacity: 0.15, boundaryBlend: 40,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    const rs = obj.retroSettings;

    const rippleCanvas = document.createElement('canvas');
    rippleCanvas.width = w;
    rippleCanvas.height = h;
    const ctx = rippleCanvas.getContext('2d', { willReadFrequently: true });
    obj.setElement(rippleCanvas);
    obj.filters = [];
    obj.applyFilters();

    window.showFilterControls("물에 잠긴 효과", [
        { id: 'waterLevel', label: '수면 높이', min: 0.1, max: 0.9, step: 0.05, value: rs.waterLevel, inputType: 'range' },
        { id: 'boundaryBlend', label: '경계선 부드러움', min: 0, max: 150, step: 5, value: rs.boundaryBlend, inputType: 'range' },
        { id: 'amplitude', label: '물결 진폭', min: 0, max: 50, step: 1, value: rs.amplitude, inputType: 'range' },
        { id: 'frequency', label: '물결 파장', min: 0.01, max: 0.15, step: 0.01, value: rs.frequency, inputType: 'range' },
        { id: 'horizontalSpread', label: '가로 퍼짐', min: 0, max: 0.1, step: 0.01, value: rs.horizontalSpread, inputType: 'range' },
        { id: 'speed', label: '애니메이션 속도', min: 1, max: 40, step: 1, value: rs.speed, inputType: 'range' },
        { id: 'tintOpacity', label: '푸른빛 농도', min: 0, max: 0.8, step: 0.05, value: rs.tintOpacity, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: rs.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: rs.feather }
    ], (pid, val) => {
        rs[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid === 'speed' && obj.waterTween) obj.waterTween.duration(500 / val);
        if (pid !== 'brushSize' && pid !== 'feather' && typeof obj._waterRender === 'function') obj._waterRender();
    });

    setupMaskUI(id, obj);

    const gapFix = 100;
    const renderWater = () => {
        ctx.clearRect(0, 0, w, h);
        const waterY = h * rs.waterLevel;
        ctx.drawImage(source, 0, 0, w, waterY, 0, 0, w, waterY);

        for (let y = waterY; y < h; y += 2) {
            const distanceFromSurface = y - waterY;
            let currentAmp = rs.amplitude;
            let currentSpread = rs.horizontalSpread;
            if (rs.boundaryBlend > 0 && distanceFromSurface < rs.boundaryBlend) {
                const blendRatio = distanceFromSurface / rs.boundaryBlend;
                currentAmp = rs.amplitude * blendRatio;
                currentSpread = rs.horizontalSpread * blendRatio;
            }
            const xOffset = Math.sin(obj.waterTime + (y * rs.frequency)) * currentAmp;
            const spreadScale = 1 + Math.cos(obj.waterTime + (y * rs.frequency * 0.5)) * currentSpread;
            const newWidth = w * spreadScale;
            ctx.drawImage(source, 0, y, w, 2, (w - newWidth) / 2 + xOffset - gapFix, y, newWidth + gapFix * 2, 2);
        }

        if (rs.boundaryBlend > 0 && rs.tintOpacity > 0) {
            const tintGradient = ctx.createLinearGradient(0, waterY, 0, waterY + rs.boundaryBlend);
            tintGradient.addColorStop(0, 'rgba(0, 100, 255, 0)');
            tintGradient.addColorStop(1, `rgba(0, 100, 255, ${rs.tintOpacity})`);
            ctx.fillStyle = tintGradient;
            ctx.fillRect(0, waterY, w, rs.boundaryBlend);
            ctx.fillStyle = `rgba(0, 100, 255, ${rs.tintOpacity})`;
            ctx.fillRect(0, waterY + rs.boundaryBlend, w, h - (waterY + rs.boundaryBlend));
        } else if (rs.tintOpacity > 0) {
            ctx.fillStyle = `rgba(0, 100, 255, ${rs.tintOpacity})`;
            ctx.fillRect(0, waterY, w, h - waterY);
        }

        compositeCanvasWithMask(ctx, source, w, h, rs.maskObj);
        obj.dirty = true;
        window.canvas.renderAll();
    };

    obj.waterTime = 0;
    gsap.killTweensOf(obj);
    if (obj.waterTween) obj.waterTween.kill();
    obj.waterTween = gsap.to(obj, {
        waterTime: Math.PI * 100,
        duration: settings.duration,
        repeat: settings.repeat,
        ease: 'none',
        onUpdate: renderWater
    });
    obj._waterRender = renderWater;
    renderWater();
};

// ============================================================================
// 4번: 4방향 귀퉁이 접기 (Four-Corner Fold) - 자가 등록형 완결본
// ============================================================================

window.applyRetroEffect4 = function(obj, settings, id) {
    
    // 💡 [초강력 안전장치] 복사 누락으로 엔진이 undefined가 되는 것을 방지하기 위해 함수 내부에서 자동 등록
    if (!fabric.Image.filters.FourCornerFold) {
        fabric.Image.filters.FourCornerFold = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'FourCornerFold',
            corners: {
                TL: { w: 0, h: 0 }, TR: { w: 0, h: 0 },
                BL: { w: 0, h: 0 }, BR: { w: 0, h: 0 }
            },
            backColor: '#cccccc',
            radius: 40,
            
            applyTo: function(options) {
                if (!this.corners) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);

                const hex = this.backColor.replace('#', '');
                const rBack = parseInt(hex.substring(0, 2), 16) || 200;
                const gBack = parseInt(hex.substring(2, 4), 16) || 200;
                const bBack = parseInt(hex.substring(4, 6), 16) || 200;

                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const dstIdx = (y * w + x) * 4;
                        let cKey = '';
                        let dx = x;
                        let dy = y;
                        
                        // 현재 픽셀이 속한 4분면(모서리) 판별
                        if (y < h / 2) {
                            if (x < w / 2) { cKey = 'TL'; dx = x; dy = y; }
                            else { cKey = 'TR'; dx = w - 1 - x; dy = y; }
                        } else {
                            if (x < w / 2) { cKey = 'BL'; dx = x; dy = h - 1 - y; }
                            else { cKey = 'BR'; dx = w - 1 - x; dy = h - 1 - y; }
                        }

                        const cW = this.corners[cKey].w;
                        const cH = this.corners[cKey].h;

                        if (cW > 0 && cH > 0) {
                            const L = Math.sqrt(cW * cW + cH * cH);
                            if (L === 0) continue;
                            
                            const nx = cH / L; 
                            const ny = cW / L; 
                            const D0 = (cW * cH) / L;
                            const d = dx * nx + dy * ny - D0;
                            const rx = dx - 2 * d * nx; 
                            const ry = dy - 2 * d * ny;

                            const isFlap = (d > 0) && (rx >= 0) && (ry >= 0);
                            const isHole = (d < 0);

                            if (isFlap) {
                                let srcX = rx;
                                let srcY = ry;
                                if (cKey === 'TR') srcX = w - 1 - rx;
                                else if (cKey === 'BL') srcY = h - 1 - ry;
                                else if (cKey === 'BR') { srcX = w - 1 - rx; srcY = h - 1 - ry; }

                                srcX = Math.floor(srcX); 
                                srcY = Math.floor(srcY);

                                if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
                                    const srcIdx = (srcY * w + srcX) * 4;
                                    const shadow = 0.6 + 0.4 * Math.min(d / this.radius, 1);
                                    data[dstIdx] = (rBack * 0.7 + copyData[srcIdx] * 0.3) * shadow;
                                    data[dstIdx+1] = (gBack * 0.7 + copyData[srcIdx+1] * 0.3) * shadow;
                                    data[dstIdx+2] = (bBack * 0.7 + copyData[srcIdx+2] * 0.3) * shadow;
                                    data[dstIdx+3] = 255;
                                } else { 
                                    data[dstIdx+3] = 0; 
                                }
                            } else if (isHole) {
                                data[dstIdx+3] = 0;
                            } else {
                                data[dstIdx] = copyData[dstIdx]; 
                                data[dstIdx+1] = copyData[dstIdx+1];
                                data[dstIdx+2] = copyData[dstIdx+2]; 
                                data[dstIdx+3] = copyData[dstIdx+3];
                                if (d < this.radius) {
                                    const shadowAlpha = 0.5 * Math.pow(1 - d / this.radius, 2);
                                    data[dstIdx] *= (1 - shadowAlpha); 
                                    data[dstIdx+1] *= (1 - shadowAlpha); 
                                    data[dstIdx+2] *= (1 - shadowAlpha);
                                }
                            }
                        } else {
                            data[dstIdx] = copyData[dstIdx]; 
                            data[dstIdx+1] = copyData[dstIdx+1];
                            data[dstIdx+2] = copyData[dstIdx+2]; 
                            data[dstIdx+3] = copyData[dstIdx+3];
                        }
                    }
                }
            }
        });
    }

    // 글로벌 메모리 동기화 로직
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            corners: { TL: {w:0, h:0}, TR: {w:0, h:0}, BL: {w:0, h:0}, BR: {w:0, h:0} },
            backColor: '#e0e0e0',
            isSync: false
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };

    // 트윈 정지 (수동 빌드 방식)
    gsap.killTweensOf(obj);
    if (obj.activeTween) obj.activeTween.kill();

    // UI 패널 초기화 및 구성
    const panel = document.getElementById('filter-settings-panel');
    const titleEl = document.getElementById('filter-title');
    const slidersContainer = document.getElementById('filter-sliders');
    document.getElementById('filter-empty-msg').style.display = 'none';
    
    titleEl.innerText = "⚙️ 4방향 귀퉁이 접기";
    slidersContainer.innerHTML = '';
    panel.style.display = 'block';

    const cornersLabel = { TL: '좌상(↖)', TR: '우상(↗)', BL: '좌하(↙)', BR: '우하(↘)' };
    const inputs = {};

    // 상단 옵션 패널 (동기화 체크박스 + 색상 선택기)
    const topRow = document.createElement('div');
    topRow.style.display = 'flex'; 
    topRow.style.justifyContent = 'space-between'; 
    topRow.style.alignItems = 'center'; 
    topRow.style.marginBottom = '15px'; 
    topRow.style.borderBottom = '1px solid #444'; 
    topRow.style.paddingBottom = '10px';

    const syncLabel = document.createElement('label'); 
    syncLabel.style.color = '#00bcd4'; syncLabel.style.fontSize = '12px'; syncLabel.style.cursor = 'pointer'; syncLabel.style.display = 'flex'; syncLabel.style.alignItems = 'center';
    const syncCheck = document.createElement('input'); 
    syncCheck.type = 'checkbox'; syncCheck.checked = obj.retroSettings.isSync; syncCheck.style.marginRight = '5px';
    syncCheck.onchange = (e) => { 
        obj.retroSettings.isSync = e.target.checked; 
        window.globalRetroMemory[id].isSync = e.target.checked; 
    };
    syncLabel.appendChild(syncCheck); 
    syncLabel.appendChild(document.createTextNode('한 곳 입력 시 모두 적용'));
    
    const colorLabel = document.createElement('label'); 
    colorLabel.style.color = '#ccc'; colorLabel.style.fontSize = '12px'; colorLabel.style.display = 'flex'; colorLabel.style.alignItems = 'center';
    const colorInput = document.createElement('input'); 
    colorInput.type = 'color'; colorInput.value = obj.retroSettings.backColor; colorInput.style.border = 'none'; colorInput.style.width = '30px'; colorInput.style.height = '20px'; colorInput.style.cursor = 'pointer'; colorInput.style.marginLeft = '5px';
    colorInput.onchange = (e) => { 
        obj.retroSettings.backColor = e.target.value; 
        window.globalRetroMemory[id].backColor = e.target.value; 
    };
    colorLabel.appendChild(document.createTextNode('뒷면 색상:')); 
    colorLabel.appendChild(colorInput);

    topRow.appendChild(syncLabel); 
    topRow.appendChild(colorLabel); 
    slidersContainer.appendChild(topRow);

    // 4방향 널찍한 입력 창 그리드 구성
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid'; 
    gridContainer.style.gridTemplateColumns = '1fr 1fr'; 
    gridContainer.style.gap = '10px'; 
    gridContainer.style.marginBottom = '20px';

    Object.keys(cornersLabel).forEach(key => {
        const cell = document.createElement('div');
        cell.style.backgroundColor = '#2a2a2a'; cell.style.padding = '10px'; cell.style.borderRadius = '5px'; cell.style.textAlign = 'center';
        
        const title = document.createElement('div'); title.innerText = cornersLabel[key]; title.style.color = '#fff'; title.style.fontSize = '12px'; title.style.marginBottom = '10px'; title.style.fontWeight = 'bold';
        cell.appendChild(title);

        const createInput = (axis, ph) => {
            const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.justifyContent = 'space-between'; wrap.style.alignItems = 'center'; wrap.style.marginBottom = '8px';
            const lbl = document.createElement('span'); lbl.innerText = ph; lbl.style.color = '#aaa'; lbl.style.fontSize = '12px';
            
            const inp = document.createElement('input'); inp.type = 'number'; inp.min = 0; inp.value = obj.retroSettings.corners[key][axis];
            inp.style.width = '70px'; inp.style.padding = '5px'; inp.style.fontSize = '13px'; inp.style.textAlign = 'center'; 
            inp.style.backgroundColor = '#111'; inp.style.color = '#00bcd4'; inp.style.border = '1px solid #555'; inp.style.borderRadius = '3px'; inp.style.boxSizing = 'border-box';
            
            inp.oninput = (e) => {
                let val = parseInt(e.target.value) || 0;
                obj.retroSettings.corners[key][axis] = val; 
                window.globalRetroMemory[id].corners[key][axis] = val;
                
                if (obj.retroSettings.isSync) {
                    Object.keys(cornersLabel).forEach(k => {
                        if (k !== key) {
                            obj.retroSettings.corners[k][axis] = val; 
                            window.globalRetroMemory[id].corners[k][axis] = val;
                            if(inputs[`${k}_${axis}`]) inputs[`${k}_${axis}`].value = val;
                        }
                    });
                }
            };
            inputs[`${key}_${axis}`] = inp; 
            wrap.appendChild(lbl); wrap.appendChild(inp); 
            return wrap;
        };

        cell.appendChild(createInput('w', '가로(px)'));
        cell.appendChild(createInput('h', '세로(px)'));
        gridContainer.appendChild(cell);
    });
    slidersContainer.appendChild(gridContainer);

    // 실행 버튼 조립
    const execBtn = document.createElement('button');
    execBtn.innerText = "▶️ 귀퉁이 접기 실행"; execBtn.style.backgroundColor = "#4caf50"; execBtn.style.width = '100%'; execBtn.style.padding = '12px'; execBtn.style.fontSize = '14px'; execBtn.style.fontWeight = 'bold';
    
    execBtn.onclick = () => {
        let filter = obj.filters.find(f => f.type === 'FourCornerFold');
        if (!filter) {
            filter = new fabric.Image.filters.FourCornerFold({
                corners: JSON.parse(JSON.stringify(obj.retroSettings.corners)),
                backColor: obj.retroSettings.backColor
            });
            obj.filters = [filter];
        } else {
            filter.corners = JSON.parse(JSON.stringify(obj.retroSettings.corners));
            filter.backColor = obj.retroSettings.backColor;
        }
        
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
        
        const originalText = execBtn.innerText;
        execBtn.innerText = "✅ 적용 완료!";
        setTimeout(() => { execBtn.innerText = originalText; }, 1000);
    };
    slidersContainer.appendChild(execBtn);
};

// 💡 5번: 종이 말림/펴짐
window.applyRetroEffect5 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') {
        window.ensureFabricOriginalElement(obj);
    }
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, radius: 40, direction: 2, shadow: 0.45, backColor: '#e8e0d5',
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };

    let filter = obj.filters.find(f => f.type === 'PaperRoll');
    if (!filter) {
        filter = new fabric.Image.filters.PaperRoll({
            amount: 0,
            radius: obj.retroSettings.radius,
            direction: obj.retroSettings.direction,
            shadow: obj.retroSettings.shadow,
            backColor: obj.retroSettings.backColor,
            maskObj: obj.retroSettings.maskObj
        });
        obj.filters = [filter];
    }

    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.radius = obj.retroSettings.radius;
        filter.direction = obj.retroSettings.direction;
        filter.shadow = obj.retroSettings.shadow;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };

    window.showFilterControls('종이 말림/펴짐', [
        { id: 'radius', label: '말림 곡률', min: 40, max: 400, step: 5, value: obj.retroSettings.radius, inputType: 'range' },
        { id: 'shadow', label: '그림자 강도', min: 0, max: 1, step: 0.05, value: obj.retroSettings.shadow, inputType: 'range' },
        { id: 'direction', label: '말림 방향 (0:좌 1:우 2:상 3:하)', min: 0, max: 3, step: 1, value: obj.retroSettings.direction, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });

    setupMaskUI(id, obj);

    obj.retroSettings.amount = 0;
    syncFilter();

    obj.activeTween = gsap.to(obj.retroSettings, {
        amount: 1,
        duration: settings.duration,
        repeat: settings.repeat,
        yoyo: true,
        ease: 'power1.inOut',
        onUpdate: syncFilter
    });
};

function bindRetroMaskFilter(obj, settings, id, filter, syncFilter) {
    setupMaskUI(id, obj);
    obj.retroSettings.amount = 0;
    syncFilter();
    const tween = { amount: 1 };
    if (obj.retroSettings.phase !== undefined) tween.phase = (obj.retroSettings.phase || 0) + Math.PI * 2;
    obj.activeTween = gsap.to(obj.retroSettings, {
        ...tween,
        duration: settings.duration,
        repeat: settings.repeat,
        yoyo: true,
        ease: 'power1.inOut',
        onUpdate: syncFilter
    });
}

// 💡 6번: 이미지 찢기 (tear-static 당시 버전: ImageTear 필터 · 정적)
window.applyRetroEffect6 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, roughness: 10,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'ImageTear');
    if (!filter) {
        filter = new fabric.Image.filters.ImageTear({ ...obj.retroSettings });
        obj.filters = [filter];
    }

    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.roughness = obj.retroSettings.roughness;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };

    window.showFilterControls('이미지 찢기 (영역 지정)', [
        { id: 'roughness', label: '거칠기 (톱니)', min: 0, max: 20, step: 1, value: obj.retroSettings.roughness, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 페더', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather') {
            if (!obj.retroSettings.maskObj?.data) return;
            syncFilter();
        }
    });

    const slidersEl = document.getElementById('filter-sliders');
    if (slidersEl) {
        const hint = document.createElement('p');
        hint.style.cssText = 'color:#888;font-size:12px;margin:0 0 12px;line-height:1.45;border-bottom:1px solid #444;padding-bottom:10px';
        hint.textContent = '① [영역 지정]으로 찢을 범위를 그린 뒤 완료 → ② 슬라이더로 종이 찢김 모양을 조절하세요. (정적 효과, 애니메이션 없음)';
        slidersEl.insertBefore(hint, slidersEl.firstChild);
    }

    setupMaskUI(id, obj);

    if (obj.retroSettings.maskObj?.data) syncFilter();
};

// 💡 7번: 물감 흘러내림
window.applyRetroEffect7 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, dripLen: 120, wobble: 18, phase: 0, viscosity: 0.6,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'PaintDrip');
    if (!filter) {
        filter = new fabric.Image.filters.PaintDrip({ ...obj.retroSettings });
        obj.filters = [filter];
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.dripLen = obj.retroSettings.dripLen;
        filter.wobble = obj.retroSettings.wobble;
        filter.phase = obj.retroSettings.phase;
        filter.viscosity = obj.retroSettings.viscosity;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };
    window.showFilterControls('물감 흘러내림', [
        { id: 'dripLen', label: '흘러내림 길이', min: 20, max: 280, step: 5, value: obj.retroSettings.dripLen, inputType: 'range' },
        { id: 'wobble', label: '물결 흔들림', min: 0, max: 40, step: 1, value: obj.retroSettings.wobble, inputType: 'range' },
        { id: 'viscosity', label: '점도 (농도)', min: 0.2, max: 1.2, step: 0.05, value: obj.retroSettings.viscosity, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 페더', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });
    bindRetroMaskFilter(obj, settings, id, filter, syncFilter);
};

// 💡 8번: 벽 구멍 투시
window.applyRetroEffect8 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, angle: 0, holeSize: 0.45, depth: 1.2, vignette: 0.5,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'HolePerspective');
    if (!filter) {
        filter = new fabric.Image.filters.HolePerspective({ ...obj.retroSettings });
        obj.filters = [filter];
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.angle = obj.retroSettings.angle;
        filter.holeSize = obj.retroSettings.holeSize;
        filter.depth = obj.retroSettings.depth;
        filter.vignette = obj.retroSettings.vignette;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };
    window.showFilterControls('벽 구멍 투시', [
        { id: 'angle', label: '두께 방향 (0~315)', min: 0, max: 315, step: 45, value: obj.retroSettings.angle, inputType: 'range' },
        { id: 'holeSize', label: '구멍 크기', min: 0.15, max: 0.85, step: 0.01, value: obj.retroSettings.holeSize, inputType: 'range' },
        { id: 'depth', label: '깊이 왜곡', min: 0.3, max: 2.5, step: 0.05, value: obj.retroSettings.depth, inputType: 'range' },
        { id: 'vignette', label: '가장자리 어둡기', min: 0, max: 1, step: 0.05, value: obj.retroSettings.vignette, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 페더', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });
    bindRetroMaskFilter(obj, settings, id, filter, syncFilter);
};

// 💡 9번: 퍼즐 조각화
window.applyRetroEffect9 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, cols: 6, rows: 4,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'PuzzleShuffle');
    if (!filter) {
        filter = new fabric.Image.filters.PuzzleShuffle({ ...obj.retroSettings });
        obj.filters = [filter];
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.cols = obj.retroSettings.cols;
        filter.rows = obj.retroSettings.rows;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };
    window.showFilterControls('퍼즐 조각화', [
        { id: 'cols', label: '가로 조각 수', min: 2, max: 12, step: 1, value: obj.retroSettings.cols, inputType: 'range' },
        { id: 'rows', label: '세로 조각 수', min: 2, max: 12, step: 1, value: obj.retroSettings.rows, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 페더', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });
    bindRetroMaskFilter(obj, settings, id, filter, syncFilter);
};

// 💡 10번: 원통형 말림
window.applyRetroEffect10 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, fov: 0.85, brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'CylinderRoll');
    if (!filter) {
        filter = new fabric.Image.filters.CylinderRoll({ ...obj.retroSettings });
        obj.filters = [filter];
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.fov = obj.retroSettings.fov;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };
    window.showFilterControls('원통형 말림', [
        { id: 'fov', label: '원통 시야(FOV)', min: 0.3, max: 1.2, step: 0.05, value: obj.retroSettings.fov, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 페더', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });
    bindRetroMaskFilter(obj, settings, id, filter, syncFilter);
};