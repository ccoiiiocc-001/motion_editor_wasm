(function () {
    const $ = (id) => document.getElementById(id);

    const state = {
        target: null,
        imgW: 0,
        imgH: 0,
        crop: { x: 0, y: 0, w: 0, h: 0 },
        dragStart: null,
        dragging: false,
        aspect: 'free'
    };

    let modal;
    let canvasEl;
    let ctx;

    function getTargetImageObject() {
        const obj = window.canvas?.getActiveObject?.() || window.lastSelectedObj;
        if (!obj || obj.type !== 'image' || !obj.getElement?.()) return null;
        return obj;
    }

    function imageFromElement(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = typeof src === 'string' ? src : (src.src || '');
        });
    }

    function getLogicalCanvasSize() {
        const zoom = window.canvas?.getZoom?.() || 1;
        return {
            w: (window.canvas?.width || 1920) / zoom,
            h: (window.canvas?.height || 1080) / zoom
        };
    }

    function getAspectRatio() {
        if (state.aspect === '16:9') return 16 / 9;
        if (state.aspect === '9:16') return 9 / 16;
        if (state.aspect === '1:1') return 1;
        if (state.aspect === 'canvas') {
            const { w, h } = getLogicalCanvasSize();
            return w / h;
        }
        return null;
    }

    function clampCrop() {
        const minSize = 8;
        let { x, y, w, h } = state.crop;
        w = Math.max(minSize, w);
        h = Math.max(minSize, h);
        x = Math.max(0, Math.min(x, state.imgW - minSize));
        y = Math.max(0, Math.min(y, state.imgH - minSize));
        if (x + w > state.imgW) w = state.imgW - x;
        if (y + h > state.imgH) h = state.imgH - y;
        state.crop = { x, y, w, h };
    }

    function normalizeRect(x1, y1, x2, y2) {
        let x = Math.min(x1, x2);
        let y = Math.min(y1, y2);
        let w = Math.abs(x2 - x1);
        let h = Math.abs(y2 - y1);
        const ratio = getAspectRatio();
        if (ratio) {
            if (w / h > ratio) w = h * ratio;
            else h = w / ratio;
        }
        state.crop = { x, y, w, h };
        clampCrop();
    }

    function setCanvasCssSize() {
        const stage = document.querySelector('#effectCropModal .image-alpha-stage');
        if (!stage || !canvasEl) return;
        const maxW = Math.max(240, stage.clientWidth - 24);
        const maxH = Math.max(180, stage.clientHeight - 24);
        const scale = Math.min(maxW / state.imgW, maxH / state.imgH);
        canvasEl.style.width = `${Math.max(1, Math.round(state.imgW * scale))}px`;
        canvasEl.style.height = `${Math.max(1, Math.round(state.imgH * scale))}px`;
    }

    function getImagePoint(evt) {
        const rect = canvasEl.getBoundingClientRect();
        const clientX = evt.clientX ?? evt.touches?.[0]?.clientX ?? 0;
        const clientY = evt.clientY ?? evt.touches?.[0]?.clientY ?? 0;
        return {
            x: Math.max(0, Math.min(state.imgW, ((clientX - rect.left) / rect.width) * state.imgW)),
            y: Math.max(0, Math.min(state.imgH, ((clientY - rect.top) / rect.height) * state.imgH))
        };
    }

    function drawCropPreview() {
        if (!ctx) return;
        const src = state.sourceImage;
        ctx.clearRect(0, 0, state.imgW, state.imgH);
        ctx.drawImage(src, 0, 0, state.imgW, state.imgH);
        const { x, y, w, h } = state.crop;
        if (w > 0 && h > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.beginPath();
            ctx.rect(0, 0, state.imgW, state.imgH);
            ctx.rect(x, y, w, h);
            ctx.fill('evenodd');
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.max(2, state.imgW / 400);
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            ctx.restore();
        }
    }

    function setStatus(text) {
        const el = $('effectCropStatus');
        if (el) el.textContent = text;
    }

    async function replaceFabricImageElement(obj, newImg) {
        const keep = {
            left: obj.left,
            top: obj.top,
            angle: obj.angle,
            originX: obj.originX,
            originY: obj.originY,
            opacity: obj.opacity
        };
        const oldDisplayW = obj.width * (obj.scaleX || 1);
        const oldDisplayH = obj.height * (obj.scaleY || 1);
        obj.setElement(newImg);
        const nw = newImg.naturalWidth || newImg.width;
        const nh = newImg.naturalHeight || newImg.height;
        obj.set({
            width: nw,
            height: nh,
            scaleX: oldDisplayW / nw,
            scaleY: oldDisplayH / nh,
            ...keep
        });
        obj.setCoords();
        obj.dirty = true;
        if (typeof window.saveBaseState === 'function') window.saveBaseState(obj);
        window.canvas?.requestRenderAll();
        window.canvas?.setActiveObject(obj);
    }

    async function openCropModal() {
        const obj = getTargetImageObject();
        if (!obj) {
            alert('크롭할 이미지를 먼저 선택하세요.');
            return;
        }
        
        const el = obj.getElement();
        if (el instanceof HTMLVideoElement) {
            el.pause();
            const btn = document.getElementById('video-play-pause-btn');
            if (btn) { btn.textContent = '▶'; btn.title = '재생'; }
        }
        
        try {
            const img = await imageFromElement(obj.getElement());
            state.target = obj;
            state.sourceImage = img;
            state.imgW = img.naturalWidth || img.width;
            state.imgH = img.naturalHeight || img.height;
            state.crop = { x: 0, y: 0, w: state.imgW, h: state.imgH };
            state.aspect = $('crop-aspect-select')?.value || 'free';
            canvasEl.width = state.imgW;
            canvasEl.height = state.imgH;
            drawCropPreview();
            modal.style.display = 'flex';
            requestAnimationFrame(setCanvasCssSize);
            setStatus(`${Math.round(state.imgW)}×${Math.round(state.imgH)} — 드래그로 영역 지정`);
        } catch (e) {
            console.error(e);
            alert('이미지를 크롭 창에 불러오지 못했습니다.');
        }
    }

    function closeCropModal() {
        modal.style.display = 'none';
        state.target = null;
        state.dragging = false;
        state.dragStart = null;
    }

    async function applyCrop() {
        if (!state.target || !state.sourceImage) return;
        clampCrop();
        const { x, y, w, h } = state.crop;
        if (w < 8 || h < 8) {
            alert('크롭 영역이 너무 작습니다.');
            return;
        }
        
        const el = state.target.getElement();
        if (el instanceof HTMLVideoElement) {
            // Apply native fabric.js crop for video to keep it playing
            const cx = state.target.cropX || 0;
            const cy = state.target.cropY || 0;
            state.target.set({
                cropX: cx + x,
                cropY: cy + y,
                width: w,
                height: h
            });
            state.target.setCoords();
            if (window.canvas) window.canvas.requestRenderAll();
            closeCropModal();
            return;
        }
        
        const out = document.createElement('canvas');
        out.width = Math.round(w);
        out.height = Math.round(h);
        const octx = out.getContext('2d');
        octx.drawImage(state.sourceImage, x, y, w, h, 0, 0, out.width, out.height);
        const url = out.toDataURL('image/png');
        const newImg = await imageFromElement(url);
        await replaceFabricImageElement(state.target, newImg);
        closeCropModal();
    }

    function handlePointerDown(evt) {
        evt.preventDefault();
        state.dragging = true;
        state.dragStart = getImagePoint(evt);
        state.crop = { x: state.dragStart.x, y: state.dragStart.y, w: 0, h: 0 };
        drawCropPreview();
    }

    function handlePointerMove(evt) {
        if (!state.dragging || !state.dragStart) return;
        const p = getImagePoint(evt);
        normalizeRect(state.dragStart.x, state.dragStart.y, p.x, p.y);
        drawCropPreview();
        const { w, h } = state.crop;
        setStatus(`선택: ${Math.round(w)}×${Math.round(h)} px`);
    }

    function handlePointerUp() {
        state.dragging = false;
        clampCrop();
        drawCropPreview();
    }

    async function upscaleSelectedImage(mode) {
        const obj = getTargetImageObject();
        if (!obj) {
            alert('업스케일할 이미지를 먼저 선택하세요.');
            return;
        }
        const el = obj.getElement();
        const srcW = el.naturalWidth || obj.width;
        const srcH = el.naturalHeight || obj.height;
        let newW;
        let newH;

        if (mode === 'canvas') {
            const { w: cw, h: ch } = getLogicalCanvasSize();
            const scale = Math.min(cw / srcW, ch / srcH);
            newW = Math.max(1, Math.round(srcW * scale));
            newH = Math.max(1, Math.round(srcH * scale));
        } else {
            const factor = Number(mode) || 2;
            newW = Math.max(1, Math.round(srcW * factor));
            newH = Math.max(1, Math.round(srcH * factor));
        }

        const maxSide = 8192;
        if (newW > maxSide || newH > maxSide) {
            alert(`결과 크기(${newW}×${newH})가 너무 큽니다. 최대 ${maxSide}px 이하로 선택해 주세요.`);
            return;
        }
        if (newW === srcW && newH === srcH) {
            alert('이미 해당 크기입니다.');
            return;
        }

        const out = document.createElement('canvas');
        out.width = newW;
        out.height = newH;
        const octx = out.getContext('2d');
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(el, 0, 0, newW, newH);
        const newImg = await imageFromElement(out.toDataURL('image/png'));
        await replaceFabricImageElement(obj, newImg);
    }

    function initUpscaleControls() {
        $('img-upscale-btn')?.addEventListener('click', () => {
            const mode = $('img-upscale-select')?.value || '2';
            upscaleSelectedImage(mode);
        });
    }

    function initCropControls() {
        modal = $('effectCropModal');
        canvasEl = $('effectCropCanvas');
        if (!modal || !canvasEl) return;
        ctx = canvasEl.getContext('2d');

        $('img-crop-btn')?.addEventListener('click', openCropModal);
        $('effectCropCloseBtn')?.addEventListener('click', closeCropModal);
        $('effectCropApplyBtn')?.addEventListener('click', applyCrop);
        $('effectCropResetBtn')?.addEventListener('click', () => {
            state.crop = { x: 0, y: 0, w: state.imgW, h: state.imgH };
            drawCropPreview();
            setStatus('전체 영역으로 초기화');
        });
        $('crop-aspect-select')?.addEventListener('change', (e) => {
            state.aspect = e.target.value;
            if (state.crop.w > 0 && state.crop.h > 0) {
                normalizeRect(state.crop.x, state.crop.y, state.crop.x + state.crop.w, state.crop.y + state.crop.h);
                drawCropPreview();
            }
        });

        canvasEl.addEventListener('pointerdown', handlePointerDown);
        canvasEl.addEventListener('pointermove', handlePointerMove);
        canvasEl.addEventListener('pointerup', handlePointerUp);
        canvasEl.addEventListener('pointerleave', handlePointerUp);
        window.addEventListener('resize', () => {
            if (modal.style.display === 'flex') setCanvasCssSize();
        });
    }

    function init() {
        initUpscaleControls();
        initCropControls();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.openEffectCropEditor = openCropModal;
    window.upscaleEffectImage = upscaleSelectedImage;
})();
