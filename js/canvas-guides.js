/**
 * canvas-guides.js
 * 메인 캔버스 가이드선 (가로 3 + 세로 3)
 *  - 토글 보이기/감추기
 *  - 마우스 드래그로 위치 이동
 *  - Fabric.js object:moving 자석 스냅
 *  - 렌더링(isExportRecording) 중에는 자동 숨김
 */
(function () {
    'use strict';

    /* ── 상수 ─────────────────────────────── */
    const SNAP_PX       = 10;   // 자석 임계 픽셀 (화면 좌표 기준)
    const V_COLOR       = '#3b82f6';   // 세로선 기본색
    const H_COLOR       = '#3b82f6';   // 가로선 기본색
    const SNAP_COLOR    = '#ef4444';   // 자석 흡착 시 강조색
    const LINE_WIDTH    = 1;           // px

    /* ── 상태 ─────────────────────────────── */
    const state = {
        visible : false,
        dragging: null,   // { id, type, startPos, startMouse }
        snapping: new Set(),
        lines: [
            { id: 1, type: 'v', pos: 0.25 },
            { id: 2, type: 'v', pos: 0.50 },
            { id: 3, type: 'v', pos: 0.75 },
            { id: 4, type: 'h', pos: 0.25 },
            { id: 5, type: 'h', pos: 0.50 },
            { id: 6, type: 'h', pos: 0.75 },
        ]
    };
    window.canvasGuideState = state;

    /* ── DOM 참조 ─────────────────────────── */
    let layer       = null;   // #canvasGuideLayer
    let canvasArea  = null;   // .canvas-area (main)
    let fabricCanvas = null;  // Fabric.js canvas 인스턴스

    /* ── 초기화 ───────────────────────────── */
    window.initCanvasGuides = function (fc) {
        fabricCanvas = fc;
        layer      = document.getElementById('canvasGuideLayer');
        canvasArea = document.querySelector('.canvas-area');
        if (!layer || !canvasArea) return;
        render();
        bindFabricEvents();
        bindWindowResize();
    };

    // canvas-guides.js 가 defer 로드되어 window.canvas 보다 늦게 실행될 수 있으므로
    // DOMContentLoaded 후 자동 부트스트랩
    function bootstrap() {
        if (window.canvas && typeof window.initCanvasGuides === 'function') {
            window.initCanvasGuides(window.canvas);
        } else {
            // 아직 canvas가 없으면 짧게 재시도
            setTimeout(bootstrap, 80);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }


    /* ── 렌더링 ───────────────────────────── */
    function render() {
        if (!layer) return;

        // 렌더링(영상 내보내기) 중에는 완전 숨김
        const isExporting = !!window.isExportRecording;
        layer.style.display = (!state.visible || isExporting) ? 'none' : 'block';
        if (!state.visible || isExporting) return;

        const mainCanvas = document.getElementById('mainCanvas');
        if (!mainCanvas) return;
        const rect      = mainCanvas.getBoundingClientRect();
        const areaRect  = canvasArea.getBoundingClientRect();
        const offsetX   = rect.left - areaRect.left;
        const offsetY   = rect.top  - areaRect.top;
        const W = rect.width;
        const H = rect.height;

        layer.innerHTML = '';

        state.lines.forEach(line => {
            const isSnapping = state.snapping.has(line.id);
            // 가이드선 색: 자석 흡착 시 빨강, 평소 시안(하얀 배경에서도 선명)
            const lineColor  = isSnapping ? '#ef4444' : '#00c8ff';

            // ─ 히트 영역 wrapper (투명, 마우스 이벤트 담당)
            const wrapper = document.createElement('div');
            wrapper.dataset.guideId = line.id;
            wrapper.style.position = 'absolute';
            wrapper.style.pointerEvents = 'auto';
            wrapper.style.zIndex = '20';

            // ─ 실제 보이는 선 (inner)
            const inner = document.createElement('div');
            inner.style.position = 'absolute';
            inner.style.pointerEvents = 'none';
            inner.style.background = lineColor;

            if (line.type === 'v') {
                const x = offsetX + line.pos * W;
                // wrapper: 12px 너비 (드래그 쉽게)
                Object.assign(wrapper.style, {
                    left  : `${x - 6}px`,
                    top   : `${offsetY}px`,
                    width : '12px',
                    height: `${H}px`,
                    cursor: 'ew-resize',
                });
                // inner: 1px 선, wrapper 중앙
                Object.assign(inner.style, {
                    left  : '5px',
                    top   : '0',
                    width : '1px',
                    height: '100%',
                });
            } else {
                const y = offsetY + line.pos * H;
                Object.assign(wrapper.style, {
                    left  : `${offsetX}px`,
                    top   : `${y - 6}px`,
                    width : `${W}px`,
                    height: '12px',
                    cursor: 'ns-resize',
                });
                Object.assign(inner.style, {
                    left  : '0',
                    top   : '5px',
                    width : '100%',
                    height: '1px',
                });
            }

            wrapper.appendChild(inner);
            wrapper.addEventListener('mousedown', onGuideMouseDown);
            wrapper.title = line.type === 'v'
                ? `세로 가이드선 (${Math.round(line.pos * 100)}%) — 드래그로 이동`
                : `가로 가이드선 (${Math.round(line.pos * 100)}%) — 드래그로 이동`;

            layer.appendChild(wrapper);
        });
    }
    window.renderCanvasGuides = render;


    /* ── 토글 ─────────────────────────────── */
    window.toggleCanvasGuides = function () {
        state.visible = !state.visible;
        render();
        const btn = document.getElementById('guideToggleBtn');
        if (btn) {
            if (state.visible) {
                btn.style.background  = '#0ea5e9';
                btn.style.boxShadow   = '0 2px 4px rgba(14,165,233,0.35)';
                btn.title = '가이드선 감추기';
            } else {
                btn.style.background  = '#64748b';
                btn.style.boxShadow   = '0 2px 4px rgba(100,116,139,0.35)';
                btn.title = '가이드선 보이기';
            }
        }
    };

    /* ── 가이드선 드래그 ──────────────────── */
    function onGuideMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(e.currentTarget.dataset.guideId);
        const line = state.lines.find(l => l.id === id);
        if (!line) return;

        state.dragging = { id, type: line.type, startPos: line.pos, startMouseX: e.clientX, startMouseY: e.clientY };
        document.addEventListener('mousemove', onGuideMouseMove);
        document.addEventListener('mouseup',   onGuideMouseUp);
        document.body.style.cursor = line.type === 'v' ? 'ew-resize' : 'ns-resize';
        document.body.style.userSelect = 'none';
    }

    function onGuideMouseMove(e) {
        if (!state.dragging) return;
        const { id, type, startPos, startMouseX, startMouseY } = state.dragging;
        const line = state.lines.find(l => l.id === id);
        if (!line) return;

        const mainCanvas = document.getElementById('mainCanvas');
        if (!mainCanvas) return;
        const rect = mainCanvas.getBoundingClientRect();

        let newPos;
        if (type === 'v') {
            const dx = e.clientX - startMouseX;
            newPos = startPos + dx / rect.width;
        } else {
            const dy = e.clientY - startMouseY;
            newPos = startPos + dy / rect.height;
        }
        line.pos = Math.max(0.01, Math.min(0.99, newPos));
        render();
    }

    function onGuideMouseUp() {
        state.dragging = null;
        document.removeEventListener('mousemove', onGuideMouseMove);
        document.removeEventListener('mouseup',   onGuideMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        render();
    }

    /* ── Fabric 자석 스냅 ─────────────────── */
    function bindFabricEvents() {
        if (!fabricCanvas) return;

        fabricCanvas.on('object:moving', function (e) {
            if (!state.visible || window.isExportRecording) return;
            const obj = e.target;
            if (!obj) return;
            snapObjectToGuides(obj);
        });

        fabricCanvas.on('object:modified', function () {
            state.snapping.clear();
            render();
        });

        fabricCanvas.on('selection:cleared', function () {
            state.snapping.clear();
            render();
        });
    }

    function snapObjectToGuides(obj) {
        const mainCanvas = document.getElementById('mainCanvas');
        if (!mainCanvas) return;

        // Fabric 캔버스 내부 좌표계 크기
        const fcW = fabricCanvas.getWidth();
        const fcH = fabricCanvas.getHeight();

        // 화면 표시 픽셀 크기 (CSS)
        const rect = mainCanvas.getBoundingClientRect();
        const scaleX = rect.width  / fcW;
        const scaleY = rect.height / fcH;

        // 스냅 임계값 (Fabric 내부 좌표)
        const threshX = SNAP_PX / scaleX;
        const threshY = SNAP_PX / scaleY;

        // 오브젝트 경계 (Fabric 내부 좌표)
        const bounds = obj.getBoundingRect(true, true);
        const objLeft   = bounds.left;
        const objRight  = bounds.left + bounds.width;
        const objTop    = bounds.top;
        const objBottom = bounds.top  + bounds.height;
        const objCX     = (objLeft + objRight)  / 2;
        const objCY     = (objTop  + objBottom) / 2;

        let snapX = null, snapY = null;
        let bestDX = threshX, bestDY = threshY;
        state.snapping.clear();

        state.lines.forEach(line => {
            if (line.type === 'v') {
                const gx = line.pos * fcW;
                const edges = [
                    { val: objLeft,  adjust: (d) => obj.left + d },
                    { val: objRight, adjust: (d) => obj.left + d },
                    { val: objCX,    adjust: (d) => obj.left + d },
                ];
                edges.forEach(({ val, adjust }) => {
                    const d = gx - val;
                    if (Math.abs(d) < bestDX) {
                        bestDX = Math.abs(d);
                        snapX = adjust(d);
                        state.snapping.add(line.id);
                    }
                });
            } else {
                const gy = line.pos * fcH;
                const edges = [
                    { val: objTop,    adjust: (d) => obj.top + d },
                    { val: objBottom, adjust: (d) => obj.top + d },
                    { val: objCY,     adjust: (d) => obj.top + d },
                ];
                edges.forEach(({ val, adjust }) => {
                    const d = gy - val;
                    if (Math.abs(d) < bestDY) {
                        bestDY = Math.abs(d);
                        snapY = adjust(d);
                        state.snapping.add(line.id);
                    }
                });
            }
        });

        let changed = false;
        if (snapX !== null) { obj.left = snapX; changed = true; }
        if (snapY !== null) { obj.top  = snapY; changed = true; }
        if (changed) {
            obj.setCoords();
            fabricCanvas.requestRenderAll();
        }

        render(); // 스냅 색상 반영
    }

    /* ── 창 리사이즈 대응 ─────────────────── */
    function bindWindowResize() {
        window.addEventListener('resize', () => {
            if (state.visible) render();
        });
        // canvas-area 크기 변화 감지 (ResizeObserver)
        if (canvasArea && window.ResizeObserver) {
            new ResizeObserver(() => {
                if (state.visible) render();
            }).observe(canvasArea);
        }
    }

    /* ── 내보내기 중 자동 숨김 감시 ─────────── */
    // window.isExportRecording 변화를 감지해 가이드 숨김/복원
    let _lastExport = false;
    setInterval(() => {
        const cur = !!window.isExportRecording;
        if (cur !== _lastExport) {
            _lastExport = cur;
            render();
        }
    }, 300);

})();
