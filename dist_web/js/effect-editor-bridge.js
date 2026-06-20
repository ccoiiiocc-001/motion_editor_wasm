// ============================================================================
//  effect-editor-bridge.js (옵션 모듈)
//  - motion_editor 본체 코드는 0줄 변경
//  - 이 파일 + index.html에 <script> 1줄만 추가하면 통합 활성화
//  - 빼면 그대로 분리됨
//
//  역할
//   1) 속성 패널의 "이미지 투명 편집" 옆에 "🎨 효과 편집기" 버튼 동적 주입
//   2) 클릭 시 iframe 모달로 ./effect_editor/index.html?embed=1 실행
//   3) 선택된 이미지 클립을 자식에게 host:load-image 로 전달
//   4) editor:apply 수신 시
//        - image/png|jpeg → 현재 클립의 setElement (image-alpha-editor와 동일 패턴)
//        - video/webm    → 현재 클립을 video로 전환 (isVideo:true)
// ============================================================================

(function () {
    const EDITOR_URL = './effect_editor/index.html?embed=1&v=20260620-fontfix';

    const state = {
        modal: null,
        iframe: null,
        target: null,        // 현재 편집 중인 fabric 객체
        targetIsVideo: false,
        sessionAlive: false  // iframe 편집 상태 유지 여부
    };

    // ------------------------------------------------------------------------
    function $(id) { return document.getElementById(id); }

    function getTargetImageLikeObject() {
        const obj = window.canvas?.getActiveObject?.() || window.lastSelectedObj;
        if (!obj || obj.type !== 'image' || !obj.getElement?.()) return null;
        return obj;
    }

    function showToast(msg, dur = 3000) {
        if (typeof window.showToast === 'function') window.showToast(msg, dur);
        else console.log('[toast]', msg);
    }

    // ------------------------------------------------------------------------
    // 1) 진입 버튼 주입 (속성 패널 안)
    // ------------------------------------------------------------------------
    function injectEntryButton() {
        const anchor = $('imageAlphaEditBtn');
        if (!anchor || $('effectEditorOpenBtn')) return;

        const wrap = document.createElement('div');
        wrap.className = 'prop-group prop-image-mask';
        wrap.style.cssText = 'grid-column: span 2; margin-top: 6px;';
        wrap.innerHTML = `
            <label>이미지 효과 편집기</label>
            <button type="button" id="effectEditorOpenBtn"
                style="width:100%;height:28px;border:none;border-radius:6px;background:#fef3c7;color:#92400e;font-weight:800;cursor:pointer;">
                🎨 효과 편집기 열기
            </button>
        `;
        anchor.parentElement.parentElement.appendChild(wrap);

        $('effectEditorOpenBtn').addEventListener('click', openEditor);
    }

    function ensureEntryButton() {
        injectEntryButton();
        if (!$('effectEditorOpenBtn')) {
            // 속성 패널이 늦게 그려질 수 있으니 한 번 더 시도
            setTimeout(injectEntryButton, 600);
        }
    }

    // ------------------------------------------------------------------------
    // 2) 모달 생성
    // ------------------------------------------------------------------------
    function buildModal() {
        const overlay = document.createElement('div');
        overlay.id = 'effectEditorModal';
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,0.78);';
        overlay.innerHTML = `
            <div style="position:absolute;inset:24px;background:#0f172a;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.6);display:flex;flex-direction:column;overflow:hidden;">
                <div style="display:flex;align-items:center;padding:8px 14px;background:#1e293b;color:#e2e8f0;font-weight:700;border-bottom:1px solid #334155;">
                    <span>🎨 이미지 효과 편집기</span>
                    <span id="effectEditorStatus" style="margin-left:14px;font-size:12px;color:#94a3b8;font-weight:500;"></span>
                    <button type="button" id="effectEditorCloseBtn" style="margin-left:auto;background:#dc2626;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-weight:700;cursor:pointer;">✕ 닫기</button>
                </div>
                <iframe id="effectEditorFrame" src="about:blank"
                    style="flex:1;border:none;background:#1e1e1e;"
                    allow="clipboard-write; local-fonts"></iframe>
            </div>
        `;
        document.body.appendChild(overlay);
        state.modal = overlay;
        state.iframe = $('effectEditorFrame');

        $('effectEditorCloseBtn').addEventListener('click', resetEditorSession);
    }

    function setStatus(msg) {
        const el = $('effectEditorStatus');
        if (el) el.textContent = msg || '';
    }

    function showModal() {
        state.modal.style.display = 'block';
        document.body.classList.add('lyrics-modal-open');
    }

    /** 적용·취소 등 — 모달만 닫고 iframe 편집 상태는 유지 */
    function hideModalKeepSession() {
        if (!state.modal) return;
        state.modal.style.display = 'none';
        document.body.classList.remove('lyrics-modal-open');
        state.sessionAlive = true;
    }

    /** 상단 ✕ 닫기 — iframe 초기화 */
    function resetEditorSession() {
        if (!state.modal) return;
        state.modal.style.display = 'none';
        document.body.classList.remove('lyrics-modal-open');
        if (state.iframe) state.iframe.src = 'about:blank';
        state.sessionAlive = false;
        imageSentForThisSession = false;
        state.target = null;
        state.targetIsVideo = false;
        setStatus('');
    }

    // ------------------------------------------------------------------------
    // 3) 선택된 이미지를 blob으로 추출
    // ------------------------------------------------------------------------
    function elementToImageBlob(el, mime = 'image/png') {
        return new Promise((resolve, reject) => {
            try {
                const w = el.naturalWidth || el.width || el.videoWidth;
                const h = el.naturalHeight || el.height || el.videoHeight;
                if (!w || !h) return reject(new Error('invalid element size'));
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(el, 0, 0, w, h);
                c.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob null')), mime);
            } catch (e) { reject(e); }
        });
    }

    function openEditorSession() {
        if (!state.modal) buildModal();
        showModal();

        if (state.sessionAlive && state.iframe?.src && state.iframe.src !== 'about:blank') {
            setStatus('이전 작업 이어서 편집');
            pingChild();
            return;
        }

        state.sessionAlive = false;
        imageSentForThisSession = false;
        setStatus('편집기 로드 중...');
        state.iframe.src = EDITOR_URL;
        setTimeout(() => pingChild(), 1200);
        setTimeout(() => pingChild(), 2400);
    }

    async function openEditor() {
        const obj = getTargetImageLikeObject();
        if (!obj) { showToast('이미지 클립을 먼저 선택하세요'); return; }
        state.target = obj;
        state.targetIsVideo = !!obj.isVideo;
        openEditorSession();
    }

    function openEditorEmpty() {
        state.target = null;
        state.targetIsVideo = false;
        openEditorSession();
    }

    function pingChild() {
        const w = state.iframe?.contentWindow;
        if (!w) return;
        try { w.postMessage({ type: 'host:ping' }, '*'); } catch (e) { /* noop */ }
    }

    function closeEditor() {
        hideModalKeepSession();
    }

    // ------------------------------------------------------------------------
    // 4) 메시지 수신 처리
    // ------------------------------------------------------------------------
    let imageSentForThisSession = false;

    async function onMessage(evt) {
        if (!state.iframe || evt.source !== state.iframe.contentWindow) return;
        const data = evt.data;
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case 'editor:ready':
                if (state.sessionAlive || imageSentForThisSession) return;
                imageSentForThisSession = true;
                if (state.target) await sendImageToChild();
                else setStatus('빈 캔버스 — 이미지를 불러와 편집하세요');
                break;
            case 'editor:apply':
                await handleApply(data);
                break;
            case 'editor:cancel':
                closeEditor();
                break;
        }
    }

    async function sendImageToChild() {
        try {
            if (!state.target) return;
            const el = state.target.getElement();
            const blob = await elementToImageBlob(el, 'image/png');
            const fileName = state.target.sourceFileName || state.target.layerName || 'clip-image.png';
            const resEl = document.getElementById('ratioSelect') || document.getElementById('resolution');
            let currentResolution = resEl ? resEl.value : null;
            if (!currentResolution || currentResolution === 'custom' || currentResolution === '') {
                currentResolution = window.currentRatio;
            }
            state.iframe.contentWindow.postMessage({
                type: 'host:load-image',
                blob,
                meta: { fileName, resolution: currentResolution }
            }, '*');
            setStatus(`${fileName} 편집 중`);
        } catch (e) {
            console.error('[bridge] sendImage failed:', e);
            setStatus('이미지 전송 실패');
        }
    }

    async function handleApply(payload) {
        const { blob, mime, meta } = payload;
        if (!blob) { closeEditor(); return; }
        if (!state.target) {
            if (mime === 'video/webm') {
                await addVideoBlobToTimeline(blob, meta || {});
            } else {
                await addImageBlobToTimeline(blob, mime, meta || {});
            }
            closeEditor();
            return;
        }

        if (mime === 'video/webm') {
            await applyVideoBlobToTarget(blob, meta || {});
        } else {
            await applyImageBlobToTarget(blob, mime, meta || {});
        }
        closeEditor();
    }

    // ------------------------------------------------------------------------
    // 5) 결과 적용 (이미지)
    // ------------------------------------------------------------------------
    function loadImageElement(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    async function applyImageBlobToTarget(blob, mime, meta) {
        const url = URL.createObjectURL(blob);
        const img = await loadImageElement(url);
        if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();

        window.MediaDispose?.releaseFabricObjectElementBeforeReplace?.(state.target);
        state.target.setElement(img);
        state.target.set({
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            sourceFileName: meta.fileName || state.target.sourceFileName || 'edited.png',
            sourceMime: mime || 'image/png',
            isVideo: false
        });
        state.target.dirty = true;
        window.canvas?.requestRenderAll?.();
        window.canvas?.setActiveObject?.(state.target);
        if (typeof window.renderTracks === 'function') window.renderTracks();
        if (typeof window.updatePropertyPanel === 'function') window.updatePropertyPanel(state.target);
        showToast('효과를 현재 클립에 적용했습니다');
    }

    // ------------------------------------------------------------------------
    // 6) 결과 적용 (영상 WEBM)
    //    - 현재 클립을 영상으로 전환: setElement(videoElt) + isVideo:true + inherentDuration
    // ------------------------------------------------------------------------
    function loadVideoElement(url) {
        return new Promise((resolve, reject) => {
            const v = document.createElement('video');
            v.src = url;
            v.crossOrigin = 'anonymous';
            v.playsInline = true;
            v.muted = false;
            v.loop = true;
            v.onloadedmetadata = () => {
                v.width = v.videoWidth || 1920;
                v.height = v.videoHeight || 1080;
                resolve(v);
            };
            v.onerror = reject;
            v.load();
        });
    }

    async function applyVideoBlobToTarget(blob, meta) {
        const url = URL.createObjectURL(blob);
        const v = await loadVideoElement(url);
        if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();

        const dur = Number(meta.durationSec) > 0 ? Number(meta.durationSec) : (v.duration || 2);
        try { 
            const playPromise = v.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => { 
                    v.muted = true; 
                    v.play().catch(()=>{}); 
                });
            }
        } catch (_) { }

        window.MediaDispose?.releaseFabricObjectElementBeforeReplace?.(state.target);
        state.target.setElement(v);
        state.target.set({
            width: v.videoWidth || v.width,
            height: v.videoHeight || v.height,
            sourceFileName: meta.fileName || 'effect.webm',
            sourceMime: 'video/webm',
            isVideo: true,
            inherentDuration: dur
        });
        state.target.dirty = true;
        window.canvas?.requestRenderAll?.();
        window.canvas?.setActiveObject?.(state.target);
        if (typeof window.renderTracks === 'function') window.renderTracks();
        if (typeof window.updatePropertyPanel === 'function') window.updatePropertyPanel(state.target);
        showToast('영상 효과를 현재 클립에 적용했습니다 (WEBM)');
    }

    async function addImageBlobToTimeline(blob, mime, meta) {
        const appCanvas = window.canvas || (typeof canvas !== 'undefined' ? canvas : null);
        const fabricLib = window.fabric || (typeof fabric !== 'undefined' ? fabric : null);
        if (!appCanvas || !fabricLib) return;

        const url = URL.createObjectURL(blob);
        const img = await loadImageElement(url);
        if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();

        const durEl = document.getElementById('defaultImageDuration');
        const duration = parseFloat(durEl?.value) || 5;
        const fileName = meta.fileName || (mime === 'image/jpeg' ? 'edited.jpg' : 'edited.png');
        const clip = new fabricLib.Image(img, {
            left: appCanvas.width / 2,
            top: appCanvas.height / 2,
            originX: 'center',
            originY: 'center',
            layerName: fileName,
            sourceFileName: fileName,
            sourceMime: mime || 'image/png',
            startTime: 0,
            endTime: duration,
            trackType: 'overlay',
            trackIndex: 0,
            zIndex: 10,
            baseOpacity: 1,
            baseScaleX: 1,
            baseScaleY: 1,
            baseAngle: 0
        });
        const scale = Math.min(appCanvas.width / clip.width, appCanvas.height / clip.height) * 0.8;
        clip.scale(scale);
        clip.set('baseScaleX', clip.scaleX);
        clip.set('baseScaleY', clip.scaleY);
        clip.set('baseLeft', clip.left);
        clip.set('baseTop', clip.top);
        const preferredStart = typeof currentTime !== 'undefined' ? currentTime : 0;
        if (window.TimelinePlacement) {
            window.TimelinePlacement.placeClipOnTrack(clip, 'overlay', 0, duration, { preferredStart });
        }
        appCanvas.add(clip);
        window.lastSelectedObj = clip;
        appCanvas.setActiveObject(clip);
        if (typeof window.sortCanvasLayers === 'function') window.sortCanvasLayers();
        appCanvas.requestRenderAll();
        if (typeof window.renderTracks === 'function') window.renderTracks();
        if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
        if (typeof window.updatePropertyPanel === 'function') window.updatePropertyPanel(clip);
        showToast('효과 이미지를 타임라인에 추가했습니다');
    }

    async function addVideoBlobToTimeline(blob, meta) {
        const appCanvas = window.canvas || (typeof canvas !== 'undefined' ? canvas : null);
        const fabricLib = window.fabric || (typeof fabric !== 'undefined' ? fabric : null);
        if (!appCanvas || !fabricLib) return;

        const url = URL.createObjectURL(blob);
        const v = await loadVideoElement(url);
        if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();

        const dur = Number(meta.durationSec) > 0 ? Number(meta.durationSec) : (v.duration || 2);
        const fileName = meta.fileName || 'effect.webm';
        const img = new fabricLib.Image(v, {
            left: appCanvas.width / 2,
            top: appCanvas.height / 2,
            originX: 'center',
            originY: 'center',
            layerName: fileName,
            sourceFileName: fileName,
            sourceMime: 'video/webm',
            startTime: 0,
            endTime: dur,
            trackType: 'overlay',
            trackIndex: 2,
            zIndex: 12,
            isVideo: true,
            inherentDuration: dur,
            baseOpacity: 1,
            baseScaleX: 1,
            baseScaleY: 1,
            baseAngle: 0,
            baseVolume: 1,
            thumbUrl: ''
        });
        const scale = Math.min(appCanvas.width / img.width, appCanvas.height / img.height) * 0.8;
        img.scale(scale);
        img.set('baseScaleX', img.scaleX);
        img.set('baseScaleY', img.scaleY);
        img.set('baseLeft', img.left);
        img.set('baseTop', img.top);
        const preferredStart = typeof currentTime !== 'undefined' ? currentTime : 0;
        if (window.TimelinePlacement) {
            window.TimelinePlacement.placeClipOnTrack(img, 'overlay', 2, dur, { preferredStart });
        }
        appCanvas.add(img);
        window.lastSelectedObj = img;
        appCanvas.setActiveObject(img);
        if (typeof window.sortCanvasLayers === 'function') window.sortCanvasLayers();
        appCanvas.requestRenderAll();
        if (typeof window.renderTracks === 'function') window.renderTracks();
        if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
        if (typeof window.updatePropertyPanel === 'function') window.updatePropertyPanel(img);
        showToast('녹화된 WEBM 클립을 타임라인에 추가했습니다');
    }

    // ------------------------------------------------------------------------
    // 7) 부트
    // ------------------------------------------------------------------------
    function boot() {
        window.addEventListener('message', onMessage);
        ensureEntryButton();
        // 속성 패널이 동적으로 갱신될 수 있으니 가벼운 옵저버 한 번 (한 번만 주입되면 됨)
        const obs = new MutationObserver(() => {
            if (!$('effectEditorOpenBtn')) injectEntryButton();
        });
        obs.observe(document.body, { childList: true, subtree: true });

        // 외부 API (필요 시 호출 가능)
        window.openEffectEditor = openEditor;
        window.openEffectEditorEmpty = openEditorEmpty;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
