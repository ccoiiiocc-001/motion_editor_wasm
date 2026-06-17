/** 파란 기준선(다중) + 드래그 자석 */
(function () {
    let _guideId = 1;
    window.blueGuidelines = window.blueGuidelines || [];
    window.selectedBlueGuidelineId = null;

    Object.defineProperty(window, 'blueGuidelineTime', {
        get() {
            const s = window.getSelectedBlueGuideline();
            return s ? s.time : null;
        },
        set(v) {
            if (v === null || v === undefined) {
                if (window.selectedBlueGuidelineId != null) {
                    window.removeBlueGuideline(window.selectedBlueGuidelineId);
                }
                return;
            }
            window.addBlueGuideline(v, true);
        }
    });

    window.getGuideSnapThreshold = function () {
        const barWidth = typeof timelineBar !== 'undefined' && timelineBar ? timelineBar.offsetWidth : 600;
        const px = 14;
        const duration = typeof visibleTimelineDuration !== 'undefined' ? visibleTimelineDuration : MAX_TIMELINE_DURATION;
        return Math.max(0.2, (px / Math.max(barWidth, 1)) * duration);
    };

    window.addBlueGuideline = function (time, selectIt) {
        const t = Math.max(0, Math.min(time, MAX_TIMELINE_DURATION));
        const exists = window.blueGuidelines.some(g => Math.abs(g.time - t) < 0.05);
        if (exists) {
            const g = window.blueGuidelines.find(x => Math.abs(x.time - t) < 0.05);
            if (selectIt && g) {
                window.selectedBlueGuidelineId = g.id;
                if (typeof window.renderBlueGuidelines === 'function') window.renderBlueGuidelines();
            }
            return g;
        }
        const g = { id: _guideId++, time: t };
        window.blueGuidelines.push(g);
        if (selectIt) window.selectedBlueGuidelineId = g.id;
        if (typeof window.renderBlueGuidelines === 'function') window.renderBlueGuidelines();
        return g;
    };

    window.getSelectedBlueGuideline = function () {
        return window.blueGuidelines.find(g => g.id === window.selectedBlueGuidelineId) || null;
    };

    window.removeBlueGuideline = function (id) {
        const idx = window.blueGuidelines.findIndex(g => g.id === id);
        if (idx === -1) return false;
        window.blueGuidelines.splice(idx, 1);
        if (window.selectedBlueGuidelineId === id) window.selectedBlueGuidelineId = null;
        if (typeof window.renderBlueGuidelines === 'function') window.renderBlueGuidelines();
        return true;
    };

    window.removeSelectedBlueGuideline = function () {
        if (window.selectedBlueGuidelineId == null) {
            if (window.showToast) window.showToast('삭제할 파란선을 선택하세요');
            return false;
        }
        window.removeBlueGuideline(window.selectedBlueGuidelineId);
        if (window.showToast) window.showToast('파란 기준선 삭제');
        return true;
    };

    /** 클립 시각을 가장 가까운 기준선에 자석 */
    window.snapTimeToBlueGuides = function (time) {
        if (!window.blueGuidelines.length) return time;
        const th = window.getGuideSnapThreshold();
        let best = time;
        let bestD = th;
        window.blueGuidelines.forEach(g => {
            const d = Math.abs(time - g.time);
            if (d < bestD) {
                bestD = d;
                best = g.time;
            }
        });
        return best;
    };

    /** start/end 동시 이동 시 duration 유지하며 자석 */
    window.snapClipRangeToBlueGuides = function (start, end) {
        let ns = window.snapTimeToBlueGuides(start);
        let ne = window.snapTimeToBlueGuides(end);
        const dur = end - start;
        if (ns !== start && ne === end) {
            return { start: ns, end: ns + dur };
        }
        if (ne !== end && ns === start) {
            return { start: ne - dur, end: ne };
        }
        if (ns !== start && ne !== end) {
            return { start: ns, end: ne };
        }
        return { start, end };
    };

    window.renderBlueGuidelines = function () {
        const layer = typeof blueGuidelinesLayer !== 'undefined' ? blueGuidelinesLayer : document.getElementById('blueGuidelinesLayer');
        const deleteBtn = typeof deleteBlueGuidelineBtn !== 'undefined'
            ? deleteBlueGuidelineBtn
            : document.getElementById('deleteBlueGuidelineBtn');
        const setDeleteVisible = (visible) => {
            if (deleteBtn) deleteBtn.style.display = visible ? '' : 'none';
        };
        if (!layer) return;
        const duration = visibleTimelineDuration;
        const controls = document.querySelector('.timeline-controls');
        const controlsWidth = controls ? controls.offsetWidth + 4 : 124;
        const barWidth = timelineBar ? timelineBar.offsetWidth : 0;
        layer.innerHTML = '';
        const g = window.getSelectedBlueGuideline();
        if (!g) {
            setDeleteVisible(false);
            return;
        }
        const bp = ((g.time - timelineScrollX) / duration) * 100;
        if (bp < -1 || bp > 101) {
            setDeleteVisible(false);
            return;
        }
        const line = document.createElement('div');
        line.className = 'blue-guideline-line selected';
        line.style.left = `${controlsWidth + (bp / 100) * barWidth}px`;
        line.dataset.guideId = String(g.id);
        line.title = '선택된 기준선 — Delete: 삭제';
        layer.appendChild(line);
        setDeleteVisible(true);
    };

    window.deselectBlueGuideline = function () {
        if (window.selectedBlueGuidelineId == null) return;
        window.selectedBlueGuidelineId = null;
        if (typeof window.renderBlueGuidelines === 'function') window.renderBlueGuidelines();
    };

    window.findNearestBlueGuideTime = function (clipTime) {
        if (!window.blueGuidelines.length) return null;
        let best = null;
        let bestD = Infinity;
        window.blueGuidelines.forEach(g => {
            const d = Math.abs(clipTime - g.time);
            if (d < bestD) {
                bestD = d;
                best = g.time;
            }
        });
        return best;
    };
})();
