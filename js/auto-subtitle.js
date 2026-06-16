import { calcLyricsFlowCanvasLeft } from './lyrics-flow.js';

/**
 * 타임라인 AI 자막 클립 표시 (추출 UI는 가사자막 팝업으로 이동)
 */
document.addEventListener('DOMContentLoaded', () => {
    function timelineNow() {
        return typeof window.getTimelineCurrentTime === 'function'
            ? window.getTimelineCurrentTime()
            : 0;
    }

    function getActiveCue(obj, relTime) {
        if (!obj?.subtitleCues?.length) return null;
        return obj.subtitleCues.find((c) => {
            const end = c.end != null ? c.end : c.start + 3;
            return relTime >= c.start && relTime < end;
        }) || null;
    }

    window.getTimedSubtitleActiveCue = function (obj, atTime) {
        if (!obj?.isTimedSubtitleClip) return null;
        const rel = (atTime ?? timelineNow()) - (obj.startTime || 0);
        return getActiveCue(obj, rel);
    };

    window.applyTimedSubtitleVisibility = function () {
        if (!window.canvas) return;
        let needsRender = false;
        window.canvas.getObjects().forEach((obj) => {
            if (!obj.isTimedSubtitleClip) return;
            const start = obj.startTime || 0;
            const end = obj.endTime || 5;
            const tIn = obj.transitionIn ? 0.25 : 0;
            const tOut = obj.transitionOut ? 0.25 : 0;
            const inClip = timelineNow() >= start - tIn && timelineNow() <= end + tOut;
            const rel = timelineNow() - start;
            const cue = inClip ? getActiveCue(obj, rel) : null;
            const nextText = cue ? cue.text : '';
            const show = inClip && !!cue;
            if (obj.text !== nextText) {
                obj.set('text', nextText);
                needsRender = true;
            }
            const targetOp = show ? (obj.baseOpacity !== undefined ? obj.baseOpacity : 1) : 0;
            if (obj.opacity !== targetOp) {
                obj.set('opacity', targetOp);
                needsRender = true;
            }
            if (show && obj.isLyricsFlowClip && cue) {
                const cw = window.canvas.width || 1920;
                const cueDur = Math.max(0.3, (cue.end != null ? cue.end : cue.start + 3) - cue.start);
                const prog = Math.max(0, Math.min(1, (rel - cue.start) / cueDur));
                const left = calcLyricsFlowCanvasLeft(cw, prog);
                if (Math.abs((obj.left || 0) - left) > 1) {
                    obj.set({ left, originX: 'center' });
                    needsRender = true;
                }
            } else if (obj.isLyricsFlowClip && obj.baseLeft != null) {
                if (obj.left !== obj.baseLeft) {
                    obj.set({ left: obj.baseLeft, originX: 'center' });
                    needsRender = true;
                }
            }
            if (obj.visible !== inClip) {
                obj.visible = inClip;
                needsRender = true;
            }
        });
        if (needsRender) window.canvas.requestRenderAll();
    };

    if (typeof window.updateLayerVisibility === 'function') {
        const orig = window.updateLayerVisibility;
        window.updateLayerVisibility = function () {
            orig();
            window.applyTimedSubtitleVisibility();
        };
    }
});
