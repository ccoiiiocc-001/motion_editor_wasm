import { calcLyricsFlowCanvasLeft } from './lyrics-flow.js';
import { createWhisperLyricsExtractor } from './lyrics-whisper-extract.js';

/**
 * 동영상 전용 AI 자막 편집기 모달 제어 및 클립 표시 관리
 */
document.addEventListener('DOMContentLoaded', () => {
    // 속성창 버튼 연동
    const propBtn = document.getElementById('propAutoSubtitleBtn');

    // 모달 DOM 엘리먼트
    const modal = document.getElementById('videoSubtitleModal');
    const closeBtn = document.getElementById('videoSubtitleCloseBtn');
    const videoPlayer = document.getElementById('videoSubtitlePlayer');
    const clipRangeLabel = document.getElementById('videoSubtitleClipRange');
    const addRowBtn = document.getElementById('videoSubtitleAddRowBtn');
    const extractBtn = document.getElementById('videoSubtitleExtractBtn');
    const toggleBtn = document.getElementById('videoSubtitleToggleBtn');
    const stopBtn = document.getElementById('videoSubtitleStopBtn');
    const statusText = document.getElementById('videoSubtitleStatus');
    const lineListContainer = document.getElementById('videoSubtitleLineList');
    const cancelBtn = document.getElementById('videoSubtitleCancelBtn');
    const completeBtn = document.getElementById('videoSubtitleCompleteBtn');

    // 추가된 진행 표시 및 비디오 컨테이너 참조
    const progressWrap = document.getElementById('videoSubtitleProgressWrap');
    const progressBar = document.getElementById('videoSubtitleProgressBar');
    const progressPercent = document.getElementById('videoSubtitlePercent');
    const progressLabel = document.getElementById('videoSubtitleProgressLabel');
    const videoOverlay = document.getElementById('videoSubtitleVideoOverlay');

    let extractor = null;
    let currentMediaObj = null;
    let linesState = [];
    let clipStart = 0;
    let clipEnd = 0;

    function lockVideoPlayer(locked) {
        const container = document.getElementById('videoSubtitlePlayerContainer');
        if (container) {
            container.style.pointerEvents = locked ? 'none' : 'auto';
            container.style.opacity = locked ? '0.45' : '1';
        }
        if (videoPlayer) {
            videoPlayer.controls = !locked;
            if (locked) videoPlayer.pause();
        }
    }

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

    // 속성창에서 선택 대상 갱신 시 호출
    window.syncAutoSubtitleWrapVisibility = function (selectedObj) {
        const obj = selectedObj || (window.canvas ? window.canvas.getActiveObject() : null) || window.lastSelectedObj;
        if (obj && (obj.isVideo || obj.trackType === 'audio')) {
            currentMediaObj = obj;
        } else {
            currentMediaObj = null;
        }
    };

    window.getTimedSubtitleActiveCue = function (obj, atTime) {
        if (!obj?.isTimedSubtitleClip) return null;
        const rel = (atTime ?? timelineNow()) - (obj.startTime || 0);
        return getActiveCue(obj, rel);
    };

    // 타임라인 재생 시 캔버스 자막 텍스트 렌더링
    window.applyTimedSubtitleVisibility = function () {
        if (!window.canvas) return;
        let needsRender = false;
        window.canvas.getObjects().forEach((obj) => {
            if (!obj.isTimedSubtitleClip) return;
            const trackKey = `${obj.trackType || 'overlay'}_${obj.trackIndex || 0}`;
            const isMuted = !!(window.trackMuteStates && window.trackMuteStates[trackKey]);
            const start = obj.startTime || 0;
            const end = obj.endTime || 5;
            const tIn = obj.transitionIn ? 0.25 : 0;
            const tOut = obj.transitionOut ? 0.25 : 0;
            const inClip = !isMuted && timelineNow() >= start - tIn && timelineNow() <= end + tOut;
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

    // 시간 포맷팅 헬퍼 (초 -> MM:SS.f)
    function formatTimeShort(sec) {
        sec = Math.max(0, sec || 0);
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const cs = Math.floor((sec % 1) * 10);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`;
    }

    // 시간 파싱 헬퍼 (MM:SS.f 혹은 초 -> Float)
    function parseTimeShort(str) {
        if (!str) return 0;
        const parts = str.trim().split(':');
        if (parts.length === 2) {
            const m = parseInt(parts[0], 10) || 0;
            const s = parseFloat(parts[1]) || 0;
            return m * 60 + s;
        }
        return parseFloat(str) || 0;
    }

    // 비디오 플레이어 재생구간 제한 연동
    if (videoPlayer) {
        videoPlayer.addEventListener('timeupdate', () => {
            if (!modal || modal.style.display === 'none') return;
            const ct = videoPlayer.currentTime;
            if (ct > clipEnd) {
                videoPlayer.currentTime = clipStart;
                videoPlayer.pause();
            } else if (ct < clipStart) {
                videoPlayer.currentTime = clipStart;
            }
            // 현재 시간에 따른 자막 행 실시간 하이라이트
            highlightActiveRowAt(Math.max(0, videoPlayer.currentTime - clipStart));
        });
    }

    // 하이라이트 활성화 및 비디오 화면 위 자막 오버레이 갱신
    function highlightActiveRowAt(t) {
        const rows = document.querySelectorAll('#videoSubtitleLineList .video-subtitle-row');
        rows.forEach(row => {
            row.style.background = '#fff';
            row.style.borderColor = '#e2e8f0';
        });

        linesState.sort((a, b) => a.time - b.time);
        let activeId = null;
        let activeLine = null;
        for (let i = linesState.length - 1; i >= 0; i--) {
            if (t >= linesState[i].time) {
                activeId = linesState[i].id;
                activeLine = linesState[i];
                break;
            }
        }

        if (activeId !== null) {
            const activeRow = document.querySelector(`#videoSubtitleLineList .video-subtitle-row[data-id="${activeId}"]`);
            if (activeRow) {
                activeRow.style.background = '#f0fdf4';
                activeRow.style.borderColor = '#bbf7d0';
            }
        }

        // 비디오 오버레이에 자막 실시간 반영
        if (videoOverlay) {
            if (activeLine && activeLine.text.trim()) {
                videoOverlay.textContent = activeLine.text;
                videoOverlay.style.display = 'block';
            } else {
                videoOverlay.style.display = 'none';
                videoOverlay.textContent = '';
            }
        }
    }

    // UI 모달 상태 업데이트
    function setUIState(extracting) {
        if (extracting) {
            if (extractBtn) extractBtn.style.display = 'none';
            if (toggleBtn) toggleBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            if (statusText) statusText.style.display = 'block';
        } else {
            if (extractBtn) extractBtn.style.display = 'block';
            if (toggleBtn) toggleBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
            if (statusText) {
                statusText.style.display = 'none';
                statusText.textContent = '대기 중...';
            }
            if (toggleBtn) toggleBtn.textContent = '⏸ 일시정지';
        }
    }

    // 자막 행 엘리먼트 생성
    function createRowElement(lineObj) {
        const row = document.createElement('div');
        row.className = 'video-subtitle-row';
        row.dataset.id = lineObj.id;
        row.style.cssText = 'display:flex; gap:6px; align-items:center; margin-bottom:8px; background:#fff; padding:6px; border-radius:6px; border:1px solid #e2e8f0;';

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'video-line-play-btn';
        playBtn.style.cssText = 'background:#f1f5f9; border:none; border-radius:4px; padding:4px 6px; cursor:pointer; font-size:10px; font-weight:700; color:#475569;';
        playBtn.textContent = '▶';
        playBtn.onclick = () => {
            if (videoPlayer) {
                videoPlayer.currentTime = clipStart + lineObj.time;
                videoPlayer.play().catch(() => {});
            }
        };

        const timeInput = document.createElement('input');
        timeInput.type = 'text';
        timeInput.className = 'video-line-time-input';
        timeInput.style.cssText = 'width:56px; text-align:center; font-size:11px; border:1px solid #cbd5e1; border-radius:4px; padding:2px; font-family:monospace;';
        timeInput.value = formatTimeShort(lineObj.time);
        timeInput.onchange = () => {
            const parsed = parseTimeShort(timeInput.value);
            lineObj.time = Math.max(0, Math.min(clipEnd - clipStart, parsed));
            timeInput.value = formatTimeShort(lineObj.time);
            renderLinesList();
        };

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'video-line-text-input';
        textInput.style.cssText = 'flex:1; font-size:11px; border:1px solid #cbd5e1; border-radius:4px; padding:3px 6px;';
        textInput.value = lineObj.text;
        textInput.placeholder = '자막 내용 입력';
        textInput.oninput = () => {
            lineObj.text = textInput.value;
        };

        const markBtn = document.createElement('button');
        markBtn.type = 'button';
        markBtn.className = 'video-line-mark-btn';
        markBtn.style.cssText = 'background:#e0f2fe; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:10px; font-weight:800; color:#0369a1;';
        markBtn.textContent = '타임';
        markBtn.onclick = () => {
            if (videoPlayer) {
                const relTime = Math.max(0, videoPlayer.currentTime - clipStart);
                lineObj.time = relTime;
                timeInput.value = formatTimeShort(relTime);
                renderLinesList();
            }
        };

        const addNextBtn = document.createElement('button');
        addNextBtn.type = 'button';
        addNextBtn.className = 'video-line-add-next-btn';
        addNextBtn.style.cssText = 'background:#ecfdf5; border:none; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:10px; font-weight:800; color:#059669; transition:all 0.2s;';
        addNextBtn.textContent = '+';
        addNextBtn.title = '아래에 새로운 자막 줄 삽입';
        addNextBtn.onclick = () => {
            linesState.push({
                id: Date.now() + Math.random(),
                text: '',
                time: lineObj.time + 1.5
            });
            renderLinesList();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'video-line-delete-btn';
        deleteBtn.style.cssText = 'background:#fee2e2; border:none; border-radius:4px; padding:4px 6px; cursor:pointer; font-size:10px; font-weight:700; color:#ef4444;';
        deleteBtn.textContent = '✕';
        deleteBtn.onclick = () => {
            linesState = linesState.filter(l => l.id !== lineObj.id);
            row.remove();
        };

        row.appendChild(playBtn);
        row.appendChild(markBtn);
        row.appendChild(timeInput);
        row.appendChild(textInput);
        row.appendChild(addNextBtn);
        row.appendChild(deleteBtn);
        return row;
    }

    // 자막 행 리스트 다시 그리기 (포커스 보존형)
    function renderLinesList() {
        if (!lineListContainer) return;

        const activeEl = document.activeElement;
        const activeRow = activeEl ? activeEl.closest('.video-subtitle-row') : null;
        const activeId = activeRow ? parseFloat(activeRow.dataset.id) : null;
        let focusClass = null;
        if (activeEl) {
            if (activeEl.classList.contains('video-line-text-input')) focusClass = 'video-line-text-input';
            else if (activeEl.classList.contains('video-line-time-input')) focusClass = 'video-line-time-input';
        }

        lineListContainer.innerHTML = '';
        linesState.sort((a, b) => a.time - b.time);
        linesState.forEach(line => {
            const el = createRowElement(line);
            lineListContainer.appendChild(el);
        });

        // 포커스 복구
        if (activeId !== null && focusClass) {
            const targetRow = lineListContainer.querySelector(`.video-subtitle-row[data-id="${activeId}"]`);
            if (targetRow) {
                const targetInput = targetRow.querySelector(`.${focusClass}`);
                if (targetInput) targetInput.focus();
            }
        }
    }

    // 모달창 열기
    async function openVideoSubtitleModal(obj) {
        if (!modal) return;
        currentMediaObj = obj;
        linesState = [];

        // 이미 동기화된 자막 클립이 존재하는 경우 불러오기
        const canvas = window.canvas;
        if (canvas) {
            const existingText = canvas.getObjects().find(o => o.isTimedSubtitleClip && o.lyricsClipId === obj.lyricsClipId);
            if (existingText && Array.isArray(existingText.subtitleCues)) {
                existingText.subtitleCues.forEach(cue => {
                    linesState.push({
                        id: Date.now() + Math.random(),
                        text: cue.text,
                        time: cue.start
                    });
                });
            }
        }

        const mediaEl = obj.isVideo ? obj.getElement() : obj.audio;
        const src = mediaEl?.src || mediaEl?.currentSrc;
        if (!src) {
            if (window.showToast) window.showToast('미디어 소스 파일이 유효하지 않습니다.');
            return;
        }

        clipStart = obj.trimStart || 0;
        clipEnd = clipStart + ((obj.endTime || 5) - (obj.startTime || 0));

        if (videoPlayer) {
            // 메인 캔버스 종횡비에 맞게 플레이어 영역 종횡비 동적 매핑
            const mainCanvas = window.canvas;
            if (mainCanvas && mainCanvas.width && mainCanvas.height) {
                const aspect = mainCanvas.width / mainCanvas.height;
                videoPlayer.style.aspectRatio = `${aspect}`;
            } else {
                videoPlayer.style.aspectRatio = "16/9";
            }
            videoPlayer.style.width = 'auto';
            videoPlayer.style.height = 'auto';
            videoPlayer.style.maxWidth = '100%';
            videoPlayer.style.maxHeight = '100%';
            videoPlayer.style.objectFit = 'contain';

            videoPlayer.src = src;
            videoPlayer.currentTime = clipStart;
            videoPlayer.load();
            await new Promise(resolve => {
                videoPlayer.onloadedmetadata = () => resolve();
                videoPlayer.onerror = () => resolve();
            });
        }

        if (clipRangeLabel) {
            clipRangeLabel.textContent = `선택된 구간: ${clipStart.toFixed(1)}초 ~ ${clipEnd.toFixed(1)}초 (속도: ${obj.playbackRate || 1}x)`;
        }

        renderLinesList();
        setUIState(false);

        // 자막 존재 여부에 따라 비디오 플레이어 제어 락/언락 분기
        if (linesState.length > 0) {
            lockVideoPlayer(false);
            if (progressWrap) progressWrap.style.display = 'none';
            if (statusText) {
                statusText.style.display = 'block';
                statusText.textContent = '자막을 성공적으로 불러왔습니다. 동영상을 감상하며 자막 텍스트와 싱크를 편리하게 편집하세요.';
            }
        } else {
            lockVideoPlayer(true);
            if (progressWrap) progressWrap.style.display = 'none';
            if (statusText) {
                statusText.style.display = 'block';
                statusText.textContent = '아래 [AI 자막 추출 시작] 버튼을 클릭하면 자막 추출을 시작합니다. 추출이 완료될 때까지 영상 재생은 제한됩니다.';
            }
        }

        modal.style.display = 'flex';
    }

    // 모달창 닫기 및 리셋
    function closeVideoSubtitleModal() {
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.removeAttribute('src');
        }
        if (extractor) {
            extractor.stop();
            extractor.destroy();
            extractor = null;
        }
        lockVideoPlayer(false);
        if (videoOverlay) {
            videoOverlay.style.display = 'none';
            videoOverlay.textContent = '';
        }
        if (progressWrap) progressWrap.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        if (modal) modal.style.display = 'none';
        setUIState(false);
    }

    // AI 실시간 추출 연동
    async function startAIExtraction() {
        if (!currentMediaObj) return;
        const mediaEl = currentMediaObj.isVideo ? currentMediaObj.getElement() : currentMediaObj.audio;
        const src = mediaEl?.src || mediaEl?.currentSrc;
        if (!src) return;

        setUIState(true);
        lockVideoPlayer(true); // 비디오 플레이어 강제 잠금 및 일시정지

        if (progressWrap) {
            progressWrap.style.display = 'block';
        }
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';

        if (statusText) {
            statusText.style.display = 'block';
            statusText.textContent = 'AI 자막 추출 준비 중...';
        }

        let targetPercent = 0;
        let currentPercent = 0;
        let progressTimer = null;

        function cleanupTimer() {
            if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = null;
            }
        }

        // 진행률이 멈추지 않고 실시간으로 부드럽게 기어가는 모션 효과 구현
        function startProgressTimer() {
            cleanupTimer();
            progressTimer = setInterval(() => {
                if (currentPercent < targetPercent) {
                    currentPercent += (targetPercent - currentPercent) * 0.08;
                    if (targetPercent - currentPercent < 0.2) {
                        currentPercent = targetPercent;
                    }
                }
                // AI 연산 중일 때 진행바가 정적으로 멈춰 보이지 않도록 미세 우상향(최대 98%)
                if (currentPercent >= targetPercent && currentPercent < 98 && extractor) {
                    currentPercent += 0.03;
                }

                const rounded = Math.min(100, Math.floor(currentPercent));
                if (progressBar) progressBar.style.width = rounded + '%';
                if (progressPercent) progressPercent.textContent = rounded + '%';
            }, 100);
        }

        startProgressTimer();

        let currentPhase = 'model'; // 'model' or 'extract'
        if (progressLabel) progressLabel.textContent = 'AI 모델 로딩 진행률';

        extractor = createWhisperLyricsExtractor({
            onStatus: (msg) => {
                if (statusText) statusText.textContent = msg;

                // 1. 모델 다운로드 퍼센트 분석
                const dlMatch = msg.match(/모델 다운로드:\s*(\d+)%/);
                if (dlMatch) {
                    if (currentPhase !== 'model') {
                        currentPhase = 'model';
                        if (progressLabel) progressLabel.textContent = 'AI 모델 로딩 진행률';
                    }
                    targetPercent = parseInt(dlMatch[1], 10);
                    return;
                }

                // 2. 가사 추출 구간 기반 목표치 계산 (예: "1/1구간", "1/5구간")
                const extractMatch = msg.match(/AI 가사 추출\s*(\d+)\/(\d+)구간/);
                if (extractMatch) {
                    const currentSeg = parseInt(extractMatch[1], 10);
                    const totalSeg = parseInt(extractMatch[2], 10);

                    // 모델 로딩 완료 후 자막 추출로 넘어가는 시점에 진행바를 0%로 초기화하여 새로 시작
                    if (currentPhase === 'model') {
                        currentPhase = 'extract';
                        if (progressLabel) progressLabel.textContent = '음성 자막 추출 진행률';
                        currentPercent = 0;
                        targetPercent = 0;
                        if (progressBar) progressBar.style.width = '0%';
                        if (progressPercent) progressPercent.textContent = '0%';
                    }

                    if (totalSeg > 0) {
                        // 추출 단계 전용 진행률을 0% ~ 100% 스케일로 환산 적용
                        targetPercent = Math.min(99, Math.round((currentSeg / totalSeg) * 100));
                    }
                }
            },
            onSegment: (chunks, offsetSec) => {
                chunks.forEach((chunk) => {
                    linesState.push({
                        id: Date.now() + Math.random(),
                        text: chunk.text,
                        time: offsetSec + chunk.start
                    });
                });
                renderLinesList();
            },
            onComplete: (cueCount) => {
                cleanupTimer();
                if (progressLabel) progressLabel.textContent = 'AI 분석 및 자막 추출 진행률';
                setUIState(false);
                extractor = null;
                lockVideoPlayer(false); // 비디오 플레이어 잠금 해제 (완료 후 재생 및 앞뒤 편집 가능)
                if (progressWrap) progressWrap.style.display = 'none';

                if (statusText) {
                    statusText.style.display = 'block';
                    statusText.textContent = `자막 추출 완료 (${cueCount}구간)! 이제 재생하여 자막을 자유롭게 수정해 주세요.`;
                }
                if (window.showToast) window.showToast(`AI 자막 ${cueCount}구간을 성공적으로 추출했습니다!`);
            },
            onError: (err) => {
                cleanupTimer();
                if (progressLabel) progressLabel.textContent = 'AI 분석 및 자막 추출 진행률';
                setUIState(false);
                extractor = null;
                lockVideoPlayer(false);
                if (progressWrap) progressWrap.style.display = 'none';

                if (statusText) {
                    statusText.style.display = 'block';
                    statusText.textContent = '자막 추출 오류 발생: ' + err;
                }
                if (window.showToast) window.showToast('AI 추출 오류: ' + err);
            }
        });

        try {
            const resp = await fetch(src);
            const blob = await resp.blob();
            const offsetSec = clipStart;
            const durationSec = clipEnd - clipStart;

            await extractor.runFromBlob(blob, { offsetSec, durationSec });
        } catch (e) {
            cleanupTimer();
            setUIState(false);
            extractor = null;
            lockVideoPlayer(false);
            if (progressWrap) progressWrap.style.display = 'none';
            if (window.showToast) window.showToast('파일을 읽어오는데 실패했습니다: ' + e.message);
        }
    }

    // 자막 레이어 타임라인 최종 생성/수정
    function completeSubtitleProcess() {
        if (!currentMediaObj) return;

        // 자막 큐 가공
        const cues = linesState.map((line) => {
            const sorted = [...linesState].sort((a, b) => a.time - b.time);
            const idx = sorted.findIndex(l => l.id === line.id);
            const next = sorted[idx + 1];
            const end = next ? next.time : line.time + 3.0;
            return {
                text: line.text,
                start: line.time,
                end: Math.max(end, line.time + 0.5)
            };
        });

        if (!cues.length) {
            if (window.showToast) window.showToast('등록된 자막 줄이 없습니다.');
            return;
        }

        const Fabric = window.fabric;
        const canvas = window.canvas;
        if (!Fabric || !canvas) return;

        let textObj = canvas.getObjects().find(o => o.isTimedSubtitleClip && o.lyricsClipId === currentMediaObj.lyricsClipId);

        if (textObj) {
            textObj.set({
                text: cues[0]?.text || '자막',
                subtitleCues: cues,
                startTime: currentMediaObj.startTime || 0,
                endTime: currentMediaObj.endTime || 5
            });
        } else {
            const lyricsClipId = 'subtitle_' + Date.now();
            currentMediaObj.lyricsClipId = lyricsClipId;

            textObj = new Fabric.IText(cues[0]?.text || '자막', {
                left: canvas.width / 2,
                top: canvas.height - 100,
                fontFamily: 'Pretendard',
                fontSize: 48,
                fill: '#ffffff',
                stroke: '#000000',
                strokeWidth: 4,
                originX: 'center',
                originY: 'center',
                fontWeight: 'bold',
                textAlign: 'center',
                opacity: 0
            });

            textObj.isTimedSubtitleClip = true;
            textObj.subtitleCues = cues;
            textObj.startTime = currentMediaObj.startTime || 0;
            textObj.endTime = currentMediaObj.endTime || 5;
            textObj.trackType = 'overlay';
            textObj.trackIndex = 3;
            textObj.layerName = 'AI 음성 자막 (' + (currentMediaObj.layerName || (currentMediaObj.isVideo ? '비디오' : '오디오')) + ')';
            textObj.baseOpacity = 1;
            textObj.baseLeft = canvas.width / 2;
            textObj.baseTop = canvas.height - 100;
            textObj.trimStart = 0;
            textObj.lyricsClipId = lyricsClipId;

            canvas.add(textObj);
        }

        if (typeof window.sortCanvasLayers === 'function') window.sortCanvasLayers();
        if (typeof window.renderTracks === 'function') window.renderTracks();
        if (typeof window.applyTimedSubtitleVisibility === 'function') window.applyTimedSubtitleVisibility();
        canvas.requestRenderAll();
        if (window.saveHistorySnapshot) window.saveHistorySnapshot();

        closeVideoSubtitleModal();
        if (window.showToast) window.showToast('자막이 타임라인에 적용되었습니다.');
    }

    if (addRowBtn) {
        addRowBtn.onclick = () => {
            const relTime = videoPlayer ? Math.max(0, videoPlayer.currentTime - clipStart) : 0;
            linesState.push({
                id: Date.now() + Math.random(),
                text: '',
                time: relTime
            });
            renderLinesList();
        };
    }

    // UI 속성창 AI 자막 생성 버튼 바인딩
    if (propBtn) {
        propBtn.onclick = (e) => {
            e.stopPropagation();
            const obj = currentMediaObj || (window.canvas ? window.canvas.getActiveObject() : null) || window.lastSelectedObj;
            if (obj && (obj.isVideo || obj.trackType === 'audio')) {
                openVideoSubtitleModal(obj);
            } else {
                if (window.showToast) window.showToast('자막을 추출할 미디어 클립을 선택해 주세요.');
            }
        };
    }

    // 모달 제어 이벤트 바인딩
    if (closeBtn) closeBtn.onclick = closeVideoSubtitleModal;
    if (cancelBtn) cancelBtn.onclick = closeVideoSubtitleModal;
    if (completeBtn) completeBtn.onclick = completeSubtitleProcess;

    if (extractBtn) extractBtn.onclick = startAIExtraction;
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            if (!extractor) return;
            if (extractor.isPaused()) {
                extractor.resume();
                toggleBtn.textContent = '⏸ 일시정지';
            } else {
                extractor.pause();
                toggleBtn.textContent = '▶ 추출 재개';
            }
        };
    }
    if (stopBtn) {
        stopBtn.onclick = (e) => {
            e.stopPropagation();
            if (extractor) {
                extractor.stop();
                extractor.destroy();
                extractor = null;
            }
            lockVideoPlayer(false); // 비디오 플레이어 락 해제
            if (progressWrap) progressWrap.style.display = 'none';
            if (videoPlayer) {
                videoPlayer.pause();
                videoPlayer.currentTime = clipStart;
            }
            setUIState(false);
            if (statusText) {
                statusText.style.display = 'block';
                statusText.textContent = '자막 추출이 중단되었습니다. [AI 자막 추출 시작]을 눌러 다시 진행할 수 있습니다.';
            }
            if (window.showToast) window.showToast('자막 추출이 중단되었습니다.');
        };
    }
});
