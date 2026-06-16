import re

with open('js/retrofx.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace applyRetroEffect7 using string slicing
start_idx = code.find('window.applyRetroEffect7 = function(obj, settings, id)')
end_idx = code.find('window.applyRetroEffect8 = function(obj, settings, id)')

if start_idx != -1 and end_idx != -1:
    new_fn = """window.applyRetroEffect7 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    const maxImgHeight = Math.round(obj.height || 1000);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, dripLen: maxImgHeight, wobble: 18,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    
    if (!fabric.Image.filters.PaintDripFast) {
        fabric.Image.filters.PaintDripFast = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
            type: 'PaintDripFast',
            amount: 0, dripLen: 300, wobble: 18,
            maskObj: null,
            applyTo: function(options) {
                const data = options.imageData.data;
                const w = options.imageData.width;
                const h = options.imageData.height;
                const copyData = new Uint8ClampedArray(data);
                const amt = Math.max(0, Math.min(1, this.amount));
                const maxDrip = amt * this.dripLen;
                
                if (amt < 0.001 || !this.maskObj || !this.maskObj.data) return;

                const topEdges = new Int32Array(w);
                topEdges.fill(-1);
                
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (topEdges[x] === -1 && getMaskWeightAt(this.maskObj, x, y, w, h) > 0.001) {
                            topEdges[x] = y;
                        }
                    }
                }

                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const dstIdx = (y * w + x) * 4;
                        const topY = topEdges[x];
                        
                        if (topY !== -1 && y >= topY) {
                            const wob = Math.sin(x * 0.06) * this.wobble * amt + Math.sin(x * 0.14 + y * 0.03) * this.wobble * 0.35 * amt;
                            const dist = (y - topY) - wob;
                            
                            if (dist <= maxDrip && dist >= 0) {
                                const px = sampleBilinear(copyData, w, h, x, topY);
                                let shade = 1.0;
                                if (dist < 40) {
                                    shade = 0.8 + Math.sin((Math.max(0, dist) / 40.0) * Math.PI) * 0.5;
                                } else if (dist > maxDrip - 20) {
                                    shade = 0.6 + Math.max(0, (maxDrip - dist) / 20.0) * 0.4;
                                }
                                shade += Math.cos(x * 0.06) * this.wobble * amt * 0.01;
                                
                                data[dstIdx] = Math.min(255, Math.max(0, px[0] * shade));
                                data[dstIdx+1] = Math.min(255, Math.max(0, px[1] * shade));
                                data[dstIdx+2] = Math.min(255, Math.max(0, px[2] * shade));
                                data[dstIdx+3] = px[3];
                                continue;
                            }
                        }
                        
                        data[dstIdx] = copyData[dstIdx];
                        data[dstIdx+1] = copyData[dstIdx+1];
                        data[dstIdx+2] = copyData[dstIdx+2];
                        data[dstIdx+3] = copyData[dstIdx+3];
                    }
                }
            }
        });
    }

    let filter = obj.filters.find(f => f.type === 'PaintDripFast');
    if (!filter) {
        obj.filters = obj.filters.filter(f => f.type !== 'PaintDripFast' && f.type !== 'PaintDrip');
        filter = new fabric.Image.filters.PaintDripFast({ ...obj.retroSettings });
        obj.filters.push(filter);
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.dripLen = obj.retroSettings.dripLen;
        filter.wobble = obj.retroSettings.wobble;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };

    window.showFilterControls('Drip', [
        { id: 'dripLen', label: 'Drip Length', min: 20, max: maxImgHeight, step: 5, value: obj.retroSettings.dripLen, inputType: 'range' },
        { id: 'wobble', label: 'Wobble', min: 0, max: 40, step: 1, value: obj.retroSettings.wobble, inputType: 'range' },
        { id: 'brushSize', label: 'Brush Size', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: 'Feather', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });

    const labelDripLen = document.querySelector('label[for="filter-input-dripLen"]');
    if (labelDripLen) labelDripLen.innerHTML = '&#54632;&#47084;&#45236;&#47444; &#44600;&#51060;';
    const labelWobble = document.querySelector('label[for="filter-input-wobble"]');
    if (labelWobble) labelWobble.innerHTML = '&#47932;&#44208; &#55124;&#46308;&#47548;';
    const labelBrushSize = document.querySelector('label[for="filter-input-brushSize"]');
    if (labelBrushSize) labelBrushSize.innerHTML = '&#48652;&#47084;&#49884; &#53356;&#44592;';
    const labelFeather = document.querySelector('label[for="filter-input-feather"]');
    if (labelFeather) labelFeather.innerHTML = '&#54168;&#45908;';

    const controlPanel = document.getElementById('retro-effect-controls');
    if (controlPanel) {
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '5px';
        btnGroup.style.marginTop = '10px';
        
        const btnStraight = document.createElement('button');
        btnStraight.innerHTML = '&#51649;&#49440; &#49345;&#45800;&#49440; &#44536;&#47532;&#44592;';
        btnStraight.className = 'retro-action-btn';
        
        const btnCurve = document.createElement('button');
        btnCurve.innerHTML = '&#44257;&#49440; &#49345;&#45800;&#49440; &#44536;&#47532;&#44592;';
        btnCurve.className = 'retro-action-btn';
        
        const btnStart = document.createElement('button');
        btnStart.innerHTML = '&#54952;&#44284;&#49884;&#51089;';
        btnStart.className = 'retro-action-btn';
        
        btnGroup.appendChild(btnStraight);
        btnGroup.appendChild(btnCurve);
        btnGroup.appendChild(btnStart);
        controlPanel.appendChild(btnGroup);

        window.maskDrawState = { active: false };

        btnStraight.onclick = () => {
            window.maskDrawState.active = true;
            window.canvas.isDrawingMode = true;
            const brush = new fabric.PencilBrush(window.canvas);
            brush.width = obj.retroSettings.brushSize;
            brush.color = 'rgba(255, 0, 0, 0.5)';
            brush.decimate = 10000;
            window.canvas.freeDrawingBrush = brush;
        };

        btnCurve.onclick = () => {
            window.maskDrawState.active = true;
            window.canvas.isDrawingMode = true;
            const brush = new fabric.PencilBrush(window.canvas);
            brush.width = obj.retroSettings.brushSize;
            brush.color = 'rgba(255, 0, 0, 0.5)';
            brush.decimate = 2;
            window.canvas.freeDrawingBrush = brush;
        };

        btnStart.onclick = () => {
            window.maskDrawState.active = false;
            window.canvas.isDrawingMode = false;
            const paths = window.canvas.getObjects().filter(o => o.type === 'path' && o.stroke === 'rgba(255, 0, 0, 0.5)');
            if (paths.length > 0) {
                if (typeof window.buildRetroMaskData === 'function') {
                    const maskData = window.buildRetroMaskData(paths, obj, obj.retroSettings.feather);
                    obj.retroSettings.maskObj = maskData;
                    window.globalRetroMemory[id].maskObj = maskData;
                }
                paths.forEach(p => window.canvas.remove(p));
                
                if (obj.retroSettings.amount === 0) {
                    obj.retroSettings.amount = 1;
                    const amountSlider = document.getElementById('filter-input-amount');
                    if (amountSlider) amountSlider.value = 1;
                }
                syncFilter();
            }
        };
    }
};
"""
    
    code = code[:start_idx] + new_fn + "\n" + code[end_idx:]
    with open('js/retrofx_fixed8.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Saved js/retrofx_fixed8.js")
