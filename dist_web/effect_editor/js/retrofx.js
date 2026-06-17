// ============================================================================
// 1. 레트로 효과 이름 및 버튼 UI 생성
// ============================================================================
const retroFxNames = {
    1: "미세한 바람 흔들림", 2: "왕복 보행 착시", 3: "물에 잠긴 효과", 4: "귀퉁이 접기", 5: "종이 말림/펴짐",
    6: "이미지 찢기", 7: "물감 흘러내림(유화)", 8: "벽에 구멍 뚫기", 9: "퍼즐 조각화", 10: "두루말이 만들기",
    11: "호수 잔물결", 12: "소용돌이 물결", 13: "세로 폭포 왜곡", 14: "깨진 유리창 효과", 15: "물방울 파동",
    16: "수면 굴절", 17: "만다라 효과", 18: "기름막 무지개 왜곡", 19: "얼음 큐브 굴절", 20: "비 오는 유리창",
    21: "매직아이 생성", 22: "일본식 미닫이 문"
};
window.retroFxNames = retroFxNames;

const retroFxContainer = document.getElementById('retro-fx-container');
if (retroFxContainer) {
    retroFxContainer.innerHTML = ''; 
    for (let i = 1; i <= 22; i++) {
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

function sampleNearest(copyData, w, h, sx, sy) {
    const x = Math.max(0, Math.min(w - 1, Math.round(sx)));
    const y = Math.max(0, Math.min(h - 1, Math.round(sy)));
    const i = (y * w + x) * 4;
    return [copyData[i], copyData[i + 1], copyData[i + 2], copyData[i + 3]];
}

/** 반영 샘플: 범위 밖이면 null (가장자리 클램프로 인한 늘어짐 방지) */
function sampleReflectionPixel(copyData, w, h, sx, sy, useBilinear) {
    if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) return null;
    if (useBilinear) return sampleBilinear(copyData, w, h, sx, sy);
    return sampleNearest(copyData, w, h, sx, sy);
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
    const j = Math.max(1, jagged);
    const wave = Math.sin(t * 0.09 + seed) * j * 0.48
        + Math.sin(t * 0.22 + seed * 2.17) * j * 0.36
        + Math.sin(t * 0.41 + seed * 0.83) * j * 0.3
        + Math.sin(t * 0.78 + seed * 1.53) * j * 0.24
        + Math.sin(t * 1.33 + seed * 2.91) * j * 0.18;
    const spike = Math.sin(t * 0.15 + seed * 4.7) * Math.sin(t * 0.31 + seed * 6.2);
    return wave + spike * j * 0.42;
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

function maskBoundsToImageRect(bounds, w, h) {
    const mw = bounds.mw;
    const mh = bounds.mh;
    return {
        minX: (bounds.minX / mw) * w,
        minY: (bounds.minY / mh) * h,
        maxX: ((bounds.maxX + 1) / mw) * w,
        maxY: ((bounds.maxY + 1) / mh) * h
    };
}

function snapHoleViewAngle(deg) {
    const a = ((deg % 360) + 360) % 360;
    const snaps = [0, 45, 90, 135, 180, 225, 270, 315];
    return snaps.reduce((best, v) => (Math.abs(v - a) < Math.abs(best - a) ? v : best), 0);
}

/** 사각형 마스크 외곽(바운딩) 안인지 */
function isInsideHoleRect(x, y, rect) {
    return x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY;
}

/**
 * 시점(어디서 보는지) → 벽이 생기는 변/모서리
 * 반대편 = 시선이 통과한 뒤쪽(먼 쪽). 0=왼쪽에서 봄 → 오른쪽 변, 90=아래→위, …
 */
function wallSideAngleForView(viewAngleDeg) {
    const a = snapHoleViewAngle(viewAngleDeg);
    if (a === 90) return 270;
    if (a === 270) return 90;
    return a;
}

/** 시점 → 반대편(먼) 모서리 (135↔315 라벨/시계 보정) */
function oppositeCornerForViewAngle(viewAngleDeg) {
    switch (snapHoleViewAngle(viewAngleDeg)) {
        case 45: return 'ne';
        case 135: return 'nw';
        case 225: return 'sw';
        case 315: return 'se';
        default: return null;
    }
}

/** 모서리 ㄴ: 두 변 안쪽 직선 + 꼭짓점↔내부 교점 대각(삼각) */
function getRectCornerUv(x, y, rect, corner) {
    const { minX, minY, maxX, maxY } = rect;
    switch (corner) {
        case 'ne': return { u: maxX - x, v: y - minY };
        case 'se': return { u: maxX - x, v: maxY - y };
        case 'sw': return { u: x - minX, v: maxY - y };
        case 'nw': return { u: x - minX, v: y - minY };
        default: return { u: -1, v: -1 };
    }
}

/**
 * 모서리 ㄴ (창문 reveal plan): 두 변 안쪽 직선 + 꼭짓점↔교차점 대각(u=v)
 * 벽 = u<=th 또는 v<=th (ㄴ), 구멍 = u>th && v>th
 */
function isRectCornerWallPixel(x, y, rect, wallTh, corner) {
    const th = wallTh + 0.5;
    const { u, v } = getRectCornerUv(x, y, rect, corner);
    if (u < 0 || v < 0) return false;
    return u <= th || v <= th;
}

/**
 * 사각 마스크 벽 (단순 기하)
 * 1) rect 외곽 기준
 * 2) 0/90/180/270 → 반대 변 안쪽 wallTh 직선
 * 3) 45/… → 반대 모서리 ㄴ(두 직선 + 꼭짓점 대각)
 */
function isRectHoleWallPixel(x, y, rect, wallTh, viewAngleDeg) {
    if (!isInsideHoleRect(x, y, rect)) return false;
    const th = wallTh + 0.5;
    const { minX, minY, maxX, maxY } = rect;
    const side = wallSideAngleForView(viewAngleDeg);
    switch (side) {
        case 0:
            return x >= maxX - th;
        case 90:
            return y >= maxY - th;
        case 180:
            return x <= minX + th;
        case 270:
            return y <= minY + th;
        case 45:
        case 135:
        case 225:
        case 315: {
            const corner = oppositeCornerForViewAngle(viewAngleDeg);
            return corner ? isRectCornerWallPixel(x, y, rect, wallTh, corner) : false;
        }
        default:
            return false;
    }
}

/** 사각 벽돌: 직선 변 길이 기준(원호 π 없음) */
function computeRectHoleBrickMetrics(wallTh, brickCount, brickDepthLayers, edgeLen) {
    const layers = Math.max(0.5, Math.min(1.5, brickDepthLayers));
    const count = Math.max(10, Math.min(30, Math.round(brickCount)));
    const brickL = Math.max(4, wallTh / layers);
    const brickH = Math.max(6, Math.max(40, edgeLen) / count);
    const mortar = Math.max(1, Math.min(3, Math.round(Math.min(brickL, brickH) * 0.07)));
    return { brickL, brickH, mortar };
}

/** 마스크 안, 외곽에서 안쪽 wallTh — 직선 밴드용 u(변 방향), z(안쪽 깊이) */
function getRectWallBrickCoords(x, y, rect, wallTh, viewAngleDeg) {
    if (!isRectHoleWallPixel(x, y, rect, wallTh, viewAngleDeg)) return null;
    const th = Math.max(1, wallTh);
    const { minX, minY, maxX, maxY } = rect;
    const side = wallSideAngleForView(viewAngleDeg);
    if (side === 0) {
        const z = maxX - x;
        return { u: y - minY, z, hitT: 1 - Math.min(1, z / th) };
    }
    if (side === 180) {
        const z = x - minX;
        return { u: y - minY, z, hitT: 1 - Math.min(1, z / th) };
    }
    if (side === 90) {
        const z = maxY - y;
        return { u: x - minX, z, hitT: 1 - Math.min(1, z / th) };
    }
    if (side === 270) {
        const z = y - minY;
        return { u: x - minX, z, hitT: 1 - Math.min(1, z / th) };
    }
    const corner = oppositeCornerForViewAngle(viewAngleDeg);
    return corner ? getRectCornerBrickCoords(x, y, rect, wallTh, corner) : null;
}

/** 모서리 벽돌: 직선 다리 격자, 대각(u=v)에서 위·옆 패턴 분리 (cant brick) */
function getRectCornerBrickCoords(x, y, rect, wallTh, corner) {
    if (!isRectCornerWallPixel(x, y, rect, wallTh, corner)) return null;
    const th = Math.max(1, wallTh);
    const { minX, minY, maxX, maxY } = rect;
    const { u, v } = getRectCornerUv(x, y, rect, corner);
    if (u < 0 || v < 0) return null;

    const onMiter = u <= th + 0.5 && v <= th + 0.5;
    const miterTol = 0.85;

    switch (corner) {
        case 'ne': {
            const top = () => ({ u: x - minX, z: v, hitT: 1 - Math.min(1, v / th) });
            const right = () => ({ u: y - minY, z: u, hitT: 1 - Math.min(1, u / th) });
            if (onMiter && v < u - miterTol) return top();
            if (onMiter && u < v - miterTol) return right();
            if (onMiter) return { u: x - minX, z: v, hitT: 1 - Math.min(1, v / th), miterEdge: true };
            if (v <= th + 0.5) return top();
            return right();
        }
        case 'se': {
            const bottom = () => ({ u: x - minX, z: v, hitT: 1 - Math.min(1, v / th) });
            const right = () => ({ u: maxY - y, z: u, hitT: 1 - Math.min(1, u / th) });
            if (onMiter && v < u - miterTol) return bottom();
            if (onMiter && u < v - miterTol) return right();
            if (onMiter) return { u: x - minX, z: v, hitT: 1 - Math.min(1, v / th), miterEdge: true };
            if (v <= th + 0.5) return bottom();
            return right();
        }
        case 'sw': {
            const bottom = () => ({ u: maxX - x, z: v, hitT: 1 - Math.min(1, v / th) });
            const left = () => ({ u: maxY - y, z: u, hitT: 1 - Math.min(1, u / th) });
            if (onMiter && v < u - miterTol) return bottom();
            if (onMiter && u < v - miterTol) return left();
            if (onMiter) return { u: maxX - x, z: v, hitT: 1 - Math.min(1, v / th), miterEdge: true };
            if (v <= th + 0.5) return bottom();
            return left();
        }
        case 'nw': {
            const top = () => ({ u: maxX - x, z: v, hitT: 1 - Math.min(1, v / th) });
            const left = () => ({ u: y - minY, z: u, hitT: 1 - Math.min(1, u / th) });
            if (onMiter && v < u - miterTol) return top();
            if (onMiter && u < v - miterTol) return left();
            if (onMiter) return { u: maxX - x, z: v, hitT: 1 - Math.min(1, v / th), miterEdge: true };
            if (v <= th + 0.5) return top();
            return left();
        }
        default:
            return null;
    }
}

/** bbox 채움 비율: 원≈0.79, 사각≈1.0 */
function maskFillRatioInBounds(maskObj) {
    const bounds = computeMaskBounds(maskObj);
    if (!bounds) return 0;
    const mw = bounds.mw;
    const mh = bounds.mh;
    const area = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
    if (area < 1) return 0;
    let fill = 0;
    for (let iy = bounds.minY; iy <= bounds.maxY; iy++) {
        for (let ix = bounds.minX; ix <= bounds.maxX; ix++) {
            if (maskObj.data[(iy * mw + ix) * 4] / 255 >= 0.5) fill++;
        }
    }
    return fill / area;
}

function inferHoleMaskShapeFromDrawTool(tool) {
    if (tool === 'rect') return 'rect';
    if (tool === 'circle') return 'circle';
    return 'brush';
}

function resolveHoleMaskShape(maskObj, shapeHint) {
    if (shapeHint === 'rect') return 'rect';
    if (shapeHint === 'circle') return 'circle';
    if (!maskObj?.data) return 'circle';
    return maskFillRatioInBounds(maskObj) >= 0.86 ? 'rect' : 'circle';
}

function shouldUseRectHoleWall(maskObj, shapeHint) {
    if (shapeHint === 'circle') return false;
    if (shapeHint === 'rect') return true;
    if (shapeHint === 'brush') return false;
    if (!maskObj?.data) return false;
    return maskFillRatioInBounds(maskObj) >= 0.75;
}

function getCircleWallBrickDirs(x, y, mcx, mcy, maskObj, w, h) {
    if (maskObj?.data) {
        const w00 = getMaskWeightAt(maskObj, x - 1, y - 1, w, h);
        const w01 = getMaskWeightAt(maskObj, x - 1, y, w, h);
        const w02 = getMaskWeightAt(maskObj, x - 1, y + 1, w, h);
        const w20 = getMaskWeightAt(maskObj, x + 1, y - 1, w, h);
        const w21 = getMaskWeightAt(maskObj, x + 1, y, w, h);
        const w22 = getMaskWeightAt(maskObj, x + 1, y + 1, w, h);
        
        const w10 = getMaskWeightAt(maskObj, x, y - 1, w, h);
        const w12 = getMaskWeightAt(maskObj, x, y + 1, w, h);
        
        const dx = (w00 + 2 * w01 + w02) - (w20 + 2 * w21 + w22);
        const dy = (w00 + 2 * w10 + w20) - (w02 + 2 * w12 + w22);
        const len = Math.hypot(dx, dy);
        if (len > 0.05) {
            const inNx = dx / len;
            const inNy = dy / len;
            const perpX = -inNy;
            const perpY = inNx;
            return { inNx, inNy, perpX, perpY };
        }
    }
    const dx = mcx - x;
    const dy = mcy - y;
    const len = Math.hypot(dx, dy) || 1;
    return { inNx: dx / len, inNy: dy / len, perpX: -dy / len, perpY: dx / len };
}

function getMaskWeightInTear(maskObj, x, y, w, h) {
    if (!maskObj?.data) return 0;
    return getMaskWeightAt(maskObj, x, y, w, h);
}

fabric.Image.filters.ImageTear = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'ImageTear',
    amount: 0,
    roughness: 14,
    maskObj: null,
    seed: 1.37,
    applyTo: function (options) {
        const amt = Math.max(0, Math.min(1, this.amount));
        if (amt < 0.001 || !this.maskObj?.data) return;

        const rough = Math.max(4, this.roughness ?? 16);
        const jagged = 10 + rough * 2.2;
        applyPaperTornTransparentRegion(options.imageData, this.maskObj, {
            amount: amt,
            jagged,
            roughnessSlider: rough,
            seed: this.seed || 1.37,
            keepCopy: true
        });
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
        
        if (amt < 0.001) return;

        for (let y = 0; y < h; y++) {
            const yNorm = y / h;
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                
                const wob = Math.sin(x * 0.06 + this.phase) * this.wobble * amt
                          + Math.sin(x * 0.14 + y * 0.03 + this.phase * 1.3) * this.wobble * 0.35 * amt;
                          
                const drip = maxDrip * Math.pow(Math.max(0, yNorm - 0.08), Math.max(0.1, visc - yNorm*0.5));
                
                const totalShift = Math.max(0, drip + wob);
                const sy = y - totalShift;
                
                const weight = getMaskWeightAt(this.maskObj, x, sy, w, h);
                const originalWeight = getMaskWeightAt(this.maskObj, x, y, w, h);
                
                if (weight > 0.001) {
                    const px = sampleBilinear(copyData, w, h, x, sy);
                    
                    let distToTop = 0;
                    for (let step = 1; step <= 40; step++) {
                        if (getMaskWeightAt(this.maskObj, x, sy - step, w, h) < 0.5) {
                            distToTop = step;
                            break;
                        }
                    }
                    
                    let shade = 1.0;
                    if (distToTop > 0 && distToTop < 40) {
                        const norm = distToTop / 40.0;
                        shade = 0.8 + Math.sin(norm * Math.PI) * 0.5;
                    } else if (distToTop === 0) {
                        shade = 1.0;
                    }
                    
                    const dwob = Math.cos(x * 0.06 + this.phase) * this.wobble * amt;
                    shade += dwob * 0.01;
                    
                    let distToBottom = 0;
                    for (let step = 1; step <= 20; step++) {
                        if (getMaskWeightAt(this.maskObj, x, sy + step, w, h) < 0.5) {
                            distToBottom = step;
                            break;
                        }
                    }
                    if (distToBottom > 0 && distToBottom < 20) {
                        const norm = distToBottom / 20.0;
                        shade = 0.6 + norm * 0.4;
                    }
                    
                    data[dstIdx] = Math.min(255, Math.max(0, px[0] * shade)) * weight + copyData[dstIdx] * (1 - weight);
                    data[dstIdx + 1] = Math.min(255, Math.max(0, px[1] * shade)) * weight + copyData[dstIdx + 1] * (1 - weight);
                    data[dstIdx + 2] = Math.min(255, Math.max(0, px[2] * shade)) * weight + copyData[dstIdx + 2] * (1 - weight);
                    data[dstIdx + 3] = px[3] * weight + copyData[dstIdx + 3] * (1 - weight);
                } else if (originalWeight > 0.001) {
                    let clampSy = sy;
                    while(clampSy <= y && getMaskWeightAt(this.maskObj, x, clampSy, w, h) < 0.5) {
                        clampSy++;
                    }
                    if (getMaskWeightAt(this.maskObj, x, clampSy, w, h) > 0.5) {
                        const px = sampleBilinear(copyData, w, h, x, clampSy);
                        let shade = 1.2;
                        data[dstIdx] = Math.min(255, px[0] * shade);
                        data[dstIdx + 1] = Math.min(255, px[1] * shade);
                        data[dstIdx + 2] = Math.min(255, px[2] * shade);
                        data[dstIdx + 3] = px[3];
                    } else {
                        data[dstIdx] = copyData[dstIdx];
                        data[dstIdx + 1] = copyData[dstIdx + 1];
                        data[dstIdx + 2] = copyData[dstIdx + 2];
                        data[dstIdx + 3] = copyData[dstIdx + 3];
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

fabric.Image.filters.HolePerspective = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'HolePerspective',
    amount: 0,
    angle: 0,
    wallThickness: 25,
    brickCount: 18,
    brickDepthLayers: 1,
    holeSize: 0.45,
    vignette: 0.5,
    maskObj: null,
    holeMaskShape: null,
    mode: 'wall',
    borderThickness: 4,
    borderShape: 'solid',
    borderColor: '#ffffff',
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const cx = w * 0.5;
        const cy = h * 0.5;
        const maxR = Math.min(cx, cy);
        const holeR = maxR * Math.max(0.05, Math.min(0.95, this.holeSize || 0.45));
        const amt = Math.max(0, Math.min(1, this.amount));
        if (amt < 0.001) return;

        const wallTh = Math.max(5, Math.min(60, Math.round((this.wallThickness || 25) / 5) * 5));
        const brickCount = Math.max(10, Math.min(30, Math.round(this.brickCount || 18)));
        const brickDepthLayers = Math.max(0.5, Math.min(1.5, this.brickDepthLayers ?? 1));
        const viewAngle = this.angle || 0;
        const hasMask = !!this.maskObj?.data;
        if (!hasMask) return;
        const wallAngleRad = (-viewAngle) * Math.PI / 180;
        const steps = Math.max(3, Math.ceil(brickDepthLayers * 4));
        const sx = -wallTh * Math.cos(wallAngleRad);
        const sy = -wallTh * Math.sin(wallAngleRad);

        // Connected components structures
        let labels = null;
        let components = [];
        let maskW = 0;
        let maskH = 0;
        let gx = null;
        let gy = null;

        if (hasMask) {
            maskW = this.maskObj.width;
            maskH = this.maskObj.height;
            const maskData = this.maskObj.data;
            labels = new Int32Array(maskW * maskH);
            let numComponents = 0;
            const stack = [];

            // Flood-fill labeling (using iterative array queue/stack to prevent stack overflow)
            for (let my = 0; my < maskH; my++) {
                for (let mx = 0; mx < maskW; mx++) {
                    const idx = my * maskW + mx;
                    if (labels[idx] === 0 && maskData[idx * 4] >= 128) {
                        numComponents++;
                        labels[idx] = numComponents;
                        stack.push(idx);

                        while (stack.length > 0) {
                            const curr = stack.pop();
                            const cx_val = curr % maskW;
                            const cy_val = Math.floor(curr / maskW);

                            // Check 4-way neighbors
                            const neighbors = [
                                curr - 1, curr + 1, curr - maskW, curr + maskW
                            ];
                            for (let nIdx = 0; nIdx < 4; nIdx++) {
                                const next = neighbors[nIdx];
                                if (nIdx === 0 && cx_val === 0) continue;
                                if (nIdx === 1 && cx_val === maskW - 1) continue;
                                if (nIdx === 2 && cy_val === 0) continue;
                                if (nIdx === 3 && cy_val === maskH - 1) continue;

                                if (next >= 0 && next < maskW * maskH && labels[next] === 0 && maskData[next * 4] >= 128) {
                                    labels[next] = numComponents;
                                    stack.push(next);
                                }
                            }
                        }
                    }
                }
            }

            // Gather bounding box & stats for each component
            for (let k = 1; k <= numComponents; k++) {
                components[k] = {
                    minX: maskW, maxX: 0, minY: maskH, maxY: 0,
                    sumX: 0, sumY: 0, count: 0
                };
            }

            for (let my = 0; my < maskH; my++) {
                for (let mx = 0; mx < maskW; mx++) {
                    const label = labels[my * maskW + mx];
                    if (label > 0) {
                        const comp = components[label];
                        if (mx < comp.minX) comp.minX = mx;
                        if (mx > comp.maxX) comp.maxX = mx;
                        if (my < comp.minY) comp.minY = my;
                        if (my > comp.maxY) comp.maxY = my;
                        comp.sumX += mx;
                        comp.sumY += my;
                        comp.count++;
                    }
                }
            }

            // Finalize component metrics
            for (let k = 1; k <= numComponents; k++) {
                const comp = components[k];
                const boundsW = comp.maxX - comp.minX + 1;
                const boundsH = comp.maxY - comp.minY + 1;
                const area = boundsW * boundsH;
                const fillRatio = comp.count / area;

                const mcx_val = ((comp.sumX / comp.count) / maskW) * w;
                const mcy_val = ((comp.sumY / comp.count) / maskH) * h;

                const holeRect_val = {
                    minX: (comp.minX / maskW) * w,
                    minY: (comp.minY / maskH) * h,
                    maxX: ((comp.maxX + 1) / maskW) * w,
                    maxY: ((comp.maxY + 1) / maskH) * h
                };

                let shape = this.holeMaskShape;
                if (!shape || (shape !== 'rect' && shape !== 'circle' && shape !== 'brush')) {
                    shape = (fillRatio >= 0.85 ? 'rect' : 'circle');
                }
                const useRectWall_val = (shape === 'rect');

                const rectEdgeLen_val = Math.max(holeRect_val.maxX - holeRect_val.minX, holeRect_val.maxY - holeRect_val.minY);
                const outerR_val = rectEdgeLen_val * 0.5;

                components[k] = {
                    mcx: mcx_val,
                    mcy: mcy_val,
                    holeRect: holeRect_val,
                    useRectWall: useRectWall_val,
                    shape: shape,
                    maxDist: 0,
                    rectBrickMetrics: computeRectHoleBrickMetrics(wallTh, brickCount, brickDepthLayers, rectEdgeLen_val),
                    circleBrickMetrics: computeHoleBrickMetrics(wallTh, brickCount, brickDepthLayers, outerR_val)
                };
            }

            // Vector Distance Transform (VDT) for arbitrary boundary distances
            const size = maskW * maskH;
            gx = new Int16Array(size);
            gy = new Int16Array(size);

            for (let my = 0; my < maskH; my++) {
                for (let mx = 0; mx < maskW; mx++) {
                    const idx = my * maskW + mx;
                    gx[idx] = -1;
                    gy[idx] = -1;
                    if (maskData[idx * 4] >= 128) {
                        const isBoundary = (
                            mx === 0 || mx === maskW - 1 ||
                            my === 0 || my === maskH - 1 ||
                            (mx > 0 && maskData[(idx - 1) * 4] < 128) ||
                            (mx < maskW - 1 && maskData[(idx + 1) * 4] < 128) ||
                            (my > 0 && maskData[(idx - maskW) * 4] < 128) ||
                            (my < maskH - 1 && maskData[(idx + maskW) * 4] < 128)
                        );
                        if (isBoundary) {
                            gx[idx] = mx;
                            gy[idx] = my;
                        }
                    }
                }
            }

            // Forward Pass
            for (let my = 0; my < maskH; my++) {
                for (let mx = 0; mx < maskW; mx++) {
                    const idx = my * maskW + mx;
                    if (maskData[idx * 4] < 128) continue;
                    
                    let curX = gx[idx];
                    let curY = gy[idx];
                    let minDistSq = (curX !== -1) ? ((mx - curX) * (mx - curX) + (my - curY) * (my - curY)) : 1e9;
                    
                    const dxs = [-1, -1, 0, 1];
                    const dys = [0, -1, -1, -1];
                    for (let i = 0; i < 4; i++) {
                        const nx = mx + dxs[i];
                        const ny = my + dys[i];
                        if (nx >= 0 && nx < maskW && ny >= 0 && ny < maskH) {
                            const nidx = ny * maskW + nx;
                            const ngx = gx[nidx];
                            const ngy = gy[nidx];
                            if (ngx !== -1) {
                                const distSq = (mx - ngx) * (mx - ngx) + (my - ngy) * (my - ngy);
                                if (distSq < minDistSq) {
                                    minDistSq = distSq;
                                    curX = ngx;
                                    curY = ngy;
                                }
                            }
                        }
                    }
                    gx[idx] = curX;
                    gy[idx] = curY;
                }
            }

            // Backward Pass
            for (let my = maskH - 1; my >= 0; my--) {
                for (let mx = maskW - 1; mx >= 0; mx--) {
                    const idx = my * maskW + mx;
                    if (maskData[idx * 4] < 128) continue;
                    
                    let curX = gx[idx];
                    let curY = gy[idx];
                    let minDistSq = (curX !== -1) ? ((mx - curX) * (mx - curX) + (my - curY) * (my - curY)) : 1e9;
                    
                    const dxs = [1, 1, 0, -1];
                    const dys = [0, 1, 1, 1];
                    for (let i = 0; i < 4; i++) {
                        const nx = mx + dxs[i];
                        const ny = my + dys[i];
                        if (nx >= 0 && nx < maskW && ny >= 0 && ny < maskH) {
                            const nidx = ny * maskW + nx;
                            const ngx = gx[nidx];
                            const ngy = gy[nidx];
                            if (ngx !== -1) {
                                const distSq = (mx - ngx) * (mx - ngx) + (my - ngy) * (my - ngy);
                                if (distSq < minDistSq) {
                                    minDistSq = distSq;
                                    curX = ngx;
                                    curY = ngy;
                                }
                            }
                        }
                    }
                    gx[idx] = curX;
                    gy[idx] = curY;
                }
            }
        }

        // Global fallback metrics (when no mask is present)
        const mcx = w * 0.5;
        const mcy = h * 0.5;
        const useRectWall = false;
        const holeRect = { minX: cx - holeR, minY: cy - holeR, maxX: cx + holeR, maxY: cy + holeR };
        const rectBrickMetrics = computeRectHoleBrickMetrics(wallTh, brickCount, brickDepthLayers, holeR * 2);
        const circleBrickMetrics = computeHoleBrickMetrics(wallTh, brickCount, brickDepthLayers, holeR);

        const getCompIdxAt = (px, py) => {
            if (!labels) return 0;
            const mx = Math.floor((px / w) * maskW);
            const my = Math.floor((py / h) * maskH);
            const safeX = Math.min(Math.max(mx, 0), maskW - 1);
            const safeY = Math.min(Math.max(my, 0), maskH - 1);
            const lbl = labels[safeY * maskW + safeX];
            if (lbl > 0) return lbl;

            // Search 3x3 neighborhood for edge smoothing
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = Math.min(Math.max(mx + dx, 0), maskW - 1);
                    const ny = Math.min(Math.max(my + dy, 0), maskH - 1);
                    const nl = labels[ny * maskW + nx];
                    if (nl > 0) return nl;
                }
            }
            return 0;
        };

        const inMaskAt = (px, py) => {
            if (px < 0 || px >= w || py < 0 || py >= h) return false;
            if (hasMask) return getMaskWeightAtBilinear(this.maskObj, px, py, w, h) >= 0.5;
            return Math.hypot(px - mcx, py - mcy) < holeR;
        };

        const isCircleWallAt = (px, py) => {
            return inMaskAt(px, py) && !inMaskAt(px - sx, py - sy);
        };

        const maskData = hasMask ? this.maskObj.data : null;

        let rgb = { r: 255, g: 255, b: 255 };
        const colorStr = this.borderColor || '#ffffff';
        const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
            rgb = {
                r: parseInt(hexMatch[1], 16),
                g: parseInt(hexMatch[2], 16),
                b: parseInt(hexMatch[3], 16)
            };
        }

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;

                if (this.mode === 'border') {
                    const isInsideMask = inMaskAt(x, y);
                    if (!isInsideMask) {
                        data[dstIdx] = copyData[dstIdx];
                        data[dstIdx + 1] = copyData[dstIdx + 1];
                        data[dstIdx + 2] = copyData[dstIdx + 2];
                        data[dstIdx + 3] = copyData[dstIdx + 3];
                        continue;
                    }

                    let z = 0;
                    let compMcx = mcx;
                    let compMcy = mcy;
                    let compRect = holeRect;
                    let compShape = this.holeMaskShape || 'circle';

                    if (hasMask) {
                        const k = getCompIdxAt(x, y);
                        if (k > 0 && components[k]) {
                            const comp = components[k];
                            compMcx = comp.mcx;
                            compMcy = comp.mcy;
                            compRect = comp.holeRect;
                            compShape = comp.shape;
                        } else if (components[1]) {
                            const comp = components[1];
                            compMcx = comp.mcx;
                            compMcy = comp.mcy;
                            compRect = comp.holeRect;
                            compShape = comp.shape;
                        }
                    }

                    const T = Math.max(2, this.borderThickness ?? 4);

                    let normX = x - compMcx;
                    let normY = y - compMcy;

                    // Unified pixel-perfect distance calculation using VDT
                    if (gx && gy) {
                        const mx = Math.floor((x / w) * maskW);
                        const my = Math.floor((y / h) * maskH);
                        const safeX = Math.min(Math.max(mx, 0), maskW - 1);
                        const safeY = Math.min(Math.max(my, 0), maskH - 1);
                        const idx = safeY * maskW + safeX;
                        
                        const bx = gx[idx];
                        const by = gy[idx];
                        if (bx !== -1) {
                            const bxOrig = (bx / maskW) * w;
                            const byOrig = (by / maskH) * h;
                            z = Math.hypot(x - bxOrig, y - byOrig);
                            normX = x - bxOrig;
                            normY = y - byOrig;
                        } else {
                            z = 1e9;
                        }
                    } else {
                        z = 1e9;
                    }

                    if (z > T) {
                        data[dstIdx] = 0;
                        data[dstIdx + 1] = 0;
                        data[dstIdx + 2] = 0;
                        data[dstIdx + 3] = 0;
                        continue;
                    }

                    const t = z / T;
                    const angle = Math.atan2(y - compMcy, x - compMcx);
                    const radius = (compRect.maxX - compRect.minX + compRect.maxY - compRect.minY) / 4 || 50;
                    const shape = this.borderShape || 'solid';

                    let finalR = rgb.r, finalG = rgb.g, finalB = rgb.b, finalA = 255;
                    let drawBorderPixel = true;
                    const Lx = -0.577, Ly = -0.577, Lz = 0.577;

                    if (shape === 'solid') {
                        finalR = rgb.r;
                        finalG = rgb.g;
                        finalB = rgb.b;
                        finalA = 255;
                    } else if (shape === 'hoop') {
                        const len = Math.hypot(normX, normY) || 1;
                        const nz = 1 - 2 * t;
                        const sinPhi = nz, cosPhi = Math.sqrt(Math.max(0, 1 - sinPhi * sinPhi));
                        const Nx = -(normX / len) * sinPhi, Ny = -(normY / len) * sinPhi, Nz = cosPhi;
                        const dotNL = Nx * Lx + Ny * Ly + Nz * Lz;
                        const diffuse = Math.max(0, dotNL);
                        const Rz = 2 * dotNL * Nz - Lz;
                        const specular = Math.pow(Math.max(0, Rz), 16);
                        finalR = Math.min(255, rgb.r * (0.35 + 0.65 * diffuse) + 255 * 0.45 * specular);
                        finalG = Math.min(255, rgb.g * (0.35 + 0.65 * diffuse) + 255 * 0.45 * specular);
                        finalB = Math.min(255, rgb.b * (0.35 + 0.65 * diffuse) + 255 * 0.45 * specular);
                    } else if (shape === 'sawtooth') {
                        const teethCount = Math.max(8, Math.round((2 * Math.PI * radius) / 20));
                        const wave = Math.sin(angle * teethCount);
                        const A = Math.min(8, T * 0.35);
                        const zEff = z + A * wave;
                        if (zEff < 0) {
                            drawBorderPixel = false;
                        } else if (zEff > T) {
                            data[dstIdx] = 0;
                            data[dstIdx + 1] = 0;
                            data[dstIdx + 2] = 0;
                            data[dstIdx + 3] = 0;
                            continue;
                        } else {
                            const tEff = zEff / T;
                            const len = Math.hypot(normX, normY) || 1;
                            const nx = normX / len, ny = normY / len;
                            const tx = -ny, ty = nx;
                            const waveSlope = A * (teethCount / radius) * Math.cos(angle * teethCount);
                            const nz = 1 - 2 * tEff;
                            const Nx = -nx * nz + tx * waveSlope * 0.5, Ny = -ny * nz + ty * waveSlope * 0.5;
                            const Nz = Math.sqrt(Math.max(0.1, 1 - (Nx * Nx + Ny * Ny)));
                            const nLen = Math.hypot(Nx, Ny, Nz);
                            const dotNL = (Nx / nLen) * Lx + (Ny / nLen) * Ly + (Nz / nLen) * Lz;
                            const diffuse = Math.max(0, dotNL);
                            const Rz = 2 * dotNL * (Nz / nLen) - Lz;
                            const specular = Math.pow(Math.max(0, Rz), 8);
                            finalR = Math.min(255, rgb.r * (0.4 + 0.6 * diffuse) + 255 * 0.25 * specular);
                            finalG = Math.min(255, rgb.g * (0.4 + 0.6 * diffuse) + 255 * 0.25 * specular);
                            finalB = Math.min(255, rgb.b * (0.4 + 0.6 * diffuse) + 255 * 0.25 * specular);
                        }
                    } else if (shape === 'frame') {
                        const len = Math.hypot(normX, normY) || 1;
                        const nx = normX / len, ny = normY / len;

                        let nz = 0;
                        let specAmt = 0.2;
                        if (t < 0.25) {
                            nz = -1.0 + 0.8 * (t / 0.25);
                        } else if (t < 0.35) {
                            nz = 1.5;
                        } else if (t < 0.7) {
                            nz = -0.2;
                        } else if (t < 0.85) {
                            const beadT = (t - 0.7) / 0.15;
                            nz = -Math.cos(beadT * Math.PI);
                            specAmt = 0.4;
                        } else {
                            nz = 1.2;
                        }

                        const Nx = -nx * nz, Ny = -ny * nz, Nz = 1.0;
                        const nLen = Math.hypot(Nx, Ny, Nz);
                        const sNx = Nx / nLen, sNy = Ny / nLen, sNz = Nz / nLen;

                        const dotNL = sNx * Lx + sNy * Ly + sNz * Lz;
                        const diffuse = Math.max(0, dotNL);
                        const Rz = 2 * dotNL * sNz - Lz;
                        const specular = Math.pow(Math.max(0, Rz), 12);

                        finalR = Math.min(255, rgb.r * (0.35 + 0.65 * diffuse) + 255 * specAmt * specular);
                        finalG = Math.min(255, rgb.g * (0.35 + 0.65 * diffuse) + 255 * specAmt * specular);
                        finalB = Math.min(255, rgb.b * (0.35 + 0.65 * diffuse) + 255 * specAmt * specular);
                    } else if (shape === 'dots') {
                        const spacing = T * 0.9;
                        const perimeter = 2 * Math.PI * radius;
                        const numDots = Math.max(8, Math.round(perimeter / spacing));
                        const angleStep = (2 * Math.PI) / numDots;

                        const kFloat = angle / angleStep;
                        const k1 = Math.floor(kFloat);
                        const k2 = Math.ceil(kFloat);

                        let insideDot = false;
                        let dotDist = 1e9;
                        let r_dot = 0;
                        let theta_k_match = 0;

                        [k1, k2].forEach(k => {
                            const theta_k = k * angleStep;
                            const radCenter = T / 2;
                            const dz = z - radCenter;

                            let dTheta = angle - theta_k;
                            while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
                            while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
                            const ds = dTheta * (radius + radCenter);

                            const dist = Math.hypot(dz, ds);
                            const isEven = (k % 2 === 0);
                            const r_dot_temp = T * (isEven ? 0.45 : 0.28);

                            if (dist <= r_dot_temp && dist < dotDist) {
                                insideDot = true;
                                dotDist = dist;
                                r_dot = r_dot_temp;
                                theta_k_match = theta_k;
                            }
                        });

                        if (!insideDot) {
                            drawBorderPixel = false;
                        } else {
                            const radCenter = T / 2;
                            const dz = z - radCenter;
                            let dTheta = angle - theta_k_match;
                            while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
                            while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
                            const ds = dTheta * (radius + radCenter);

                            const len = Math.hypot(normX, normY) || 1;
                            const radialX = normX / len;
                            const radialY = normY / len;
                            const tangentX = -radialY;
                            const tangentY = radialX;

                            const dx = (dz / r_dot) * radialX + (ds / r_dot) * tangentX;
                            const dy = (dz / r_dot) * radialY + (ds / r_dot) * tangentY;
                            const dzNormal = Math.sqrt(Math.max(0, 1 - (dx * dx + dy * dy)));

                            const Nx = dx, Ny = dy, Nz = dzNormal;
                            const dotNL = Nx * Lx + Ny * Ly + Nz * Lz;
                            const diffuse = Math.max(0, dotNL);
                            const Rz = 2 * dotNL * Nz - Lz;
                            const specular = Math.pow(Math.max(0, Rz), 16);

                            finalR = Math.min(255, rgb.r * (0.35 + 0.65 * diffuse) + 255 * 0.4 * specular);
                            finalG = Math.min(255, rgb.g * (0.35 + 0.65 * diffuse) + 255 * 0.4 * specular);
                            finalB = Math.min(255, rgb.b * (0.35 + 0.65 * diffuse) + 255 * 0.4 * specular);
                        }
                    }

                    if (drawBorderPixel) {
                        data[dstIdx] = finalR;
                        data[dstIdx + 1] = finalG;
                        data[dstIdx + 2] = finalB;
                        data[dstIdx + 3] = finalA;
                    }
                    continue;
                }

                if (!inMaskAt(x, y)) {
                    data[dstIdx] = copyData[dstIdx];
                    data[dstIdx + 1] = copyData[dstIdx + 1];
                    data[dstIdx + 2] = copyData[dstIdx + 2];
                    data[dstIdx + 3] = copyData[dstIdx + 3];
                    continue;
                }

                let compUseRectWall = useRectWall;
                let compRect = holeRect;
                let compRectMetrics = rectBrickMetrics;
                let compMcx = mcx;
                let compMcy = mcy;
                let compCircleMetrics = circleBrickMetrics;

                if (hasMask) {
                    const k = getCompIdxAt(x, y);
                    if (k > 0 && components[k]) {
                        const comp = components[k];
                        compUseRectWall = comp.useRectWall;
                        compRect = comp.holeRect;
                        compRectMetrics = comp.rectBrickMetrics;
                        compMcx = comp.mcx;
                        compMcy = comp.mcy;
                        compCircleMetrics = comp.circleBrickMetrics;
                    } else if (components[1]) {
                        const comp = components[1];
                        compUseRectWall = comp.useRectWall;
                        compRect = comp.holeRect;
                        compRectMetrics = comp.rectBrickMetrics;
                        compMcx = comp.mcx;
                        compMcy = comp.mcy;
                        compCircleMetrics = comp.circleBrickMetrics;
                    }
                }

                if (compUseRectWall) {
                    const bc = getRectWallBrickCoords(x, y, compRect, wallTh, viewAngle);
                    if (bc) {
                        if (bc.miterEdge) {
                            data[dstIdx] = 165;
                            data[dstIdx + 1] = 158;
                            data[dstIdx + 2] = 152;
                            data[dstIdx + 3] = 255;
                        } else {
                            paintHoleBrickPixel(data, dstIdx, bc.u, bc.z, bc.hitT, this.vignette, compRectMetrics);
                        }
                    } else {
                        data[dstIdx] = 0;
                        data[dstIdx + 1] = 0;
                        data[dstIdx + 2] = 0;
                        data[dstIdx + 3] = 0;
                    }
                    continue;
                }

                if (!isCircleWallAt(x, y)) {
                    data[dstIdx] = 0;
                    data[dstIdx + 1] = 0;
                    data[dstIdx + 2] = 0;
                    data[dstIdx + 3] = 0;
                    continue;
                }

                const { inNx, inNy, perpX, perpY } = getCircleWallBrickDirs(x, y, compMcx, compMcy, this.maskObj, w, h);
                let hitT_from_outer = 1;
                for (let step = 1; step <= steps; step++) {
                    const t = step / steps;
                    const px = Math.round(x - t * sx);
                    const py = Math.round(y - t * sy);
                    if (!inMaskAt(px, py)) {
                        hitT_from_outer = t;
                        break;
                    }
                }
                const hitT = 1 - hitT_from_outer;
                const u = x * perpX + y * perpY;
                const z = hitT_from_outer * wallTh;
                paintHoleBrickPixel(data, dstIdx, u, z, hitT, this.vignette, compCircleMetrics);
            }
        }
    }
});

let tabImgElement = null;
function getTabImage() {
    if (tabImgElement) return tabImgElement;
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(35, 50);
    ctx.bezierCurveTo(35, 30, 20, 25, 20, 16);
    ctx.bezierCurveTo(20, -2, 80, -2, 80, 16);
    ctx.bezierCurveTo(80, 25, 65, 30, 65, 50);
    ctx.closePath();
    ctx.fill();
    tabImgElement = canvas;
    return tabImgElement;
}

function drawTabOnEdge(ctx, edge, type, cellW, cellH, padW, padH, tabImg) {
    if (type === 0) return;
    ctx.save();
    
    if (edge === 'top') {
        ctx.translate(padW + cellW / 2, padH);
    } else if (edge === 'right') {
        ctx.translate(padW + cellW, padH + cellH / 2);
        ctx.rotate(Math.PI / 2);
    } else if (edge === 'bottom') {
        ctx.translate(padW + cellW / 2, padH + cellH);
        ctx.rotate(Math.PI);
    } else if (edge === 'left') {
        ctx.translate(padW, padH + cellH / 2);
        ctx.rotate(-Math.PI / 2);
    }
    
    const tabW = cellW * 0.32;
    const tabH = cellH * 0.20;
    const overlap = 1.5;
    
    if (type === -1) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.scale(1, -1);
        ctx.drawImage(tabImg, -tabW / 2, -tabH - overlap, tabW, tabH + overlap * 2);
    } else if (type === 1) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tabImg, -tabW / 2, -tabH - overlap, tabW, tabH + overlap * 2);
    }
    
    ctx.restore();
}

function tracePiecePath(ctx, cellW, cellH, top, right, bottom, left) {
    ctx.beginPath();
    ctx.moveTo(-cellW / 2, -cellH / 2);
    
    const drawEdge = (edge, type) => {
        const len = (edge === 'top' || edge === 'bottom') ? cellW : cellH;
        if (type === 0) {
            if (edge === 'top') ctx.lineTo(cellW / 2, -cellH / 2);
            else if (edge === 'right') ctx.lineTo(cellW / 2, cellH / 2);
            else if (edge === 'bottom') ctx.lineTo(-cellW / 2, cellH / 2);
            else if (edge === 'left') ctx.lineTo(-cellW / 2, -cellH / 2);
            return;
        }
        
        ctx.save();
        if (edge === 'top') {
            ctx.translate(0, -cellH / 2);
        } else if (edge === 'right') {
            ctx.translate(cellW / 2, 0);
            ctx.rotate(Math.PI / 2);
        } else if (edge === 'bottom') {
            ctx.translate(0, cellH / 2);
            ctx.rotate(Math.PI);
        } else if (edge === 'left') {
            ctx.translate(-cellW / 2, 0);
            ctx.rotate(-Math.PI / 2);
        }
        
        const tabW = cellW * 0.32;
        const tabH = cellH * 0.20;
        
        ctx.lineTo(-tabW / 2, 0);
        if (type === 1) {
            ctx.bezierCurveTo(-tabW / 2, -tabH * 0.4, -tabW * 0.4, -tabH * 0.5, -tabW * 0.4, -tabH * 0.68);
            ctx.bezierCurveTo(-tabW * 0.4, -tabH * 1.04, tabW * 0.4, -tabH * 1.04, tabW * 0.4, -tabH * 0.68);
            ctx.bezierCurveTo(tabW * 0.4, -tabH * 0.5, tabW / 2, -tabH * 0.4, tabW / 2, 0);
        } else {
            ctx.bezierCurveTo(-tabW / 2, tabH * 0.4, -tabW * 0.4, tabH * 0.5, -tabW * 0.4, tabH * 0.68);
            ctx.bezierCurveTo(-tabW * 0.4, tabH * 1.04, tabW * 0.4, tabH * 1.04, tabW * 0.4, tabH * 0.68);
            ctx.bezierCurveTo(tabW * 0.4, tabH * 0.5, tabW / 2, tabH * 0.4, tabW / 2, 0);
        }
        ctx.lineTo(len / 2, 0);
        ctx.restore();
    };
    
    drawEdge('top', top);
    drawEdge('right', right);
    drawEdge('bottom', bottom);
    drawEdge('left', left);
    ctx.closePath();
}

fabric.Image.filters.PuzzleShuffle = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PuzzleShuffle',
    amount: 0,
    cols: 10,
    rows: 10,
    rotate: 0.15,
    borderWidth: 4,
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

        const origCanvas = document.createElement('canvas');
        origCanvas.width = w;
        origCanvas.height = h;
        const origCtx = origCanvas.getContext('2d');
        origCtx.putImageData(options.imageData, 0, 0);

        const puzzleCanvas = document.createElement('canvas');
        puzzleCanvas.width = w;
        puzzleCanvas.height = h;
        const puzzleCtx = puzzleCanvas.getContext('2d');
        
        const hEdges = Array.from({ length: rows + 1 }, () => new Int8Array(cols));
        const vEdges = Array.from({ length: rows }, () => new Int8Array(cols + 1));

        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 || r === rows) {
                    hEdges[r][c] = 0;
                } else {
                    const hash = (r * 37 + c * 17) % 2;
                    hEdges[r][c] = hash === 0 ? 1 : -1;
                }
            }
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= cols; c++) {
                if (c === 0 || c === cols) {
                    vEdges[r][c] = 0;
                } else {
                    const hash = (r * 13 + c * 29) % 2;
                    vEdges[r][c] = hash === 0 ? 1 : -1;
                }
            }
        }

        let hasMask = false;
        let minX = w, maxX = 0, minY = h, maxY = 0;
        
        if (this.maskObj?.data) {
            const mw = this.maskObj.width;
            const mh = this.maskObj.height;
            for (let my = 0; my < mh; my++) {
                for (let mx = 0; mx < mw; mx++) {
                    const idx = (my * mw + mx) * 4;
                    if (this.maskObj.data[idx] > 128) {
                        const rx = (mx / mw) * w;
                        const ry = (my / mh) * h;
                        if (rx < minX) minX = rx;
                        if (rx > maxX) maxX = rx;
                        if (ry < minY) minY = ry;
                        if (ry > maxY) maxY = ry;
                        hasMask = true;
                    }
                }
            }
        }

        const cellStates = Array.from({ length: rows }, () => Array(cols).fill(null));
        const boundaryCells = [];
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        if (hasMask) {
            const cLeft = Math.max(0, Math.min(cols - 1, Math.floor(minX / cellW)));
            const cRight = Math.max(0, Math.min(cols - 1, Math.floor(maxX / cellW)));
            const rTop = Math.max(0, Math.min(rows - 1, Math.floor(minY / cellH)));
            const rBottom = Math.max(0, Math.min(rows - 1, Math.floor(maxY / cellH)));

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * cellW;
                    const y = r * cellH;
                    
                    const isOutside = (x + cellW <= minX || x >= maxX || y + cellH <= minY || y >= maxY);
                    
                    if (isOutside) {
                        cellStates[r][c] = { type: 'outside' };
                    } else {
                        const isCornerCell = (
                            (r === rTop && c === cLeft) ||
                            (r === rTop && c === cRight) ||
                            (r === rBottom && c === cLeft) ||
                            (r === rBottom && c === cRight)
                        );
                        
                        const isImageBorderCell = (
                            r === 0 ||
                            r === rows - 1 ||
                            c === 0 ||
                            c === cols - 1
                        );

                        if (isCornerCell || isImageBorderCell) {
                            cellStates[r][c] = { type: 'inside' };
                        } else {
                            const touchesBoundary = (
                                (x <= minX && x + cellW >= minX) ||
                                (x <= maxX && x + cellW >= maxX) ||
                                (y <= minY && y + cellH >= minY) ||
                                (y <= maxY && y + cellH >= maxY)
                            );
                            
                            if (touchesBoundary) {
                                cellStates[r][c] = { type: 'boundary' };
                                const cx = (c + 0.5) * cellW;
                                const cy = (r + 0.5) * cellH;
                                const angle = Math.atan2(cy - centerY, cx - centerX);
                                boundaryCells.push({ r, c, cx, cy, angle });
                            } else {
                                cellStates[r][c] = { type: 'inside' };
                            }
                        }
                    }
                }
            }

            boundaryCells.sort((a, b) => a.angle - b.angle);
            const N = boundaryCells.length;
            const pulledSet = new Set();
            const adjacentSet = new Set();

            for (let i = 0; i < N; i += 7) {
                const groupSize = Math.min(7, N - i);
                if (groupSize >= 3) {
                    const baseCell = boundaryCells[i];
                    const hash = (baseCell.r * 113 + baseCell.c * 233) % groupSize;
                    const pIdx = i + hash;
                    const pulledCell = boundaryCells[pIdx];
                    pulledSet.add(`${pulledCell.r},${pulledCell.c}`);

                    const prevIdx = (pIdx - 1 + N) % N;
                    const nextIdx = (pIdx + 1) % N;
                    
                    const prevCell = boundaryCells[prevIdx];
                    const nextCell = boundaryCells[nextIdx];

                    const distPrev = Math.abs(prevCell.r - pulledCell.r) + Math.abs(prevCell.c - pulledCell.c);
                    if (distPrev <= 2) {
                        adjacentSet.add(`${prevCell.r},${prevCell.c}`);
                        prevCell.pulledCx = pulledCell.cx;
                        prevCell.pulledCy = pulledCell.cy;
                    }
                    const distNext = Math.abs(nextCell.r - pulledCell.r) + Math.abs(nextCell.c - pulledCell.c);
                    if (distNext <= 2) {
                        adjacentSet.add(`${nextCell.r},${nextCell.c}`);
                        nextCell.pulledCx = pulledCell.cx;
                        nextCell.pulledCy = pulledCell.cy;
                    }
                }
            }

            for (let i = 0; i < N; i++) {
                const cell = boundaryCells[i];
                const key = `${cell.r},${cell.c}`;
                const cellState = cellStates[cell.r][cell.c];
                if (pulledSet.has(key)) {
                    cellState.boundaryType = 'pulled';
                } else if (adjacentSet.has(key)) {
                    cellState.boundaryType = 'adjacent';
                    cellState.pulledCx = cell.pulledCx;
                    cellState.pulledCy = cell.pulledCy;
                } else {
                    cellState.boundaryType = 'normal';
                }
            }
        }

        const padW = cellW * 0.35;
        const padH = cellH * 0.35;
        const pieceW = cellW + 2 * padW;
        const pieceH = cellH + 2 * padH;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const state = hasMask ? cellStates[r][c] : { type: 'outside' };
                
                if (hasMask && (state.type === 'inside' || state.type === 'boundary')) {
                    continue;
                }
                
                const x = c * cellW;
                const y = r * cellH;
                const top = hEdges[r][c];
                const right = vEdges[r][c + 1];
                const bottom = -hEdges[r + 1][c];
                const left = -vEdges[r][c];

                let cx = x + cellW * 0.5;
                let cy = y + cellH * 0.5;
                let rot = 0;

                if (hasMask && state.type === 'boundary') {
                    const hash = (r * 17 + c * 31) % 97;
                    const baseRot = ((hash % 5) - 2) * this.rotate * amt;
                    
                    if (state.boundaryType === 'pulled') {
                        rot = baseRot;
                        const dx = centerX - cx;
                        const dy = centerY - cy;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const dirX = dx / dist;
                        const dirY = dy / dist;
                        
                        const shiftDist = ((cellW + cellH) / 2) * (1.1 + (hash % 3) * 0.2);
                        cx += dirX * shiftDist;
                        cy += dirY * shiftDist;
                    } else if (state.boundaryType === 'adjacent') {
                        rot = baseRot * 0.5;
                        
                        const bDx = cx - state.pulledCx;
                        const bDy = cy - state.pulledCy;
                        const bDist = Math.sqrt(bDx * bDx + bDy * bDy) || 1;
                        const bDirX = bDx / bDist;
                        const bDirY = bDy / bDist;
                        
                        const inDx = centerX - cx;
                        const inDy = centerY - cy;
                        const inDist = Math.sqrt(inDx * inDx + inDy * inDy) || 1;
                        const inDirX = inDx / inDist;
                        const inDirY = inDy / inDist;
                        
                        const shiftAlongBoundary = ((cellW + cellH) / 2) * 0.22;
                        const shiftInwards = ((cellW + cellH) / 2) * 0.35;
                        
                        cx += bDirX * shiftAlongBoundary + inDirX * shiftInwards;
                        cy += bDirY * shiftAlongBoundary + inDirY * shiftInwards;
                    } else {
                        rot = 0;
                    }
                } else {
                    rot = 0;
                }

                const pieceMaskCanvas = document.createElement('canvas');
                pieceMaskCanvas.width = pieceW;
                pieceMaskCanvas.height = pieceH;
                const pmCtx = pieceMaskCanvas.getContext('2d');

                pmCtx.save();
                pmCtx.translate(padW + cellW / 2, padH + cellH / 2);
                tracePiecePath(pmCtx, cellW, cellH, top, right, bottom, left);
                pmCtx.fillStyle = 'white';
                pmCtx.fill();
                pmCtx.restore();

                const pieceCanvas = document.createElement('canvas');
                pieceCanvas.width = pieceW;
                pieceCanvas.height = pieceH;
                const pCtx = pieceCanvas.getContext('2d');

                pCtx.drawImage(origCanvas, x - padW, y - padH, pieceW, pieceH, 0, 0, pieceW, pieceH);

                pCtx.globalCompositeOperation = 'destination-in';
                pCtx.drawImage(pieceMaskCanvas, 0, 0);

                puzzleCtx.save();
                puzzleCtx.translate(cx, cy);
                if (rot !== 0) {
                    puzzleCtx.rotate(rot);
                }
                
                puzzleCtx.drawImage(pieceCanvas, -pieceW / 2, -pieceH / 2);

                tracePiecePath(puzzleCtx, cellW, cellH, top, right, bottom, left);
                
                puzzleCtx.strokeStyle = 'white';
                puzzleCtx.lineWidth = this.borderWidth || 4;
                puzzleCtx.lineJoin = 'round';
                puzzleCtx.lineCap = 'round';
                puzzleCtx.stroke();

                puzzleCtx.restore();
            }
        }

        const puzzleData = puzzleCtx.getImageData(0, 0, w, h).data;
        for (let i = 0; i < w * h * 4; i++) {
            data[i] = puzzleData[i];
        }
    }
});

function cleanupPuzzlePieces(canvas) {
    if (!canvas) return;
    const toRemove = canvas.getObjects().filter(o => o._isPuzzlePiece);
    toRemove.forEach(o => canvas.remove(o));
}

function generatePuzzleObjects(obj) {
    const canvas = window.canvas;
    if (!canvas || !obj || obj.type !== 'image') return;
    
    // Clean up old pieces first
    cleanupPuzzlePieces(canvas);
    
    // Bind object:removed event listener once
    if (!canvas._puzzleEventRegistered) {
        canvas._puzzleEventRegistered = true;
        canvas.on('object:removed', (e) => {
            const removedObj = e.target;
            if (removedObj && !removedObj._isPuzzlePiece && removedObj.retroSettings?.activeFxId === 9) {
                cleanupPuzzlePieces(canvas);
            }
        });
    }

    // Only generate pieces if the effect is active and started
    if (!window.isRetroEffectStarted(obj)) {
        obj.set({ selectable: true });
        return;
    }
    
    const settings = obj.retroSettings;
    const cols = Math.max(2, Math.round(settings.cols || 10));
    const rows = Math.max(2, Math.round(settings.rows || 10));
    const rotateVal = settings.rotate || 0.15;
    const borderWidth = settings.borderWidth || 4;
    const amount = settings.amount || 0;
    
    if (amount < 0.001) return;
    
    // Temporarily make parent image unselectable
    obj.set({ selectable: false });
    
    const source = window.ensureFabricOriginalElement(obj);
    if (!source) return;
    
    const w = source.width || source.videoWidth || obj.width;
    const h = source.height || source.videoHeight || obj.height;
    const scaleFactorX = obj.width / w;
    const scaleFactorY = obj.height / h;
    
    const cellW = w / cols;
    const cellH = h / rows;
    
    // Determine edges
    const hEdges = Array.from({ length: rows + 1 }, () => new Int8Array(cols));
    const vEdges = Array.from({ length: rows }, () => new Int8Array(cols + 1));

    for (let r = 0; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (r === 0 || r === rows) {
                hEdges[r][c] = 0;
            } else {
                const hash = (r * 37 + c * 17) % 2;
                hEdges[r][c] = hash === 0 ? 1 : -1;
            }
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols; c++) {
            if (c === 0 || c === cols) {
                vEdges[r][c] = 0;
            } else {
                const hash = (r * 13 + c * 29) % 2;
                vEdges[r][c] = hash === 0 ? 1 : -1;
            }
        }
    }

    // Determine mask and bounds
    let hasMask = false;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    const maskObj = settings.maskObj;
    
    if (maskObj?.data) {
        const mw = maskObj.width;
        const mh = maskObj.height;
        for (let my = 0; my < mh; my++) {
            for (let mx = 0; mx < mw; mx++) {
                const idx = (my * mw + mx) * 4;
                if (maskObj.data[idx] > 128) {
                    const rx = (mx / mw) * w;
                    const ry = (my / mh) * h;
                    if (rx < minX) minX = rx;
                    if (rx > maxX) maxX = rx;
                    if (ry < minY) minY = ry;
                    if (ry > maxY) maxY = ry;
                    hasMask = true;
                }
            }
        }
    }

    // Set parent image opacity
    if (!hasMask) {
        obj.set({ opacity: 0.0 });
    } else {
        obj.set({ opacity: 1.0 });
    }
    
    const cellStates = Array.from({ length: rows }, () => Array(cols).fill(null));
    const boundaryCells = [];
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    if (hasMask) {
        const cLeft = Math.max(0, Math.min(cols - 1, Math.floor(minX / cellW)));
        const cRight = Math.max(0, Math.min(cols - 1, Math.floor(maxX / cellW)));
        const rTop = Math.max(0, Math.min(rows - 1, Math.floor(minY / cellH)));
        const rBottom = Math.max(0, Math.min(rows - 1, Math.floor(maxY / cellH)));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * cellW;
                const y = r * cellH;
                const isOutside = (x + cellW <= minX || x >= maxX || y + cellH <= minY || y >= maxY);
                
                if (isOutside) {
                    cellStates[r][c] = { type: 'outside' };
                } else {
                    const isCornerCell = (
                        (r === rTop && c === cLeft) ||
                        (r === rTop && c === cRight) ||
                        (r === rBottom && c === cLeft) ||
                        (r === rBottom && c === cRight)
                    );
                    
                    const isImageBorderCell = (
                        r === 0 ||
                        r === rows - 1 ||
                        c === 0 ||
                        c === cols - 1
                    );

                    if (isCornerCell || isImageBorderCell) {
                        cellStates[r][c] = { type: 'inside' };
                    } else {
                        const touchesBoundary = (
                            (x <= minX && x + cellW >= minX) ||
                            (x <= maxX && x + cellW >= maxX) ||
                            (y <= minY && y + cellH >= minY) ||
                            (y <= maxY && y + cellH >= maxY)
                        );
                        
                        if (touchesBoundary) {
                            cellStates[r][c] = { type: 'boundary' };
                            const cx = (c + 0.5) * cellW;
                            const cy = (r + 0.5) * cellH;
                            const angle = Math.atan2(cy - centerY, cx - centerX);
                            boundaryCells.push({ r, c, cx, cy, angle });
                        } else {
                            cellStates[r][c] = { type: 'inside' };
                        }
                    }
                }
            }
        }

        boundaryCells.sort((a, b) => a.angle - b.angle);
        const N = boundaryCells.length;
        const pulledSet = new Set();
        const adjacentSet = new Set();

        for (let i = 0; i < N; i += 7) {
            const groupSize = Math.min(7, N - i);
            if (groupSize >= 3) {
                const baseCell = boundaryCells[i];
                const hash = (baseCell.r * 113 + baseCell.c * 233) % groupSize;
                const pIdx = i + hash;
                const pulledCell = boundaryCells[pIdx];
                pulledSet.add(`${pulledCell.r},${pulledCell.c}`);

                const prevIdx = (pIdx - 1 + N) % N;
                const nextIdx = (pIdx + 1) % N;
                
                const prevCell = boundaryCells[prevIdx];
                const nextCell = boundaryCells[nextIdx];

                const distPrev = Math.abs(prevCell.r - pulledCell.r) + Math.abs(prevCell.c - pulledCell.c);
                if (distPrev <= 2) {
                    adjacentSet.add(`${prevCell.r},${prevCell.c}`);
                    prevCell.pulledCx = pulledCell.cx;
                    prevCell.pulledCy = pulledCell.cy;
                }
                const distNext = Math.abs(nextCell.r - pulledCell.r) + Math.abs(nextCell.c - pulledCell.c);
                if (distNext <= 2) {
                    adjacentSet.add(`${nextCell.r},${nextCell.c}`);
                    nextCell.pulledCx = pulledCell.cx;
                    nextCell.pulledCy = pulledCell.cy;
                }
            }
        }

        for (let i = 0; i < N; i++) {
            const cell = boundaryCells[i];
            const key = `${cell.r},${cell.c}`;
            const cellState = cellStates[cell.r][cell.c];
            if (pulledSet.has(key)) {
                cellState.boundaryType = 'pulled';
            } else if (adjacentSet.has(key)) {
                cellState.boundaryType = 'adjacent';
                cellState.pulledCx = cell.pulledCx;
                cellState.pulledCy = cell.pulledCy;
            } else {
                cellState.boundaryType = 'normal';
            }
        }
    }

    const padW = cellW * 0.35;
    const padH = cellH * 0.35;
    const pieceW = cellW + 2 * padW;
    const pieceH = cellH + 2 * padH;
    const tImg = getTabImage();

    // Create an offscreen canvas
    const origCanvas = document.createElement('canvas');
    origCanvas.width = w;
    origCanvas.height = h;
    const origCtx = origCanvas.getContext('2d');
    if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement || source instanceof HTMLVideoElement) {
        origCtx.drawImage(source, 0, 0, w, h);
    }

    const tm = obj.calcTransformMatrix();
    const parentIdx = canvas.getObjects().indexOf(obj);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const state = hasMask ? cellStates[r][c] : { type: 'boundary', boundaryType: 'normal' };
            
            if (hasMask && state.type !== 'boundary') {
                continue;
            }
            
            const x = c * cellW;
            const y = r * cellH;
            const top = hEdges[r][c];
            const right = vEdges[r][c + 1];
            const bottom = -hEdges[r + 1][c];
            const left = -vEdges[r][c];

            let cx = x + cellW * 0.5;
            let cy = y + cellH * 0.5;
            let rot = 0;

            if (hasMask) {
                const hash = (r * 17 + c * 31) % 97;
                const baseRot = ((hash % 5) - 2) * rotateVal * amount;
                
                if (state.boundaryType === 'pulled') {
                    rot = baseRot;
                    const dx = centerX - cx;
                    const dy = centerY - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    const shiftDist = ((cellW + cellH) / 2) * (1.1 + (hash % 3) * 0.2);
                    cx += dirX * shiftDist;
                    cy += dirY * shiftDist;
                } else if (state.boundaryType === 'adjacent') {
                    rot = baseRot * 0.5;
                    const bDx = cx - state.pulledCx;
                    const bDy = cy - state.pulledCy;
                    const bDist = Math.sqrt(bDx * bDx + bDy * bDy) || 1;
                    const bDirX = bDx / bDist;
                    const bDirY = bDy / bDist;
                    
                    const inDx = centerX - cx;
                    const inDy = centerY - cy;
                    const inDist = Math.sqrt(inDx * inDx + inDy * inDy) || 1;
                    const inDirX = inDx / inDist;
                    const inDirY = inDy / inDist;
                    
                    const shiftAlongBoundary = ((cellW + cellH) / 2) * 0.22;
                    const shiftInwards = ((cellW + cellH) / 2) * 0.35;
                    cx += bDirX * shiftAlongBoundary + inDirX * shiftInwards;
                    cy += bDirY * shiftAlongBoundary + inDirY * shiftInwards;
                }
            } else {
                rot = 0;
            }

            // Create piece canvas
            const pieceCanvas = document.createElement('canvas');
            pieceCanvas.width = pieceW;
            pieceCanvas.height = pieceH;
            const pCtx = pieceCanvas.getContext('2d');

            pCtx.drawImage(origCanvas, x - padW, y - padH, pieceW, pieceH, 0, 0, pieceW, pieceH);

            const pieceMaskCanvas = document.createElement('canvas');
            pieceMaskCanvas.width = pieceW;
            pieceMaskCanvas.height = pieceH;
            const pmCtx = pieceMaskCanvas.getContext('2d');

            pmCtx.save();
            pmCtx.translate(padW + cellW / 2, padH + cellH / 2);
            tracePiecePath(pmCtx, cellW, cellH, top, right, bottom, left);
            pmCtx.fillStyle = 'white';
            pmCtx.fill();
            pmCtx.restore();

            pCtx.globalCompositeOperation = 'destination-in';
            pCtx.drawImage(pieceMaskCanvas, 0, 0);

            pCtx.globalCompositeOperation = 'source-over';
            pCtx.save();
            pCtx.translate(pieceW / 2, pieceH / 2);
            tracePiecePath(pCtx, cellW, cellH, top, right, bottom, left);
            pCtx.strokeStyle = 'white';
            pCtx.lineWidth = borderWidth;
            pCtx.lineJoin = 'round';
            pCtx.lineCap = 'round';
            pCtx.stroke();
            pCtx.restore();

            const localX = (cx - w * 0.5) * scaleFactorX;
            const localY = (cy - h * 0.5) * scaleFactorY;
            const canvasPoint = fabric.util.transformPoint(new fabric.Point(localX, localY), tm);

            const imgPiece = new fabric.Image(pieceCanvas, {
                left: canvasPoint.x,
                top: canvasPoint.y,
                scaleX: obj.scaleX * scaleFactorX,
                scaleY: obj.scaleY * scaleFactorY,
                flipX: obj.flipX,
                flipY: obj.flipY,
                angle: obj.angle + rot * (180 / Math.PI),
                originX: 'center',
                originY: 'center',
                selectable: true,
                hasControls: false,
                hasBorders: true,
                borderColor: '#00bcd4',
                borderScaleFactor: 2,
                perPixelTargetFind: true,
                _isPuzzlePiece: true,
                _parentImageId: obj.id || obj.uid
            });

            canvas.add(imgPiece);
        }
    }

    if (parentIdx >= 0) {
        const pieces = canvas.getObjects().filter(o => o._isPuzzlePiece);
        pieces.forEach((piece, idx) => {
            piece.moveTo(parentIdx + 1 + idx);
        });
    }

    canvas.requestRenderAll();
}

const SCROLL_ROLL_DIRS = ['left', 'right', 'top', 'bottom'];

function mapScrollRollPixel(x, y, w, h, amount, rollWidth, direction) {
    const R = Math.max(2, rollWidth);
    const dim = direction === 'left' || direction === 'right' ? w : h;
    const maxCurl = amount * dim * 0.95;
    if (amount <= 0.001 || maxCurl <= 1) {
        return { sx: x, sy: y, mode: 'front', shade: 1 };
    }

    if (direction === 'right') {
        const line = w - maxCurl;
        if (x < line) return { sx: x, sy: y, mode: 'front', shade: 1 };
        const d = x - line;
        const theta = d / R;
        if (theta <= Math.PI * 0.5) {
            const curlShade = 0.35 + 0.65 * Math.cos(theta);
            return { sx: line + R * Math.sin(theta), sy: y, mode: 'front', shade: curlShade * (1 - (d / maxCurl) * 0.2) };
        }
        if (theta <= Math.PI) {
            const t = (theta - Math.PI * 0.5) / (Math.PI * 0.5);
            return { sx: x, sy: y, mode: 'back', shade: 0.45 + t * 0.45 };
        }
        return { sx: -1, sy: y, mode: 'hide', shade: 0 };
    }

    if (direction === 'left') {
        const line = maxCurl;
        if (x > line) return { sx: x, sy: y, mode: 'front', shade: 1 };
        const d = line - x;
        const theta = d / R;
        if (theta <= Math.PI * 0.5) {
            const curlShade = 0.35 + 0.65 * Math.cos(theta);
            return { sx: line - R * Math.sin(theta), sy: y, mode: 'front', shade: curlShade * (1 - (d / maxCurl) * 0.2) };
        }
        if (theta <= Math.PI) {
            const t = (theta - Math.PI * 0.5) / (Math.PI * 0.5);
            return { sx: x, sy: y, mode: 'back', shade: 0.45 + t * 0.45 };
        }
        return { sx: -1, sy: y, mode: 'hide', shade: 0 };
    }

    if (direction === 'top') {
        const line = maxCurl;
        if (y > line) return { sx: x, sy: y, mode: 'front', shade: 1 };
        const d = line - y;
        const theta = d / R;
        if (theta <= Math.PI * 0.5) {
            const curlShade = 0.35 + 0.65 * Math.cos(theta);
            return { sx: x, sy: line - R * Math.sin(theta), mode: 'front', shade: curlShade * (1 - (d / maxCurl) * 0.2) };
        }
        if (theta <= Math.PI) {
            const t = (theta - Math.PI * 0.5) / (Math.PI * 0.5);
            return { sx: x, sy: y, mode: 'back', shade: 0.45 + t * 0.45 };
        }
        return { sx: x, sy: -1, mode: 'hide', shade: 0 };
    }

    const line = h - maxCurl;
    if (y < line) return { sx: x, sy: y, mode: 'front', shade: 1 };
    const d = y - line;
    const theta = d / R;
    if (theta <= Math.PI * 0.5) {
        const curlShade = 0.35 + 0.65 * Math.cos(theta);
        return { sx: x, sy: line + R * Math.sin(theta), mode: 'front', shade: curlShade * (1 - (d / maxCurl) * 0.2) };
    }
    if (theta <= Math.PI) {
        const t = (theta - Math.PI * 0.5) / (Math.PI * 0.5);
        return { sx: x, sy: y, mode: 'back', shade: 0.45 + t * 0.45 };
    }
    return { sx: x, sy: -1, mode: 'hide', shade: 0 };
}

function parseScrollRollBackColor(hexColor) {
    const hex = (hexColor || '#e8e0d5').replace('#', '');
    return {
        r: parseInt(hex.substring(0, 2), 16) || 232,
        g: parseInt(hex.substring(2, 4), 16) || 224,
        b: parseInt(hex.substring(4, 6), 16) || 213
    };
}

function getScrollRollAffectedRect(w, h, progress, rollWidth, direction) {
    const dim = direction === 'left' || direction === 'right' ? w : h;
    const maxCurl = progress * dim * 0.95;
    const band = Math.ceil(Math.max(2, rollWidth) * Math.PI) + 2;
    const extent = Math.min(dim, Math.ceil(maxCurl + band));
    if (direction === 'top') return { x0: 0, y0: 0, x1: w, y1: extent };
    if (direction === 'bottom') return { x0: 0, y0: Math.max(0, h - extent), x1: w, y1: h };
    if (direction === 'left') return { x0: 0, y0: 0, x1: extent, y1: h };
    return { x0: Math.max(0, w - extent), y0: 0, x1: w, y1: h };
}

function applyScrollRollToImageData(imageData, settings) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const copyData = new Uint8ClampedArray(data);
    const progress = Math.max(0, Math.min(1, settings.amount || 0));
    if (progress <= 0.001) return;
    const rollWidth = progress * 30;
    const dir = SCROLL_ROLL_DIRS[Math.round(settings.direction) % 4] || 'top';
    const back = parseScrollRollBackColor(settings.backColor);
    const rect = getScrollRollAffectedRect(w, h, progress, rollWidth, dir);

    for (let y = rect.y0; y < rect.y1; y++) {
        for (let x = rect.x0; x < rect.x1; x++) {
            const dstIdx = (y * w + x) * 4;
            const mapped = mapScrollRollPixel(x, y, w, h, progress, rollWidth, dir);
            let r = copyData[dstIdx];
            let g = copyData[dstIdx + 1];
            let b = copyData[dstIdx + 2];
            let a = copyData[dstIdx + 3];

            if (mapped.mode === 'front' && mapped.sx >= 0 && mapped.sy >= 0) {
                const px = sampleBilinear(copyData, w, h, mapped.sx, mapped.sy);
                const shade = mapped.shade;
                r = px[0] * shade;
                g = px[1] * shade;
                b = px[2] * shade;
                a = px[3];
            } else if (mapped.mode === 'back') {
                const shade = mapped.shade;
                r = back.r * shade;
                g = back.g * shade;
                b = back.b * shade;
                a = 255;
            } else if (mapped.mode === 'hide') {
                r = 0;
                g = 0;
                b = 0;
                a = 0;
            }

            data[dstIdx] = r;
            data[dstIdx + 1] = g;
            data[dstIdx + 2] = b;
            data[dstIdx + 3] = a;
        }
    }
}

function isScrollRollEffect10Active(o) {
    return !!(o && o.retroSettings?.activeFxId === 10 && window.isRetroEffectStarted(o));
}

window.cleanupScrollRollEffect10 = function(o) {
    if (!o) return;
    o._scrollRollEffectGen = (o._scrollRollEffectGen || 0) + 1;
    delete o._scrollRollFrameQueued;
    delete o._scrollRollHadEffect;
    const hadFilter = o.filters?.some((f) => f.type === 'ScrollRoll');
    if (hadFilter) {
        o.filters = (o.filters || []).filter((f) => f.type !== 'ScrollRoll');
    }
    if (hadFilter && typeof window.restoreFabricImageFromOriginal === 'function') {
        window.restoreFabricImageFromOriginal(o);
    }
    o._cacheCanvas = null;
    o._cacheContext = null;
    o.dirty = true;
};

function ensureScrollRollFilter10(o) {
    if (!isScrollRollEffect10Active(o)) return null;
    const rs = o.retroSettings || {};
    let f = o.filters?.find((x) => x.type === 'ScrollRoll');
    if (!f) {
        f = new fabric.Image.filters.ScrollRoll({
            amount: rs.amount || 0,
            maxAmount: rs.maxAmount || 0,
            direction: rs.direction ?? 2,
            backColor: rs.backColor || '#e8e0d5'
        });
        o.filters = [f];
    } else {
        f.amount = rs.amount || 0;
        f.maxAmount = rs.maxAmount || 0;
        f.direction = rs.direction ?? 2;
        f.backColor = rs.backColor || '#e8e0d5';
    }
    return f;
}

function applyScrollRollFilter10Now(o) {
    if (!isScrollRollEffect10Active(o)) return;
    if (!ensureScrollRollFilter10(o)) return;
    o.dirty = true;
    window.applyRetroImageFilterNow(o);
}

function queueScrollRollFrame10(o) {
    if (!isScrollRollEffect10Active(o)) return;
    const gen = o._scrollRollEffectGen || 0;
    if (o._scrollRollFrameQueued) return;
    o._scrollRollFrameQueued = true;
    requestAnimationFrame(() => {
        o._scrollRollFrameQueued = false;
        if ((o._scrollRollEffectGen || 0) !== gen) return;
        applyScrollRollFilter10Now(o);
    });
}

fabric.Image.filters.ScrollRoll = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'ScrollRoll',
    amount: 0,
    maxAmount: 0,
    direction: 2,
    backColor: '#e8e0d5',
    applyTo: function(options) {
        applyScrollRollToImageData(options.imageData, {
            amount: this.amount,
            maxAmount: this.maxAmount ?? this.amount,
            direction: this.direction,
            backColor: this.backColor
        });
    }
});

function getPooledWaterProcessRect(maskObj, w, h, pad) {
    const bounds = computeMaskBounds(maskObj);
    if (!bounds) return null;
    const rect = maskBoundsToImageRect(bounds, w, h);
    const p = pad || 0;
    const waterLineY = rect.minY;
    const maxDepth = Math.max(1, rect.maxY - waterLineY);
    return {
        x0: Math.max(0, Math.floor(rect.minX - p)),
        y0: Math.max(0, Math.floor(rect.minY - p)),
        x1: Math.min(w, Math.ceil(rect.maxX + p + 1)),
        y1: Math.min(h, Math.ceil(rect.maxY + p + 1)),
        waterLineY,
        maxDepth
    };
}

/** 수면 근처는 잔잔, 깊어질수록 물결 — 실제 호수 잔물결 분포 근사 */
function computePooledWaterRipple(x, y, phase, ampX, ampY, dist, maxDepth) {
    if (ampX <= 0 && ampY <= 0) return { dx: 0, dy: 0 };
    const depthFade = Math.min(1, Math.max(0, (dist - 2) / Math.max(12, maxDepth * 0.22)));
    const ax = ampX * depthFade;
    const ay = ampY * depthFade;
    if (ax <= 0 && ay <= 0) return { dx: 0, dy: 0 };
    const dx = ax * (
        Math.sin(y * 0.072 + phase) * 0.5 +
        Math.sin(y * 0.023 + phase * 1.63) * 0.32 +
        Math.sin((x + y) * 0.011 + phase * 0.9) * 0.18
    );
    const dy = ay * (
        Math.sin(x * 0.072 + phase * 1.08) * 0.5 +
        Math.sin(x * 0.025 + phase * 0.55) * 0.32 +
        Math.sin((x - y) * 0.012 + phase * 1.4) * 0.18
    );
    return { dx, dy };
}

/**
 * 평면 수면 반영: 수면(waterLineY) 축 거울 뒤집기 (srcY = 2*waterLineY - y) + 물결 변위
 */
function applyPooledWaterToImageData(imageData, settings) {
    const maskObj = settings.maskObj;
    if (!maskObj?.data) return;

    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const copyData = new Uint8ClampedArray(data);
    const ampX = Math.max(0, settings.waveAmpX || 0);
    const ampY = Math.max(0, settings.waveAmpY || 0);
    const phase = settings.phase || 0;
    const boundaryBlend = settings.boundaryBlend ?? 40;
    const tintOpacity = settings.tintOpacity ?? 0.15;
    const hasRipple = ampX > 0.01 || ampY > 0.01;
    const useSoftSample = hasRipple && (ampX + ampY) > 2.5;

    const pad = Math.ceil(Math.max(ampX, ampY)) + 4;
    const proc = getPooledWaterProcessRect(maskObj, w, h, pad);
    if (!proc) return;

    const waterLineY = proc.waterLineY;
    const maxDepth = proc.maxDepth;
    const dim = hasRipple ? 0.985 : 1;

    for (let y = proc.y0; y < proc.y1; y++) {
        for (let x = proc.x0; x < proc.x1; x++) {
            const dstIdx = (y * w + x) * 4;
            const weight = getMaskWeightAt(maskObj, x, y, w, h);
            if (weight <= 0.001) continue;

            const dist = y - waterLineY;
            if (dist <= 0) continue;

            let srcX = x;
            let srcY = 2 * waterLineY - y;

            if (hasRipple) {
                const ripple = computePooledWaterRipple(x, y, phase, ampX, ampY, dist, maxDepth);
                srcX += ripple.dx;
                srcY += ripple.dy;
            }

            const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, useSoftSample);
            if (!px) continue;

            const reflectMix = weight;

            let r = px[0] * dim;
            let g = px[1] * dim;
            let b = px[2] * dim;
            let a = px[3];

            if (tintOpacity > 0) {
                let effTint = tintOpacity;
                if (boundaryBlend > 0 && dist < boundaryBlend) {
                    effTint = tintOpacity * (dist / boundaryBlend);
                }
                r = r * (1 - effTint) + 0 * effTint;
                g = g * (1 - effTint) + 100 * effTint;
                b = b * (1 - effTint) + 255 * effTint;
                a = a + (255 - a) * effTint;
            }

            data[dstIdx] = r * reflectMix + copyData[dstIdx] * (1 - reflectMix);
            data[dstIdx + 1] = g * reflectMix + copyData[dstIdx + 1] * (1 - reflectMix);
            data[dstIdx + 2] = b * reflectMix + copyData[dstIdx + 2] * (1 - reflectMix);
            data[dstIdx + 3] = a * reflectMix + copyData[dstIdx + 3] * (1 - reflectMix);
        }
    }
}

function isPooledWaterEffect11Active(o) {
    return !!(o && o.retroSettings?.activeFxId === 11 && window.isRetroEffectStarted(o));
}

window.cleanupPooledWaterEffect11 = function(o) {
    if (!o) return;
    o._pooledWaterEffectGen = (o._pooledWaterEffectGen || 0) + 1;
    delete o._pooledWaterFrameQueued;
    delete o._hardMask11;
    if (o.retroSettings) delete o.retroSettings._hardMask11;
    const hadFilter = o.filters?.some((f) => f.type === 'PooledWater');
    if (hadFilter) {
        o.filters = (o.filters || []).filter((f) => f.type !== 'PooledWater');
    }
    if (hadFilter && typeof window.restoreFabricImageFromOriginal === 'function') {
        window.restoreFabricImageFromOriginal(o);
    }
    o._cacheCanvas = null;
    o._cacheContext = null;
    o.dirty = true;
};

function ensurePooledWaterFilter11(o) {
    if (!isPooledWaterEffect11Active(o) || !o.retroSettings?.maskObj?.data) return null;
    const rs = o.retroSettings || {};
    let f = o.filters?.find((x) => x.type === 'PooledWater');
    if (!f) {
        f = new fabric.Image.filters.PooledWater({ ...rs });
        o.filters = [f];
    } else {
        f.waveAmpX = rs.waveAmpX || 0;
        f.waveAmpY = rs.waveAmpY || 0;
        f.phase = rs.phase || 0;
        f.boundaryBlend = rs.boundaryBlend ?? 40;
        f.tintOpacity = rs.tintOpacity ?? 0.15;
        f.maskObj = rs.maskObj;
    }
    return f;
}

function applyPooledWaterFilter11Now(o) {
    if (!isPooledWaterEffect11Active(o) || !o.retroSettings?.maskObj?.data) return;
    if (!ensurePooledWaterFilter11(o)) return;
    o.dirty = true;
    window.applyRetroImageFilterNow(o);
}

function queuePooledWaterFrame11(o) {
    if (!isPooledWaterEffect11Active(o) || !o.retroSettings?.maskObj?.data) return;
    const gen = o._pooledWaterEffectGen || 0;
    if (o._pooledWaterFrameQueued) return;
    o._pooledWaterFrameQueued = true;
    requestAnimationFrame(() => {
        o._pooledWaterFrameQueued = false;
        if ((o._pooledWaterEffectGen || 0) !== gen) return;
        applyPooledWaterFilter11Now(o);
    });
}

fabric.Image.filters.PooledWater = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PooledWater',
    waveAmpX: 0,
    waveAmpY: 0,
    phase: 0,
    boundaryBlend: 40,
    tintOpacity: 0.15,
    maskObj: null,
    applyTo: function(options) {
        if (!this.maskObj?.data) return;
        applyPooledWaterToImageData(options.imageData, {
            waveAmpX: this.waveAmpX,
            waveAmpY: this.waveAmpY,
            phase: this.phase,
            boundaryBlend: this.boundaryBlend,
            tintOpacity: this.tintOpacity,
            maskObj: this.maskObj
        });
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
function registerFabricCustomFilterFromObject(FilterClass) {
    if (!FilterClass || typeof FilterClass !== 'function') return;
    const type = FilterClass.prototype && FilterClass.prototype.type;
    if (!type) return;
    if (typeof FilterClass.fromObject === 'function') return;
    FilterClass.fromObject = function (object, callback) {
        const instance = new FilterClass(object || {});
        if (object && object.maskObj && object.maskObj.data) {
            instance.maskObj = object.maskObj;
        }
        if (callback) callback(instance);
    };
}
window.registerFabricCustomFilterFromObject = registerFabricCustomFilterFromObject;

[
    fabric.Image.filters.WindDistortion,
    fabric.Image.filters.WiggleIllusion,
    fabric.Image.filters.PaperRoll,
    fabric.Image.filters.ImageTear,
    fabric.Image.filters.PaintDrip,
    fabric.Image.filters.HolePerspective,
    fabric.Image.filters.PuzzleShuffle,
    fabric.Image.filters.ScrollRoll,
    fabric.Image.filters.PooledWater,
    fabric.Image.filters.MagicEye,
    fabric.Image.filters.FourCornerFold,
    fabric.Image.filters.PaintDripFast
].filter(Boolean).forEach(registerFabricCustomFilterFromObject);

const RETRO_FX_PIXEL_FILTER_TYPE = {
    1: 'WindDistortion',
    2: 'WiggleIllusion',
    4: 'FourCornerFold',
    5: 'PaperRoll',
    6: 'ImageTear',
    7: 'PaintDripFast',
    8: 'HolePerspective',
    9: 'PuzzleShuffle',
    10: 'ScrollRoll',
    11: 'PooledWater',
    31: 'MagicEye',
    46: 'PaintDrip'
};

function historyCanvasJsonReplacer(key, value) {
    if (key === '_gsap' || key === 'activeTween' || key === 'waterTween' || key === 'fxLoop') {
        return undefined;
    }
    if (key === 'filters') return undefined;
    if (typeof value === 'function') return undefined;
    if (value && typeof value === 'object' && typeof value.applyTo === 'function') {
        return undefined;
    }
    return value;
}

window.sanitizeHistoryCanvasJson = function (json) {
    if (!json) return json;
    if (!Array.isArray(json.objects)) return json;
    return {
        ...json,
        objects: json.objects.map((o) => {
            if (!o || typeof o !== 'object') return o;
            const copy = { ...o };
            delete copy.filters;
            delete copy._gsap;
            if (copy.retroSettings && typeof copy.retroSettings === 'object') {
                const rs = { ...copy.retroSettings };
                delete rs._gsap;
                delete rs.maskObj;
                copy.retroSettings = rs;
            }
            delete copy.maskObj;
            return copy;
        })
    };
};

window.rebuildImageFilterFromRetroSettings = function (obj) {
    if (!obj || obj.type !== 'image' || !window.isFabricObjectOnCanvas?.(obj)) return;

    const rs = obj.retroSettings;
    const fxId = rs && rs.activeFxId;
    if (!fxId) {
        obj.filters = [];
        return;
    }
    if (!rs.effectStarted) {
        obj.filters = [];
        obj.dirty = true;
        return;
    }

    if (fxId && window.globalRetroMemory) {
        const mem = { ...rs };
        delete mem.activeFxId;
        if (!rs.effectStarted) {
            mem.maskObj = null;
            delete mem.maskObj;
        }
        window.globalRetroMemory[fxId] = { ...(window.globalRetroMemory[fxId] || {}), ...mem };
    }

    const typeName = RETRO_FX_PIXEL_FILTER_TYPE[fxId];
    if (!typeName) {
        if (obj.filterSettings && typeof window.renderFilters === 'function') {
            window.renderFilters(obj);
        }
        return;
    }

    const FilterClass = fabric.Image.filters[typeName];
    if (!FilterClass) return;
    registerFabricCustomFilterFromObject(FilterClass);

    const props = { ...rs };
    delete props.activeFxId;
    if (!rs.effectStarted) {
        props.maskObj = null;
        delete props.maskObj;
    }
    const filter = new FilterClass(props);
    if (rs.effectStarted && rs.maskObj?.data) filter.maskObj = rs.maskObj;

    if (fxId === 7) {
        const started = !!rs.effectStarted;
        filter.amount = started && rs.maskObj?.data ? (rs.amount ?? 1) : 0;
        filter.dripLen = rs.dripLen;
        filter.wobble = rs.wobble;
        filter.maskObj = rs.maskObj;
    }

    obj.filters = [filter];
    if (typeof window.safeApplyImageFilters === 'function') {
        window.safeApplyImageFilters(obj);
    } else {
        try {
            obj.applyFilters();
            obj.dirty = true;
        } catch (err) {
            console.warn('[retrofx] applyFilters skipped:', err);
        }
    }
};

function getLogicalCanvasDimensions() {
    const c = window.canvas;
    if (!c) return { w: 1, h: 1 };
    const zoom = c.getZoom() || 1;
    return {
        w: Math.max(1, Math.round(c.getWidth() / zoom)),
        h: Math.max(1, Math.round(c.getHeight() / zoom))
    };
}

function getMaskPathScale(pathObj) {
    const m = pathObj.calcTransformMatrix();
    return Math.hypot(m[0], m[1]) || 1;
}

function getMinEnclosedInteriorPixels(pathObj) {
    const sw = (pathObj.strokeWidth || pathObj.retroSettings?.brushSize || 40) * getMaskPathScale(pathObj);
    return Math.max(600, Math.round(Math.PI * (sw * 0.32) ** 2));
}

function getMaskPathCloseThreshold(pathObj) {
    const sw = pathObj.strokeWidth || pathObj.retroSettings?.brushSize || 40;
    return Math.min(14, Math.max(5, sw * getMaskPathScale(pathObj) * 0.28));
}

function getMaskPathEndpointsCanvas(pathObj) {
    const path = pathObj.path;
    if (!path?.length) return null;
    const m = pathObj.calcTransformMatrix();
    const toC = (x, y) => fabric.util.transformPoint({ x, y }, m);
    const first = path[0];
    if (first[0] !== 'M') return null;
    let ex = first[1];
    let ey = first[2];
    for (let i = path.length - 1; i >= 0; i--) {
        const cmd = path[i];
        const t = cmd[0];
        if (t === 'L' || t === 'M') {
            ex = cmd[1];
            ey = cmd[2];
            break;
        }
        if (t === 'Q') {
            ex = cmd[3];
            ey = cmd[4];
            break;
        }
        if (t === 'C') {
            ex = cmd[5];
            ey = cmd[6];
            break;
        }
    }
    return { start: toC(first[1], first[2]), end: toC(ex, ey) };
}

function mergeMaskData(existing, added) {
    if (!existing?.data || !added?.data) return added || existing;
    if (existing.width !== added.width || existing.height !== added.height) return added;
    const out = new Uint8ClampedArray(existing.data);
    for (let i = 0; i < out.length; i += 4) {
        const v = Math.max(existing.data[i], added.data[i]);
        out[i] = v;
        out[i + 1] = v;
        out[i + 2] = v;
        out[i + 3] = 255;
    }
    return { width: existing.width, height: existing.height, data: out };
}

function isMaskStrokePixel(data, idx) {
    return data[idx] >= 96;
}

function floodMaskExteriorFromSeeds(imageData, exterior, seeds, radius) {
    const w = imageData.width;
    const h = imageData.height;
    const d = imageData.data;
    const qx = [];
    const qy = [];
    const r2 = radius * radius;

    const tryPush = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const idx = y * w + x;
        if (exterior[idx]) return;
        const di = idx * 4;
        if (isMaskStrokePixel(d, di)) return;
        exterior[idx] = 1;
        qx.push(x);
        qy.push(y);
    };

    for (const seed of seeds) {
        const sx = Math.round(seed.x);
        const sy = Math.round(seed.y);
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > r2) continue;
                tryPush(sx + dx, sy + dy);
            }
        }
    }

    for (let qi = 0; qi < qx.length; qi++) {
        const x = qx[qi];
        const y = qy[qi];
        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
    }
}

/** 캔버스 가장자리 + (열린 선이면) 시작·끝에서 닿는 배경 */
function buildMaskExteriorMap(imageData, pathObj) {
    const exterior = new Uint8Array(imageData.width * imageData.height);
    const w = imageData.width;
    const h = imageData.height;
    const borderSeeds = [];
    for (let x = 0; x < w; x++) {
        borderSeeds.push({ x, y: 0 }, { x, y: h - 1 });
    }
    for (let y = 0; y < h; y++) {
        borderSeeds.push({ x: 0, y }, { x: w - 1, y });
    }
    floodMaskExteriorFromSeeds(imageData, exterior, borderSeeds, 1);

    if (pathObj) {
        const ends = getMaskPathEndpointsCanvas(pathObj);
        if (ends) {
            const gap = Math.hypot(ends.start.x - ends.end.x, ends.start.y - ends.end.y);
            if (gap > getMaskPathCloseThreshold(pathObj)) {
                const radius = Math.ceil((pathObj.strokeWidth || 40) * getMaskPathScale(pathObj) * 0.55);
                floodMaskExteriorFromSeeds(imageData, exterior, [ends.start, ends.end], radius);
            }
        }
    }
    return exterior;
}

/** 스트로크로 둘러싸여 외부(또는 시작·끝) flood가 닿지 않는 영역만 */
function findEnclosedInteriorMask(imageData, minPixels, pathObj) {
    const w = imageData.width;
    const h = imageData.height;
    const d = imageData.data;
    const exterior = buildMaskExteriorMap(imageData, pathObj);
    let interiorCount = 0;
    const fill = new Uint8Array(w * h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const di = idx * 4;
            if (exterior[idx] || isMaskStrokePixel(d, di)) continue;
            fill[idx] = 1;
            interiorCount++;
        }
    }
    if (interiorCount < minPixels) return null;
    return fill;
}

function applyEnclosedInteriorToImageData(imageData, interiorMask) {
    const w = imageData.width;
    const h = imageData.height;
    const d = imageData.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (!interiorMask[idx]) continue;
            const di = idx * 4;
            d[di] = 255;
            d[di + 1] = 255;
            d[di + 2] = 255;
            d[di + 3] = 255;
        }
    }
}

function renderMaskPathStrokeToCanvas(pathObj, ctx) {
    const savedStroke = pathObj.stroke;
    const savedFill = pathObj.fill;
    const savedOpacity = pathObj.opacity;
    const savedCaching = pathObj.objectCaching;
    pathObj.objectCaching = false;
    pathObj.stroke = '#ffffff';
    pathObj.fill = '';
    pathObj.opacity = 1;
    ctx.save();
    pathObj.render(ctx);
    ctx.restore();
    pathObj.stroke = savedStroke;
    pathObj.fill = savedFill;
    pathObj.opacity = savedOpacity;
    pathObj.objectCaching = savedCaching;
}

function rasterizeMaskBrushPath(pathObj, logicalW, logicalH) {
    const off = document.createElement('canvas');
    off.width = logicalW;
    off.height = logicalH;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, logicalW, logicalH);
    renderMaskPathStrokeToCanvas(pathObj, octx);
    return off;
}

/** 붓 path: 래스터상 외부와 연결되지 않은 내부가 있을 때만 true (미리보기·마스크 동일) */
function shouldFillMaskBrushInterior(pathObj, logicalW, logicalH) {
    if (!pathObj || pathObj.type !== 'path') return false;
    const dims = logicalW && logicalH
        ? { w: logicalW, h: logicalH }
        : getLogicalCanvasDimensions();
    const off = rasterizeMaskBrushPath(pathObj, dims.w, dims.h);
    const img = off.getContext('2d').getImageData(0, 0, dims.w, dims.h);
    return !!findEnclosedInteriorMask(img, getMinEnclosedInteriorPixels(pathObj), pathObj);
}

function renderMaskBrushPathToScene(ctx, pathObj, logicalW, logicalH) {
    const off = rasterizeMaskBrushPath(pathObj, logicalW, logicalH);
    const octx = off.getContext('2d', { willReadFrequently: true });
    const img = octx.getImageData(0, 0, logicalW, logicalH);
    const interior = findEnclosedInteriorMask(img, getMinEnclosedInteriorPixels(pathObj), pathObj);
    if (interior) {
        applyEnclosedInteriorToImageData(img, interior);
        octx.putImageData(img, 0, 0);
    }
    ctx.drawImage(off, 0, 0);
}

function renderMaskObjectsToSceneCanvas(objects, logicalW, logicalH) {
    const sceneCanvas = document.createElement('canvas');
    sceneCanvas.width = logicalW;
    sceneCanvas.height = logicalH;
    const ctx = sceneCanvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, logicalW, logicalH);

    objects.forEach((obj) => {
        if (obj.type === 'path') {
            renderMaskBrushPathToScene(ctx, obj, logicalW, logicalH);
            return;
        }
        const savedStroke = obj.stroke;
        const savedFill = obj.fill;
        const savedOpacity = obj.opacity;
        const savedCaching = obj.objectCaching;
        obj.objectCaching = false;
        obj.stroke = '#ffffff';
        obj.fill = '#ffffff';
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

function bumpMaskSession(targetObj, fxId) {
    const id = fxId ?? targetObj?.retroSettings?.activeFxId;
    const next = ((targetObj?.retroSettings?._maskSessionId ?? 0) + 1) | 0;
    if (targetObj?.retroSettings) targetObj.retroSettings._maskSessionId = next;
    if (id != null && window.globalRetroMemory?.[id]) {
        window.globalRetroMemory[id]._maskSessionId = next;
    }
    return next;
}

function getMaskSessionId(targetObj) {
    const rs = targetObj?.retroSettings;
    if (rs && rs._maskSessionId != null) return rs._maskSessionId;
    const fxId = rs?.activeFxId;
    if (fxId != null && window.globalRetroMemory?.[fxId]?._maskSessionId != null) {
        return window.globalRetroMemory[fxId]._maskSessionId;
    }
    return 0;
}

/** 확정 마스크·필터·메모리·임시 도형 제거 (효과 종료 후 이전 영역이 남지 않게) */
window.clearRetroEffectMask = function (targetObj, fxId) {
    if (!targetObj) return;
    const id = fxId ?? targetObj.retroSettings?.activeFxId;
    bumpMaskSession(targetObj, id);
    if (targetObj.retroSettings) {
        targetObj.retroSettings.maskObj = null;
        delete targetObj.retroSettings.maskObj;
        delete targetObj.retroSettings._hardMask11;
        targetObj.retroSettings.holeMaskShape = null;
        delete targetObj.retroSettings.holeMaskShape;
    }
    if (id != null && window.globalRetroMemory?.[id]) {
        window.globalRetroMemory[id].maskObj = null;
        delete window.globalRetroMemory[id].maskObj;
        delete window.globalRetroMemory[id]._hardMask11;
        window.globalRetroMemory[id].holeMaskShape = null;
        delete window.globalRetroMemory[id].holeMaskShape;
    }
    if (targetObj.maskObj) {
        targetObj.maskObj = null;
        delete targetObj.maskObj;
    }
    if (targetObj.filters?.length) {
        targetObj.filters.forEach((f) => {
            if (f && Object.prototype.hasOwnProperty.call(f, 'maskObj')) f.maskObj = null;
        });
    }
    const c = window.canvas;
    if (c) c.getObjects().filter((o) => o.__isTempMask || o.__isTempMaskPreview).forEach((o) => c.remove(o));
    if (window.maskDrawState?.targetObj === targetObj) {
        window.maskDrawState.appendPrevMask = false;
    }
};

function commitMaskRegion(targetObj) {
    const shapes = getMaskTempObjects();
    if (shapes.length === 0) return;
    try {
        const fxId = targetObj.retroSettings?.activeFxId;
        const feather = (fxId === 6 || fxId === 8) ? 0 : (targetObj.retroSettings?.feather ?? 20);
        let maskObj = generateMaskData(targetObj, shapes, feather);
        const prevMask = targetObj.retroSettings?.maskObj;
        const session = getMaskSessionId(targetObj);
        const mergePrev = !!(
            prevMask?.data &&
            window.maskDrawState?.appendPrevMask &&
            prevMask._maskSessionId === session
        );
        if (mergePrev) maskObj = mergeMaskData(prevMask, maskObj);
        delete maskObj._inwardDist;
        maskObj._maskSessionId = session;
        const drawTool = window.maskDrawState?.tool;
        const prevShape = targetObj.retroSettings?.holeMaskShape;
        const shape = mergePrev && prevShape === 'rect' && drawTool === 'brush'
            ? 'rect'
            : (drawTool === 'rect' ? 'rect' : inferHoleMaskShapeFromDrawTool(drawTool));
        targetObj.retroSettings.maskObj = maskObj;
        targetObj.retroSettings.holeMaskShape = shape;
        const activeId = targetObj.retroSettings.activeFxId || 1;
        if (window.globalRetroMemory[activeId]) {
            window.globalRetroMemory[activeId].maskObj = maskObj;
            window.globalRetroMemory[activeId].holeMaskShape = shape;
        }
        const activeFilter = targetObj.filters && targetObj.filters.find(f => f.maskObj !== undefined);
        if (activeFilter && window.isRetroEffectStarted?.(targetObj)) {
            activeFilter.maskObj = maskObj;
            if (activeFilter.holeMaskShape !== undefined) activeFilter.holeMaskShape = shape;
            if (activeFilter.type === 'PuzzleShuffle') {
                generatePuzzleObjects(targetObj);
            }
            targetObj.dirty = true;
            window.scheduleRetroCanvasRefresh(targetObj, () => window.applyRetroImageFilterNow(targetObj));
        } else if (targetObj.waterTween && window.isRetroEffectStarted?.(targetObj)) {
            targetObj.dirty = true;
            if (typeof targetObj._waterRender === 'function') targetObj._waterRender();
        }
        if (targetObj._staticFilterStarted && typeof window.renderFilters === 'function') {
            window.renderFilters(targetObj);
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

/** 마스크·드로잉 모드로 잠긴 캔버스 선택/클릭 복구 */
window.releaseCanvasInteraction = function (options = {}) {
    const c = window.canvas;
    if (!c) return;
    const removeTempMasks = !!options.removeTempMasks;
    const state = window.maskDrawState;

    if (state?.isDragging && state.previewShape) {
        try { c.remove(state.previewShape); } catch (_) { /* noop */ }
    }
    clearMaskDrawHandlers();
    c.off('path:created');
    restoreDefaultPathCreatedHandler();

    c.isDrawingMode = false;
    c.defaultCursor = 'default';
    c.selection = true;
    c.skipTargetFind = false;

    c.getObjects().filter(o => o.__isTempMaskPreview).forEach(o => c.remove(o));
    if (removeTempMasks) {
        c.getObjects().filter((o) => o.__isTempMask).forEach((o) => c.remove(o));
    }

    c.getObjects().forEach((o) => {
        if (o.__isTempMask) return;
        const isPuzzleParent = o.filters?.some(f => f.type === 'PuzzleShuffle') || (o.retroSettings?.activeFxId === 9);
        if (o._tempEvented !== undefined) {
            o.set({ evented: o._tempEvented, selectable: isPuzzleParent ? false : o._tempSelectable });
            delete o._tempEvented;
            delete o._tempSelectable;
        } else if (o.selectable === false || o.evented === false) {
            o.set({ evented: true, selectable: isPuzzleParent ? false : true });
        }
    });

    window.maskDrawState = null;
    updateMaskToolButtons();
    c.requestRenderAll();
};

function exitMaskDrawMode(applyMask) {
    const state = window.maskDrawState;
    const c = window.canvas;
    const targetObj = state?.targetObj;
    const hadLock = !!(state?.active || c?.getObjects().some((o) => o._tempEvented !== undefined));

    if (applyMask && targetObj) commitMaskRegion(targetObj);

    if (hadLock || state) {
        window.releaseCanvasInteraction();
        if (targetObj && c) {
            try {
                const isPuzzle = targetObj.filters?.some(f => f.type === 'PuzzleShuffle') || (targetObj.retroSettings?.activeFxId === 9);
                if (isPuzzle) {
                    c.discardActiveObject();
                } else {
                    c.setActiveObject(targetObj);
                }
                c.requestRenderAll();
            } catch (_) { /* noop */ }
        }
    }
}

function enterMaskDrawMode(targetObj, tool) {
    const c = window.canvas;
    if (!c || !targetObj) return;

    if (!window.maskDrawState?.active) {
        const session = getMaskSessionId(targetObj);
        const prev = targetObj.retroSettings?.maskObj;
        const appendPrevMask = !!(prev?.data && prev._maskSessionId === session);
        window.maskDrawState = {
            active: true, tool, targetObj, isDragging: false, startPointer: null, previewShape: null,
            appendPrevMask
        };
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
        // 도구 전환 시 이미 추가된 __isTempMask 도형들도 evented:false 유지
        c.getObjects().forEach(o => {
            if (o.__isTempMask) {
                o.set({ evented: false, selectable: false });
            }
        });
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
                e.path.set({
                    fill: '',
                    stroke: 'rgba(233, 30, 99, 0.85)',
                    evented: false,
                    selectable: false
                });
                updateMaskPreviewOverlay(targetObj);
            }
        });
    } else {
        c.defaultCursor = 'crosshair';
        c.on('mouse:down', onMaskShapeMouseDown);
        c.on('mouse:move', onMaskShapeMouseMove);
        c.on('mouse:up', onMaskShapeMouseUp);
    }

    updateMaskToolButtons();
    updateMaskPreviewOverlay(targetObj);
    c.requestRenderAll();
}

function onMaskShapeMouseDown(opt) {
    const state = window.maskDrawState;
    if (!state?.active || state.tool === 'brush') return;
    const c = window.canvas;
    // 실제 캔버스 오브젝트(마스크 도형이 아닌)를 클릭한 경우만 차단
    // __isTempMask 도형이나 evented:false 도형 위에서도 새 마스크를 그릴 수 있어야 함
    if (opt.target && !opt.target.__isTempMask && opt.target.evented !== false) return;

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
        if (tooSmall) {
            c.remove(shape);
        } else {
            updateMaskPreviewOverlay(state.targetObj);
        }
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
    ].filter(t => id !== 9 || t.id === 'rect');

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
    hint.textContent = id === 9 ? 'Ctrl+드래그: 정사각형' : 'Ctrl+드래그: 정사각형 / 정원';
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
            enterMaskDrawMode(targetObj, id === 9 ? 'rect' : 'brush');
        }
    };
    slidersContainer.appendChild(doneBtn);

    const resetMaskBtn = document.createElement('button');
    resetMaskBtn.innerText = '전체 영역으로 복구 (초기화)';
    resetMaskBtn.style.marginTop = '5px';
    resetMaskBtn.style.backgroundColor = '#607d8b';
    resetMaskBtn.onclick = () => {
        getMaskTempObjects().forEach(o => window.canvas.remove(o));
        window.canvas?.getObjects().filter(o => o.__isTempMaskPreview).forEach(o => window.canvas.remove(o));
        targetObj.retroSettings.maskObj = null;
        delete targetObj.retroSettings._hardMask11;
        if (window.globalRetroMemory[id]) {
            window.globalRetroMemory[id].maskObj = null;
            delete window.globalRetroMemory[id]._hardMask11;
        }
        if (id === 11 && window.isRetroEffectStarted?.(targetObj) && typeof window.cleanupPooledWaterEffect11 === 'function') {
            window.cleanupPooledWaterEffect11(targetObj);
        }
        const activeFilter = targetObj.filters && targetObj.filters.find(f => f.maskObj !== undefined);
        if (activeFilter && window.isRetroEffectStarted?.(targetObj)) {
            activeFilter.maskObj = null;
            if (activeFilter.type === 'PuzzleShuffle') {
                generatePuzzleObjects(targetObj);
            }
            targetObj.dirty = true;
            window.scheduleRetroCanvasRefresh(targetObj, () => window.applyRetroImageFilterNow(targetObj));
        } else if (targetObj.waterTween && window.isRetroEffectStarted?.(targetObj)) {
            targetObj.dirty = true;
            if (typeof targetObj._waterRender === 'function') targetObj._waterRender();
        }
        if (targetObj._staticFilterStarted && typeof window.renderFilters === 'function') {
            window.renderFilters(targetObj);
        }
        window.canvas.renderAll();
    };
    slidersContainer.appendChild(resetMaskBtn);

    targetObj._maskUiTargetId = id;
    updateMaskToolButtons();
}

function applyFeatherToMaskData(mask, featherValue) {
    if (!featherValue || featherValue <= 0) return mask;
    const { width: w, height: h, data } = mask;

    // 패딩 크기 계산 (블러 반경의 약 2.5배로 설정하여 블러 영역 바깥까지 충분히 커버)
    const pad = Math.ceil(featherValue * 2.5);
    const pw = w + 2 * pad;
    const ph = h + 2 * pad;
    const paddedData = new Uint8ClampedArray(pw * ph * 4);

    // 경계선 픽셀 복사 (Edge Replicate)
    for (let py = 0; py < ph; py++) {
        const sy = Math.min(Math.max(py - pad, 0), h - 1);
        for (let px = 0; px < pw; px++) {
            const sx = Math.min(Math.max(px - pad, 0), w - 1);
            const srcIdx = (sy * w + sx) * 4;
            const dstIdx = (py * pw + px) * 4;
            paddedData[dstIdx] = data[srcIdx];
            paddedData[dstIdx + 1] = data[srcIdx + 1];
            paddedData[dstIdx + 2] = data[srcIdx + 2];
            paddedData[dstIdx + 3] = data[srcIdx + 3];
        }
    }

    const paddedCanvas = document.createElement('canvas');
    paddedCanvas.width = pw;
    paddedCanvas.height = ph;
    const pCtx = paddedCanvas.getContext('2d');
    const pImg = pCtx.createImageData(pw, ph);
    pImg.data.set(paddedData);
    pCtx.putImageData(pImg, 0, 0);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const outCtx = out.getContext('2d', { willReadFrequently: true });
    outCtx.filter = `blur(${featherValue}px)`;
    outCtx.drawImage(paddedCanvas, -pad, -pad);
    outCtx.filter = 'none';
    const blurred = outCtx.getImageData(0, 0, w, h);
    return { data: blurred.data, width: w, height: h };
}

/**
 * 붓 그리기로 감싸진 닫힌 영역 및 가장자리(경계선)와 만나 생성된 닫힌 영역을 자동 채우기.
 * 가장 큰 배경 영역(최대 연결 컴포넌트)을 제외한 모든 고립된 배경 컴포넌트를 홀(Hole)로 간주하여 채웁니다.
 */
function fillHolesAndBorderPockets(data, w, h) {
    const labels = new Int32Array(w * h); // -2: background, -1: foreground
    for (let i = 0; i < w * h; i++) {
        labels[i] = (data[i * 4] <= 16) ? -2 : -1;
    }

    const componentSizes = [];
    const stack = [];
    let nextLabel = 0;
    const dirs4 = [-1, 1, -w, w];

    for (let i = 0; i < w * h; i++) {
        if (labels[i] === -2) {
            labels[i] = nextLabel;
            stack.push(i);
            let size = 1;

            while (stack.length > 0) {
                const curr = stack.pop();
                const cx = curr % w;
                const cy = Math.floor(curr / w);

                for (let dIdx = 0; dIdx < 4; dIdx++) {
                    const d = dirs4[dIdx];
                    const next = curr + d;

                    if (dIdx === 0 && cx === 0) continue;
                    if (dIdx === 1 && cx === w - 1) continue;
                    if (dIdx === 2 && cy === 0) continue;
                    if (dIdx === 3 && cy === h - 1) continue;

                    if (next >= 0 && next < w * h && labels[next] === -2) {
                        labels[next] = nextLabel;
                        stack.push(next);
                        size++;
                    }
                }
            }
            componentSizes.push(size);
            nextLabel++;
        }
    }

    if (componentSizes.length <= 1) return;

    let maxIdx = 0;
    let maxSize = componentSizes[0];
    for (let i = 1; i < componentSizes.length; i++) {
        if (componentSizes[i] > maxSize) {
            maxSize = componentSizes[i];
            maxIdx = i;
        }
    }

    const dx8 = [-1, 1, 0, 0, -1, 1, -1, 1];
    const dy8 = [0, 0, -1, 1, -1, -1, 1, 1];

    for (let i = 0; i < w * h; i++) {
        const label = labels[i];
        if (label >= 0 && label !== maxIdx) {
            const idx = i * 4;
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
        } else if (label === -1) {
            const cx = i % w;
            const cy = Math.floor(i / w);
            let adjacentToInner = false;
            for (let d = 0; d < 8; d++) {
                const nx = cx + dx8[d];
                const ny = cy + dy8[d];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const next = ny * w + nx;
                    const nLabel = labels[next];
                    if (nLabel >= 0 && nLabel !== maxIdx) {
                        adjacentToInner = true;
                        break;
                    }
                }
            }
            if (adjacentToInner) {
                const idx = i * 4;
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = 255;
            }
        }
    }
}

/**
 * web_effect_maker 검증 방식:
 * 각 마스크 도형의 좌표를 targetObj.toLocalPoint()로 이미지 로컬 좌표로 변환한 뒤
 * Canvas 2D API로 직접 렌더링 → 씬 캔버스 + 역행렬 샘플링 우회 방식보다 정확
 * path(붓), rect(사각형), ellipse(원형) 모두 지원
 */
function generateMaskData(targetObj, maskObjects, featherValue) {
    const w = Math.max(1, Math.round(targetObj.width));
    const h = Math.max(1, Math.round(targetObj.height));
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = w;
    finalCanvas.height = h;
    const ctx = finalCanvas.getContext('2d', { willReadFrequently: true });
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);

    // targetObj의 로컬 좌표계(중심 원점)를 마스크 캔버스(좌상단 원점)로 변환하기 위한 역행렬 계산
    const tm = targetObj.calcTransformMatrix();
    const invTm = fabric.util.invertTransform(tm);
    
    ctx.save();
    
    // 타겟 오브젝트의 origin 기준점에 따라 캔버스 중심 이동 보정
    let originXOffset = 0;
    if (targetObj.originX === 'center') originXOffset = 0.5;
    else if (targetObj.originX === 'right') originXOffset = 1;
    else if (typeof targetObj.originX === 'number') originXOffset = targetObj.originX;

    let originYOffset = 0;
    if (targetObj.originY === 'center') originYOffset = 0.5;
    else if (targetObj.originY === 'bottom') originYOffset = 1;
    else if (typeof targetObj.originY === 'number') originYOffset = targetObj.originY;

    // 1. 역행렬을 적용하기 전, 마스크 캔버스의 그리기 원점을 타겟 오브젝트의 실제 origin 위치로 이동
    ctx.translate(w * originXOffset, h * originYOffset);
    // 2. 캔버스 절대 좌표를 타겟 오브젝트의 로컬 좌표로 변환
    ctx.transform(invTm[0], invTm[1], invTm[2], invTm[3], invTm[4], invTm[5]);

    maskObjects.forEach(obj => {
        // 기존 스타일 백업
        const origFill = obj.fill;
        const origStroke = obj.stroke;
        
        // 마스크 영역을 흰색으로 지정 (채우기가 있으면 흰색, 선이 있으면 선도 흰색)
        const hasFill = obj.fill && obj.fill !== 'transparent' && obj.fill !== '';
        obj.set({
            fill: hasFill ? 'white' : '',
            stroke: obj.stroke && obj.stroke !== 'transparent' ? 'white' : ''
        });

        // Fabric.js 내장 렌더링 함수를 사용하여 모든 변환(스케일, 회전, path 좌표 등)을 완벽히 지원
        obj.render(ctx);

        // 스타일 복구
        obj.set({ fill: origFill, stroke: origStroke });
    });
    
    ctx.restore();

    let mask = { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
    fillHolesAndBorderPockets(mask.data, w, h);
    mask = applyFeatherToMaskData(mask, featherValue);
    return mask;
}

/**
 * 실시간 마스크 미리보기 채우기 오버레이 생성/업데이트 함수
 */
function updateMaskPreviewOverlay(targetObj) {
    const c = window.canvas;
    if (!c || !targetObj) return;

    // 기존 미리보기 오버레이 제거
    let overlay = c.getObjects().find(o => o.__isTempMaskPreview);
    if (overlay) {
        c.remove(overlay);
    }

    const shapes = getMaskTempObjects();
    const prevMask = targetObj.retroSettings?.maskObj;
    const session = getMaskSessionId(targetObj);
    const mergePrev = !!(
        prevMask?.data &&
        window.maskDrawState?.appendPrevMask &&
        prevMask._maskSessionId === session
    );

    if (shapes.length === 0 && !mergePrev) {
        c.requestRenderAll();
        return;
    }

    // 마스크 데이터 생성 (페더링은 0으로 설정하여 실시간 채우기 영역 확인을 돕습니다)
    let mask = null;
    if (shapes.length > 0) {
        mask = generateMaskData(targetObj, shapes, 0);
    }
    if (mergePrev) {
        if (mask) {
            mask = mergeMaskData(prevMask, mask);
        } else {
            mask = { data: new Uint8ClampedArray(prevMask.data), width: prevMask.width, height: prevMask.height };
        }
    }

    if (!mask || !mask.data) return;

    const w = mask.width;
    const h = mask.height;

    // 반투명 핑크색 채우기 오버레이 캔버스 생성
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    const imgData = tempCtx.createImageData(w, h);

    const mData = mask.data;
    const dest = imgData.data;
    for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        const val = mData[idx];
        if (val > 16) {
            dest[idx] = 233;
            dest[idx + 1] = 30;
            dest[idx + 2] = 99;
            dest[idx + 3] = 115; // 약 45% 투명도의 핑크색
        } else {
            dest[idx] = 0;
            dest[idx + 1] = 0;
            dest[idx + 2] = 0;
            dest[idx + 3] = 0;
        }
    }
    tempCtx.putImageData(imgData, 0, 0);

    // fabric.Image 객체 생성 및 타겟 오브젝트 변환값 복사
    fabric.Image.fromURL(tempCanvas.toDataURL(), (img) => {
        // 비동기 콜백 실행 시점에 여전히 마스크 그리기가 활성화되어 있고 동일한 세션인지 확인
        if (!window.maskDrawState || !window.maskDrawState.active || window.maskDrawState.targetObj !== targetObj) {
            return;
        }

        // 기존에 혹시 들어와버린 미리보기 오버레이가 있다면 한 번 더 제거해줍니다 (안전을 위해)
        let existingOverlay = c.getObjects().find(o => o.__isTempMaskPreview);
        if (existingOverlay) {
            c.remove(existingOverlay);
        }

        img.set({
            left: targetObj.left,
            top: targetObj.top,
            width: targetObj.width,
            height: targetObj.height,
            scaleX: targetObj.scaleX,
            scaleY: targetObj.scaleY,
            angle: targetObj.angle,
            flipX: targetObj.flipX,
            flipY: targetObj.flipY,
            skewX: targetObj.skewX,
            skewY: targetObj.skewY,
            originX: targetObj.originX,
            originY: targetObj.originY,
            selectable: false,
            evented: false,
            __isTempMaskPreview: true
        });

        c.add(img);

        // 타겟 이미지 바로 뒤/앞 순서 조정 (타겟보다 한 단계 위로 올림)
        const targetIdx = c.getObjects().indexOf(targetObj);
        if (targetIdx >= 0) {
            img.moveTo(targetIdx + 1);
        }
        c.requestRenderAll();
    });
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

/** 마스크 알파 bilinear 샘플 (계단·각짐 완화) */
function getMaskWeightAtBilinear(maskObj, x, y, w, h) {
    if (!maskObj?.data) return 1;
    const mw = maskObj.width;
    const mh = maskObj.height;
    const fx = (x / w) * mw - 0.5;
    const fy = (y / h) * mh - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sample = (ix, iy) => {
        const sx = Math.min(Math.max(ix, 0), mw - 1);
        const sy = Math.min(Math.max(iy, 0), mh - 1);
        return maskObj.data[(sy * mw + sx) * 4] / 255;
    };
    const v00 = sample(x0, y0);
    const v10 = sample(x0 + 1, y0);
    const v01 = sample(x0, y0 + 1);
    const v11 = sample(x0 + 1, y0 + 1);
    const v0 = v00 * (1 - tx) + v10 * tx;
    const v1 = v01 * (1 - tx) + v11 * tx;
    const v = v0 * (1 - ty) + v1 * ty;
    return isNaN(v) ? 1 : v;
}

/** 벽 방향 기준 각도 차이 [-π, π] */
function getWallAngleDiff(px, py, mcx, mcy, wallAngleRad) {
    const vx = px - mcx;
    const vy = py - mcy;
    if (vx * vx + vy * vy < 0.5) return Math.PI;
    let diff = Math.atan2(vy, vx) - wallAngleRad;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
}

/** 벽 방향 기준 ±90°(총 180°) 원뿔 안의 각도인지 */
function isAngleInWallSector(px, py, mcx, mcy, wallAngleRad, halfSpanRad = Math.PI / 2) {
    return Math.abs(getWallAngleDiff(px, py, mcx, mcy, wallAngleRad)) <= halfSpanRad + 1e-5;
}

/**
 * 초승달 두께 계수: 호의 가운데(시점 반대) = 1, 양끝(±90°) = 0.
 * @see https://en.wikipedia.org/wiki/Crescent — tapered "horns" at arc ends
 */
function getCrescentThicknessFactor(px, py, mcx, mcy, wallAngleRad) {
    const diff = getWallAngleDiff(px, py, mcx, mcy, wallAngleRad);
    if (Math.abs(diff) > Math.PI / 2 + 1e-5) return 0;
    return Math.max(0, Math.cos(diff));
}

function gaussianSmoothRadii(radii, sigmaBins) {
    const bins = radii.length;
    const radius = Math.max(2, Math.ceil(sigmaBins * 3));
    const kernel = [];
    let kSum = 0;
    for (let k = -radius; k <= radius; k++) {
        const w = Math.exp(-0.5 * (k / sigmaBins) * (k / sigmaBins));
        kernel.push(w);
        kSum += w;
    }
    const out = new Float32Array(bins);
    for (let i = 0; i < bins; i++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
            const idx = (i + k + bins) % bins;
            acc += radii[idx] * kernel[k + radius];
        }
        out[i] = acc / kSum;
    }
    return out;
}

/** 방향별 바깥 반경 — bilinear + 이진 탐색 + 가우시안 스무딩 */
function buildOuterRadiusByAngle(maskObj, w, h, mcx, mcy, bins = 1440) {
    const radii = new Float32Array(bins);
    const maxLen = Math.hypot(w, h) + 4;
    const sampleIn = (sx, sy) => getMaskWeightAtBilinear(maskObj, sx, sy, w, h) >= 0.5;
    for (let b = 0; b < bins; b++) {
        const ang = (b / bins) * Math.PI * 2;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        if (!sampleIn(mcx + cos * 0.25, mcy + sin * 0.25)) {
            radii[b] = 0;
            continue;
        }
        let lo = 0.25;
        let hi = maxLen;
        for (let i = 0; i < 22; i++) {
            const mid = (lo + hi) * 0.5;
            if (sampleIn(mcx + cos * mid, mcy + sin * mid)) lo = mid;
            else hi = mid;
        }
        radii[b] = lo;
    }
    return gaussianSmoothRadii(radii, 6);
}

/** 바깥 경계까지 방사형 깊이(px). 안쪽일수록 큼, 경계=0 */
function getRadialDepthFromOuterEdge(px, py, mcx, mcy, outerRadii, bins) {
    const vx = px - mcx;
    const vy = py - mcy;
    const r = Math.hypot(vx, vy);
    if (r < 0.25) return 0;
    let ang = Math.atan2(vy, vx);
    if (ang < 0) ang += Math.PI * 2;
    const idx = (ang / (Math.PI * 2)) * bins;
    const i0 = Math.floor(idx) % bins;
    const i1 = (i0 + 1) % bins;
    const f = idx - Math.floor(idx);
    const outerR = outerRadii[i0] * (1 - f) + outerRadii[i1] * f;
    return outerR - r;
}

/** 호 방향 brickCount개, 두께 방향 brickDepthLayers개 */
function computeHoleBrickMetrics(wallTh, brickCount, brickDepthLayers, outerRadius) {
    const layers = Math.max(0.5, Math.min(1.5, brickDepthLayers));
    const count = Math.max(10, Math.min(30, Math.round(brickCount)));
    const brickL = Math.max(4, wallTh / layers);
    const arcLen = Math.PI * Math.max(40, outerRadius || 120);
    const brickH = Math.max(6, arcLen / count);
    const mortar = Math.max(1, Math.min(3, Math.round(Math.min(brickL, brickH) * 0.07)));
    return { brickL, brickH, mortar };
}

function paintHoleBrickPixel(data, dstIdx, u, z, hitT, vignette, metrics) {
    const brickL = metrics.brickL;
    const brickH = metrics.brickH;
    const mortar = metrics.mortar;
    const row = Math.floor(u / brickH);
    const offsetU = (row % 2) ? brickL * 0.5 : 0;
    let sz = z + offsetU;
    sz = ((sz % brickL) + brickL) % brickL;
    let su = ((u % brickH) + brickH) % brickH;
    const isMortar = sz < mortar || su < mortar;
    let rCol, gCol, bCol;
    if (isMortar) {
        rCol = 185; gCol = 180; bCol = 175;
    } else {
        const col = Math.floor((z + offsetU) / brickL);
        const noise = ((Math.abs(row * 41 + col * 23)) % 28) - 14;
        const gray = 128 + noise;
        rCol = gray; gCol = gray - 4; bCol = gray - 8;
    }
    const shade = Math.max(0.35, (0.55 + 0.45 * (1 - hitT)) * (1 - hitT * (0.35 + (vignette || 0) * 0.35)));
    data[dstIdx] = rCol * shade;
    data[dstIdx + 1] = gCol * shade;
    data[dstIdx + 2] = bCol * shade;
    data[dstIdx + 3] = 255;
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
    const boundX = new Float32Array(n);
    const boundY = new Float32Array(n);
    dist.fill(-1);
    boundX.fill(-1);
    boundY.fill(-1);
    const q = new Int32Array(n);
    let qh = 0;
    let qt = 0;
    const insideAt = (x, y) => md[(y * mw + x) * 4] / 255 >= 0.5;

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
                boundX[idx] = x;
                boundY[idx] = y;
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
        const bx0 = boundX[idx];
        const by0 = boundY[idx];
        for (let k = 0; k < neighbors.length; k++) {
            const nx = cx + neighbors[k][0];
            const ny = cy + neighbors[k][1];
            if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
            const ni = ny * mw + nx;
            if (dist[ni] >= 0) continue;
            if (!insideAt(nx, ny)) continue;
            dist[ni] = base + (k < 4 ? 1 : 1.414);
            boundX[ni] = bx0;
            boundY[ni] = by0;
            q[qt++] = ni;
        }
    }

    let maxD = 0;
    for (let i = 0; i < n; i++) {
        if (dist[i] >= 0 && dist[i] > maxD) maxD = dist[i];
    }
    return { dist, boundX, boundY, maxD, mw, mh };
}

function getMaskInwardDistance(maskObj) {
    if (!maskObj?.data) return null;
    const cached = maskObj._inwardDist;
    if (cached?.src === maskObj.data && cached.boundX) return cached;
    const built = buildMaskInwardDistance(maskObj);
    built.src = maskObj.data;
    maskObj._inwardDist = built;
    return built;
}

function sampleMaskTearFieldAt(distInfo, x, y, w, h) {
    const u = (x + 0.5) / w * distInfo.mw - 0.5;
    const v = (y + 0.5) / h * distInfo.mh - 0.5;
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const x1 = Math.min(x0 + 1, distInfo.mw - 1);
    const y1 = Math.min(y0 + 1, distInfo.mh - 1);
    const fx = u - x0;
    const fy = v - y0;
    const mw = distInfo.mw;
    const read = (mx, my) => {
        const idx = my * mw + mx;
        const d = distInfo.dist[idx];
        if (d < 0) return null;
        return {
            d,
            bx: distInfo.boundX[idx],
            by: distInfo.boundY[idx]
        };
    };
    const c00 = read(Math.max(0, x0), Math.max(0, y0));
    const c10 = read(x1, Math.max(0, y0));
    const c01 = read(Math.max(0, x0), y1);
    const c11 = read(x1, y1);
    const corners = [c00, c10, c01, c11].filter(Boolean);
    if (!corners.length) return null;
    if (!c00 || !c10 || !c01 || !c11) {
        let d = 0;
        let bx = 0;
        let by = 0;
        for (let i = 0; i < corners.length; i++) {
            d += corners[i].d;
            bx += corners[i].bx;
            by += corners[i].by;
        }
        const n = corners.length;
        return { d: d / n, bx: bx / n, by: by / n };
    }
    const lerp = (a, b, t) => a + (b - a) * t;
    const topD = lerp(c00.d, c10.d, fx);
    const botD = lerp(c01.d, c11.d, fx);
    const topBx = lerp(c00.bx, c10.bx, fx);
    const botBx = lerp(c01.bx, c11.bx, fx);
    const topBy = lerp(c00.by, c10.by, fx);
    const botBy = lerp(c01.by, c11.by, fx);
    return {
        d: lerp(topD, botD, fy),
        bx: lerp(topBx, botBx, fy),
        by: lerp(topBy, botBy, fy)
    };
}

function sampleMaskInwardDistPx(distInfo, x, y, w, h) {
    const f = sampleMaskTearFieldAt(distInfo, x, y, w, h);
    return f ? f.d : null;
}

/**
 * 6번 찢기: d(경계→안쪽 거리) vs f(s) — s는 가장 가까운 경계점 좌표, 1D 노이즈
 */
function applyPaperTornTransparentRegion(imageData, maskObj, opts) {
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const copyData = opts.keepCopy ? new Uint8ClampedArray(src) : null;
    const amt = Math.max(0, Math.min(1, opts.amount ?? 1));
    const rough = Math.max(4, opts.roughnessSlider ?? 16);
    const jagged = opts.jagged ?? (10 + rough * 2.2);
    const seed = opts.seed ?? 1.37;
    const inwardInfo = getMaskInwardDistance(maskObj);
    const scale = inwardInfo
        ? Math.min(w / inwardInfo.mw, h / inwardInfo.mh)
        : 1;
    const toothDepth = (5 + rough * 1.15) * scale;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (getMaskWeightAt(maskObj, x, y, w, h) < 0.5) continue;

            const i = (y * w + x) * 4;
            let hole = true;

            if (inwardInfo) {
                const field = sampleMaskTearFieldAt(inwardInfo, x, y, w, h);
                if (field) {
                    const d = field.d * scale;
                    const sAlong = field.bx * scale * 0.19 + field.by * scale * 0.23 + seed * 0.01;
                    const s = sAlong * 2.85;
                    const n = Math.max(-1, Math.min(1, tearEdgeNoise(s, jagged, seed) / Math.max(jagged, 1)));
                    const depth = toothDepth * (0.5 + 0.5 * n);
                    hole = d > depth;
                }
            }

            if (!hole) continue;

            const outA = 0;
            if (copyData && amt < 0.999) {
                const mix = amt;
                src[i + 3] = Math.round(outA * mix + copyData[i + 3] * (1 - mix));
            } else {
                src[i + 3] = outA;
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
    const rough = Math.max(4, rs.roughness ?? 16);
    applyPaperTornTransparentRegion(imageData, rs.maskObj, {
        amount: 1,
        jagged: 10 + rough * 2.2,
        roughnessSlider: rough,
        seed: rs.seed ?? 1.37
    });
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

/** 프레임당 1회만 필터·캔버스 갱신 (GSAP onUpdate 과부하 방지) */
window.cancelRetroCanvasRefresh = function (obj) {
    if (!obj) return;
    if (obj._retroRefreshRaf) {
        cancelAnimationFrame(obj._retroRefreshRaf);
        obj._retroRefreshRaf = 0;
    }
    obj._retroRefreshPending = null;
};

window.applyRetroImageFilterNow = function (obj) {
    if (!obj || !window.isFabricObjectOnCanvas?.(obj)) return;
    if (!obj.filters?.length) {
        obj.dirty = true;
        window.canvas?.requestRenderAll();
        return;
    }
    if (typeof window.safeApplyImageFilters === 'function') {
        window.safeApplyImageFilters(obj);
    } else {
        try {
            obj.applyFilters();
        } catch (err) {
            console.warn('[retrofx] applyFilters skipped:', err);
        }
    }
    obj.dirty = true;
    window.canvas?.requestRenderAll();
};

window.scheduleRetroCanvasRefresh = function (obj, fn) {
    if (!obj) return;
    obj._retroRefreshPending = fn || (() => window.applyRetroImageFilterNow(obj));
    if (obj._retroRefreshRaf) return;
    obj._retroRefreshRaf = requestAnimationFrame(() => {
        obj._retroRefreshRaf = 0;
        const run = obj._retroRefreshPending;
        obj._retroRefreshPending = null;
        if (run) run();
    });
};

/** 재생 중 트윈·루프만 정지 (필터/설정은 유지) */
window.haltRetroEffectMotion = function (obj) {
    if (!obj) return;
    if (obj.retroSettings?.activeFxId === 10) {
        window.cleanupScrollRollEffect10(obj);
    }
    if (obj.retroSettings?.activeFxId === 11) {
        window.cleanupPooledWaterEffect11(obj);
    }
    window.cancelRetroCanvasRefresh(obj);
    gsap.killTweensOf(obj);
    if (obj.retroSettings) gsap.killTweensOf(obj.retroSettings);
    if (obj.activeTween) {
        obj.activeTween.kill();
        obj.activeTween = null;
    }
    if (obj.waterTween) {
        obj.waterTween.kill();
        obj.waterTween = null;
    }
    if (obj.fxLoop) {
        clearInterval(obj.fxLoop);
        obj.fxLoop = null;
    }
    obj._effectPaused = false;
};

window.isRetroEffectStarted = function (obj) {
    return !!(obj && obj.retroSettings && obj.retroSettings.effectStarted);
};

/** ① 효과 선택: 캔버스 비주얼 없이 옵션 UI만 — 이전 미시작 효과 잔상 제거 */
window.resetRetroVisualForSetup = function (obj) {
    if (!obj) return;
    window.cleanupScrollRollEffect10(obj);
    window.cleanupPooledWaterEffect11(obj);
    window.cancelRetroCanvasRefresh(obj);
    if (obj.waterTween) {
        obj.waterTween.kill();
        obj.waterTween = null;
    }
    if (typeof window.restoreFabricImageFromOriginal === 'function') {
        window.restoreFabricImageFromOriginal(obj);
    }
    obj.filters = [];
    obj.waterTime = 0;
    delete obj._waterRender;
    delete obj._retroWaterCtx;
    if (obj.retroSettings) obj.retroSettings.effectStarted = false;
    obj.dirty = true;

    // Clean up puzzle pieces and restore parent selectability/opacity
    cleanupPuzzlePieces(window.canvas);
    obj.set({ selectable: true, opacity: 1.0 });

    window.canvas?.requestRenderAll();
};

window.appendRetroStartHint = function () {
    const slidersEl = document.getElementById('filter-sliders');
    if (!slidersEl || slidersEl.querySelector('.retro-start-hint')) return;
    const hint = document.createElement('p');
    hint.className = 'retro-start-hint';
    hint.style.cssText = 'color:#888;font-size:12px;margin:0 0 12px;line-height:1.45;border-bottom:1px solid #444;padding-bottom:10px';
    hint.textContent = '① 옵션 확인 → ② 시간·슬라이더·영역 설정 → ③ ▶ 재생/⏸ · ⏹ 종료';
    slidersEl.insertBefore(hint, slidersEl.firstChild);
};

window.getRetroTransportState = function (obj) {
    if (!obj) return 'idle';
    const started = !!(obj.retroSettings?.effectStarted || obj._staticFilterStarted);
    if (!started) return 'idle';
    if (obj._effectPaused) return 'paused';
    return 'playing';
};

window.syncRetroTransportPanel = function (obj) {
    if (typeof obj?._syncRetroTransportUi === 'function') obj._syncRetroTransportUi();
};

function setRetroTransportButtonLabel(btn, icon, text) {
    btn.textContent = '';
    const iconEl = document.createElement('span');
    iconEl.className = 'retro-transport-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;
    const labelEl = document.createElement('span');
    labelEl.className = 'retro-transport-label';
    labelEl.textContent = text;
    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
}

/**
 * 필터 패널: 재생(2) · 종료(1) 비율, 상태별 아이콘+텍스트 라벨.
 */
window.mountRetroEffectStartButton = function (obj, settings, id, startFn, opts = {}) {
    const panel = document.getElementById('retro-effect-controls');
    if (!panel) return;

    if (!opts.keepContents) panel.innerHTML = '';

    if (!opts.skipHint) window.appendRetroStartHint();

    const wrap = document.createElement('div');
    wrap.className = 'retro-transport-wrap';
    wrap.style.marginTop = opts.keepContents ? '10px' : '0';

    const row = document.createElement('div');
    row.className = 'retro-transport-row';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'retro-transport-btn retro-transport-play';
    setRetroTransportButtonLabel(playBtn, '▷', '효과시작');

    const endBtn = document.createElement('button');
    endBtn.type = 'button';
    endBtn.className = 'retro-transport-btn retro-transport-end';
    setRetroTransportButtonLabel(endBtn, '⏹', '종료');
    endBtn.title = '효과 종료 (효과 선택·설정은 유지, 비주얼만 초기화)';
    endBtn.disabled = true;

    const syncUi = () => {
        const state = window.getRetroTransportState(obj);
        endBtn.disabled = state === 'idle';
        setRetroTransportButtonLabel(endBtn, '⏹', '종료');
        if (state === 'idle') {
            setRetroTransportButtonLabel(playBtn, '▷', '효과시작');
            playBtn.title = '효과 시작';
        } else if (state === 'playing') {
            setRetroTransportButtonLabel(playBtn, '∥', '일시정지');
            playBtn.title = '일시정지';
        } else {
            setRetroTransportButtonLabel(playBtn, '▷', '재생하기');
            playBtn.title = '재생';
        }
        if (typeof window.updateEffectTransportUi === 'function') {
            window.updateEffectTransportUi();
        }
    };

    obj._syncRetroTransportUi = syncUi;

    const runStart = () => {
        const timeline = typeof window.getTimelineSettings === 'function'
            ? window.getTimelineSettings()
            : settings;
        window.haltRetroEffectMotion(obj);
        obj.retroSettings = obj.retroSettings || {};
        obj.retroSettings.effectStarted = true;
        requestAnimationFrame(() => {
            startFn(obj, timeline, id);
            if (typeof window.setEffectPlaybackRunning === 'function') {
                window.setEffectPlaybackRunning(obj);
            }
            syncUi();
            if (typeof window.saveEffectHistorySnapshot === 'function') {
                window.saveEffectHistorySnapshot({ delay: 600 });
            }
        });
    };

    playBtn.onclick = () => {
        const state = window.getRetroTransportState(obj);
        if (state === 'idle') {
            if (opts.validate && !opts.validate()) {
                alert(opts.validateMessage || '효과를 시작할 준비가 되지 않았습니다. 옵션·영역을 확인해 주세요.');
                return;
            }
            runStart();
            return;
        }
        if (state === 'paused') {
            window.resumeEffectPlayback(obj);
            syncUi();
            return;
        }
        if (window.hasAnimatedEffect(obj)) {
            window.pauseEffectPlayback(obj);
        }
        syncUi();
    };

    endBtn.onclick = () => {
        if (typeof window.stopRetroEffectToSetupState === 'function') {
            window.stopRetroEffectToSetupState(obj);
        }
        syncUi();
        if (typeof window.saveEffectHistorySnapshot === 'function') {
            window.saveEffectHistorySnapshot({ sync: true });
        }
    };

    obj._retroTransportPlay = () => playBtn.click();
    obj._retroTransportEnd = () => endBtn.click();

    row.appendChild(playBtn);
    row.appendChild(endBtn);
    wrap.appendChild(row);
    panel.appendChild(wrap);
    syncUi();
};

window.applyRetroFx = function(id) {
    if (window.maskDrawState?.active && typeof exitMaskDrawMode === 'function') {
        exitMaskDrawMode(true);
    } else if (typeof window.releaseCanvasInteraction === 'function') {
        window.releaseCanvasInteraction();
    }
    const obj = window.canvas.getActiveObject();
    if (!obj || obj.type !== 'image') {
        return alert("이미지 객체를 선택해주세요.");
    }

    const settings = window.getTimelineSettings();
    window.cleanupScrollRollEffect10(obj);
    window.cleanupPooledWaterEffect11(obj);
    window.haltRetroEffectMotion(obj);
    window.resetRetroVisualForSetup(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') {
        window.ensureFabricOriginalElement(obj);
    }

    const targetFunction = window['applyRetroEffect' + id];

    if (typeof targetFunction === 'function') {
        obj.retroSettings = { ...(obj.retroSettings || {}), effectStarted: false };
        targetFunction(obj, settings, id);
    } else {
        alert(id + "번 「" + (retroFxNames[id] || '특수 효과') + "」은 아직 준비 중입니다.");
    }
};

// ============================================================================
// 5. 개별 효과 함수 (파일 맨 끝에 독립적으로 계속 이어붙이는 공간)
// ============================================================================


// 💡 1번: 바람 흔들림
window.applyRetroEffect1 = function(obj, settings, id) {
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = { amplitude: 10, frequency: 0.05, speed: 2, phase: 0, brushSize: 40, feather: 20, maskObj: null };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };

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

    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        let f = o.filters.find((x) => x.type === 'WindDistortion');
        if (!f) {
            f = new fabric.Image.filters.WindDistortion({
                amplitude: o.retroSettings.amplitude,
                frequency: o.retroSettings.frequency,
                phase: o.retroSettings.phase || 0,
                maskObj: o.retroSettings.maskObj
            });
            o.filters = [f];
        }
        f.amplitude = o.retroSettings.amplitude;
        f.frequency = o.retroSettings.frequency;
        f.phase = o.retroSettings.phase || 0;
        f.maskObj = o.retroSettings.maskObj;
        o.dirty = true;
        if (!window.isRetroEffectStarted(o)) return;
        window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + (Math.PI * 2 * o.retroSettings.speed),
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                f.amplitude = o.retroSettings.amplitude;
                f.frequency = o.retroSettings.frequency;
                f.phase = o.retroSettings.phase;
                f.maskObj = o.retroSettings.maskObj;
                o.dirty = true;
                window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
            }
        });
    });
};

// 💡 2번: 왕복 보행 착시
window.applyRetroEffect2 = function(obj, settings, id) {
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = { amplitude: 15, speed: 0.5, brushSize: 40, feather: 20, maskObj: null };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };

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

    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        let f = o.filters.find((x) => x.type === 'WiggleIllusion');
        if (!f) {
            f = new fabric.Image.filters.WiggleIllusion({ offset: 0, maskObj: o.retroSettings.maskObj });
            o.filters = [f];
        }
        f.maskObj = o.retroSettings.maskObj;
        o.dirty = true;
        if (!window.isRetroEffectStarted(o)) return;
        window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
        const proxy = { offset: -o.retroSettings.amplitude };
        o.activeTween = gsap.to(proxy, {
            offset: o.retroSettings.amplitude,
            duration: o.retroSettings.speed,
            repeat: s.repeat,
            yoyo: true,
            ease: 'power1.inOut',
            onUpdate: () => {
                f.offset = proxy.offset;
                f.maskObj = o.retroSettings.maskObj;
                o.dirty = true;
                window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
            }
        });
    });
};

/** 수면 높이: 이미지 아래쪽 기준 채움 비율(0~1) → 캔버스 Y */
function getWaterFillFromBottom(rs) {
    if (rs.waterFill !== undefined) return rs.waterFill;
    if (rs.waterLevel !== undefined) return 1 - rs.waterLevel;
    return 0.4;
}

function getWaterSurfaceY(ih, rs) {
    return ih * (1 - getWaterFillFromBottom(rs));
}

function ensureWaterFillMemory(mem) {
    if (mem.waterFill === undefined) {
        mem.waterFill = 1 - (mem.waterLevel ?? 0.6);
    }
    return mem;
}

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
            waterFill: 0.4, amplitude: 15, frequency: 0.05, horizontalSpread: 0.03,
            speed: 15, tintOpacity: 0.15, boundaryBlend: 40,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    ensureWaterFillMemory(window.globalRetroMemory[id]);
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    const rs = obj.retroSettings;

    window.showFilterControls("물에 잠긴 효과", [
        { id: 'waterFill', label: '수면 높이 (아래 기준)', min: 0.1, max: 0.9, step: 0.05, value: getWaterFillFromBottom(rs), inputType: 'range' },
        { id: 'boundaryBlend', label: '경계선 부드러움', min: 0, max: 150, step: 5, value: rs.boundaryBlend, inputType: 'range' },
        { id: 'amplitude', label: '물결 진폭', min: 0, max: 50, step: 1, value: rs.amplitude, inputType: 'range' },
        { id: 'frequency', label: '물결 파형(세로)', min: 0.01, max: 0.15, step: 0.01, value: rs.frequency, inputType: 'range' },
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
        if (window.isRetroEffectStarted(obj) && typeof obj._waterRender === 'function') {
            if (pid !== 'brushSize' && pid !== 'feather') obj._waterRender();
        }
    });

    setupMaskUI(id, obj);

    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        window.ensureFabricOriginalElement(o);
        const src = o.originalElement || source;
        const iw = src.width || src.naturalWidth;
        const ih = src.height || src.naturalHeight;
        const rippleCanvas = document.createElement('canvas');
        rippleCanvas.width = iw;
        rippleCanvas.height = ih;
        const ctx = rippleCanvas.getContext('2d', { willReadFrequently: true });
        o.setElement(rippleCanvas);
        o.filters = [];
        const gapFix = 100;
        const renderWater = () => {
            const settingsRs = o.retroSettings;
            ctx.clearRect(0, 0, iw, ih);
            const waterY = getWaterSurfaceY(ih, settingsRs);
            ctx.drawImage(src, 0, 0, iw, waterY, 0, 0, iw, waterY);
            for (let y = waterY; y < ih; y += 2) {
                const distanceFromSurface = y - waterY;
                let currentAmp = settingsRs.amplitude;
                let currentSpread = settingsRs.horizontalSpread;
                if (settingsRs.boundaryBlend > 0 && distanceFromSurface < settingsRs.boundaryBlend) {
                    const blendRatio = distanceFromSurface / settingsRs.boundaryBlend;
                    currentAmp = settingsRs.amplitude * blendRatio;
                    currentSpread = settingsRs.horizontalSpread * blendRatio;
                }
                const xOffset = Math.sin(o.waterTime + (y * settingsRs.frequency)) * currentAmp;
                const spreadScale = 1 + Math.cos(o.waterTime + (y * settingsRs.frequency * 0.5)) * currentSpread;
                const newWidth = iw * spreadScale;
                ctx.drawImage(src, 0, y, iw, 2, (iw - newWidth) / 2 + xOffset - gapFix, y, newWidth + gapFix * 2, 2);
            }
            if (settingsRs.boundaryBlend > 0 && settingsRs.tintOpacity > 0) {
                const tintGradient = ctx.createLinearGradient(0, waterY, 0, waterY + settingsRs.boundaryBlend);
                tintGradient.addColorStop(0, 'rgba(0, 100, 255, 0)');
                tintGradient.addColorStop(1, `rgba(0, 100, 255, ${settingsRs.tintOpacity})`);
                ctx.fillStyle = tintGradient;
                ctx.fillRect(0, waterY, iw, settingsRs.boundaryBlend);
                ctx.fillStyle = `rgba(0, 100, 255, ${settingsRs.tintOpacity})`;
                ctx.fillRect(0, waterY + settingsRs.boundaryBlend, iw, ih - (waterY + settingsRs.boundaryBlend));
            } else if (settingsRs.tintOpacity > 0) {
                ctx.fillStyle = `rgba(0, 100, 255, ${settingsRs.tintOpacity})`;
                ctx.fillRect(0, waterY, iw, ih - waterY);
            }
            compositeCanvasWithMask(ctx, src, iw, ih, settingsRs.maskObj);
            o.dirty = true;
            window.canvas.requestRenderAll();
        };
        let waterRaf = 0;
        const scheduleWaterRender = () => {
            if (waterRaf) return;
            waterRaf = requestAnimationFrame(() => {
                waterRaf = 0;
                renderWater();
            });
        };
        o.waterTime = 0;
        o._waterRender = scheduleWaterRender;
        renderWater();
        o.waterTween = gsap.to(o, {
            waterTime: Math.PI * 100,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: scheduleWaterRender
        });
    });
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
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };

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

    window.mountRetroEffectStartButton(obj, settings, id, () => {
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
        window.applyRetroImageFilterNow(obj);
    });
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
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };

    const ensurePaperRollFilter = (o) => {
        let f = o.filters.find((x) => x.type === 'PaperRoll');
        if (!f) {
            f = new fabric.Image.filters.PaperRoll({
                amount: 0,
                radius: o.retroSettings.radius,
                direction: o.retroSettings.direction,
                shadow: o.retroSettings.shadow,
                backColor: o.retroSettings.backColor,
                maskObj: o.retroSettings.maskObj
            });
            o.filters = [f];
        }
        return f;
    };

    const syncFilter = (filter, o) => {
        filter.amount = o.retroSettings.amount;
        filter.radius = o.retroSettings.radius;
        filter.direction = o.retroSettings.direction;
        filter.shadow = o.retroSettings.shadow;
        filter.maskObj = o.retroSettings.maskObj;
        o.dirty = true;
        if (!window.isRetroEffectStarted(o)) return;
        window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
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
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            syncFilter(ensurePaperRollFilter(obj), obj);
        }
    });

    setupMaskUI(id, obj);
    obj.retroSettings.amount = 0;

    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        const f = ensurePaperRollFilter(o);
        o.retroSettings.amount = 0;
        syncFilter(f, o);
        o.activeTween = gsap.to(o.retroSettings, {
            amount: 1,
            duration: s.duration,
            repeat: s.repeat,
            yoyo: true,
            ease: 'power1.inOut',
            onUpdate: () => syncFilter(f, o)
        });
    });
};

function bindRetroMaskFilter(obj, settings, id, ensureFilterFn, syncFilterFn) {
    setupMaskUI(id, obj);
    obj.retroSettings.amount = 0;
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        const filter = ensureFilterFn(o);
        syncFilterFn(filter, o);
        const tween = { amount: 1 };
        if (o.retroSettings.phase !== undefined) {
            tween.phase = (o.retroSettings.phase || 0) + Math.PI * 2;
        }
        o.activeTween = gsap.to(o.retroSettings, {
            ...tween,
            duration: s.duration,
            repeat: s.repeat,
            yoyo: true,
            ease: 'power1.inOut',
            onUpdate: () => syncFilterFn(filter, o)
        });
    }, { keepContents: true });
}

// 💡 6번: 이미지 찢기 (tear-static 당시 버전: ImageTear 필터 · 정적)
window.applyRetroEffect6 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, roughness: 16,
            brushSize: 40, feather: 0, maskObj: null, seed: 1.37
        };
    }
    window.globalRetroMemory[id].feather = 0;
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false, feather: 0 };

    const ensureTearFilter = (o) => {
        let f = o.filters.find((x) => x.type === 'ImageTear');
        if (!f) {
            f = new fabric.Image.filters.ImageTear({ ...o.retroSettings });
            o.filters = [f];
        }
        return f;
    };
    const syncFilter = (filter, o) => {
        filter.amount = o.retroSettings.amount;
        filter.roughness = o.retroSettings.roughness;
        filter.maskObj = o.retroSettings.maskObj;
        filter.seed = o.retroSettings.seed ?? 1.37;
        o.dirty = true;
        if (!window.isRetroEffectStarted(o)) return;
        window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
    };

    window.showFilterControls('이미지 찢기 (영역 지정)', [
        { id: 'roughness', label: '톱니 거칠기', min: 4, max: 40, step: 1, value: obj.retroSettings.roughness, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid === 'roughness' && window.isRetroEffectStarted(obj) && obj.retroSettings.maskObj?.data) {
            delete obj.retroSettings.maskObj._inwardDist;
            syncFilter(ensureTearFilter(obj), obj);
        }
    });

    const slidersEl = document.getElementById('filter-sliders');
    if (slidersEl) {
        const hint = document.createElement('p');
        hint.className = 'retro-start-hint';
        hint.style.cssText = 'color:#888;font-size:12px;margin:0 0 12px;line-height:1.45;border-bottom:1px solid #444;padding-bottom:10px';
        hint.textContent = '① [영역 지정]으로 찢을 범위(경계 선명) → ② 톱니 거칠기 → ③ ▶ 재생';
        slidersEl.insertBefore(hint, slidersEl.firstChild);
    }

    setupMaskUI(id, obj);

    window.mountRetroEffectStartButton(obj, settings, id, () => {
        if (!obj.retroSettings.maskObj?.data) return;
        obj.retroSettings.amount = 1;
        syncFilter(ensureTearFilter(obj), obj);
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 찢을 범위를 그린 뒤 완료해 주세요.',
        skipHint: true,
        keepContents: true
    });
};

// 💡 7번: 물감 흘러내림
window.applyRetroEffect7 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    const maxImgHeight = Math.round(obj.height || 1000);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, dripLen: maxImgHeight, wobble: 18,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.PaintDripFast) {
        fabric.Image.filters.PaintDripFast = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'PaintDripFast',
            amount: 0, dripLen: 300, wobble: 18,
            maskObj: null,
            applyTo: function(options) {
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                const amt = Math.max(0, Math.min(1, this.amount));
                const maxDrip = Math.round(amt * this.dripLen);

                if (amt < 0.001 || !this.maskObj || !this.maskObj.data) return;

                // ── 1. 각 x열에서 마스크 선의 y 위치 탐색 ──────────────
                const lineY = new Int32Array(w).fill(-1);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (lineY[x] === -1 && getMaskWeightAt(this.maskObj, x, y, w, h) > 0.001) {
                            lineY[x] = y;
                        }
                    }
                }

                // ── 2. 열별 물방울 파라미터 사전 계산 (결정론적 노이즈) ──
                // 각 방울은 독립적인 길이, 폭, 위상을 가짐
                const dripDropLen  = new Float32Array(w);  // 방울 끝 y (lineY 기준 상대값)
                const dripDropHalf = new Float32Array(w);  // 방울 최대 반폭 (픽셀)
                const dripPhase    = new Float32Array(w);  // wobble 위상 오프셋

                // 방울 그룹 너비: wobble 값에 비례 (작을수록 촘촘, 클수록 넓음)
                const groupW = Math.max(6, Math.round(4 + this.wobble * 0.55));

                for (let x = 0; x < w; x++) {
                    if (lineY[x] === -1) continue;
                    // 결정론적 해시 (sin 기반) → [0,1]
                    const h1 = (Math.sin(x * 127.1 + 311.7) * 43758.5453) % 1;
                    const h2 = (Math.sin(x * 269.5 + 183.3) * 43758.5453) % 1;
                    const h3 = (Math.sin(x *  91.3 + 547.1) * 43758.5453) % 1;
                    const n1 = Math.abs(h1);  // [0,1]
                    const n2 = Math.abs(h2);
                    const n3 = Math.abs(h3);

                    // 방울 끝 길이: maxDrip × [0.45 ~ 1.0]
                    dripDropLen[x]  = maxDrip * (0.45 + n1 * 0.55);
                    // 방울 최대 반폭: groupW × [0.3 ~ 1.0] (픽셀 단위)
                    dripDropHalf[x] = groupW * (0.3 + n2 * 0.7);
                    // wobble 위상
                    dripPhase[x]    = n3 * Math.PI * 2;
                }

                // ── 3. 각 픽셀에 물방울 색상 적용 ───────────────────────
                // 결과 버퍼 (copyData 위에 덧씀)
                const outR = new Float32Array(w * h);
                const outG = new Float32Array(w * h);
                const outB = new Float32Array(w * h);
                const outA = new Float32Array(w * h);
                const painted = new Uint8Array(w * h);

                // 먼저 원본으로 채움
                for (let i = 0; i < w * h; i++) {
                    const ci = i * 4;
                    outR[i] = copyData[ci];
                    outG[i] = copyData[ci + 1];
                    outB[i] = copyData[ci + 2];
                    outA[i] = copyData[ci + 3];
                }

                for (let x = 0; x < w; x++) {
                    const ty = lineY[x];
                    if (ty === -1) continue;

                    const dropLen  = dripDropLen[x];
                    const halfW    = dripDropHalf[x];
                    const phase    = dripPhase[x];
                    const wobAmt   = this.wobble * amt;

                    // 마스크 선 바로 위에서 색상 샘플링 (최대 8픽셀 위까지 탐색)
                    let srcY = Math.max(0, ty - 1);
                    for (let dy = 1; dy <= 8; dy++) {
                        const testY = ty - dy;
                        if (testY < 0) break;
                        if (getMaskWeightAt(this.maskObj, x, testY, w, h) < 0.5) {
                            srcY = testY;
                            break;
                        }
                    }
                    const srcPx = sampleBilinear(copyData, w, h, x, srcY);

                    // 이 열의 방울 x-중심에 wobble 적용
                    const cx = x + Math.sin(x * 0.09 + phase) * wobAmt * 0.5;

                    // 방울 모양: y 방향으로 ellipse, x 방향은 반폭
                    // 끝부분(둥근 물방울 머리)을 구현하기 위해 y→[0,1] 정규화 후 cos 커브로 반폭 변조
                    for (let dy = 0; dy <= Math.ceil(dropLen); dy++) {
                        const py = ty + dy;
                        if (py >= h) break;

                        const tNorm = dy / Math.max(1, dropLen);  // [0,1]

                        // x 반폭: 시작(ty)부터 넓어지다가 끝에서 좁아지는 물방울 실루엣
                        // 최대 폭은 30% 지점 근방
                        const widthCurve = tNorm < 0.3
                            ? Math.sin((tNorm / 0.3) * Math.PI * 0.5)   // 0→1
                            : Math.pow(Math.max(0, 1 - (tNorm - 0.3) / 0.7), 0.55);  // 1→0 (둥근 끝)
                        const curHalfW = halfW * widthCurve;

                        // wobble에 따라 방울 중심이 좌우로 살짝 흔들림
                        const wobX = Math.sin(dy * 0.11 + phase) * wobAmt * tNorm * 0.35;
                        const dropCx = cx + wobX;

                        // x 범위
                        const x0 = Math.max(0, Math.round(dropCx - curHalfW));
                        const x1 = Math.min(w - 1, Math.round(dropCx + curHalfW));

                        for (let px = x0; px <= x1; px++) {
                            const idx = py * w + px;

                            // 방울 내부에서의 상대 위치 → 입체감 계산
                            const xDist = Math.abs(px - dropCx) / Math.max(0.5, curHalfW);  // [0,1]
                            const yDist = tNorm;

                            // 유화 입체 shading:
                            // - 중앙 상단 → 하이라이트 (1.25)
                            // - 가장자리  → 어둠 (0.55)
                            // - 끝 물방울 → 어둠 (0.65)
                            const edgeDark  = 1.0 - xDist * xDist * 0.55;        // 가장자리 어둠
                            const topLight  = 1.0 + (1.0 - yDist) * (1.0 - xDist) * 0.3;  // 상단 밝음
                            const tipDark   = yDist > 0.75 ? (0.65 + (1 - yDist) / 0.25 * 0.35) : 1.0;  // 끝 어둠
                            let shade = edgeDark * topLight * tipDark;
                            shade = Math.max(0.45, Math.min(1.35, shade));

                            outR[idx] = Math.min(255, srcPx[0] * shade);
                            outG[idx] = Math.min(255, srcPx[1] * shade);
                            outB[idx] = Math.min(255, srcPx[2] * shade);
                            outA[idx] = srcPx[3];
                            painted[idx] = 1;
                        }
                    }
                }

                // ── 4. 결과 버퍼를 imageData에 기록
                for (let i = 0; i < w * h; i++) {
                    const ci = i * 4;
                    data[ci]     = outR[i];
                    data[ci + 1] = outG[i];
                    data[ci + 2] = outB[i];
                    data[ci + 3] = outA[i];
                }
            }
        });
        registerFabricCustomFilterFromObject(fabric.Image.filters.PaintDripFast);
    }

    const ensureDripFilter = (o) => {
        let f = o.filters.find((x) => x.type === 'PaintDripFast');
        if (!f) {
            o.filters = o.filters.filter((x) => x.type !== 'PaintDripFast' && x.type !== 'PaintDrip');
            f = new fabric.Image.filters.PaintDripFast({ ...o.retroSettings });
            o.filters.push(f);
        }
        return f;
    };
    const syncFilter = (filter, o) => {
        filter.amount = o.retroSettings.amount;
        filter.dripLen = o.retroSettings.dripLen;
        filter.wobble = o.retroSettings.wobble;
        filter.maskObj = o.retroSettings.maskObj;
        o.dirty = true;
        if (!window.isRetroEffectStarted(o)) return;
        window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
    };


    // ── 7번 전용 마스크 생성 (외부 의존 없이 독립 작동) ────────────────
    // Fabric path를 이미지 좌표계 오프스크린 캔버스에 직접 렌더링
    const buildDripLineMask = (dripPaths, targetImg) => {
        const imgW  = Math.round(targetImg.width);
        const imgH  = Math.round(targetImg.height);
        const scaleX = targetImg.scaleX || 1;
        const scaleY = targetImg.scaleY || 1;

        // 이미지가 캔버스에서 차지하는 실제 픽셀 영역 (left/top은 중심 기준)
        const imgLeft = (targetImg.left || 0) - imgW * scaleX / 2;
        const imgTop  = (targetImg.top  || 0) - imgH * scaleY / 2;

        const off = document.createElement('canvas');
        off.width  = imgW;
        off.height = imgH;
        const ctx = off.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, imgW, imgH);

        dripPaths.forEach(pathObj => {
            // Fabric 자체 렌더러로 임시 캔버스에 path를 그린 뒤 잘라서 붙임
            // → 모든 zoom, scaleX/Y, pathOffset이 자동 반영됨
            const tmpSize = Math.max(window.canvas.width, window.canvas.height) * 2;
            const tmp = document.createElement('canvas');
            const zoom = window.canvas.getZoom() || 1;
            tmp.width  = window.canvas.width  / zoom;
            tmp.height = window.canvas.height / zoom;
            const tctx = tmp.getContext('2d', { willReadFrequently: true });

            // 흰색으로 덮어 그리기
            const savedStroke = pathObj.stroke;
            const savedFill   = pathObj.fill;
            const savedOp     = pathObj.opacity;
            pathObj.stroke  = '#ffffff';
            pathObj.fill    = '';
            pathObj.opacity = 1;
            pathObj.objectCaching = false;
            pathObj.render(tctx);
            pathObj.stroke  = savedStroke;
            pathObj.fill    = savedFill;
            pathObj.opacity = savedOp;

            // tmp 캔버스(캔버스 논리 좌표)에서 이미지 영역만 잘라내어
            // imgW × imgH 마스크 캔버스로 매핑
            ctx.drawImage(
                tmp,
                imgLeft, imgTop,               // src 시작 (이미지 좌상단)
                imgW * scaleX, imgH * scaleY,  // src 크기 (이미지 실제 픽셀 영역)
                0, 0,                          // dst 시작
                imgW, imgH                     // dst 크기 (마스크 해상도)
            );
        });

        const feather = obj.retroSettings.feather ?? 4;
        let mask = { data: ctx.getImageData(0, 0, imgW, imgH).data, width: imgW, height: imgH };
        if (typeof applyFeatherToMaskData === 'function' && feather > 0) {
            mask = applyFeatherToMaskData(mask, feather);
        }
        return mask;
    };

    const dripStart = () => {
        window.maskDrawState.active = false;
        window.canvas.isDrawingMode = false;
        if (typeof restoreCorePathHandler === 'function') restoreCorePathHandler();

        const paths = window.canvas.getObjects().filter(o => o.type === 'path' && o._isDripLine);
        if (paths.length === 0 && !obj.retroSettings.maskObj?.data) return;

        if (paths.length > 0) {
            try {
                const maskData = buildDripLineMask(paths, obj);
                obj.retroSettings.maskObj = maskData;
                window.globalRetroMemory[id].maskObj = maskData;
            } catch(e) {
                console.error('[effect7] mask build failed:', e);
                return;
            }
            paths.forEach(p => window.canvas.remove(p));
        }

        obj.retroSettings.amount = 1;
        obj.retroSettings.effectStarted = true;

        const f = ensureDripFilter(obj);
        f.amount  = obj.retroSettings.amount;
        f.dripLen = obj.retroSettings.dripLen;
        f.wobble  = obj.retroSettings.wobble;
        f.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;

        window.applyRetroImageFilterNow(obj);
    };

    window.showFilterControls('물감 흘러내림', [

        { id: 'dripLen', label: '흘러내림 길이', min: 20, max: maxImgHeight, step: 5, value: obj.retroSettings.dripLen, inputType: 'range' },
        { id: 'wobble', label: '물결 흔들림', min: 0, max: 40, step: 1, value: obj.retroSettings.wobble, inputType: 'range' },
        { id: 'brushSize', label: '붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '페더', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            syncFilter(ensureDripFilter(obj), obj);
        }
    });

    const controlPanel = document.getElementById('retro-effect-controls');
    if (controlPanel) {
        controlPanel.innerHTML = '';
        const dripHint = document.createElement('p');
        dripHint.style.cssText = 'color:#888;font-size:11px;margin:0 0 8px;line-height:1.4';
        dripHint.textContent = '② 직선/곡선 상단선 그리기 → ③ 효과 시작';
        controlPanel.appendChild(dripHint);
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '5px';
        
        const btnStraight = document.createElement('button');
        btnStraight.textContent = '직선 상단선';
        btnStraight.className = 'retro-action-btn';
        
        const btnCurve = document.createElement('button');
        btnCurve.textContent = '곡선 상단선';
        btnCurve.className = 'retro-action-btn';
        
        btnGroup.appendChild(btnStraight);
        btnGroup.appendChild(btnCurve);
        controlPanel.appendChild(btnGroup);

        window.maskDrawState = { active: false };

        // path:created 기본 핸들러 복원 헬퍼 (core.js와 동일 동작)
        const restoreCorePathHandler = () => {
            window.canvas.off('path:created');
            window.canvas.on('path:created', function(e) {
                window.canvas.sendToBack(e.path);
                window.canvas.discardActiveObject();
                window.canvas.requestRenderAll();
            });
        };

        // 상단선 그리기 모드 진입 공통 함수
        const enterDripDrawMode = (decimate) => {
            window.maskDrawState.active = true;
            window.canvas.isDrawingMode = true;
            const brush = new fabric.PencilBrush(window.canvas);
            brush.width = obj.retroSettings.brushSize || 20;
            brush.color = 'rgba(255, 0, 0, 0.7)';
            brush.decimate = decimate;
            window.canvas.freeDrawingBrush = brush;

            // 기존 핸들러 제거 후 7번 전용 핸들러 등록
            window.canvas.off('path:created');
            window.canvas.on('path:created', function(e) {
                const p = e.path;
                // 선이 캔버스에 유지되도록 표시만 설정, 제거하지 않음
                p.set({
                    selectable: false,
                    evented: false,
                    stroke: 'rgba(255, 0, 0, 0.7)',
                    fill: ''
                });
                p._isDripLine = true;
                window.canvas.requestRenderAll();
            });
        };

        btnStraight.onclick = () => enterDripDrawMode(10000);
        btnCurve.onclick    = () => enterDripDrawMode(2);

    }


    window.mountRetroEffectStartButton(obj, settings, id, dripStart, {
        validate: () => {
            const paths = window.canvas.getObjects().filter(o => o.type === 'path' && o._isDripLine);
            return paths.length > 0 || !!obj.retroSettings.maskObj?.data;
        },
        validateMessage: '직선/곡선 상단선을 그린 뒤 효과 시작을 눌러 주세요.',
        keepContents: !!controlPanel,
        skipHint: true
    });
};

function mountHoleViewAngleClock(targetObj, fxId, onPick) {
    const sliders = document.getElementById('filter-sliders');
    if (!sliders) return;
    const wrap = document.createElement('div');
    wrap.className = 'hole-view-clock-wrap';
    const title = document.createElement('div');
    title.className = 'hole-view-clock-title';
    title.textContent = '시점 (선택 각도의 반대쪽에 벽 생성)';
    wrap.appendChild(title);
    const dial = document.createElement('div');
    dial.className = 'hole-view-clock-dial';
    const center = document.createElement('div');
    center.className = 'hole-view-clock-center';
    center.textContent = '👁';
    dial.appendChild(center);
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const buttons = [];
    const setActive = (deg) => {
        buttons.forEach((b) => {
            const on = parseInt(b.dataset.angle, 10) === deg;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    };
    angles.forEach((deg) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hole-view-clock-btn';
        btn.dataset.angle = String(deg);
        btn.title = `시점 ${deg}°`;
        btn.textContent = String(deg);
        const posDeg = 180 - deg;
        const rad = posDeg * Math.PI / 180;
        const radiusPct = 42;
        btn.style.left = `calc(50% + ${radiusPct * Math.cos(rad)}% - 15px)`;
        btn.style.top = `calc(50% + ${radiusPct * Math.sin(rad)}% - 15px)`;
        btn.addEventListener('click', () => {
            targetObj.retroSettings.angle = deg;
            window.globalRetroMemory[fxId].angle = deg;
            setActive(deg);
            onPick(deg);
        });
        dial.appendChild(btn);
        buttons.push(btn);
    });
    wrap.appendChild(dial);
    sliders.insertBefore(wrap, sliders.firstChild);
    const cur = ((targetObj.retroSettings.angle || 0) % 360 + 360) % 360;
    const snapped = angles.includes(cur) ? cur : angles.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
    targetObj.retroSettings.angle = snapped;
    window.globalRetroMemory[fxId].angle = snapped;
    setActive(snapped);
}

window.applyRetroEffect8 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, angle: 0, wallThickness: 25, brickCount: 18, brickDepthLayers: 1,
            holeSize: 0.45, vignette: 0.5, brushSize: 40, feather: 0, maskObj: null,
            mode: 'wall', borderThickness: 4, borderShape: 'solid', borderColor: '#ffffff'
        };
    }
    if (window.globalRetroMemory[id].feather != null && window.globalRetroMemory[id].feather !== 0) {
        window.globalRetroMemory[id].feather = 0;
    }
    const mem = window.globalRetroMemory[id];
    if (mem.wallThickness == null) mem.wallThickness = 25;
    mem.wallThickness = Math.max(5, Math.min(60, Math.round(mem.wallThickness / 5) * 5));
    if (mem.brickCount == null) mem.brickCount = 18;
    if (mem.brickDepthLayers == null) {
        mem.brickDepthLayers = mem.depth != null
            ? Math.max(0.5, Math.min(1.5, mem.depth / 1.2))
            : 1;
    }
    if (mem.mode == null) mem.mode = 'wall';
    if (mem.borderThickness == null) mem.borderThickness = 4;
    if (mem.borderShape == null) mem.borderShape = 'solid';
    if (mem.borderColor == null) mem.borderColor = '#ffffff';

    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false, feather: 0 };
    if (!obj.retroSettings.effectStarted) {
        obj.retroSettings.maskObj = null;
        obj.retroSettings.holeMaskShape = null;
        window.globalRetroMemory[id].maskObj = null;
        window.globalRetroMemory[id].holeMaskShape = null;
    }
    const ensureFilter = (o) => {
        let f = o.filters.find((x) => x.type === 'HolePerspective');
        if (!f) {
            f = new fabric.Image.filters.HolePerspective({ ...o.retroSettings });
            o.filters = [f];
        }
        return f;
    };
    const syncFilter = (filter, o) => {
        filter.amount = o.retroSettings.amount;
        filter.angle = o.retroSettings.angle;
        filter.wallThickness = o.retroSettings.wallThickness;
        filter.brickCount = o.retroSettings.brickCount;
        filter.brickDepthLayers = o.retroSettings.brickDepthLayers;
        filter.holeSize = o.retroSettings.holeSize;
        filter.vignette = o.retroSettings.vignette;
        filter.maskObj = o.retroSettings.maskObj;
        filter.holeMaskShape = o.retroSettings.holeMaskShape;
        
        filter.mode = o.retroSettings.mode || 'wall';
        filter.borderThickness = o.retroSettings.borderThickness ?? 4;
        filter.borderShape = o.retroSettings.borderShape ?? 'solid';
        filter.borderColor = o.retroSettings.borderColor ?? '#ffffff';

        o.dirty = true;
        if (!window.isRetroEffectStarted(o)) return;
        window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
    };

    const mountStartButton = () => {
        window.mountRetroEffectStartButton(obj, settings, id, (o) => {
            const filter = ensureFilter(o);
            o.retroSettings.amount = 1;
            syncFilter(filter, o);
        });
    };

    const renderEffect8UI = () => {
        const isBorder = (obj.retroSettings.mode === 'border');
        let params = [];
        if (isBorder) {
            params = [
                { id: 'borderThickness', label: '테두리 두께 (px)', min: 4, max: 40, step: 1, value: obj.retroSettings.borderThickness ?? 4, inputType: 'range' },
                { 
                    id: 'borderShape', 
                    label: '테두리 모양', 
                    value: obj.retroSettings.borderShape ?? 'solid', 
                    inputType: 'select',
                    options: [
                        { value: 'solid', label: '실선 (단색)' },
                        { value: 'hoop', label: '훌라우프 (매끄럽고 볼록)' },
                        { value: 'sawtooth', label: '톱니모양 (작고 둥근 톱니)' },
                        { value: 'frame', label: '액자모양' },
                        { value: 'dots', label: '원형 배치 (크고 작은 원들)' }
                    ]
                },
                { id: 'borderColor', label: '테두리 색상', value: obj.retroSettings.borderColor ?? '#ffffff', inputType: 'color' },
                { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize }
            ];
        } else {
            params = [
                { id: 'wallThickness', label: '벽 두께 (px)', min: 5, max: 60, step: 5, value: obj.retroSettings.wallThickness, inputType: 'range' },
                { id: 'brickCount', label: '벽돌 개수 (호 방향)', min: 10, max: 30, step: 1, value: obj.retroSettings.brickCount, inputType: 'range' },
                { id: 'brickDepthLayers', label: '벽돌 깊이 (두께 방향)', min: 0.5, max: 1.5, step: 0.1, value: obj.retroSettings.brickDepthLayers, inputType: 'range' },
                { id: 'vignette', label: '벽돌 음영', min: 0, max: 1, step: 0.05, value: obj.retroSettings.vignette, inputType: 'range' },
                { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize }
            ];
        }

        window.showFilterControls('벽에 구멍 뚫기', params, (pid, val) => {
            if (pid === 'wallThickness') val = Math.max(5, Math.min(60, Math.round(val / 5) * 5));
            if (pid === 'brickCount') val = Math.max(10, Math.min(30, Math.round(val)));
            if (pid === 'brickDepthLayers') val = Math.max(0.5, Math.min(1.5, Math.round(val * 10) / 10));
            obj.retroSettings[pid] = val;
            window.globalRetroMemory[id][pid] = val;
            if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) {
                window.canvas.freeDrawingBrush.width = val;
            }
            if (pid !== 'brushSize' && window.isRetroEffectStarted(obj)) {
                syncFilter(ensureFilter(obj), obj);
            }
        });

        // Add Tab Menu ABOVE the options
        const slidersContainer = document.getElementById('filter-sliders');
        if (slidersContainer) {
            const tabContainer = document.createElement('div');
            tabContainer.style.display = 'flex';
            tabContainer.style.marginBottom = '15px';
            tabContainer.style.borderBottom = '1px solid #444';
            tabContainer.style.paddingBottom = '8px';
            tabContainer.style.gap = '8px';

            const createTab = (modeVal, labelText) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = labelText;
                btn.style.flex = '1';
                btn.style.padding = '8px';
                btn.style.fontSize = '12px';
                btn.style.fontWeight = 'bold';
                btn.style.borderRadius = '4px';
                btn.style.cursor = 'pointer';
                btn.style.border = '1px solid #00bcd4';
                
                const active = (obj.retroSettings.mode === modeVal);
                btn.style.backgroundColor = active ? '#00bcd4' : 'transparent';
                btn.style.color = active ? '#111' : '#00bcd4';
                
                btn.onclick = () => {
                    obj.retroSettings.mode = modeVal;
                    window.globalRetroMemory[id].mode = modeVal;
                    renderEffect8UI();
                    if (window.isRetroEffectStarted(obj)) {
                        syncFilter(ensureFilter(obj), obj);
                    }
                };
                return btn;
            };

            tabContainer.appendChild(createTab('wall', '벽 생성'));
            tabContainer.appendChild(createTab('border', '테두리 생성'));
            
            slidersContainer.insertBefore(tabContainer, slidersContainer.firstChild);
        }

        if (!isBorder) {
            mountHoleViewAngleClock(obj, id, () => {
                if (window.isRetroEffectStarted(obj)) syncFilter(ensureFilter(obj), obj);
            });
        }

        setupMaskUI(id, obj);
        mountStartButton();
    };

    obj.retroSettings.amount = 0;
    renderEffect8UI();
};

// 💡 9번: 퍼즐 조각화
window.applyRetroEffect9 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, cols: 14, rows: 9, rotate: 0.15, borderWidth: 4,
            brushSize: 40, feather: 0, maskObj: null
        };
    }
    window.globalRetroMemory[id].cols = Math.max(8, Math.min(26, window.globalRetroMemory[id].cols || 14));
    window.globalRetroMemory[id].rows = Math.max(8, Math.min(26, window.globalRetroMemory[id].rows || 9));
    window.globalRetroMemory[id].borderWidth = Math.max(4, Math.min(20, window.globalRetroMemory[id].borderWidth || 4));
    window.globalRetroMemory[id].feather = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false, feather: 0 };
    
    const ensureFilter = (o) => {
        let f = o.filters.find((x) => x.type === 'PuzzleShuffle');
        if (!f) {
            f = new fabric.Image.filters.PuzzleShuffle({ ...o.retroSettings });
            o.filters = [f];
        }
        return f;
    };
    const syncFilter = (filter, o) => {
        filter.amount = o.retroSettings.amount;
        filter.cols = o.retroSettings.cols;
        filter.rows = o.retroSettings.rows;
        filter.rotate = o.retroSettings.rotate;
        filter.borderWidth = o.retroSettings.borderWidth || 4;
        filter.maskObj = o.retroSettings.maskObj;
        o.dirty = true;
        if (!window.isRetroEffectStarted(o)) return;

        // Generate draggable puzzle pieces
        generatePuzzleObjects(o);

        window.scheduleRetroCanvasRefresh(o, () => window.applyRetroImageFilterNow(o));
    };
    window.showFilterControls('퍼즐 조각화', [
        { id: 'cols', label: '가로 조각 수', min: 8, max: 26, step: 1, value: obj.retroSettings.cols, inputType: 'number' },
        { id: 'rows', label: '세로 조각 수', min: 8, max: 26, step: 1, value: obj.retroSettings.rows, inputType: 'number' },
        { id: 'rotate', label: '조각 회전', min: 0, max: 0.25, step: 0.01, value: obj.retroSettings.rotate, inputType: 'range' },
        { id: 'borderWidth', label: '테두리 두께 (px)', min: 4, max: 20, step: 1, value: obj.retroSettings.borderWidth, inputType: 'range' }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (window.isRetroEffectStarted(obj)) {
            syncFilter(ensureFilter(obj), obj);
        }
    });
    setupMaskUI(id, obj);
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        o.retroSettings.amount = 1;
        syncFilter(ensureFilter(o), o);
    }, {
        skipHint: true,
        keepContents: true
    });
    
    obj.retroSettings.effectStarted = true;
    obj.retroSettings.amount = 1;
    syncFilter(ensureFilter(obj), obj);
};

// 💡 10번: 두루말이 만들기 (재생 시간·반복 — 하단 타임라인 기존 로직 사용)
window.applyRetroEffect10 = function(obj, settings, id) {
    window.cleanupScrollRollEffect10(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            maxAmount: 0, amount: 0, direction: 2, backColor: '#e8e0d5'
        };
    }
    if (window.globalRetroMemory[id].maxAmount === undefined) {
        window.globalRetroMemory[id].maxAmount = window.globalRetroMemory[id].amount || 0;
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false, amount: 0 };

    const startScrollRollTween = (o, s) => {
        const maxAmount = Math.max(0, Math.min(1, o.retroSettings.maxAmount || 0));
        if (maxAmount <= 0.001) return;
        gsap.killTweensOf(o.retroSettings);
        window.cleanupScrollRollEffect10(o);
        if (typeof window.restoreFabricImageFromOriginal === 'function') {
            window.restoreFabricImageFromOriginal(o);
        }
        if (typeof window.ensureFabricOriginalElement === 'function') {
            window.ensureFabricOriginalElement(o);
        }
        o.retroSettings.amount = 0;
        o._scrollRollHadEffect = true;
        const half = Math.max(0.05, s.duration * 0.5);
        const tl = gsap.timeline({
            repeat: s.repeat,
            onUpdate: () => queueScrollRollFrame10(o)
        });
        tl.to(o.retroSettings, { amount: maxAmount, duration: half, ease: 'power1.inOut' });
        tl.to(o.retroSettings, { amount: 0, duration: half, ease: 'power1.inOut' });
        o.activeTween = tl;
        queueScrollRollFrame10(o);
    };

    window.showFilterControls('두루말이 만들기', [
        { id: 'direction', label: '두루말이 방향 (0:좌 1:우 2:상 3:하)', min: 0, max: 3, step: 1, value: obj.retroSettings.direction, inputType: 'range' },
        { id: 'amountPct', label: '두루말이 정도 (%)', min: 0, max: 100, step: 1, value: Math.round((obj.retroSettings.maxAmount || 0) * 100), inputType: 'range' },
        { id: 'backColor', label: '두루말이 색상 (뒷면)', value: obj.retroSettings.backColor, inputType: 'color' }
    ], (pid, val) => {
        if (pid === 'amountPct') {
            obj.retroSettings.maxAmount = val / 100;
            window.globalRetroMemory[id].maxAmount = obj.retroSettings.maxAmount;
        } else {
            obj.retroSettings[pid] = pid === 'direction' ? Math.round(val) : val;
            window.globalRetroMemory[id][pid] = obj.retroSettings[pid];
        }
        if (!window.isRetroEffectStarted(obj)) return;
        if (pid === 'amountPct' && obj.activeTween) {
            const timeline = typeof window.getTimelineSettings === 'function'
                ? window.getTimelineSettings()
                : settings;
            startScrollRollTween(obj, timeline);
        } else {
            applyScrollRollFilter10Now(obj);
        }
    });

    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        startScrollRollTween(o, s);
    }, {
        validate: () => (obj.retroSettings.maxAmount || 0) > 0,
        validateMessage: '두루말이 정도를 1% 이상 설정해 주세요.'
    });
};

// 💡 11번: 호수 잔물결 (선택 영역 고인 물 + 반영)
window.applyRetroEffect11 = function(obj, settings, id) {
    window.cleanupPooledWaterEffect11(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            waveAmpX: 0, waveAmpY: 0, phase: 0,
            boundaryBlend: 40, tintOpacity: 0.15,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.boundaryBlend === undefined) mem.boundaryBlend = 40;
    if (mem.tintOpacity === undefined) mem.tintOpacity = 0.15;

    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };

    const syncPooledWater11 = (o) => {
        const f = ensurePooledWaterFilter11(o);
        if (!f) return;
        f.waveAmpX = o.retroSettings.waveAmpX || 0;
        f.waveAmpY = o.retroSettings.waveAmpY || 0;
        f.phase = o.retroSettings.phase || 0;
        f.boundaryBlend = o.retroSettings.boundaryBlend ?? 40;
        f.tintOpacity = o.retroSettings.tintOpacity ?? 0.15;
        f.maskObj = o.retroSettings.maskObj;
        applyPooledWaterFilter11Now(o);
    };

    window.showFilterControls('호수 잔물결', [
        { id: 'waveAmpX', label: '물결 정도 — 가로 (px)', min: 0, max: 40, step: 1, value: obj.retroSettings.waveAmpX, inputType: 'range', dualInput: true },
        { id: 'waveAmpY', label: '물결 정도 — 세로 (px)', min: 0, max: 40, step: 1, value: obj.retroSettings.waveAmpY, inputType: 'range', dualInput: true },
        { id: 'boundaryBlend', label: '경계선 부드러움', min: 0, max: 150, step: 5, value: obj.retroSettings.boundaryBlend, inputType: 'range' },
        { id: 'tintOpacity', label: '푸른빛 농도', min: 0, max: 0.8, step: 0.05, value: obj.retroSettings.tintOpacity, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            syncPooledWater11(obj);
        }
    });

    setupMaskUI(id, obj);

    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        syncPooledWater11(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 2 * 2.5,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => queuePooledWaterFrame11(o)
        });
        queuePooledWaterFrame11(o);
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 물이 고일 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 마스크 관련 핵심 함수들을 외부 파일(filter.js 등)에서도 사용할 수 있도록 window 전역 객체에 노출합니다.
window.getMaskWeightAt = getMaskWeightAt;
window.getMaskWeightAtBilinear = getMaskWeightAtBilinear;
window.setupMaskUI = setupMaskUI;
window.cleanupPuzzlePieces = cleanupPuzzlePieces;

let lastPuzzleMoveTime = 0;
window.moveRetroPuzzleBlock = function(activeObj, direction) {
    const now = Date.now();
    if (now - lastPuzzleMoveTime < 20) {
        return true;
    }
    const canvas = window.canvas;
    if (!canvas || !activeObj) return false;

    let parent = null;
    if (activeObj.type === 'image' && !activeObj._isPuzzlePiece) {
        parent = activeObj;
    } else if (activeObj._isPuzzlePiece) {
        const parentId = activeObj._parentImageId;
        parent = canvas.getObjects().find(o => o.type === 'image' && !o._isPuzzlePiece && (o.id === parentId || o.uid === parentId));
    }

    if (!parent) return false;

    const isPuzzle = parent.filters?.some(f => f.type === 'PuzzleShuffle') || (parent.retroSettings?.activeFxId === 9);
    if (!isPuzzle) return false;

    const objects = canvas._objects;
    const pieces = objects.filter(o => o._isPuzzlePiece && o._parentImageId === (parent.id || parent.uid));

    const parentIdx = objects.indexOf(parent);
    if (parentIdx === -1) return false;

    pieces.sort((a, b) => objects.indexOf(a) - objects.indexOf(b));

    pieces.forEach((piece, idx) => {
        const pIdx = objects.indexOf(piece);
        if (pIdx !== -1 && pIdx !== parentIdx + 1 + idx) {
            objects.splice(pIdx, 1);
            objects.splice(parentIdx + 1 + idx, 0, piece);
        }
    });

    return false;
};

// ============================================================================
// 4. 12~20번 고급 레트로 특수 효과 신규 구현 (완전 자체 독립 설계)
// ============================================================================

// 💡 12번: 소용돌이 물결 (Swirl Ripple)
window.applyRetroEffect12 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            swirlRadius: 150, swirlAngle: 180, phase: 0,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.swirlRadius === undefined) mem.swirlRadius = 150;
    if (mem.swirlAngle === undefined) mem.swirlAngle = 180;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.SwirlRipple) {
        fabric.Image.filters.SwirlRipple = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'SwirlRipple',
            swirlRadius: 150,
            swirlAngle: 180,
            phase: 0,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const swirlRadius = this.swirlRadius;
                const swirlAngle = this.swirlAngle * Math.PI / 180;
                const phase = this.phase;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                const cx = (rect.minX + rect.maxX) / 2;
                const cy = (rect.minY + rect.maxY) / 2;
                
                const pad = Math.max(10, Math.ceil(swirlRadius * 0.1));
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        const dx = x - cx;
                        const dy = y - cy;
                        const r = Math.sqrt(dx * dx + dy * dy);
                        
                        if (r < swirlRadius) {
                            const factor = 1 - r / swirlRadius;
                            const angle = swirlAngle * factor * factor + phase;
                            const cosA = Math.cos(angle);
                            const sinA = Math.sin(angle);
                            const srcX = cx + dx * cosA - dy * sinA;
                            const srcY = cy + dx * sinA + dy * cosA;
                            
                            const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, true);
                            if (px) {
                                data[dstIdx] = px[0] * weight + copyData[dstIdx] * (1 - weight);
                                data[dstIdx+1] = px[1] * weight + copyData[dstIdx+1] * (1 - weight);
                                data[dstIdx+2] = px[2] * weight + copyData[dstIdx+2] * (1 - weight);
                                data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                            }
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.SwirlRipple);
        }
    }
    
    const sync12 = (o) => {
        let f = o.filters?.find(x => x.type === 'SwirlRipple');
        if (!f) {
            f = new fabric.Image.filters.SwirlRipple({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.swirlRadius = o.retroSettings.swirlRadius;
            f.swirlAngle = o.retroSettings.swirlAngle;
            f.phase = o.retroSettings.phase;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('소용돌이 물결', [
        { id: 'swirlRadius', label: '소용돌이 반경', min: 20, max: 400, step: 5, value: obj.retroSettings.swirlRadius, inputType: 'range' },
        { id: 'swirlAngle', label: '회전 각도', min: -720, max: 720, step: 10, value: obj.retroSettings.swirlAngle, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync12(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync12(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 4,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync12(o);
            }
        });
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 고일 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 13번: 세로 폭포 왜곡 (Waterfall Flow)
window.applyRetroEffect13 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            flowSpeed: 15, waveAmp: 10, waveFreq: 0.05, phase: 0,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.flowSpeed === undefined) mem.flowSpeed = 15;
    if (mem.waveAmp === undefined) mem.waveAmp = 10;
    if (mem.waveFreq === undefined) mem.waveFreq = 0.05;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.WaterfallFlow) {
        fabric.Image.filters.WaterfallFlow = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'WaterfallFlow',
            flowSpeed: 15,
            waveAmp: 10,
            waveFreq: 0.05,
            phase: 0,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const flowSpeed = this.flowSpeed;
                const waveAmp = this.waveAmp;
                const waveFreq = this.waveFreq;
                const phase = this.phase;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                const hMask = Math.max(1, rect.maxY - rect.minY);
                
                const pad = Math.max(10, Math.ceil(waveAmp));
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        let srcY = rect.minY + ((y - rect.minY + phase * flowSpeed) % hMask + hMask) % hMask;
                        let srcX = x + Math.sin(y * waveFreq + phase) * waveAmp;
                        
                        const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, true);
                        if (px) {
                            data[dstIdx] = px[0] * weight + copyData[dstIdx] * (1 - weight);
                            data[dstIdx+1] = px[1] * weight + copyData[dstIdx+1] * (1 - weight);
                            data[dstIdx+2] = px[2] * weight + copyData[dstIdx+2] * (1 - weight);
                            data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.WaterfallFlow);
        }
    }
    
    const sync13 = (o) => {
        let f = o.filters?.find(x => x.type === 'WaterfallFlow');
        if (!f) {
            f = new fabric.Image.filters.WaterfallFlow({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.flowSpeed = o.retroSettings.flowSpeed;
            f.waveAmp = o.retroSettings.waveAmp;
            f.waveFreq = o.retroSettings.waveFreq;
            f.phase = o.retroSettings.phase;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('세로 폭포 왜곡', [
        { id: 'flowSpeed', label: '폭포 유속 (px)', min: 1, max: 50, step: 1, value: obj.retroSettings.flowSpeed, inputType: 'range' },
        { id: 'waveAmp', label: '물길 요동 (가로 진폭)', min: 0, max: 35, step: 1, value: obj.retroSettings.waveAmp, inputType: 'range' },
        { id: 'waveFreq', label: '요동 주기 (파형)', min: 0.01, max: 0.25, step: 0.01, value: obj.retroSettings.waveFreq, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync13(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync13(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 4,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync13(o);
            }
        });
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 14번: 깨진 유리창 효과 (Broken Window Effect)
window.applyRetroEffect14 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    // 에러 방지: 캔버스에서 활성 객체가 제거될 때 drawControls 등에서 canvas가 undefined 되어 발생하는 크래시 방지
    if (window.canvas) {
        if (!window.canvas._wrappedRemoveForEffect14) {
            const originalRemove = window.canvas.remove;
            window.canvas.remove = function(...args) {
                args.forEach(objToRemove => {
                    if (objToRemove && (objToRemove.__isTempMask || objToRemove.__isTempMaskPreview)) {
                        if (window.canvas) {
                            window.canvas.discardActiveObject();
                        }
                    }
                });
                return originalRemove.apply(this, args);
            };
            window.canvas._wrappedRemoveForEffect14 = true;
        }
    }
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            drawType: 'all', holeRadius: 50, crackOpacity: 80,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.drawType === undefined) mem.drawType = 'all';
    if (mem.holeRadius === undefined) mem.holeRadius = 50;
    if (mem.crackOpacity === undefined) mem.crackOpacity = 80;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.BrokenWindow) {
        fabric.Image.filters.BrokenWindow = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'BrokenWindow',
            drawType: 'all',
            holeRadius: 50,
            crackOpacity: 80,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const holeRadius = this.holeRadius;
                const crackOpacity = this.crackOpacity * 0.01;
                const drawType = this.drawType || 'all';
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                const cx = (rect.minX + rect.maxX) / 2;
                const cy = (rect.minY + rect.maxY) / 2;
                
                const pad = 15;
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                // Deterministic PRNG seeded by impact center to ensure stability when adjusting opacity/sliders
                let seed = Math.floor((cx || 0) * 73 + (cy || 0) * 37) || 42;
                const rnd = () => {
                    let t = seed += 0x6D2B79F5;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
                
                // Pre-render the glass crack lines and jagged hole on a temporary canvas
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const ctx = tempCanvas.getContext('2d');
                
                // Set crack styling
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // Enable drop shadow to give cracks a realistic 3D refraction depth look
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 1.5;
                ctx.shadowOffsetX = 0.8;
                ctx.shadowOffsetY = 0.8;
                
                const allRadialPaths = [];
                const numCracks = 10 + Math.floor(rnd() * 5); // 10 to 14 cracks
                const baseAngleOffset = rnd() * Math.PI * 2;
                
                function findPointAtDistance(path, targetR) {
                    for (let p of path) {
                        const dx = p.x - cx;
                        const dy = p.y - cy;
                        const r = Math.sqrt(dx * dx + dy * dy);
                        if (r >= targetR) return p;
                    }
                    return path[path.length - 1] || null;
                }
                
                // Radially radiating cracks
                function drawRadialCrack(startAngle) {
                    let currX = cx;
                    let currY = cy;
                    if (drawType === 'all' && holeRadius > 0) {
                        const rStart = holeRadius * 0.5;
                        currX = cx + Math.cos(startAngle) * rStart;
                        currY = cy + Math.sin(startAngle) * rStart;
                    }
                    
                    let angle = startAngle;
                    const maxDist = Math.max(w, h);
                    let dist = 0;
                    
                    ctx.beginPath();
                    ctx.moveTo(currX, currY);
                    
                    const points = [{ x: currX, y: currY }];
                    
                    while (dist < maxDist) {
                        const step = 8 + rnd() * 8;
                        angle += (rnd() - 0.5) * 0.22;
                        currX += Math.cos(angle) * step;
                        currY += Math.sin(angle) * step;
                        
                        points.push({ x: currX, y: currY });
                        ctx.lineTo(currX, currY);
                        dist += step;
                        
                        // Spawn branches
                        if (rnd() < 0.03 && dist < maxDist * 0.6) {
                            drawBranch(currX, currY, angle + (rnd() > 0.5 ? 0.35 : -0.35), maxDist - dist);
                        }
                    }
                    ctx.lineWidth = 1.0 + rnd() * 0.8;
                    ctx.stroke();
                    return points;
                }
                
                function drawBranch(startX, startY, startAngle, maxDist) {
                    let currX = startX;
                    let currY = startY;
                    let angle = startAngle;
                    let dist = 0;
                    ctx.beginPath();
                    ctx.moveTo(currX, currY);
                    while (dist < maxDist) {
                        const step = 8 + rnd() * 8;
                        angle += (rnd() - 0.5) * 0.18;
                        currX += Math.cos(angle) * step;
                        currY += Math.sin(angle) * step;
                        ctx.lineTo(currX, currY);
                        dist += step;
                    }
                    ctx.lineWidth = 0.5 + rnd() * 0.5;
                    ctx.stroke();
                }
                
                // Draw all major radial paths
                for (let i = 0; i < numCracks; i++) {
                    const angle = baseAngleOffset + (i * 2 * Math.PI) / numCracks + (rnd() - 0.5) * 0.15;
                    allRadialPaths.push(drawRadialCrack(angle));
                }
                
                // Concentric polygonal ring segments (stress lines)
                const ringGap = 35 + rnd() * 15;
                const startR = (drawType === 'all' ? holeRadius : 10) + 15;
                const maxR = Math.max(w, h) * 0.8;
                
                for (let rTarget = startR; rTarget < maxR; rTarget += ringGap) {
                    for (let i = 0; i < numCracks; i++) {
                        // Skip some segments to simulate natural random propagation
                        if (rnd() < 0.35) continue;
                        
                        const p1 = findPointAtDistance(allRadialPaths[i], rTarget);
                        const p2 = findPointAtDistance(allRadialPaths[(i + 1) % numCracks], rTarget);
                        
                        if (p1 && p2) {
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            if (rnd() < 0.5) {
                                ctx.lineTo(p2.x, p2.y);
                            } else {
                                const mx = (p1.x + p2.x) / 2 + (rnd() - 0.5) * 4;
                                const my = (p1.y + p2.y) / 2 + (rnd() - 0.5) * 4;
                                ctx.lineTo(mx, my);
                                ctx.lineTo(p2.x, p2.y);
                            }
                            ctx.lineWidth = 0.5 + rnd() * 0.6;
                            ctx.stroke();
                        }
                    }
                }
                
                // Disable shadows for the solid hole mask to avoid blurred boundaries
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Draw a highly jagged, pointy starburst central hole
                if (drawType === 'all' && holeRadius > 0) {
                    ctx.fillStyle = '#ff00ff'; // Pure magenta used as a chroma key color
                    ctx.beginPath();
                    const numHolePoints = 16 + Math.floor(rnd() * 8);
                    for (let i = 0; i < numHolePoints; i++) {
                        const angle = (i * 2 * Math.PI) / numHolePoints;
                        const isInner = (i % 2 === 0);
                        const radFactor = isInner ? (0.4 + rnd() * 0.2) : (1.1 + rnd() * 0.3);
                        const r = holeRadius * radFactor;
                        const px = cx + Math.cos(angle) * r;
                        const py = cy + Math.sin(angle) * r;
                        if (i === 0) {
                            ctx.moveTo(px, py);
                        } else {
                            ctx.lineTo(px, py);
                        }
                    }
                    ctx.closePath();
                    ctx.fill();
                }
                
                // Fetch pre-rendered pixel buffer
                const crackData = ctx.getImageData(0, 0, w, h).data;
                
                // Composite onto original image using mask weights
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        const rVal = crackData[dstIdx];
                        const gVal = crackData[dstIdx+1];
                        const bVal = crackData[dstIdx+2];
                        const aVal = crackData[dstIdx+3];
                        
                        // If it matches the magenta hole fill, make it transparent (using a tolerant check to handle anti-aliasing smoothly)
                        if (drawType === 'all' && rVal > 200 && bVal > 200 && gVal < 50) {
                            data[dstIdx + 3] = copyData[dstIdx + 3] * (1 - weight);
                            continue;
                        }
                        
                        // Otherwise if there is crack line content, blend it in
                        if (aVal > 0) {
                            const crackAlpha = (aVal / 255) * crackOpacity;
                            const blend = crackAlpha * weight;
                            
                            data[dstIdx] = copyData[dstIdx] * (1 - blend) + rVal * blend;
                            data[dstIdx+1] = copyData[dstIdx+1] * (1 - blend) + gVal * blend;
                            data[dstIdx+2] = copyData[dstIdx+2] * (1 - blend) + bVal * blend;
                            data[dstIdx+3] = copyData[dstIdx+3];
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.BrokenWindow);
        }
    }
    
    const sync14 = (o) => {
        let f = o.filters?.find(x => x.type === 'BrokenWindow');
        if (!f) {
            f = new fabric.Image.filters.BrokenWindow({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.holeRadius = o.retroSettings.holeRadius;
            f.crackOpacity = o.retroSettings.crackOpacity;
            f.drawType = o.retroSettings.drawType;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('깨진 유리창 효과', [
        {
            id: 'drawType',
            label: '그리기 옵션',
            inputType: 'select',
            value: obj.retroSettings.drawType,
            options: [
                { value: 'cracks', label: '금 그리기' },
                { value: 'all', label: '금과 구멍 그리기' }
            ]
        },
        { id: 'holeRadius', label: '깨진 구멍 크기 (px)', min: 0, max: 200, step: 2, value: obj.retroSettings.holeRadius, inputType: 'range' },
        { id: 'crackOpacity', label: '금 선명도 (%)', min: 0, max: 100, step: 5, value: obj.retroSettings.crackOpacity, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync14(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync14(o);
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 15번: 물방울 파동 (Droplet Ripple)
window.applyRetroEffect15 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amplitude: 15, frequency: 0.08, phase: 0,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.amplitude === undefined) mem.amplitude = 15;
    if (mem.frequency === undefined) mem.frequency = 0.08;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.DropletRipple) {
        fabric.Image.filters.DropletRipple = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'DropletRipple',
            amplitude: 15,
            frequency: 0.08,
            phase: 0,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const amplitude = this.amplitude;
                const frequency = this.frequency;
                const phase = this.phase;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                const cx = (rect.minX + rect.maxX) / 2;
                const cy = (rect.minY + rect.maxY) / 2;
                
                const pad = Math.max(10, Math.ceil(amplitude));
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        const dx = x - cx;
                        const dy = y - cy;
                        const r = Math.sqrt(dx * dx + dy * dy);
                        
                        if (r > 0.01) {
                            const displacement = Math.sin(r * frequency - phase) * amplitude;
                            const srcX = x + (dx / r) * displacement;
                            const srcY = y + (dy / r) * displacement;
                            
                            const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, true);
                            if (px) {
                                data[dstIdx] = px[0] * weight + copyData[dstIdx] * (1 - weight);
                                data[dstIdx+1] = px[1] * weight + copyData[dstIdx+1] * (1 - weight);
                                data[dstIdx+2] = px[2] * weight + copyData[dstIdx+2] * (1 - weight);
                                data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                            }
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.DropletRipple);
        }
    }
    
    const sync15 = (o) => {
        let f = o.filters?.find(x => x.type === 'DropletRipple');
        if (!f) {
            f = new fabric.Image.filters.DropletRipple({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.amplitude = o.retroSettings.amplitude;
            f.frequency = o.retroSettings.frequency;
            f.phase = o.retroSettings.phase;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('물방울 파동', [
        { id: 'amplitude', label: '파동 진폭 (px)', min: 0, max: 40, step: 1, value: obj.retroSettings.amplitude, inputType: 'range' },
        { id: 'frequency', label: '파동 주파수 (밀도)', min: 0.01, max: 0.25, step: 0.01, value: obj.retroSettings.frequency, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync15(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync15(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 4,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync15(o);
            }
        });
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 16번: 수면 굴절 (Water Refraction)
window.applyRetroEffect16 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            refractionAmp: 10, refractionFreq: 0.05, phase: 0,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.refractionAmp === undefined) mem.refractionAmp = 10;
    if (mem.refractionFreq === undefined) mem.refractionFreq = 0.05;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.WaterRefract) {
        fabric.Image.filters.WaterRefract = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'WaterRefract',
            refractionAmp: 10,
            refractionFreq: 0.05,
            phase: 0,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const refractionAmp = this.refractionAmp;
                const refractionFreq = this.refractionFreq;
                const phase = this.phase;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                
                const pad = Math.max(10, Math.ceil(refractionAmp));
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        let srcX = x + Math.sin(y * refractionFreq + phase) * refractionAmp;
                        let srcY = y + Math.cos(x * refractionFreq + phase) * refractionAmp;
                        
                        const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, true);
                        if (px) {
                            data[dstIdx] = px[0] * weight + copyData[dstIdx] * (1 - weight);
                            data[dstIdx+1] = px[1] * weight + copyData[dstIdx+1] * (1 - weight);
                            data[dstIdx+2] = px[2] * weight + copyData[dstIdx+2] * (1 - weight);
                            data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.WaterRefract);
        }
    }
    
    const sync16 = (o) => {
        let f = o.filters?.find(x => x.type === 'WaterRefract');
        if (!f) {
            f = new fabric.Image.filters.WaterRefract({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.refractionAmp = o.retroSettings.refractionAmp;
            f.refractionFreq = o.retroSettings.refractionFreq;
            f.phase = o.retroSettings.phase;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('수면 굴절', [
        { id: 'refractionAmp', label: '굴절 진폭 (px)', min: 0, max: 40, step: 1, value: obj.retroSettings.refractionAmp, inputType: 'range' },
        { id: 'refractionFreq', label: '굴절 주기 (파장)', min: 0.01, max: 0.25, step: 0.01, value: obj.retroSettings.refractionFreq, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync16(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync16(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 4,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync16(o);
            }
        });
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 17번: 만다라 효과 (Mandala Effect)
window.applyRetroEffect17 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            segments: 6, refraction: 30, phase: 0,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.segments === undefined) mem.segments = 6;
    if (mem.refraction === undefined) mem.refraction = 30;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.MirrorRefract) {
        fabric.Image.filters.MirrorRefract = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'MirrorRefract',
            segments: 6,
            refraction: 30,
            phase: 0,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const segments = this.segments;
                const refraction = this.refraction;
                const phase = this.phase;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                const cx = (rect.minX + rect.maxX) / 2;
                const cy = (rect.minY + rect.maxY) / 2;
                
                const pad = 10;
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                const segmentAngle = (2 * Math.PI) / segments;
                const halfSegment = segmentAngle / 2;
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        const dx = x - cx;
                        const dy = y - cy;
                        const r = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) + phase;
                        
                        const normalizedAngle = ((angle % segmentAngle) + segmentAngle) % segmentAngle;
                        let mirrorAngle = normalizedAngle;
                        if (mirrorAngle > halfSegment) {
                            mirrorAngle = segmentAngle - mirrorAngle;
                        }
                        
                        const srcX = cx + r * Math.cos(mirrorAngle) * (1 - refraction * 0.0015);
                        const srcY = cy + r * Math.sin(mirrorAngle) * (1 - refraction * 0.0015);
                        
                        const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, true);
                        if (px) {
                            data[dstIdx] = px[0] * weight + copyData[dstIdx] * (1 - weight);
                            data[dstIdx+1] = px[1] * weight + copyData[dstIdx+1] * (1 - weight);
                            data[dstIdx+2] = px[2] * weight + copyData[dstIdx+2] * (1 - weight);
                            data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.MirrorRefract);
        }
    }
    
    const sync17 = (o) => {
        let f = o.filters?.find(x => x.type === 'MirrorRefract');
        if (!f) {
            f = new fabric.Image.filters.MirrorRefract({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.segments = o.retroSettings.segments;
            f.refraction = o.retroSettings.refraction;
            f.phase = o.retroSettings.phase;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('만다라 효과', [
        { id: 'segments', label: '거울 분할 수', min: 2, max: 16, step: 1, value: obj.retroSettings.segments, inputType: 'range' },
        { id: 'refraction', label: '반사 왜곡 강도', min: 0, max: 100, step: 5, value: obj.retroSettings.refraction, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync17(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync17(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 2,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync17(o);
            }
        });
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 18번: 기름막 무지개 왜곡 (Oil Slick Rainbow)
window.applyRetroEffect18 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            rainbowOpacity: 0.4, rippleAmp: 10, phase: 0,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.rainbowOpacity === undefined) mem.rainbowOpacity = 0.4;
    if (mem.rippleAmp === undefined) mem.rippleAmp = 10;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.OilSlickRainbow) {
        fabric.Image.filters.OilSlickRainbow = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'OilSlickRainbow',
            rainbowOpacity: 0.4,
            rippleAmp: 10,
            phase: 0,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const rainbowOpacity = this.rainbowOpacity;
                const rippleAmp = this.rippleAmp;
                const phase = this.phase;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                
                const pad = Math.max(10, Math.ceil(rippleAmp));
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        let srcX = x + Math.sin(y * 0.05 + phase) * rippleAmp;
                        let srcY = y + Math.cos(x * 0.05 + phase) * rippleAmp;
                        
                        const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, true);
                        if (px) {
                            const colorFactor = Math.sin((x + y) * 0.02 + phase) * 0.5 + 0.5;
                            const rRain = Math.sin(colorFactor * 2 * Math.PI) * 127 + 128;
                            const gRain = Math.sin(colorFactor * 2 * Math.PI + (2 * Math.PI) / 3) * 127 + 128;
                            const bRain = Math.sin(colorFactor * 2 * Math.PI + (4 * Math.PI) / 3) * 127 + 128;
                            
                            const finalR = px[0] * (1 - rainbowOpacity) + rRain * rainbowOpacity;
                            const finalG = px[1] * (1 - rainbowOpacity) + gRain * rainbowOpacity;
                            const finalB = px[2] * (1 - rainbowOpacity) + bRain * rainbowOpacity;
                            
                            data[dstIdx] = finalR * weight + copyData[dstIdx] * (1 - weight);
                            data[dstIdx+1] = finalG * weight + copyData[dstIdx+1] * (1 - weight);
                            data[dstIdx+2] = finalB * weight + copyData[dstIdx+2] * (1 - weight);
                            data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.OilSlickRainbow);
        }
    }
    
    const sync18 = (o) => {
        let f = o.filters?.find(x => x.type === 'OilSlickRainbow');
        if (!f) {
            f = new fabric.Image.filters.OilSlickRainbow({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.rainbowOpacity = o.retroSettings.rainbowOpacity;
            f.rippleAmp = o.retroSettings.rippleAmp;
            f.phase = o.retroSettings.phase;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('기름막 무지개 왜곡', [
        { id: 'rainbowOpacity', label: '무지개빛 강도', min: 0, max: 1, step: 0.05, value: obj.retroSettings.rainbowOpacity, inputType: 'range' },
        { id: 'rippleAmp', label: '물결 진폭 (px)', min: 0, max: 35, step: 1, value: obj.retroSettings.rippleAmp, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync18(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync18(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 4,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync18(o);
            }
        });
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 19번: 얼음 큐브 굴절 (Ice Cube Refraction)
window.applyRetroEffect19 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            cubeSize: 30, refraction: 8, phase: 0,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.cubeSize === undefined) mem.cubeSize = 30;
    if (mem.refraction === undefined) mem.refraction = 8;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.IceCubeRefract) {
        fabric.Image.filters.IceCubeRefract = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'IceCubeRefract',
            cubeSize: 30,
            refraction: 8,
            phase: 0,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const cubeSize = this.cubeSize;
                const refraction = this.refraction;
                const phase = this.phase;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                
                const pad = 10;
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        const blockX = Math.floor(x / cubeSize) * cubeSize;
                        const blockY = Math.floor(y / cubeSize) * cubeSize;
                        const centerX = blockX + cubeSize / 2;
                        const centerY = blockY + cubeSize / 2;
                        const dx = x - centerX;
                        const dy = y - centerY;
                        
                        let srcX = x - dx * (refraction * 0.03) + Math.sin(phase) * 1.5;
                        let srcY = y - dy * (refraction * 0.03) + Math.cos(phase) * 1.5;
                        
                        const px = sampleReflectionPixel(copyData, w, h, srcX, srcY, true);
                        if (px) {
                            let r = px[0];
                            let g = px[1];
                            let b = px[2];
                            
                            const distFromEdgeX = Math.min(x - blockX, blockX + cubeSize - x);
                            const distFromEdgeY = Math.min(y - blockY, blockY + cubeSize - y);
                            const edgeDist = Math.min(distFromEdgeX, distFromEdgeY);
                            
                            if (edgeDist < 2.5) {
                                const highlight = (3 - edgeDist) * 25;
                                r = Math.min(255, r + highlight);
                                g = Math.min(255, g + highlight);
                                b = Math.min(255, b + highlight);
                            }
                            
                            data[dstIdx] = r * weight + copyData[dstIdx] * (1 - weight);
                            data[dstIdx+1] = g * weight + copyData[dstIdx+1] * (1 - weight);
                            data[dstIdx+2] = b * weight + copyData[dstIdx+2] * (1 - weight);
                            data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.IceCubeRefract);
        }
    }
    
    const sync19 = (o) => {
        let f = o.filters?.find(x => x.type === 'IceCubeRefract');
        if (!f) {
            f = new fabric.Image.filters.IceCubeRefract({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.cubeSize = o.retroSettings.cubeSize;
            f.refraction = o.retroSettings.refraction;
            f.phase = o.retroSettings.phase;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('얼음 큐브 굴절', [
        { id: 'cubeSize', label: '얼음 크기 (px)', min: 10, max: 100, step: 2, value: obj.retroSettings.cubeSize, inputType: 'range' },
        { id: 'refraction', label: '굴절 정도', min: 0, max: 20, step: 1, value: obj.retroSettings.refraction, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync19(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync19(o);
        const startPhase = o.retroSettings.phase || 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: startPhase + Math.PI * 4,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync19(o);
            }
        });
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};

// 💡 20번: 비 오는 유리창 (Rainy Window)
window.applyRetroEffect20 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            dropletCount: 30, refraction: 20,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.dropletCount === undefined) mem.dropletCount = 30;
    if (mem.refraction === undefined) mem.refraction = 20;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.RainyWindow) {
        fabric.Image.filters.RainyWindow = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'RainyWindow',
            dropletCount: 30,
            refraction: 20,
            maskObj: null,
            applyTo: function(options) {
                if (!this.maskObj?.data) return;
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const dropletCount = this.dropletCount;
                const refraction = this.refraction;
                const maskObj = this.maskObj;
                
                const bounds = computeMaskBounds(maskObj);
                if (!bounds) return;
                const rect = maskBoundsToImageRect(bounds, w, h);
                const rw = Math.max(10, rect.maxX - rect.minX);
                const rh = Math.max(10, rect.maxY - rect.minY);
                
                // Seed a local deterministic PRNG based on rect bounds to ensure static droplets remain fixed
                let seed = Math.floor((rect.minX || 0) * 17 + (rect.minY || 0) * 31) || 99;
                const rnd = () => {
                    let t = seed += 0x6D2B79F5;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
                
                const drops = [];
                for (let i = 0; i < dropletCount; i++) {
                    const rX = rnd();
                    const rY = rnd();
                    const rR = rnd();
                    drops.push({
                        x: rect.minX + rX * rw,
                        y: rect.minY + rY * rh,
                        r: 6 + rR * 8 // Radius from 6px to 14px
                    });
                }
                
                // Pre-render droplet displacement/specular data to a flat coordinate map
                // R channel: dX offset (0 to 255, center 128)
                // G channel: dY offset (0 to 255, center 128)
                // B channel: specular highlight factor
                // A channel: opacity indicator (255 if inside drop)
                const mapData = new Uint8ClampedArray(w * h * 4);
                
                for (let i = 0; i < drops.length; i++) {
                    const drop = drops[i];
                    const dropX = Math.round(drop.x);
                    const dropY = Math.round(drop.y);
                    const r = Math.round(drop.r);
                    
                    const minX = Math.max(0, dropX - r);
                    const maxX = Math.min(w - 1, dropX + r);
                    const minY = Math.max(0, dropY - r);
                    const maxY = Math.min(h - 1, dropY + r);
                    
                    for (let dy = minY - dropY; dy <= maxY - dropY; dy++) {
                        for (let dx = minX - dropX; dx <= maxX - dropX; dx++) {
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < r) {
                                const targetX = dropX + dx;
                                const targetY = dropY + dy;
                                const idx = (targetY * w + targetX) * 4;
                                
                                const nx = dx / r;
                                const ny = dy / r;
                                
                                mapData[idx] = Math.round(nx * 127 + 128);
                                mapData[idx+1] = Math.round(ny * 127 + 128);
                                mapData[idx+2] = Math.round((1 - ny) * 20);
                                mapData[idx+3] = 255;
                            }
                        }
                    }
                }
                
                const pad = 15;
                const x0 = Math.max(0, Math.floor(rect.minX - pad));
                const y0 = Math.max(0, Math.floor(rect.minY - pad));
                const x1 = Math.min(w, Math.ceil(rect.maxX + pad));
                const y1 = Math.min(h, Math.ceil(rect.maxY + pad));
                
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(maskObj, x, y, w, h);
                        if (weight <= 0.001) continue;
                        
                        const aVal = mapData[dstIdx+3];
                        let finalSrcX = x;
                        let finalSrcY = y;
                        let maxHighlight = 0;
                        
                        if (aVal > 0) {
                            const nx = (mapData[dstIdx] - 128) / 127;
                            const ny = (mapData[dstIdx+1] - 128) / 127;
                            finalSrcX = x - nx * refraction;
                            finalSrcY = y - ny * refraction;
                            maxHighlight = mapData[dstIdx+2];
                        }
                        
                        const px = sampleReflectionPixel(copyData, w, h, finalSrcX, finalSrcY, true);
                        if (px) {
                            data[dstIdx] = Math.min(255, px[0] + maxHighlight) * weight + copyData[dstIdx] * (1 - weight);
                            data[dstIdx+1] = Math.min(255, px[1] + maxHighlight) * weight + copyData[dstIdx+1] * (1 - weight);
                            data[dstIdx+2] = Math.min(255, px[2] + maxHighlight) * weight + copyData[dstIdx+2] * (1 - weight);
                            data[dstIdx+3] = px[3] * weight + copyData[dstIdx+3] * (1 - weight);
                        }
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.RainyWindow);
        }
    }
    
    const sync20 = (o) => {
        let f = o.filters?.find(x => x.type === 'RainyWindow');
        if (!f) {
            f = new fabric.Image.filters.RainyWindow({ ...o.retroSettings });
            o.filters = [f];
        } else {
            f.dropletCount = o.retroSettings.dropletCount;
            f.refraction = o.retroSettings.refraction;
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('비 오는 유리창', [
        { id: 'dropletCount', label: '빗방울 밀도 (개수)', min: 5, max: 100, step: 5, value: obj.retroSettings.dropletCount, inputType: 'range' },
        { id: 'refraction', label: '굴절율 (돋보기 강도)', min: 5, max: 50, step: 1, value: obj.retroSettings.refraction, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync20(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync20(o);
    }, {
        validate: () => !!obj.retroSettings.maskObj?.data,
        validateMessage: '먼저 [영역 지정]으로 효과가 적용될 범위를 그린 뒤 완료해 주세요.'
    });
};


// 💡 21번 효과: 매직아이 제작 (31번 효과의 복제 배치)
window.applyRetroEffect21 = function(obj, settings, id) {
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = { stripWidth: 60, depthFactor: 15, hiddenText: "3D", depthMapData: null };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };

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

    window.mountRetroEffectStartButton(obj, settings, id, () => {
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
        obj.dirty = true;
        window.applyRetroImageFilterNow(obj);
    }, {
        validate: () => !!(isReady || obj.retroSettings.depthMapData),
        validateMessage: "먼저 '4. 🛠️ 심도 맵 만들기'로 형상을 준비해 주세요.",
        skipHint: true
    });
};


// 💡 22번: 일본식 미닫이 문 (Japanese Sliding Door)
window.applyRetroEffect22 = function(obj, settings, id) {
    if (typeof window.restoreFabricImageFromOriginal === 'function') window.restoreFabricImageFromOriginal(obj);
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            startPoint: 25,
            speed: 5,
            phase: 0,
            brushSize: 40,
            feather: 20,
            maskObj: null
        };
    }
    const mem = window.globalRetroMemory[id];
    if (mem.startPoint === undefined) mem.startPoint = 25;
    if (mem.speed === undefined) mem.speed = 5;
    if (mem.phase === undefined) mem.phase = 0;
    
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id, effectStarted: false };
    
    if (!fabric.Image.filters.SlidingDoor) {
        fabric.Image.filters.SlidingDoor = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'SlidingDoor',
            startPoint: 25,
            progress: 0,
            maskObj: null,
            applyTo: function(options) {
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                
                const startPoint = Number(this.startPoint);
                const progressLoop = Number(this.progress) % 25;
                
                // Shadow width in normalized coordinates (0 to 200 scale)
                const shadowWidthNorm = 12.0; 
                
                // Helper to render traditional Japanese Shoji wood frame and paper panel
                function getShojiColor(u, v, imgR, imgG, imgB, imgA) {
                    const borderX = 0.05; // 5% border width
                    const borderY = 0.04; // 4% border height
                    
                    const gridX = 0.012; // vertical lattice thickness
                    const gridY = 0.008; // horizontal lattice thickness
                    
                    // Check outer frame borders
                    const isBorder = (u < borderX || u > 1 - borderX || v < borderY || v > 1 - borderY);
                    
                    // Check vertical grid lines (2 lines: at 1/3 and 2/3)
                    const isVertGrid = (Math.abs(u - 0.33) < gridX || Math.abs(u - 0.66) < gridX);
                    
                    // Check horizontal grid lines (4 lines: at 0.2, 0.4, 0.6, 0.8)
                    const isHorizGrid = (
                        Math.abs(v - 0.2) < gridY || 
                        Math.abs(v - 0.4) < gridY || 
                        Math.abs(v - 0.6) < gridY || 
                        Math.abs(v - 0.8) < gridY
                    );
                    
                    if (isBorder || isVertGrid || isHorizGrid) {
                        // Warm wood frame brown with subtle grain variation
                        const grain = 1.0 + 0.08 * Math.sin(u * 120 + v * 240);
                        return {
                            r: Math.max(0, Math.min(255, Math.round(75 * grain))),
                            g: Math.max(0, Math.min(255, Math.round(45 * grain))),
                            b: Math.max(0, Math.min(255, Math.round(25 * grain))),
                            a: imgA
                        };
                    } else {
                        // Translucent white Shoji paper: blend with image content
                        const paperR = 248;
                        const paperG = 246;
                        const paperB = 240;
                        return {
                            r: Math.round(imgR * 0.85 + paperR * 0.15),
                            g: Math.round(imgG * 0.85 + paperG * 0.15),
                            b: Math.round(imgB * 0.85 + paperB * 0.15),
                            a: imgA
                        };
                    }
                }
                
                for (let y = 0; y < h; y++) {
                    const v = y / (h - 1);
                    for (let x = 0; x < w; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                        
                        let finalR = copyData[dstIdx];
                        let finalG = copyData[dstIdx+1];
                        let finalB = copyData[dstIdx+2];
                        let finalA = copyData[dstIdx+3];
                        
                        if (weight > 0.001) {
                            const xNorm = (x / (w - 1)) * 200 - 100;
                            let mappedX = null;
                            let doorK = null;
                            let doorShift = 0;
                            
                            if (xNorm >= 0) {
                                // Check doors from k = 4 down to 0 to find the topmost overlapping door first
                                for (let k = 4; k >= 0; k--) {
                                    const shift = progressLoop + 25 * k;
                                    const innerEdge = startPoint + shift;
                                    if (innerEdge > 100) continue;
                                    if (xNorm >= innerEdge) {
                                        doorK = k;
                                        doorShift = shift;
                                        const xOrigNorm = xNorm - shift;
                                        mappedX = Math.round(((xOrigNorm + 100) / 200) * (w - 1));
                                        break;
                                    }
                                }
                            } else {
                                // Left doors: check from k = 4 down to 0
                                for (let k = 4; k >= 0; k--) {
                                    const shift = progressLoop + 25 * k;
                                    const innerEdge = -startPoint - shift;
                                    if (innerEdge < -100) continue;
                                    if (xNorm <= innerEdge) {
                                        doorK = k;
                                        doorShift = shift;
                                        const xOrigNorm = xNorm + shift;
                                        mappedX = Math.round(((xOrigNorm + 100) / 200) * (w - 1));
                                        break;
                                    }
                                }
                            }
                            
                            let r = 0, g = 0, b = 0, a = 0;
                            if (mappedX !== null && doorK !== null) {
                                mappedX = Math.max(0, Math.min(w - 1, mappedX));
                                const srcIdx = (y * w + mappedX) * 4;
                                const srcR = copyData[srcIdx];
                                const srcG = copyData[srcIdx+1];
                                const srcB = copyData[srcIdx+2];
                                const srcA = copyData[srcIdx+3];
                                
                                const xOrigNorm = (xNorm >= 0) ? (xNorm - doorShift) : (xNorm + doorShift);
                                let uVal = 0;
                                if (xNorm >= 0) {
                                    uVal = (xOrigNorm - startPoint) / (100 - startPoint);
                                } else {
                                    uVal = (xOrigNorm + 100) / (100 - startPoint);
                                }
                                uVal = Math.max(0, Math.min(1, uVal));
                                
                                const shoji = getShojiColor(uVal, v, srcR, srcG, srcB, srcA);
                                r = shoji.r;
                                g = shoji.g;
                                b = shoji.b;
                                a = shoji.a;
                                
                                // Apply drop shadow from the door in front (doorK + 1)
                                if (doorK < 4) {
                                    let shadowFactor = 1.0;
                                    if (xNorm >= 0) {
                                        const frontEdge = startPoint + progressLoop + 25 * (doorK + 1);
                                        const dist = frontEdge - xNorm;
                                        if (dist > 0 && dist < shadowWidthNorm) {
                                            shadowFactor = 0.45 + 0.55 * (dist / shadowWidthNorm);
                                        }
                                    } else {
                                        const frontEdge = -startPoint - (progressLoop + 25 * (doorK + 1));
                                        const dist = xNorm - frontEdge;
                                        if (dist > 0 && dist < shadowWidthNorm) {
                                            shadowFactor = 0.45 + 0.55 * (dist / shadowWidthNorm);
                                        }
                                    }
                                    r = Math.round(r * shadowFactor);
                                    g = Math.round(g * shadowFactor);
                                    b = Math.round(b * shadowFactor);
                                }
                            } else {
                                r = 0; g = 0; b = 0; a = 0;
                            }
                            
                            finalR = r * weight + copyData[dstIdx] * (1 - weight);
                            finalG = g * weight + copyData[dstIdx+1] * (1 - weight);
                            finalB = b * weight + copyData[dstIdx+2] * (1 - weight);
                            finalA = a * weight + copyData[dstIdx+3] * (1 - weight);
                        }
                        
                        data[dstIdx] = finalR;
                        data[dstIdx+1] = finalG;
                        data[dstIdx+2] = finalB;
                        data[dstIdx+3] = finalA;
                    }
                }
            }
        });
        if (typeof registerFabricCustomFilterFromObject === 'function') {
            registerFabricCustomFilterFromObject(fabric.Image.filters.SlidingDoor);
        }
    }
    
    const sync22 = (o) => {
        let f = o.filters?.find(x => x.type === 'SlidingDoor');
        if (!f) {
            f = new fabric.Image.filters.SlidingDoor({
                startPoint: Number(o.retroSettings.startPoint),
                progress: Number(o.retroSettings.phase) * Number(o.retroSettings.speed),
                maskObj: o.retroSettings.maskObj
            });
            o.filters = [f];
        } else {
            f.startPoint = Number(o.retroSettings.startPoint);
            f.progress = Number(o.retroSettings.phase) * Number(o.retroSettings.speed);
            f.maskObj = o.retroSettings.maskObj;
        }
        o.dirty = true;
        window.applyRetroImageFilterNow(o);
    };
    
    window.showFilterControls('일본식 미닫이 문', [
        {
            id: 'startPoint',
            label: '출발점 설정',
            inputType: 'select',
            value: String(obj.retroSettings.startPoint),
            options: [
                { value: '0', label: '0 (중앙)' },
                { value: '25', label: '±25' },
                { value: '50', label: '±50' }
            ]
        },
        { id: 'speed', label: '열림 속도', min: 1, max: 20, step: 1, value: obj.retroSettings.speed, inputType: 'range' },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 경계선 흐림 (페더)', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        if (pid === 'startPoint') val = Number(val);
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.maskDrawState.tool === 'brush' && window.canvas.freeDrawingBrush) {
            window.canvas.freeDrawingBrush.width = val;
        }
        if (pid !== 'brushSize' && pid !== 'feather' && window.isRetroEffectStarted(obj)) {
            sync22(obj);
        }
    });
    
    setupMaskUI(id, obj);
    
    window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
        sync22(o);
        o.retroSettings.phase = 0;
        o.activeTween = gsap.to(o.retroSettings, {
            phase: 25 * s.duration,
            duration: s.duration,
            repeat: s.repeat,
            ease: 'none',
            onUpdate: () => {
                sync22(o);
            }
        });
    });
};
