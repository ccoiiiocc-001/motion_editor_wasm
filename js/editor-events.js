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

function drawCheckerboard(canvasEl) { if (!canvasEl) return; const ctx = canvasEl.getContext('2d'); const w = canvasEl.width; const h = canvasEl.height; ctx.clearRect(0, 0, w, h); const size = 5; for (let y = 0; y < h; y += size) { for (let x = 0; x < w; x += size) { ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#e2e8f0' : '#cbd5e1'; ctx.fillRect(x, y, size, size); } } }
function updateBrushIndicator() { if (!brushIndicator) return; const size = Math.max(4, Math.min(currentDrawWidth, 50)); brushIndicator.style.width = size + 'px'; brushIndicator.style.height = size + 'px'; let op = currentDrawOpacity; let rgbStr = hexToRgb(currentDrawColor); brushIndicator.style.backgroundColor = rgbStr.replace('rgb(', 'rgba(').replace(')', `,${op})`); }
function initPickers() {
    if (!colorPickerCanvas) return;
    const cCtx = colorPickerCanvas.getContext('2d', { willReadFrequently: true });
    let grd = cCtx.createLinearGradient(0, 0, colorPickerCanvas.width, 0);
    grd.addColorStop(0, "#ff0000"); grd.addColorStop(0.17, "#ffff00"); grd.addColorStop(0.33, "#00ff00"); grd.addColorStop(0.5, "#00ffff"); grd.addColorStop(0.67, "#0000ff"); grd.addColorStop(0.83, "#ff00ff"); grd.addColorStop(1, "#ff0000");
    cCtx.fillStyle = grd; cCtx.fillRect(0, 0, colorPickerCanvas.width, colorPickerCanvas.height);
    let grd2 = cCtx.createLinearGradient(0, 0, 0, colorPickerCanvas.height);
    grd2.addColorStop(0, "rgba(255,255,255,1)"); grd2.addColorStop(0.5, "rgba(255,255,255,0)"); grd2.addColorStop(0.5, "rgba(0,0,0,0)"); grd2.addColorStop(1, "rgba(0,0,0,1)");
    cCtx.fillStyle = grd2; cCtx.fillRect(0, 0, colorPickerCanvas.width, colorPickerCanvas.height);
    drawCheckerboard(opacityPickerCanvas); updateDynamicPickers(); updateBrushIndicator();
}
function updateDynamicPickers() {
    if (!opacityPickerCanvas) return;
    const oCtx = opacityPickerCanvas.getContext('2d');
    drawCheckerboard(opacityPickerCanvas);
    let oGrd = oCtx.createLinearGradient(0, 0, opacityPickerCanvas.width, 0);
    const rgb = hexToRgb(currentDrawColor).match(/\d+/g).join(',');
    oGrd.addColorStop(0, `rgba(${rgb},0)`); oGrd.addColorStop(1, `rgba(${rgb},1)`);
    oCtx.fillStyle = oGrd; oCtx.fillRect(0, 0, opacityPickerCanvas.width, opacityPickerCanvas.height);
    if (!widthPickerCanvas) return;
    const wCtx = widthPickerCanvas.getContext('2d');
    wCtx.clearRect(0, 0, widthPickerCanvas.width, widthPickerCanvas.height);
    wCtx.fillStyle = currentDrawColor; wCtx.beginPath(); wCtx.moveTo(0, widthPickerCanvas.height / 2); wCtx.lineTo(widthPickerCanvas.width, 0); wCtx.lineTo(widthPickerCanvas.width, widthPickerCanvas.height); wCtx.fill();
}
if (colorPickerCanvas) { colorPickerCanvas.onmousedown = colorPickerCanvas.onmousemove = (e) => { if (e.buttons !== 1) return; const rect = colorPickerCanvas.getBoundingClientRect(); const x = Math.max(0, Math.min(e.clientX - rect.left, colorPickerCanvas.width - 1)); const y = Math.max(0, Math.min(e.clientY - rect.top, colorPickerCanvas.height - 1)); const p = colorPickerCanvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data; currentDrawColor = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join(''); updateDynamicPickers(); updateBrushIndicator(); }; }
if (opacityPickerCanvas) { opacityPickerCanvas.onmousedown = opacityPickerCanvas.onmousemove = (e) => { if (e.buttons !== 1) return; const rect = opacityPickerCanvas.getBoundingClientRect(); currentDrawOpacity = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1)); updateBrushIndicator(); }; }
if (widthPickerCanvas) { widthPickerCanvas.onmousedown = widthPickerCanvas.onmousemove = (e) => { if (e.buttons !== 1) return; const rect = widthPickerCanvas.getBoundingClientRect(); currentDrawWidth = 1 + (Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1)) * 49); updateDynamicPickers(); updateBrushIndicator(); }; }
if (stampTabs) { stampTabs.forEach(btn => { btn.onclick = () => { stampTabs.forEach(b => b.classList.remove('active')); btn.classList.add('active'); stampPages.forEach(p => p.style.display = 'none'); const page = document.getElementById('stampPage' + btn.dataset.page); if (page) page.style.display = 'grid'; }; }); }
if (stampBtns) { stampBtns.forEach(btn => { btn.onclick = () => { penTypeBtns.forEach(b => b.classList.remove('active')); stampBtns.forEach(b => b.classList.remove('active')); if (mouseEffectSelect) mouseEffectSelect.selectedIndex = -1; btn.classList.add('active'); currentDrawType = 'stamp'; currentStamp = btn.dataset.stamp; }; }); }
if (penTypeBtns) { penTypeBtns.forEach(btn => { btn.onclick = () => { penTypeBtns.forEach(b => b.classList.remove('active')); stampBtns.forEach(b => b.classList.remove('active')); if (mouseEffectSelect) mouseEffectSelect.selectedIndex = -1; btn.classList.add('active'); currentDrawType = btn.dataset.type; }; }); }
if (mouseEffectSelect) { mouseEffectSelect.onchange = () => { if (mouseEffectSelect.value !== 'none') { penTypeBtns.forEach(b => b.classList.remove('active')); stampBtns.forEach(b => b.classList.remove('active')); currentDrawType = 'mouseEffect'; } }; }
// Emoji effect grid button handlers
const effBtns = document.querySelectorAll('.eff-btn');
const effSelectedLabel = document.getElementById('effSelectedLabel');
effBtns.forEach(btn => {
    btn.onclick = () => {
        const eff = btn.dataset.eff;
        const isAlreadySelected = btn.classList.contains('eff-active');
        // Deselect all
        effBtns.forEach(b => { b.classList.remove('eff-active'); b.style.background = '#f8fafc'; b.style.outline = 'none'; });
        if (isAlreadySelected) {
            // Toggle off
            if (mouseEffectSelect) { mouseEffectSelect.value = ''; mouseEffectSelect.selectedIndex = -1; }
            if (effSelectedLabel) effSelectedLabel.textContent = '선택 없음';
            currentDrawType = 'none';
        } else {
            // Select this one
            btn.classList.add('eff-active');
            btn.style.background = '#dbeafe';
            btn.style.outline = '2px solid #2563eb';
            if (mouseEffectSelect) { mouseEffectSelect.value = eff; mouseEffectSelect.dispatchEvent(new Event('change')); }
            if (effSelectedLabel) effSelectedLabel.textContent = btn.title + ' 선택됨';
            penTypeBtns.forEach(b => b.classList.remove('active'));
            stampBtns.forEach(b => b.classList.remove('active'));
            currentDrawType = 'mouseEffect';
        }
    };
});
if (customStampBtn) { customStampBtn.onclick = () => customStampInput.click(); }
if (customStampInput) { customStampInput.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => { if (customStampImg?._stampBlobUrl) window.MediaDispose?.revokeBlobUrlIfUnused?.(customStampImg._stampBlobUrl); const url = img.src; if (url) img._stampBlobUrl = url; customStampImg = img; penTypeBtns.forEach(b => b.classList.remove('active')); stampBtns.forEach(b => b.classList.remove('active')); if (mouseEffectSelect) mouseEffectSelect.selectedIndex = -1; currentDrawType = 'imageStamp'; window.showToast('이미지 도장 장착 완료!'); }; img.src = URL.createObjectURL(f); }; }
let currentParticleVal = 'snow';
let waveAudioContext = null;
let waveAnalyser = null;
let waveAudioEl = null;
let waveAudioSource = null;
let waveFileName = '';
let waveDataArray = null;
let waveIsPlaying = false;
function syncParticleUI() {
    if (!particleItemSelect) return;
    const val = currentParticleVal; const s = pState[val];
    if (pAmt) pAmt.value = s.amt; 
    if (pSz) pSz.value = s.sz; 
    if (pSpd) pSpd.value = s.spd; 
    if (pWnd) pWnd.value = s.wnd;
    if (pOpac) pOpac.value = s.opac !== undefined ? s.opac : 80;
    if (pBlur) pBlur.value = s.blur !== undefined ? s.blur : 0;
    if (pUseCol) pUseCol.checked = s.useCol !== undefined ? s.useCol : false;
    if (pColVal) pColVal.value = s.colVal || '#ffffff';
    if (typeof syncParticleCheckboxes === 'function') {
        syncParticleCheckboxes();
    }
}
function saveParticleStateToStorage() {
    const storageState = {};
    Object.keys(pState).forEach(k => {
        storageState[k] = {
            amt: pState[k].amt,
            sz: pState[k].sz,
            spd: pState[k].spd,
            wnd: pState[k].wnd,
            opac: pState[k].opac,
            blur: pState[k].blur,
            useCol: pState[k].useCol,
            colVal: pState[k].colVal,
            up: pState[k].up,
            down: pState[k].down,
            grow: pState[k].grow
        };
    });
    localStorage.setItem('motion_editor_particle_state_v3', JSON.stringify(storageState));
}
function saveParticleUI() {
    const val = currentParticleVal;
    if (pAmt) pState[val].amt = parseInt(pAmt.value) || 5;
    if (pSz) pState[val].sz = parseInt(pSz.value) || 15;
    if (pSpd) pState[val].spd = parseInt(pSpd.value) || 30;
    if (pWnd) pState[val].wnd = parseInt(pWnd.value) || 20;
    if (pOpac) pState[val].opac = pOpac.value !== "" ? parseInt(pOpac.value) : 80;
    if (pBlur) pState[val].blur = pBlur.value !== "" ? parseInt(pBlur.value) : 0;
    if (pUseCol) pState[val].useCol = pUseCol.checked;
    if (pColVal) pState[val].colVal = pColVal.value || '#ffffff';
    saveParticleStateToStorage();
}
window.currentIsIntermittent = false;

// Particle grid buttons
const pGridBtns = document.querySelectorAll('.p-grid-btn');
const pCtrlUp   = document.getElementById('pCtrlUp');
const pCtrlDown = document.getElementById('pCtrlDown');
const pCtrlGrow = document.getElementById('pCtrlGrow');
const pCtrlOff  = document.getElementById('pCtrlOff');
const pSelLabel = document.getElementById('particleSelectedLabel');

const pTitles = { snow:'❄ 눈송이', rain:'🌧 비', petal:'🌸 벚꽃잎', bubble:'🫧 비눗방울',
    heart:'💖 하트', star:'⭐ 별', music:'🎵 음표', confetti:'🎉 색종이',
    flower:'✿ 꽃', spark:'✨ 불꽃', fog:'🌫️ 안개', steam:'☁️ 수증기' };

function syncParticleCheckboxes() {
    const s = pState[currentParticleVal];
    if (!s) return;
    if (pCtrlUp)   { pCtrlUp.checked = s.up;  pCtrlUp.disabled = (currentParticleVal === 'snow' || currentParticleVal === 'rain'); }
    if (pCtrlDown) pCtrlDown.checked = s.down;
    if (pCtrlGrow) pCtrlGrow.checked = s.grow || false;
    if (pCtrlOff)  pCtrlOff.checked  = !(s.up || s.down);
    if (pSelLabel) pSelLabel.textContent = (pTitles[currentParticleVal] || currentParticleVal) + ' 선택됨';
}

pGridBtns.forEach(btn => {
    btn.onclick = () => {
        pGridBtns.forEach(b => { b.style.background = '#f8fafc'; b.style.outline = 'none'; });
        btn.style.background = '#dbeafe';
        btn.style.outline = '2px solid #2563eb';
        currentParticleVal = btn.dataset.val;
        if (particleItemSelect) particleItemSelect.value = currentParticleVal;
        syncParticleUI();
        syncParticleCheckboxes();
    };
});

const handleCheckboxChange = (e) => {
    const val = currentParticleVal;
    if (!pState[val]) return;
    const clickedOff = (e.target === pCtrlOff);
    if (clickedOff && pCtrlOff.checked) {
        // X를 직접 체크 → 나머지 끄기
        if (pCtrlUp)   pCtrlUp.checked   = false;
        if (pCtrlDown) pCtrlDown.checked = false;
        if (pCtrlGrow) pCtrlGrow.checked = false;
    } else if (!clickedOff) {
        // 동작 체크박스 클릭 → X 해제
        if (pCtrlOff && (pCtrlUp?.checked || pCtrlDown?.checked))
            pCtrlOff.checked = false;
    }
    pState[val].up   = pCtrlUp   ? pCtrlUp.checked   : false;
    pState[val].down = pCtrlDown ? pCtrlDown.checked : false;
    pState[val].grow = pCtrlGrow ? pCtrlGrow.checked : false;
    let anyOn = false;
    Object.values(pState).forEach(st => { if (st.up || st.down) anyOn = true; });
    fsFadingOut = !anyOn;
    syncParticleUI();
    saveParticleStateToStorage();
};
[pCtrlUp, pCtrlDown, pCtrlGrow, pCtrlOff].forEach(chk => { if (chk) chk.onchange = handleCheckboxChange; });


// Init: select first button
if (pGridBtns.length > 0) { pGridBtns[0].style.background = '#dbeafe'; pGridBtns[0].style.outline = '2px solid #2563eb'; }
syncParticleCheckboxes();



[pAmt, pSz, pSpd, pWnd, pOpac, pBlur, pColVal].forEach(el => { if (el) el.oninput = saveParticleUI; });
[pUseCol].forEach(el => { if (el) el.onchange = saveParticleUI; });
window.resetAllEffects = function () { if (colorFilterToggle) colorFilterToggle.checked = false; if (mouseEffectSelect) mouseEffectSelect.selectedIndex = -1; document.querySelectorAll('.eff-btn').forEach(b => { b.classList.remove('eff-active'); b.style.background = '#f8fafc'; b.style.outline = 'none'; }); const lbl = document.getElementById('effSelectedLabel'); if (lbl) lbl.textContent = '선택 없음'; fsParticles = []; fsFadingOut = false; currentDrawType = 'none'; penTypeBtns.forEach(b => b.classList.remove('active')); stampBtns.forEach(b => b.classList.remove('active')); Object.keys(pState).forEach(k => { pState[k].up = false; pState[k].down = false; pState[k].grow = false; }); syncParticleUI(); saveParticleStateToStorage(); };
function createP(type, dir, state) {
    const size = state.sz * (0.5 + Math.random());
    const speed = (state.spd / 30) * (5 + Math.random() * 2);
    const wind = state.wnd;
    const minAmp = size * 0.5;
    const maxAmp = (popupRawCanvas ? popupRawCanvas.width : 800) / 2;
    const amp = minAmp + (wind / 100) * (maxAmp - minAmp);
    
    let p = {
        dir: dir,
        type: type,
        size: dir === 'up' ? size * 0.3 : size,
        maxSize: size,
        x: Math.random() * (popupRawCanvas ? popupRawCanvas.width : 800),
        y: dir === 'down' ? -50 : (popupRawCanvas ? popupRawCanvas.height : 450) + 50,
        baseX: 0,
        vx: 0,
        vy: dir === 'down' ? speed : speed * 0.8,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
        time: Math.random() * 1000,
        oscSpeed: 0.02 + Math.random() * 0.03,
        windAmp: (Math.random() > 0.5 ? 1 : -1) * amp,
        hue: Math.random() * 360,
        color: (state.useCol && state.colVal) ? state.colVal : null,
        baseAlpha: ((state.opac !== undefined ? state.opac : 80) / 100) * (0.8 + Math.random() * 0.2),
        blur: state.blur !== undefined ? state.blur : 0,
        grow: state.grow
    };
    p.baseX = p.x;

    if (type === 'rain') {
        p.spin = 0;
        p.vy = (state.spd / 30) * (15 + Math.random() * 4);
        p.vx = (state.spd / 30) * ((wind - 20) / 100) * 6; // wind offset relative to default 20
        p.angle = Math.atan2(p.vx, p.vy);
        p.x = Math.random() * ((popupRawCanvas ? popupRawCanvas.width : 800) + 200) - 100;
        p.baseX = p.x;
    }
    return p;
}
function applyPreviewInfo() { if (!previewDurationInfo) return; const speed = parseFloat(previewSpeedSlider.value); const adjDur = window.rawClipDuration / speed; let loops = 1; if (adjDur < 5) { loops = Math.ceil(5 / adjDur); } window.previewDuration = adjDur * loops; window.previewLoop = (loops > 1); previewDurationInfo.textContent = `최종 저장 길이: ${window.previewDuration.toFixed(1)}초 (원본: ${window.rawClipDuration.toFixed(1)}초 / 속도: ${speed}x / 반복: ${loops}회)`; if (previewVideoEl) previewVideoEl.playbackRate = speed; }
function renderPopupLoop() {
    if (!popupRawCanvas || !drawModal || drawModal.style.display === 'none') return;
    const w = popupRawCanvas.width; const h = popupRawCanvas.height;
    popupCtx.clearRect(0, 0, w, h);
    popupCtx.drawImage(bgCanvas, 0, 0);
    if (colorFilterToggle && colorFilterToggle.checked) {
        let alpha = currentDrawOpacity; let fillStyle = 'rgba(0,0,0,0)';
        if (colorFilterMode.value === 'manual') { let rgbStr = hexToRgb(currentDrawColor); fillStyle = rgbStr.replace('rgb(', 'rgba(').replace(')', `,${alpha})`); }
        else if (colorFilterMode.value === 'sweep') { let cycle = parseFloat(filterSweepTime.value) * 1000; let hue = ((Date.now() % cycle) / cycle) * 360; fillStyle = `hsla(${hue},100%,50%,${alpha})`; }
        else if (colorFilterMode.value === 'random') { if (!window.lastRandTime || Date.now() - window.lastRandTime > 300) { window.lastRandHue = Math.random() * 360; window.lastRandAlpha = Math.random(); window.lastRandTime = Date.now(); } fillStyle = `hsla(${window.lastRandHue},100%,50%,${window.lastRandAlpha})`; }
        popupCtx.globalAlpha = 1.0; popupCtx.fillStyle = fillStyle; popupCtx.fillRect(0, 0, w, h);
    }

    if (waveModeSelect && waveModeSelect.value !== 'none') {
        const waveCountEl = document.getElementById('waveCount');
        const count = waveCountEl ? parseInt(waveCountEl.value) : 128;
        let isAudio = (waveModeSelect.value === 'audio');
        let shape = waveShapeSelect ? waveShapeSelect.value : 'bar';
        let colorMode = waveColorSelect ? waveColorSelect.value : 'brush';
        let freqData = null;
        if (isAudio && waveAnalyser && waveIsPlaying) {
            waveAnalyser.getByteFrequencyData(waveDataArray);
            freqData = waveDataArray;
        } else if (isAudio) {
            // Audio mode, but paused/stopped. Hide waveform entirely.
            freqData = null; // don't draw anything before playback starts
        } else {
            const len = count;
            freqData = new Uint8Array(len);
            const speed = typeof waveSpeed !== 'undefined' && waveSpeed ? parseFloat(waveSpeed.value) : 1.0;
            const t = (Date.now() / 300) * speed;
            // Initialize persistent noise targets for organic irregular look
            if (!window._barNoise || window._barNoise.length !== len) {
                window._barNoise = Array.from({ length: len }, () => Math.random());
                window._barTarget = Array.from({ length: len }, () => Math.random());
                window._barPhase = Array.from({ length: len }, () => Math.random() * Math.PI * 2);
            }
            for (let i = 0; i < len; i++) {
                // Each bar drifts toward a random target at different speeds
                window._barNoise[i] += (window._barTarget[i] - window._barNoise[i]) * (0.01 + Math.random() * 0.04);
                if (Math.abs(window._barNoise[i] - window._barTarget[i]) < 0.05) {
                    window._barTarget[i] = 0.1 + Math.random() * 0.9;
                }
                window._barPhase[i] += (0.005 + (i % 7) * 0.002) * speed;
                if (shape === 'line' || shape === 'wave') {
                    freqData[i] = 128 + Math.sin(t + i * 0.15 + window._barPhase[i]) * 45 + (window._barNoise[i] - 0.5) * 30;
                } else {
                    // Bar: each bar has its own slow oscillation + random drift → very irregular
                    let base = window._barNoise[i];
                    let osc = Math.sin(t * (0.5 + (i % 5) * 0.3) + window._barPhase[i]) * 0.35;
                    freqData[i] = Math.max(5, Math.min(255, (base + osc) * 220));
                }
            }
        }
        if (freqData) drawWaveform(popupCtx, freqData, shape, colorMode, w, h);
    }

    trailCtx.globalCompositeOperation = 'destination-out'; trailCtx.fillStyle = 'rgba(0,0,0,0.1)'; trailCtx.fillRect(0, 0, w, h); trailCtx.globalCompositeOperation = 'source-over';
    if (fsFadingOut) { fsFadeAlpha -= 0.05; if (fsFadeAlpha <= 0) { fsParticles = []; fsFadingOut = false; fsFadeAlpha = 1.0; } }
    if (!fsFadingOut) {
        Object.keys(pState).forEach(type => {
            const state = pState[type];
            const fpsBaseline = 30.3; // 1000 / 33 ms per frame
            
            if (state.down && state.amt > 0) {
                let expected = state.amt / fpsBaseline;
                let countToSpawn = Math.floor(expected);
                if (Math.random() < (expected % 1)) countToSpawn++;
                for (let i = 0; i < countToSpawn; i++) {
                    fsParticles.push(createP(type, 'down', state));
                }
            }
            if (state.up && state.amt > 0) {
                let expected = state.amt / fpsBaseline;
                let countToSpawn = Math.floor(expected);
                if (Math.random() < (expected % 1)) countToSpawn++;
                for (let i = 0; i < countToSpawn; i++) {
                    fsParticles.push(createP(type, 'up', state));
                }
            }
        });
    }
    for (let i = fsParticles.length - 1; i >= 0; i--) {
        let p = fsParticles[i]; p.time += 1; p.angle += p.spin;
        if (p.dir === 'free') {
            // Free-flying particle: moves with vx/vy, gravity pulls down, fades by life
            p.life = (p.life || 0) + 1;
            p.x += p.vx;
            p.y += p.vy;
            
            // Apply customizable gravity and drag
            let gravityVal = p.gravity !== undefined ? p.gravity : 0.1;
            p.vy += gravityVal;
            
            let dragFactor = p.drag !== undefined ? p.drag : 0.97;
            p.vx *= dragFactor;
            p.vy *= dragFactor;
            
            if (p.type === 'rain') {
                p.angle = Math.atan2(p.vx, p.vy);
            }
            
            let lifeRatio = p.life / (p.maxLife || 40);
            // Grow size over lifetime (start at 20%, grow to 100%)
            p.size = (p.maxSize || 15) * (0.2 + 0.8 * lifeRatio);
            
            p.baseAlpha = Math.max(0, 1 - lifeRatio * lifeRatio);
            if (p.life >= (p.maxLife || 40) || p.baseAlpha <= 0) {
                fsParticles.splice(i, 1);
            } else {
                drawFSParticle(popupCtx, p);
            }
        } else {
            if (p.type === 'rain') {
                p.x += p.vx;
            } else {
                p.x = p.baseX + Math.sin(p.time * p.oscSpeed) * p.windAmp;
            }
            if (p.grow) { p.size += 0.2; if (p.size > p.maxSize * 2) p.size = p.maxSize * 2; }
            if (p.dir === 'down') { p.y += p.vy; if (p.y > h + p.size) { fsParticles.splice(i, 1); } else { drawFSParticle(popupCtx, p); } }
            else { p.y -= p.vy; if (p.y < -50) { fsParticles.splice(i, 1); } else { drawFSParticle(popupCtx, p); } }
        }
    }
    popupCtx.drawImage(trailCanvas, 0, 0);
    if (popupRecorder && popupRecorder.state === 'recording') { let curSec = (popupActiveTime + (performance.now() - popupLastResumeTime)) / 1000; if (popupRecordTimer) { popupRecordTimer.textContent = curSec.toFixed(1) + '초'; popupRecordTimer.style.display = 'block'; } } else if (popupRecorder && popupRecorder.state === 'paused') { let curSec = popupActiveTime / 1000; if (popupRecordTimer) { popupRecordTimer.textContent = curSec.toFixed(1) + '초'; popupRecordTimer.style.display = 'block'; } } else { if (popupRecordTimer) popupRecordTimer.style.display = 'none'; }
}
function drawFSParticle(ctx, p) {
    const getTranslucentColor = (c, op) => {
        if (!c) return 'rgba(255,255,255,0.2)';
        if (c.startsWith('#')) {
            let hex = c.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(s => s + s).join('');
            let r = parseInt(hex.substring(0, 2), 16);
            let g = parseInt(hex.substring(2, 4), 16);
            let b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r},${g},${b},${op})`;
        }
        if (c.startsWith('rgb')) return c.replace('rgb(', 'rgba(').replace(')', `,${op})`);
        return c;
    };
    ctx.save();
    if (p.blur && p.blur > 0) {
        ctx.filter = `blur(${p.blur}px)`;
    }
    ctx.globalAlpha = fsFadeAlpha * (p.baseAlpha || 1); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    let col = p.color || ((p.type === 'snow' || p.type === 'rain') ? (p.type === 'snow' ? 'white' : 'rgba(200,200,255,0.7)') : `hsl(${p.hue},100%,60%)`);
    if (p.type === 'snow') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    else if (p.type === 'rain') { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, p.size / 4, p.size * 1.2, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (p.type === 'bubble') { ctx.strokeStyle = col; ctx.lineWidth = p.size * 0.1; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = p.color ? getTranslucentColor(p.color, 0.2) : `hsla(${p.hue},100%,60%,0.2)`; ctx.fill(); }
    else if (p.type === 'heart') { ctx.fillStyle = col; ctx.font = `${p.size * 2}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♥', 0, 0); }
    else if (p.type === 'star') { ctx.fillStyle = col; ctx.font = `${p.size * 2}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 0, 0); }
    else if (p.type === 'music') { ctx.fillStyle = col; ctx.font = `${p.size * 2}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.time % 2 > 1 ? '♫' : '♪', 0, 0); }
    else if (p.type === 'confetti') { ctx.fillStyle = col; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); }
    else if (p.type === 'flower') { ctx.fillStyle = col; ctx.font = `${p.size * 2}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✿', 0, 0); }
    else if (p.type === 'spark') { ctx.fillStyle = col; ctx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 2); }
    else if (p.type === 'fog') { ctx.fillStyle = p.color ? getTranslucentColor(p.color, 0.1) : `hsla(${p.hue},100%,60%,0.1)`; ctx.beginPath(); ctx.arc(0, 0, p.size * 3, 0, Math.PI * 2); ctx.fill(); }
    else if (p.type === 'steam') { ctx.fillStyle = p.color ? getTranslucentColor(p.color, 0.15) : `hsla(${p.hue},100%,60%,0.15)`; ctx.beginPath(); ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2); ctx.fill(); }
    else if (p.type === 'petal') { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
}
if (drawBtn) {
    drawBtn.onclick = () => {
        if (drawModal) drawModal.style.display = 'flex';
        const waveIncludeAudioCheck = document.getElementById('waveIncludeAudioCheck');
        if (waveIncludeAudioCheck) waveIncludeAudioCheck.checked = false;
        if (popupRawCanvas) {
            popupCtx = popupRawCanvas.getContext('2d', { willReadFrequently: true });
            const w = canvas.getWidth(); const h = canvas.getHeight();
            popupRawCanvas.width = bgCanvas.width = trailCanvas.width = w;
            popupRawCanvas.height = bgCanvas.height = trailCanvas.height = h;
            const mainW = canvas.lowerCanvasEl ? canvas.lowerCanvasEl.style.width : (w + 'px');
            const mainH = canvas.lowerCanvasEl ? canvas.lowerCanvasEl.style.height : (h + 'px');
            popupRawCanvas.style.width = mainW;
            popupRawCanvas.style.height = mainH;
            try { popupRawCanvas.style.backgroundImage = `url(${canvas.toDataURL({ format: 'png' })})`; popupRawCanvas.style.backgroundSize = '100% 100%'; } catch (err) { console.warn('Canvas capture error'); }
            bgCtx.clearRect(0, 0, w, h); trailCtx.clearRect(0, 0, w, h); fsParticles = [];
            if (drawHistory.length === 0) { setTimeout(() => { drawHistory.push(bgCtx.getImageData(0, 0, w, h)); }, 100); }
        }
        if (popupRecordContBtn) popupRecordContBtn.style.display = 'block'; if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'block'; if (popupStopBtn) popupStopBtn.style.display = 'none'; if (popupRecordTimer) popupRecordTimer.style.display = 'none';
        clearInterval(popupInterval); popupInterval = setInterval(renderPopupLoop, 33); syncParticleUI(); window.setRecordMode(false);
    };
}
function handleDrawStart(e, isTouch) {
    if (popupRecorder && popupRecorder.state === 'paused' && window.currentIsIntermittent) { popupLastResumeTime = performance.now(); popupRecorder.resume(); }
    e.preventDefault(); isPopupDrawing = true;
    const rect = popupRawCanvas.getBoundingClientRect(); const scaleX = popupRawCanvas.width / rect.width; const scaleY = popupRawCanvas.height / rect.height;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX; const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    popupLastX = (clientX - rect.left) * scaleX; popupLastY = (clientY - rect.top) * scaleY;
    if (currentDrawType === 'stamp') {
        let rgbStr = hexToRgb(currentDrawColor); let rgbaStr = rgbStr.replace('rgb(', 'rgba(').replace(')', `,${currentDrawOpacity})`);
        bgCtx.globalAlpha = currentDrawOpacity; bgCtx.fillStyle = rgbaStr; bgCtx.font = `${currentDrawWidth * 4}px Arial`; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle'; bgCtx.fillText(currentStamp, popupLastX, popupLastY); bgCtx.globalAlpha = 1;
    } else if (currentDrawType === 'imageStamp' && customStampImg) {
        const size = currentDrawWidth * 5; bgCtx.globalAlpha = currentDrawOpacity; bgCtx.drawImage(customStampImg, popupLastX - size / 2, popupLastY - (size * (customStampImg.height / customStampImg.width)) / 2, size, size * (customStampImg.height / customStampImg.width)); bgCtx.globalAlpha = 1;
    } else if (currentDrawType !== 'mouseEffect') { bgCtx.beginPath(); bgCtx.moveTo(popupLastX, popupLastY); }
}
function handleDrawMove(e, isTouch) {
    if (!isPopupDrawing) return;
    e.preventDefault();
    const rect = popupRawCanvas.getBoundingClientRect(); const scaleX = popupRawCanvas.width / rect.width; const scaleY = popupRawCanvas.height / rect.height;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX; const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX; const y = (clientY - rect.top) * scaleY;
    let ctxToUse = (currentDrawType === 'mouseEffect') ? trailCtx : bgCtx;
    if (currentDrawType === 'eraser') {
        bgCtx.globalCompositeOperation = 'destination-out'; bgCtx.lineWidth = currentDrawWidth * 2; bgCtx.lineCap = 'round'; bgCtx.lineJoin = 'round'; bgCtx.lineTo(x, y); bgCtx.stroke(); bgCtx.globalCompositeOperation = 'source-over';
    } else if (currentDrawType === 'stamp') {
        const dist = Math.hypot(x - popupLastX, y - popupLastY);
        if (dist > currentDrawWidth * 2) { let rgbStr = hexToRgb(currentDrawColor); let rgbaStr = rgbStr.replace('rgb(', 'rgba(').replace(')', `,${currentDrawOpacity})`); bgCtx.globalAlpha = currentDrawOpacity; bgCtx.fillStyle = rgbaStr; bgCtx.font = `${currentDrawWidth * 4}px Arial`; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle'; bgCtx.fillText(currentStamp, x, y); bgCtx.globalAlpha = 1; popupLastX = x; popupLastY = y; }
    } else if (currentDrawType === 'imageStamp' && customStampImg) {
        const dist = Math.hypot(x - popupLastX, y - popupLastY);
        if (dist > currentDrawWidth * 2) { const size = currentDrawWidth * 5; bgCtx.globalAlpha = currentDrawOpacity; bgCtx.drawImage(customStampImg, x - size / 2, y - (size * (customStampImg.height / customStampImg.width)) / 2, size, size * (customStampImg.height / customStampImg.width)); bgCtx.globalAlpha = 1; popupLastX = x; popupLastY = y; }
    } else if (currentDrawType === 'mouseEffect') {
        let eff = mouseEffectSelect ? mouseEffectSelect.value : 'none'; let rgbStr = hexToRgb(currentDrawColor); let rgbaStr = rgbStr.replace('rgb(', 'rgba(').replace(')', `,${currentDrawOpacity})`);
        ctxToUse.fillStyle = rgbaStr; ctxToUse.strokeStyle = rgbaStr;
        if (eff === 'sparkle') { if (Math.random() > 0.5) { const size = Math.random() * currentDrawWidth; const px = x + (Math.random() - 0.5) * currentDrawWidth * 3; const py = y + (Math.random() - 0.5) * currentDrawWidth * 3; ctxToUse.beginPath(); ctxToUse.moveTo(px, py - size); ctxToUse.lineTo(px + size * 0.3, py - size * 0.3); ctxToUse.lineTo(px + size, py); ctxToUse.lineTo(px + size * 0.3, py + size * 0.3); ctxToUse.lineTo(px, py + size); ctxToUse.lineTo(px - size * 0.3, py + size * 0.3); ctxToUse.lineTo(px - size, py); ctxToUse.lineTo(px - size * 0.3, py - size * 0.3); ctxToUse.fill(); } }
        else if (eff === 'bubble') { if (Math.random() > 0.5) { ctxToUse.lineWidth = Math.max(1, currentDrawWidth * 0.1); ctxToUse.beginPath(); ctxToUse.arc(x + (Math.random() - 0.5) * currentDrawWidth * 4, y + (Math.random() - 0.5) * currentDrawWidth * 4, Math.random() * currentDrawWidth, 0, Math.PI * 2); ctxToUse.stroke(); } }
        else if (eff === 'spray') { for (let i = 0; i < 5; i++) { const ang = Math.random() * Math.PI * 2; const r = Math.random() * currentDrawWidth * 2; ctxToUse.beginPath(); ctxToUse.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, Math.random() * 2, 0, Math.PI * 2); ctxToUse.fill(); } }
        else if (eff === 'hearts') { if (Math.random() > 0.5) { ctxToUse.font = `${Math.max(10, Math.random() * currentDrawWidth * 3)}px Arial`; ctxToUse.fillText('♥', x + (Math.random() - 0.5) * currentDrawWidth * 4, y + (Math.random() - 0.5) * currentDrawWidth * 4); } }
        else if (eff === 'fireworks') { if (Math.random() > 0.7) { ctxToUse.lineWidth = Math.max(1, currentDrawWidth * 0.2); for (let i = 0; i < 6; i++) { const ang = (Math.PI * 2 / 6) * i + Math.random(); const r = currentDrawWidth * (1 + Math.random()); ctxToUse.beginPath(); ctxToUse.moveTo(x, y); ctxToUse.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); ctxToUse.stroke(); } } }
        else if (eff === 'neon') { ctxToUse.lineWidth = currentDrawWidth; ctxToUse.shadowBlur = currentDrawWidth * 2; ctxToUse.shadowColor = rgbaStr; ctxToUse.lineCap = 'round'; ctxToUse.lineJoin = 'round'; ctxToUse.beginPath(); ctxToUse.moveTo(popupLastX, popupLastY); ctxToUse.lineTo(x, y); ctxToUse.stroke(); ctxToUse.shadowBlur = 0; }
        else if (eff === 'rainbow') { ctxToUse.strokeStyle = `hsl(${(Date.now() / 10) % 360},100%,50%)`; ctxToUse.lineWidth = currentDrawWidth; ctxToUse.lineCap = 'round'; ctxToUse.beginPath(); ctxToUse.moveTo(popupLastX, popupLastY); ctxToUse.lineTo(x, y); ctxToUse.stroke(); }
        else if (eff === 'ribbon') { ctxToUse.lineWidth = Math.max(1, currentDrawWidth / 3); const ang = Math.atan2(y - popupLastY, x - popupLastX) + Math.PI / 2; const off = currentDrawWidth; ctxToUse.beginPath(); ctxToUse.moveTo(popupLastX + Math.cos(ang) * off, popupLastY + Math.sin(ang) * off); ctxToUse.lineTo(x + Math.cos(ang) * off, y + Math.sin(ang) * off); ctxToUse.moveTo(popupLastX, popupLastY); ctxToUse.lineTo(x, y); ctxToUse.moveTo(popupLastX - Math.cos(ang) * off, popupLastY - Math.sin(ang) * off); ctxToUse.lineTo(x - Math.cos(ang) * off, y - Math.sin(ang) * off); ctxToUse.stroke(); }
        else if (eff === 'squares') { if (Math.random() > 0.3) { ctxToUse.fillRect(x + (Math.random() - 0.5) * currentDrawWidth * 3, y + (Math.random() - 0.5) * currentDrawWidth * 3, currentDrawWidth, currentDrawWidth); } }
        else if (eff === 'snow') { if (Math.random() > 0.5) { ctxToUse.font = `${currentDrawWidth * 2}px Arial`; ctxToUse.fillText('❄', x + (Math.random() - 0.5) * currentDrawWidth * 4, y + (Math.random() - 0.5) * currentDrawWidth * 4); } }
        else if (eff === 'matrix') { if (Math.random() > 0.5) { ctxToUse.font = `${currentDrawWidth * 1.5}px monospace`; ctxToUse.fillText(Math.random() > 0.5 ? '0' : '1', x + (Math.random() - 0.5) * currentDrawWidth * 3, y + (Math.random() - 0.5) * currentDrawWidth * 3); } }
        else if (eff === 'stars') { if (Math.random() > 0.5) { ctxToUse.font = `${currentDrawWidth * 2}px Arial`; ctxToUse.fillText('⭐', x + (Math.random() - 0.5) * currentDrawWidth * 3, y + (Math.random() - 0.5) * currentDrawWidth * 3); } }
        else if (eff === 'lightning') { ctxToUse.lineWidth = Math.max(1, currentDrawWidth / 2); ctxToUse.beginPath(); ctxToUse.moveTo(popupLastX, popupLastY); ctxToUse.lineTo(x + (Math.random() - 0.5) * currentDrawWidth, y + (Math.random() - 0.5) * currentDrawWidth); ctxToUse.lineTo(x, y); ctxToUse.stroke(); }
        else if (eff === 'pixel') { const s = Math.max(2, currentDrawWidth); ctxToUse.fillRect(Math.floor(x / s) * s, Math.floor(y / s) * s, s, s); }
        else if (eff === 'smoke') { ctxToUse.globalAlpha = 0.1; ctxToUse.beginPath(); ctxToUse.arc(x + (Math.random() - 0.5) * currentDrawWidth, y + (Math.random() - 0.5) * currentDrawWidth, currentDrawWidth * 2, 0, Math.PI * 2); ctxToUse.fill(); ctxToUse.globalAlpha = 1; }
        else if (eff === 'confetti') { if (Math.random() > 0.3) { ctxToUse.fillStyle = `hsl(${Math.random() * 360},100%,50%)`; ctxToUse.fillRect(x + (Math.random() - 0.5) * currentDrawWidth * 4, y + (Math.random() - 0.5) * currentDrawWidth * 4, currentDrawWidth * 0.5, currentDrawWidth * 0.5); } }
        else if (eff === 'dna') { const t = Date.now() / 200; const r = currentDrawWidth; ctxToUse.beginPath(); ctxToUse.arc(x + Math.sin(t) * r, y + Math.cos(t) * r, currentDrawWidth / 4, 0, Math.PI * 2); ctxToUse.arc(x - Math.sin(t) * r, y - Math.cos(t) * r, currentDrawWidth / 4, 0, Math.PI * 2); ctxToUse.fill(); }
        else if (eff === 'comet') { ctxToUse.lineWidth = currentDrawWidth; ctxToUse.lineCap = 'round'; ctxToUse.shadowBlur = currentDrawWidth; ctxToUse.shadowColor = rgbaStr; ctxToUse.beginPath(); ctxToUse.moveTo(popupLastX, popupLastY); ctxToUse.lineTo(x, y); ctxToUse.stroke(); ctxToUse.shadowBlur = 0; }
        else if (eff === 'flowers') { if (Math.random() > 0.5) { ctxToUse.font = `${currentDrawWidth * 2}px Arial`; ctxToUse.fillText('✿', x + (Math.random() - 0.5) * currentDrawWidth * 3, y + (Math.random() - 0.5) * currentDrawWidth * 3); } }
        else if (eff === 'music') { if (Math.random() > 0.5) { ctxToUse.font = `${currentDrawWidth * 2}px Arial`; ctxToUse.fillText(Math.random() > 0.5 ? '♫' : '♪', x + (Math.random() - 0.5) * currentDrawWidth * 3, y + (Math.random() - 0.5) * currentDrawWidth * 3); } }
    } else {
        let rgbStr = hexToRgb(currentDrawColor); let rgbaStr = rgbStr.replace('rgb(', 'rgba(').replace(')', `,${currentDrawOpacity})`);
        bgCtx.strokeStyle = rgbaStr; bgCtx.fillStyle = rgbaStr;
        if (currentDrawType === 'fountain') { const dist = Math.hypot(x - popupLastX, y - popupLastY); bgCtx.lineWidth = Math.max(1, currentDrawWidth - (dist * 0.1)); bgCtx.lineCap = 'square'; bgCtx.lineJoin = 'bevel'; bgCtx.beginPath(); bgCtx.moveTo(popupLastX, popupLastY); bgCtx.lineTo(x, y); bgCtx.stroke(); }
        else if (currentDrawType === 'brush') { bgCtx.lineWidth = currentDrawWidth; bgCtx.lineCap = 'round'; bgCtx.lineJoin = 'round'; bgCtx.shadowBlur = currentDrawWidth / 2; bgCtx.shadowColor = rgbaStr; bgCtx.beginPath(); bgCtx.moveTo(popupLastX, popupLastY); bgCtx.lineTo(x, y); bgCtx.stroke(); bgCtx.shadowBlur = 0; }
        else if (currentDrawType === 'colorpencil') { bgCtx.lineWidth = currentDrawWidth; bgCtx.lineCap = 'round'; bgCtx.globalAlpha = 0.5; bgCtx.beginPath(); bgCtx.moveTo(popupLastX + (Math.random() * 4 - 2), popupLastY + (Math.random() * 4 - 2)); bgCtx.lineTo(x + (Math.random() * 4 - 2), y + (Math.random() * 4 - 2)); bgCtx.stroke(); bgCtx.globalAlpha = 1; }
        else if (currentDrawType === 'charcoal') { const dist = Math.hypot(x - popupLastX, y - popupLastY); const steps = Math.ceil(dist / (currentDrawWidth * 0.25)); for (let i = 0; i < steps; i++) { const px = popupLastX + (x - popupLastX) * (i / steps) + (Math.random() - 0.5) * currentDrawWidth; const py = popupLastY + (y - popupLastY) * (i / steps) + (Math.random() - 0.5) * currentDrawWidth; bgCtx.globalAlpha = Math.random() * 0.8; bgCtx.beginPath(); bgCtx.arc(px, py, Math.random() * (currentDrawWidth / 2), 0, Math.PI * 2); bgCtx.fill(); } bgCtx.globalAlpha = 1; }
        else { bgCtx.lineWidth = currentDrawWidth; bgCtx.lineCap = 'round'; bgCtx.lineJoin = 'round'; bgCtx.beginPath(); bgCtx.moveTo(popupLastX, popupLastY); bgCtx.lineTo(x, y); bgCtx.stroke(); }
    }
    if (currentDrawType !== 'stamp' && currentDrawType !== 'imageStamp') { popupLastX = x; popupLastY = y; }
}
function endStroke() {
    if (popupRecorder && popupRecorder.state === 'recording' && window.currentIsIntermittent) { popupActiveTime += performance.now() - popupLastResumeTime; popupRecorder.pause(); }
    isPopupDrawing = false; if (bgCtx && popupRawCanvas) { drawHistory.push(bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height)); if (drawHistory.length > 20) drawHistory.shift(); }
}
if (popupRawCanvas) {
    const updateMousePos = (e, isTouch) => {
        const rect = popupRawCanvas.getBoundingClientRect();
        const scaleX = popupRawCanvas.width / rect.width;
        const scaleY = popupRawCanvas.height / rect.height;
        const clientX = isTouch ? (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX) : e.clientX;
        const clientY = isTouch ? (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY) : e.clientY;
        window.popupMouseX = (clientX - rect.left) * scaleX;
        window.popupMouseY = (clientY - rect.top) * scaleY;
        window.popupMouseInside = true;
    };
    popupRawCanvas.addEventListener('mousedown', (e) => { updateMousePos(e, false); handleDrawStart(e, false); });
    popupRawCanvas.addEventListener('mousemove', (e) => { updateMousePos(e, false); handleDrawMove(e, false); });
    popupRawCanvas.addEventListener('mouseup', () => { window.popupMouseInside = false; endStroke(); });
    popupRawCanvas.addEventListener('mouseenter', () => { window.popupMouseInside = true; });
    popupRawCanvas.addEventListener('mouseleave', () => { window.popupMouseInside = false; });
    popupRawCanvas.addEventListener('mouseout', (e) => { 
        window.popupMouseInside = false;
        if (isPopupDrawing) endStroke(); 
    });
    popupRawCanvas.addEventListener('touchstart', (e) => { updateMousePos(e, true); handleDrawStart(e, true); }, { passive: false });
    popupRawCanvas.addEventListener('touchmove', (e) => { updateMousePos(e, true); handleDrawMove(e, true); }, { passive: false });
    popupRawCanvas.addEventListener('touchend', (e) => {
        window.popupMouseInside = false;
        endStroke();
    });
}
if (popupUndoBtn) { popupUndoBtn.onclick = () => { if (drawHistory.length > 1) { drawHistory.pop(); bgCtx.putImageData(drawHistory[drawHistory.length - 1], 0, 0); } else if (drawHistory.length === 1) { drawHistory.pop(); bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height); } }; }
if (popupClearBtn) { popupClearBtn.onclick = () => { window.resetAllEffects(); if (bgCtx && popupRawCanvas) { bgCtx.clearRect(0, 0, popupRawCanvas.width, popupRawCanvas.height); trailCtx.clearRect(0, 0, popupRawCanvas.width, popupRawCanvas.height); fsParticles = []; drawHistory = []; setTimeout(() => { drawHistory.push(bgCtx.getImageData(0, 0, popupRawCanvas.width, popupRawCanvas.height)); }, 100); } }; }
if (turnOffEffectsBtn) { turnOffEffectsBtn.onclick = () => { window.resetAllEffects(); }; }
if (popupCancelBtn) { popupCancelBtn.onclick = () => { if (popupRecorder && (popupRecorder.state === 'recording' || popupRecorder.state === 'paused')) popupRecorder.stop(); if (drawModal) drawModal.style.display = 'none'; clearInterval(popupInterval); window.resetAllEffects(); if (popupRecordTimer) popupRecordTimer.style.display = 'none'; if (typeof waveAudioEl !== 'undefined' && waveAudioEl) { waveAudioEl.pause(); waveAudioEl.currentTime = 0; waveIsPlaying = false; } if (typeof waveIsStandby !== 'undefined') waveIsStandby = false; if (typeof previewVideoEl !== 'undefined' && previewVideoEl) { previewVideoEl.pause(); } }; }
if (previewCancelBtn) { previewCancelBtn.onclick = () => { if (previewModal) previewModal.style.display = 'none'; if (popupRecordContBtn) popupRecordContBtn.style.display = 'block'; if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'block'; if (popupStopBtn) popupStopBtn.style.display = 'none'; if (popupRecordTimer) popupRecordTimer.style.display = 'none'; popupInterval = setInterval(renderPopupLoop, 33); window.resetAllEffects(); if (typeof waveAudioEl !== 'undefined' && waveAudioEl) { waveAudioEl.pause(); waveAudioEl.currentTime = 0; waveIsPlaying = false; } if (typeof waveIsStandby !== 'undefined') waveIsStandby = false; if (typeof previewVideoEl !== 'undefined' && previewVideoEl) { previewVideoEl.pause(); } }; }

// --- Music Wave UI Events ---
if (waveModeSelect) {
    waveModeSelect.onchange = () => {
        if (waveModeSelect.value === 'none') {
            waveOptionsDiv.style.display = 'none';
        } else {
            waveOptionsDiv.style.display = 'block';
            if (waveModeSelect.value === 'audio') {
                waveAudioDiv.style.display = 'block';
            } else {
                waveAudioDiv.style.display = 'none';
            }
        }
    };
}
if (waveShapeSelect) {
    waveShapeSelect.addEventListener('change', () => {
        if (wavePerformanceOptions) {
            wavePerformanceOptions.style.display = (waveShapeSelect.value === 'performance') ? 'block' : 'none';
        }
    });
}
if (waveAudioBtn) waveAudioBtn.onclick = () => waveAudioInput.click();
if (waveAudioInput) {
    waveAudioInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        waveFileName = file.name;
        if (waveAudioLabel) waveAudioLabel.textContent = waveFileName;
        if (waveAudioEl) {
            window.MediaDispose?.releaseAttachedElement?.(waveAudioEl);
            waveAudioEl = null;
            waveAudioSource = null;
        }
        waveAudioEl = new Audio(URL.createObjectURL(file));
        waveAudioEl.crossOrigin = "anonymous";

        if (!waveAudioContext) {
            waveAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            waveAnalyser = waveAudioContext.createAnalyser();
            waveAnalyser.fftSize = 256;
            const bufferLength = waveAnalyser.frequencyBinCount;
            waveDataArray = new Uint8Array(bufferLength);
        }

        waveAudioEl.oncanplay = () => {
            if (!waveAudioSource) {
                try {
                    waveAudioSource = waveAudioContext.createMediaElementSource(waveAudioEl);
                    waveAudioSource.connect(waveAnalyser);
                    waveAnalyser.connect(waveAudioContext.destination);
                } catch (e) { console.warn('AudioSource already created', e); }
            }
        };
        waveAudioEl.onloadedmetadata = () => {
            const dur = waveAudioEl.duration;
            const durEl = document.getElementById('waveAudioDuration');
            if (durEl && isFinite(dur)) {
                const m = Math.floor(dur / 60), s = Math.floor(dur % 60);
                durEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
            }
        };
        waveAudioEl.ontimeupdate = () => {
            const cur = waveAudioEl.currentTime;
            const dur = waveAudioEl.duration || 1;
            const prog = document.getElementById('waveAudioProgress');
            const curEl = document.getElementById('waveAudioCurrent');
            if (prog) prog.value = (cur / dur) * 100;
            if (curEl) {
                const m = Math.floor(cur / 60), s = Math.floor(cur % 60);
                curEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
            }
        };
        waveAudioEl.onended = () => {
            waveIsPlaying = false;
            // Reset progress bar
            const prog = document.getElementById('waveAudioProgress');
            if (prog) prog.value = 0;
            const curEl = document.getElementById('waveAudioCurrent');
            if (curEl) curEl.textContent = '0:00';
            // Auto-stop recording when audio ends
            if (typeof popupRecorder !== 'undefined' && popupRecorder &&
                (popupRecorder.state === 'recording' || popupRecorder.state === 'paused')) {
                if (popupRecorder.state === 'recording') {
                    popupActiveTime += performance.now() - popupLastResumeTime;
                }
                popupRecorder.stop();
            }
        };
    };
}
let waveIsStandby = false;
let waveStandbyIsIntermittent = false;

if (wavePlayBtn) {
    wavePlayBtn.onclick = () => {
        if (waveAudioContext && waveAudioContext.state === 'suspended') {
            waveAudioContext.resume();
        }
        if (waveAudioEl) {
            waveAudioEl.play();
            waveIsPlaying = true;
        }
        if (waveIsStandby) {
            waveIsStandby = false;
            actualStartRecording(waveStandbyIsIntermittent);
        } else if (typeof popupRecorder !== 'undefined' && popupRecorder && popupRecorder.state === 'paused') {
            // resume recording if it was paused
            popupRecorder.resume();
            popupLastResumeTime = performance.now();
        }
    };
}
if (wavePauseBtn) {
    wavePauseBtn.onclick = () => {
        if (waveAudioEl) {
            waveAudioEl.pause();
            waveIsPlaying = false;
        }
        if (typeof popupRecorder !== 'undefined' && popupRecorder && popupRecorder.state === 'recording') {
            popupActiveTime += performance.now() - popupLastResumeTime;
            popupRecorder.pause();
        }
    };
}
if (waveStopBtn) {
    waveStopBtn.onclick = () => {
        if (waveAudioEl) {
            waveAudioEl.pause();
            waveAudioEl.currentTime = 0;
            waveIsPlaying = false;
        }
        if (typeof popupRecorder !== 'undefined' && popupRecorder) {
            if (popupRecorder.state === 'recording') popupActiveTime += performance.now() - popupLastResumeTime;
            if (popupRecorder.state === 'recording' || popupRecorder.state === 'paused') {
                popupRecorder.stop();
            }
        }
        if (waveIsStandby) {
            waveIsStandby = false;
            if (popupRecordContBtn) popupRecordContBtn.style.display = 'block';
            if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'block';
            if (popupStopBtn) popupStopBtn.style.display = 'none';
            if (popupRecordTimer) popupRecordTimer.style.display = 'none';
        }
    };
}

// Audio progress bar seek
const waveAudioProgress = document.getElementById('waveAudioProgress');
if (waveAudioProgress) {
    waveAudioProgress.oninput = () => {
        if (waveAudioEl && waveAudioEl.duration) {
            waveAudioEl.currentTime = (waveAudioProgress.value / 100) * waveAudioEl.duration;
        }
    };
}

function drawWaveform(ctx, data, shape, colorMode, w, h) {
    ctx.save();

    const waveSizeEl = document.getElementById('waveSize');
    const waveWidthEl = document.getElementById('waveWidth');
    const waveHeightEl = document.getElementById('waveHeight');
    const wavePosXEl = document.getElementById('wavePosX');
    const wavePosYEl = document.getElementById('wavePosY');
    const waveLineWidthEl = document.getElementById('waveLineWidth');
    const waveCountEl = document.getElementById('waveCount');

    let sizeVal = waveSizeEl ? parseFloat(waveSizeEl.value) / 100 : 1.0;
    let widthVal = waveWidthEl ? parseFloat(waveWidthEl.value) / 100 : 1.0;
    let heightVal = waveHeightEl ? parseFloat(waveHeightEl.value) / 100 : 1.0;

    let scaleX = sizeVal * widthVal;
    let scaleY = sizeVal * heightVal;

    let posX = wavePosXEl ? parseFloat(wavePosXEl.value) / 100 : 0.5;
    let posY = wavePosYEl ? parseFloat(wavePosYEl.value) / 100 : 0.5;

    let cx = w * posX;
    let cy = h * posY;

    ctx.translate(cx, cy);

    let realW = w * scaleX;
    let realH = h * scaleY;
    let startX = -realW / 2;
    let startY = -realH / 2;

    let baseColor = typeof currentDrawColor !== 'undefined' ? currentDrawColor : '#ffffff';
    let drawWidth = waveLineWidthEl ? parseInt(waveLineWidthEl.value) : 5;
    const count = waveCountEl ? parseInt(waveCountEl.value) : 128;

    // Create a symmetric version of data of length `count`
    let symData = [];
    let halfCount = Math.floor(count / 2);
    let srcHalfLen = Math.floor(data.length / 2);
    for (let i = 0; i < halfCount; i++) {
        let srcIdx = srcHalfLen > 0 ? Math.floor((halfCount - 1 - i) * (srcHalfLen / halfCount)) : 0;
        srcIdx = Math.min(Math.max(0, srcIdx), data.length - 1);
        symData.push(data.length > 0 ? data[srcIdx] : 0);
    }
    for (let i = 0; i < halfCount; i++) {
        let srcIdx = srcHalfLen > 0 ? Math.floor(i * (srcHalfLen / halfCount)) : 0;
        srcIdx = Math.min(Math.max(0, srcIdx), data.length - 1);
        symData.push(data.length > 0 ? data[srcIdx] : 0);
    }
    if (count % 2 !== 0) {
        symData.push(data.length > 0 ? data[0] : 0);
    }

    if (shape === 'bar' || shape === 'mirror-bar') {
        let barW = realW / count;
        let maxH = realH * 0.4;
        let xOffset = startX;
        let yOffset = shape === 'bar' ? (realH / 2) : 0;

        // Use drawWidth directly to control bar thickness
        let actualBarW = drawWidth;

        let isAudio = false;
        const waveModeSelectEl = document.getElementById('waveModeSelect');
        if (waveModeSelectEl && waveModeSelectEl.value === 'audio') {
            isAudio = true;
        }

        // Setup fillStyle for modes other than rainbow
        let waveFillStyle = baseColor;
        if (colorMode === 'gradient') {
            let grad = ctx.createLinearGradient(0, yOffset, 0, yOffset - maxH);
            grad.addColorStop(0, baseColor); grad.addColorStop(1, 'rgba(255,255,255,0.2)');
            waveFillStyle = grad;
        } else if (colorMode === 'tier3') {
            if (shape === 'bar') {
                let grad = ctx.createLinearGradient(0, yOffset, 0, yOffset - maxH);
                grad.addColorStop(0, '#605eff');     // Low (Indigo/blue)
                grad.addColorStop(0.35, '#605eff');
                grad.addColorStop(0.35, '#03ff6d');  // Mid (Neon green)
                grad.addColorStop(0.70, '#03ff6d');
                grad.addColorStop(0.70, '#ff7ed9');  // High (Pink)
                grad.addColorStop(1, '#ff7ed9');
                waveFillStyle = grad;
            } else { // mirror-bar
                let grad = ctx.createLinearGradient(0, yOffset - maxH, 0, yOffset + maxH);
                grad.addColorStop(0, '#ff7ed9');     // High (Pink)
                grad.addColorStop(0.15, '#ff7ed9');
                grad.addColorStop(0.15, '#03ff6d');  // Mid (Neon green)
                grad.addColorStop(0.325, '#03ff6d');
                grad.addColorStop(0.325, '#605eff');  // Low (Indigo/blue)
                grad.addColorStop(0.5, '#605eff');   // Center baseline
                grad.addColorStop(0.5, '#605eff');   // Center baseline
                grad.addColorStop(0.675, '#605eff');  // Low (Indigo/blue)
                grad.addColorStop(0.675, '#03ff6d');  // Mid (Neon green)
                grad.addColorStop(0.85, '#03ff6d');
                grad.addColorStop(0.85, '#ff7ed9');   // High (Pink)
                grad.addColorStop(1, '#ff7ed9');
                waveFillStyle = grad;
            }
        }

        if (isAudio) {
            // Draw audio bars across full width using symData
            let center = (count - 1) / 2;
            let sigma = (count - 1) / 5.5;
            let gZero = Math.exp(-0.5 * Math.pow((0 - center) / sigma, 2));

            for (let i = 0; i < count; i++) {
                let val = symData[i] / 255;
                // Gaussian normal distribution curve (starts and ends exactly at 0)
                let bellFactor = (Math.exp(-0.5 * Math.pow((i - center) / sigma, 2)) - gZero) / (1 - gZero);
                let barH = val * maxH * bellFactor;
                
                let x = xOffset + i * barW + (barW - actualBarW) / 2;
                let y = yOffset - barH;

                if (colorMode === 'rainbow') {
                    ctx.fillStyle = `hsl(${(i / count) * 360}, 100%, 50%)`;
                } else {
                    ctx.fillStyle = waveFillStyle;
                }

                if (shape === 'bar') {
                    ctx.fillRect(x, y, actualBarW, barH);
                } else {
                    ctx.fillRect(x, -barH, actualBarW, barH * 2);
                }
            }
        } else {
            // Draw simple oscillating noise bars across full width
            let center = (count - 1) / 2;
            let sigma = (count - 1) / 5.5;
            let gZero = Math.exp(-0.5 * Math.pow((0 - center) / sigma, 2));

            for (let i = 0; i < count; i++) {
                // Map count to the data length
                let dataIdx = data.length > 0 ? Math.floor(i * (data.length / count)) : 0;
                dataIdx = Math.min(data.length - 1, Math.max(0, dataIdx));

                let val = data.length > 0 ? (data[dataIdx] / 255) : 0;
                // Gaussian normal distribution curve (starts and ends exactly at 0)
                let bellFactor = (Math.exp(-0.5 * Math.pow((i - center) / sigma, 2)) - gZero) / (1 - gZero);
                let barH = val * maxH * bellFactor;
                // Center the bar within its slot
                let x = xOffset + i * barW + (barW - actualBarW) / 2;
                let y = yOffset - barH;

                if (colorMode === 'rainbow') {
                    ctx.fillStyle = `hsl(${(i / count) * 360}, 100%, 50%)`;
                } else {
                    ctx.fillStyle = waveFillStyle;
                }

                if (shape === 'bar') {
                    ctx.fillRect(x, y, actualBarW, barH);
                } else {
                    ctx.fillRect(x, -barH, actualBarW, barH * 2);
                }
            }
        }
    } else if (shape === 'line' || shape === 'wave') {
        // Horizontal linear waveform: line moves up/down based on audio volume
        let useData = symData;
        let maxAmplitude = realH * 0.45; // max vertical displacement from center

        // Build stroke color / fill gradient
        let lineStrokeStyle = baseColor;
        let lineFillStyle = baseColor;
        if (colorMode === 'rainbow') {
            let grad = ctx.createLinearGradient(startX, 0, startX + realW, 0);
            grad.addColorStop(0, 'red'); grad.addColorStop(0.25, 'yellow');
            grad.addColorStop(0.5, 'lime'); grad.addColorStop(0.75, 'cyan');
            grad.addColorStop(1, 'blue');
            lineStrokeStyle = grad;
            lineFillStyle = grad;
        } else if (colorMode === 'gradient') {
            let grad = ctx.createLinearGradient(startX, 0, startX + realW, 0);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, baseColor);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            lineStrokeStyle = grad;
            lineFillStyle = grad;
        } else if (colorMode === 'tier3') {
            // Color based on amplitude: blue=low, green=mid, pink=high
            // We'll apply per-segment coloring below
            lineStrokeStyle = null;
            lineFillStyle = null;
        }

        if (shape === 'wave') {
            // Filled wave: draw path down to baseline and back
            // Canvas Y increases downward, so negate val to keep high amplitude going UP
            ctx.beginPath();
            for (let i = 0; i < useData.length; i++) {
                let val = (useData[i] / 255.0) * 2 - 1; // -1 to +1
                let x = startX + (i / (useData.length - 1)) * realW;
                let y = -val * maxAmplitude; // negate: up = negative Y in canvas
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            // Close path along baseline
            ctx.lineTo(startX + realW, 0);
            ctx.lineTo(startX, 0);
            ctx.closePath();

            if (colorMode === 'rainbow' || colorMode === 'gradient') {
                ctx.fillStyle = lineFillStyle;
            } else if (colorMode === 'tier3') {
                let grad = ctx.createLinearGradient(0, -maxAmplitude, 0, maxAmplitude);
                grad.addColorStop(0, '#ff7ed9');
                grad.addColorStop(0.35, '#03ff6d');
                grad.addColorStop(0.5, '#605eff');
                grad.addColorStop(0.65, '#03ff6d');
                grad.addColorStop(1, '#ff7ed9');
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = baseColor;
            }
            ctx.globalAlpha = 0.55;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Draw top outline stroke
            ctx.beginPath();
            for (let i = 0; i < useData.length; i++) {
                let val = (useData[i] / 255.0) * 2 - 1;
                let x = startX + (i / (useData.length - 1)) * realW;
                let y = -val * maxAmplitude; // negate: up = negative Y in canvas
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = lineStrokeStyle !== null ? lineStrokeStyle : baseColor;
            ctx.lineWidth = drawWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // shape === 'line': horizontal line that moves with audio amplitude
            // Draw per-segment with tier3 support
            if (colorMode === 'tier3') {
                // Draw each segment colored by amplitude
                for (let i = 0; i < useData.length - 1; i++) {
                    let val0 = useData[i] / 255.0;
                    let val1 = useData[i + 1] / 255.0;
                    let x0 = startX + (i / (useData.length - 1)) * realW;
                    let y0 = -(val0 * 2 - 1) * maxAmplitude; // negate: up = negative Y
                    let x1 = startX + ((i + 1) / (useData.length - 1)) * realW;
                    let y1 = -(val1 * 2 - 1) * maxAmplitude; // negate: up = negative Y

                    let avgVal = (val0 + val1) / 2;
                    let segColor;
                    if (avgVal < 0.33) segColor = '#605eff';        // low: indigo/blue
                    else if (avgVal < 0.66) segColor = '#03ff6d';   // mid: neon green
                    else segColor = '#ff7ed9';                       // high: pink

                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.lineTo(x1, y1);
                    ctx.strokeStyle = segColor;
                    ctx.lineWidth = drawWidth;
                    ctx.lineJoin = 'round';
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                for (let i = 0; i < useData.length; i++) {
                    let val = (useData[i] / 255.0) * 2 - 1; // -1 to +1, centered at 0
                    let x = startX + (i / (useData.length - 1)) * realW;
                    let y = -val * maxAmplitude; // negate: up = negative Y in canvas
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = lineStrokeStyle;
                ctx.lineWidth = drawWidth;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }
    } else if (shape === 'circle') {
        let radius = Math.min(realW, realH) * 0.2;
        let useData = symData;
        for (let i = 0; i < useData.length; i++) {
            let val = useData[i] / 255.0;
            let barH = val * (Math.min(realW, realH) * 0.25);
            let rads = (Math.PI * 2 / useData.length) * i - Math.PI / 2;
            let vx = Math.cos(rads) * radius;
            let vy = Math.sin(rads) * radius;
            let ex = Math.cos(rads) * (radius + barH);
            let ey = Math.sin(rads) * (radius + barH);

            let itemColor = baseColor;
            if (colorMode === 'tier3') {
                let ratio = Math.abs(i - useData.length / 2) / (useData.length / 2);
                if (ratio < 0.3) itemColor = '#605eff';
                else if (ratio < 0.7) itemColor = '#03ff6d';
                else itemColor = '#ff7ed9';
            } else if (colorMode === 'rainbow') {
                itemColor = `hsl(${(i / useData.length) * 360}, 100%, 50%)`;
            }
            ctx.strokeStyle = itemColor;

            ctx.lineWidth = drawWidth;
            ctx.beginPath();
            ctx.moveTo(vx, vy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }
    } else if (shape === 'dots') {
        let useData = symData;
        let barW = realW / count;
        let maxH = realH * 0.45;
        let xOffset = startX;
        let yOffset = realH / 2; // bottom baseline

        // Setup dot properties
        let dotRadius = Math.max(2, drawWidth / 2);
        let dotSpacing = dotRadius * 2.5; // space between dot centers

        let dotFillStyle = baseColor;
        if (colorMode === 'gradient') {
            let grad = ctx.createLinearGradient(0, yOffset, 0, yOffset - maxH);
            grad.addColorStop(0, baseColor);
            grad.addColorStop(1, 'rgba(255,255,255,0.2)');
            dotFillStyle = grad;
        }

        for (let i = 0; i < count; i++) {
            let val = useData[i] / 255.0;
            let center = (count - 1) / 2;
            let sigma = (count - 1) / 5.5;
            let gZero = Math.exp(-0.5 * Math.pow((0 - center) / sigma, 2));
            let bellFactor = (Math.exp(-0.5 * Math.pow((i - center) / sigma, 2)) - gZero) / (1 - gZero);
            let barH = val * maxH * bellFactor;

            // Center of the bar column
            let x = xOffset + i * barW + barW / 2;

            let currY = yOffset;
            while (currY >= yOffset - barH) {
                let itemColor = dotFillStyle;
                if (colorMode === 'tier3') {
                    let heightRatio = (yOffset - currY) / (maxH || 1);
                    if (heightRatio < 0.35) itemColor = '#605eff';
                    else if (heightRatio < 0.70) itemColor = '#03ff6d';
                    else itemColor = '#ff7ed9';
                } else if (colorMode === 'rainbow') {
                    itemColor = `hsl(${(i / count) * 360}, 100%, 50%)`;
                }

                ctx.fillStyle = itemColor;
                ctx.beginPath();
                ctx.arc(x, currY, dotRadius, 0, Math.PI * 2);
                ctx.fill();

                currY -= dotSpacing;
                if (dotSpacing <= 0) break;
            }
        }
    } else if (shape === 'stamp') {
        let radius = Math.min(realW, realH) * 0.2;
        let useData = symData;
        let stampChar = typeof currentStamp !== 'undefined' && currentStamp ? currentStamp : '🎵';
        let customImg = typeof customStampImg !== 'undefined' && customStampImg ? customStampImg : null;
        let isImg = (typeof currentDrawType !== 'undefined' && currentDrawType === 'imageStamp') && customImg;

        ctx.font = `${Math.max(10, drawWidth * 4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < useData.length; i++) {
            let val = useData[i] / 255.0;
            let barH = val * (Math.min(realW, realH) * 0.25);
            let rads = (Math.PI * 2 / useData.length) * i - Math.PI / 2;
            let dotX = Math.cos(rads) * (radius + barH);
            let dotY = Math.sin(rads) * (radius + barH);

            let itemColor = baseColor;
            if (colorMode === 'tier3') {
                let ratio = Math.abs(i - useData.length / 2) / (useData.length / 2);
                if (ratio < 0.3) itemColor = '#605eff';
                else if (ratio < 0.7) itemColor = '#03ff6d';
                else itemColor = '#ff7ed9';
            } else if (colorMode === 'rainbow') {
                itemColor = `hsl(${(i / useData.length) * 360}, 100%, 50%)`;
            }
            ctx.fillStyle = itemColor;

            if (isImg) {
                let s = drawWidth * 5;
                ctx.globalAlpha = val + 0.3;
                ctx.drawImage(customImg, dotX - s / 2, dotY - s / 2, s, s);
                ctx.globalAlpha = 1.0;
            } else {
                ctx.fillText(stampChar, dotX, dotY);
            }
        }
    } else if (shape === 'performance') {
        let avg = data.length > 0 ? (data.reduce((a, b) => a + b, 0) / data.length) : 0;
        let mode = wavePerformanceMode ? wavePerformanceMode.value : 'burst';
        let rawEff = mouseEffectSelect && mouseEffectSelect.value ? mouseEffectSelect.value : '';
        // Default to stars (별) if no effect is selected
        if (!rawEff || rawEff === 'none') {
            rawEff = 'stars';
        }

        const effMap = { 'sparkle': 'star', 'hearts': 'heart', 'stars': 'star', 'flowers': 'flower', 'smoke': 'fog', 'spray': 'rain', 'fireworks': 'spark', 'neon': 'spark', 'rainbow': 'bubble', 'matrix': 'snow', 'pixel': 'confetti', 'dna': 'confetti', 'comet': 'spark', 'ribbon': 'petal', 'squares': 'confetti' };
        let eff = effMap[rawEff] || rawEff;

        if (avg > 10 && typeof fsParticles !== 'undefined') {
            // Spawn more particles when loud, fewer when quiet — organic feel
            let intensity = avg / 255;
            let numToSpawn = Math.max(1, Math.round(intensity * 8 + Math.random() * 3));
            
            // Fixed position from X % and Y % sliders
            let emitX = cx;
            let emitY = cy;

            // Link particle color to the visualizer colorMode/baseColor
            let pColor = baseColor;
            if (colorMode === 'rainbow') {
                pColor = `hsl(${Math.random() * 360}, 100%, 60%)`;
            } else if (colorMode === 'tier3') {
                const tierColors = ['#605eff', '#03ff6d', '#ff7ed9'];
                pColor = tierColors[Math.floor(Math.random() * tierColors.length)];
            }

            for (let i = 0; i < numToSpawn; i++) {
                // Random size: small to large based on audio + randomness
                let sSz = drawWidth * (0.3 + Math.random() * 2.5 * intensity + Math.random() * 0.5);
                
                let vx, vy;
                let angle = Math.random() * Math.PI * 2;
                let speed = (1 + Math.random() * 4) * intensity * (drawWidth * 0.3 + 1);
                
                let pGravity, pDrag;
                if (mode === 'fountain') {
                    // Fountain: fly upward with a slight spread (keep gravity and drag for fountain arcs)
                    vx = (Math.random() - 0.5) * speed * 0.8;
                    vy = -speed * (1.2 + Math.random() * 0.8);
                    pGravity = 0.08 + Math.random() * 0.1;
                    pDrag = 0.97;
                } else {
                    // Burst (Circular dispersion): fly straight symmetrically without falling
                    vx = Math.cos(angle) * speed;
                    vy = Math.sin(angle) * speed;
                    pGravity = 0.0;
                    pDrag = 1.0; // Straight movement without slowing down
                }

                let p = {
                    type: eff,
                    x: emitX + (Math.random() - 0.5) * 20,
                    y: emitY + (Math.random() - 0.5) * 20,
                    baseX: emitX + (Math.random() - 0.5) * 20,
                    vx: vx,
                    vy: vy,
                    dir: 'free',
                    size: sSz * 0.2, // Starts small (20%) and will grow to maxSize
                    maxSize: sSz,
                    angle: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.3,
                    time: 0,
                    life: 0,
                    maxLife: 20 + Math.random() * 40,
                    oscSpeed: 0.02,
                    windAmp: 0,
                    hue: Math.random() * 360,
                    baseAlpha: 0.7 + Math.random() * 0.3,
                    grow: false,
                    gravity: pGravity,
                    drag: pDrag,
                    color: pColor
                };
                fsParticles.push(p);
            }
        }
    }
    ctx.restore();
}
const actualStartRecording = (isIntermittent) => {
    window.setRecordMode(isIntermittent);
    const stream = popupRawCanvas.captureStream(60);
    let dest = null;
    if (waveModeSelect && waveModeSelect.value === 'audio' && waveAudioEl && waveIncludeAudioCheck && waveIncludeAudioCheck.checked) {
        if (waveAudioContext && waveAnalyser) {
            try {
                dest = waveAudioContext.createMediaStreamDestination();
                waveAnalyser.connect(dest);
                const audioTrack = dest.stream.getAudioTracks()[0];
                if (audioTrack) {
                    stream.addTrack(audioTrack);
                }
            } catch (e) { console.warn('Failed to add audio track', e); }
        }
    }
    let mimeType = 'video/webm;codecs=vp8';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mimeType = 'video/webm;codecs=vp9';
    popupRecorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 15000000 });
    popupChunks = []; popupActiveTime = 0;
    popupRecorder.ondataavailable = e => { if (e.data.size > 0) popupChunks.push(e.data); };
    popupRecorder.onstop = async () => {
        clearInterval(popupInterval);
        if (dest && waveAnalyser) {
            try { waveAnalyser.disconnect(dest); } catch (e) { }
        }
        if (typeof waveAudioEl !== 'undefined' && waveAudioEl) {
            waveAudioEl.pause();
            waveIsPlaying = false;
        }
        const blob = new Blob(popupChunks, { type: mimeType });
        if (blob.size === 0) { window.showToast('녹화된 내용이 없어 클립 생성을 취소합니다.'); if (popupRecordContBtn) popupRecordContBtn.style.display = 'block'; if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'block'; if (popupStopBtn) popupStopBtn.style.display = 'none'; return; }
        window.rawClipDuration = Math.max(0.1, popupActiveTime / 1000);
        window.previewBlob = blob;
        if (waveModeSelect && waveModeSelect.value === 'audio' && waveFileName) {
            if (clipPresetNameInput) clipPresetNameInput.value = waveFileName.replace(/\.[^/.]+$/, "");
        }
        const vid = document.getElementById('previewVideoEl');
        vid.src = URL.createObjectURL(window.previewBlob); vid.playbackRate = 1;
        if (previewSpeedSlider) previewSpeedSlider.value = 1;
        if (previewSpeedVal) previewSpeedVal.textContent = '1.0x';
        applyPreviewInfo();
        if (previewModal) previewModal.style.display = 'flex';
        vid.play().catch(e => console.warn(e));
    };
    popupRecorder.start();
    if (window.currentIsIntermittent) { popupRecorder.pause(); } else { popupLastResumeTime = performance.now(); }
    if (popupRecordContBtn) popupRecordContBtn.style.display = 'none';
    if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'none';
    if (popupStopBtn) popupStopBtn.style.display = 'block';
};
const startRecording = (isIntermittent) => {
    if (waveIncludeAudioCheck && waveIncludeAudioCheck.checked && waveModeSelect && waveModeSelect.value === 'audio') {
        waveIsStandby = true;
        waveStandbyIsIntermittent = isIntermittent;
        if (popupRecordTimer) {
            popupRecordTimer.textContent = '대기 중 (재생 시 녹화)';
            popupRecordTimer.style.display = 'block';
        }
        if (popupRecordContBtn) popupRecordContBtn.style.display = 'none';
        if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'none';
        if (popupStopBtn) popupStopBtn.style.display = 'block';
        return;
    }
    actualStartRecording(isIntermittent);
};
if (popupRecordContBtn) popupRecordContBtn.onclick = () => startRecording(false);
if (popupRecordInterBtn) popupRecordInterBtn.onclick = () => startRecording(true);
if (popupStopBtn) {
    popupStopBtn.onclick = () => {
        if (popupRecorder) {
            if (popupRecorder.state === 'recording') popupActiveTime += performance.now() - popupLastResumeTime;
            if (popupRecorder.state === 'recording' || popupRecorder.state === 'paused') popupRecorder.stop();
        }
        if (typeof waveIsStandby !== 'undefined' && waveIsStandby) {
            waveIsStandby = false;
            if (popupRecordContBtn) popupRecordContBtn.style.display = 'block';
            if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'block';
            if (popupStopBtn) popupStopBtn.style.display = 'none';
            if (popupRecordTimer) popupRecordTimer.style.display = 'none';
        }
        if (typeof waveAudioEl !== 'undefined' && waveAudioEl) {
            waveAudioEl.pause();
            waveAudioEl.currentTime = 0;
            waveIsPlaying = false;
        }
        window.resetAllEffects();
    };
}
if (previewSpeedSlider) { previewSpeedSlider.oninput = (e) => { const s = e.target.value; if (previewSpeedVal) previewSpeedVal.textContent = s + 'x'; if (previewVideoEl) previewVideoEl.playbackRate = parseFloat(s); applyPreviewInfo(); }; }
if (previewSaveBtn) {
    previewSaveBtn.onclick = async () => {
        const speed = parseFloat(previewSpeedSlider.value); const finalDuration = window.previewDuration;
        const videoElt = document.createElement('video'); videoElt.src = URL.createObjectURL(window.previewBlob); videoElt.playsInline = true; videoElt.crossOrigin = "anonymous"; videoElt.muted = true; videoElt.playbackRate = speed; videoElt.loop = window.previewLoop;
        videoElt.setAttribute('autoplay', 'true'); videoElt.setAttribute('muted', 'true'); videoElt.setAttribute('playsinline', 'true');
        await new Promise(res => { videoElt.onloadeddata = res; videoElt.oncanplay = res; setTimeout(res, 500); });
        videoElt.play().catch(() => { });
        const w = popupRawCanvas.width; const h = popupRawCanvas.height; videoElt.width = videoElt.videoWidth || w; videoElt.height = videoElt.videoHeight || h;
        let clipName = `Clip ${drawCount++}`;
        if (waveModeSelect && waveModeSelect.value === 'audio' && waveFileName) {
            clipName = waveFileName.replace(/\.[^/.]+$/, "");
        }
        const img = new fabric.Image(videoElt, { width: w, height: h, left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center', layerName: clipName, startTime: 0, endTime: finalDuration, trackType: 'overlay', trackIndex: 2, zIndex: 12, isVideo: true, inherentDuration: finalDuration, baseOpacity: 1, baseScaleX: 1, baseScaleY: 1, baseAngle: 0, baseVolume: 1, playbackRate: speed, thumbUrl: '' });
        if (window.TimelinePlacement) window.TimelinePlacement.placeClipOnTrack(img, 'overlay', 2, finalDuration, { preferredStart: currentTime }); else { const targetObjs = canvas.getObjects().filter(o => (o.trackType || 'overlay') === 'overlay' && (o.trackIndex || 0) === 2); let maxEnd = targetObjs.length ? Math.max(...targetObjs.map(o => o.endTime || 0)) : 0; img.startTime = maxEnd; img.endTime = maxEnd + finalDuration; }
        canvas.add(img); sortCanvasLayers();
        if (typeof window.renderTracks === 'function') window.renderTracks();
        if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();
        window.showToast('클립이 OVERLAY 3 트랙 뒤에 연결되었습니다');
        if (previewModal) previewModal.style.display = 'none';
        if (popupRecordContBtn) popupRecordContBtn.style.display = 'block';
        if (popupRecordInterBtn) popupRecordInterBtn.style.display = 'block';
        if (popupStopBtn) popupStopBtn.style.display = 'none';
        if (popupRecordTimer) popupRecordTimer.style.display = 'none';
        popupInterval = setInterval(renderPopupLoop, 33);
        window.resetAllEffects();
        if (typeof previewVideoEl !== 'undefined' && previewVideoEl) {
            previewVideoEl.pause();
        }
    };
}
if (previewSpeed1xBtn) { previewSpeed1xBtn.onclick = () => { if (previewSpeedSlider) { previewSpeedSlider.value = 1; previewSpeedSlider.dispatchEvent(new Event('input')); } }; }

if (typeof previewVideoEl !== 'undefined' && previewVideoEl) {
    previewVideoEl.ontimeupdate = () => {
        if (!previewVideoEl.duration) return;
        const p = (previewVideoEl.currentTime / previewVideoEl.duration) * 100;
        if (typeof previewProgressBar !== 'undefined' && previewProgressBar && document.activeElement !== previewProgressBar) {
            previewProgressBar.value = p;
        }
        if (typeof previewTimeText !== 'undefined' && previewTimeText) {
            previewTimeText.textContent = previewVideoEl.currentTime.toFixed(1) + 's';
        }
    };
}
if (typeof previewProgressBar !== 'undefined' && previewProgressBar) {
    previewProgressBar.oninput = (e) => {
        if (typeof previewVideoEl === 'undefined' || !previewVideoEl || !previewVideoEl.duration) return;
        const t = (e.target.value / 100) * previewVideoEl.duration;
        previewVideoEl.currentTime = t;
    };
}

if (saveClipLocalBtn) {
    saveClipLocalBtn.onclick = async () => {
        if (typeof window.saveSelectedLyricsClipLocal === 'function') {
            const lyricsSaved = await window.saveSelectedLyricsClipLocal();
            if (lyricsSaved) return;
        }
        const obj = canvas.getActiveObject() || window.lastSelectedObj; if (!obj) { window.showToast('저장할 클립을 선택하세요'); return; }
        const name = clipPresetNameInput.value.trim() || 'clip';
        let src = ''; if (obj.isVideo && obj.getElement()) { src = obj.getElement().src; } else if (obj.type === 'image' && obj.getElement()) { src = obj.getElement().src; }
        if (src.startsWith('blob:') || src.startsWith('data:')) {
            const extension = obj.isVideo ? '.webm' : '.png';
            const defaultName = name + extension;
            if (obj.playbackRate && obj.playbackRate !== 1) { window.showToast(`주의: 외부 저장은 원본 속도(${obj.inherentDuration.toFixed(1)}초)로 저장됩니다.`); }
            fetch(src).then(r => r.blob()).then(async blob => {
                const accept = obj.isVideo ? { 'video/webm': ['.webm'] } : { 'image/png': ['.png'] };
                const ok = await window.saveClipToDisk(blob, defaultName, accept);
                if (ok) window.showToast('로컬 하드디스크에 저장되었습니다.');
            }).catch(() => { window.showToast('클립 데이터를 읽을 수 없습니다'); });
        } else {
            window.showToast('로컬 저장이 불가능한 클립입니다');
        }
    };
}
window.clipboardClip = null;
const copyClipBtn = document.getElementById('copyClipBtn');
const pasteClipBtn = document.getElementById('pasteClipBtn');
if (copyClipBtn) { copyClipBtn.onclick = () => { const obj = canvas.getActiveObject() || window.lastSelectedObj; if (obj) { window.clipboardClip = obj; window.showToast('클립이 복사되었습니다'); } else { window.showToast('복사할 클립을 선택하세요'); } }; }
if (pasteClipBtn) { pasteClipBtn.onclick = () => { if (!window.clipboardClip) { window.showToast('붙여넣을 클립이 없습니다'); return; } const obj = window.clipboardClip; const dur = (obj.endTime || 5) - (obj.startTime || 0); const origTrim = obj.trimStart || 0; const tType = obj.trackType || 'overlay'; const tIdx = obj.trackIndex || 0; window.cloneClip(obj, currentTime, currentTime + dur, origTrim).then((cloned) => { if (window.TimelinePlacement) window.TimelinePlacement.placeClipOnTrack(cloned, tType, tIdx, dur, { preferredStart: currentTime, trimStart: origTrim }); if (typeof window.renderTracks === 'function') window.renderTracks(); if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility(); window.showToast('클립이 붙여넣기 되었습니다'); }); }; }
if (recordBtn) { recordBtn.onclick = async () => { if (mediaRecorder && mediaRecorder.state === 'recording') { mediaRecorder.stop(); recordBtn.textContent = '🎙️ 마이크 녹음'; recordBtn.classList.remove('recording'); const stopBtn = document.getElementById('timelineStopBtn'); if (stopBtn) stopBtn.click(); return; } try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorder = new MediaRecorder(stream); audioChunks = []; recordStartTime = currentTime; mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); }; mediaRecorder.onstop = async () => { const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); const url = URL.createObjectURL(audioBlob); const newAudio = new Audio(url); await new Promise(res => { newAudio.onloadedmetadata = () => { const dur = newAudio.duration || 5; const track = { layerName: '마이크 녹음', startTime: recordStartTime, endTime: recordStartTime + dur, trackType: 'audio', trackIndex: 0, zIndex: 0, audio: newAudio, baseVolume: 1 }; if (window.TimelinePlacement) window.TimelinePlacement.placeClipOnTrack(track, 'audio', 0, dur, { preferredStart: recordStartTime }); audioTrackData.push(track); res(); }; newAudio.onerror = res; }); stream.getTracks().forEach(track => track.stop()); if (typeof window.renderTracks === 'function') window.renderTracks(); if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI(); window.showToast('녹음이 AUDIO 1 트랙에 추가되었습니다'); }; mediaRecorder.start(); recordBtn.textContent = '⏹ 녹음 중...'; recordBtn.classList.add('recording'); const playBtn = document.getElementById('timelinePlayBtn'); if (playBtn && playBtn.textContent === '▶') playBtn.click(); } catch (err) { window.showToast('마이크 권한이 필요합니다'); console.error(err); } }; }
if (ratioSelect) {
    ratioSelect.onchange = () => {
        currentRatio = ratioSelect.value;
        localStorage.setItem('lastResolution', currentRatio);
        setCanvasSize();
        window.syncEffectEditorResolution?.();
    };
}
const popupRatioSelect = document.getElementById('popupRatioSelect');
if (popupRatioSelect) {
    popupRatioSelect.onchange = () => {
        const val = popupRatioSelect.value;
        const container = document.getElementById('popupCustomRatioContainer');
        if (val === 'custom') {
            if (container) container.style.display = 'flex';
            const [w, h] = currentRatio.split('x').map(Number);
            const wInput = document.getElementById('popupCustomWidthInput');
            const hInput = document.getElementById('popupCustomHeightInput');
            if (wInput) wInput.value = w || 1920;
            if (hInput) hInput.value = h || 1080;
        } else {
            if (container) container.style.display = 'none';
            currentRatio = val;
            localStorage.setItem('lastResolution', currentRatio);
            window.updateRatioUI();
            window.syncEffectEditorResolution?.();
        }
    };
}
const popupApplyCustomRatioBtn = document.getElementById('popupApplyCustomRatioBtn');
if (popupApplyCustomRatioBtn) {
    popupApplyCustomRatioBtn.onclick = () => {
        const wInput = document.getElementById('popupCustomWidthInput');
        const hInput = document.getElementById('popupCustomHeightInput');
        if (!wInput || !hInput) return;
        const w = parseInt(wInput.value);
        const h = parseInt(hInput.value);
        if (isNaN(w) || isNaN(h) || w < 100 || w > 10000 || h < 100 || h > 10000) {
            window.showToast('가로 및 세로 해상도는 100 ~ 10000 사이의 숫자여야 합니다.');
            return;
        }
        currentRatio = w + 'x' + h;
        localStorage.setItem('lastResolution', currentRatio);
        window.updateRatioUI();
        window.syncEffectEditorResolution?.();
    };
}
canvas.on('selection:created', () => window.updatePropertyPanel());
canvas.on('selection:updated', () => window.updatePropertyPanel());
canvas.on('selection:cleared', () => { if (subtitleTextInput) subtitleTextInput.value = ''; window.updatePropertyPanel(); });
canvas.on('object:modified', e => { const obj = e.target; if (obj) { obj.baseLeft = obj.left; obj.baseTop = obj.top; obj.baseScaleX = obj.scaleX; obj.baseScaleY = obj.scaleY; obj.baseAngle = obj.angle; window.updatePropertyPanel(obj); window.saveHistorySnapshot(); } });
const propOpacityNum = document.getElementById('propOpacityNum');
const propAngleNum = document.getElementById('propAngleNum');
if (propOpacity) propOpacity.oninput = () => {
    updateObj('opacity', propOpacity.value, true);
    if (propOpacityNum) propOpacityNum.value = propOpacity.value;
};
if (propOpacityNum) propOpacityNum.oninput = () => {
    const v = Math.max(0, Math.min(100, parseInt(propOpacityNum.value) || 0));
    propOpacityNum.value = v;
    if (propOpacity) propOpacity.value = v;
    updateObj('opacity', v, true);
};
if (propAngle) propAngle.oninput = () => {
    updateObj('angle', parseInt(propAngle.value));
    if (propAngleNum) propAngleNum.value = propAngle.value;
};
if (propAngleNum) propAngleNum.oninput = () => {
    const v = Math.max(-180, Math.min(180, parseInt(propAngleNum.value) || 0));
    propAngleNum.value = v;
    if (propAngle) propAngle.value = v;
    updateObj('angle', v);
};

if (propScale) { propScale.oninput = () => { updateObj('scaleX', propScale.value, true); updateObj('scaleY', propScale.value, true); propScaleX.value = propScale.value; propScaleY.value = propScale.value; }; }
if (propScaleX) propScaleX.oninput = () => updateObj('scaleX', propScaleX.value, true);
if (propScaleY) propScaleY.oninput = () => updateObj('scaleY', propScaleY.value, true);
if (propFill) propFill.oninput = () => updateObj('fill', propFill.value);
if (propFontSize) propFontSize.oninput = () => updateObj('fontSize', parseInt(propFontSize.value));
if (propStrokeWidth) propStrokeWidth.oninput = () => updateObj('strokeWidth', parseInt(propStrokeWidth.value));
if (propStroke) propStroke.oninput = () => updateObj('stroke', propStroke.value);
if (propCharSpacing) propCharSpacing.oninput = () => updateObj('charSpacing', parseInt(propCharSpacing.value));
if (propLineHeight) propLineHeight.oninput = () => updateObj('lineHeight', parseFloat(propLineHeight.value));
if (subtitleTextInput) { subtitleTextInput.oninput = () => { const obj = canvas.getActiveObject(); if (obj && obj.type === 'i-text') { if (obj.isTimedSubtitleClip && Array.isArray(obj.subtitleCues) && typeof window.getTimedSubtitleActiveCue === 'function') { const cue = window.getTimedSubtitleActiveCue(obj); if (cue) { cue.text = subtitleTextInput.value; if (typeof window.applyTimedSubtitleVisibility === 'function') window.applyTimedSubtitleVisibility(); } } else { obj.set('text', subtitleTextInput.value); canvas.requestRenderAll(); if (typeof window.renderTracks === 'function') window.renderTracks(); } } }; }
if (shadowOffset) shadowOffset.oninput = updateShadow;
if (shadowBlur) shadowBlur.oninput = updateShadow;
if (shadowColor) shadowColor.oninput = updateShadow;
if (propVolume) { propVolume.oninput = () => { const target = canvas.getActiveObject() || window.lastSelectedObj; if (target) { const vol = Math.max(0, Math.min(1, propVolume.value / 100)); target.baseVolume = vol; if (target.isVideo && target.getElement()) { target.getElement().volume = vol; } else if (target.audio) { target.audio.volume = vol; } } }; }

const snapshotInputs = [propOpacity, propOpacityNum, propAngle, propAngleNum, propScale, propScaleX, propScaleY, propFill, propFontSize, propStrokeWidth, propStroke, propCharSpacing, propLineHeight, subtitleTextInput, shadowOffset, shadowBlur, shadowColor, propVolume];
snapshotInputs.forEach(el => { if (el) el.addEventListener('change', () => { if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot(); }); });
if (propTrackIndex) {
    propTrackIndex.onchange = () => {
        const obj = canvas.getActiveObject() || window.lastSelectedObj; if (!obj) return;
        const originalType = obj.trackType || 'overlay'; const originalIdx = obj.trackIndex || 0;
        const [tType, tIdxStr] = propTrackIndex.value.split('_'); const tIdx = parseInt(tIdxStr);
        if (originalType === tType && originalIdx === tIdx) return;
        let targetObjects = [];
        if (tType === 'audio') { targetObjects = audioTrackData.filter(o => o.trackIndex === tIdx && o !== obj); } else { targetObjects = canvas.getObjects().filter(o => (o.trackType || 'overlay') === tType && (o.trackIndex || 0) === tIdx && o !== obj); }
        const start = obj.startTime || 0; const end = obj.endTime || 5; let hasOverlap = false;
        for (const tObj of targetObjects) { if (start < (tObj.endTime || 5) && end > (tObj.startTime || 0)) { hasOverlap = true; break; } }
        if (hasOverlap) { if (window.showOverlapModal) window.showOverlapModal({ obj, tType, tIdx, originalType, originalIdx, targetObjects }); } else { window.executeMove(obj, tType, tIdx); }
    };
}
if (bringFrontBtn) bringFrontBtn.onclick = () => window.moveTrackRelative(1, true);
if (bringForwardBtn) bringForwardBtn.onclick = () => window.moveTrackRelative(1, false);
if (sendBackwardBtn) sendBackwardBtn.onclick = () => window.moveTrackRelative(-1, false);
if (sendBackBtn) sendBackBtn.onclick = () => window.moveTrackRelative(-1, true);
if (btnApplyEffect) {
    btnApplyEffect.onclick = () => {
        const eff = propTransitionSelect.value; let applied = false;
        if (window.blueGuidelines && window.blueGuidelines.length) { const allObjs = [...canvas.getObjects(), ...audioTrackData]; allObjs.forEach(o => { window.blueGuidelines.forEach(g => { if (Math.abs((o.endTime || 5) - g.time) < 0.1) { o.transitionOut = eff; applied = true; } if (Math.abs((o.startTime || 0) - g.time) < 0.1) { o.transitionIn = eff; applied = true; } }); }); }
        if (applied) { window.showToast('파란선 기준 전환 효과가 적용되었습니다'); if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility(); } else { window.showToast('파란선을 클립 경계에 위치시키세요'); }
    };
}
if (btnApplyTrackEffect) {
    btnApplyTrackEffect.onclick = () => {
        const obj = window.lastSelectedObj; if (!obj) { window.showToast('기준이 될 트랙의 클립을 선택하세요'); return; }
        const type = obj.trackType || 'overlay'; const index = obj.trackIndex || 0; const eff = propTransitionSelect.value;
        let objs = type === 'audio' ? audioTrackData.filter(o => o.trackIndex === index) : canvas.getObjects().filter(o => (o.trackType || 'overlay') === type && (o.trackIndex || 0) === index);
        objs.sort((a, b) => (a.startTime || 0) - (b.startTime || 0)); let applied = false;
        for (let i = 0; i < objs.length - 1; i++) { const cur = objs[i]; const next = objs[i + 1]; if (Math.abs((cur.endTime || 5) - (next.startTime || 0)) < 0.2) { cur.transitionOut = eff; next.transitionIn = eff; applied = true; } }
        if (applied) { window.showToast('해당 트랙의 모든 컷에 효과가 적용되었습니다'); } else { window.showToast('적용할 수 있는 맞닿은 클립이 없습니다'); }
        if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
    };
}
if (btnAppendClip) { btnAppendClip.onclick = () => { if (window.pendingMove) { const pm = window.pendingMove; const obj = pm.obj; const maxEnd = Math.max(0, ...pm.targetObjects.map(o => o.endTime || 0)); const dur = (obj.endTime || 5) - (obj.startTime || 0); obj.startTime = maxEnd; obj.endTime = maxEnd + dur; window.executeMove(obj, pm.tType, pm.tIdx); } if (overlapModal) overlapModal.style.display = 'none'; window.pendingMove = null; }; }
if (btnCancelMove) { btnCancelMove.onclick = () => { if (window.pendingMove) { const pm = window.pendingMove; propTrackIndex.value = (pm.originalType || 'overlay') + '_' + (pm.originalIdx || 0); } if (overlapModal) overlapModal.style.display = 'none'; window.pendingMove = null; }; }
window.saveHistorySnapshot = function() {
    const snapshot = { canvasObjs: [...canvas.getObjects()], audioObjs: [...audioTrackData], props: new Map() };
    snapshot.canvasObjs.forEach(o => {
        snapshot.props.set(o, {
            left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, opacity: o.opacity,
            baseLeft: o.baseLeft, baseTop: o.baseTop, baseScaleX: o.baseScaleX, baseScaleY: o.baseScaleY, baseAngle: o.baseAngle, baseOpacity: o.baseOpacity, baseVolume: o.baseVolume,
            startTime: o.startTime, endTime: o.endTime, trimStart: o.trimStart, trackType: o.trackType, trackIndex: o.trackIndex, text: o.text
        });
    });
    snapshot.audioObjs.forEach(o => {
        snapshot.props.set(o, { startTime: o.startTime, endTime: o.endTime, trimStart: o.trimStart, trackType: o.trackType, trackIndex: o.trackIndex, baseVolume: o.baseVolume });
    });
    actionHistory.push(snapshot);
    const historyMax = window.ACTION_HISTORY_MAX || 10;
    if (actionHistory.length > historyMax) {
        const dropped = actionHistory.shift();
        window.MediaDispose?.disposeSnapshotOrphans?.(dropped);
    }
    redoHistory = []; // 새로운 작업 시 Redo 히스토리 초기화
};

function performRestore(snapshot) {
    const nextCanvas = new Set(snapshot.canvasObjs || []);
    const nextAudio = new Set(snapshot.audioObjs || []);
    canvas.getObjects().forEach(o => {
        if (o.isVideo && o.getElement()) o.getElement().pause();
        if (!nextCanvas.has(o) && !window.MediaDispose?.isReferencedInEditorHistory?.(o)) {
            window.MediaDispose?.disposeFabricClip?.(o, { full: true });
        }
    });
    audioTrackData.forEach(o => {
        if (o.audio) o.audio.pause();
        if (!nextAudio.has(o) && !window.MediaDispose?.isReferencedInEditorHistory?.(o)) {
            window.MediaDispose?.disposeAudioTrack?.(o, { full: true });
        }
    });

    canvas.clear();
    snapshot.canvasObjs.forEach(o => {
        const p = snapshot.props.get(o);
        if (p) o.set(p);
        canvas.add(o);
    });

    audioTrackData.length = 0;
    snapshot.audioObjs.forEach(o => {
        const p = snapshot.props.get(o);
        if (p) Object.assign(o, p);
        audioTrackData.push(o);
    });

    sortCanvasLayers(); 
    canvas.requestRenderAll(); 
    if (typeof window.renderTracks === 'function') window.renderTracks();
    if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
    window.updatePropertyPanel();
}

if (undoBtn) {
    undoBtn.onclick = () => {
        if (actionHistory.length === 0) { window.showToast('이전 작업이 없습니다'); return; }
        
        // 현재 상태를 임시로 저장하여 redoHistory에 넣음
        const currentSnapshot = { canvasObjs: [...canvas.getObjects()], audioObjs: [...audioTrackData], props: new Map() };
        currentSnapshot.canvasObjs.forEach(o => {
            currentSnapshot.props.set(o, {
                left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, opacity: o.opacity,
                baseLeft: o.baseLeft, baseTop: o.baseTop, baseScaleX: o.baseScaleX, baseScaleY: o.baseScaleY, baseAngle: o.baseAngle, baseOpacity: o.baseOpacity, baseVolume: o.baseVolume,
                startTime: o.startTime, endTime: o.endTime, trimStart: o.trimStart, trackType: o.trackType, trackIndex: o.trackIndex, text: o.text
            });
        });
        currentSnapshot.audioObjs.forEach(o => {
            currentSnapshot.props.set(o, { startTime: o.startTime, endTime: o.endTime, trimStart: o.trimStart, trackType: o.trackType, trackIndex: o.trackIndex, baseVolume: o.baseVolume });
        });
        redoHistory.push(currentSnapshot);

        const prevSnapshot = actionHistory.pop();
        performRestore(prevSnapshot);
        window.showToast('이전으로 되돌렸습니다');
    };
}

if (redoBtn) {
    redoBtn.onclick = () => {
        if (redoHistory.length === 0) { window.showToast('이후 작업이 없습니다'); return; }
        
        const currentSnapshot = { canvasObjs: [...canvas.getObjects()], audioObjs: [...audioTrackData], props: new Map() };
        currentSnapshot.canvasObjs.forEach(o => {
            currentSnapshot.props.set(o, {
                left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, opacity: o.opacity,
                baseLeft: o.baseLeft, baseTop: o.baseTop, baseScaleX: o.baseScaleX, baseScaleY: o.baseScaleY, baseAngle: o.baseAngle, baseOpacity: o.baseOpacity, baseVolume: o.baseVolume,
                startTime: o.startTime, endTime: o.endTime, trimStart: o.trimStart, trackType: o.trackType, trackIndex: o.trackIndex, text: o.text
            });
        });
        currentSnapshot.audioObjs.forEach(o => {
            currentSnapshot.props.set(o, { startTime: o.startTime, endTime: o.endTime, trimStart: o.trimStart, trackType: o.trackType, trackIndex: o.trackIndex, baseVolume: o.baseVolume });
        });
        actionHistory.push(currentSnapshot);

        const nextSnapshot = redoHistory.pop();
        performRestore(nextSnapshot);
        window.showToast('이후로 되돌렸습니다');
    };
}
if (deleteLayerBtn) {
    deleteLayerBtn.onclick = () => {
        const obj = canvas.getActiveObject() || window.lastSelectedObj;
        if (obj) {
            window.saveHistorySnapshot();
            if (obj.trackType === 'audio') {
                const idx = audioTrackData.indexOf(obj);
                if (idx > -1) {
                    if (obj.audio) obj.audio.pause();
                    audioTrackData.splice(idx, 1);
                }
            } else {
                if (obj.isVideo && obj.getElement()) obj.getElement().pause();
                canvas.remove(obj);
                canvas.discardActiveObject();
            }
            window.lastSelectedObj = null; if (typeof window.renderTracks === 'function') window.renderTracks(); window.updatePropertyPanel(); window.showToast('삭제 완료');
        }
    };
}

if (resetClipBtn) { resetClipBtn.onclick = () => { const obj = window.lastSelectedObj; if (!obj) { window.showToast('초기화할 클립을 선택하세요'); return; } window.resetClipData(obj); if (typeof window.renderTracks === 'function') window.renderTracks(); if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility(); window.updatePropertyPanel(obj); window.showToast('클립이 초기화되었습니다'); }; }
if (resetTrackBtn) { resetTrackBtn.onclick = () => { const obj = window.lastSelectedObj; if (!obj) { window.showToast('기준 클립을 선택하세요'); return; } const trackType = obj.trackType || 'overlay'; const trackIndex = obj.trackIndex || 0; let objs = trackType === 'audio' ? audioTrackData.filter(o => o.trackIndex === trackIndex) : canvas.getObjects().filter(o => (o.trackType || 'overlay') === trackType && (o.trackIndex || 0) === trackIndex); objs.forEach(o => window.resetClipData(o)); if (typeof window.renderTracks === 'function') window.renderTracks(); if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility(); window.updatePropertyPanel(obj); window.showToast('해당 트랙이 모두 초기화되었습니다'); }; }
if (alignLeftBtn) { alignLeftBtn.onclick = () => { const obj = canvas.getActiveObject(); if (obj && obj.type === 'i-text') { window.saveHistorySnapshot(); obj.set('textAlign', 'left'); canvas.requestRenderAll(); } }; }
if (alignCenterBtn) { alignCenterBtn.onclick = () => { const obj = canvas.getActiveObject(); if (obj && obj.type === 'i-text') { window.saveHistorySnapshot(); obj.set('textAlign', 'center'); canvas.requestRenderAll(); } }; }
if (alignRightBtn) { alignRightBtn.onclick = () => { const obj = canvas.getActiveObject(); if (obj && obj.type === 'i-text') { window.saveHistorySnapshot(); obj.set('textAlign', 'right'); canvas.requestRenderAll(); } }; }
const fontNormalBtn = document.getElementById('fontNormalBtn');
const fontBoldBtn = document.getElementById('fontBoldBtn');
const fontItalicBtn = document.getElementById('fontItalicBtn');
if (fontNormalBtn) {
    fontNormalBtn.onclick = () => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === 'i-text') {
            window.saveHistorySnapshot();
            if (obj.isEditing) {
                obj.setSelectionStyles({ fontWeight: 'normal', fontStyle: 'normal' });
            } else {
                obj.set({ fontWeight: 'normal', fontStyle: 'normal' });
            }
            canvas.requestRenderAll();
            if (window.updatePropertyPanel) window.updatePropertyPanel(obj);
        }
    };
}
if (fontBoldBtn) {
    fontBoldBtn.onclick = () => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === 'i-text') {
            window.saveHistorySnapshot();
            let currentVal = '';
            if (obj.isEditing) {
                const styles = obj.getSelectionStyles();
                currentVal = (styles.length > 0 && styles[0]) ? (styles[0].fontWeight || 'normal') : (obj.fontWeight || 'normal');
            } else {
                currentVal = obj.fontWeight || 'normal';
            }
            const nextVal = (currentVal === 'bold') ? 'normal' : 'bold';
            
            if (obj.isEditing) {
                obj.setSelectionStyles({ fontWeight: nextVal });
            } else {
                obj.set({ fontWeight: nextVal });
            }
            canvas.requestRenderAll();
            if (window.updatePropertyPanel) window.updatePropertyPanel(obj);
        }
    };
}
if (fontItalicBtn) {
    fontItalicBtn.onclick = () => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === 'i-text') {
            window.saveHistorySnapshot();
            let currentVal = '';
            if (obj.isEditing) {
                const styles = obj.getSelectionStyles();
                currentVal = (styles.length > 0 && styles[0]) ? (styles[0].fontStyle || 'normal') : (obj.fontStyle || 'normal');
            } else {
                currentVal = obj.fontStyle || 'normal';
            }
            const nextVal = (currentVal === 'italic') ? 'normal' : 'italic';
            
            if (obj.isEditing) {
                obj.setSelectionStyles({ fontStyle: nextVal });
            } else {
                obj.set({ fontStyle: nextVal });
            }
            canvas.requestRenderAll();
            if (window.updatePropertyPanel) window.updatePropertyPanel(obj);
        }
    };
}
if (savePresetBtn) {
    savePresetBtn.onclick = () => {
        const obj = canvas.getActiveObject();
        if (!obj || obj.type !== 'i-text') {
            window.showToast('자막을 선택하세요');
            return;
        }
        const name = presetNameInput.value.trim();
        if (!name) {
            window.showToast('프리셋 이름을 입력하세요');
            return;
        }
        const bOp = obj.baseOpacity !== undefined ? obj.baseOpacity : obj.opacity;
        const bSx = obj.baseScaleX !== undefined ? obj.baseScaleX : obj.scaleX;
        const bSy = obj.baseScaleY !== undefined ? obj.baseScaleY : obj.scaleY;
        const bAng = obj.baseAngle !== undefined ? obj.baseAngle : obj.angle;
        const bL = obj.baseLeft !== undefined ? obj.baseLeft : obj.left;
        const bT = obj.baseTop !== undefined ? obj.baseTop : obj.top;
        
        subtitlePresets[name] = {
            text: obj.text,
            fontFamily: obj.fontFamily,
            fontSize: obj.fontSize,
            fill: obj.fill,
            charSpacing: obj.charSpacing,
            strokeWidth: obj.strokeWidth,
            stroke: obj.stroke,
            lineHeight: obj.lineHeight,
            fontWeight: obj.fontWeight,
            fontStyle: obj.fontStyle,
            textAlign: obj.textAlign,
            left: bL,
            top: bT,
            angle: bAng,
            scaleX: bSx,
            scaleY: bSy,
            opacity: bOp,
            baseLeft: bL,
            baseTop: bT,
            baseAngle: bAng,
            baseScaleX: bSx,
            baseScaleY: bSy,
            baseOpacity: bOp,
            shadow: obj.shadow ? {
                blur: obj.shadow.blur,
                color: obj.shadow.color,
                offsetX: obj.shadow.offsetX,
                offsetY: obj.shadow.offsetY
            } : null,
            styles: obj.styles ? JSON.parse(JSON.stringify(obj.styles)) : null
        };
        localStorage.setItem('subtitlePresets', JSON.stringify(subtitlePresets));
        refreshPresetList();
        presetSelect.value = name;
        window.showToast('프리셋 저장 완료');
    };
}
if (loadPresetBtn) {
    loadPresetBtn.onclick = () => {
        const obj = canvas.getActiveObject();
        if (!obj || obj.type !== 'i-text') {
            window.showToast('자막을 선택하세요');
            return;
        }
        const name = presetSelect.value;
        if (!name || !subtitlePresets[name]) {
            window.showToast('프리셋을 선택하세요');
            return;
        }
        window.saveHistorySnapshot();
        const p = subtitlePresets[name];
        const bOp = p.baseOpacity !== undefined ? p.baseOpacity : (p.opacity ? p.opacity : 1);
        const bSx = p.baseScaleX !== undefined ? p.baseScaleX : (p.scaleX !== undefined ? p.scaleX : 1);
        const bSy = p.baseScaleY !== undefined ? p.baseScaleY : (p.scaleY !== undefined ? p.scaleY : 1);
        const bAng = p.baseAngle !== undefined ? p.baseAngle : (p.angle !== undefined ? p.angle : 0);
        const bL = p.baseLeft !== undefined ? p.baseLeft : (p.left !== undefined ? p.left : obj.left);
        const bT = p.baseTop !== undefined ? p.baseTop : (p.top !== undefined ? p.top : obj.top);
        
        obj.set({
            text: p.text !== undefined ? p.text : obj.text,
            styles: p.styles ? JSON.parse(JSON.stringify(p.styles)) : {},
            fontFamily: p.fontFamily,
            fontSize: p.fontSize,
            fill: p.fill,
            charSpacing: p.charSpacing,
            strokeWidth: p.strokeWidth,
            stroke: p.stroke,
            lineHeight: p.lineHeight,
            fontWeight: p.fontWeight || 'normal',
            fontStyle: p.fontStyle || 'normal',
            textAlign: p.textAlign || 'left',
            opacity: bOp,
            baseOpacity: bOp,
            scaleX: bSx,
            baseScaleX: bSx,
            scaleY: bSy,
            baseScaleY: bSy,
            angle: bAng,
            baseAngle: bAng,
            left: bL,
            baseLeft: bL,
            top: bT,
            baseTop: bT
        });
        if (p.shadow) {
            obj.set('shadow', new fabric.Shadow({
                blur: p.shadow.blur !== undefined ? p.shadow.blur : 0,
                offsetX: p.shadow.offsetX !== undefined ? p.shadow.offsetX : (p.shadow.blur || 0),
                offsetY: p.shadow.offsetY !== undefined ? p.shadow.offsetY : (p.shadow.blur || 0),
                color: p.shadow.color
            }));
        } else {
            obj.set('shadow', null);
        }
        canvas.requestRenderAll();
        if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
        window.updatePropertyPanel(obj);
        window.showToast('프리셋 적용 완료');
    };
}
if (deletePresetBtn) { deletePresetBtn.onclick = () => { const name = presetSelect.value; if (!name) return; delete subtitlePresets[name]; localStorage.setItem('subtitlePresets', JSON.stringify(subtitlePresets)); refreshPresetList(); window.showToast('프리셋 삭제 완료'); }; }
if (bgBtn) bgBtn.onclick = () => { if (bgInput) bgInput.value = ''; bgInput.click(); };
if (videoBtn) videoBtn.onclick = () => { if (videoInput) videoInput.value = ''; videoInput.click(); };
if (imageBtn) imageBtn.onclick = () => { if (imageInput) imageInput.value = ''; imageInput.click(); };
if (audioBtn) audioBtn.onclick = () => { if (audioInput) audioInput.value = ''; audioInput.click(); };

function pickFirstSupportedMime(candidates) {
    for (const mimeType of candidates) {
        if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    }
    return null;
}

function pickVideoExportMimeType(format, hasAudio) {
    if (format === 'mp4') {
        const withAudio = [
            'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs="avc1,mp4a.40.2"',
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4;codecs=avc1,mp4a',
        ];
        const videoOnly = [
            'video/mp4;codecs="avc1.42E01E"',
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4;codecs=avc1',
            'video/mp4',
        ];
        const mimeType = pickFirstSupportedMime(hasAudio ? [...withAudio, ...videoOnly] : videoOnly);
        if (mimeType) return { mimeType, ext: 'mp4', blobType: 'video/mp4' };
        return null;
    }
    const webmCandidates = hasAudio
        ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=opus,vp8', 'video/webm']
        : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = pickFirstSupportedMime(webmCandidates) || 'video/webm';
    return { mimeType, ext: 'webm', blobType: 'video/webm' };
}

const videoExportBtn = document.getElementById('videoExportBtn');
const videoExportPauseBtn = document.getElementById('videoExportPauseBtn');
const videoExportCancelBtn = document.getElementById('videoExportCancelBtn');

function clearTimelineClipSelectionForExport() {
    if (typeof window.deselectBlueGuideline === 'function') window.deselectBlueGuideline();
    if (canvas) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }
    window.lastSelectedObj = null;
    document.querySelectorAll('.track-bar.selected').forEach((bar) => bar.classList.remove('selected'));
    if (typeof window.updatePropertyPanel === 'function') window.updatePropertyPanel();
}

function waitExportMediaReady(el) {
    return new Promise(resolve => {
        if (el.readyState >= 3) { resolve(); return; }
        const done = () => { el.removeEventListener('canplaythrough', done); el.removeEventListener('error', done); resolve(); };
        el.addEventListener('canplaythrough', done);
        el.addEventListener('error', done);
        setTimeout(done, 4000);
    });
}

function applyExportMediaCrossOrigin(el, src) {
    if (!el || !src || typeof src !== 'string') return;
    if (src.startsWith('blob:') || src.startsWith('data:')) return;
    el.crossOrigin = 'anonymous';
}

function attachExportMediaLoopRecovery(el, getLocalTime) {
    if (!el) return;
    el.loop = true;
    el.addEventListener('ended', () => {
        const session = window.videoExportSession;
        if (!session || session.cancelled || session.paused) return;
        try {
            const t = getLocalTime();
            el.currentTime = Math.max(0, t);
            const p = el.play();
            if (p !== undefined) p.catch(() => {});
        } catch (_) { /* noop */ }
    });
}

/** 녹화용·스피커용 Gain 분리 (녹화 스트림 누락 방지) */
function createExportGainPair(audioCtx, recordDest) {
    const recordGain = audioCtx.createGain();
    const monitorGain = audioCtx.createGain();
    recordGain.gain.value = 0;
    monitorGain.gain.value = 0;
    recordGain.connect(recordDest);
    monitorGain.connect(audioCtx.destination);
    return { recordGain, monitorGain };
}

function setExportClipGains(wired, baseVol, start, end, tIn, tOut) {
    const vol = baseVol !== undefined ? baseVol : 1;
    const active = currentTime >= (start - tIn) && currentTime <= (end + tOut);
    let mix = 0;
    if (active) {
        mix = vol;
        if (tIn > 0 && currentTime < start) {
            mix *= Math.max(0, Math.min(1, (currentTime - (start - tIn)) / tIn));
        }
        if (tOut > 0 && currentTime > end) {
            mix *= Math.max(0, Math.min(1, 1 - (currentTime - end) / tOut));
        }
    }
    if (wired.gain) wired.gain.gain.value = mix;
    if (wired.monitorGain) wired.monitorGain.gain.value = mix;
}

/** 타임라인 오디오/비디오 요소를 Web Audio에 직접 연결 (복제 디코더 없음) */
async function wireExportAudioTrack(track, audioCtx, dest) {
    if (!track?.audio?.src) return null;
    const el = track.audio;
    if (el.__exportWired) return null;
    applyExportMediaCrossOrigin(el, el.src);
    el.loop = true;
    el.muted = false;
    await waitExportMediaReady(el);
    attachExportMediaLoopRecovery(el, () => {
        const tIn = track.transitionIn ? 0.25 : 0;
        const tOut = track.transitionOut ? 0.25 : 0;
        if (currentTime < (track.startTime - tIn) || currentTime > (track.endTime + tOut)) return 0;
        return Math.max(0, currentTime - track.startTime + (track.trimStart || 0));
    });
    const source = audioCtx.createMediaElementSource(el);
    const { recordGain, monitorGain } = createExportGainPair(audioCtx, dest);
    source.connect(recordGain);
    source.connect(monitorGain);
    el.__exportWired = true;
    return { track, el, gain: recordGain, monitorGain, source, timelineOwned: true };
}

async function wireExportVideoAudio(obj, videoEl, audioCtx, dest) {
    const src = videoEl.src || videoEl.currentSrc;
    if (!src) return null;
    const el = videoEl;
    if (el.__exportWired) return null;
    applyExportMediaCrossOrigin(el, src);
    if (!el.crossOrigin && videoEl.crossOrigin) el.crossOrigin = videoEl.crossOrigin;
    el.loop = true;
    await waitExportMediaReady(el);
    attachExportMediaLoopRecovery(el, () => {
        const tIn = obj.transitionIn ? 0.25 : 0;
        const tOut = obj.transitionOut ? 0.25 : 0;
        if (currentTime < (obj.startTime - tIn) || currentTime > (obj.endTime + tOut)) return 0;
        let actualTime = currentTime - obj.startTime + (obj.trimStart || 0);
        if (actualTime < 0) actualTime = 0;
        const inherent = obj.inherentDuration || el.duration || 1;
        return (actualTime % inherent) * (obj.playbackRate || 1);
    });
    const source = audioCtx.createMediaElementSource(el);
    const { recordGain, monitorGain } = createExportGainPair(audioCtx, dest);
    source.connect(recordGain);
    source.connect(monitorGain);
    el.__exportWired = true;
    return { obj, el, gain: recordGain, monitorGain, source, timelineOwned: true };
}

function restoreTimelineAudioAfterExport(track, prevEl) {
    if (!track) return;
    const src = prevEl?.src || track.audio?.src || '';
    const vol = prevEl?.volume ?? track.baseVolume ?? 1;
    const fresh = new Audio();
    applyExportMediaCrossOrigin(fresh, src);
    fresh.preload = 'auto';
    fresh.src = src;
    fresh.volume = vol;
    track.audio = fresh;
}

function restoreTimelineVideoAfterExport(el) {
    if (!el) return;
    const src = el.src || el.currentSrc || '';
    try {
        el.pause();
        el.removeAttribute('src');
        el.load();
        if (src) {
            el.src = src;
            el.load();
        }
    } catch (_) { /* noop */ }
    delete el.__exportWired;
}

async function primeExportRecordingPlayback(session) {
    if (!session) return;
    try {
        if (session.audioCtx?.state === 'suspended') await session.audioCtx.resume();
    } catch (e) { console.warn('Export AudioContext resume failed', e); }
    if (typeof window.syncExportRecordingMedia === 'function') window.syncExportRecordingMedia();
    if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
}

/** 렌더 시작: 타임라인 재생을 확실히 켠 뒤 오디오 그래프가 살아날 때까지 대기 */
async function startExportTimelinePlayback(session) {
    currentTime = 0;
    previewTime = 0;
    timelineScrollX = 0;
    isTimelinePlaying = true;
    lastFrameTime = performance.now();
    const playBtn = document.getElementById('timelinePlayBtn');
    if (playBtn) playBtn.textContent = '⏸';

    if (typeof window.syncExportRecordingMedia === 'function') window.syncExportRecordingMedia();
    if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
    if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();

    const playTasks = [];
    (session?.audios || []).forEach(({ track, el }) => {
        const tIn = track.transitionIn ? 0.25 : 0;
        const tOut = track.transitionOut ? 0.25 : 0;
        if (currentTime >= (track.startTime - tIn) && currentTime <= (track.endTime + tOut)) {
            el.currentTime = Math.max(0, currentTime - track.startTime + (track.trimStart || 0));
            playTasks.push(el.play().catch(() => {}));
        }
    });
    await Promise.all(playTasks);

    await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (typeof window.syncExportRecordingMedia === 'function') window.syncExportRecordingMedia();
    if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
    await new Promise((resolve) => setTimeout(resolve, 120));
}

let exportWakeLock = null;

async function acquireExportWakeLock() {
    if (!navigator.wakeLock?.request) return;
    try {
        exportWakeLock = await navigator.wakeLock.request('screen');
        exportWakeLock.addEventListener('release', () => { exportWakeLock = null; });
    } catch (e) { /* ignore */ }
}

async function releaseExportWakeLock() {
    if (!exportWakeLock) return;
    try { await exportWakeLock.release(); } catch (e) { /* ignore */ }
    exportWakeLock = null;
}

async function probeVideoFileDuration(videoElt, options = {}) {
    if (window.MediaDuration?.probeVideoElement) {
        return window.MediaDuration.probeVideoElement(videoElt, {
            preferSeekProbe: true,
            ...options
        });
    }
    const d = Number(videoElt.duration);
    return Number.isFinite(d) && d > 0 ? d : (options.fallbackSec || 5);
}

function pauseAllTimelinePreviewMedia() {
    if (typeof audioTrackData !== 'undefined') {
        audioTrackData.forEach((track) => {
            if (track.audio && !track.audio.paused) track.audio.pause();
        });
    }
    if (canvas) {
        canvas.getObjects().forEach((obj) => {
            if (obj.isVideo && obj.getElement() && !obj.getElement().paused) {
                obj.getElement().pause();
            }
        });
    }
}

async function loadVideoFileMeta(url, videoElt, options = {}) {
    videoElt.src = url;
    videoElt.playsInline = true;
    videoElt.crossOrigin = 'anonymous';
    videoElt.load();
    await new Promise(res => {
        videoElt.onloadedmetadata = res;
        videoElt.onerror = res;
    });
    const duration = await probeVideoFileDuration(videoElt, options);
    let thumbUrl = '';
    if (duration > 0) {
        videoElt.currentTime = Math.min(0.5, duration / 2);
        await new Promise(res => {
            videoElt.onseeked = () => { videoElt.onseeked = null; res(); };
            setTimeout(res, 2000);
        });
        try {
            const tc = document.createElement('canvas');
            tc.width = 160;
            tc.height = 90;
            tc.getContext('2d').drawImage(videoElt, 0, 0, 160, 90);
            thumbUrl = tc.toDataURL();
        } catch (err) { /* ignore */ }
        videoElt.currentTime = 0;
    }
    videoElt.width = videoElt.videoWidth || 1920;
    videoElt.height = videoElt.videoHeight || 1080;
    return { duration, thumbUrl };
}

function setVideoExportPaused(paused) {
    const session = window.videoExportSession;
    if (!session || session.cancelled || paused === session.paused) return;
    const playBtn = document.getElementById('timelinePlayBtn');
    if (paused) {
        const canPauseRecorder = typeof session.recorder.pause === 'function' && session.recorder.state === 'recording';
        if (!canPauseRecorder) {
            window.showToast('이 브라우저는 렌더링 보류를 지원하지 않습니다. [렌더링 취소]를 사용하세요.');
            return;
        }
        session.paused = true;
        session.audios.forEach(({ el }) => el.pause());
        session.videos.forEach(({ el }) => el.pause());
        pauseAllTimelinePreviewMedia();
        try { session.recorder.pause(); } catch (e) { session.paused = false; return; }
        isTimelinePlaying = false;
        if (playBtn) playBtn.textContent = '▶';
        if (videoExportPauseBtn) {
            videoExportPauseBtn.textContent = '▶';
            videoExportPauseBtn.title = '렌더링 재개';
        }
        window.showToast('렌더링 보류');
    } else {
        session.paused = false;
        if (typeof session.recorder.resume === 'function' && session.recorder.state === 'paused') {
            try { session.recorder.resume(); } catch (e) {}
        }
        isTimelinePlaying = true;
        lastFrameTime = performance.now();
        if (playBtn) playBtn.textContent = '⏸';
        if (videoExportPauseBtn) {
            videoExportPauseBtn.textContent = '⏸';
            videoExportPauseBtn.title = '렌더링 보류';
        }
        primeExportRecordingPlayback(session).then(() => {
            window.showToast('렌더링 재개');
        });
    }
}

function stopExportRecorderGracefully(session) {
    if (!session || session.stopping) return;
    session.stopping = true;
    session.exportPlaying = false;
    const finalize = () => {
        try {
            const rec = session.recorder;
            if (!rec) return;
            if (typeof rec.requestData === 'function' && rec.state === 'recording') {
                try { rec.requestData(); } catch (_) { /* noop */ }
            }
            if (rec.state === 'recording' || rec.state === 'paused') rec.stop();
        } catch (e) {
            console.error('Export recorder stop failed', e);
            finishVideoExportSession(false).catch(() => {});
        }
    };
    setTimeout(finalize, 280);
}

window.syncExportRecordingMedia = function () {
    const session = window.videoExportSession;
    if (!session || session.cancelled || session.paused) return;
    if (session.audioCtx?.state === 'suspended') {
        session.audioCtx.resume().catch(() => {});
    }
    const drift = 0.45;
    session.audios.forEach((wired) => {
        const { track, el } = wired;
        const start = track.startTime || 0;
        const end = track.endTime || 5;
        const tIn = track.transitionIn ? 0.25 : 0;
        const tOut = track.transitionOut ? 0.25 : 0;
        setExportClipGains(wired, track.baseVolume, start, end, tIn, tOut);
        const active = currentTime >= (start - tIn) && currentTime <= (end + tOut);
        if (active && isTimelinePlaying) {
            const localTime = Math.max(0, currentTime - start + (track.trimStart || 0));
            if (el.paused) {
                el.currentTime = localTime;
                el.play().catch(() => {});
            } else if (Math.abs(el.currentTime - localTime) > drift) {
                el.currentTime = localTime;
            }
        } else if (!el.paused) {
            el.pause();
        }
    });
    session.videos.forEach((wired) => {
        const { obj, el } = wired;
        const start = obj.startTime || 0;
        const end = obj.endTime || 5;
        const tIn = obj.transitionIn ? 0.25 : 0;
        const tOut = obj.transitionOut ? 0.25 : 0;
        setExportClipGains(wired, obj.baseVolume, start, end, tIn, tOut);
        const active = currentTime >= (start - tIn) && currentTime <= (end + tOut);
        if (active && isTimelinePlaying) {
            let actualTime = currentTime - start + (obj.trimStart || 0);
            if (actualTime < 0) actualTime = 0;
            const inherent = obj.inherentDuration || el.duration || 1;
            const loopedTime = (actualTime % inherent) * (obj.playbackRate || 1);
            el.playbackRate = obj.playbackRate || 1;
            if (el.paused) {
                el.currentTime = loopedTime;
                el.play().catch(() => {});
            } else if (Math.abs(el.currentTime - loopedTime) > drift) {
                el.currentTime = loopedTime;
            }
        } else if (!el.paused) {
            el.pause();
        }
    });
};

async function finishVideoExportSession(downloadFile) {
    const session = window.videoExportSession;
    if (!session) return;
    clearInterval(session.checkInterval);
    window.isExportRecording = false;
    window.videoExportSession = null;
    await releaseExportWakeLock();

    const playBtn = document.getElementById('timelinePlayBtn');
    if (playBtn && isTimelinePlaying) {
        isTimelinePlaying = false;
        playBtn.textContent = '▶';
    }

    session.audios.forEach((wired) => {
        const { track, el, gain, monitorGain, source, timelineOwned } = wired;
        try { source?.disconnect(); gain?.disconnect(); monitorGain?.disconnect(); } catch (e) { /* noop */ }
        if (timelineOwned) {
            restoreTimelineAudioAfterExport(track, el);
        } else {
            try { el.pause(); el.src = ''; } catch (e) { /* noop */ }
        }
    });
    session.videos.forEach((wired) => {
        const { el, gain, monitorGain, source, timelineOwned } = wired;
        try { source?.disconnect(); gain?.disconnect(); monitorGain?.disconnect(); } catch (e) { /* noop */ }
        if (timelineOwned) {
            restoreTimelineVideoAfterExport(el);
        } else {
            try { el.pause(); el.src = ''; } catch (e) { /* noop */ }
        }
    });
    pauseAllTimelinePreviewMedia();
    session.mutedRestore.forEach(({ el, muted }) => { try { el.muted = muted; } catch (e) {} });

    const audioCtx = session.audioCtx;
    const stopBtn = document.getElementById('timelineStopBtn');
    if (stopBtn) stopBtn.click();

    if (audioCtx) {
        setTimeout(() => {
            try { audioCtx.close(); } catch (e) { /* noop */ }
        }, 120);
    }

    videoExportBtn.disabled = false;
    videoExportBtn.textContent = '🎬 동영상 렌더링';
    videoExportBtn.style.background = '#e11d48';
    if (videoExportPauseBtn) { videoExportPauseBtn.hidden = true; videoExportPauseBtn.textContent = '⏸'; }
    if (videoExportCancelBtn) videoExportCancelBtn.hidden = true;

    if (downloadFile && session.chunks.length > 0 && !session.cancelled) {
        let blob = new Blob(session.chunks, { type: session.blobType });
        if (session.ext === 'webm' && session.maxTime > 0 && window.MediaDuration?.repairWebmBlobDuration) {
            blob = await window.MediaDuration.repairWebmBlobDuration(blob, session.maxTime);
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `export_video.${session.ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            window.showToast(`동영상 저장 완료 (${session.ext.toUpperCase()})`);
        }, 100);
    } else if (session.cancelled) {
        window.showToast('렌더링이 취소되었습니다.');
    }
}

if (videoExportPauseBtn) {
    videoExportPauseBtn.onclick = () => {
        const session = window.videoExportSession;
        if (!session || session.cancelled) return;
        setVideoExportPaused(!session.paused);
    };
}

document.addEventListener('visibilitychange', () => {
    const session = window.videoExportSession;
    if (!session || session.cancelled || session.paused) return;
    if (session.audioCtx?.state === 'suspended') {
        session.audioCtx.resume().catch(() => {});
    }
    if (document.visibilityState === 'visible') {
        acquireExportWakeLock();
        if (typeof window.syncExportRecordingMedia === 'function') window.syncExportRecordingMedia();
    }
});

if (videoExportCancelBtn) {
    videoExportCancelBtn.onclick = () => {
        const session = window.videoExportSession;
        if (!session) return;
        session.cancelled = true;
        session.exportPlaying = false;
        if (session.recorder && session.recorder.state !== 'inactive') {
            stopExportRecorderGracefully(session);
        } else {
            finishVideoExportSession(false);
        }
    };
}

function resetVideoExportButtonIdle() {
    if (!videoExportBtn) return;
    videoExportBtn.disabled = false;
    videoExportBtn.textContent = '🎬 동영상 렌더링';
    videoExportBtn.style.background = '#e11d48';
}

function teardownExportWireArtifacts(audioCtx, exportAudios, exportVideos, mutedRestore) {
    (exportAudios || []).forEach((wired) => {
        const { track, el, gain, monitorGain, source, timelineOwned } = wired;
        try { source?.disconnect(); gain?.disconnect(); monitorGain?.disconnect(); } catch (e) { /* noop */ }
        if (timelineOwned) {
            restoreTimelineAudioAfterExport(track, el);
        } else {
            try { el.pause(); el.src = ''; } catch (e) { /* noop */ }
        }
    });
    (exportVideos || []).forEach((wired) => {
        const { el, gain, monitorGain, source, timelineOwned } = wired;
        try { source?.disconnect(); gain?.disconnect(); monitorGain?.disconnect(); } catch (e) { /* noop */ }
        if (timelineOwned) {
            restoreTimelineVideoAfterExport(el);
        } else {
            try { el.pause(); el.src = ''; } catch (e) { /* noop */ }
        }
    });
    (mutedRestore || []).forEach(({ el, muted }) => { try { el.muted = muted; } catch (e) { /* noop */ } });
    if (audioCtx) {
        try { audioCtx.close(); } catch (e) { /* noop */ }
    }
}

if (videoExportBtn) {
    videoExportBtn.onclick = async () => {
        if (window.videoExportSession) {
            window.showToast('이미 렌더링 중입니다.');
            return;
        }

        clearTimelineClipSelectionForExport();

        videoExportBtn.disabled = true;
        videoExportBtn.textContent = '준비 중...';
        window.showToast('동영상 렌더링을 준비 중입니다...');

        let exportAudios = [];
        let exportVideos = [];
        let mutedRestore = [];
        let audioCtx = null;

        try {
        const stopBtn = document.getElementById('timelineStopBtn');
        if (stopBtn) stopBtn.click();

        let maxTime = 0;
        const clipEnd = (o) => (o.endTime || 5) + (o.transitionOut ? 0.25 : 0);
        canvas.getObjects().forEach(o => { if (clipEnd(o) > maxTime) maxTime = clipEnd(o); });
        audioTrackData.forEach(o => { if (clipEnd(o) > maxTime) maxTime = clipEnd(o); });

        if (maxTime === 0) {
            window.showToast('저장할 클립이 없습니다.');
            resetVideoExportButtonIdle();
            return;
        }

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        let hasAudio = false;

        try {
            if (audioCtx.state === 'suspended') await audioCtx.resume();
        } catch (e) { console.warn('AudioContext resume failed', e); }

        const audioWireResults = await Promise.all(
            audioTrackData.map((track) =>
                wireExportAudioTrack(track, audioCtx, dest).catch((e) => {
                    console.warn('Export audio track failed', e);
                    return null;
                })
            )
        );
        audioWireResults.forEach((wired) => {
            if (!wired) return;
            exportAudios.push(wired);
            hasAudio = true;
        });

        const videoWireResults = await Promise.all(
            canvas.getObjects()
                .filter((obj) => obj.isVideo && obj.getElement())
                .map(async (obj) => {
                    const videoEl = obj.getElement();
                    try {
                        mutedRestore.push({ el: videoEl, muted: videoEl.muted });
                        videoEl.muted = true;
                        return await wireExportVideoAudio(obj, videoEl, audioCtx, dest);
                    } catch (e) {
                        console.warn('Export video audio failed', e);
                        return null;
                    }
                })
        );
        videoWireResults.forEach((wired) => {
            if (!wired) return;
            exportVideos.push(wired);
            hasAudio = true;
        });

        const audioClipCount = audioTrackData.filter((t) => t.audio?.src).length;
        const videoAudioCount = canvas.getObjects().filter((o) => o.isVideo && o.getElement()?.src).length;
        if ((audioClipCount + videoAudioCount) > 0 && !hasAudio) {
            window.showToast('오디오를 녹화 파이프에 연결하지 못했습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
            teardownExportWireArtifacts(audioCtx, exportAudios, exportVideos, mutedRestore);
            resetVideoExportButtonIdle();
            return;
        }

        const canvasStream = canvas.getElement().captureStream(60);
        const combinedTracks = [...canvasStream.getVideoTracks()];
        const audioTracks = dest.stream.getAudioTracks();
        const useExportAudio = hasAudio && audioTracks.length > 0;
        if (useExportAudio) {
            audioTracks.forEach((t) => { t.enabled = true; });
            combinedTracks.push(...audioTracks);
        } else if (hasAudio) {
            window.showToast('오디오 트랙을 녹화 스트림에 합치지 못했습니다. WebM으로 다시 시도해 주세요.');
            teardownExportWireArtifacts(audioCtx, exportAudios, exportVideos, mutedRestore);
            resetVideoExportButtonIdle();
            return;
        }
        const combinedStream = new MediaStream(combinedTracks);

        const formatSelect = document.getElementById('exportFormatSelect');
        const selectedFormat = formatSelect ? formatSelect.value : 'webm';
        let exportMime = pickVideoExportMimeType(selectedFormat, useExportAudio);

        if (!exportMime) {
            window.showToast('이 브라우저는 MP4(H.264+AAC) 녹화를 지원하지 않아 WebM으로 저장됩니다.');
            exportMime = pickVideoExportMimeType('webm', useExportAudio);
        }
        if (useExportAudio && exportMime && !exportMime.mimeType.includes('opus') && !exportMime.mimeType.includes('mp4a') && !exportMime.mimeType.includes('aac')) {
            const webmAudio = pickVideoExportMimeType('webm', true);
            if (webmAudio) {
                window.showToast('선택 형식에 오디오 코덱이 없어 WebM(Opus)으로 저장합니다.');
                exportMime = webmAudio;
            }
        }
        if (!exportMime) {
            teardownExportWireArtifacts(audioCtx, exportAudios, exportVideos, mutedRestore);
            window.showToast('지원되는 녹화 형식이 없습니다. WebM으로 다시 시도해 주세요.');
            resetVideoExportButtonIdle();
            return;
        }
        if (useExportAudio && !exportMime.mimeType.includes('opus') && !exportMime.mimeType.includes('mp4a') && !exportMime.mimeType.includes('aac')) {
            teardownExportWireArtifacts(audioCtx, exportAudios, exportVideos, mutedRestore);
            window.showToast('오디오를 포함한 녹화 코덱을 찾지 못했습니다. WebM 형식을 선택해 주세요.');
            resetVideoExportButtonIdle();
            return;
        }

        const { mimeType, ext, blobType } = exportMime;
        const recorderOptions = { mimeType };
        if (useExportAudio) recorderOptions.audioBitsPerSecond = 128000;
        recorderOptions.videoBitsPerSecond = 15000000;

        let recorder;
        try {
            recorder = new MediaRecorder(combinedStream, recorderOptions);
        } catch (e) {
            console.error('MediaRecorder init failed', e);
            teardownExportWireArtifacts(audioCtx, exportAudios, exportVideos, mutedRestore);
            window.showToast('녹화 코덱을 초기화하지 못했습니다. WebM으로 다시 시도해 주세요.');
            resetVideoExportButtonIdle();
            return;
        }

        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onerror = e => console.error('MediaRecorder error', e.error || e);
        recorder.onstop = () => {
            const download = session && !session.cancelled;
            finishVideoExportSession(download).catch(e => console.error('Export finish failed', e));
        };

        const session = {
            recorder, audioCtx, audios: exportAudios, videos: exportVideos, mutedRestore,
            chunks, ext, blobType, maxTime, cancelled: false, paused: false, exportPlaying: true,
            checkInterval: null
        };
        window.videoExportSession = session;
        window.isExportRecording = true;
        acquireExportWakeLock();

        await startExportTimelinePlayback(session);
        await primeExportRecordingPlayback(session);

        recorder.start(100);

        window.showToast('렌더링 진행 중... (실시간 녹화 중)');
        videoExportBtn.disabled = true;
        videoExportBtn.textContent = '녹화 중...';
        videoExportBtn.style.background = '#000';
        if (videoExportPauseBtn) videoExportPauseBtn.hidden = false;
        if (videoExportCancelBtn) videoExportCancelBtn.hidden = false;

        session.checkInterval = setInterval(() => {
            if (session.cancelled || session.stopping) return;
            if (!session.paused && session.exportPlaying && currentTime >= session.maxTime - 0.02) {
                stopExportRecorderGracefully(session);
            }
        }, 200);
        } catch (exportErr) {
            console.error('Video export setup failed', exportErr);
            teardownExportWireArtifacts(audioCtx, exportAudios, exportVideos, mutedRestore);
            window.isExportRecording = false;
            window.videoExportSession = null;
            resetVideoExportButtonIdle();
            window.showToast('렌더링 준비에 실패했습니다. 다시 시도해 주세요.');
        }
    };
}

if (bgInput) {
    bgInput.onchange = async e => {
        const files = [...e.target.files]; if (files.length === 0) return;
        let currentOffset = 0; const backgrounds = canvas.getObjects().filter(obj => (obj.trackType || '') === 'background');
        if (backgrounds.length > 0) { currentOffset = Math.max(...backgrounds.map(obj => obj.endTime || 0)); }
        for (const file of files) {
            const url = URL.createObjectURL(file);
            await new Promise(res => { fabric.Image.fromURL(url, img => { const duration = parseFloat(defaultImageDuration.value) || 5; img.set({ left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center', layerName: file.name, sourceFileName: file.name, sourceMime: file.type || '', startTime: 0, endTime: duration, trackType: 'background', trackIndex: 0, zIndex: 0, baseOpacity: 1, baseScaleX: 1, baseScaleY: 1, baseAngle: 0 }); img.scale(Math.max(canvas.width / img.width, canvas.height / img.height)); img.set('baseScaleX', img.scaleX); img.set('baseScaleY', img.scaleY); img.set('baseLeft', img.left); img.set('baseTop', img.top); if (window.TimelinePlacement) { window.TimelinePlacement.placeClipOnTrack(img, 'background', 0, duration, { preferredStart: currentOffset }); currentOffset = img.endTime; } else { img.startTime = currentOffset; img.endTime = currentOffset + duration; currentOffset += duration; } canvas.add(img); res(); }); });
        }
        sortCanvasLayers(); if (typeof window.renderTracks === 'function') window.renderTracks(); window.showToast('배경 이미지 추가 완료');
    };
}
if (videoInput) {
    videoInput.onchange = async e => {
        const files = [...e.target.files]; if (files.length === 0) return;
        let currentOffset = 0; const backgrounds = canvas.getObjects().filter(obj => (obj.trackType || '') === 'background');
        if (backgrounds.length > 0) { currentOffset = Math.max(...backgrounds.map(obj => obj.endTime || 0)); }
        for (const file of files) {
            const url = URL.createObjectURL(file);
            const videoElt = document.createElement('video');
            const { duration, thumbUrl } = await loadVideoFileMeta(url, videoElt);
            const img = new fabric.Image(videoElt, { left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center', layerName: file.name, sourceFileName: file.name, sourceMime: file.type || '', startTime: 0, endTime: duration, trackType: 'background', trackIndex: 0, zIndex: 0, isVideo: true, inherentDuration: duration, baseOpacity: 1, baseScaleX: 1, baseScaleY: 1, baseAngle: 0, baseVolume: 1, thumbUrl: thumbUrl });
            img.scale(Math.min(canvas.width / img.width, canvas.height / img.height)); img.set('baseScaleX', img.scaleX); img.set('baseScaleY', img.scaleY); img.set('baseLeft', img.left); img.set('baseTop', img.top); if (window.TimelinePlacement) { window.TimelinePlacement.placeClipOnTrack(img, 'background', 0, duration, { preferredStart: currentOffset }); currentOffset = img.endTime; } else { img.startTime = currentOffset; img.endTime = currentOffset + duration; currentOffset += duration; } canvas.add(img);
        }
        sortCanvasLayers(); if (typeof window.renderTracks === 'function') window.renderTracks(); window.showToast('동영상 배경 추가 완료');
    };
}
if (imageInput) {
    imageInput.onchange = async e => {
        if (typeof saveHistorySnapshot === 'function') saveHistorySnapshot();
        const files = [...e.target.files]; if (files.length === 0) return;
        let currentOffset = 0; const overlays = canvas.getObjects().filter(obj => (obj.trackType || 'overlay') === 'overlay' && (obj.trackIndex || 0) === 0);
        let currentOffsetWebm = 0; const webmOverlays = canvas.getObjects().filter(obj => (obj.trackType || 'overlay') === 'overlay' && (obj.trackIndex || 0) === 2);
        if (overlays.length > 0) { currentOffset = Math.max(...overlays.map(obj => obj.endTime || 0)); }
        if (webmOverlays.length > 0) { currentOffsetWebm = Math.max(...webmOverlays.map(obj => obj.endTime || 0)); }
        for (const file of files) {
            const url = URL.createObjectURL(file);
            const isWebm = file.name.toLowerCase().endsWith('.webm');
            const isVideo = file.type.startsWith('video/') || isWebm;
            
            if (isVideo) {
                const videoElt = document.createElement('video');
                const { duration, thumbUrl } = await loadVideoFileMeta(url, videoElt);

                const tIdx = isWebm ? 2 : 0;
                const pref = isWebm ? currentOffsetWebm : currentOffset;
                
                const img = new fabric.Image(videoElt, { left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center', layerName: file.name, sourceFileName: file.name, sourceMime: file.type || '', startTime: 0, endTime: duration, trackType: 'overlay', trackIndex: tIdx, zIndex: 12, isVideo: true, inherentDuration: duration, baseOpacity: 1, baseScaleX: 1, baseScaleY: 1, baseAngle: 0, baseVolume: 1, thumbUrl: thumbUrl });
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8; img.scale(scale); img.set('baseScaleX', img.scaleX); img.set('baseScaleY', img.scaleY); img.set('baseLeft', img.left); img.set('baseTop', img.top);
                if (window.TimelinePlacement) { window.TimelinePlacement.placeClipOnTrack(img, 'overlay', tIdx, duration, { preferredStart: pref }); if (isWebm) currentOffsetWebm = img.endTime; else currentOffset = img.endTime; } else { img.startTime = pref; img.endTime = pref + duration; if (isWebm) currentOffsetWebm += duration; else currentOffset += duration; }
                canvas.add(img);
            } else {
                await new Promise(res => { fabric.Image.fromURL(url, img => { const duration = parseFloat(defaultImageDuration.value) || 5; img.set({ left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center', layerName: file.name, sourceFileName: file.name, sourceMime: file.type || '', startTime: 0, endTime: duration, trackType: 'overlay', trackIndex: 0, zIndex: 10, baseOpacity: 1, baseScaleX: 1, baseScaleY: 1, baseAngle: 0 }); const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8; img.scale(scale); img.set('baseScaleX', img.scaleX); img.set('baseScaleY', img.scaleY); img.set('baseLeft', img.left); img.set('baseTop', img.top); if (window.TimelinePlacement) { window.TimelinePlacement.placeClipOnTrack(img, 'overlay', 0, duration, { preferredStart: currentOffset }); currentOffset = img.endTime; } else { img.startTime = currentOffset; img.endTime = currentOffset + duration; currentOffset += duration; } canvas.add(img); res(); }); });
            }
        }
        sortCanvasLayers(); canvas.requestRenderAll(); if (typeof window.renderTracks === 'function') window.renderTracks(); window.showToast('이미지/동영상 추가 완료');
    };
}
window.importLocalMediaClipFile = async function (file) {
    if (!file || !imageInput?.onchange) return false;
    await imageInput.onchange({ target: { files: [file] } });
    return true;
};
if (audioInput) {
    audioInput.onchange = async e => {
        const files = [...e.target.files]; if (files.length === 0) return;
        let startOffset = 0; if (audioTrackData.length > 0) { startOffset = Math.max(...audioTrackData.map(track => track.endTime || 0)); }
        for (const file of files) { const url = URL.createObjectURL(file); const newAudio = new Audio(url); await new Promise(res => { newAudio.onloadedmetadata = () => { const duration = newAudio.duration || 5; const track = { layerName: file.name, sourceFileName: file.name, sourceMime: file.type || '', startTime: 0, endTime: duration, trackType: 'audio', trackIndex: 2, zIndex: 0, audio: newAudio, baseVolume: 1 }; if (window.TimelinePlacement) window.TimelinePlacement.placeClipOnTrack(track, 'audio', 2, duration, { preferredStart: startOffset }); else { track.startTime = startOffset; track.endTime = startOffset + duration; startOffset = track.endTime; } audioTrackData.push(track); res(); }; newAudio.onerror = res; }); }
        if (typeof window.renderTracks === 'function') window.renderTracks(); if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI(); window.showToast(`${files.length}개 오디오 추가 완료`);
    };
}
if (addTextBtn) {
    addTextBtn.onclick = () => {
        const count = window.subtitleCount || 1;
        const text = new fabric.IText(`자막 ${count}`, {
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Pretendard, Arial, sans-serif',
            fontSize: 80,
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 4,
            zIndex: 14,
            baseOpacity: 1,
            baseScaleX: 1,
            baseScaleY: 1,
            baseAngle: 0
        });
        text.baseLeft = text.left;
        text.baseTop = text.top;
        text.trackType = 'overlay';
        text.layerName = `Subtitle ${count}`;
        window.subtitleCount = count + 1;

        const subDur = 5;
        const subIdx = 4;
        if (window.TimelinePlacement) {
            window.TimelinePlacement.placeClipOnTrack(text, 'overlay', subIdx, subDur, { preferredStart: currentTime });
        } else {
            text.startTime = currentTime;
            text.endTime = currentTime + subDur;
            text.trackIndex = subIdx;
        }
        currentTime = text.startTime;
        canvas.add(text);
        canvas.setActiveObject(text);
        sortCanvasLayers();
        if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();
        if (typeof window.updateLayerVisibility === 'function') window.updateLayerVisibility();
        if (typeof window.renderTracks === 'function') window.renderTracks();
        window.updatePropertyPanel();
        window.showToast('자막 추가 완료');
    };
}

// --- Font UI Logic ---
const googleFonts = ['Pretendard', 'Black Han Sans', 'Do Hyeon', 'Jua', 'Noto Sans KR', 'Nanum Gothic', 'Nanum Myeongjo', 'Dancing Script', 'Pacifico', 'Satisfy', 'Great Vibes'];
let localFonts = JSON.parse(localStorage.getItem('shorts_local_fonts')) || [];
let favoriteFonts = JSON.parse(localStorage.getItem('shorts_fav_fonts')) || [];

function renderFontList(containerId, type = 'all') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';

    // 최상단에 로컬 폰트 동기화 버튼 추가 (브라우저가 지원하는 경우)
    if (window.queryLocalFonts) {
        const syncItem = document.createElement('div');
        syncItem.className = 'font-item';
        syncItem.style.background = '#f0f9ff';
        syncItem.style.borderBottom = '1px solid #bae6fd';
        syncItem.style.justifyContent = 'center';
        syncItem.style.fontWeight = 'bold';
        syncItem.style.color = '#0284c7';
        syncItem.style.fontSize = '12px';
        syncItem.style.cursor = 'pointer';
        syncItem.innerHTML = '🔄 PC 폰트 가져오기 / 동기화';
        syncItem.onclick = async (e) => {
            e.stopPropagation();
            if (window.showToast) window.showToast("PC 폰트 동기화 시작...");
            await fetchLocalFonts();
        };
        el.appendChild(syncItem);
    }

    let all = (type === 'google') ? [...googleFonts] : (type === 'local') ? [...localFonts] : [...googleFonts, ...localFonts];
    all = [...new Set(all)];
    all.sort((a, b) => {
        const aF = favoriteFonts.includes(a), bF = favoriteFonts.includes(b);
        return aF && !bF ? -1 : !aF && bF ? 1 : a.localeCompare(b);
    });

    const currentFont = document.getElementById('fontLabel') ? document.getElementById('fontLabel').textContent : 'Pretendard';

    all.forEach(f => {
        const i = document.createElement('div');
        const isS = (f === currentFont), isF = favoriteFonts.includes(f);
        i.className = `font-item ${isS ? 'selected' : ''}`;
        i.innerHTML = `
            <div class="font-info" onclick="applyFont('${f}')">
                <div class="font-name">${f}</div>
                <div class="font-preview" style="font-family:'${f}';">가나다 ABC</div>
            </div>
            <button onclick="toggleFav(event, '${f}', '${containerId}', '${type}')" class="star-fav ${isF ? 'active' : ''}">★</button>
        `;
        el.appendChild(i);
    });
}

window.applyFont = function (n) {
    updateObj('fontFamily', n);
    if (document.getElementById('fontLabel')) document.getElementById('fontLabel').textContent = n;
    const fontList = document.getElementById('fontList');
    if (fontList) fontList.classList.add('hidden');
    document.fonts.load(`10px "${n}"`).then(() => canvas.requestRenderAll());
};

window.toggleFav = function (e, f, containerId, type) {
    e.stopPropagation();
    if (favoriteFonts.includes(f)) favoriteFonts = favoriteFonts.filter(x => x !== f);
    else favoriteFonts.push(f);
    localStorage.setItem('shorts_fav_fonts', JSON.stringify(favoriteFonts));
    renderFontList(containerId, type);
};

window.fetchLocalFonts = async () => {
    try {
        if (!window.queryLocalFonts) return;
        const f = await window.queryLocalFonts();
        localFonts = [...new Set(f.map(x => x.family))];
        localStorage.setItem('shorts_local_fonts', JSON.stringify(localFonts));
        renderFontList('fontList', 'all');
        if (window.showToast) window.showToast("폰트 동기화 완료!");
    } catch (e) {
        console.error("폰트 접근 권한 거부됨.");
        if (window.showToast) window.showToast("PC 폰트 접근 권한이 필요합니다.");
    }
};

const fontBtn = document.getElementById('fontBtn');

if (fontBtn) {
    fontBtn.onclick = (e) => {
        e.stopPropagation();
        const list = document.getElementById('fontList');
        if (!list) return;
        
        const isOpening = list.classList.contains('hidden');
        list.classList.toggle('hidden');
        
        if (isOpening) {
            // 캐시된 폰트로 목록을 즉시 렌더링
            renderFontList('fontList', 'all');
        }
    };
}

document.addEventListener('click', (e) => {
    const fontList = document.getElementById('fontList');
    if (fontList && !fontList.contains(e.target) && e.target !== fontBtn && !fontBtn.contains(e.target)) {
        fontList.classList.add('hidden');
    }
});
window.onload = () => { if (window.updateRatioUI) window.updateRatioUI(); else { if (ratioSelect) ratioSelect.value = currentRatio; setCanvasSize(); } refreshPresetList(); initPickers(); if (typeof window.renderTracks === 'function') window.renderTracks(); if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI(); window.updatePropertyPanel(); };
window.setRecordMode = function (isInter) { window.currentIsIntermittent = isInter; const oV = document.getElementById('fpBlockOverlay'); if (isInter) { if (oV) oV.style.display = 'flex'; if (colorFilterToggle) colorFilterToggle.checked = false; Object.keys(pState).forEach(k => { pState[k].up = false; pState[k].down = false; }); fsParticles = []; fsFadingOut = false; } else { if (oV) oV.style.display = 'none'; } }; if (popupClearBtn) { const oldClear = popupClearBtn.onclick; popupClearBtn.onclick = (e) => { if (oldClear) oldClear(e); }; } if (popupCancelBtn) { const oldCancel = popupCancelBtn.onclick; popupCancelBtn.onclick = (e) => { if (oldCancel) oldCancel(e); }; } if (previewCancelBtn) { const oldPCancel = previewCancelBtn.onclick; previewCancelBtn.onclick = (e) => { if (oldPCancel) oldPCancel(e); }; }

// ─── 프로젝트 새 만들기 / 저장 / 불러오기 (v2: 폴더 기반) ──────────────────
const projectNewBtn    = document.getElementById('projectNewBtn');
const projectSaveBtn   = document.getElementById('projectSaveBtn');
const projectLoadBtn   = document.getElementById('projectLoadBtn');
const projectFileInput = document.getElementById('projectFileInput');

// 공통 메타데이터 적용 헬퍼
function applyMeta(fi, item) {
    fi.trackType = item.trackType; fi.trackIndex = item.trackIndex;
    fi.startTime = item.startTime; fi.endTime = item.endTime;
    fi.trimStart = item.trimStart || 0;
    fi.baseLeft = item.baseLeft ?? item.left; fi.baseTop = item.baseTop ?? item.top;
    fi.baseScaleX = item.baseScaleX ?? item.scaleX; fi.baseScaleY = item.baseScaleY ?? item.scaleY;
    fi.baseAngle = item.baseAngle ?? item.angle; fi.baseOpacity = item.baseOpacity ?? item.opacity;
    fi.baseVolume = item.baseVolume ?? 1;
    fi.transitionIn = item.transitionIn; fi.transitionOut = item.transitionOut;
    fi.layerName = item.layerName; fi.isVideo = item.isVideo;
    fi.inherentDuration = item.inherentDuration;
    fi.playbackRate = item.playbackRate || 1;
    fi.thumbUrl = item.thumbUrl || '';
    fi.sourceFileName = item.sourceFileName || '';
    fi.sourceMime = item.sourceMime || '';
}

// 안전한 파일명 생성 (중복 방지용 카운터 포함)
const _usedFileNames = {};
function makeSafeFileName(name, ext) {
    const base = (name || 'media').replace(/[^\w가-힣._-]/g, '_').replace(/_{2,}/g, '_').substring(0, 50);
    const candidate = base.toLowerCase().endsWith(ext) ? base : base + ext;
    if (!_usedFileNames[candidate]) { _usedFileNames[candidate] = 1; return candidate; }
    const count = ++_usedFileNames[candidate];
    const noExt = candidate.slice(0, candidate.length - ext.length);
    return noExt + '_' + count + ext;
}

function extFromName(name, fallback) {
    const m = String(name || '').match(/(\.[A-Za-z0-9]{1,8})$/);
    return m ? m[1].toLowerCase() : fallback;
}

// blob/data URL → 프로젝트 폴더에 저장
async function saveSrcToDir(src, fileName, dirRef) {
    return window.saveSrcToProjectDir(src, fileName, dirRef);
}

// 캔버스 오브젝트 직렬화 (v2)
async function serializeCanvasObjV2(obj, dirHandle) {
    const base = {
        _ver: 2, _customType: obj.type,
        trackType: obj.trackType, trackIndex: obj.trackIndex,
        startTime: obj.startTime, endTime: obj.endTime, trimStart: obj.trimStart,
        baseLeft: obj.baseLeft, baseTop: obj.baseTop,
        baseScaleX: obj.baseScaleX, baseScaleY: obj.baseScaleY,
        baseAngle: obj.baseAngle, baseOpacity: obj.baseOpacity, baseVolume: obj.baseVolume,
        transitionIn: obj.transitionIn, transitionOut: obj.transitionOut,
        isVideo: obj.isVideo, inherentDuration: obj.inherentDuration, layerName: obj.layerName,
        left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY,
        angle: obj.angle, opacity: obj.opacity, playbackRate: obj.playbackRate || 1,
        thumbUrl: obj.thumbUrl || '',
        sourceFileName: obj.sourceFileName || '',
        sourceMime: obj.sourceMime || '',
        originX: obj.originX || 'center', originY: obj.originY || 'center'
    };
    if (obj.type === 'i-text') {
        Object.assign(base, obj.toObject(['fontFamily','fontSize','fill','stroke','strokeWidth',
            'charSpacing','lineHeight','fontWeight','fontStyle','shadow','text','textAlign']));
        base.mediaRef = null;
        if (obj.isTimedSubtitleClip) {
            base.isTimedSubtitleClip = true;
            base.subtitleCues = obj.subtitleCues || [];
        }
    } else {
        const el = obj.getElement && obj.getElement();
        const src = el ? (el.src || el.currentSrc || '') : '';
        base.mediaType = obj.isVideo ? 'video' : 'image';
        if (src && (src.startsWith('blob:') || src.startsWith('data:'))) {
            const ext = extFromName(obj.sourceFileName || obj.layerName, obj.isVideo ? '.webm' : '.png');
            const fn = makeSafeFileName(obj.sourceFileName || obj.layerName, ext);
            try { base.mediaRef = await saveSrcToDir(src, fn, dirHandle); }
            catch(e) { console.warn('미디어 저장 실패:', e); base.mediaRef = null; }
        } else { base.mediaRef = null; }
    }
    return base;
}

// 오디오 트랙 직렬화 (v2)
async function serializeAudioTrackV2(item, dirHandle) {
    const obj = {
        _ver: 2, layerName: item.layerName,
        startTime: item.startTime, endTime: item.endTime,
        trackType: item.trackType, trackIndex: item.trackIndex,
        zIndex: item.zIndex || 0, baseVolume: item.baseVolume,
        sourceFileName: item.sourceFileName || '',
        sourceMime: item.sourceMime || ''
    };
    if (item.audio && item.audio.src) {
        const src = item.audio.src;
        const ext = extFromName(item.sourceFileName || item.layerName, '.mp3');
        const fn = makeSafeFileName(item.sourceFileName || item.layerName, ext);
        try { obj.mediaRef = await saveSrcToDir(src, fn, dirHandle); }
        catch(e) { console.warn('오디오 저장 실패:', e); obj.mediaRef = null; }
    }
    return obj;
}

// 비디오 URL로부터 캔버스에 복원
function restoreVideoFromURL(item, url) {
    return new Promise(resolve => {
        const vid = document.createElement('video');
        vid.muted = true; vid.playsInline = true;
        vid.crossOrigin = "anonymous";
        let done = false;
        const finish = async () => {
            if (done) return; done = true;
            vid.width = vid.videoWidth || 1920;
            vid.height = vid.videoHeight || 1080;
            const probed = await probeVideoFileDuration(vid, {
                hintSec: item.inherentDuration || (item.endTime - item.startTime) || 0,
                trustHint: !!(item.inherentDuration || item.endTime),
                fallbackSec: item.inherentDuration || 5
            });
            const fi = new fabric.Image(vid, {
                left: item.left ?? 0, top: item.top ?? 0,
                scaleX: item.scaleX ?? 1, scaleY: item.scaleY ?? 1,
                angle: item.angle ?? 0, opacity: item.opacity ?? 1,
                originX: item.originX ?? 'center', originY: item.originY ?? 'center'
            });
            applyMeta(fi, item);
            fi.inherentDuration = item.inherentDuration || probed;
            if (!item.endTime && item.startTime != null) fi.endTime = item.startTime + fi.inherentDuration;
            canvas.add(fi); resolve();
        };
        vid.onloadeddata = finish;
        vid.onloadedmetadata = () => { if (vid.readyState >= 2) finish(); };
        vid.onerror = () => { console.warn('비디오 복원 실패:', item.layerName); if (!done) { done = true; resolve(); } };
        vid.src = url; vid.load();
        setTimeout(() => { if (!done) { done = true; resolve(); } }, 6000);
    });
}

// 이미지 URL로부터 캔버스에 복원
function restoreImageFromURL(item, url) {
    return new Promise(resolve => {
        fabric.Image.fromURL(url, img => {
            img.set({ left: item.left ?? 0, top: item.top ?? 0,
                scaleX: item.scaleX ?? 1, scaleY: item.scaleY ?? 1,
                angle: item.angle ?? 0, opacity: item.opacity ?? 1,
                originX: item.originX ?? 'center', originY: item.originY ?? 'center' });
            applyMeta(img, item); canvas.add(img); resolve();
        });
    });
}

let cachedProjectDirHandle = null;

// ── 저장: 폴더 선택 → 미디어 파일 + project.motionproj 저장 ──────────────
const projectSave = async () => {
    if (!window.pickProjectDirectory && !window.showDirectoryPicker) {
        window.showToast('이 환경에서는 폴더 저장을 지원하지 않습니다.');
        return;
    }

    let dirRef;
    try {
        dirRef = await window.pickProjectDirectory('readwrite');
        if (!dirRef) return;
        cachedProjectDirHandle = dirRef;
    } catch (e) {
        if (e.name !== 'AbortError') window.showToast('폴더 선택 취소됨');
        return;
    }

    window.showToast('미디어 파일 저장 중... 잠시 기다려주세요 ⏳');
    Object.keys(_usedFileNames).forEach(k => delete _usedFileNames[k]);

    try {
        const canvasObjs = [];
        for (const obj of canvas.getObjects()) {
            canvasObjs.push(await serializeCanvasObjV2(obj, dirRef));
        }
        const audioObjs = [];
        for (const a of audioTrackData) {
            audioObjs.push(await serializeAudioTrackV2(a, dirRef));
        }
        const project = {
            version: '2.0', savedAt: new Date().toISOString(),
            projectName: dirRef.name || 'project',
            resolution: currentRatio,
            canvasObjects: canvasObjs,
            audioTrack: audioObjs,
            pState: JSON.parse(JSON.stringify(pState))
        };
        await window.writeProjectJson(dirRef, JSON.stringify(project, null, 2));
        window.showToast(`프로젝트 저장 완료 ✅ (${dirRef.name || 'project'})`);
    } catch (e) {
        console.error('저장 오류:', e);
        window.showToast('저장 실패: ' + e.message);
    }
};

// ── 불러오기: 폴더 선택 → project.motionproj + 미디어 파일 복원 ────────────
const projectLoadFromDir = async () => {
    if (!window.pickProjectDirectory && !window.showDirectoryPicker) {
        window.showToast('이 환경에서는 폴더 불러오기를 지원하지 않습니다.');
        return;
    }
    let dirRef;
    try {
        dirRef = await window.pickProjectDirectory('read');
        if (!dirRef) return;
        cachedProjectDirHandle = dirRef;
    } catch (e) {
        if (e.name !== 'AbortError') window.showToast('폴더 선택 취소됨');
        return;
    }

    let proj;
    try {
        proj = JSON.parse(await window.readProjectJson(dirRef));
    } catch (e) {
        window.showToast('폴더에 project.motionproj 파일이 없습니다.');
        return;
    }

    window.showToast('프로젝트 불러오는 중...');
    window.MediaDispose?.teardownProjectMedia?.();

    if (proj.resolution) {
        currentRatio = proj.resolution;
        if (window.updateRatioUI) window.updateRatioUI();
        else {
            if (ratioSelect) ratioSelect.value = currentRatio;
            setCanvasSize();
        }
    }
    if (proj.pState) Object.assign(pState, proj.pState);

    // 캔버스 오브젝트 복원
    for (const item of (proj.canvasObjects || [])) {
        const type = item._customType || item.type;
        if (type === 'i-text') {
            const t = new fabric.IText(item.text || '', {
                left: item.left ?? 0, top: item.top ?? 0,
                scaleX: item.scaleX ?? 1, scaleY: item.scaleY ?? 1,
                angle: item.angle ?? 0, opacity: item.opacity ?? 1,
                originX: item.originX ?? 'center', originY: item.originY ?? 'center',
                fontFamily: item.fontFamily, fontSize: item.fontSize,
                fill: item.fill, stroke: item.stroke, strokeWidth: item.strokeWidth,
                charSpacing: item.charSpacing, lineHeight: item.lineHeight,
                fontWeight: item.fontWeight || 'normal',
                fontStyle: item.fontStyle || 'normal',
                textAlign: item.textAlign || 'left'
            });
            if (item.shadow) t.set('shadow', new fabric.Shadow(item.shadow));
            if (item.isTimedSubtitleClip) {
                t.isTimedSubtitleClip = true;
                t.subtitleCues = item.subtitleCues || [];
                t.opacity = 0;
            }
            applyMeta(t, item); canvas.add(t);
        } else if (item.mediaRef) {
            try {
                const mf = await window.readProjectMediaBlob(dirRef, item.mediaRef);
                const url = URL.createObjectURL(mf);
                if (item.isVideo || item.mediaType === 'video') {
                    await restoreVideoFromURL(item, url);
                } else {
                    await restoreImageFromURL(item, url);
                }
            } catch(e) {
                console.warn('미디어 복원 실패:', item.mediaRef, e);
                window.showToast(`⚠️ ${item.layerName || item.mediaRef} 복원 실패`);
            }
        } else if (item.mediaSrc) {
            // v1.1 이전 포맷 호환 (data URL 내장)
            if (item.isVideo || item.mediaType === 'video') {
                await restoreVideoFromURL(item, item.mediaSrc);
            } else {
                await restoreImageFromURL(item, item.mediaSrc);
            }
        }
    }

    // 오디오 복원
    for (const item of (proj.audioTrack || [])) {
        let url = null;
        if (item.mediaRef) {
            try {
                const af = await window.readProjectMediaBlob(dirRef, item.mediaRef);
                url = URL.createObjectURL(af);
            } catch(e) { console.warn('오디오 파일 없음:', item.mediaRef); }
        } else if (item.audioData) {
            // v1.1 호환
            url = item.audioData;
        }
        if (url) {
            const aud = new Audio(url);
            aud.volume = item.baseVolume ?? 1;
            audioTrackData.push({
                layerName: item.layerName || '오디오',
                startTime: item.startTime, endTime: item.endTime,
                trackType: 'audio', trackIndex: item.trackIndex ?? 0,
                zIndex: 0, audio: aud, baseVolume: item.baseVolume ?? 1
            });
        }
    }

    sortCanvasLayers(); canvas.requestRenderAll();
    if (typeof window.renderTracks === 'function') window.renderTracks();
    if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();
    syncParticleUI(); syncParticleCheckboxes();
    window.showToast('프로젝트를 불러왔습니다 ✅');
};

// 새 프로젝트
const newProjectModal = document.getElementById('newProjectModal');
const newProjectConfirmBtn = document.getElementById('newProjectConfirmBtn');
const newProjectCancelBtn = document.getElementById('newProjectCancelBtn');

function performNewProject() {
    window.MediaDispose?.teardownProjectMedia?.();
    fsParticles = [];
    Object.keys(pState).forEach(k => {
        pState[k].up = false;
        pState[k].down = false;
        pState[k].grow = false;
    });
    if (typeof window.renderTracks === 'function') window.renderTracks();
    if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();
    window.showToast('새 프로젝트가 생성되었습니다');
}

function showNewProjectModal() {
    if (newProjectModal) newProjectModal.style.display = 'flex';
}

function hideNewProjectModal() {
    if (newProjectModal) newProjectModal.style.display = 'none';
}

if (projectNewBtn) projectNewBtn.onclick = showNewProjectModal;
if (newProjectConfirmBtn) {
    newProjectConfirmBtn.onclick = () => {
        hideNewProjectModal();
        performNewProject();
    };
}
if (newProjectCancelBtn) newProjectCancelBtn.onclick = hideNewProjectModal;
if (newProjectModal) {
    newProjectModal.onclick = (e) => {
        if (e.target === newProjectModal) hideNewProjectModal();
    };
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && newProjectModal && newProjectModal.style.display === 'flex') {
        hideNewProjectModal();
    }
});

if (projectSaveBtn) projectSaveBtn.onclick = projectSave;
if (projectLoadBtn) projectLoadBtn.onclick = projectLoadFromDir;
// projectFileInput은 구버전 호환용으로 남겨둠
if (projectFileInput) projectFileInput.onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    projectFileInput.value = '';
    // v1.1 파일을 직접 선택해서 불러오는 레거시 경로
    (async () => {
        window.showToast('파일 읽는 중...');
        let proj;
        try { proj = JSON.parse(await f.text()); }
        catch { window.showToast('파일 형식이 올바르지 않습니다'); return; }
        if (proj.version === '2.0') { window.showToast('v2 프로젝트는 [폴더 선택] 버튼으로 불러와주세요.'); return; }
        // v1.1 data-URL 내장 방식 레거시 복원
        window.showToast('프로젝트 불러오는 중...');
        window.MediaDispose?.teardownProjectMedia?.();
        if (proj.resolution) {
            currentRatio = proj.resolution;
            if (window.updateRatioUI) window.updateRatioUI();
            else {
                if (ratioSelect) ratioSelect.value = currentRatio;
                setCanvasSize();
            }
        }
        if (proj.pState) Object.assign(pState, proj.pState);
        for (const item of (proj.canvasObjects || [])) {
            const type = item._customType || item.type;
            if (type === 'i-text') {
                const t = new fabric.IText(item.text || '', { left: item.left ?? 0, top: item.top ?? 0, scaleX: item.scaleX ?? 1, scaleY: item.scaleY ?? 1, angle: item.angle ?? 0, opacity: item.opacity ?? 1, fontFamily: item.fontFamily, fontSize: item.fontSize, fill: item.fill, stroke: item.stroke, strokeWidth: item.strokeWidth, charSpacing: item.charSpacing, lineHeight: item.lineHeight, fontWeight: item.fontWeight || 'normal', fontStyle: item.fontStyle || 'normal', textAlign: item.textAlign || 'left' });
                if (item.shadow) t.set('shadow', new fabric.Shadow(item.shadow));
                if (item.isTimedSubtitleClip) { t.isTimedSubtitleClip = true; t.subtitleCues = item.subtitleCues || []; t.opacity = 0; }
                applyMeta(t, item); canvas.add(t);
            } else if (item.mediaSrc) {
                if (item.isVideo || item.mediaType === 'video') { await restoreVideoFromURL(item, item.mediaSrc); }
                else { await restoreImageFromURL(item, item.mediaSrc); }
            }
        }
        for (const item of (proj.audioTrack || [])) {
            if (item.audioData) {
                const aud = new Audio(item.audioData); aud.volume = item.baseVolume ?? 1;
                audioTrackData.push({ layerName: item.layerName || '오디오', startTime: item.startTime, endTime: item.endTime, trackType: 'audio', trackIndex: item.trackIndex ?? 0, zIndex: 0, audio: aud, baseVolume: item.baseVolume ?? 1 });
            }
        }
        sortCanvasLayers(); canvas.requestRenderAll();
        if (typeof window.renderTracks === 'function') window.renderTracks();
        if (typeof window.updateTimelineUI === 'function') window.updateTimelineUI();
        syncParticleUI(); syncParticleCheckboxes();
        window.showToast('프로젝트를 불러왔습니다 ✅');
    })();
};

// 키보드 화살표 키로 선택된 객체 이동 기능 추가
document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || activeEl.isContentEditable) {
            return;
        }
    }

    const canvas = window.canvas;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    let step = 1;
    if (e.shiftKey) {
        step = 10;
    }

    let moved = false;
    switch (e.key) {
        case 'ArrowLeft':
            activeObj.set('left', activeObj.left - step);
            moved = true;
            break;
        case 'ArrowRight':
            activeObj.set('left', activeObj.left + step);
            moved = true;
            break;
        case 'ArrowUp':
            activeObj.set('top', activeObj.top - step);
            moved = true;
            break;
        case 'ArrowDown':
            activeObj.set('top', activeObj.top + step);
            moved = true;
            break;
    }

    if (moved) {
        e.preventDefault();
        activeObj.setCoords();
        canvas.requestRenderAll();
        canvas.fire('object:modified', { target: activeObj });
    }
});

// --- Draw Modal Bottom Split Menu Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab switching functionality
    const bottomTabs = document.querySelectorAll('.draw-bottom-tab');
    bottomTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            bottomTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.draw-bottom-pane').forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show target pane
            const targetId = tab.dataset.target;
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
            
            // If it's the stats tab, update the stats
            if (targetId === 'bottomTabStats') {
                updateDrawStats();
            }
        });
    });

    // 2. Hook to update stats and presets when draw modal opens
    const drawBtn = document.getElementById('drawBtn');
    if (drawBtn) {
        const originalClick = drawBtn.onclick;
        drawBtn.onclick = (e) => {
            if (typeof originalClick === 'function') originalClick(e);
            if (window.updateRatioUI) window.updateRatioUI();
            updateDrawStats();
            updateDrawPresetSelect();
        };
    }
});

// Update Draw Stats
window.updateDrawStats = function() {
    const statCanvasRes = document.getElementById('statCanvasRes');
    const statActiveParticle = document.getElementById('statActiveParticle');
    const statMouseEffect = document.getElementById('statMouseEffect');
    const statAudioStatus = document.getElementById('statAudioStatus');
    
    if (statCanvasRes) {
        if (window.canvas) {
            statCanvasRes.textContent = `${window.canvas.getWidth()} x ${window.canvas.getHeight()}`;
        } else {
            statCanvasRes.textContent = '800 x 450';
        }
    }
    
    if (statActiveParticle) {
        const titles = { 
            snow: '❄️ 눈송이', rain: '🌧️ 비', petal: '🌸 벚꽃잎', bubble: '🫧 비눗방울',
            heart: '💖 하트', star: '⭐ 별', music: '🎵 음표', confetti: '🎉 색종이',
            flower: '✿ 꽃', spark: '✨ 불꽃', fog: '🌫️ 안개', steam: '☁️ 수증기' 
        };
        const active = typeof currentParticleVal !== 'undefined' ? currentParticleVal : 'snow';
        statActiveParticle.textContent = titles[active] || active;
    }
    
    if (statMouseEffect) {
        const mouseEffectSelect = document.getElementById('mouseEffectSelect');
        if (mouseEffectSelect) {
            const selectedOpt = mouseEffectSelect.options[mouseEffectSelect.selectedIndex];
            statMouseEffect.textContent = selectedOpt && selectedOpt.value !== 'none' ? selectedOpt.textContent : '선택 없음';
        } else {
            statMouseEffect.textContent = '선택 없음';
        }
    }
    
    if (statAudioStatus) {
        statAudioStatus.textContent = typeof waveFileName !== 'undefined' && waveFileName ? waveFileName : '오디오 없음';
    }
};

// Preset applying logic
window.applyDrawPreset = function(presetNameOrConfig) {
    if (typeof window.resetAllEffects === 'function') {
        window.resetAllEffects();
    }
    
    let p;
    let presetName = '커스텀';
    if (typeof presetNameOrConfig === 'string') {
        presetName = presetNameOrConfig;
        const presets = {
            neon: {
                color: '#00f2fe',
                opacity: 0.9,
                width: 12,
                penType: 'brush',
                effect: 'neon',
                filter: { toggle: false, mode: 'sweep', sweepTime: 3 },
                particles: { val: 'spark', up: true, down: false, grow: true, amt: 12, sz: 8, spd: 40, wnd: 10 },
                wave: { mode: 'effect', shape: 'circle', color: 'rainbow', speed: 1.5, size: 120 }
            },
            rain: {
                color: '#93c5fd',
                opacity: 0.6,
                width: 6,
                penType: 'pencil',
                effect: 'none',
                filter: { toggle: false, mode: 'manual', sweepTime: 5, color: '#1e293b' },
                particles: { val: 'rain', up: false, down: true, grow: false, amt: 25, sz: 12, spd: 80, wnd: 30 },
                wave: { mode: 'effect', shape: 'wave', color: 'brush', speed: 0.8, size: 90 }
            },
            cherry: {
                color: '#f472b6',
                opacity: 0.7,
                width: 10,
                penType: 'colorpencil',
                effect: 'flowers',
                filter: { toggle: false },
                particles: { val: 'petal', up: false, down: true, grow: true, amt: 15, sz: 18, spd: 25, wnd: 40 },
                wave: { mode: 'none' }
            },
            snow: {
                color: '#ffffff',
                opacity: 0.8,
                width: 8,
                penType: 'brush',
                effect: 'snow',
                filter: { toggle: false },
                particles: { val: 'snow', up: false, down: true, grow: false, amt: 18, sz: 14, spd: 20, wnd: 15 },
                wave: { mode: 'effect', shape: 'line', color: 'brush', speed: 1.0, size: 100 }
            },
            bubble: {
                color: '#67e8f9',
                opacity: 0.5,
                width: 25,
                penType: 'brush',
                effect: 'bubble',
                filter: { toggle: false, mode: 'random', sweepTime: 4 },
                particles: { val: 'bubble', up: true, down: false, grow: true, amt: 10, sz: 25, spd: 15, wnd: 5 },
                wave: { mode: 'effect', shape: 'circle', color: 'rainbow', speed: 1.2, size: 110 }
            },
            fireworks: {
                color: '#facc15',
                opacity: 0.8,
                width: 15,
                penType: 'fountain',
                effect: 'fireworks',
                filter: { toggle: false, mode: 'random', sweepTime: 2 },
                particles: { val: 'spark', up: true, down: true, grow: true, amt: 20, sz: 10, spd: 50, wnd: 20 },
                wave: { mode: 'effect', shape: 'performance', color: 'rainbow', speed: 2.0, size: 130 }
            }
        };
        p = presets[presetNameOrConfig];
        
        // Lookup in custom presets if not found in defaults
        if (!p) {
            let customPresets = JSON.parse(localStorage.getItem('customDrawPresets')) || {};
            p = customPresets[presetNameOrConfig];
        }
    } else if (typeof presetNameOrConfig === 'object') {
        p = presetNameOrConfig;
    }
    
    if (!p) return;
    
    // Apply colors/opacity/width
    if (p.color) {
        window.currentDrawColor = p.color;
    }
    if (p.opacity !== undefined) window.currentDrawOpacity = p.opacity;
    if (p.width !== undefined) window.currentDrawWidth = p.width;
    
    // Apply pen type
    if (p.penType) {
        window.currentDrawType = p.penType;
        const penTypeBtns = document.querySelectorAll('.pen-types button');
        if (penTypeBtns) {
            penTypeBtns.forEach(b => b.classList.remove('active'));
        }
        const btn = document.querySelector(`.pen-types button[data-type="${p.penType}"]`);
        if (btn) {
            btn.classList.add('active');
        }
    }
    
    // Apply mouse effect
    const mouseEffectSelect = document.getElementById('mouseEffectSelect');
    if (mouseEffectSelect && p.effect) {
        mouseEffectSelect.value = p.effect;
        mouseEffectSelect.dispatchEvent(new Event('change'));
        
        // Clear all mouse effect button styles first
        document.querySelectorAll('.eff-btn').forEach(b => {
            b.classList.remove('eff-active');
            b.style.background = '#f8fafc';
            b.style.outline = 'none';
        });
        const label = document.getElementById('effSelectedLabel');
        if (label) label.textContent = '선택 없음';

        const btn = document.querySelector(`.eff-btn[data-eff="${p.effect}"]`);
        if (btn) {
            btn.classList.add('eff-active');
            btn.style.background = '#dbeafe';
            btn.style.outline = '2px solid #2563eb';
            if (label) label.textContent = btn.title + ' 선택됨';
        }
    }
    
    // Apply color filter
    const colorFilterToggle = document.getElementById('colorFilterToggle');
    const colorFilterMode = document.getElementById('colorFilterMode');
    const filterSweepTime = document.getElementById('filterSweepTime');
    if (colorFilterToggle) {
        if (p.filter && p.filter.toggle) {
            colorFilterToggle.checked = true;
            if (colorFilterMode && p.filter.mode) {
                colorFilterMode.value = p.filter.mode;
                colorFilterMode.dispatchEvent(new Event('change'));
            }
            if (filterSweepTime && p.filter.sweepTime) {
                filterSweepTime.value = p.filter.sweepTime;
                filterSweepTime.dispatchEvent(new Event('input'));
            }
            if (p.filter.color) {
                window.currentDrawColor = p.filter.color;
            }
        } else {
            colorFilterToggle.checked = false;
        }
        colorFilterToggle.dispatchEvent(new Event('change'));
    }
    
    // Apply particles
    if (p.particles && typeof pState !== 'undefined') {
        window.currentParticleVal = p.particles.val;
        const particleItemSelect = document.getElementById('particleItemSelect');
        if (particleItemSelect) {
            particleItemSelect.value = p.particles.val;
        }
        
        if (pState[window.currentParticleVal]) {
            pState[window.currentParticleVal].amt = p.particles.amt;
            pState[window.currentParticleVal].sz = p.particles.sz;
            pState[window.currentParticleVal].spd = p.particles.spd;
            pState[window.currentParticleVal].wnd = p.particles.wnd;
            pState[window.currentParticleVal].opac = p.particles.opac !== undefined ? p.particles.opac : 80;
            pState[window.currentParticleVal].blur = p.particles.blur !== undefined ? p.particles.blur : 0;
            pState[window.currentParticleVal].useCol = p.particles.useCol !== undefined ? p.particles.useCol : false;
            pState[window.currentParticleVal].colVal = p.particles.colVal !== undefined ? p.particles.colVal : '#ffffff';
            pState[window.currentParticleVal].up = p.particles.up;
            pState[window.currentParticleVal].down = p.particles.down;
            pState[window.currentParticleVal].grow = p.particles.grow;
        }
        
        const pAmt = document.getElementById('pAmt');
        const pSz = document.getElementById('pSz');
        const pSpd = document.getElementById('pSpd');
        const pWnd = document.getElementById('pWnd');
        const pOpac = document.getElementById('pOpac');
        const pBlur = document.getElementById('pBlur');
        const pUseCol = document.getElementById('pUseCol');
        const pColVal = document.getElementById('pColVal');
        if (pAmt) pAmt.value = p.particles.amt;
        if (pSz) pSz.value = p.particles.sz;
        if (pSpd) pSpd.value = p.particles.spd;
        if (pWnd) pWnd.value = p.particles.wnd;
        if (pOpac) pOpac.value = p.particles.opac !== undefined ? p.particles.opac : 80;
        if (pBlur) pBlur.value = p.particles.blur !== undefined ? p.particles.blur : 0;
        if (pUseCol) pUseCol.checked = p.particles.useCol !== undefined ? p.particles.useCol : false;
        if (pColVal) pColVal.value = p.particles.colVal !== undefined ? p.particles.colVal : '#ffffff';
        
        const pCtrlUp = document.getElementById('pCtrlUp');
        const pCtrlDown = document.getElementById('pCtrlDown');
        const pCtrlGrow = document.getElementById('pCtrlGrow');
        const pCtrlOff = document.getElementById('pCtrlOff');
        if (pCtrlUp) pCtrlUp.checked = p.particles.up;
        if (pCtrlDown) pCtrlDown.checked = p.particles.down;
        if (pCtrlGrow) pCtrlGrow.checked = p.particles.grow;
        if (pCtrlOff) pCtrlOff.checked = !(p.particles.up || p.particles.down);
        
        const gridBtn = document.querySelector(`.p-grid-btn[data-val="${p.particles.val}"]`);
        if (gridBtn) {
            document.querySelectorAll('.p-grid-btn').forEach(b => {
                b.style.background = '#f8fafc';
                b.style.outline = 'none';
            });
            gridBtn.style.background = '#dbeafe';
            gridBtn.style.outline = '2px solid #2563eb';
        }
        
        const label = document.getElementById('particleSelectedLabel');
        if (label) {
            const titles = { snow:'❄ 눈송이', rain:'🌧 비', petal:'🌸 벚꽃잎', bubble:'🫧 비눗방울',
                heart:'💖 하트', star:'⭐ 별', music:'🎵 음표', confetti:'🎉 색종이',
                flower:'✿ 꽃', spark:'✨ 불꽃', fog:'🌫️ 안개', steam:'☁️ 수증기' };
            label.textContent = (titles[window.currentParticleVal] || window.currentParticleVal) + ' 선택됨';
        }
    }
    
    // Apply wave
    const waveModeSelect = document.getElementById('waveModeSelect');
    const waveShapeSelect = document.getElementById('waveShapeSelect');
    const waveColorSelect = document.getElementById('waveColorSelect');
    const waveSpeed = document.getElementById('waveSpeed');
    const waveSize = document.getElementById('waveSize');
    if (waveModeSelect && p.wave) {
        waveModeSelect.value = p.wave.mode;
        waveModeSelect.dispatchEvent(new Event('change'));
        if (p.wave.mode !== 'none') {
            if (waveShapeSelect && p.wave.shape) {
                waveShapeSelect.value = p.wave.shape;
                waveShapeSelect.dispatchEvent(new Event('change'));
            }
            if (waveColorSelect && p.wave.color) {
                waveColorSelect.value = p.wave.color;
                waveColorSelect.dispatchEvent(new Event('change'));
            }
            if (waveSpeed && p.wave.speed) {
                waveSpeed.value = p.wave.speed;
                waveSpeed.dispatchEvent(new Event('input'));
            }
            if (waveSize && p.wave.size) {
                waveSize.value = p.wave.size;
                waveSize.dispatchEvent(new Event('input'));
            }
            
            // Apply extended wave properties for custom presets
            const waveCount = document.getElementById('waveCount');
            const waveLineWidth = document.getElementById('waveLineWidth');
            const waveWidth = document.getElementById('waveWidth');
            const waveHeight = document.getElementById('waveHeight');
            const wavePosX = document.getElementById('wavePosX');
            const wavePosY = document.getElementById('wavePosY');
            
            if (waveCount && p.wave.count) {
                waveCount.value = p.wave.count;
                waveCount.dispatchEvent(new Event('change'));
            }
            if (waveLineWidth && p.wave.lineWidth) {
                waveLineWidth.value = p.wave.lineWidth;
                waveLineWidth.dispatchEvent(new Event('input'));
            }
            if (waveWidth && p.wave.width) {
                waveWidth.value = p.wave.width;
                waveWidth.dispatchEvent(new Event('input'));
            }
            if (waveHeight && p.wave.height) {
                waveHeight.value = p.wave.height;
                waveHeight.dispatchEvent(new Event('input'));
            }
            if (wavePosX && p.wave.posX !== undefined) {
                wavePosX.value = p.wave.posX;
                wavePosX.dispatchEvent(new Event('input'));
            }
            if (wavePosY && p.wave.posY !== undefined) {
                wavePosY.value = p.wave.posY;
                wavePosY.dispatchEvent(new Event('input'));
            }
        }
    }
    
    if (typeof updateBrushIndicator === 'function') {
        updateBrushIndicator();
    }
    if (typeof updateDynamicPickers === 'function') {
        updateDynamicPickers();
    }
    
    window.showToast?.(`프리셋 '${presetName}' 적용 완료!`);
    
    // Update stats immediately
    updateDrawStats();
};

// Custom Preset Saving
window.saveCurrentDrawPreset = function(presetName) {
    if (!presetName) {
        window.showToast?.('프리셋 이름을 입력해주세요!');
        return;
    }
    
    const config = {
        color: window.currentDrawColor || '#ef4444',
        opacity: window.currentDrawOpacity !== undefined ? window.currentDrawOpacity : 0.5,
        width: window.currentDrawWidth !== undefined ? window.currentDrawWidth : 50,
        penType: window.currentDrawType || 'none',
        
        effect: document.getElementById('mouseEffectSelect')?.value || 'none',
        
        filter: {
            toggle: document.getElementById('colorFilterToggle')?.checked || false,
            mode: document.getElementById('colorFilterMode')?.value || 'manual',
            sweepTime: parseFloat(document.getElementById('filterSweepTime')?.value || 5)
        },
        
        particles: {
            val: document.getElementById('particleItemSelect')?.value || 'snow',
            amt: parseInt(document.getElementById('pAmt')?.value || 5),
            sz: parseInt(document.getElementById('pSz')?.value || 15),
            spd: parseInt(document.getElementById('pSpd')?.value || 30),
            wnd: parseInt(document.getElementById('pWnd')?.value || 20),
            opac: parseInt(document.getElementById('pOpac')?.value || 80),
            blur: parseInt(document.getElementById('pBlur')?.value || 0),
            useCol: document.getElementById('pUseCol')?.checked || false,
            colVal: document.getElementById('pColVal')?.value || '#ffffff',
            up: document.getElementById('pCtrlUp')?.checked || false,
            down: document.getElementById('pCtrlDown')?.checked || false,
            grow: document.getElementById('pCtrlGrow')?.checked || false
        },
        
        wave: {
            mode: document.getElementById('waveModeSelect')?.value || 'none',
            shape: document.getElementById('waveShapeSelect')?.value || 'bar',
            color: document.getElementById('waveColorSelect')?.value || 'brush',
            speed: parseFloat(document.getElementById('waveSpeed')?.value || 1.0),
            count: document.getElementById('waveCount')?.value || '128',
            lineWidth: parseInt(document.getElementById('waveLineWidth')?.value || 5),
            width: parseInt(document.getElementById('waveWidth')?.value || 100),
            height: parseInt(document.getElementById('waveHeight')?.value || 100),
            size: parseInt(document.getElementById('waveSize')?.value || 100),
            posX: parseInt(document.getElementById('wavePosX')?.value || 50),
            posY: parseInt(document.getElementById('wavePosY')?.value || 50)
        }
    };
    
    let customPresets = JSON.parse(localStorage.getItem('customDrawPresets')) || {};
    customPresets[presetName] = config;
    localStorage.setItem('customDrawPresets', JSON.stringify(customPresets));
    
    updateDrawPresetSelect();
    
    const input = document.getElementById('drawPresetNameInput');
    if (input) input.value = '';
    
    window.showToast?.(`프리셋 '${presetName}'이 저장되었습니다!`);
};

// Update Custom Preset Dropdown
window.updateDrawPresetSelect = function() {
    const select = document.getElementById('drawPresetSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- 프리셋 선택 --</option>';
    let customPresets = JSON.parse(localStorage.getItem('customDrawPresets')) || {};
    for (const key in customPresets) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        select.appendChild(opt);
    }
};

// Hook up custom presets event handlers
document.addEventListener('DOMContentLoaded', () => {
    const saveDrawPresetBtn = document.getElementById('saveDrawPresetBtn');
    const loadDrawPresetBtn = document.getElementById('loadDrawPresetBtn');
    const deleteDrawPresetBtn = document.getElementById('deleteDrawPresetBtn');
    
    if (saveDrawPresetBtn) {
        saveDrawPresetBtn.onclick = () => {
            const input = document.getElementById('drawPresetNameInput');
            if (input) {
                saveCurrentDrawPreset(input.value.trim());
            }
        };
    }
    
    if (loadDrawPresetBtn) {
        loadDrawPresetBtn.onclick = () => {
            const select = document.getElementById('drawPresetSelect');
            if (select && select.value) {
                applyDrawPreset(select.value);
            } else {
                window.showToast?.('적용할 프리셋을 선택해 주세요.');
            }
        };
    }
    
    if (deleteDrawPresetBtn) {
        deleteDrawPresetBtn.onclick = () => {
            const select = document.getElementById('drawPresetSelect');
            if (select && select.value) {
                const presetName = select.value;
                let customPresets = JSON.parse(localStorage.getItem('customDrawPresets')) || {};
                delete customPresets[presetName];
                localStorage.setItem('customDrawPresets', JSON.stringify(customPresets));
                updateDrawPresetSelect();
                window.showToast?.(`프리셋 '${presetName}'이 삭제되었습니다.`);
            } else {
                window.showToast?.('삭제할 프리셋을 선택해 주세요.');
            }
        };
    }
    
    updateDrawPresetSelect();
});

if (typeof imageAlphaEditBtn !== 'undefined' && imageAlphaEditBtn) {
    imageAlphaEditBtn.addEventListener('click', () => {
        if (typeof window.openImageAlphaEditor === 'function') {
            window.openImageAlphaEditor();
        } else {
            console.error("openImageAlphaEditor is not defined");
        }
    });
}

// --- Waveform Caching & Restore ---
function saveWaveSettings() {
    const settings = {
        mode: waveModeSelect ? waveModeSelect.value : 'none',
        shape: waveShapeSelect ? waveShapeSelect.value : 'bar',
        colorMode: waveColorSelect ? waveColorSelect.value : 'white',
        speed: waveSpeed ? waveSpeed.value : '1.0',
        count: waveCount ? waveCount.value : '128',
        lineWidth: waveLineWidth ? waveLineWidth.value : '5',
        width: waveWidth ? waveWidth.value : '100',
        height: waveHeight ? waveHeight.value : '100',
        size: waveSize ? waveSize.value : '100',
        posX: wavePosX ? wavePosX.value : '50',
        posY: wavePosY ? wavePosY.value : '50',
        perfMode: wavePerformanceMode ? wavePerformanceMode.value : 'gpu'
    };
    localStorage.setItem('motion_editor_wave_settings', JSON.stringify(settings));
}

function loadWaveSettings() {
    try {
        const saved = localStorage.getItem('motion_editor_wave_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (waveModeSelect && settings.mode !== undefined) {
                waveModeSelect.value = settings.mode;
                waveModeSelect.dispatchEvent(new Event('change'));
            }
            if (waveShapeSelect && settings.shape !== undefined) {
                waveShapeSelect.value = settings.shape;
                waveShapeSelect.dispatchEvent(new Event('change'));
            }
            if (waveColorSelect && settings.colorMode !== undefined) {
                waveColorSelect.value = settings.colorMode;
                waveColorSelect.dispatchEvent(new Event('change'));
            }
            if (waveSpeed && settings.speed !== undefined) {
                waveSpeed.value = settings.speed;
                waveSpeed.dispatchEvent(new Event('input'));
            }
            if (waveCount && settings.count !== undefined) {
                waveCount.value = settings.count;
                waveCount.dispatchEvent(new Event('input'));
            }
            if (waveLineWidth && settings.lineWidth !== undefined) {
                waveLineWidth.value = settings.lineWidth;
                waveLineWidth.dispatchEvent(new Event('input'));
            }
            if (waveWidth && settings.width !== undefined) {
                waveWidth.value = settings.width;
                waveWidth.dispatchEvent(new Event('input'));
            }
            if (waveHeight && settings.height !== undefined) {
                waveHeight.value = settings.height;
                waveHeight.dispatchEvent(new Event('input'));
            }
            if (waveSize && settings.size !== undefined) {
                waveSize.value = settings.size;
                waveSize.dispatchEvent(new Event('input'));
            }
            if (wavePosX && settings.posX !== undefined) {
                wavePosX.value = settings.posX;
                wavePosX.dispatchEvent(new Event('input'));
            }
            if (wavePosY && settings.posY !== undefined) {
                wavePosY.value = settings.posY;
                wavePosY.dispatchEvent(new Event('input'));
            }
            if (wavePerformanceMode && settings.perfMode !== undefined) {
                wavePerformanceMode.value = settings.perfMode;
                wavePerformanceMode.dispatchEvent(new Event('change'));
            }
        }
    } catch (e) {
        console.error('Failed to load wave settings', e);
    }
}

// Bind input and change events for all wave settings
[waveModeSelect, waveShapeSelect, waveColorSelect, waveSpeed, waveCount, waveLineWidth, waveWidth, waveHeight, waveSize, wavePosX, wavePosY, wavePerformanceMode].forEach(el => {
    if (el) {
        el.addEventListener('input', saveWaveSettings);
        el.addEventListener('change', saveWaveSettings);
    }
});

// Load settings on startup
setTimeout(loadWaveSettings, 100);


