// 💡 [핵심] 브라우저의 픽셀 연산 경고(willReadFrequently)를 원천 차단하는 전역 해킹 코드
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(type, attributes) {
    if (type === '2d') {
        attributes = Object.assign({}, attributes || {}, { willReadFrequently: true });
    }
    return originalGetContext.call(this, type, attributes);
};

// ----------------------------------------------------------------------
window.getFormattedDateString = function() {
    const d = new Date();
    const yy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yy}${mm}${dd}_${hh}${min}${ss}`;
};

window.getImageSaveName = function(extension, defaultPrefix = 'edit', specificBaseName = null) {
    let baseName = specificBaseName;
    if (!baseName) {
        const obj = window.canvas ? window.canvas.getActiveObject() : null;
        if (obj && obj.sourceFileName) {
            baseName = obj.sourceFileName.replace(/\.[^/.]+$/, "");
        }
    }
    const dateStr = window.getFormattedDateString();
    if (baseName && baseName.trim() !== '' && baseName !== 'edited-image') {
        return `${baseName}_${dateStr}.${extension}`;
    } else {
        return `${defaultPrefix}_${dateStr}.${extension}`;
    }
};
// ----------------------------------------------------------------------

window.canvas = new fabric.Canvas('main-canvas', { backgroundColor: null, preserveObjectStacking: true });

window.isFabricObjectOnCanvas = function (obj) {
    return !!(obj && window.canvas && obj.canvas === window.canvas);
};

window.safeApplyImageFilters = function (obj) {
    if (!obj || obj.type !== 'image') return false;
    if (!window.isFabricObjectOnCanvas(obj)) return false;
    if (!obj.filters || !obj.filters.length) {
        obj.dirty = true;
        return true;
    }
    if (obj.filters.some((f) => !f || typeof f.applyTo !== 'function')) {
        obj.filters = obj.filters.filter((f) => f && typeof f.applyTo === 'function');
        if (!obj.filters.length) return false;
    }
    try {
        obj.applyFilters();
        obj.dirty = true;
        return true;
    } catch (err) {
        console.warn('[effect] applyFilters skipped:', err);
        return false;
    }
};
fabric.filterBackend = new fabric.Canvas2dFilterBackend();
if (fabric.IText) {
    fabric.IText.prototype.set({
        paintFirst: 'stroke',
        strokeLineJoin: 'round',
        strokeLineCap: 'round',
        strokeMiterLimit: 2,
        strokeUniform: true
    });
}

const SUBTITLE_PRESETS_KEY = 'subtitlePresets';

function getSubtitlePresetsFromStorage() {
    try {
        return JSON.parse(localStorage.getItem(SUBTITLE_PRESETS_KEY) || '{}');
    } catch (_) {
        return {};
    }
}

function refreshEffectSubtitlePresetSelect() {
    const sel = document.getElementById('effect-preset-select');
    if (!sel) return;
    const presets = getSubtitlePresetsFromStorage();
    const prev = sel.value;
    sel.innerHTML = '<option value="">자막 프리셋…</option>';
    Object.keys(presets).sort((a, b) => a.localeCompare(b, 'ko')).forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
    });
    if (prev && presets[prev]) sel.value = prev;
}

function refreshTextPresetSelect() {
    const sel = document.getElementById('propTextPresetSelect');
    if (!sel) return;
    const presets = getSubtitlePresetsFromStorage();
    const prev = sel.value;
    sel.innerHTML = '<option value="">프리셋선택</option>';
    Object.keys(presets).sort((a, b) => a.localeCompare(b, 'ko')).forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name.length > 5 ? name.substring(0, 5) + '...' : name;
        sel.appendChild(opt);
    });
    if (prev && presets[prev]) sel.value = prev;
}

/** 메인 편집기와 동일 localStorage 프리셋을 fabric IText에 적용 (위치·문구는 기본 유지) */
window.applySubtitlePresetToFabricText = function (obj, presetName, options) {
    const opts = options || {};
    const presets = getSubtitlePresetsFromStorage();
    const p = presets[presetName];
    if (!p || !obj || obj.type !== 'i-text') return false;

    const keepText = opts.keepText !== false;
    const keepPosition = opts.keepPosition !== false;

    const bOp = p.baseOpacity !== undefined ? p.baseOpacity : (p.opacity != null ? p.opacity : 1);
    const bSx = p.baseScaleX !== undefined ? p.baseScaleX : (p.scaleX != null ? p.scaleX : 1);
    const bSy = p.baseScaleY !== undefined ? p.baseScaleY : (p.scaleY != null ? p.scaleY : 1);
    const bAng = p.baseAngle !== undefined ? p.baseAngle : (p.angle != null ? p.angle : 0);

    const patch = {
        fontFamily: p.fontFamily,
        fontSize: p.fontSize,
        fill: p.fill,
        charSpacing: p.charSpacing,
        strokeWidth: p.strokeWidth,
        stroke: p.stroke,
        lineHeight: p.lineHeight,
        fontWeight: p.fontWeight || 'normal',
        fontStyle: p.fontStyle || 'normal',
        textAlign: p.textAlign || 'left',
        opacity: bOp,
        scaleX: bSx,
        scaleY: bSy,
        angle: bAng
    };
    if (!keepText && p.text !== undefined) {
        patch.text = p.text;
        patch.styles = p.styles ? JSON.parse(JSON.stringify(p.styles)) : {};
    }
    if (!keepPosition) {
        patch.left = p.baseLeft !== undefined ? p.baseLeft : (p.left != null ? p.left : obj.left);
        patch.top = p.baseTop !== undefined ? p.baseTop : (p.top != null ? p.top : obj.top);
    }

    obj.set(patch);

    if (p.shadow) {
        obj.set('shadow', new fabric.Shadow({
            blur: p.shadow.blur !== undefined ? p.shadow.blur : 0,
            offsetX: p.shadow.offsetX !== undefined ? p.shadow.offsetX : (p.shadow.blur || 0),
            offsetY: p.shadow.offsetY !== undefined ? p.shadow.offsetY : (p.shadow.blur || 0),
            color: p.shadow.color
        }));
    } else {
        obj.set('shadow', null);
    }

    obj.setCoords();
    return true;
};

window.isPathVisible = true;
const wrapper = document.getElementById('canvas-wrapper');
const resolutionSelect = document.getElementById('resolution');
const RESOLUTION_STORAGE_KEY = 'motionEditor.effectEditor.resolution';

function saveEffectEditorResolution() {
    const v = resolutionSelect?.value;
    if (!v) return;
    try { localStorage.setItem(RESOLUTION_STORAGE_KEY, v); } catch (_) { /* noop */ }
}

function getEffectEditorResolution() {
    return resolutionSelect?.value || null;
}

window.saveEffectEditorResolution = saveEffectEditorResolution;
window.getEffectEditorResolution = getEffectEditorResolution;

function applyEffectEditorResolution(value) {
    if (!value || !resolutionSelect) return false;
    let found = false;
    for (const opt of resolutionSelect.options) {
        if (opt.value === value) {
            found = true;
            break;
        }
    }
    if (!found) {
        const opt = document.createElement('option');
        opt.value = value;
        const [w, h] = value.split('x');
        opt.textContent = `${w}x${h} (Custom)`;
        resolutionSelect.appendChild(opt);
    }
    resolutionSelect.value = value;
    updateCanvasSize();
    saveEffectEditorResolution();
    return true;
}
window.applyEffectEditorResolution = applyEffectEditorResolution;

function restoreEffectEditorResolution() {
    if (!resolutionSelect) return;
    try {
        const saved = localStorage.getItem(RESOLUTION_STORAGE_KEY);
        if (!saved) return;
        let found = false;
        for (const opt of resolutionSelect.options) {
            if (opt.value === saved) {
                found = true;
                break;
            }
        }
        if (!found) {
            const opt = document.createElement('option');
            opt.value = saved;
            const [w, h] = saved.split('x');
            opt.textContent = `${w}x${h} (Custom)`;
            resolutionSelect.appendChild(opt);
        }
        resolutionSelect.value = saved;
    } catch (_) { /* noop */ }
}

function getCanvasViewportSize() {
    const pad = 16;
    const areas = [wrapper, wrapper?.parentElement, document.querySelector('.center-wrapper')];
    for (const el of areas) {
        if (!el) continue;
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (w > pad && h > pad) return { w, h };
    }
    const embedBar = document.getElementById('embed-apply-bar');
    const topInset = embedBar ? embedBar.offsetHeight : 0;
    return {
        w: Math.max(320, window.innerWidth - 500),
        h: Math.max(240, window.innerHeight - topInset - 80)
    };
}

let canvasSizeRaf = 0;
function updateCanvasSize() {
    if (canvasSizeRaf) return;
    canvasSizeRaf = requestAnimationFrame(() => {
        canvasSizeRaf = 0;
        if (!window.canvas) return;

        const detailModeCheckbox = document.getElementById('detail-page-mode');
        const isDetailMode = detailModeCheckbox ? detailModeCheckbox.checked : false;

        let logicalW, logicalH;

        if (isDetailMode) {
            const wInput = document.getElementById('detail-width');
            const hInput = document.getElementById('detail-height');
            logicalW = wInput ? parseInt(wInput.value) || 900 : 900;
            logicalH = hInput ? parseInt(hInput.value) || 2000 : 2000;
        } else {
            if (!resolutionSelect?.value) return;
            [logicalW, logicalH] = resolutionSelect.value.split('x').map(Number);
        }

        if (!logicalW || !logicalH) return;

        window.canvas.setZoom(1);
        window.canvas.setDimensions({ width: logicalW, height: logicalH });

        const vp = getCanvasViewportSize();
        const margin = 20;

        let scale;
        if (isDetailMode) {
            // 상세페이지 모드에서는 가로폭에 맞춰 스케일링 (세로는 부모 컨테이너가 스크롤)
            const fitScale = (vp.w - margin) / logicalW;
            scale = Number.isFinite(fitScale) && fitScale > 0 ? Math.min(1.0, fitScale) : 1.0;
        } else {
            const fitScale = Math.min((vp.w - margin) / logicalW, (vp.h - margin) / logicalH);
            scale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 0.05;
        }

        window.canvas.setDimensions({
            width: `${logicalW * scale}px`,
            height: `${logicalH * scale}px`
        }, { cssOnly: true });
        window.canvas.calcOffset();
        window.canvas.requestRenderAll();
    });
}
window.updateEffectEditorCanvasSize = updateCanvasSize;
window.addEventListener('resize', updateCanvasSize);
if (typeof ResizeObserver !== 'undefined' && wrapper) {
    const fitObserver = new ResizeObserver(() => updateCanvasSize());
    fitObserver.observe(wrapper);
    if (wrapper.parentElement) fitObserver.observe(wrapper.parentElement);
}
restoreEffectEditorResolution();
resolutionSelect.addEventListener('change', () => {
    saveEffectEditorResolution();
    updateCanvasSize();
});
updateCanvasSize();

window.onload = () => {
    updateCanvasSize();
    requestAnimationFrame(updateCanvasSize);
    setTimeout(updateCanvasSize, 100);
    setTimeout(updateCanvasSize, 400);
};

gsap.registerPlugin(MotionPathPlugin);
window.canvas.freeDrawingBrush.color = '#ffeb3b';
window.canvas.freeDrawingBrush.width = 4;

document.getElementById('draw-mode-btn').addEventListener('click', function() {
    window.canvas.isDrawingMode = !window.canvas.isDrawingMode;
    if (window.canvas.isDrawingMode) {
        this.style.background = "#d32f2f";
        this.innerText = "✏️ 선 긋기 종료";
    } else {
        this.style.background = "#9c27b0";
        this.innerText = "✏️ 마우스로 선 긋기";
        window.canvas.discardActiveObject(); 
        window.canvas.defaultCursor = 'default'; 
        window.canvas.requestRenderAll();
    }
});

window.canvas.on('path:created', function(e) {
    window.canvas.sendToBack(e.path);
    window.canvas.discardActiveObject();
    window.canvas.requestRenderAll();
});

document.getElementById('toggle-path-btn').addEventListener('click', function() {
    window.isPathVisible = !window.isPathVisible;
    window.canvas.getObjects().forEach(o => {
        if (o.type === 'path') o.set('visible', window.isPathVisible);
    });
    window.canvas.renderAll();
    this.innerText = window.isPathVisible ? "👁️ 가이드선 숨기기" : "👁️ 가이드선 보이기";
    this.style.background = window.isPathVisible ? "#009688" : "#757575";
});

window.saveBaseState = function(obj) {
    if (!obj) return;
    if (!gsap.isTweening(obj)) {
        obj.baseState = {
            left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY, angle: obj.angle, opacity: obj.opacity
        };
    }
};
window.canvas.on('object:added', (e) => window.saveBaseState(e.target));
window.canvas.on('object:modified', (e) => window.saveBaseState(e.target));
window.canvas.on('object:removed', (e) => {
    const obj = e.target;
    if (obj && typeof window.haltRetroEffectMotion === 'function') {
        window.haltRetroEffectMotion(obj);
    }
});

window.isImageElementReadable = function(el) {
    if (!el) return false;
    if (el instanceof HTMLCanvasElement) return el.width > 0 && el.height > 0;
    if (el instanceof HTMLImageElement) return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
    if (el instanceof HTMLVideoElement) return el.readyState >= 2 && el.videoWidth > 0 && el.videoHeight > 0;
    return false;
};

window.cloneElementToCanvas = function(el) {
    if (!window.isImageElementReadable(el)) return null;
    const w = el.naturalWidth || el.videoWidth || el.width;
    const h = el.naturalHeight || el.videoHeight || el.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(el, 0, 0, w, h);
    return canvas;
};

window.ensureFabricOriginalElement = function(obj) {
    if (!obj || obj.type !== 'image') return null;
    const current = obj.originalElement;
    if (current instanceof HTMLCanvasElement && current.width > 0 && current.height > 0) {
        return current;
    }
    const candidates = [current, obj.getElement?.()].filter(Boolean);
    for (const src of candidates) {
        if (!window.isImageElementReadable(src)) continue;
        const canvas = window.cloneElementToCanvas(src);
        if (canvas) {
            obj.originalElement = canvas;
            return canvas;
        }
    }
    return null;
};

window.restoreFabricImageFromOriginal = function(obj) {
    if (!obj || obj.type !== 'image') return false;
    const source = window.ensureFabricOriginalElement(obj);
    if (!source) return false;
    obj.filters = [];
    if (source instanceof HTMLCanvasElement) {
        obj.setElement(source);
        obj.originalElement = source;
    } else {
        const fresh = window.cloneElementToCanvas(source);
        if (!fresh) return false;
        obj.setElement(fresh);
        obj.originalElement = fresh;
    }
    obj._cacheCanvas = null;
    obj._cacheContext = null;
    if (obj._filteredEl) obj._filteredEl = null;
    obj.dirty = true;
    return true;
};

function getSelectedImage() {
    const obj = window.canvas?.getActiveObject?.();
    return obj?.type === 'image' ? obj : null;
}

function getLogicalCanvasSize() {
    const zoom = window.canvas.getZoom();
    return {
        w: window.canvas.width / zoom,
        h: window.canvas.height / zoom
    };
}

function updateScaleSliderFromObject(obj) {
    if (!obj || obj.type !== 'image') return;
    const pct = Math.round((obj.scaleX || 1) * 100);
    const clamped = Math.max(10, Math.min(300, pct));
    const slider = document.getElementById('img-scale-slider');
    const label = document.getElementById('img-scale-value');
    if (slider) slider.value = String(clamped);
    if (label) label.textContent = `${clamped}%`;
}

function setImageScalePercent(obj, percent) {
    const s = Math.max(10, Math.min(300, percent)) / 100;
    obj.set({ scaleX: s, scaleY: s });
    obj.setCoords();
    window.saveBaseState(obj);
    updateScaleSliderFromObject(obj);
    window.canvas.requestRenderAll();
}

function fitImageToCanvas(obj) {
    const { w: logicalW, h: logicalH } = getLogicalCanvasSize();
    const scale = Math.min(logicalW / obj.width, logicalH / obj.height) * 0.8;
    obj.set({ scaleX: scale, scaleY: scale });
    obj.setCoords();
    window.saveBaseState(obj);
    updateScaleSliderFromObject(obj);
    window.canvas.requestRenderAll();
}

let lastLoadOption = 'fit';

function applyImageLoadOptionToSelected() {
    const sel = document.getElementById('img-load-option');
    const loadOption = sel?.value;
    
    if (loadOption === 'fill' || loadOption === 'width' || loadOption === 'height') {
        if (window.fitObjectToCanvas) window.fitObjectToCanvas(loadOption);
        if (sel) sel.value = lastLoadOption;
        return;
    }
    
    if (loadOption === 'fit' || loadOption === 'original') {
        lastLoadOption = loadOption;
    }
    
    let obj = getSelectedImage();
    if (!obj) {
        const objs = window.canvas.getObjects();
        obj = objs.find(o => o.type === 'image' || o.type === 'video') || objs[0];
    }
    if (!obj) return;

    if (loadOption === 'fit') fitImageToCanvas(obj);
    else if (loadOption === 'original') setImageScalePercent(obj, 100);
}

document.getElementById('img-load-option')?.addEventListener('change', applyImageLoadOptionToSelected);

document.getElementById('img-scale-slider')?.addEventListener('input', function () {
    const val = Number(this.value);
    const label = document.getElementById('img-scale-value');
    if (label) label.textContent = `${val}%`;
    const obj = getSelectedImage();
    if (!obj) return;
    setImageScalePercent(obj, val);
});

window.canvas.on('selection:created', (e) => updateScaleSliderFromObject(e.selected?.[0] || e.target));
window.canvas.on('selection:updated', (e) => updateScaleSliderFromObject(e.selected?.[0] || e.target));

document.getElementById('img-loader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i);
    
    if (isVideo) {
        if (typeof window.loadVideoIntoCanvas === 'function') {
            window.loadVideoIntoCanvas(file);
        } else {
            alert('비디오 타임라인 모듈이 로드되지 않았습니다.');
        }
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            const zoom = window.canvas.getZoom();
            const logicalW = window.canvas.width / zoom;
            const logicalH = window.canvas.height / zoom;

            const loadOption = document.getElementById('img-load-option').value;
            if (loadOption === 'fit') {
                const scaleX = logicalW / img.width;
                const scaleY = logicalH / img.height;
                const scale = Math.min(scaleX, scaleY) * 0.8; 
                img.scale(scale);
            } else {
                const pct = Number(document.getElementById('img-scale-slider')?.value || 100);
                img.scale(Math.max(0.1, Math.min(3, pct / 100)));
            }

            img.set({ originX: 'center', originY: 'center', left: logicalW / 2, top: logicalH / 2 });
            window.canvas.add(img);
            window.canvas.setActiveObject(img);
            updateScaleSliderFromObject(img);
            window.canvas.renderAll();
            if (typeof window.resetEffectEditorHistory === 'function') {
                window.resetEffectEditorHistory();
            }
            if (typeof window.saveEffectHistorySnapshot === 'function') {
                window.saveEffectHistorySnapshot();
            }
        });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

let effectSubtitleCount = 1;

function getActiveSubtitleText() {
    const obj = window.canvas.getActiveObject();
    return obj && obj.type === 'i-text' ? obj : null;
}

function applySelectedSubtitlePresetTo(obj) {
    const name = document.getElementById('effect-preset-select')?.value;
    if (!name) {
        alert('자막 프리셋을 선택하세요.\n(메인 편집기 속성 패널에서 저장한 프리셋이 공유됩니다)');
        return false;
    }
    if (!window.applySubtitlePresetToFabricText(obj, name)) {
        alert('프리셋을 적용할 수 없습니다. 목록을 새로고침한 뒤 다시 시도하세요.');
        return false;
    }
    window.canvas.requestRenderAll();
    return true;
}

window.showSubtitlePresetPanel = function () {
    const panel = document.getElementById('subtitle-preset-panel');
    const settings = document.getElementById('filter-settings-panel');
    const emptyMsg = document.getElementById('filter-empty-msg');
    if (settings) settings.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (panel) panel.style.display = 'block';
    refreshEffectSubtitlePresetSelect();
};

window.hideSubtitlePresetPanel = function () {
    const panel = document.getElementById('subtitle-preset-panel');
    if (panel) panel.style.display = 'none';
};

refreshEffectSubtitlePresetSelect();
window.addEventListener('focus', refreshEffectSubtitlePresetSelect);

// 일부 임베드/빌드에서는 자막 UI가 없을 수 있음
document.getElementById('add-subtitle-btn')?.addEventListener('click', () => {
    window.showSubtitlePresetPanel?.();
    const zoom = window.canvas.getZoom() || 1;
    const textObj = new fabric.IText(`자막 ${effectSubtitleCount++}`, {
        left: window.canvas.width / 2 / zoom,
        top: window.canvas.height / 2 / zoom,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Pretendard, Arial, sans-serif',
        fontSize: 80,
        fill: '#000000',
        fontWeight: 'normal'
    });
    window.canvas.add(textObj);
    window.canvas.setActiveObject(textObj);
    const presetName = document.getElementById('effect-preset-select')?.value;
    if (presetName) applySelectedSubtitlePresetTo(textObj);
    else window.canvas.requestRenderAll();
});

document.getElementById('effect-load-preset-btn')?.addEventListener('click', () => {
    const obj = getActiveSubtitleText();
    if (!obj) {
        alert('자막을 선택한 뒤 [적용]을 누르세요.\n(먼저 [자막]으로 레이어를 추가할 수 있습니다)');
        return;
    }
    applySelectedSubtitlePresetTo(obj);
});

document.getElementById('delete-btn')?.addEventListener('click', () => {
    const activeObjects = window.canvas.getActiveObjects();
    if (activeObjects.length) {
        window.canvas.discardActiveObject();
        activeObjects.forEach(obj => window.canvas.remove(obj));
    }
});

// 💡 [수정] 웹 접근성(A11y) 표준에 맞게 Label과 Input을 ID로 완벽히 연결
window.showFilterControls = function(title, params, onChangeCallback) {
    const panel = document.getElementById('filter-settings-panel');
    const titleEl = document.getElementById('filter-title');
    const slidersContainer = document.getElementById('filter-sliders');
    const emptyMsg = document.getElementById('filter-empty-msg');

    window.hideSubtitlePresetPanel?.();
    if(emptyMsg) emptyMsg.style.display = 'none';
    titleEl.innerText = `⚙️ ${title}`;
    slidersContainer.innerHTML = '';
    const retroControls = document.getElementById('retro-effect-controls');
    if (retroControls) retroControls.innerHTML = '';
    panel.style.display = 'block';

    params.forEach(param => {
        const uniqueInputId = `filter-input-${param.id}`;
        const useRange = param.inputType === 'range';

        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '12px';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = useRange ? 'column' : 'row';
        wrapper.style.alignItems = useRange ? 'stretch' : 'center';
        wrapper.style.justifyContent = useRange ? 'flex-start' : 'space-between';
        wrapper.style.gap = useRange ? '6px' : '10px';

        const labelText = document.createElement('label');
        labelText.innerText = param.label;
        labelText.htmlFor = uniqueInputId;
        labelText.style.fontSize = '12px';
        labelText.style.color = '#ccc';
        labelText.style.flex = useRange ? 'none' : '1';
        labelText.style.whiteSpace = 'nowrap';
        labelText.style.cursor = 'pointer';

        const formatVal = (val) => {
            const step = param.step || 1;
            if (step >= 1) return String(Math.round(val));
            const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 2;
            return Number(val).toFixed(decimals);
        };

        const input = document.createElement('input');
        input.id = uniqueInputId;
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.value = param.value;

        if (useRange) {
            const headRow = document.createElement('div');
            headRow.style.display = 'flex';
            headRow.style.alignItems = 'center';
            headRow.style.justifyContent = 'space-between';
            headRow.style.gap = '8px';

            const valueLabel = param.dualInput ? document.createElement('input') : document.createElement('span');
            if (param.dualInput) {
                valueLabel.type = 'number';
                valueLabel.min = param.min;
                valueLabel.max = param.max;
                valueLabel.step = param.step;
                valueLabel.value = param.value;
                valueLabel.style.width = '56px';
                valueLabel.style.padding = '4px';
                valueLabel.style.fontSize = '12px';
                valueLabel.style.textAlign = 'center';
                valueLabel.style.backgroundColor = '#333';
                valueLabel.style.color = '#00bcd4';
                valueLabel.style.border = '1px solid #00bcd4';
                valueLabel.style.borderRadius = '4px';
                valueLabel.style.fontWeight = 'bold';
                valueLabel.style.outline = 'none';
            } else {
                valueLabel.style.fontSize = '12px';
                valueLabel.style.color = '#00bcd4';
                valueLabel.style.minWidth = '42px';
                valueLabel.style.textAlign = 'right';
                valueLabel.style.fontWeight = 'bold';
                valueLabel.textContent = formatVal(param.value);
            }

            input.type = 'range';
            input.style.width = '100%';
            input.style.flex = '1';
            input.style.cursor = 'pointer';
            input.style.accentColor = '#00bcd4';

            const clampVal = (val) => Math.min(param.max, Math.max(param.min, val));

            input.addEventListener('input', (e) => {
                const val = clampVal(parseFloat(e.target.value));
                if (isNaN(val)) return;
                if (param.dualInput) valueLabel.value = formatVal(val);
                else valueLabel.textContent = formatVal(val);
                onChangeCallback(param.id, val);
            });

            if (param.dualInput) {
                valueLabel.addEventListener('input', (e) => {
                    const val = clampVal(parseFloat(e.target.value));
                    if (isNaN(val)) return;
                    input.value = val;
                    onChangeCallback(param.id, val);
                });
            }

            headRow.appendChild(labelText);
            headRow.appendChild(valueLabel);
            wrapper.appendChild(headRow);
            wrapper.appendChild(input);
        } else if (param.inputType === 'select') {
            const select = document.createElement('select');
            select.id = uniqueInputId;
            select.style.width = '120px';
            select.style.padding = '5px';
            select.style.fontSize = '12px';
            select.style.backgroundColor = '#333';
            select.style.color = '#00bcd4';
            select.style.border = '1px solid #00bcd4';
            select.style.borderRadius = '4px';
            select.style.fontWeight = 'bold';
            select.style.outline = 'none';

            if (param.options) {
                param.options.forEach(opt => {
                    const optionEl = document.createElement('option');
                    if (typeof opt === 'object') {
                        optionEl.value = opt.value;
                        optionEl.textContent = opt.label;
                    } else {
                        optionEl.value = opt;
                        optionEl.textContent = opt;
                    }
                    if (optionEl.value === param.value) {
                        optionEl.selected = true;
                    }
                    select.appendChild(optionEl);
                });
            }

            select.addEventListener('change', (e) => {
                onChangeCallback(param.id, e.target.value);
            });

            wrapper.appendChild(labelText);
            wrapper.appendChild(select);
        } else if (param.inputType === 'color') {
            const colorInput = document.createElement('input');
            colorInput.id = uniqueInputId;
            colorInput.type = 'color';
            colorInput.value = param.value || '#000000';
            colorInput.style.width = '50px';
            colorInput.style.height = '30px';
            colorInput.style.border = '1px solid #00bcd4';
            colorInput.style.borderRadius = '4px';
            colorInput.style.backgroundColor = 'transparent';
            colorInput.style.cursor = 'pointer';

            colorInput.addEventListener('input', (e) => {
                onChangeCallback(param.id, e.target.value);
            });

            wrapper.appendChild(labelText);
            wrapper.appendChild(colorInput);
        } else {
            input.type = 'number';
            input.style.width = '70px';
            input.style.padding = '5px';
            input.style.fontSize = '13px';
            input.style.textAlign = 'center';
            input.style.backgroundColor = '#333';
            input.style.color = '#00bcd4';
            input.style.border = '1px solid #00bcd4';
            input.style.borderRadius = '4px';
            input.style.fontWeight = 'bold';
            input.style.outline = 'none';

            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val)) return;
                onChangeCallback(param.id, val);
            });

            wrapper.appendChild(labelText);
            wrapper.appendChild(input);
        }

        slidersContainer.appendChild(wrapper);
    });

    if (typeof window.mountEffectStateBakeButton === 'function') {
        window.mountEffectStateBakeButton();
    }
};

window.mountEffectStateBakeButton = function () {
    const btn = document.getElementById('effect-state-bake-btn');
    if (btn) btn.style.display = 'block';
};

window.bakeEffectVisualToObject = function (obj) {
    if (!obj || obj.type !== 'image' || obj._isPuzzlePiece) {
        alert('이미지 객체를 선택해 주세요.');
        return false;
    }
    if (window.hasAnimatedEffect(obj) && !obj._effectPaused) {
        alert('애니메이션이 재생 중입니다. 정지(일시정지) 상태일 때만 현상적용할 수 있습니다.');
        return false;
    }

    if (typeof window.haltRetroEffectMotion === 'function') {
        window.haltRetroEffectMotion(obj);
    }
    if (typeof window.ensureCanvasSelectable === 'function') {
        window.ensureCanvasSelectable();
    }

    window.canvas?.requestRenderAll();

    let baked = null;
    try {
        const el = obj.toCanvasElement({ multiplier: 1 });
        baked = window.cloneElementToCanvas(el);
    } catch (err) {
        console.error('bakeEffectVisualToObject failed', err);
        alert('현재 화면을 이미지로 변환하지 못했습니다.');
        return false;
    }
    if (!baked) {
        alert('현재 화면을 이미지로 변환하지 못했습니다.');
        return false;
    }

    if (typeof window.cleanupScrollRollEffect10 === 'function') {
        window.cleanupScrollRollEffect10(obj);
    }
    if (typeof window.cleanupPooledWaterEffect11 === 'function') {
        window.cleanupPooledWaterEffect11(obj);
    }
    gsap.killTweensOf(obj);
    if (obj.retroSettings) gsap.killTweensOf(obj.retroSettings);
    if (obj.activeTween) { obj.activeTween.kill(); obj.activeTween = null; }
    if (obj.waterTween) { obj.waterTween.kill(); obj.waterTween = null; }
    if (obj.fxLoop) { clearInterval(obj.fxLoop); obj.fxLoop = null; }
    delete obj._waterRender;
    window.cancelRetroCanvasRefresh?.(obj);
    if (typeof window.cleanupPuzzlePieces === 'function') {
        window.cleanupPuzzlePieces(window.canvas);
    }
    if (typeof window.clearRetroEffectMask === 'function') {
        window.clearRetroEffectMask(obj);
    }

    const preserved = {
        left: obj.left,
        top: obj.top,
        originX: obj.originX,
        originY: obj.originY,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        opacity: obj.opacity,
        layerName: obj.layerName,
        selectable: obj.selectable !== false
    };

    obj._effectPaused = false;
    obj.filters = [];
    obj.clipPath = null;
    obj.setElement(baked);
    obj.originalElement = baked;
    obj.set({
        width: baked.width,
        height: baked.height,
        angle: 0,
        flipX: false,
        flipY: false,
        skewX: 0,
        skewY: 0,
        ...preserved
    });

    delete obj._staticFilterStarted;
    delete obj._flipSourceCanvas;
    delete obj.retroSettings;
    delete obj.waterSettings;
    delete obj.advSettings;
    delete obj.filterSettings;
    delete obj.waterTime;
    delete obj.baseState;
    obj._cacheCanvas = null;
    obj._cacheContext = null;
    if (obj._filteredEl) obj._filteredEl = null;
    obj.dirty = true;
    obj.setCoords();

    window.hideFilterControls();
    window.updateEffectTransportUi();
    window.canvas?.requestRenderAll();
    if (typeof window.saveEffectHistorySnapshot === 'function') {
        window.saveEffectHistorySnapshot({ delay: 100 });
    }
    return true;
};

window.hideFilterControls = function() { 
    document.getElementById('filter-settings-panel').style.display = 'none';
    const bakeBtn = document.getElementById('effect-state-bake-btn');
    if (bakeBtn) bakeBtn.style.display = 'none';
    const retroControls = document.getElementById('retro-effect-controls');
    if (retroControls) retroControls.innerHTML = '';
    window.hideSubtitlePresetPanel?.();
    const emptyMsg = document.getElementById('filter-empty-msg');
    const subPanel = document.getElementById('subtitle-preset-panel');
    if(emptyMsg && (!subPanel || subPanel.style.display === 'none')) emptyMsg.style.display = 'block';
};

window.hasAnimatedEffect = function(obj) {
    if (!obj) return false;
    return !!(obj.activeTween || obj.waterTween || obj.fxLoop);
};

window.setEffectPlaybackRunning = function(obj) {
    if (!obj) return;
    obj._effectPaused = false;
    window.updateEffectPlayToggleUi();
};

window.pauseEffectPlayback = function(obj) {
    if (!obj || obj._effectPaused) return false;
    obj._effectPaused = true;
    const pauseTween = (tween) => { if (tween && typeof tween.pause === 'function') tween.pause(); };
    pauseTween(obj.activeTween);
    pauseTween(obj.waterTween);
    if (obj.retroSettings) gsap.getTweensOf(obj.retroSettings).forEach((t) => t.pause());
    gsap.getTweensOf(obj).forEach((t) => {
        if (t !== obj.activeTween && t !== obj.waterTween) t.pause();
    });
    window.updateEffectPlayToggleUi();
    return true;
};

window.resumeEffectPlayback = function(obj) {
    if (!obj || !obj._effectPaused) return false;
    obj._effectPaused = false;
    const resumeTween = (tween) => { if (tween && typeof tween.resume === 'function') tween.resume(); };
    resumeTween(obj.activeTween);
    resumeTween(obj.waterTween);
    if (obj.retroSettings) gsap.getTweensOf(obj.retroSettings).forEach((t) => t.resume());
    gsap.getTweensOf(obj).forEach((t) => {
        if (t !== obj.activeTween && t !== obj.waterTween) t.resume();
    });
    window.canvas?.renderAll();
    window.updateEffectPlayToggleUi();
    return true;
};

window.toggleEffectPlayback = function() {
    let obj = window.canvas?.getActiveObject();
    if (!obj || !window.hasAnimatedEffect(obj)) {
        const c = window.canvas;
        if (c) {
            obj = c.getObjects().find((o) => window.hasAnimatedEffect(o)) || null;
            if (obj) c.setActiveObject(obj);
        }
    }
    if (!obj || !window.hasAnimatedEffect(obj)) return;
    if (obj._effectPaused) window.resumeEffectPlayback(obj);
    else window.pauseEffectPlayback(obj);
};

/** 효과 종료: 왼쪽 「효과 초기화」와 달리 효과 선택·슬라이더 설정은 유지, 비주얼·재생만 끔 */
window.stopRetroEffectToSetupState = function (obj) {
    if (!obj) return;
    if (typeof window.haltRetroEffectMotion === 'function') {
        window.haltRetroEffectMotion(obj);
    }
    if (typeof window.clearRetroEffectMask === 'function') {
        window.clearRetroEffectMask(obj);
    }
    if (obj.retroSettings) obj.retroSettings.effectStarted = false;
    obj._effectPaused = false;
    obj.filters = [];
    if (typeof window.resetRetroVisualForSetup === 'function') {
        window.resetRetroVisualForSetup(obj);
    } else if (typeof window.restoreFabricImageFromOriginal === 'function') {
        window.restoreFabricImageFromOriginal(obj);
    }
    delete obj._staticFilterStarted;
    window.syncRetroTransportPanel?.(obj);
    window.canvas?.requestRenderAll();
    if (typeof window.saveEffectHistorySnapshot === 'function') {
        window.saveEffectHistorySnapshot({ sync: true });
    }
};

window.updateEffectTransportUi = function () {
    const playBtn = document.getElementById('effect-transport-play-btn');
    const endBtn = document.getElementById('effect-transport-end-btn');
    const obj = window.canvas?.getActiveObject();
    const state = typeof window.getRetroTransportState === 'function'
        ? window.getRetroTransportState(obj)
        : 'idle';
    const canUse = !!(obj && obj.type === 'image');
    if (playBtn) {
        playBtn.disabled = !canUse;
        playBtn.textContent = state === 'playing' ? '⏸' : '▶';
        playBtn.title = state === 'playing' ? '일시정지' : (state === 'paused' ? '재생' : '재생');
    }
    if (endBtn) {
        endBtn.disabled = !canUse || state === 'idle';
        endBtn.title = '효과 종료 (선택·설정 유지)';
    }
};

window.updateEffectPlayToggleUi = function () {
    window.updateEffectTransportUi();
};

window.ensureCanvasSelectable = function () {
    if (typeof window.releaseCanvasInteraction === 'function') {
        window.releaseCanvasInteraction({ removeTempMasks: true });
    } else if (typeof window.exitMaskDrawMode === 'function') {
        window.exitMaskDrawMode(false);
    }
    const c = window.canvas;
    if (!c) return;
    c.selection = true;
    c.skipTargetFind = false;
    c.isDrawingMode = false;
    if ((!mediaRecorder || mediaRecorder.state === 'inactive') && typeof restoreSelectionAfterRecording === 'function') {
        restoreSelectionAfterRecording();
    }
};

window.findResettableImageObject = function () {
    const c = window.canvas;
    if (!c) return null;
    const active = c.getActiveObject();
    if (active && active.type === 'image' && !active._isPuzzlePiece) return active;
    if (active && active._isPuzzlePiece) {
        const parentId = active._parentImageId;
        const parent = c.getObjects().find(o => o.type === 'image' && !o._isPuzzlePiece && (o.id === parentId || o.uid === parentId));
        if (parent) return parent;
    }
    const images = c.getObjects().filter((o) => o.type === 'image' && !o._isPuzzlePiece);
    if (images.length === 1) return images[0];
    return null;
};

window.clearAppliedEffects = function(obj) {
    if (!obj) return;
    if (typeof window.cleanupScrollRollEffect10 === 'function') {
        window.cleanupScrollRollEffect10(obj);
    }
    if (typeof window.cleanupPooledWaterEffect11 === 'function') {
        window.cleanupPooledWaterEffect11(obj);
    }
    window.ensureCanvasSelectable?.();
    gsap.killTweensOf(obj);
    if (obj.retroSettings) gsap.killTweensOf(obj.retroSettings);
    if (obj.activeTween) { obj.activeTween.kill(); obj.activeTween = null; }
    if (obj.waterTween) { obj.waterTween.kill(); obj.waterTween = null; }
    if (obj.fxLoop) { clearInterval(obj.fxLoop); obj.fxLoop = null; }
    delete obj._waterRender;

    if (typeof window.cleanupPuzzlePieces === 'function') {
        window.cleanupPuzzlePieces(window.canvas);
    }

    obj._effectPaused = false;
    obj.set({ clipPath: null, skewX: 0, skewY: 0, opacity: 1, selectable: true });
    if (obj.baseState) obj.set(obj.baseState);
    if (!window.restoreFabricImageFromOriginal(obj) && obj.filters?.length) {
        obj.filters = [];
        if (typeof window.safeApplyImageFilters === 'function') {
            window.safeApplyImageFilters(obj);
        } else {
            try { obj.applyFilters(); } catch (_) { /* noop */ }
        }
    }

    window.cancelRetroCanvasRefresh?.(obj);
    if (typeof window.clearRetroEffectMask === 'function') {
        window.clearRetroEffectMask(obj);
    }
    delete obj._staticFilterStarted;
    delete obj._flipSourceCanvas;
    delete obj.retroSettings;
    delete obj.waterSettings;
    delete obj.advSettings;
    delete obj.filterSettings;
    delete obj.waterTime;
    delete obj._waterRender;

    obj.setCoords();
    window.canvas?.requestRenderAll();
    window.hideFilterControls();
    window.updateEffectTransportUi();
};

document.getElementById('reset-obj-btn')?.addEventListener('click', () => {
    window.ensureCanvasSelectable?.();
    const c = window.canvas;
    let obj = typeof window.findResettableImageObject === 'function'
        ? window.findResettableImageObject()
        : c?.getActiveObject();
    if (obj && obj.type === 'image' && c) {
        c.setActiveObject(obj);
    }
    if (!obj || obj.type !== 'image') {
        alert('효과를 초기화할 이미지가 없습니다. 이미지를 불러온 뒤 다시 시도해 주세요.');
        window.updateEffectTransportUi?.();
        return;
    }
    const resetBtn = document.getElementById('reset-obj-btn');
    if (resetBtn) resetBtn.disabled = true;
    if (typeof window.haltRetroEffectMotion === 'function') {
        window.haltRetroEffectMotion(obj);
    }
    requestAnimationFrame(() => {
        window.clearAppliedEffects(obj);
        if (resetBtn) resetBtn.disabled = false;
        if (typeof window.saveEffectHistorySnapshot === 'function') {
            window.saveEffectHistorySnapshot({ delay: 450 });
        }
    });
});

document.getElementById('effect-transport-play-btn')?.addEventListener('click', () => {
    const obj = window.canvas?.getActiveObject();
    if (obj?._retroTransportPlay) {
        obj._retroTransportPlay();
        return;
    }
    window.toggleEffectPlayback();
});

document.getElementById('effect-transport-end-btn')?.addEventListener('click', () => {
    const obj = window.canvas?.getActiveObject();
    if (obj?._retroTransportEnd) {
        obj._retroTransportEnd();
        return;
    }
    if (obj && typeof window.stopRetroEffectToSetupState === 'function') {
        window.stopRetroEffectToSetupState(obj);
        window.updateEffectTransportUi();
    }
});

window.canvas.on('selection:created', () => window.updateEffectPlayToggleUi());
window.canvas.on('selection:updated', () => window.updateEffectPlayToggleUi());
window.canvas.on('selection:cleared', () => window.updateEffectPlayToggleUi());

document.getElementById('bring-front-btn').addEventListener('click', () => {
    const obj = window.canvas.getActiveObject();
    if (obj) {
        if (typeof window.moveRetroPuzzleBlock === 'function' && window.moveRetroPuzzleBlock(obj, 'forward')) {
            // handled
        } else {
            window.canvas.bringForward(obj);
        }
    }
});
document.getElementById('send-back-btn').addEventListener('click', () => {
    const obj = window.canvas.getActiveObject();
    if (obj) {
        if (typeof window.moveRetroPuzzleBlock === 'function' && window.moveRetroPuzzleBlock(obj, 'backward')) {
            // handled
        } else {
            window.canvas.sendBackwards(obj);
        }
    }
});
(function initEffectBgColorPicker() {
    const picker = document.getElementById('bg-color-picker');
    const transparentBtn = document.getElementById('bg-transparent-btn');
    const whiteBtn = document.getElementById('bg-white-btn');
    
    if (picker) {
        picker.addEventListener('input', (e) => {
            const hex = e.target.value;
            window.canvas.backgroundColor = hex;
            window.canvas.renderAll();
        });
    }
    
    if (whiteBtn) {
        whiteBtn.addEventListener('click', () => {
            window.canvas.backgroundColor = '#ffffff';
            if (picker) picker.value = '#ffffff';
            window.canvas.renderAll();
        });
    }
    
    if (transparentBtn) {
        transparentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.canvas.backgroundColor = null;
            window.canvas.renderAll();
        });
    }
    
    // Initialize
    const initial = window.canvas.backgroundColor;
    if (typeof initial === 'string' && initial.startsWith('#')) {
        if (picker) picker.value = initial;
    }
})();

let mediaRecorder;
let recordedChunks = [];
let recordElapsedMs = 0;
let recordSegmentStart = 0;
let recordTimerRaf = null;
window.lastRecordedWebm = null;

const recordUi = {
    toggle: null,
    stop: null,
    time: null,
    status: null
};

function forceRender() { window.canvas.renderAll(); }
function setPathVisibility(visible) { window.canvas.getObjects().forEach(o => { if (o.type === 'path') o.set('visible', visible); }); window.canvas.renderAll(); }

let recordSelectionSaved = null;
let recordSelectionPrev = null;

function hideSelectionForRecording() {
    const c = window.canvas;
    if (!c) return;
    recordSelectionSaved = c.getActiveObject() || null;
    recordSelectionPrev = { selection: c.selection, skipTargetFind: c.skipTargetFind };
    c.discardActiveObject();
    c.selection = false;
    c.skipTargetFind = true;
    c.requestRenderAll();
}

function restoreSelectionAfterRecording() {
    const c = window.canvas;
    if (!c) return;
    if (recordSelectionPrev) {
        c.selection = recordSelectionPrev.selection;
        c.skipTargetFind = recordSelectionPrev.skipTargetFind;
        recordSelectionPrev = null;
    } else {
        c.selection = true;
        c.skipTargetFind = false;
    }
    if (recordSelectionSaved) {
        c.setActiveObject(recordSelectionSaved);
        recordSelectionSaved = null;
    }
    c.requestRenderAll();
}
window.restoreSelectionAfterRecording = restoreSelectionAfterRecording;

function getRecordElapsedSec() {
    let ms = recordElapsedMs;
    if (mediaRecorder?.state === 'recording' && recordSegmentStart) {
        ms += performance.now() - recordSegmentStart;
    }
    return ms / 1000;
}

function formatRecordTime(sec) {
    const total = Math.max(0, sec);
    const minutes = Math.floor(total / 60);
    const seconds = total - minutes * 60;
    return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`;
}

function updateRecordUi() {
    const { toggle, stop, time, status } = recordUi;
    if (!toggle || !time || !status) return;
    const recorderState = !mediaRecorder || mediaRecorder.state === 'inactive'
        ? 'idle'
        : mediaRecorder.state === 'paused'
            ? 'paused'
            : 'recording';

    time.textContent = formatRecordTime(getRecordElapsedSec());

    if (recorderState === 'idle') {
        status.textContent = '대기';
        toggle.textContent = '⏺';
        toggle.style.background = '#f44336';
        toggle.title = '녹화 시작';
        if (stop) stop.hidden = true;
        return;
    }

    if (stop) stop.hidden = false;

    if (recorderState === 'recording') {
        status.textContent = '녹화 중';
        toggle.textContent = '⏸';
        toggle.style.background = '#ff9800';
        toggle.title = '일시정지';
        return;
    }

    status.textContent = '일시정지';
    toggle.textContent = '▶';
    toggle.style.background = '#4caf50';
    toggle.title = '녹화 재개';
}

function startRecordTimer() {
    const tick = () => {
        updateRecordUi();
        if (mediaRecorder?.state === 'recording') {
            recordTimerRaf = requestAnimationFrame(tick);
        }
    };
    if (recordTimerRaf) cancelAnimationFrame(recordTimerRaf);
    recordTimerRaf = requestAnimationFrame(tick);
}

function stopRecordTimer() {
    if (recordTimerRaf) cancelAnimationFrame(recordTimerRaf);
    recordTimerRaf = null;
}

function prepareRecordingUi() {
    setPathVisibility(false);
    hideSelectionForRecording();
    const pathBtn = document.getElementById('toggle-path-btn');
    if (pathBtn) {
        pathBtn.innerText = '👁️ 가이드선 보이기';
        pathBtn.style.background = '#757575';
    }
    window.isPathVisible = false;
}

function restoreRecordingUi() {
    setPathVisibility(true);
    restoreSelectionAfterRecording();
    const pathBtn = document.getElementById('toggle-path-btn');
    if (pathBtn) {
        pathBtn.innerText = '👁️ 가이드선 숨기기';
        pathBtn.style.background = '#009688';
    }
    window.isPathVisible = true;
}

function commitRecordSegmentElapsed() {
    if (mediaRecorder?.state === 'recording' && recordSegmentStart) {
        recordElapsedMs += performance.now() - recordSegmentStart;
        recordSegmentStart = 0;
    }
}

function getSavedRecordDurationSec() {
    return Math.max(0.1, recordElapsedMs / 1000);
}

function createMediaRecorder(stream) {
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const options = { videoBitsPerSecond: 20000000 };
    for (const mimeType of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
            options.mimeType = mimeType;
            return new MediaRecorder(stream, options);
        }
    }
    return new MediaRecorder(stream, options);
}

function startRecording() {
    try {
        prepareRecordingUi();
        recordedChunks = [];
        recordElapsedMs = 0;
        recordSegmentStart = performance.now();

        const canvasEl = document.getElementById('main-canvas');
        if (!canvasEl?.captureStream) {
            alert('이 브라우저에서는 캔버스 녹화를 지원하지 않습니다.');
            restoreRecordingUi();
            updateRecordUi();
            return;
        }

        const stream = canvasEl.captureStream(60);
        
        // Extract audio from playing video safely without modifying audio graph
        if (window.activeVideoElement && !window.activeVideoElement.muted) {
            try {
                const getStream = window.activeVideoElement.captureStream || window.activeVideoElement.mozCaptureStream;
                if (getStream) {
                    const videoStream = getStream.call(window.activeVideoElement);
                    videoStream.getAudioTracks().forEach(track => stream.addTrack(track));
                }
            } catch(e) {
                console.warn("[record] Native audio capture failed:", e);
            }
        }
        mediaRecorder = createMediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const durationSec = getSavedRecordDurationSec();
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            window.lastRecordedWebm = {
                blob,
                durationSec,
                fileName: `mv_${window.getFormattedDateString ? window.getFormattedDateString() : new Date().getTime()}.webm`
            };
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = window.lastRecordedWebm.fileName;
            a.click();
            URL.revokeObjectURL(url);
            recordedChunks = [];
            recordElapsedMs = 0;
            recordSegmentStart = 0;
            mediaRecorder = null;
            stopRecordTimer();
            restoreRecordingUi();
            updateRecordUi();
        };

        mediaRecorder.start();
        gsap.ticker.add(forceRender);
        startRecordTimer();
        updateRecordUi();
    } catch (err) {
        console.error('[record] start failed:', err);
        alert('녹화를 시작하지 못했습니다.');
        mediaRecorder = null;
        restoreRecordingUi();
        updateRecordUi();
    }
}

function pauseRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    mediaRecorder.pause();
    gsap.ticker.remove(forceRender);
    recordElapsedMs += performance.now() - recordSegmentStart;
    recordSegmentStart = 0;
    stopRecordTimer();
    restoreRecordingUi();
    updateRecordUi();
}

function resumeRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
    try {
        prepareRecordingUi();
        mediaRecorder.resume();
        recordSegmentStart = performance.now();
        gsap.ticker.add(forceRender);
        startRecordTimer();
        updateRecordUi();
    } catch (err) {
        console.error('[record] resume failed:', err);
        alert('녹화를 재개하지 못했습니다.');
    }
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    commitRecordSegmentElapsed();
    mediaRecorder.stop();
    gsap.ticker.remove(forceRender);
    stopRecordTimer();
}

function onRecordToggleClick() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        if (window.activeVideoElement) {
            window.activeVideoElement.currentTime = window.isVideoSelectionMode === 'part' ? window.videoStartTime : 0;
            window.activeVideoElement.play();
        }
        startRecording();
        return;
    }
    if (mediaRecorder.state === 'recording') {
        if (window.activeVideoElement) window.activeVideoElement.pause();
        pauseRecording();
        return;
    }
    if (mediaRecorder.state === 'paused') {
        if (window.activeVideoElement) window.activeVideoElement.play();
        resumeRecording();
    }
}

function initRecordControls() {
    recordUi.toggle = document.getElementById('record-toggle-btn');
    recordUi.stop = document.getElementById('record-stop-btn');
    recordUi.time = document.getElementById('record-time');
    recordUi.status = document.getElementById('record-status');

    if (!recordUi.toggle || !recordUi.time || !recordUi.status) {
        console.warn('[record] UI elements missing');
        return;
    }

    recordUi.toggle.addEventListener('click', onRecordToggleClick);
    recordUi.stop?.addEventListener('click', stopRecording);
    updateRecordUi();
}

initRecordControls();

window.getTimelineSettings = function() {
    return {
        duration: parseFloat(document.getElementById('effect-duration').value) || 2,
        repeat: document.getElementById('repeat-infinite').checked ? -1 : (parseInt(document.getElementById('effect-repeat').value) - 1)
    };
};

const repeatInfiniteCb = document.getElementById('repeat-infinite'); 
const repeatCountInput = document.getElementById('effect-repeat');

function updateLiveRepeat() {
    const obj = window.canvas.getActiveObject(); if (!obj) return;
    let repeatCount = repeatInfiniteCb && repeatInfiniteCb.checked ? -1 : parseInt(repeatCountInput.value) - 1;
    if (obj.activeTween) obj.activeTween.repeat(repeatCount);
    if (obj.waterTween) obj.waterTween.repeat(repeatCount);
}
if (repeatInfiniteCb) repeatInfiniteCb.addEventListener('change', updateLiveRepeat);
if (repeatCountInput) repeatCountInput.addEventListener('input', updateLiveRepeat);

document.querySelectorAll('.time-btn[data-time]').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.time-btn[data-time]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const selectedTime = parseFloat(this.getAttribute('data-time'));
        const durationInput = document.getElementById('effect-duration');
        if (durationInput) {
            durationInput.value = selectedTime;
            durationInput.dispatchEvent(new Event('input'));
        }
    });
});

const durationInput = document.getElementById('effect-duration');
if (durationInput) {
    durationInput.addEventListener('input', function() {
        let selectedTime = parseFloat(this.value);
        if (isNaN(selectedTime) || selectedTime <= 0) selectedTime = 0.1;

        const obj = window.canvas.getActiveObject();
        if (obj) {
            if (obj.activeTween) obj.activeTween.duration(selectedTime);
            if (obj.waterTween) obj.waterTween.duration(selectedTime);
            window.canvas.renderAll();
        }
    });
}

// ============================================================================
// 💾 고화질 이미지 저장 기능 추가 (PNG / JPG)
// ============================================================================

const leftMenuContainer = document.getElementById('left-menu-container') || document.querySelector('.left-panel');

if (leftMenuContainer && !document.getElementById('save-png-btn')) {
    // 1. Divider (구분선) 추가
    const divider = document.createElement('div');
    divider.style.margin = '15px 0';
    divider.style.borderTop = '1px solid #444';
    leftMenuContainer.appendChild(divider);

    // 2. PNG 저장 버튼 생성
    const pngBtn = document.createElement('button');
    pngBtn.innerText = "💾 PNG";
    pngBtn.style.width = '100%';
    pngBtn.style.padding = '10px';
    pngBtn.style.marginBottom = '8px';
    pngBtn.style.backgroundColor = '#00bcd4';
    pngBtn.style.color = '#fff';
    pngBtn.style.fontWeight = 'bold';
    pngBtn.style.border = 'none';
    pngBtn.style.borderRadius = '4px';
    pngBtn.style.cursor = 'pointer';
    
    pngBtn.onclick = function() {
        // 투명도 정보를 포함하여 원본 배율(1배수) 고화질 추출
        const dataURL = window.canvas.toDataURL({
            format: 'png',
            quality: 1.0
        });
        
        const link = document.createElement('a');
        link.download = window.getImageSaveName ? window.getImageSaveName('png', 'edit') : `edit_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    };
    leftMenuContainer.appendChild(pngBtn);

    // 3. JPG 저장 버튼 생성
    const jpgBtn = document.createElement('button');
    jpgBtn.innerText = "💾 JPG";
    jpgBtn.style.width = '100%';
    jpgBtn.style.padding = '10px';
    jpgBtn.style.backgroundColor = '#2196f3';
    jpgBtn.style.color = '#fff';
    jpgBtn.style.fontWeight = 'bold';
    jpgBtn.style.border = 'none';
    jpgBtn.style.borderRadius = '4px';
    jpgBtn.style.cursor = 'pointer';
    
    jpgBtn.onclick = function() {
        // JPG 추출 시 투명 배경이 검은색으로 깨지는 현상을 방지하기 위해 기본 흰색 배경 강제 설정
        const dataURL = window.canvas.toDataURL({
            format: 'jpeg',
            quality: 1.0,
            enableRetinaScaling: true
        });
        
        const link = document.createElement('a');
        link.download = window.getImageSaveName ? window.getImageSaveName('jpg', 'edit') : `edit_${Date.now()}.jpg`;
        link.href = dataURL;
        link.click();
    };
    leftMenuContainer.appendChild(jpgBtn);
}
// 💡 HTML에 심어둔 고화질 이미지 저장 버튼과 캔버스 엔진 연결
document.addEventListener("DOMContentLoaded", function() {
    const pngBtn = document.getElementById('save-png-btn');
    const jpgBtn = document.getElementById('save-jpg-btn');
    const bakeBtn = document.getElementById('effect-state-bake-btn');

    if (bakeBtn && !bakeBtn.dataset.wired) {
        bakeBtn.dataset.wired = '1';
        bakeBtn.onclick = function() {
            if (!window.canvas) return alert('캔버스가 준비되지 않았습니다.');
            const obj = window.canvas.getActiveObject();
            if (!obj || obj.type !== 'image') {
                return alert('이미지 객체를 선택해 주세요.');
            }
            if (typeof window.bakeEffectVisualToObject === 'function') {
                window.bakeEffectVisualToObject(obj);
            }
        };
    }

    if (pngBtn) {
        pngBtn.onclick = function() {
            if (!window.canvas) return alert("캔버스가 준비되지 않았습니다.");
            if (window.canvas.getObjects().some(o => window.hasAnimatedEffect(o) && !o._effectPaused)) {
                return alert("애니메이션이 재생 중입니다. 정지(일시정지) 상태일 때만 PNG로 저장할 수 있습니다.");
            }
            const dataURL = window.canvas.toDataURL({
                format: 'png',
                quality: 1.0
            });
            const link = document.createElement('a');
            link.download = window.getImageSaveName ? window.getImageSaveName('png', 'edit') : `edit_${Date.now()}.png`;
            link.href = dataURL;
            link.click();
        };
    }

    if (jpgBtn) {
        jpgBtn.onclick = function() {
            if (!window.canvas) return alert("캔버스가 준비되지 않았습니다.");
            if (window.canvas.getObjects().some(o => window.hasAnimatedEffect(o) && !o._effectPaused)) {
                return alert("애니메이션이 재생 중입니다. 정지(일시정지) 상태일 때만 JPG로 저장할 수 있습니다.");
            }
            const dataURL = window.canvas.toDataURL({
                format: 'jpeg',
                quality: 1.0
            });
            const link = document.createElement('a');
            link.download = window.getImageSaveName ? window.getImageSaveName('jpg', 'edit') : `edit_${Date.now()}.jpg`;
            link.href = dataURL;
            link.click();
        };
    }
});

// ---------------------------------------------------------------------------
// 캔버스 undo / redo (embed 상단바 ↶ ↷ 및 단독 모드 공용)
// ---------------------------------------------------------------------------
(function initEffectEditorHistory() {
    const MAX = 40;
    const CANVAS_PROPS = ['retroSettings', 'waterSettings', 'advSettings', 'filterSettings', 'baseState'];
    let undoStack = [];
    let redoStack = [];
    let modSaveTimer = null;
    let restoring = false;

    function stopEffectTweens() {
        if (!window.canvas) return;
        window.canvas.getObjects().forEach((o) => {
            if (o.activeTween) {
                o.activeTween.kill();
                o.activeTween = null;
            }
            if (o.waterTween) {
                o.waterTween.kill();
                o.waterTween = null;
            }
            gsap.killTweensOf(o);
            if (o.retroSettings) gsap.killTweensOf(o.retroSettings);
        });
    }

    function stripGsapFromCanvasObjects() {
        if (!window.canvas) return;
        window.canvas.getObjects().forEach((o) => {
            delete o._gsap;
            if (o.retroSettings) delete o.retroSettings._gsap;
        });
    }

    function computeSnapshotKey(snap) {
        const json = snap.json;
        if (!json) return '';
        const objs = json.objects;
        if (!Array.isArray(objs)) return String(snap.bg ?? '');
        const parts = [String(snap.bg ?? ''), objs.length];
        for (let i = 0; i < objs.length; i++) {
            const o = objs[i];
            if (!o) continue;
            parts.push(
                o.type,
                o.left,
                o.top,
                o.scaleX,
                o.scaleY,
                o.angle,
                o.retroSettings?.activeFxId,
                o.retroSettings?.effectStarted ? 1 : 0
            );
        }
        return parts.join('|');
    }

    function captureSnapshot() {
        if (!window.canvas) return null;
        stripGsapFromCanvasObjects();
        const raw = window.canvas.toJSON(CANVAS_PROPS);
        const json = typeof window.sanitizeHistoryCanvasJson === 'function'
            ? window.sanitizeHistoryCanvasJson(raw)
            : raw;
        return {
            json,
            bg: window.canvas.backgroundColor
        };
    }

    function restoreSnapshot(snap) {
        if (!snap?.json || !window.canvas) return;
        restoring = true;
        stopEffectTweens();
        window.canvas.isDrawingMode = false;
        if (window.maskDrawState) window.maskDrawState.active = false;

        let jsonToLoad = snap.json;
        if (typeof window.sanitizeHistoryCanvasJson === 'function') {
            jsonToLoad = window.sanitizeHistoryCanvasJson(snap.json);
        }

        window.canvas.loadFromJSON(jsonToLoad, () => {
            window.canvas.setBackgroundColor(snap.bg ?? null, () => {
                window.canvas.getObjects().forEach((o) => {
                    if (o.type !== 'image') return;
                    if (typeof window.rebuildImageFilterFromRetroSettings === 'function') {
                        window.rebuildImageFilterFromRetroSettings(o);
                    } else if (o.filters?.length) {
                        window.safeApplyImageFilters?.(o);
                    }
                });
                window.canvas.renderAll();
                if (typeof window.hideFilterControls === 'function') window.hideFilterControls();
                if (typeof window.updateEffectPlayToggleUi === 'function') window.updateEffectPlayToggleUi();
                restoring = false;
            });
        });
    }

    window.resetEffectEditorHistory = function () {
        undoStack = [];
        redoStack = [];
    };

    let historyFlushTimer = null;

    function flushHistorySnapshot() {
        historyFlushTimer = null;
        if (restoring || !window.canvas) return;
        const snap = captureSnapshot();
        if (!snap) return;
        const snapKey = computeSnapshotKey(snap);
        const last = undoStack[undoStack.length - 1];
        if (last && computeSnapshotKey(last) === snapKey) return;
        undoStack.push(snap);
        if (undoStack.length > MAX) undoStack.shift();
        redoStack = [];
    }

    window.saveEffectHistorySnapshot = function (options) {
        if (restoring || !window.canvas) return;
        if (options && options.sync) {
            if (historyFlushTimer) {
                clearTimeout(historyFlushTimer);
                historyFlushTimer = null;
            }
            flushHistorySnapshot();
            return;
        }
        const delay = options && options.delay !== undefined ? options.delay : 150;
        if (historyFlushTimer) clearTimeout(historyFlushTimer);
        historyFlushTimer = setTimeout(flushHistorySnapshot, delay);
    };

    window.effectEditorUndo = function () {
        if (undoStack.length < 2) return;
        redoStack.push(undoStack.pop());
        restoreSnapshot(undoStack[undoStack.length - 1]);
    };

    window.effectEditorRedo = function () {
        if (!redoStack.length) return;
        const snap = redoStack.pop();
        undoStack.push(snap);
        restoreSnapshot(snap);
    };

    window.canvas.on('object:modified', () => {
        if (restoring) return;
        clearTimeout(modSaveTimer);
        modSaveTimer = setTimeout(() => window.saveEffectHistorySnapshot({ delay: 350 }), 350);
    });

    document.getElementById('delete-btn')?.addEventListener('click', () => {
        if (typeof window.saveEffectHistorySnapshot === 'function') {
            window.saveEffectHistorySnapshot({ delay: 0 });
        }
    }, true);

    window.canvas.on('path:created', () => {
        if (!restoring && typeof window.saveEffectHistorySnapshot === 'function') {
            window.saveEffectHistorySnapshot({ delay: 300 });
        }
    });

    ['applyEffect', 'applyStaticFilter', 'applyRetroFx'].forEach((fnName) => {
        const orig = window[fnName];
        if (typeof orig !== 'function') return;
        window[fnName] = function () {
            if (typeof window.saveEffectHistorySnapshot === 'function') {
                window.saveEffectHistorySnapshot({ delay: 250 });
            }
            return orig.apply(this, arguments);
        };
    });

    setTimeout(() => window.saveEffectHistorySnapshot({ delay: 0 }), 400);
})();

window.fitObjectToCanvas = function(type) {
    if (!window.canvas) return;
    let obj = window.canvas.getActiveObject();
    if (!obj) {
        const objs = window.canvas.getObjects();
        obj = objs.find(o => o.type === 'image' || o.type === 'video') || objs[0];
    }
    if (!obj || !obj.width || !obj.height) return;
    const cWidth = window.canvas.width;
    const cHeight = window.canvas.height;
    let sX = 1, sY = 1;
    if (type === 'fill') { sX = cWidth / obj.width; sY = cHeight / obj.height; }
    else if (type === 'width') { sX = cWidth / obj.width; sY = sX; }
    else if (type === 'height') { sY = cHeight / obj.height; sX = sY; }
    obj.set({ scaleX: sX, scaleY: sY, left: cWidth / 2, top: cHeight / 2, originX: 'center', originY: 'center', baseScaleX: sX, baseScaleY: sY, baseLeft: cWidth / 2, baseTop: cHeight / 2 });
    obj.setCoords();
    window.canvas.requestRenderAll();
    const scaleSlider = document.getElementById('img-scale-slider');
    if (scaleSlider) scaleSlider.value = Math.round(sX * 100);
    if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();
    if (typeof window.updatePropertyPanel === 'function') window.updatePropertyPanel(obj);
};

// ── 상세페이지 자막(텍스트) 속성 패널 바인딩 및 업데이트 함수 ──
window.setTextPropertiesPanelEnabled = function(enabled) {
    const textPanel = document.getElementById('text-properties-panel');
    if (!textPanel) return;

    if (enabled) {
        textPanel.style.display = 'block';
    } else {
        textPanel.style.display = 'none';
        
        // 폰트 선택 모달창도 닫기
        const fontModal = document.getElementById('effectFontModal');
        if (fontModal) {
            fontModal.style.display = 'none';
        }
    }

    const inputs = textPanel.querySelectorAll('input, textarea, select, button');
    inputs.forEach(el => {
        el.disabled = !enabled;
        if (!enabled) {
            el.style.opacity = '0.4';
            el.style.pointerEvents = 'none';
        } else {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
    });
};

window.updateTextPropertyPanel = function (obj) {
    if (!obj || obj.type !== 'i-text') {
        window.setTextPropertiesPanelEnabled(false);
        return;
    }
    
    window.setTextPropertiesPanelEnabled(true);
    
    // 다른 조절 패널 숨기기
    const subtitlePresetPanel = document.getElementById('subtitle-preset-panel');
    if (subtitlePresetPanel) subtitlePresetPanel.style.display = 'none';
    const filterPanel = document.getElementById('filter-settings-panel');
    if (filterPanel) filterPanel.style.display = 'none';
    const emptyMsg = document.getElementById('filter-empty-msg');
    if (emptyMsg) emptyMsg.style.display = 'none';

    // 텍스트 속성 제어 패널 켜기
    const textPanel = document.getElementById('text-properties-panel');
    if (textPanel) textPanel.style.display = 'block';

    const txtContent = document.getElementById('propTextContent');
    const fontLabel = document.getElementById('propFontLabel');
    const fontSize = document.getElementById('propFontSize');
    const fill = document.getElementById('propFill');
    const strokeWidth = document.getElementById('propStrokeWidth');
    const stroke = document.getElementById('propStroke');
    const shadowOffset = document.getElementById('propShadowOffset');
    const shadowBlur = document.getElementById('propShadowBlur');
    const shadowColor = document.getElementById('propShadowColor');
    const charSpacing = document.getElementById('propCharSpacing');
    const lineHeight = document.getElementById('propLineHeight');

    if (txtContent) txtContent.value = obj.text || '';
    if (fontLabel) {
        fontLabel.textContent = obj.fontFamily || 'Pretendard';
    }
    if (fontSize) fontSize.value = obj.fontSize || 80;
    if (fill) fill.value = obj.fill || '#ffffff';
    if (strokeWidth) strokeWidth.value = obj.strokeWidth || 0;
    if (stroke) stroke.value = obj.stroke || '#000000';

    if (obj.shadow) {
        if (shadowOffset) shadowOffset.value = obj.shadow.offsetX || 0;
        if (shadowBlur) shadowBlur.value = obj.shadow.blur || 0;
        if (shadowColor) shadowColor.value = obj.shadow.color || '#000000';
    } else {
        if (shadowOffset) shadowOffset.value = 0;
        if (shadowBlur) shadowBlur.value = 0;
        if (shadowColor) shadowColor.value = '#000000';
    }

    if (charSpacing) charSpacing.value = obj.charSpacing || 0;
    if (lineHeight) lineHeight.value = obj.lineHeight || 1.1;

    // 정렬 버튼 클래스 처리
    const alignLeft = document.getElementById('alignLeftBtn');
    const alignCenter = document.getElementById('alignCenterBtn');
    const alignRight = document.getElementById('alignRightBtn');

    [alignLeft, alignCenter, alignRight].forEach(btn => btn?.classList.remove('active'));
    if (obj.textAlign === 'left' && alignLeft) alignLeft.classList.add('active');
    if (obj.textAlign === 'center' && alignCenter) alignCenter.classList.add('active');
    if (obj.textAlign === 'right' && alignRight) alignRight.classList.add('active');

    // 스타일 버튼 클래스 처리
    const fontNormal = document.getElementById('fontNormalBtn');
    const fontBold = document.getElementById('fontBoldBtn');
    const fontItalic = document.getElementById('fontItalicBtn');

    if (fontNormal) fontNormal.classList.remove('active');
    if (fontBold) fontBold.classList.remove('active');
    if (fontItalic) fontItalic.classList.remove('active');

    let isBold = false;
    let isItalic = false;

    if (obj.isEditing) {
        const styles = obj.getSelectionStyles();
        isBold = styles.length > 0 ? (styles[0].fontWeight === 'bold') : (obj.fontWeight === 'bold');
        isItalic = styles.length > 0 ? (styles[0].fontStyle === 'italic') : (obj.fontStyle === 'italic');
    } else {
        isBold = obj.fontWeight === 'bold';
        isItalic = obj.fontStyle === 'italic';
    }

    if (isBold && fontBold) fontBold.classList.add('active');
    if (isItalic && fontItalic) fontItalic.classList.add('active');
    if (!isBold && !isItalic && fontNormal) fontNormal.classList.add('active');
};

// ── 스타일 부분 적용 (Rich Text) 또는 전체 적용을 결정하는 유틸 함수 ──
window.applySubtitleProperty = function (key, value) {
    const canvas = window.canvas;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'i-text') return;

    if (activeObject.isEditing) {
        // 드래그한 선택 영역에만 개별 스타일 적용
        const styles = {};
        styles[key] = value;
        activeObject.setSelectionStyles(styles);
    } else {
        // 객체 전체 속성 변경
        activeObject.set(key, value);
    }
    
    canvas.requestRenderAll();
    
    if (typeof window.saveEffectHistorySnapshot === 'function') {
        window.saveEffectHistorySnapshot({ delay: 500 });
    }
};

// ── 상세페이지 캔버스 및 자막 편집 폼 이벤트 초기화 ──
(function initDetailPageAndTextProperties() {
    // Fabric.js 초기화 완료 후 실행을 위한 타이머 대기
    setTimeout(() => {
        const canvas = window.canvas;
        if (!canvas) return;

        const detailModeCheckbox = document.getElementById('detail-page-mode');
        const detailDimsWrap = document.getElementById('detail-dims-wrap');
        const resolutionSelect = document.getElementById('resolution');
        const canvasWrapper = document.getElementById('canvas-wrapper');
        const detailWidthInput = document.getElementById('detail-width');
        const detailHeightInput = document.getElementById('detail-height');
        const detailHeightAddBtn = document.getElementById('detail-height-add');

        if (detailModeCheckbox) {
            detailModeCheckbox.addEventListener('change', function() {
                const isDetail = this.checked;
                if (isDetail) {
                    if (resolutionSelect) resolutionSelect.style.display = 'none';
                    if (detailDimsWrap) detailDimsWrap.style.display = 'flex';
                    if (canvasWrapper) canvasWrapper.classList.add('detail-mode-scroll');
                } else {
                    if (resolutionSelect) resolutionSelect.style.display = 'inline-block';
                    if (detailDimsWrap) detailDimsWrap.style.display = 'none';
                    if (canvasWrapper) canvasWrapper.classList.remove('detail-mode-scroll');
                }
                window.updateEffectEditorCanvasSize();
            });
        }

        if (detailWidthInput) {
            detailWidthInput.addEventListener('input', () => window.updateEffectEditorCanvasSize());
        }
        if (detailHeightInput) {
            detailHeightInput.addEventListener('input', () => window.updateEffectEditorCanvasSize());
        }
        if (detailHeightAddBtn && detailHeightInput) {
            detailHeightAddBtn.addEventListener('click', () => {
                const curH = parseInt(detailHeightInput.value) || 2000;
                detailHeightInput.value = curH + 500;
                window.updateEffectEditorCanvasSize();
            });
        }

        // 오브젝트 드래그(이동) 시 캔버스 아래 영역을 넘어가면 세로 길이 자동 확장
        canvas.on('object:moving', function(e) {
            const isDetail = detailModeCheckbox ? detailModeCheckbox.checked : false;
            if (!isDetail || !detailHeightInput) return;

            const obj = e.target;
            if (!obj) return;

            // 오브젝트의 바운더리 박스 바닥 계산
            const bound = obj.getBoundingRect();
            const objBottom = bound.top + bound.height;
            const currentCanvasHeight = canvas.height;

            if (objBottom > currentCanvasHeight) {
                const newHeight = Math.ceil(objBottom + 120); // 추가 여백 부여
                detailHeightInput.value = newHeight;
                
                // 실제 해상도와 줌 크기 재계산
                canvas.setDimensions({ width: canvas.width, height: newHeight });
                
                const logicalW = detailWidthInput ? parseInt(detailWidthInput.value) || 900 : 900;
                const vp = window.getCanvasViewportSize ? window.getCanvasViewportSize() : { w: window.innerWidth - 500, h: window.innerHeight - 100 };
                const margin = 20;
                const fitScale = (vp.w - margin) / logicalW;
                const scale = Number.isFinite(fitScale) && fitScale > 0 ? Math.min(1.0, fitScale) : 1.0;
                
                canvas.setDimensions({
                    width: `${logicalW * scale}px`,
                    height: `${newHeight * scale}px`
                }, { cssOnly: true });
                
                canvas.calcOffset();
                canvas.requestRenderAll();
            }
        });

        // 캔버스 객체 선택 시 패널 스위칭 및 값 동기화
        canvas.on('selection:created', (e) => {
            const obj = e.selected?.[0] || e.target;
            if (typeof window.updateCommonPropertiesPanel === 'function') {
                window.updateCommonPropertiesPanel(obj);
            }
            if (obj && obj.type === 'i-text') {
                window.updateTextPropertyPanel(obj);
            } else {
                if (typeof window.setTextPropertiesPanelEnabled === 'function') {
                    window.setTextPropertiesPanelEnabled(false);
                }
            }
        });
        canvas.on('selection:updated', (e) => {
            const obj = e.selected?.[0] || e.target;
            if (typeof window.updateCommonPropertiesPanel === 'function') {
                window.updateCommonPropertiesPanel(obj);
            }
            if (obj && obj.type === 'i-text') {
                window.updateTextPropertyPanel(obj);
            } else {
                if (typeof window.setTextPropertiesPanelEnabled === 'function') {
                    window.setTextPropertiesPanelEnabled(false);
                }
            }
        });
        canvas.on('selection:cleared', () => {
            if (typeof window.updateCommonPropertiesPanel === 'function') {
                window.updateCommonPropertiesPanel(null);
            }
            if (typeof window.setTextPropertiesPanelEnabled === 'function') {
                window.setTextPropertiesPanelEnabled(false);
            }
        });

        // 더블클릭해서 자막 글자를 직접 수정할 시 동기화
        canvas.on('text:changed', (e) => {
            if (e.target && e.target.type === 'i-text') {
                const txtContent = document.getElementById('propTextContent');
                if (txtContent) txtContent.value = e.target.text || '';
            }
        });

        // 자막 드래그 선택 영역(부분 서식) 변경 시 스타일 상태 갱신
        canvas.on('text:selection-changed', (e) => {
            if (e.target && e.target.type === 'i-text') {
                window.updateTextPropertyPanel(e.target);
            }
        });

        // 텍스트 속성 제어 패널 이벤트 바인딩
        const txtContent = document.getElementById('propTextContent');
        const fontFamily = document.getElementById('propFontFamily');
        const fontSize = document.getElementById('propFontSize');
        const fill = document.getElementById('propFill');
        const strokeWidth = document.getElementById('propStrokeWidth');
        const stroke = document.getElementById('propStroke');
        const shadowOffset = document.getElementById('propShadowOffset');
        const shadowBlur = document.getElementById('propShadowBlur');
        const shadowColor = document.getElementById('propShadowColor');
        const charSpacing = document.getElementById('propCharSpacing');
        const lineHeight = document.getElementById('propLineHeight');

        if (txtContent) {
            txtContent.addEventListener('input', function() {
                const activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === 'i-text') {
                    activeObject.set('text', this.value);
                    canvas.requestRenderAll();
                }
            });
        }
        if (fontFamily) {
            fontFamily.addEventListener('change', function() {
                window.applySubtitleProperty('fontFamily', this.value);
            });
        }
        if (fontSize) {
            fontSize.addEventListener('input', function() {
                window.applySubtitleProperty('fontSize', parseInt(this.value) || 20);
            });
        }
        if (fill) {
            fill.addEventListener('input', function() {
                window.applySubtitleProperty('fill', this.value);
            });
        }
        if (strokeWidth) {
            strokeWidth.addEventListener('input', function() {
                window.applySubtitleProperty('strokeWidth', parseInt(this.value) || 0);
            });
        }
        if (stroke) {
            stroke.addEventListener('input', function() {
                window.applySubtitleProperty('stroke', this.value);
            });
        }

        // 그림자 통합 조절기
        function getShadowValue() {
            const offset = parseInt(shadowOffset?.value) || 0;
            const blur = parseInt(shadowBlur?.value) || 0;
            const color = shadowColor?.value || '#000000';
            if (offset === 0 && blur === 0) return null;
            return new fabric.Shadow({
                color: color,
                blur: blur,
                offsetX: offset,
                offsetY: offset
            });
        }
        const triggerShadowUpdate = () => {
            window.applySubtitleProperty('shadow', getShadowValue());
        };

        if (shadowOffset) shadowOffset.addEventListener('input', triggerShadowUpdate);
        if (shadowBlur) shadowBlur.addEventListener('input', triggerShadowUpdate);
        if (shadowColor) shadowColor.addEventListener('input', triggerShadowUpdate);

        if (charSpacing) {
            charSpacing.addEventListener('input', function() {
                window.applySubtitleProperty('charSpacing', parseInt(this.value) || 0);
            });
        }
        if (lineHeight) {
            lineHeight.addEventListener('input', function() {
                window.applySubtitleProperty('lineHeight', parseFloat(this.value) || 1.0);
            });
        }

        // 정렬 단추 리스너
        const alignLeft = document.getElementById('alignLeftBtn');
        const alignCenter = document.getElementById('alignCenterBtn');
        const alignRight = document.getElementById('alignRightBtn');

        if (alignLeft) {
            alignLeft.addEventListener('click', function() {
                window.applySubtitleProperty('textAlign', 'left');
                [alignLeft, alignCenter, alignRight].forEach(b => b?.classList.remove('active'));
                alignLeft.classList.add('active');
            });
        }
        if (alignCenter) {
            alignCenter.addEventListener('click', function() {
                window.applySubtitleProperty('textAlign', 'center');
                [alignLeft, alignCenter, alignRight].forEach(b => b?.classList.remove('active'));
                alignCenter.classList.add('active');
            });
        }
        if (alignRight) {
            alignRight.addEventListener('click', function() {
                window.applySubtitleProperty('textAlign', 'right');
                [alignLeft, alignCenter, alignRight].forEach(b => b?.classList.remove('active'));
                alignRight.classList.add('active');
            });
        }

        // 스타일 단추 리스너
        const fontNormal = document.getElementById('fontNormalBtn');
        const fontBold = document.getElementById('fontBoldBtn');
        const fontItalic = document.getElementById('fontItalicBtn');

        if (fontNormal) {
            fontNormal.addEventListener('click', function() {
                const activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === 'i-text') {
                    window.applySubtitleProperty('fontWeight', 'normal');
                    window.applySubtitleProperty('fontStyle', 'normal');
                    [fontNormal, fontBold, fontItalic].forEach(b => b?.classList.remove('active'));
                    fontNormal.classList.add('active');
                }
            });
        }

        if (fontBold) {
            fontBold.addEventListener('click', function() {
                const activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === 'i-text') {
                    let currentVal = '';
                    if (activeObject.isEditing) {
                        const styles = activeObject.getSelectionStyles();
                        currentVal = (styles.length > 0 && styles[0]) ? (styles[0].fontWeight || 'normal') : (activeObject.fontWeight || 'normal');
                    } else {
                        currentVal = activeObject.fontWeight || 'normal';
                    }
                    const nextVal = (currentVal === 'bold') ? 'normal' : 'bold';
                    window.applySubtitleProperty('fontWeight', nextVal);
                    
                    // 버튼 활성화 상태 갱신
                    if (nextVal === 'bold') {
                        fontBold.classList.add('active');
                        fontNormal.classList.remove('active');
                    } else {
                        fontBold.classList.remove('active');
                        if (!fontItalic.classList.contains('active')) {
                            fontNormal.classList.add('active');
                        }
                    }
                }
            });
        }

        if (fontItalic) {
            fontItalic.addEventListener('click', function() {
                const activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === 'i-text') {
                    let currentVal = '';
                    if (activeObject.isEditing) {
                        const styles = activeObject.getSelectionStyles();
                        currentVal = (styles.length > 0 && styles[0]) ? (styles[0].fontStyle || 'normal') : (activeObject.fontStyle || 'normal');
                    } else {
                        currentVal = activeObject.fontStyle || 'normal';
                    }
                    const nextVal = (currentVal === 'italic') ? 'normal' : 'italic';
                    window.applySubtitleProperty('fontStyle', nextVal);
                    
                    // 버튼 활성화 상태 갱신
                    if (nextVal === 'italic') {
                        fontItalic.classList.add('active');
                        fontNormal.classList.remove('active');
                    } else {
                        fontItalic.classList.remove('active');
                        if (!fontBold.classList.contains('active')) {
                            fontNormal.classList.add('active');
                        }
                    }
                }
            });
        }

        // ── 공통 레이어 투명도 및 회전 조절 ──
        const commonOpacity = document.getElementById('commonOpacity');
        const commonOpacityNum = document.getElementById('commonOpacityNum');
        const commonAngle = document.getElementById('commonAngle');
        const commonAngleNum = document.getElementById('commonAngleNum');

        window.updateCommonPropertiesPanel = function(obj) {
            if (!commonOpacity || !commonOpacityNum || !commonAngle || !commonAngleNum) return;

            if (obj) {
                // 활성화 및 동기화
                commonOpacity.disabled = false;
                commonOpacityNum.disabled = false;
                commonAngle.disabled = false;
                commonAngleNum.disabled = false;

                const opacityPct = Math.round((obj.opacity !== undefined ? obj.opacity : 1.0) * 100);
                const angleDeg = Math.round(obj.angle || 0) % 360;

                commonOpacity.value = opacityPct;
                commonOpacityNum.value = opacityPct;
                commonAngle.value = angleDeg;
                commonAngleNum.value = angleDeg;
            } else {
                // 비선택 시 비활성화 및 기본값 설정
                commonOpacity.value = 100;
                commonOpacityNum.value = 100;
                commonAngle.value = 0;
                commonAngleNum.value = 0;

                commonOpacity.disabled = true;
                commonOpacityNum.disabled = true;
                commonAngle.disabled = true;
                commonAngleNum.disabled = true;
            }
        };

        if (commonOpacity && commonOpacityNum) {
            const handleCommonOpacityChange = (val) => {
                const pct = Math.max(10, Math.min(100, parseInt(val) || 100));
                commonOpacity.value = pct;
                commonOpacityNum.value = pct;

                const activeObject = canvas.getActiveObject();
                if (activeObject) {
                    activeObject.set('opacity', pct / 100);
                    canvas.requestRenderAll();
                }
            };
            commonOpacity.addEventListener('input', (e) => handleCommonOpacityChange(e.target.value));
            commonOpacityNum.addEventListener('input', (e) => handleCommonOpacityChange(e.target.value));
        }

        if (commonAngle && commonAngleNum) {
            const handleCommonAngleChange = (val) => {
                const deg = (parseInt(val) || 0) % 360;
                commonAngle.value = deg;
                commonAngleNum.value = deg;

                const activeObject = canvas.getActiveObject();
                if (activeObject) {
                    activeObject.set('angle', deg);
                    canvas.requestRenderAll();
                }
            };
            commonAngle.addEventListener('input', (e) => handleCommonAngleChange(e.target.value));
            commonAngleNum.addEventListener('input', (e) => handleCommonAngleChange(e.target.value));
        }

        // 캔버스 자체에서의 수정 이벤트 (회전, 수정 등) 시 값 연동
        canvas.on('object:rotating', (e) => {
            const obj = e.target;
            if (obj) {
                const angleDeg = Math.round(obj.angle || 0) % 360;
                if (commonAngle) commonAngle.value = angleDeg;
                if (commonAngleNum) commonAngleNum.value = angleDeg;
            }
        });

        canvas.on('object:modified', (e) => {
            const obj = e.target;
            if (obj) {
                window.updateCommonPropertiesPanel(obj);
            }
        });

        // 초기 비활성화 상태 호출
        window.updateCommonPropertiesPanel(null);
        if (typeof window.setTextPropertiesPanelEnabled === 'function') {
            window.setTextPropertiesPanelEnabled(false);
        }
        refreshTextPresetSelect();

        // ── 프리셋 CRUD 버튼 이벤트 바인딩 ──
        const presetSelect = document.getElementById('propTextPresetSelect');
        const presetLoadBtn = document.getElementById('propTextPresetLoadBtn');
        const presetSaveBtn = document.getElementById('propTextPresetSaveBtn');
        const presetDeleteBtn = document.getElementById('propTextPresetDeleteBtn');

        if (presetLoadBtn && presetSelect) {
            presetLoadBtn.addEventListener('click', function() {
                const activeObject = canvas.getActiveObject();
                if (!activeObject || activeObject.type !== 'i-text') {
                    alert('프리셋을 적용할 자막 레이어를 선택하세요.');
                    return;
                }
                const name = presetSelect.value;
                if (!name) {
                    alert('적용할 프리셋을 선택하세요.');
                    return;
                }

                let presets = {};
                try { presets = JSON.parse(localStorage.getItem('subtitlePresets') || '{}'); } catch(_) {}
                const p = presets[name];
                if (!p) return;

                // 프리셋 데이터를 Fabric IText 객체에 입히기 (텍스트 내용 및 부분 서식 styles까지 적용 위해 keepText: false 사용)
                if (typeof window.applySubtitlePresetToFabricText === 'function') {
                    window.applySubtitlePresetToFabricText(activeObject, name, { keepText: false, keepPosition: true });
                } else {
                    activeObject.set({
                        text: p.text || activeObject.text,
                        styles: p.styles ? JSON.parse(JSON.stringify(p.styles)) : {},
                        fontFamily: p.fontFamily,
                        fontSize: p.fontSize,
                        fill: p.fill,
                        charSpacing: p.charSpacing,
                        strokeWidth: p.strokeWidth,
                        stroke: p.stroke,
                        lineHeight: p.lineHeight,
                        fontWeight: p.fontWeight || 'normal',
                        fontStyle: p.fontStyle || 'normal',
                        textAlign: p.textAlign || 'left',
                        opacity: p.opacity !== undefined ? p.opacity : 1,
                        angle: p.angle || 0
                    });
                    if (p.shadow) {
                        activeObject.set('shadow', new fabric.Shadow({
                            blur: p.shadow.blur !== undefined ? p.shadow.blur : 0,
                            offsetX: p.shadow.offsetX !== undefined ? p.shadow.offsetX : (p.shadow.blur || 0),
                            offsetY: p.shadow.offsetY !== undefined ? p.shadow.offsetY : (p.shadow.blur || 0),
                            color: p.shadow.color
                        }));
                    } else {
                        activeObject.set('shadow', null);
                    }
                }
                
                canvas.requestRenderAll();
                window.updateTextPropertyPanel(activeObject);
            });
        }

        if (presetSaveBtn) {
            presetSaveBtn.addEventListener('click', function() {
                const activeObject = canvas.getActiveObject();
                if (!activeObject || activeObject.type !== 'i-text') {
                    alert('스타일을 저장할 자막 레이어를 선택하세요.');
                    return;
                }
                const presetNameInput = document.getElementById('propTextPresetNameInput');
                const name = presetNameInput ? presetNameInput.value : '';
                if (!name || !name.trim()) {
                    alert('저장할 프리셋 이름을 입력하세요.');
                    return;
                }
                const trimmedName = name.trim();

                let presets = {};
                try { presets = JSON.parse(localStorage.getItem('subtitlePresets') || '{}'); } catch(_) {}

                if (presets[trimmedName]) {
                    if (!confirm(`이미 '${trimmedName}' 프리셋이 존재합니다. 덮어씌우시겠습니까?`)) {
                        return;
                    }
                }

                const bOp = activeObject.opacity;
                const bSx = activeObject.scaleX;
                const bSy = activeObject.scaleY;
                const bAng = activeObject.angle;
                const bL = activeObject.left;
                const bT = activeObject.top;

                presets[trimmedName] = {
                    text: activeObject.text,
                    fontFamily: activeObject.fontFamily,
                    fontSize: activeObject.fontSize,
                    fill: activeObject.fill,
                    charSpacing: activeObject.charSpacing,
                    strokeWidth: activeObject.strokeWidth,
                    stroke: activeObject.stroke,
                    lineHeight: activeObject.lineHeight,
                    fontWeight: activeObject.fontWeight || 'normal',
                    fontStyle: activeObject.fontStyle || 'normal',
                    textAlign: activeObject.textAlign || 'left',
                    left: bL,
                    top: bT,
                    angle: bAng,
                    scaleX: bSx,
                    scaleY: bSy,
                    opacity: bOp,
                    baseLeft: bL,
                    baseTop: bT,
                    baseAngle: bAng,
                    baseScaleX: bSx,
                    baseScaleY: bSy,
                    baseOpacity: bOp,
                    shadow: activeObject.shadow ? {
                        blur: activeObject.shadow.blur,
                        color: activeObject.shadow.color,
                        offsetX: activeObject.shadow.offsetX,
                        offsetY: activeObject.shadow.offsetY
                    } : null,
                    styles: activeObject.styles ? JSON.parse(JSON.stringify(activeObject.styles)) : null
                };

                localStorage.setItem('subtitlePresets', JSON.stringify(presets));
                if (typeof window.refreshEffectTextPresets === 'function') {
                    window.refreshEffectTextPresets();
                }
                refreshTextPresetSelect();
                presetSelect.value = trimmedName;
                if (presetNameInput) presetNameInput.value = '';
            });
        }

        if (presetDeleteBtn && presetSelect) {
            presetDeleteBtn.addEventListener('click', function() {
                const name = presetSelect.value;
                if (!name) {
                    alert('삭제할 프리셋을 먼저 선택해 주세요.');
                    return;
                }
                if (!confirm(`'${name}' 프리셋을 영구 삭제하시겠습니까? (메인에서도 삭제됨)`)) {
                    return;
                }

                let presets = {};
                try { presets = JSON.parse(localStorage.getItem('subtitlePresets') || '{}'); } catch(_) {}
                delete presets[name];

                localStorage.setItem('subtitlePresets', JSON.stringify(presets));
                if (typeof window.refreshEffectTextPresets === 'function') {
                    window.refreshEffectTextPresets();
                }
                refreshTextPresetSelect();
                alert('자막 프리셋이 삭제되었습니다.');
            });
        }

    }, 500);
})();
