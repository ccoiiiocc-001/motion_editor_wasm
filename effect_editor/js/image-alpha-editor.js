(function () {
    const $ = (id) => document.getElementById(id);
    const state = {
        target: null,
        tool: 'brush',
        drawing: false,
        start: null,
        points: [],
        history: [],
        original: null,
        fileName: 'edited-image.png'
    };

    let modal;
    let canvasEl;
    let previewEl;
    let ctx;
    let pctx;

    function setStatus(text) {
        const el = $('effectAlphaStatus');
        if (el) el.textContent = text;
    }

    function getTargetImageObject() {
        const obj = window.canvas?.getActiveObject?.() || window.lastSelectedObj;
        if (!obj || obj.type !== 'image' || !obj.getElement?.()) return null;
        return obj;
    }

    function trackSelection() {
        if (!window.canvas) return;
        const remember = (obj) => {
            if (obj?.type === 'image' && obj.getElement?.()) window.lastSelectedObj = obj;
        };
        window.canvas.on('selection:created', (e) => remember(e.selected?.[0] || e.target));
        window.canvas.on('selection:updated', (e) => remember(e.selected?.[0] || e.target));
        window.canvas.on('mouse:down', (e) => remember(e.target));
    }

    function getPoint(evt) {
        const rect = previewEl.getBoundingClientRect();
        const clientX = evt.clientX ?? evt.touches?.[0]?.clientX ?? 0;
        const clientY = evt.clientY ?? evt.touches?.[0]?.clientY ?? 0;
        return {
            x: Math.max(0, Math.min(canvasEl.width, ((clientX - rect.left) / rect.width) * canvasEl.width)),
            y: Math.max(0, Math.min(canvasEl.height, ((clientY - rect.top) / rect.height) * canvasEl.height))
        };
    }

    function setCanvasCssSize() {
        const stage = document.querySelector('#effectAlphaModal .image-alpha-stage');
        if (!stage || !canvasEl || !previewEl) return;
        const maxW = Math.max(240, stage.clientWidth - 24);
        const maxH = Math.max(180, stage.clientHeight - 24);
        const scale = Math.min(1, maxW / canvasEl.width, maxH / canvasEl.height);
        const w = Math.max(1, Math.round(canvasEl.width * scale));
        const h = Math.max(1, Math.round(canvasEl.height * scale));
        [canvasEl, previewEl].forEach((el) => {
            el.style.width = `${w}px`;
            el.style.height = `${h}px`;
        });
    }

    function pushHistory() {
        if (!ctx || !canvasEl.width || !canvasEl.height) return;
        state.history.push(ctx.getImageData(0, 0, canvasEl.width, canvasEl.height));
        if (state.history.length > 30) state.history.shift();
    }

    function clearPreview() {
        pctx?.clearRect(0, 0, previewEl.width, previewEl.height);
    }

    function eraseWithPath(drawPath) {
        ctx.save();
        const blurVal = Number($('effectAlphaBlur')?.value || 0);
        if (blurVal > 0) {
            ctx.filter = `blur(${blurVal}px)`;
        } else {
            ctx.filter = 'none';
        }
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawPath(ctx);
        ctx.filter = 'none';
        ctx.restore();
    }

    function drawShape(context, from, to, tool, commit) {
        const x = Math.min(from.x, to.x);
        const y = Math.min(from.y, to.y);
        const w = Math.abs(to.x - from.x);
        const h = Math.abs(to.y - from.y);
        context.beginPath();
        if (tool === 'rect') {
            context.rect(x, y, w, h);
        } else if (tool === 'circle') {
            const r = Math.max(w, h) / 2;
            context.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
        } else if (tool === 'heart') {
            const cx = x + w / 2, cy = y + h / 2;
            const topCurveHeight = h * 0.3;
            context.moveTo(cx, y + topCurveHeight);
            context.bezierCurveTo(cx, y, x, y, x, y + topCurveHeight);
            context.bezierCurveTo(x, y + (h + topCurveHeight) / 2, cx, y + (h + topCurveHeight) / 2, cx, y + h);
            context.bezierCurveTo(cx, y + (h + topCurveHeight) / 2, x + w, y + (h + topCurveHeight) / 2, x + w, y + topCurveHeight);
            context.bezierCurveTo(x + w, y, cx, y, cx, y + topCurveHeight);
        } else if (tool === 'star') {
            const cx = x + w / 2, cy = y + h / 2;
            const spikes = 5, outerRadius = Math.min(w, h) / 2, innerRadius = outerRadius / 2;
            let rot = Math.PI / 2 * 3;
            const step = Math.PI / spikes;
            context.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                context.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
                rot += step;
                context.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
                rot += step;
            }
            context.lineTo(cx, cy - outerRadius);
        } else if (tool === 'flower') {
            const cx = x + w / 2, cy = y + h / 2;
            const r = Math.min(w, h) / 2, petals = 6;
            for (let i = 0; i <= Math.PI * 2.01; i += 0.1) {
                const pr = r * (0.8 + 0.2 * Math.sin(i * petals));
                const px = cx + pr * Math.cos(i), py = cy + pr * Math.sin(i);
                if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
            }
        } else if (tool === 'gear') {
            const cx = x + w / 2, cy = y + h / 2;
            const r = Math.min(w, h) / 2, teeth = 8;
            for (let i = 0; i <= Math.PI * 2.05; i += 0.05) {
                const isTooth = Math.sin(i * teeth) > 0.5;
                const pr = isTooth ? r : r * 0.8;
                const px = cx + pr * Math.cos(i), py = cy + pr * Math.sin(i);
                if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
            }
        } else if (tool === 'drop') {
            const cx = x + w / 2, cy = y + h * 0.6;
            const r = Math.min(w, h * 0.8) / 2;
            context.moveTo(cx, y);
            context.bezierCurveTo(cx + r, y + r * 0.5, cx + r, cy, cx + r, cy);
            context.arc(cx, cy, r, 0, Math.PI);
            context.bezierCurveTo(cx - r, cy, cx - r, y + r * 0.5, cx, y);
        } else if (tool === 'ribbon') {
            const cx = x + w / 2, cy = y + h / 2;
            context.moveTo(x, y);
            context.lineTo(cx, cy - h * 0.1);
            context.lineTo(x + w, y);
            context.lineTo(x + w, y + h);
            context.lineTo(cx, cy + h * 0.1);
            context.lineTo(x, y + h);
            context.closePath();
        } else {
            context.ellipse(x + w / 2, y + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
        }
        if (commit) context.fill();
        else {
            context.strokeStyle = '#38bdf8';
            context.lineWidth = Math.max(2, canvasEl.width / 400);
            context.setLineDash([8, 5]);
            context.stroke();
            context.setLineDash([]);
        }
    }

    function drawFreePreview(points) {
        clearPreview();
        if (points.length < 2) return;
        pctx.save();
        pctx.strokeStyle = '#38bdf8';
        pctx.lineWidth = Math.max(2, canvasEl.width / 400);
        pctx.lineJoin = 'round';
        pctx.beginPath();
        pctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((p) => pctx.lineTo(p.x, p.y));
        pctx.stroke();
        pctx.restore();
    }

    function eraseBrush(from, to) {
        const size = Number($('effectAlphaBrushSize')?.value || 28);
        eraseWithPath((c) => {
            c.lineWidth = size;
            c.beginPath();
            c.moveTo(from.x, from.y);
            c.lineTo(to.x, to.y);
            c.stroke();
        });
    }

    function handleDown(evt) {
        if (!state.target) return;
        evt.preventDefault();
        const pt = getPoint(evt);
        pushHistory();
        state.drawing = true;
        state.start = pt;
        state.points = [pt];
        if (state.tool === 'brush') eraseBrush(pt, pt);
    }

    function handleMove(evt) {
        if (!state.drawing) return;
        evt.preventDefault();
        const pt = getPoint(evt);
        if (state.tool === 'brush') {
            eraseBrush(state.points[state.points.length - 1], pt);
            state.points.push(pt);
            return;
        }
        if (state.tool === 'free') {
            state.points.push(pt);
            drawFreePreview(state.points);
            return;
        }
        clearPreview();
        drawShape(pctx, state.start, pt, state.tool, false);
    }

    function handleUp(evt) {
        if (!state.drawing) return;
        evt.preventDefault();
        const pt = getPoint(evt);
        if (state.tool === 'free' && state.points.length > 2) {
            eraseWithPath((c) => {
                c.beginPath();
                c.moveTo(state.points[0].x, state.points[0].y);
                state.points.slice(1).forEach((p) => c.lineTo(p.x, p.y));
                c.closePath();
                c.fill();
            });
        } else if (state.tool !== 'brush') {
            eraseWithPath((c) => drawShape(c, state.start, pt, state.tool, true));
        }
        state.drawing = false;
        state.start = null;
        state.points = [];
        clearPreview();
    }

    function imageFromCanvas(canvas) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            try {
                img.src = canvas.toDataURL('image/png');
            } catch (err) {
                reject(err);
            }
        });
    }

    function imageFromElement(el) {
        return new Promise((resolve, reject) => {
            if (!el) {
                reject(new Error('missing image element'));
                return;
            }
            if (el instanceof HTMLCanvasElement) {
                imageFromCanvas(el).then(resolve).catch(reject);
                return;
            }
            const src = el.src || el.currentSrc;
            if (!src) {
                reject(new Error('missing image src'));
                return;
            }
            const img = new Image();
            if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async function getImageSourceForObject(obj) {
        if (typeof window.ensureFabricOriginalElement === 'function') {
            window.ensureFabricOriginalElement(obj);
        }
        const el = obj.getElement();
        if (!el) throw new Error('missing fabric image element');

        const base = (obj.originalElement instanceof HTMLCanvasElement && obj.originalElement.width > 0)
            ? obj.originalElement
            : (window.isImageElementReadable?.(el) ? window.cloneElementToCanvas(el) : null)
            || (window.isImageElementReadable?.(obj.originalElement) ? window.cloneElementToCanvas(obj.originalElement) : null);

        if (!base) throw new Error('cannot read image source');
        return imageFromCanvas(base);
    }

    async function openForSelectedImage() {
        const obj = getTargetImageObject();
        if (!obj) {
            alert('투명 편집할 이미지를 먼저 선택하세요.');
            return;
        }
        
        const el = obj.getElement();
        if (el instanceof HTMLVideoElement) {
            el.pause();
            const btn = document.getElementById('video-play-pause-btn');
            if (btn) { btn.textContent = '▶'; btn.title = '재생'; }
        }
        
        try {
            state.target = obj;
            window.lastSelectedObj = obj;
            state.fileName = (obj.layerName || 'edited-image').replace(/\.[^.]+$/, '') + '.png';
            const img = await getImageSourceForObject(obj);
            canvasEl.width = img.naturalWidth || img.width;
            canvasEl.height = img.naturalHeight || img.height;
            previewEl.width = canvasEl.width;
            previewEl.height = canvasEl.height;
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
            state.original = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
            state.history = [];
            clearPreview();
            const blurSlider = $('effectAlphaBlur');
            if (blurSlider) blurSlider.value = 0;
            const blurValueLabel = $('effectAlphaBlurValue');
            if (blurValueLabel) blurValueLabel.textContent = '0px';
            modal.style.display = 'flex';
            requestAnimationFrame(setCanvasCssSize);
            setStatus(`${obj.layerName || state.fileName} 편집 중`);
        } catch (e) {
            console.error(e);
            state.target = null;
            alert('이미지를 편집창에 불러오지 못했습니다.');
        }
    }

    function closeModal() {
        modal.style.display = 'none';
        state.target = null;
        state.drawing = false;
    }

    function canvasToPngBlob() {
        return new Promise((resolve) => canvasEl.toBlob(resolve, 'image/png'));
    }

    async function applyToCanvas() {
        if (!state.target) return;
        const obj = state.target;
        const persisted = typeof window.cloneElementToCanvas === 'function'
            ? window.cloneElementToCanvas(canvasEl)
            : null;
        if (!persisted) return;
        
        if (obj.getElement() instanceof HTMLVideoElement) {
            // Do not replace the video element with a static canvas.
            // Instead, attach the mask canvas to the object and flag it to be processed during rendering.
            obj.videoMaskCanvas = persisted;
            obj.dirty = true;
        } else {
            const keep = {
                left: obj.left,
                top: obj.top,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                angle: obj.angle,
                originX: obj.originX,
                originY: obj.originY
            };
            obj.setElement(persisted);
            obj.originalElement = persisted;
            obj.set({
                width: persisted.width,
                height: persisted.height,
                ...keep
            });
            obj.setCoords();
            obj.dirty = true;
        }
        
        if (window.canvas) {
            window.canvas.requestRenderAll();
            window.canvas.setActiveObject(obj);
        }
        closeModal();
    }

    function init() {
        modal = $('effectAlphaModal');
        canvasEl = $('effectAlphaCanvas');
        previewEl = $('effectAlphaPreviewCanvas');
        if (!modal || !canvasEl || !previewEl) return;
        ctx = canvasEl.getContext('2d');
        pctx = previewEl.getContext('2d');

        trackSelection();

        const blurSlider = $('effectAlphaBlur');
        const blurValueLabel = $('effectAlphaBlurValue');
        if (blurSlider && blurValueLabel) {
            blurSlider.addEventListener('input', () => {
                blurValueLabel.textContent = `${blurSlider.value}px`;
            });
        }

        $('alpha-edit-toggle-btn')?.addEventListener('click', openForSelectedImage);
        $('effectAlphaCloseBtn')?.addEventListener('click', closeModal);
        $('effectAlphaApplyBtn')?.addEventListener('click', applyToCanvas);
        $('effectAlphaUndoBtn')?.addEventListener('click', () => {
            const prev = state.history.pop();
            if (prev) ctx.putImageData(prev, 0, 0);
        });
        $('effectAlphaResetBtn')?.addEventListener('click', () => {
            if (!state.original) return;
            pushHistory();
            ctx.putImageData(state.original, 0, 0);
            clearPreview();
        });
        document.querySelectorAll('#effectAlphaModal .image-alpha-tool').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.tool = btn.dataset.tool || 'brush';
                document.querySelectorAll('#effectAlphaModal .image-alpha-tool').forEach((b) => b.classList.toggle('active', b === btn));
            });
        });
        previewEl.addEventListener('pointerdown', handleDown);
        previewEl.addEventListener('pointermove', handleMove);
        previewEl.addEventListener('pointerup', handleUp);
        previewEl.addEventListener('pointerleave', handleUp);
        window.addEventListener('resize', () => {
            if (modal.style.display === 'flex') setCanvasCssSize();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.openEffectAlphaEditor = openForSelectedImage;
})();
