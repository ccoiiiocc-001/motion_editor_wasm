/**
 * Video Timeline & Rendering Logic
 */

// Monkeypatch fabric.Image to support video alpha mask without converting to static canvas
if (typeof fabric !== 'undefined' && fabric.Image && !fabric.Image.prototype.__videoPatched) {
    const originalRender = fabric.Image.prototype._render;
    fabric.Image.prototype._render = function(ctx) {
        const el = this.getElement();
        if (el instanceof HTMLVideoElement) {
            try {
                ctx.imageSmoothingQuality = "high";
                const cx = this.cropX || 0;
                const cy = this.cropY || 0;
                const cw = this.width;
                const ch = this.height;
                
                if (this.videoMaskCanvas) {
                    if (!this._offscreenCanvas) {
                        this._offscreenCanvas = document.createElement('canvas');
                    }
                    if (this._offscreenCanvas.width !== cw) this._offscreenCanvas.width = cw;
                    if (this._offscreenCanvas.height !== ch) this._offscreenCanvas.height = ch;
                    const octx = this._offscreenCanvas.getContext('2d');
                    octx.clearRect(0, 0, cw, ch);
                    
                    octx.drawImage(el, cx, cy, cw, ch, 0, 0, cw, ch);
                    
                    octx.globalCompositeOperation = 'destination-in';
                    octx.drawImage(this.videoMaskCanvas, 0, 0, cw, ch);
                    octx.globalCompositeOperation = 'source-over';
                    
                    ctx.drawImage(this._offscreenCanvas, -this.width/2, -this.height/2, this.width, this.height);
                } else {
                    ctx.drawImage(el, cx, cy, cw, ch, -this.width/2, -this.height/2, this.width, this.height);
                }
            } catch(e) {}
        } else {
            originalRender.call(this, ctx);
        }
    };
    fabric.Image.prototype.__videoPatched = true;
}
window.activeVideoElement = null;
window.activeVideoFabricObj = null;
window.videoRenderLoopId = null;
window.videoStartTime = 0;
window.videoEndTime = 0;
window.isVideoSelectionMode = 'all';

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

window.updateTimelineUI = function() {
    if (!window.activeVideoElement) return;
    const v = window.activeVideoElement;
    const duration = (v.duration && isFinite(v.duration)) ? v.duration : 0;
    const current = v.currentTime || 0;
    
    document.getElementById('video-time-display').textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    
    const progressPct = duration > 0 ? (current / duration) * 100 : 0;
    document.getElementById('video-track-progress').style.width = `${progressPct}%`;
    document.getElementById('video-playhead').style.left = `${progressPct}%`;
    
    if (window.isVideoSelectionMode === 'part') {
        const startPct = duration > 0 ? (window.videoStartTime / duration) * 100 : 0;
        const endPct = duration > 0 ? (window.videoEndTime / duration) * 100 : 100;
        const sel = document.getElementById('video-track-selection');
        sel.style.display = 'block';
        sel.style.left = `${startPct}%`;
        sel.style.width = `${endPct - startPct}%`;
    } else {
        document.getElementById('video-track-selection').style.display = 'none';
    }
}

function renderVideoLoop() {
    if (!window.activeVideoElement || !window.activeVideoFabricObj) return;
    
    // Check loop boundaries
    const v = window.activeVideoElement;
    let reachedEnd = false;
    
    if (window.isVideoSelectionMode === 'part') {
        if (v.currentTime >= window.videoEndTime) {
            reachedEnd = true;
        }
    } else {
        if (v.currentTime >= v.duration) {
            reachedEnd = true;
        }
    }
    
    if (reachedEnd) {
        // If we are currently recording, stop it automatically instead of looping
        if (typeof mediaRecorder !== 'undefined' && mediaRecorder && mediaRecorder.state === 'recording') {
            if (typeof stopRecording === 'function') {
                stopRecording();
                v.pause();
            }
        } else {
            // Check infinite repeat state
            const isInfinite = document.getElementById('repeat-infinite')?.checked !== false;
            v.currentTime = window.isVideoSelectionMode === 'part' ? window.videoStartTime : 0;
            
            if (isInfinite) {
                v.play(); // ensure playing after seek
            } else {
                v.pause();
                const playBtn = document.getElementById('video-play-pause-btn');
                if (playBtn) {
                    playBtn.textContent = '▶';
                    playBtn.title = '?ъ깮';
                }
            }
        }
    }
    
    updateTimelineUI();
    
    if (v.readyState >= 2) {
        window.canvas.renderAll();
    }
    
    window.videoRenderLoopId = requestAnimationFrame(renderVideoLoop);
}

window.loadVideoIntoCanvas = function(file) {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.src = url;
    v.preload = 'auto';
    v.loop = false; // We manage looping manually
    v.muted = true; // allow autoplay without interaction
    v.crossOrigin = "anonymous";
    v.playsInline = true;
    // DO NOT use display: 'none' as it stops frame decoding in many browsers, causing transparent render.
    // Instead, hide it visually but keep it in the rendering tree.
    v.style.position = 'absolute';
    v.style.opacity = '0.01'; // 0 or very small value
    v.style.width = '1px';
    v.style.height = '1px';
    v.style.pointerEvents = 'none';
    v.style.zIndex = '-9999';
    document.body.appendChild(v);
    
    let isLoaded = false;
    const timeoutId = setTimeout(() => {
        if (!isLoaded) {
            console.warn("Video metadata loading timed out.");
            alert("鍮꾨뵒???뚯씪 ?뺤떇??釉뚮씪?곗?媛 吏?먰븯吏 ?딄굅??濡쒕뵫???ㅽ뙣?덉뒿?덈떎.");
        }
    }, 6000);
    
    v.addEventListener('error', function(e) {
        clearTimeout(timeoutId);
        console.error("Video load error:", e, v.error);
        alert("鍮꾨뵒???뚯씪??遺덈윭?????놁뒿?덈떎. 吏?먰븯吏 ?딅뒗 ?뺤떇?닿굅???먯긽???뚯씪?????덉뒿?덈떎. (?먮윭肄붾뱶: " + (v.error ? v.error.code : '?뚯닔?놁쓬') + ")");
    });
    
    v.addEventListener('loadedmetadata', function() {
        if (isLoaded) return;
        
        const finishLoad = () => {
            isLoaded = true;
            clearTimeout(timeoutId);
            window.activeVideoElement = v;
            window.videoStartTime = 0;
            window.videoEndTime = isFinite(v.duration) && !isNaN(v.duration) ? v.duration : 1;
            
            document.getElementById('video-timeline-container').style.display = 'block';
            
            try {
                // Explicitly pass width and height as some browsers don't auto-detect them from video right away
                const vw = v.videoWidth || 800;
                const vh = v.videoHeight || 600;
                
                const img = new fabric.Image(v, {
                    left: 0,
                    top: 0,
                    width: vw,
                    height: vh,
                    originX: 'center',
                    originY: 'center',
                    objectCaching: false
                });
                
                const zoom = window.canvas.getZoom() || 1;
                const logicalW = window.canvas.width / zoom;
                const logicalH = window.canvas.height / zoom;
                
                const loadOption = document.getElementById('img-load-option') ? document.getElementById('img-load-option').value : 'fit';
                if (loadOption === 'fit' && vw > 0 && vh > 0) {
                    const scaleX = logicalW / vw;
                    const scaleY = logicalH / vh;
                    const scale = Math.min(scaleX, scaleY) * 0.8; 
                    img.scale(scale);
                } else {
                    const pct = Number(document.getElementById('img-scale-slider')?.value || 100);
                    img.scale(Math.max(0.1, Math.min(3, pct / 100)));
                }
                
                img.set({ left: logicalW / 2, top: logicalH / 2 });
                
                window.activeVideoFabricObj = img;
                window.canvas.add(img);
                window.canvas.setActiveObject(img);
                if (typeof updateScaleSliderFromObject === 'function') updateScaleSliderFromObject(img);
                
                v.play();
                if (window.videoRenderLoopId) cancelAnimationFrame(window.videoRenderLoopId);
                renderVideoLoop();
                
                if (typeof window.resetEffectEditorHistory === 'function') window.resetEffectEditorHistory();
                if (typeof window.saveEffectHistorySnapshot === 'function') window.saveEffectHistorySnapshot();
            } catch(err) {
                console.error("Fabric Image wrap error:", err);
                alert("비디오를 편집 영역에 추가하는 중 오류가 발생했습니다: " + err.message);
            }
            updateTimelineUI();
        };

        if (v.duration === Infinity || isNaN(v.duration)) {
            v.currentTime = 1e101;
            v.ontimeupdate = function() {
                v.ontimeupdate = null;
                v.currentTime = 0;
                v.addEventListener('seeked', function onSeeked() {
                    v.removeEventListener('seeked', onSeeked);
                    finishLoad();
                });
            };
        } else {
            finishLoad();
        }
    });
    
    v.load(); // Explicitly call load to trigger metadata loading
};

// Timeline UI Events
document.addEventListener('DOMContentLoaded', () => {
    const radios = document.querySelectorAll('input[name="video_sel_mode"]');
    radios.forEach(r => r.addEventListener('change', (e) => {
        window.isVideoSelectionMode = e.target.value;
        if (e.target.value === 'part' && window.activeVideoElement) {
            // default to 0 - 100% if not set
            if (window.videoEndTime === 0) window.videoEndTime = window.activeVideoElement.duration;
        }
        updateTimelineUI();
    }));

    const playPauseBtn = document.getElementById('video-play-pause-btn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            const v = window.activeVideoElement;
            if (!v) return;
            if (v.paused) {
                v.play();
                playPauseBtn.textContent = '⏸';
                playPauseBtn.title = '?쇱떆?뺤?';
            } else {
                v.pause();
                playPauseBtn.textContent = '⏸';
                playPauseBtn.title = '?ъ깮';
            }
        });
    }

    const volSlider = document.getElementById('video-volume-slider');
    const volIcon = document.getElementById('video-vol-icon');
    if (volSlider && volIcon) {
        const initV = window.activeVideoElement;
        if (initV) {
            volSlider.value = initV.muted ? 0 : initV.volume;
            volIcon.textContent = initV.muted || initV.volume === 0 ? '🔇' : '🔊';
        }
        volSlider.addEventListener('input', (e) => {
            const v = window.activeVideoElement;
            if (!v) return;
            const val = parseFloat(e.target.value);
            if (val === 0) {
                v.muted = true;
                volIcon.textContent = '🔇';
            } else {
                v.muted = false;
                v.volume = val;
                volIcon.textContent = '🔊';
            }
        });
    }

    const endBtn = document.getElementById('effect-transport-end-btn');
    if (endBtn) {
        endBtn.addEventListener('click', () => {
            const v = window.activeVideoElement;
            if (!v) return;
            v.pause();
            v.currentTime = window.isVideoSelectionMode === 'part' ? window.videoStartTime : 0;
            if (playPauseBtn) {
                playPauseBtn.textContent = '⏸';
                playPauseBtn.title = '?ъ깮';
            }
            updateTimelineUI();
        });
    }

    const track = document.getElementById('video-track-wrapper');
    const handleStart = document.getElementById('video-handle-start');
    const handleEnd = document.getElementById('video-handle-end');
    
    let draggingTarget = null;
    let wasPlayingBeforeDrag = false;
    
    if (track) {
        track.addEventListener('mousedown', (e) => {
            if (!window.activeVideoElement) return;
            wasPlayingBeforeDrag = !window.activeVideoElement.paused;
            window.activeVideoElement.pause();
            if (playPauseBtn) {
                playPauseBtn.textContent = '⏸';
                playPauseBtn.title = '?ъ깮';
            }
            
            if (e.target === handleStart) {
                draggingTarget = 'start';
            } else if (e.target === handleEnd) {
                draggingTarget = 'end';
            } else {
                // Click on track: move playhead
                const rect = track.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                window.activeVideoElement.currentTime = pct * window.activeVideoElement.duration;
                updateTimelineUI();
            }
        });
    }
    
    document.addEventListener('mousemove', (e) => {
        if (!draggingTarget || !window.activeVideoElement || !track) return;
        const rect = track.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = pct * window.activeVideoElement.duration;
        
        if (draggingTarget === 'start') {
            window.videoStartTime = Math.min(newTime, window.videoEndTime - 0.1);
            window.activeVideoElement.currentTime = window.videoStartTime;
        } else if (draggingTarget === 'end') {
            window.videoEndTime = Math.max(newTime, window.videoStartTime + 0.1);
            window.activeVideoElement.currentTime = window.videoEndTime;
        }
        updateTimelineUI();
    });
    
    document.addEventListener('mouseup', () => {
        if (draggingTarget && window.activeVideoElement && wasPlayingBeforeDrag) {
            window.activeVideoElement.play();
            if (playPauseBtn) {
                playPauseBtn.textContent = '⏸';
                playPauseBtn.title = '?쇱떆?뺤?';
            }
        }
        draggingTarget = null;
    });

    // Handle video object deletion from canvas
    // Wait slightly to ensure core.js has created window.canvas
    setTimeout(() => {
        if (window.canvas) {
            window.canvas.on('object:removed', (e) => {
                const obj = e.target;
                if (obj && obj.type === 'image' && obj.getElement) {
                    const el = obj.getElement();
                    if (el instanceof HTMLVideoElement && el === window.activeVideoElement) {
                        el.pause();
                        el.removeAttribute('src'); // Stop fetching
                        el.load(); // Force unload
                        window.activeVideoElement = null;
                        window.activeVideoFabricObj = null;
                        const tc = document.getElementById('video-timeline-container');
                        if (tc) tc.style.display = 'none';
                    }
                }
            });
        }
    }, 100);
});



