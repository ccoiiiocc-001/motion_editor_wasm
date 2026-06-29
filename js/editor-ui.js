const ratioSelect = document.getElementById('ratioSelect');
const bgInput = document.getElementById('bgInput');
const videoInput = document.getElementById('videoInput');
const imageInput = document.getElementById('imageInput');
const audioInput = document.getElementById('audioInput');
const bgBtn = document.getElementById('bgBtn');
const videoBtn = document.getElementById('videoBtn');
const imageBtn = document.getElementById('imageBtn');
const audioBtn = document.getElementById('audioBtn');
const recordBtn = document.getElementById('recordBtn');
const addTextBtn = document.getElementById('addTextBtn');
const drawBtn = document.getElementById('drawBtn');
const drawModal = document.getElementById('drawModal');
const colorPickerCanvas = document.getElementById('colorPickerCanvas');
const opacityPickerCanvas = document.getElementById('opacityPickerCanvas');
const widthPickerCanvas = document.getElementById('widthPickerCanvas');
const penTypeBtns = document.querySelectorAll('.pen-types button');
const stampBtns = document.querySelectorAll('.stamp-btn');
const stampTabs = document.querySelectorAll('.stamp-tab');
const stampPages = [document.getElementById('stampPage1'), document.getElementById('stampPage2'), document.getElementById('stampPage3'), document.getElementById('stampPage4')];
const popupRecordContBtn = document.getElementById('popupRecordContBtn');
const popupRecordInterBtn = document.getElementById('popupRecordInterBtn');
const popupStopBtn = document.getElementById('popupStopBtn');
const popupCancelBtn = document.getElementById('popupCancelBtn');
const popupUndoBtn = document.getElementById('popupUndoBtn');
const popupClearBtn = document.getElementById('popupClearBtn');
const recordEraseCheck = document.getElementById('recordEraseCheck');
const popupRecordTimer = document.getElementById('popupRecordTimer');
const previewSpeed1xBtn = document.getElementById('previewSpeed1xBtn');
const fpBlockOverlay = document.getElementById('fpBlockOverlay');
const colorFilterMode = document.getElementById('colorFilterMode');
const filterSweepTime = document.getElementById('filterSweepTime');
const colorFilterToggle = document.getElementById('colorFilterToggle');
const mouseEffectSelect = document.getElementById('mouseEffectSelect');
const turnOffEffectsBtn = document.getElementById('turnOffEffectsBtn');
const particleItemSelect = document.getElementById('particleItemSelect');
const particleCustomSelectBtn = document.getElementById('particleCustomSelectBtn');
const particleCustomSelectLabel = document.getElementById('particleCustomSelectLabel');
const particleCustomDropdown = document.getElementById('particleCustomDropdown');
const pAmt = document.getElementById('pAmt');
const pSz = document.getElementById('pSz');
const pSpd = document.getElementById('pSpd');
const pWnd = document.getElementById('pWnd');
const pOpac = document.getElementById('pOpac');
const pBlur = document.getElementById('pBlur');
const pUseCol = document.getElementById('pUseCol');
const pColVal = document.getElementById('pColVal');
const popupRawCanvas = document.getElementById('drawPopupCanvas');
const brushIndicator = document.getElementById('brushIndicator');
const customStampInput = document.getElementById('customStampInput');
const customStampBtn = document.getElementById('customStampBtn');
const waveModeSelect = document.getElementById('waveModeSelect');
const waveOptionsDiv = document.getElementById('waveOptionsDiv');
const waveShapeSelect = document.getElementById('waveShapeSelect');
const waveColorSelect = document.getElementById('waveColorSelect');
const waveSpeed = document.getElementById('waveSpeed');
const waveCount = document.getElementById('waveCount');
const waveLineWidth = document.getElementById('waveLineWidth');
const waveWidth = document.getElementById('waveWidth');
const waveHeight = document.getElementById('waveHeight');
const waveSize = document.getElementById('waveSize');
const wavePosX = document.getElementById('wavePosX');
const wavePosY = document.getElementById('wavePosY');
const wavePerformanceOptions = document.getElementById('wavePerformanceOptions');
const wavePerformanceMode = document.getElementById('wavePerformanceMode');
const waveAudioDiv = document.getElementById('waveAudioDiv');
const waveAudioInput = document.getElementById('waveAudioInput');
const waveAudioBtn = document.getElementById('waveAudioBtn');
const waveAudioLabel = document.getElementById('waveAudioLabel');
const wavePlayBtn = document.getElementById('wavePlayBtn');
const wavePauseBtn = document.getElementById('wavePauseBtn');
const waveStopBtn = document.getElementById('waveStopBtn');
const waveIncludeAudioCheck = document.getElementById('waveIncludeAudioCheck');
const clipPresetNameInput = document.getElementById('clipPresetNameInput');
const saveClipPresetBtn = document.getElementById('saveClipPresetBtn');
const saveClipLocalBtn = document.getElementById('saveClipLocalBtn');
const clipPresetSelect = document.getElementById('clipPresetSelect');
const loadClipPresetBtn = document.getElementById('loadClipPresetBtn');
const deleteClipPresetBtn = document.getElementById('deleteClipPresetBtn');
const previewModal = document.getElementById('previewModal');
const previewVideoEl = document.getElementById('previewVideoEl');
const previewProgressBar = document.getElementById('previewProgressBar');
const previewTimeText = document.getElementById('previewTimeText');
const previewSpeedSlider = document.getElementById('previewSpeedSlider');
const previewSpeedVal = document.getElementById('previewSpeedVal');
const previewSaveBtn = document.getElementById('previewSaveBtn');
const previewCancelBtn = document.getElementById('previewCancelBtn');
const previewDurationInfo = document.getElementById('previewDurationInfo');
const defaultImageDuration = document.getElementById('defaultImageDuration');
const propTrackIndex = document.getElementById('propTrackIndex');
const propOpacity = document.getElementById('propOpacity');
const propAngle = document.getElementById('propAngle');
const propScale = document.getElementById('propScale');
const propScaleX = document.getElementById('propScaleX');
const propScaleY = document.getElementById('propScaleY');
const propFill = document.getElementById('propFill');
const fontLabel = document.getElementById('fontLabel');
const localFontLabel = document.getElementById('localFontLabel');
const propFontSize = document.getElementById('propFontSize');
const propStrokeWidth = document.getElementById('propStrokeWidth');
const propStroke = document.getElementById('propStroke');
const propCharSpacing = document.getElementById('propCharSpacing');
const propLineHeight = document.getElementById('propLineHeight');
const shadowOffset = document.getElementById('shadowOffset');
const shadowBlur = document.getElementById('shadowBlur');
const shadowColor = document.getElementById('shadowColor');
const subtitleTextInput = document.getElementById('subtitleTextInput');
const alignLeftBtn = document.getElementById('alignLeftBtn');
const alignCenterBtn = document.getElementById('alignCenterBtn');
const alignRightBtn = document.getElementById('alignRightBtn');
const bringFrontBtn = document.getElementById('bringFrontBtn');
const bringForwardBtn = document.getElementById('bringForwardBtn');
const sendBackwardBtn = document.getElementById('sendBackwardBtn');
const sendBackBtn = document.getElementById('sendBackBtn');
const deleteLayerBtn = document.getElementById('deleteLayerBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const resetClipBtn = document.getElementById('resetClipBtn');
const resetTrackBtn = document.getElementById('resetTrackBtn');
const presetNameInput = document.getElementById('presetNameInput');
const savePresetBtn = document.getElementById('savePresetBtn');
const presetSelect = document.getElementById('presetSelect');
const loadPresetBtn = document.getElementById('loadPresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');
const propVolume = document.getElementById('propVolume');
const imageAlphaEditBtn = document.getElementById('imageAlphaEditBtn');
const overlapModal = document.getElementById('overlapModal');
const btnAppendClip = document.getElementById('btnAppendClip');
const btnCancelMove = document.getElementById('btnCancelMove');
const propTransitionSelect = document.getElementById('propTransitionSelect');
const btnApplyEffect = document.getElementById('btnApplyEffect');
const btnApplyTrackEffect = document.getElementById('btnApplyTrackEffect');
const canvas = new fabric.Canvas('mainCanvas', { backgroundColor: '#ffffff', preserveObjectStacking: true });
window.canvas = canvas;
// 가이드선 초기화 (canvas-guides.js)
if (typeof window.initCanvasGuides === 'function') {
    window.initCanvasGuides(canvas);
} else {
    window.addEventListener('load', () => {
        if (typeof window.initCanvasGuides === 'function') window.initCanvasGuides(canvas);
    });
}
// 가이드선 토글 버튼
const guideToggleBtn = document.getElementById('guideToggleBtn');
if (guideToggleBtn) {
    guideToggleBtn.addEventListener('click', () => {
        if (typeof window.toggleCanvasGuides === 'function') window.toggleCanvasGuides();
    });
}
fabric.Object.prototype.set({ transparentCorners: false, cornerStyle: 'circle', cornerSize: 20, touchCornerSize: 32, padding: 8, borderColor: '#ff66cc', cornerColor: '#ff99dd', cornerStrokeColor: '#ffffff' });
if (fabric.IText) { fabric.IText.prototype.set({ paintFirst: 'stroke', strokeLineJoin: 'round', strokeLineCap: 'round', strokeMiterLimit: 2, strokeUniform: true }); }
window.stepInput = function(id, val) { const el = document.getElementById(id); if (el) { el.value = parseFloat(el.value || 0) + val; el.dispatchEvent(new Event('input')); } };
window.subtitleCount = 1;
let drawCount = 1;
let subtitlePresets = JSON.parse(localStorage.getItem('subtitlePresets')) || {};
window.pendingMove = null;
const ACTION_HISTORY_MAX = 10;
window.ACTION_HISTORY_MAX = ACTION_HISTORY_MAX;
let actionHistory = [];
let redoHistory = [];
window.getActionHistory = function () { return actionHistory; };
window.getRedoHistory = function () { return redoHistory; };
window.clearEditorHistories = function () {
    actionHistory = [];
    redoHistory = [];
};
let currentRatio = localStorage.getItem('lastResolution') || '1920x1080';
window.currentRatio = currentRatio;
const savedImageDuration = localStorage.getItem('defaultImageDuration');
if (defaultImageDuration && savedImageDuration) {
    defaultImageDuration.value = savedImageDuration;
}
if (defaultImageDuration) {
    const persistDefaultImageDuration = () => {
        const v = Math.max(1, Math.min(180, parseFloat(defaultImageDuration.value) || 5));
        defaultImageDuration.value = String(v);
        localStorage.setItem('defaultImageDuration', String(v));
    };
    defaultImageDuration.addEventListener('change', persistDefaultImageDuration);
    defaultImageDuration.addEventListener('input', () => {
        localStorage.setItem('defaultImageDuration', defaultImageDuration.value || '5');
    });
}
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = 0;
let popupRecorder = null;
let popupChunks = [];
let popupInterval = null;
let isPopupDrawing = false;
let popupLastX = 0;
let popupLastY = 0;
let currentDrawColor = '#ef4444';
let currentDrawOpacity = 0.5;
let currentDrawWidth = 50;
let currentDrawType = 'none';
let currentStamp = '❤';
let customStampImg = null;
let popupCtx = null;
let bgCanvas = document.createElement('canvas');
let bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
let trailCanvas = document.createElement('canvas');
let trailCtx = trailCanvas.getContext('2d');
let fsParticles = [];
let drawHistory = [];
let popupActiveTime = 0;
let popupLastResumeTime = 0;
let fsFadingOut = false;
let fsFadeAlpha = 1.0;
window.previewBlob = null;
window.previewDuration = 0;
window.rawClipDuration = 0;
window.previewLoop = false;
window.lastRandHue = 0;
window.lastRandAlpha = 1;
window.lastRandTime = 0;
const defaultParticleState = {
    snow: { up: false, down: true, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    rain: { up: false, down: true, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    petal: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    bubble: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    heart: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    star: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    music: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    confetti: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    flower: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    spark: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    fog: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' },
    steam: { up: false, down: false, grow: false, amt: 5, sz: 15, spd: 30, wnd: 20, opac: 80, blur: 0, useCol: false, colVal: '#ffffff' }
};

// Clean up the old saved state key to prevent bugs due to incorrect stored values
try {
    localStorage.removeItem('motion_editor_particle_state');
} catch (e) {}

let loadedState = null;
try {
    const saved = localStorage.getItem('motion_editor_particle_state_v3');
    if (saved) {
        loadedState = JSON.parse(saved);
    }
} catch (e) {
    console.error('Failed to load particle state', e);
}

const pState = {};
Object.keys(defaultParticleState).forEach(k => {
    // Load all options including behavior states (up, down, grow) from saved storage
    pState[k] = Object.assign({}, defaultParticleState[k]);
    const savedOpt = loadedState ? loadedState[k] : null;
    if (savedOpt) {
        if (savedOpt.amt !== undefined) pState[k].amt = savedOpt.amt;
        if (savedOpt.sz !== undefined) pState[k].sz = savedOpt.sz;
        if (savedOpt.spd !== undefined) pState[k].spd = savedOpt.spd;
        if (savedOpt.wnd !== undefined) pState[k].wnd = savedOpt.wnd;
        if (savedOpt.opac !== undefined) pState[k].opac = savedOpt.opac;
        if (savedOpt.blur !== undefined) pState[k].blur = savedOpt.blur;
        if (savedOpt.useCol !== undefined) pState[k].useCol = savedOpt.useCol;
        if (savedOpt.colVal !== undefined) pState[k].colVal = savedOpt.colVal;
        if (savedOpt.up !== undefined) pState[k].up = savedOpt.up;
        if (savedOpt.down !== undefined) pState[k].down = savedOpt.down;
        if (savedOpt.grow !== undefined) pState[k].grow = savedOpt.grow;
    }
});
let db;
const request = indexedDB.open("MotionEditorDB", 1);
request.onupgradeneeded = function(event) { db = event.target.result; if (!db.objectStoreNames.contains("clips")) { db.createObjectStore("clips", { keyPath: "name" }); } };
request.onsuccess = function(event) { db = event.target.result; refreshPresetList(); };
function setPopupCanvasSize() {
    const popupRawCanvas = document.getElementById('drawPopupCanvas');
    if (!popupRawCanvas) return;
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    popupRawCanvas.width = bgCanvas.width = trailCanvas.width = w;
    popupRawCanvas.height = bgCanvas.height = trailCanvas.height = h;
    const mainW = canvas.lowerCanvasEl ? canvas.lowerCanvasEl.style.width : (w + 'px');
    const mainH = canvas.lowerCanvasEl ? canvas.lowerCanvasEl.style.height : (h + 'px');
    popupRawCanvas.style.width = mainW;
    popupRawCanvas.style.height = mainH;
}
window.setPopupCanvasSize = setPopupCanvasSize;

function updateRatioUI() {
    if (!ratioSelect) return;
    const options = Array.from(ratioSelect.options).map(opt => opt.value);
    const popupRatioSelect = document.getElementById('popupRatioSelect');
    const popupContainer = document.getElementById('popupCustomRatioContainer');

    if (options.includes(currentRatio)) {
        ratioSelect.value = currentRatio;
        if (popupRatioSelect) popupRatioSelect.value = currentRatio;
        if (popupContainer) popupContainer.style.display = 'none';
    } else {
        ratioSelect.value = ""; // Clear main selection since it's custom
        if (popupRatioSelect) popupRatioSelect.value = 'custom';
        if (popupContainer) popupContainer.style.display = 'flex';

        const [w, h] = currentRatio.split('x').map(Number);
        const popupWInput = document.getElementById('popupCustomWidthInput');
        const popupHInput = document.getElementById('popupCustomHeightInput');
        if (popupWInput) popupWInput.value = w || 1920;
        if (popupHInput) popupHInput.value = h || 1080;
    }
    setCanvasSize();
}
window.updateRatioUI = updateRatioUI;

function setCanvasSize() {
    window.currentRatio = currentRatio;
    const [w, h] = currentRatio.split('x').map(Number);
    canvas.setDimensions({ width: w, height: h });
    
    const canvasArea = document.querySelector('.canvas-area');
    let scale;
    if (canvasArea) {
        // Leave a 20px buffer to prevent canvas from touching container boundaries
        const targetW = Math.max(100, canvasArea.clientWidth - 20);
        const targetH = Math.max(100, canvasArea.clientHeight - 20);
        scale = Math.min(targetW / w, targetH / h);
    } else {
        // Fallback to window dimensions if .canvas-area is not loaded
        scale = Math.min((window.innerWidth - 660) / w, (window.innerHeight - 450) / h);
    }
    
    canvas.setDimensions({ width: (w * scale) + 'px', height: (h * scale) + 'px' }, { cssOnly: true });
    canvas.calcOffset();
    canvas.requestRenderAll();
    if (window.setPopupCanvasSize) window.setPopupCanvasSize();
}
window.addEventListener('resize', setCanvasSize);
window.showToast = function(text, duration) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    const ms = duration || (/실패|오류|Error|error|확인/.test(String(text)) ? 8000 : 3500);
    toast._timer = setTimeout(() => { toast.classList.remove('show'); }, ms);
};
function sortCanvasLayers() { const objects = canvas.getObjects(); objects.forEach(obj => { if (obj.trackType === 'background') { obj.zIndex = 0; } else if (obj.trackType === 'overlay') { obj.zIndex = 10 + (obj.trackIndex || 0); } }); objects.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)); objects.forEach(obj => canvas.bringToFront(obj)); canvas.requestRenderAll(); }
window.updatePropertyPanel = function(customObj) {
    const obj = customObj || canvas.getActiveObject() || window.lastSelectedObj;
    document.querySelectorAll('.prop-common, .prop-text, .prop-media, .prop-image-mask, .prop-track, .prop-delete, .prop-preset, .prop-scale-group, .prop-effect').forEach(el => el.style.display = 'none');
    if (!obj) { if (deleteLayerBtn) deleteLayerBtn.style.display = 'none'; return; }
    if (deleteLayerBtn) deleteLayerBtn.style.display = 'flex';
    document.querySelectorAll('.prop-effect').forEach(el => el.style.display = 'block');
    if (propTransitionSelect) propTransitionSelect.value = obj.transition || '';
    if (obj.trackType === 'audio') {
        document.querySelectorAll('.prop-track, .prop-media').forEach(el => el.style.display = el.classList.contains('flex-row-center') ? 'flex' : 'block');
        propTrackIndex.innerHTML = '';
        for (let i = 0; i <= 2; i++) { let opt = document.createElement('option'); opt.value = 'audio_' + i; opt.textContent = 'AUDIO ' + (i + 1); propTrackIndex.appendChild(opt); }
        propTrackIndex.value = 'audio_' + (obj.trackIndex || 0);
        if (obj.audio) propVolume.value = Math.round((obj.baseVolume !== undefined ? obj.baseVolume : obj.audio.volume) * 100);
        return;
    }
    document.querySelectorAll('.prop-common, .prop-track').forEach(el => el.style.display = el.classList.contains('flex-row-center') ? 'flex' : 'block');
    propTrackIndex.innerHTML = '';
    let optBg = document.createElement('option');
    optBg.value = 'background_0';
    optBg.textContent = 'BACKGROUND';
    propTrackIndex.appendChild(optBg);
    for (let i = 0; i <= 4; i++) { let opt = document.createElement('option'); opt.value = 'overlay_' + i; opt.textContent = 'OVERLAY ' + (i + 1); propTrackIndex.appendChild(opt); }
    propTrackIndex.value = (obj.trackType || 'overlay') + '_' + (obj.trackIndex || 0);
    propOpacity.value = Math.round((obj.baseOpacity !== undefined ? obj.baseOpacity : (obj.opacity || 1)) * 100);
    propAngle.value = Math.round(obj.baseAngle !== undefined ? obj.baseAngle : (obj.angle || 0));
    const _propOpacityNum = document.getElementById('propOpacityNum');
    const _propAngleNum = document.getElementById('propAngleNum');
    if (_propOpacityNum) _propOpacityNum.value = propOpacity.value;
    if (_propAngleNum) _propAngleNum.value = propAngle.value;
    propScaleX.value = Math.round((obj.baseScaleX !== undefined ? obj.baseScaleX : (obj.scaleX || 1)) * 100);
    propScaleY.value = Math.round((obj.baseScaleY !== undefined ? obj.baseScaleY : (obj.scaleY || 1)) * 100);
    if (propScale) propScale.value = Math.round((obj.baseScaleX !== undefined ? obj.baseScaleX : (obj.scaleX || 1)) * 100);
    if (obj.type === 'i-text') {
        document.querySelectorAll('.prop-scale-group').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.prop-text, .prop-preset').forEach(el => el.style.display = 'block');
        propFill.value = rgbToHex(obj.fill || '#000000');
        const useTextBgColorEl = document.getElementById('useTextBgColor');
        const propTextBgColorEl = document.getElementById('propTextBgColor');
        const hasBg = !!obj.textBackgroundColor;
        if (useTextBgColorEl) useTextBgColorEl.checked = hasBg;
        if (propTextBgColorEl) {
            if (hasBg) {
                propTextBgColorEl.value = rgbToHex(obj.textBackgroundColor);
            } else {
                // 기본값 흰색 유지 혹은 현재 선택값 유지
            }
        }
        if (obj.isTimedSubtitleClip && typeof window.getTimedSubtitleActiveCue === 'function') {
            const cue = window.getTimedSubtitleActiveCue(obj);
            subtitleTextInput.value = cue ? cue.text : '';
            subtitleTextInput.placeholder = '';
        } else {
            subtitleTextInput.value = obj.text || '';
            subtitleTextInput.placeholder = '';
        }
        if (fontLabel) fontLabel.textContent = obj.fontFamily || 'Arial';
        propFontSize.value = obj.fontSize || 40;
        if (propStrokeWidth) propStrokeWidth.value = obj.strokeWidth || 0;
        if (propStroke) propStroke.value = rgbToHex(obj.stroke || '#000000');
        propCharSpacing.value = obj.charSpacing || 0;
        if (propLineHeight) propLineHeight.value = obj.lineHeight || 1.1;
        if (obj.shadow) { 
            shadowOffset.value = obj.shadow.offsetX !== undefined ? obj.shadow.offsetX : 0; 
            shadowBlur.value = obj.shadow.blur !== undefined ? obj.shadow.blur : 0; 
            shadowColor.value = rgbToHex(obj.shadow.color || '#000000'); 
        } else { 
            shadowOffset.value = 0; 
            shadowBlur.value = 0; 
        }
        const nBtn = document.getElementById('fontNormalBtn'), bBtn = document.getElementById('fontBoldBtn'), iBtn = document.getElementById('fontItalicBtn');
        if (nBtn) nBtn.style.background = (obj.fontWeight !== 'bold' && obj.fontStyle !== 'italic') ? '#cbd5e1' : '';
        if (bBtn) bBtn.style.background = (obj.fontWeight === 'bold') ? '#cbd5e1' : '';
        if (iBtn) iBtn.style.background = (obj.fontStyle === 'italic') ? '#cbd5e1' : '';
    } else {
        document.querySelectorAll('.prop-scale-group').forEach(el => el.style.display = el.classList.contains('flex-row-center') ? 'flex' : 'block');
        if (obj.isVideo) {
            document.querySelectorAll('.prop-media').forEach(el => el.style.display = el.classList.contains('flex-row-center') ? 'flex' : 'block');
            document.querySelectorAll('.prop-image-mask').forEach(el => el.style.display = 'block');
            if (obj.getElement()) propVolume.value = Math.round((obj.baseVolume !== undefined ? obj.baseVolume : obj.getElement().volume) * 100);
        } else if (obj.type === 'image') {
            document.querySelectorAll('.prop-image-mask').forEach(el => el.style.display = 'block');
        }
    }
    if (typeof window.syncAutoSubtitleWrapVisibility === 'function') {
        window.syncAutoSubtitleWrapVisibility(obj);
    }
};
function updateObj(key, val, isScale = false) {
    const obj = canvas.getActiveObject();
    if (obj) {
        const finalVal = isScale ? val / 100 : val;
        if (obj.type === 'i-text' && obj.isEditing) {
            const styles = {};
            styles[key] = finalVal;
            obj.setSelectionStyles(styles);
        } else {
            obj.set(key, finalVal);
            if (key === 'opacity') obj.set('baseOpacity', finalVal);
            if (key === 'scaleX') obj.set('baseScaleX', finalVal);
            if (key === 'scaleY') obj.set('baseScaleY', finalVal);
            if (key === 'angle') obj.set('baseAngle', finalVal);
        }
        canvas.requestRenderAll();
    }
}
function updateShadow() { 
    const obj = canvas.getActiveObject(); 
    if (obj && obj.type === 'i-text') { 
        const offsetVal = parseInt(shadowOffset.value) || 0; 
        const blurVal = parseInt(shadowBlur.value) || 0; 
        if (offsetVal !== 0 || blurVal !== 0) { 
            obj.set('shadow', new fabric.Shadow({ 
                blur: blurVal, 
                offsetX: offsetVal, 
                offsetY: offsetVal, 
                color: shadowColor.value 
            })); 
        } else { 
            obj.set('shadow', null); 
        } 
        canvas.requestRenderAll(); 
    } 
}
window.executeMove = function(obj, tType, tIdx) { obj.trackType = tType; obj.trackIndex = tIdx; if (typeof sortCanvasLayers === 'function') sortCanvasLayers(); if (typeof window.renderTracks === 'function') window.renderTracks(); if (window.updatePropertyPanel) window.updatePropertyPanel(obj); };
window.showOverlapModal = function(pm) {
    window.pendingMove = pm;
    const obj = pm.obj;
    const isAudio = pm.tType === 'audio';
    const start = obj.startTime || 0;
    const end = obj.endTime || 5;
    let trackList = [];
    if (isAudio) { trackList = [{ t: 'audio', i: 0 }, { t: 'audio', i: 1 }, { t: 'audio', i: 2 }]; } else { trackList = [{ t: 'background', i: 0 }, { t: 'overlay', i: 0 }, { t: 'overlay', i: 1 }, { t: 'overlay', i: 2 }, { t: 'overlay', i: 3 }, { t: 'overlay', i: 4 }]; }
    const listEl = document.getElementById('modalEmptyTrackList');
    if (listEl) {
        listEl.innerHTML = '';
        let emptyCount = 0;
        for (const tk of trackList) {
            if (tk.t === pm.tType && tk.i === pm.tIdx) continue;
            let trackObjs = [];
            if (tk.t === 'audio') { trackObjs = audioTrackData.filter(o => o.trackIndex === tk.i && o !== obj); } else { trackObjs = canvas.getObjects().filter(o => (o.trackType || 'overlay') === tk.t && (o.trackIndex || 0) === tk.i && o !== obj); }
            let overlap = false;
            for (const o of trackObjs) { if (start < (o.endTime || 5) && end > (o.startTime || 0)) { overlap = true; break; } }
            if (!overlap) {
                let btn = document.createElement('button');
                btn.className = 'track-list-btn';
                btn.textContent = (tk.t === 'background' ? 'BACKGROUND' : (tk.t === 'audio' ? 'AUDIO ' + (tk.i + 1) : 'OVERLAY ' + (tk.i + 1))) + ' (??濡??대룞';
                btn.onclick = () => { window.executeMove(window.pendingMove.obj, tk.t, tk.i); document.getElementById('overlapModal').style.display = 'none'; window.pendingMove = null; };
                listEl.appendChild(btn);
                emptyCount++;
            }
        }
        if (emptyCount === 0) { let msg = document.createElement('div'); msg.textContent = '?대룞 媛?ν븳 鍮??몃옓???놁뒿?덈떎.'; msg.style.fontSize = '12px'; msg.style.color = '#ef4444'; msg.style.textAlign = 'center'; msg.style.padding = '10px'; listEl.appendChild(msg); }
    }
    document.getElementById('overlapModal').style.display = 'flex';
};
window.moveTrackRelative = function(step, toExtreme = false) {
    const obj = canvas.getActiveObject() || window.lastSelectedObj;
    if (!obj) { window.showToast('이동할 클립을 선택하세요.'); return; }
    const isAudio = obj.trackType === 'audio';
    const tracks = isAudio ? ['audio_0', 'audio_1', 'audio_2'] : ['background_0', 'overlay_0', 'overlay_1', 'overlay_2', 'overlay_3', 'overlay_4'];
    const currentStr = (obj.trackType || 'overlay') + '_' + (obj.trackIndex || 0);
    let idx = tracks.indexOf(currentStr);
    if (idx === -1) idx = isAudio ? 0 : 1;
    let nextIdx = idx;
    if (toExtreme) { nextIdx = step > 0 ? tracks.length - 1 : 0; } else { nextIdx = Math.max(0, Math.min(tracks.length - 1, idx + step)); }
    if (idx !== nextIdx) { propTrackIndex.value = tracks[nextIdx]; propTrackIndex.dispatchEvent(new Event('change')); }
};
window.resetClipData = function(obj) {
    if (!obj) return;
    if (obj.type !== 'audio') { obj.set({ opacity: 1, angle: 0, scaleX: obj.baseScaleX || 1, scaleY: obj.baseScaleY || 1, left: obj.baseLeft || canvas.width / 2, top: obj.baseTop || canvas.height / 2 }); obj.set('baseOpacity', 1); obj.set('baseAngle', 0); }
    obj.transitionIn = null;
    obj.transitionOut = null;
    obj.transition = null;
    obj.trimStart = 0;
    obj.baseVolume = 1;
    if (obj.isVideo && obj.getElement()) { obj.getElement().volume = 1; obj.endTime = obj.startTime + (obj.inherentDuration || 5); } else if (obj.trackType === 'audio' && obj.audio) { obj.audio.volume = 1; obj.endTime = obj.startTime + (obj.audio.duration || 5); } else { obj.endTime = obj.startTime + (parseFloat(defaultImageDuration.value) || 5); }
    if (obj.type !== 'audio') canvas.requestRenderAll();
};
function refreshPresetList() {
    try {
        subtitlePresets = JSON.parse(localStorage.getItem('subtitlePresets')) || {};
    } catch (e) {
        subtitlePresets = {};
    }
    if (presetSelect) {
        presetSelect.innerHTML = '';
        for (const key in subtitlePresets) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = key;
            presetSelect.appendChild(opt);
        }
    }
    if (clipPresetSelect && db) {
        clipPresetSelect.innerHTML = '';
        const transaction = db.transaction(["clips"], "readonly");
        const objectStore = transaction.objectStore("clips");
        objectStore.openCursor().onsuccess = function(event) { const cursor = event.target.result; if (cursor) { const opt = document.createElement('option'); opt.value = cursor.value.name; opt.textContent = cursor.value.name; clipPresetSelect.appendChild(opt); cursor.continue(); } };
    }
}

window.addEventListener('storage', (e) => {
    if (e.key === 'subtitlePresets') {
        refreshPresetList();
    }
});

// ?댁긽??寃??諛?寃쎄퀬 ?앹뾽 由ъ뒪??(臾쇰━ 紐⑤땲???섎뱶?⑥뼱 ?댁긽??湲곗?)
function checkResolution() {
    // window.devicePixelRatio瑜?怨깊븯???덈룄??OS ?ㅼ??쇰쭅(125%, 150% ????蹂댁젙???ㅼ젣 臾쇰━ ?댁긽?꾨? 怨꾩궛
    const screenWidth = Math.round(window.screen.width * (window.devicePixelRatio || 1));
    const screenHeight = Math.round(window.screen.height * (window.devicePixelRatio || 1));

    // 1. 理쒖? 吏???댁긽???쒗븳 (紐⑤땲??媛濡?1280px 誘몃쭔 ?먮뒗 ?몃줈 720px 誘몃쭔)
    if (screenWidth < 1280 || screenHeight < 720) {
        const limitModal = document.getElementById('resolutionLimitModal');
        const limitText = document.getElementById('limitResText');
        if (limitModal && limitText) {
            limitText.textContent = `${screenWidth}x${screenHeight}`;
            limitModal.style.display = 'flex';

            const exitBtn = document.getElementById('exitAppBtn');
            if (exitBtn) {
                exitBtn.addEventListener('click', () => {
                    window.close();
                    // 釉뚮씪?곗? ?앹뾽 蹂댁븞?쇰줈 ?명빐 ?ロ엳吏 ?딆쓣 寃쎌슦 ?덈궡 硫붿떆吏 媛깆떊
                    setTimeout(() => {
                        const modalContent = limitModal.querySelector('.modal-content');
                        if (modalContent) {
                            modalContent.innerHTML = `
                                <div class="modal-title" style="font-size:16px; font-weight:800; color:#ef4444; margin-bottom:16px; border-bottom:2px solid #fee2e2; padding-bottom:8px; display:flex; align-items:center; justify-content:center; gap:6px;">
                                    ?슚 ?덈궡
                                </div>
                                <p style="font-size:13px; color:#475569; line-height:1.6; margin-bottom:24px;">
                                    ?꾨줈洹몃옩??醫낅즺?섏뿀?듬땲??<br>??釉뚮씪?곗? ??李쎌쓣 ?섎룞?쇰줈 ?レ븘二쇱꽭??
                                </p>
                            `;
                        }
                    }, 300);
                });
            }
        }
        return; // 理쒖? ?ъ뼇 誘몃떖??寃쎌슦 沅뚯옣 ?덈궡???꾩슦吏 ?딆쓬
    }

    // 2. 沅뚯옣 ?댁긽??寃쎄퀬 (紐⑤땲??媛濡?1920px 誘몃쭔)
    if (screenWidth < 1920) {
        const hideResWarn = localStorage.getItem('hideResolutionWarning') === 'true';
        if (!hideResWarn) {
            const warnModal = document.getElementById('resolutionWarningModal');
            const warnText = document.getElementById('warnResText');
            if (warnModal && warnText) {
                warnText.textContent = `${screenWidth}x${screenHeight}`;
                warnModal.style.display = 'flex';

                const closeBtn = document.getElementById('closeResWarnBtn');
                const hideCheck = document.getElementById('hideResWarnCheck');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        if (hideCheck && hideCheck.checked) {
                            localStorage.setItem('hideResolutionWarning', 'true');
                        }
                        warnModal.style.display = 'none';
                    });
                }
            }
        }
    }
}

// 珥덇린?????댁긽??寃異??ㅽ뻾
window.addEventListener('DOMContentLoaded', checkResolution);

// 由ъ궗?댁쫰 ???ㅼ떆媛?理쒖? ?댁긽???댄깉 媛먯? (?ㅼ쨷 紐⑤땲??李??대룞 諛?OS 諛곗쑉 ???
window.addEventListener('resize', () => {
    const limitModal = document.getElementById('resolutionLimitModal');
    const warnModal = document.getElementById('resolutionWarningModal');
    if ((limitModal && limitModal.style.display === 'flex') || (warnModal && warnModal.style.display === 'flex')) {
        return;
    }
    const screenWidth = Math.round(window.screen.width * (window.devicePixelRatio || 1));
    const screenHeight = Math.round(window.screen.height * (window.devicePixelRatio || 1));
    if (screenWidth < 1280 || screenHeight < 720) {
        checkResolution();
    }
});

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




