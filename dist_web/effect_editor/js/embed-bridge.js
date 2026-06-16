// ============================================================================
//  embed-bridge.js
//  - URL이 ?embed=1 일 때만 활성화되는 부모-자식(postMessage) 브릿지
//  - 단독 실행 시 즉시 return → 기존 동작 0% 영향
//  - 프로토콜
//      [host  → editor]  { type: 'host:load-image', blob, meta? }
//                        { type: 'host:ping' }
//      [editor → host ]  { type: 'editor:ready' }
//                        { type: 'editor:apply', blob, mime, meta }
//                        { type: 'editor:cancel' }
// ============================================================================

(function () {
    const params = new URLSearchParams(location.search);
    if (params.get('embed') !== '1') return; // 단독 모드면 아무것도 하지 않음

    const ALLOWED_PARENT_ORIGIN = '*'; // 추후 화이트리스트로 제한 가능

    const state = {
        parentWin: null,
        parentOrigin: ALLOWED_PARENT_ORIGIN,
        lastEffect: null,    // { kind: 'motion'|'static'|'retro', id }
        currentFileNameBase: 'edited-image'
    };

    // ------------------------------------------------------------------------
    // 1) 마지막 효과 추적: 원본 함수를 살리면서 호출만 감싸기
    // ------------------------------------------------------------------------
    function wrapEffectFns() {
        const wrap = (fnName, kind) => {
            const orig = window[fnName];
            if (typeof orig !== 'function') return;
            window[fnName] = function (id) {
                if (typeof window.saveEffectHistorySnapshot === 'function') {
                    window.saveEffectHistorySnapshot({ delay: 250 });
                }
                state.lastEffect = { kind, id };
                return orig.apply(this, arguments);
            };
        };
        wrap('applyEffect', 'motion');
        wrap('applyStaticFilter', 'static');
        wrap('applyRetroFx', 'retro');
    }

    // ------------------------------------------------------------------------
    // 2) 상단 적용 바(UI) 주입
    // ------------------------------------------------------------------------
    function injectApplyBar() {
        const bar = document.createElement('div');
        bar.id = 'embed-apply-bar';
        bar.innerHTML = `
            <span class="embed-bar-title">↩ shorts에 적용</span>
            <button type="button" id="embedApplyPngBtn">📷 PNG로 적용</button>
            <button type="button" id="embedApplyJpgBtn">📷 JPG로 적용</button>
            <button type="button" id="embedApplyWebmBtn">🎬 녹화 클립 적용</button>
            &nbsp;
            <button type="button" id="embed-save-png-btn">💾 PNG 저장</button>
            <button type="button" id="embed-save-jpg-btn">💾 JPG 저장</button>
            &nbsp;
            <button type="button" id="merge-layers-btn">🥞 레이어합</button>
            <div class="embed-bar-end">
                <button type="button" id="embedUndoBtn" class="embed-icon-btn" title="이전 (Undo)">↶</button>
                <button type="button" id="embedRedoBtn" class="embed-icon-btn" title="이후 (Redo)">↷</button>
                <button type="button" id="embedCancelBtn" class="embed-cancel">✕ 닫기</button>
            </div>
        `;
        document.body.appendChild(bar);

        document.getElementById('embedApplyPngBtn').addEventListener('click', () => applyAsImage('image/png'));
        document.getElementById('embedApplyJpgBtn').addEventListener('click', () => applyAsImage('image/jpeg'));
        document.getElementById('embedApplyWebmBtn').addEventListener('click', applyRecordedWebm);
        document.getElementById('embed-save-png-btn')?.addEventListener('click', () => saveCanvasImage('png'));
        document.getElementById('embed-save-jpg-btn')?.addEventListener('click', () => saveCanvasImage('jpeg'));
        document.getElementById('merge-layers-btn')?.addEventListener('click', mergeLayers);
        document.getElementById('embedUndoBtn').addEventListener('click', () => {
            if (typeof window.effectEditorUndo === 'function') window.effectEditorUndo();
        });
        document.getElementById('embedRedoBtn').addEventListener('click', () => {
            if (typeof window.effectEditorRedo === 'function') window.effectEditorRedo();
        });
        document.getElementById('embedCancelBtn').addEventListener('click', () => {
            persistResolutionForHost();
            postToHost({ type: 'editor:cancel' });
        });
    }

    function injectStyles() {
        const css = document.createElement('style');
        css.textContent = `
            body.embed-mode { padding-top: 56px; box-sizing: border-box; }
            #embed-apply-bar {
                position: fixed; top: 0; left: 0; right: 0; height: 50px;
                background: linear-gradient(90deg,#0f172a,#1e293b);
                border-bottom: 2px solid #38bdf8;
                z-index: 99999;
                display: flex; align-items: center; gap: 8px;
                padding: 0 14px;
                font-family: 'Segoe UI', sans-serif;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            }
            #embed-apply-bar .embed-bar-title {
                color:#38bdf8; font-weight:700; font-size:14px; margin-right:6px;
                white-space: nowrap;
            }
            #embed-apply-bar button {
                width: auto; padding: 7px 12px; font-size: 12.5px; font-weight: 600;
                border: none; border-radius: 6px; cursor: pointer; color: #fff;
                background: #2563eb;
            }
            #embed-apply-bar button:hover { filter: brightness(1.1); }
            #embed-apply-bar #embedApplyJpgBtn { background: #0891b2; }
            #embed-apply-bar #embedApplyWebmBtn { background: #dc2626; }
            #embed-apply-bar #embed-save-png-btn { background: #00bcd4; }
            #embed-apply-bar #embed-save-jpg-btn { background: #2196f3; }
            #embed-apply-bar #merge-layers-btn { background: #8b5cf6; }
            #embed-apply-bar .embed-bar-end {
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #embed-apply-bar .embed-icon-btn {
                width: 32px;
                min-width: 32px;
                padding: 7px 0;
                font-size: 18px;
                line-height: 1;
                background: #64748b !important;
            }
            #embed-apply-bar .embed-cancel { background:#475569 !important; }
            body.embed-mode .app-container {
                height: calc(100vh - 50px);
                max-height: calc(100vh - 50px);
                min-height: 0;
                overflow: hidden;
            }
        `;
        document.head.appendChild(css);
        document.body.classList.add('embed-mode');
    }

    function hasAnimatedEffectApplied(obj) {
        if (!obj) return false;
        if (obj.activeTween || obj.waterTween || obj.fxLoop) return true;
        if (obj.advSettings) return true;

        if (obj.retroSettings && obj.retroSettings.activeFxId !== undefined) {
            const fxId = obj.retroSettings.activeFxId;
            if (typeof fxId === 'string' && fxId.indexOf('static-') === 0) {
                return false;
            }
            const id = parseInt(fxId);
            if (!isNaN(id)) {
                if ((id >= 1 && id <= 11) || id === 31) {
                    return true;
                }
                const ALIASES = { 12:1, 13:1, 14:1, 15:1, 16:1, 17:1, 18:1, 19:1, 20:1, 91:1, 92:1, 93:1 };
                const FILTER_ANIM = {
                    21:1, 22:1, 23:1, 24:1, 25:1, 26:1, 27:1, 28:1, 29:1, 30:1,
                    51:1, 52:1, 53:1, 54:1, 55:1, 56:1, 57:1, 58:1, 59:1, 60:1,
                    61:1, 62:1, 63:1, 64:1, 65:1, 66:1, 67:1, 68:1, 69:1, 70:1,
                    72:1, 88:1, 95:1, 96:1, 97:1, 98:1
                };
                const OBJECT_MOTION = {
                    81:1, 82:1, 83:1, 84:1, 85:1, 86:1, 87:1, 89:1, 90:1
                };
                if (ALIASES[id] || FILTER_ANIM[id] || OBJECT_MOTION[id] || id === 100) {
                    return true;
                }
            }
        }
        return false;
    }

    // Dynamic Modal Injection
    function getOrCreateMergeModal() {
        let modal = document.getElementById('layer-merge-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'layer-merge-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            z-index: 100000;
            background: rgba(15, 23, 42, 0.75);
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', system-ui, sans-serif;
        `;
        modal.innerHTML = `
            <div style="background: #1e293b; color: #f8fafc; border-radius: 12px; width: 440px; max-width: 90%; padding: 22px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 16px; border: 1px solid #334155;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 12px;">
                    <span style="font-size: 16px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px;">🥞 레이어 병합 선택</span>
                    <button type="button" id="layer-merge-close-x" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0;">✕</button>
                </div>
                <p style="font-size: 12.5px; color: #94a3b8; margin: 0; line-height: 1.5;">
                    병합할 레이어들을 선택해 주세요. (최소 2개 이상 선택 필수, 재생 중인 레이어는 병합할 수 없습니다.)
                </p>
                <div id="layer-merge-list" style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                    <!-- items injected dynamically -->
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #334155; padding-top: 14px;">
                    <button type="button" id="layer-merge-cancel-btn" style="background: #475569; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">취소</button>
                    <button type="button" id="layer-merge-confirm-btn" style="background: #8b5cf6; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.35);">병합 실행</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Bind events
        document.getElementById('layer-merge-close-x').onclick = closeMergeModal;
        document.getElementById('layer-merge-cancel-btn').onclick = closeMergeModal;
        modal.onclick = (e) => { if (e.target === modal) closeMergeModal(); };

        return modal;
    }

    function closeMergeModal() {
        const modal = document.getElementById('layer-merge-modal');
        if (modal) modal.style.display = 'none';
    }

    async function mergeLayers() {
        if (!window.canvas) {
            alert('캔버스가 준비되지 않았습니다.');
            return;
        }

        const objects = window.canvas.getObjects();
        // Filter out temporary paths (such as drawings/mask outlines)
        const layers = objects.filter(o => o.type !== 'path');

        if (layers.length < 2) {
            alert("병합할 레이어가 부족합니다. (최소 2개 이상의 레이어가 필요합니다.)");
            return;
        }

        const modal = getOrCreateMergeModal();
        const listContainer = document.getElementById('layer-merge-list');
        listContainer.innerHTML = '';

        // Display layers in reverse z-order (top-most layer first)
        const reversedLayers = layers.slice().reverse();
        reversedLayers.forEach(o => {
            const isAnimated = hasAnimatedEffectApplied(o);
            const isPlaying = isAnimated && !o._effectPaused && (o.activeTween || o.waterTween || o.fxLoop);

            let name = o.layerName || o.sourceFileName || '';
            if (!name) {
                if (o.type === 'image') name = '이미지 레이어';
                else if (o.type === 'text' || o.type === 'i-text') name = `자막 ("${o.text || ''}")`;
                else name = o.type;
            }

            // Append active effect suffix for clarity
            if (o.retroSettings && o.retroSettings.activeFxId !== undefined) {
                const fxId = o.retroSettings.activeFxId;
                let fxName = '';
                if (typeof fxId === 'string' && fxId.indexOf('static-') === 0) {
                    const staticId = parseInt(fxId.replace('static-', ''));
                    fxName = (window.motionEditorStaticPresets && window.motionEditorStaticPresets[staticId]) 
                        ? `정적 필터 ${staticId}` 
                        : '정적 필터';
                } else {
                    fxName = (window.retroFxNames && window.retroFxNames[fxId]) || `레트로 효과 ${fxId}`;
                }
                name += ` [${fxName}]`;
            }

            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: #334155;
                border-radius: 6px;
                border: 1px solid #475569;
            `;

            let badgeText = '✅ 정지 상태 - 병합 가능';
            let badgeColor = '#10b981';
            if (isPlaying) {
                badgeText = '⚠️ 재생 중 - 병합 불가';
                badgeColor = '#ef4444';
            } else if (isAnimated) {
                badgeText = '⏸️ 일시정지 - 병합 가능';
                badgeColor = '#38bdf8';
            }

            item.innerHTML = `
                <input type="checkbox" class="layer-merge-checkbox" data-index="${objects.indexOf(o)}" ${isPlaying ? 'disabled' : 'checked'} style="width: 18px; height: 18px; cursor: ${isPlaying ? 'not-allowed' : 'pointer'};">
                <div style="flex: 1; display: flex; flex-direction: column; gap: 3px;">
                    <span style="font-size: 13.5px; font-weight: 600; color: #fff; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 320px;" title="${name}">${name}</span>
                    <span style="font-size: 11px; color: ${badgeColor}; font-weight: 600;">${badgeText}</span>
                </div>
            `;
            listContainer.appendChild(item);
        });

        // Setup confirm click handler
        const confirmBtn = document.getElementById('layer-merge-confirm-btn');
        confirmBtn.onclick = function() {
            const checkedCheckboxes = Array.from(document.querySelectorAll('.layer-merge-checkbox:checked'));
            if (checkedCheckboxes.length < 2) {
                alert("병합할 레이어를 최소 2개 이상 선택해 주세요.");
                return;
            }

            const checkedIndices = checkedCheckboxes.map(cb => parseInt(cb.getAttribute('data-index')));
            const checkedObjects = checkedIndices.map(idx => objects[idx]);

            // Find the lowest z-index among selected layers to place the merged result
            const indices = checkedObjects.map(o => objects.indexOf(o));
            const lowestIndex = Math.min(...indices);

            // 1. Save viewport transform, background, and reset to standard 1:1 view for capture
            const origZoom = window.canvas.getZoom();
            const origVpt = window.canvas.viewportTransform ? window.canvas.viewportTransform.slice() : [1, 0, 0, 1, 0, 0];
            const origBg = window.canvas.backgroundColor;

            window.canvas.setZoom(1);
            window.canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
            window.canvas.backgroundColor = 'transparent'; // keep alpha transparency

            // 2. Temporarily hide all unchecked objects and guide paths
            const origVisibility = [];
            objects.forEach(o => {
                origVisibility.push({ obj: o, visible: o.visible });
                if (o.type === 'path' || !checkedObjects.includes(o)) {
                    o.set('visible', false);
                }
            });

            if (typeof toggleGuidePaths === 'function') {
                toggleGuidePaths(false);
            }

            window.canvas.renderAll();

            // 3. Capture only the selected static layers
            const dataURL = window.canvas.toDataURL({
                format: 'png',
                quality: 1.0
            });

            // 4. Restore original viewport, background, and visibilities
            window.canvas.setZoom(origZoom);
            if (window.canvas.viewportTransform) {
                window.canvas.viewportTransform = origVpt;
            }
            window.canvas.backgroundColor = origBg;

            origVisibility.forEach(item => {
                item.obj.set('visible', item.visible);
            });

            if (typeof toggleGuidePaths === 'function') {
                toggleGuidePaths(true);
            }

            window.canvas.renderAll();

            // 5. Load the merged image, remove source layers, and insert
            window.fabric.Image.fromURL(dataURL, function (mergedImg) {
                mergedImg.set({
                    originX: 'left',
                    originY: 'top',
                    left: 0,
                    top: 0,
                    scaleX: 1,
                    scaleY: 1
                });

                // Clear effects on source layers and remove them from canvas
                checkedObjects.forEach(o => {
                    if (typeof window.clearAppliedEffects === 'function') {
                        window.clearAppliedEffects(o);
                    }
                    window.canvas.remove(o);
                });

                // Insert new merged layer at the lowest index
                window.canvas.insertAt(mergedImg, lowestIndex);
                window.canvas.setActiveObject(mergedImg);
                window.canvas.requestRenderAll();

                // Hide control panel and sync transport UI
                if (typeof window.hideFilterControls === 'function') {
                    window.hideFilterControls();
                }
                if (typeof window.updateEffectTransportUi === 'function') {
                    window.updateEffectTransportUi();
                }

                // Save history snapshot
                if (typeof window.saveEffectHistorySnapshot === 'function') {
                    window.saveEffectHistorySnapshot({ delay: 100 });
                }

                closeMergeModal();
                alert("선택한 레이어들이 하나로 병합되었습니다.");
            });
        };

        // Open modal
        modal.style.display = 'flex';
    }

    function saveCanvasImage(format) {
        if (!window.canvas) {
            alert('캔버스가 준비되지 않았습니다.');
            return;
        }
        if (window.canvas.getObjects().some(o => window.hasAnimatedEffect(o) && !o._effectPaused)) {
            alert("애니메이션이 재생 중입니다. 정지(일시정지) 상태일 때만 저장할 수 있습니다.");
            return;
        }
        toggleGuidePaths(false);
        try {
            const isJpeg = format === 'jpeg';
            const dataURL = window.canvas.toDataURL({
                format: isJpeg ? 'jpeg' : 'png',
                quality: 1.0
            });
            const link = document.createElement('a');
            link.download = window.getImageSaveName ? window.getImageSaveName(isJpeg ? 'jpg' : 'png', 'edit', state.currentFileNameBase) : `edit_${Date.now()}.${isJpeg ? 'jpg' : 'png'}`;
            link.href = dataURL;
            link.click();
        } finally {
            toggleGuidePaths(true);
        }
    }

    // ------------------------------------------------------------------------
    // 3) 이미지(PNG/JPG)로 적용
    // ------------------------------------------------------------------------
    async function applyAsImage(mime) {
        if (!window.canvas) return;
        if (window.canvas.getObjects().some(o => window.hasAnimatedEffect(o) && !o._effectPaused)) {
            alert("애니메이션이 재생 중입니다. 정지(일시정지) 상태일 때만 PNG/JPG 파일로 적용할 수 있습니다.");
            return;
        }
        // 가이드선 숨김 처리 (녹화/저장 시와 동일한 정책)
        toggleGuidePaths(false);
        try {
            const fmt = mime === 'image/jpeg' ? 'jpeg' : 'png';
            const dataURL = window.canvas.toDataURL({ format: fmt, quality: 1.0 });
            const blob = await dataURLtoBlob(dataURL);
            postToHost({
                type: 'editor:apply',
                blob,
                mime,
                meta: {
                    fileName: `${state.currentFileNameBase}.${fmt === 'jpeg' ? 'jpg' : 'png'}`,
                    source: 'web-effect-maker',
                    effect: state.lastEffect || null
                }
            });
        } finally {
            toggleGuidePaths(true);
        }
    }

    // ------------------------------------------------------------------------
    // 4) 왼쪽 메뉴에서 녹화된 WEBM을 shorts에 적용
    // ------------------------------------------------------------------------
    function applyRecordedWebm() {
        const recorded = window.lastRecordedWebm;
        if (!recorded?.blob) {
            alert('왼쪽 메뉴에서 WEBM 녹화를 먼저 완료해 주세요.');
            return;
        }

        postToHost({
            type: 'editor:apply',
            blob: recorded.blob,
            mime: 'video/webm',
            meta: {
                fileName: recorded.fileName || `${state.currentFileNameBase}.webm`,
                durationSec: recorded.durationSec || undefined,
                source: 'web-effect-maker',
                effect: state.lastEffect || null
            }
        });
    }

    // ------------------------------------------------------------------------
    // 5) 호스트로부터 이미지 수신 → 캔버스에 자동 로드
    // ------------------------------------------------------------------------
    function handleLoadImage(blob, meta) {
        if (!blob) return;
        if (meta?.resolution && typeof window.applyEffectEditorResolution === 'function') {
            window.applyEffectEditorResolution(meta.resolution);
        }
        const baseName = (meta && meta.fileName ? String(meta.fileName) : 'edited-image').replace(/\.[^.]+$/, '');
        state.currentFileNameBase = baseName || 'edited-image';

        const reader = new FileReader();
        reader.onload = (f) => {
            if (!window.fabric || !window.canvas) return;
            window.fabric.Image.fromURL(f.target.result, function (img) {
                // 기존 객체 모두 제거 (모달에서 다시 열 때 깨끗하게)
                window.canvas.getObjects().slice().forEach(o => window.canvas.remove(o));

                const zoom = window.canvas.getZoom();
                const logicalW = window.canvas.width / zoom;
                const logicalH = window.canvas.height / zoom;
                const scale = Math.min(logicalW / img.width, logicalH / img.height) * 0.9;
                img.scale(scale).set({
                    originX: 'center', originY: 'center',
                    left: logicalW / 2, top: logicalH / 2
                });
                window.canvas.add(img);
                window.canvas.setActiveObject(img);
                window.canvas.renderAll();
                if (typeof window.resetEffectEditorHistory === 'function') {
                    window.resetEffectEditorHistory();
                }
                if (typeof window.saveEffectHistorySnapshot === 'function') {
                    window.saveEffectHistorySnapshot({ delay: 400 });
                }
                scheduleCanvasFit();
            });
        };
        reader.readAsDataURL(blob);
    }

    // ------------------------------------------------------------------------
    // 6) 호스트와의 메시지 송수신
    // ------------------------------------------------------------------------
    function persistResolutionForHost() {
        if (typeof window.saveEffectEditorResolution === 'function') {
            window.saveEffectEditorResolution();
        }
        const value = typeof window.getEffectEditorResolution === 'function'
            ? window.getEffectEditorResolution()
            : (document.getElementById('resolution')?.value || null);
        postToHost({ type: 'editor:resolution-saved', value });
        return value;
    }

    function postToHost(payload) {
        const target = state.parentWin || (window.opener ? window.opener : window.parent);
        if (!target || target === window) {
            console.warn('[embed-bridge] no host window to post to');
            return;
        }
        try {
            target.postMessage(payload, state.parentOrigin);
        } catch (e) {
            console.error('[embed-bridge] postMessage failed:', e);
        }
    }

    function onMessage(evt) {
        const data = evt.data;
        if (!data || typeof data !== 'object') return;
        // 첫 메시지에서 부모 윈도우/오리진 캐시 (보안 강화 시 화이트리스트 검증 추가)
        if (!state.parentWin) {
            state.parentWin = evt.source;
            if (evt.origin && evt.origin !== 'null') state.parentOrigin = evt.origin;
        }
        switch (data.type) {
            case 'host:ping':
                postToHost({ type: 'editor:ready' });
                break;
            case 'host:load-image':
                handleLoadImage(data.blob, data.meta);
                break;
            case 'host:request-resolution-save':
                persistResolutionForHost();
                break;
            case 'host:set-resolution':
                if (data.value && typeof window.applyEffectEditorResolution === 'function') {
                    window.applyEffectEditorResolution(data.value);
                }
                scheduleCanvasFit();
                break;
        }
    }

    // ------------------------------------------------------------------------
    // 7) 부가 유틸
    // ------------------------------------------------------------------------
    function toggleGuidePaths(visible) {
        if (!window.canvas) return;
        window.canvas.getObjects().forEach(o => {
            if (o.type === 'path') o.set('visible', visible);
        });
        window.canvas.renderAll();
    }

    async function dataURLtoBlob(dataURL) {
        const res = await fetch(dataURL);
        return await res.blob();
    }

    // ------------------------------------------------------------------------
    // 8) 부트스트랩
    // ------------------------------------------------------------------------
    function scheduleCanvasFit() {
        if (typeof window.updateEffectEditorCanvasSize !== 'function') return;
        window.updateEffectEditorCanvasSize();
        requestAnimationFrame(() => window.updateEffectEditorCanvasSize());
        setTimeout(() => window.updateEffectEditorCanvasSize(), 120);
    }

    function boot() {
        injectStyles();
        injectApplyBar();
        wrapEffectFns();
        window.addEventListener('message', onMessage);
        window.addEventListener('beforeunload', () => {
            if (typeof window.saveEffectEditorResolution === 'function') {
                window.saveEffectEditorResolution();
            }
        });
        scheduleCanvasFit();
        // 부모에게 준비 완료 통보
        postToHost({ type: 'editor:ready' });
        // 부모가 늦게 붙는 경우 대비: 짧은 주기로 한 번 더
        setTimeout(() => postToHost({ type: 'editor:ready' }), 300);
    }

    if (document.body) {
        boot();
    } else {
        document.addEventListener('DOMContentLoaded', boot);
    }
})();
