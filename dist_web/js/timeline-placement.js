/**
 * 타임라인 클립 배치 — 트랙 내 겹침 방지, 가사↔오디오 동기
 */
(function () {
    const DURATION_EPS = 0.2;
    const DURATION_REL_EPS = 0.02;
    const OVERLAY4_INDEX = 3;

    function normalizeClipName(name) {
        if (!name) return '';
        return String(name).replace(/\.[^.]+$/, '').trim().toLowerCase();
    }

    function clipsOverlap(start, end, oStart, oEnd) {
        return start < oEnd - 0.001 && end > oStart + 0.001;
    }

    function durationsMatch(a, b) {
        const da = Math.max(0.01, a);
        const db = Math.max(0.01, b);
        if (Math.abs(da - db) <= DURATION_EPS) return true;
        return Math.abs(da - db) / Math.max(da, db) <= DURATION_REL_EPS;
    }

    function getAudioWallDuration(track) {
        const wall = Math.max(0, (track.endTime || 0) - (track.startTime || 0));
        const media = track.audio?.duration;
        if (media && media > 0.05) return media;
        return wall > 0.05 ? wall : 0;
    }

    function getTrackObjects(trackType, trackIndex) {
        if (trackType === 'audio') {
            return (window.audioTrackData || []).filter((o) => o.trackIndex === trackIndex);
        }
        const canvas = window.canvas;
        if (!canvas) return [];
        return canvas.getObjects().filter(
            (o) => (o.trackType || 'overlay') === trackType && (o.trackIndex || 0) === trackIndex
        );
    }

    function findFirstNonOverlappingSlot(trackType, trackIndex, duration, preferredStart = 0) {
        const segments = getTrackObjects(trackType, trackIndex)
            .map((o) => ({ start: o.startTime || 0, end: o.endTime || 5 }))
            .sort((a, b) => a.start - b.start);

        let candidate = Math.max(0, preferredStart);
        let changed = true;
        while (changed) {
            changed = false;
            for (const seg of segments) {
                if (clipsOverlap(candidate, candidate + duration, seg.start, seg.end)) {
                    candidate = seg.end;
                    changed = true;
                }
            }
        }
        return candidate;
    }

    function placeClipOnTrack(obj, trackType, trackIndex, duration, options = {}) {
        const preferred = options.preferredStart ?? 0;
        const start = findFirstNonOverlappingSlot(trackType, trackIndex, duration, preferred);
        obj.trackType = trackType;
        obj.trackIndex = trackIndex;
        obj.startTime = start;
        obj.endTime = start + duration;
        if (options.trimStart != null) obj.trimStart = options.trimStart;
        return { start, end: start + duration };
    }

    function findMatchingAudioTrack(audioName, durationSec) {
        const key = normalizeClipName(audioName);
        if (!key) return null;
        const tracks = window.audioTrackData || [];
        for (const t of tracks) {
            if (normalizeClipName(t.layerName) !== key) continue;
            const d = getAudioWallDuration(t);
            if (durationsMatch(d, durationSec)) return t;
        }
        return null;
    }

    function resolveLyricsPlacement(audioName, durationSec, options = {}) {
        const dur = Math.max(0.5, durationSec || 10);
        const match = findMatchingAudioTrack(audioName, dur);
        if (match) {
            const start = match.startTime || 0;
            const wall = Math.max(0.5, (match.endTime || 0) - start);
            return {
                start,
                dur: wall,
                trackIndex: OVERLAY4_INDEX,
                trackType: 'overlay',
                matchedAudio: match,
                mode: 'sync'
            };
        }
        const preferred = options.preferredStart ?? 0;
        const start = findFirstNonOverlappingSlot('overlay', OVERLAY4_INDEX, dur, preferred);
        return {
            start,
            dur,
            trackIndex: OVERLAY4_INDEX,
            trackType: 'overlay',
            matchedAudio: null,
            mode: 'empty'
        };
    }

    window.TimelinePlacement = {
        OVERLAY4_INDEX,
        normalizeClipName,
        durationsMatch,
        clipsOverlap,
        getTrackObjects,
        findFirstNonOverlappingSlot,
        placeClipOnTrack,
        findMatchingAudioTrack,
        resolveLyricsPlacement
    };
})();
