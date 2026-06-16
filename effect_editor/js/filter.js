// 0. 마스크 블렌딩 커스텀 필터 정의
if (typeof fabric !== 'undefined' && fabric.Image && fabric.Image.filters) {
    fabric.Image.filters.MaskFilter = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
        type: 'MaskFilter',
        
        initialize: function(options) {
            options = options || {};
            this.maskObj = options.maskObj || null;
        },

        applyTo2d: function(options) {
            if (!this.maskObj || typeof window.getMaskWeightAt !== 'function') return;

            const imageData = options.imageData;
            const data = imageData.data;
            const w = imageData.width;
            const h = imageData.height;

            // 원본 이미지 픽셀 캐싱 (매번 재생성하지 않도록 동일 해상도 체크)
            if (!this._origData || this._origW !== w || this._origH !== h) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(options.originalEl, 0, 0, w, h);
                this._origData = tempCtx.getImageData(0, 0, w, h).data;
                this._origW = w;
                this._origH = h;
            }

            const origData = this._origData;

            for (let i = 0; i < w * h; i++) {
                const idx = i * 4;
                const x = i % w;
                const y = Math.floor(i / w);
                const weight = window.getMaskWeightAt(this.maskObj, x, y, w, h);

                if (weight < 1) {
                    data[idx] = Math.round(data[idx] * weight + origData[idx] * (1 - weight));
                    data[idx + 1] = Math.round(data[idx + 1] * weight + origData[idx + 1] * (1 - weight));
                    data[idx + 2] = Math.round(data[idx + 2] * weight + origData[idx + 2] * (1 - weight));
                    data[idx + 3] = Math.round(data[idx + 3] * weight + origData[idx + 3] * (1 - weight));
                }
            }
        }
    });

    fabric.Image.filters.MaskFilter.fromObject = function(object) {
        return new fabric.Image.filters.MaskFilter(object);
    };
}

// 1. 정적 필터 이름 100선 복구
const staticNames = {
    1: "VHS 글리치", 2: "브라운관(CRT)", 3: "세피아 톤", 4: "완전 흑백", 5: "필름 그레인",
    6: "거친 흑백", 7: "빛바랜 폴라로이드", 8: "블록 픽셀화", 9: "이미지 뒤집기", 10: "듀오톤(블루)",
    11: "듀오톤(레드)", 12: "듀오톤(그린)", 13: "대비 극대화", 14: "청사진(Cyan)", 15: "포스터라이즈 느낌",
    16: "솔라라이즈", 17: "어두운 테두리", 18: "노이즈 캔디", 19: "흐린 흑백", 20: "열화 텍스처",
    21: "흐린 날씨", 22: "안개/스모그", 23: "햇살 가득", 24: "수중 느낌(푸른빛)", 25: "황혼(노을빛)",
    26: "얼음 큐브(차가움)", 27: "모래 폭풍(누런 노이즈)", 28: "어두운 그림자", 29: "숲속(초록빛)", 30: "강한 흐림(심도)",
    31: "초점 나감", 32: "어지러움(노이즈+블러)", 33: "샤픈(날카롭게)", 34: "엣지 추출(네온)", 35: "엠보싱(입체감)",
    36: "강한 모자이크", 37: "소프트 블러", 38: "거친 픽셀", 39: "익명처리(모자이크)", 40: "윤곽선 강조",
    41: "유화 질감 대용", 42: "연필 스케치 톤", 43: "흑백 선화", 44: "강렬한 채도", 45: "스테인드글라스 톤",
    46: "적외선 카메라", 47: "야간 투시경(녹색)", 48: "화보 톤(크로스 프로세스)", 49: "차가운 도시", 50: "따뜻한 카페",
    51: "화사한 피부톤", 52: "색수차 톤", 53: "시네마틱 룩", 54: "빈티지 필름 룩", 55: "따뜻한 조명",
    56: "차가운 조명", 57: "사이버펑크(마젠타)", 58: "매트릭스(형광녹색)", 59: "채도 200%", 60: "흑백 대비 극대화",
    61: "약한 보케", 62: "소프트 포커스", 63: "HDR 과장", 64: "먼지 낀 렌즈", 65: "선명도 100%",
    66: "적색 강조", 67: "청색 강조", 68: "녹색 강조", 69: "빛 바랜 옐로우", 70: "과노출(하얗게)",
    71: "노출 부족(어둡게)", 72: "오래된 신문", 73: "보라색 틴트", 74: "핑크빛 무드", 75: "오렌지 선셋",
    76: "민트 초코", 77: "다크 블루", 78: "다크 레드", 79: "다크 그린", 80: "형광 옐로우",
    81: "페이드 아웃 느낌", 82: "고대 벽화", 83: "에메랄드 바다", 84: "심해 깊은 곳", 85: "우주 공간",
    86: "화성 표면", 87: "달빛 은은함", 88: "뱀파이어 룩", 89: "좀비 핏기없음", 90: "오로라 보라빛",
    91: "골드 러시", 92: "실버 메탈릭", 93: "브론즈 빈티지", 94: "마젠타 쇼크", 95: "형광 페인트",
    96: "탁한 회색빛", 97: "밝은 파스텔", 98: "다크 판타지", 99: "애니메이션 톤", 100: "색상 완전 반전"
};

// 2. 정적 필터 프리셋 복구
const staticPresets = {
    1: { noise: 150, saturation: 0.5, hue: 0.1 }, 2: { noise: 80, contrast: 0.2, brightness: -0.05 },
    3: { sepia: true, brightness: 0.05 }, 4: { saturation: -1, contrast: 0.1 }, 5: { noise: 300, saturation: -0.5 },
    6: { saturation: -1, contrast: 0.4, noise: 100 }, 7: { sepia: true, brightness: 0.1, contrast: -0.2 },
    8: { pixelate: 10 }, 10: { saturation: -1, tint: '#0044ff', tintAlpha: 0.5 },
    11: { saturation: -1, tint: '#ff0000', tintAlpha: 0.5 }, 12: { saturation: -1, tint: '#00ff00', tintAlpha: 0.5 },
    13: { contrast: 0.8 }, 14: { saturation: -1, tint: '#00ffff', tintAlpha: 0.6 }, 15: { contrast: 0.5, saturation: 1, pixelate: 2 },
    16: { invert: true, hue: 0.5 }, 17: { brightness: -0.3, contrast: 0.4 }, 18: { noise: 400, hue: 0.8 },
    19: { saturation: -1, blur: 0.1 }, 20: { noise: 200, contrast: 0.3, sepia: true },
    21: { brightness: 0.2, contrast: -0.4, blur: 0.3 }, 22: { brightness: 0.1, tint: '#ffcc00', tintAlpha: 0.3 },
    23: { tint: '#00bcd4', tintAlpha: 0.4 }, 24: { tint: '#ff9800', tintAlpha: 0.3, saturation: 0.5 },
    25: { tint: '#0055ff', tintAlpha: 0.2, brightness: 0.1 }, 26: { tint: '#cddc39', tintAlpha: 0.3, noise: 200 },
    27: { brightness: -0.4, contrast: 0.2 }, 28: { tint: '#228b22', tintAlpha: 0.3 }, 29: { blur: 0.6 },
    30: { blur: 0.2 }, 31: { blur: 0.4, brightness: 0.1 }, 32: { blur: 0.3, noise: 150 },
    33: { matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }, 34: { matrix: [-1, -1, -1, -1, 8, -1, -1, -1, -1], saturation: -1 },
    35: { matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1] }, 36: { pixelate: 25 }, 37: { blur: 0.1, brightness: 0.05 },
    38: { pixelate: 15, noise: 50 }, 39: { pixelate: 30, blur: 0.1 }, 40: { contrast: 0.6, matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
    41: { pixelate: 3, blur: 0.1, contrast: 0.2 }, 42: { saturation: -1, contrast: 0.5, noise: 80 }, 43: { saturation: -1, contrast: 0.8 },
    44: { saturation: 1.5 }, 45: { saturation: 1, contrast: 0.5, tint: '#8a2be2', tintAlpha: 0.2 },
    46: { invert: true, hue: -0.5 }, 47: { tint: '#00ff00', tintAlpha: 0.6, saturation: -1, noise: 100 },
    48: { contrast: 0.3, tint: '#ff00ff', tintAlpha: 0.2 }, 49: { tint: '#00aaff', tintAlpha: 0.2, saturation: -0.3 },
    50: { tint: '#d2b48c', tintAlpha: 0.3, sepia: true }, 51: { brightness: 0.1, contrast: 0.1, saturation: 0.2 },
    52: { hue: 0.2, blur: 0.05, contrast: 0.2 }, 53: { contrast: 0.3, saturation: -0.2, tint: '#002244', tintAlpha: 0.2 },
    54: { sepia: true, noise: 50, contrast: 0.1 }, 55: { tint: '#ffa500', tintAlpha: 0.2 }, 56: { tint: '#add8e6', tintAlpha: 0.2 },
    57: { hue: -0.8, saturation: 1, contrast: 0.3 }, 58: { tint: '#00ff00', tintAlpha: 0.5, saturation: -1, contrast: 0.5 },
    59: { saturation: 2 }, 60: { saturation: -1, contrast: 1 }, 61: { blur: 0.15, brightness: 0.05 },
    62: { blur: 0.05, contrast: -0.1 }, 63: { contrast: 0.7, saturation: 0.5 }, 64: { noise: 100, blur: 0.05, sepia: true },
    65: { matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0], contrast: 0.2 }, 66: { tint: '#ff0000', tintAlpha: 0.4 },
    67: { tint: '#0000ff', tintAlpha: 0.4 }, 68: { tint: '#00ff00', tintAlpha: 0.4 }, 69: { tint: '#ffff00', tintAlpha: 0.3, sepia: true },
    70: { brightness: 0.6 }, 71: { brightness: -0.6 }, 72: { sepia: true, noise: 150, saturation: -0.8 },
    73: { tint: '#800080', tintAlpha: 0.4 }, 74: { tint: '#ffc0cb', tintAlpha: 0.3 }, 75: { tint: '#ff4500', tintAlpha: 0.3 },
    76: { tint: '#00ff7f', tintAlpha: 0.3 }, 77: { tint: '#00008b', tintAlpha: 0.5, brightness: -0.2 },
    78: { tint: '#8b0000', tintAlpha: 0.5, brightness: -0.2 }, 79: { tint: '#006400', tintAlpha: 0.5, brightness: -0.2 },
    80: { tint: '#ccff00', tintAlpha: 0.3, saturation: 1 }, 81: { brightness: 0.3, contrast: -0.4 },
    82: { sepia: true, contrast: 0.4, noise: 50 }, 83: { tint: '#50c878', tintAlpha: 0.4 }, 84: { tint: '#000033', tintAlpha: 0.6 },
    85: { tint: '#0a0a2a', tintAlpha: 0.5, noise: 100 }, 86: { tint: '#cc3300', tintAlpha: 0.4, contrast: 0.2 },
    87: { tint: '#e6e6fa', tintAlpha: 0.2, brightness: -0.1 }, 88: { saturation: -0.8, contrast: 0.3, tint: '#8a0303', tintAlpha: 0.2 },
    89: { saturation: -0.5, brightness: -0.1, tint: '#556b2f', tintAlpha: 0.2 }, 90: { hue: 0.7, saturation: 0.5 },
    91: { tint: '#ffd700', tintAlpha: 0.3, contrast: 0.2 }, 92: { saturation: -1, contrast: 0.3, brightness: 0.1 },
    93: { sepia: true, contrast: 0.5, tint: '#8b4513', tintAlpha: 0.2 }, 94: { tint: '#ff00ff', tintAlpha: 0.4, contrast: 0.3 },
    95: { saturation: 1.5, contrast: 0.3, tint: '#00ffcc', tintAlpha: 0.2 }, 96: { saturation: -0.5, brightness: -0.2, blur: 0.05 },
    97: { brightness: 0.2, contrast: -0.2, saturation: 0.2 }, 98: { brightness: -0.4, contrast: 0.5, saturation: -0.3 },
    99: { contrast: 0.6, saturation: 0.8, pixelate: 2 }, 100: { invert: true }
};

window.motionEditorStaticPresets = staticPresets;
window.motionEditorStaticNames = staticNames;

// ... 이하 기존 renderFilters 및 물결 효과 이벤트 로직 유지 ...

const staticContainer = document.getElementById('static-filters-container');
if (staticContainer) {
    for (let i = 1; i <= 100; i++) {
        const btn = document.createElement('button'); btn.innerText = `${i}. ${staticNames[i] || `정적 효과 ${i}`}`;
        btn.style.background = "#00bcd4"; btn.style.color = "#000"; btn.style.fontWeight = "bold";
        btn.onclick = () => window.applyStaticFilter(i); staticContainer.appendChild(btn);
    }
}

function mountFlipFilterOptionButtons(obj) {
    const container = document.getElementById('filter-sliders');
    if (!container || !obj) return;
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexWrap = 'wrap';
    wrap.style.gap = '6px';
    wrap.style.marginBottom = '4px';

    const memKey = 'static-9';
    const saveFlipMemory = () => {
        window.globalRetroMemory = window.globalRetroMemory || {};
        window.globalRetroMemory[memKey] = {
            flipRotation: obj.filterSettings.flipRotation || 0,
            flipX: !!obj.filterSettings.flipX,
            flipY: !!obj.filterSettings.flipY
        };
    };

    const applyFlipNow = () => {
        saveFlipMemory();
        obj._staticFilterStarted = true;
        obj.retroSettings = obj.retroSettings || {};
        obj.retroSettings.effectStarted = true;
        obj.retroSettings.activeFxId = 'static-9';
        if (typeof window.renderFlipFilter === 'function') {
            window.renderFlipFilter(obj);
        }
        if (typeof obj._syncRetroTransportUi === 'function') {
            obj._syncRetroTransportUi();
        }
    };

    const mkBtn = (label, onClick) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'flex:1 1 45%;padding:9px 6px;background:#374151;color:#fff;border:1px solid #00bcd4;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;';
        b.onclick = onClick;
        return b;
    };

    wrap.appendChild(mkBtn('90°씩 회전', () => {
        obj.filterSettings.flipRotation = ((obj.filterSettings.flipRotation || 0) + 90) % 360;
        applyFlipNow();
    }));
    wrap.appendChild(mkBtn('상하반전', () => {
        obj.filterSettings.flipY = !obj.filterSettings.flipY;
        applyFlipNow();
    }));
    wrap.appendChild(mkBtn('좌우반전', () => {
        obj.filterSettings.flipX = !obj.filterSettings.flipX;
        applyFlipNow();
    }));
    wrap.appendChild(mkBtn('원본', () => {
        obj.filterSettings.flipRotation = 0;
        obj.filterSettings.flipX = false;
        obj.filterSettings.flipY = false;
        saveFlipMemory();
        const source = obj._flipSourceCanvas;
        if (source) {
            obj.filters = [];
            obj.setElement(source);
            obj.originalElement = source;
            obj.set({
                width: source.width,
                height: source.height,
                angle: 0,
                flipX: false,
                flipY: false,
                skewX: 0,
                skewY: 0
            });
            obj._staticFilterStarted = true;
            obj.retroSettings = obj.retroSettings || {};
            obj.retroSettings.effectStarted = true;
            obj.retroSettings.activeFxId = 'static-9';
            obj.dirty = true;
            window.canvas?.requestRenderAll();
            if (typeof obj._syncRetroTransportUi === 'function') {
                obj._syncRetroTransportUi();
            }
        }
    }));
    container.appendChild(wrap);
}

function pinFlipSourceCanvas(obj) {
    if (!obj || obj._flipSourceCanvas) return obj._flipSourceCanvas;
    const src = typeof window.ensureFabricOriginalElement === 'function'
        ? window.ensureFabricOriginalElement(obj)
        : obj.originalElement;
    if (!src || !window.isImageElementReadable?.(src)) return null;
    obj._flipSourceCanvas = window.cloneElementToCanvas(src);
    return obj._flipSourceCanvas;
}

function applyStaticFlipFilter(obj) {
    if (typeof window.haltRetroEffectMotion === 'function') window.haltRetroEffectMotion(obj);
    const prevFx = obj.retroSettings?.activeFxId;
    if (prevFx !== 'static-9') {
        if (typeof window.resetRetroVisualForSetup === 'function') {
            window.resetRetroVisualForSetup(obj);
        }
        delete obj._flipSourceCanvas;
    }
    pinFlipSourceCanvas(obj);

    const memKey = 'static-9';
    window.globalRetroMemory = window.globalRetroMemory || {};
    if (!window.globalRetroMemory[memKey]) {
        window.globalRetroMemory[memKey] = { flipRotation: 0, flipX: false, flipY: false };
    }
    const mem = window.globalRetroMemory[memKey];

    obj.filterSettings = {
        flipRotation: mem.flipRotation || 0,
        flipX: !!mem.flipX,
        flipY: !!mem.flipY
    };
    obj._staticFilterStarted = false;
    obj.retroSettings = obj.retroSettings || {};
    obj.retroSettings.activeFxId = 'static-9';

    window.showFilterControls('🔄 이미지 뒤집기', [], () => {});
    mountFlipFilterOptionButtons(obj);

    const settings = typeof window.getTimelineSettings === 'function'
        ? window.getTimelineSettings()
        : { duration: 3, repeat: 0 };

    if (typeof window.mountRetroEffectStartButton === 'function') {
        window.mountRetroEffectStartButton(obj, settings, 'static-9', () => {
            obj._staticFilterStarted = true;
            window.renderFlipFilter(obj);
        });
    }

    const hasTransform = (mem.flipRotation || 0) !== 0 || mem.flipX || mem.flipY;
    if (hasTransform) {
        obj._staticFilterStarted = true;
        obj.retroSettings.effectStarted = true;
        window.renderFlipFilter(obj);
    }
}

window.renderFlipFilter = function(obj) {
    if (!obj || obj.type !== 'image') return;
    let source = obj._flipSourceCanvas || pinFlipSourceCanvas(obj);
    if (!source || !window.isImageElementReadable?.(source)) return;

    const w = source.width;
    const h = source.height;
    const rot = ((obj.filterSettings?.flipRotation || 0) % 360 + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const cw = swap ? h : w;
    const ch = swap ? w : h;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(obj.filterSettings?.flipX ? -1 : 1, obj.filterSettings?.flipY ? -1 : 1);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);

    obj.filters = [];
    obj.setElement(canvas);
    obj.originalElement = source;
    obj.set({
        width: cw,
        height: ch,
        angle: 0,
        flipX: false,
        flipY: false,
        skewX: 0,
        skewY: 0
    });
    obj._cacheCanvas = null;
    obj._cacheContext = null;
    if (obj._filteredEl) obj._filteredEl = null;
    obj.dirty = true;
    window.canvas?.requestRenderAll();
};

window.applyStaticFilter = function(id) {
    if (typeof window.releaseCanvasInteraction === 'function') window.releaseCanvasInteraction();
    const obj = window.canvas.getActiveObject(); if (!obj || obj.type !== 'image') return alert("이 효과는 '이미지' 객체에만 적용할 수 있습니다.");
    if (id === 9) {
        applyStaticFlipFilter(obj);
        return;
    }
    const p = staticPresets[id] || {};

    if (typeof window.haltRetroEffectMotion === 'function') window.haltRetroEffectMotion(obj);
    if (typeof window.resetRetroVisualForSetup === 'function') window.resetRetroVisualForSetup(obj);

    obj.filterSettings = {
        brightness: p.brightness || 0, contrast: p.contrast || 0, saturation: p.saturation !== undefined ? p.saturation : 0,
        hue: p.hue || 0, noise: p.noise || 0, pixelate: p.pixelate || 1, blur: p.blur || 0,
        sepia: p.sepia || false, invert: p.invert || false, matrix: p.matrix || null, tint: p.tint || null, tintAlpha: p.tintAlpha || 0
    };
    obj._staticFilterStarted = false;

    // 마스크 설정 저장/복구를 위해 retroSettings 초기화
    obj.retroSettings = obj.retroSettings || {};
    obj.retroSettings.activeFxId = 'static-' + id;
    if (!window.globalRetroMemory['static-' + id]) {
        window.globalRetroMemory['static-' + id] = { maskObj: null, holeMaskShape: null, brushSize: 40, feather: 20 };
    }
    obj.retroSettings.maskObj = window.globalRetroMemory['static-' + id].maskObj;
    obj.retroSettings.holeMaskShape = window.globalRetroMemory['static-' + id].holeMaskShape;
    obj.retroSettings.brushSize = window.globalRetroMemory['static-' + id].brushSize || 40;
    obj.retroSettings.feather = window.globalRetroMemory['static-' + id].feather || 20;

    const settings = typeof window.getTimelineSettings === 'function'
        ? window.getTimelineSettings()
        : { duration: 3, repeat: 0 };

    window.showFilterControls(`🎨 ${staticNames[id] || `필터 ${id}`} 미세조정`, [
        { id: 'brightness', label: '밝기 (-1 ~ 1)', min: -1, max: 1, step: 0.05, value: obj.filterSettings.brightness },
        { id: 'contrast', label: '대비 (-1 ~ 1)', min: -1, max: 1, step: 0.05, value: obj.filterSettings.contrast },
        { id: 'saturation', label: '채도 (색상 농도)', min: -1, max: 2, step: 0.1, value: obj.filterSettings.saturation },
        { id: 'hue', label: '색조 변경(Hue)', min: -2, max: 2, step: 0.1, value: obj.filterSettings.hue },
        { id: 'noise', label: '노이즈', min: 0, max: 500, step: 10, value: obj.filterSettings.noise },
        { id: 'pixelate', label: '모자이크(픽셀화)', min: 1, max: 50, step: 1, value: obj.filterSettings.pixelate },
        { id: 'blur', label: '흐림(블러)', min: 0, max: 1, step: 0.05, value: obj.filterSettings.blur },
        { id: 'brushSize', label: '🖌️ 붓 크기', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: '☁️ 페더', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (paramId, val) => {
        if (paramId === 'brushSize' || paramId === 'feather') {
            obj.retroSettings[paramId] = val;
            window.globalRetroMemory['static-' + id][paramId] = val;
            if (paramId === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) {
                window.canvas.freeDrawingBrush.width = val;
            }
        } else {
            obj.filterSettings[paramId] = val;
            if (obj._staticFilterStarted) window.renderFilters(obj);
        }
    });

    // 마스크 영역 선택 UI를 세부 조절 패널 하단에 마운트
    if (typeof window.setupMaskUI === 'function') {
        window.setupMaskUI('static-' + id, obj);
    }

    if (typeof window.mountRetroEffectStartButton === 'function') {
        window.mountRetroEffectStartButton(obj, settings, 'static-' + id, () => {
            obj._staticFilterStarted = true;
            window.renderFilters(obj);
        });
    }
};

window.renderFilters = function(obj) {
    // 💡 정적 필터 조작 시 발생하는 픽셀 연산 경고를 완벽히 해결하기 위해 내부 캔버스 속성을 가속합니다.
    const canvas2dBackend = fabric.filterBackend;
    if (canvas2dBackend && canvas2dBackend._canvas) {
        canvas2dBackend._context = canvas2dBackend._canvas.getContext('2d', { willReadFrequently: true });
    }

    const s = obj.filterSettings; const f = fabric.Image.filters; obj.filters = [];
    if (s.brightness !== 0) obj.filters.push(new f.Brightness({ brightness: s.brightness }));
    if (s.contrast !== 0) obj.filters.push(new f.Contrast({ contrast: s.contrast }));
    if (s.saturation !== 0) obj.filters.push(new f.Saturation({ saturation: s.saturation }));
    if (s.hue !== 0) obj.filters.push(new f.HueRotation({ rotation: s.hue }));
    if (s.noise > 0) obj.filters.push(new f.Noise({ noise: s.noise }));
    if (s.pixelate > 1) obj.filters.push(new f.Pixelate({ blocksize: s.pixelate }));
    if (s.blur > 0) obj.filters.push(new f.Blur({ blur: s.blur }));
    if (s.sepia) obj.filters.push(new f.Sepia());
    if (s.invert) obj.filters.push(new f.Invert());
    if (s.tint) obj.filters.push(new f.BlendColor({ color: s.tint, mode: 'tint', alpha: s.tintAlpha }));
    if (s.matrix) obj.filters.push(new f.Convolute({ matrix: s.matrix }));

    // 마스크가 지정되어 있다면 MaskFilter를 추가합니다.
    if (obj.retroSettings?.maskObj && f.MaskFilter) {
        obj.filters.push(new f.MaskFilter({ maskObj: obj.retroSettings.maskObj }));
    }

    obj.applyFilters(); window.canvas.renderAll();
};

window.applyWaterFilterEffect = function() {
    window.applyRetroFx(3);
};

const waterFilterBtn = document.getElementById('water-filter-btn');
if (waterFilterBtn) waterFilterBtn.addEventListener('click', window.applyWaterFilterEffect);