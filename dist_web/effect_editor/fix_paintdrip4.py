import re

with open('js/retrofx.js', 'r', encoding='utf-8') as f:
    code = f.read()

class_pattern = r"fabric\.Image\.filters\.PaintDrip = fabric\.util\.createClass\(.*?\}\);\n"
code = re.sub(class_pattern, "", code, flags=re.DOTALL)

fn_pattern = r"window\.applyRetroEffect7 = function\(obj, settings, id\).*?(?=window\.applyRetroEffect8 = function)"

new_fn = """fabric.Image.filters.PaintDrip = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PaintDrip',
    amount: 0, dripLen: 300, wobble: 18,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const amt = Math.max(0, Math.min(1, this.amount));
        const maxDrip = amt * this.dripLen;
        
        if (amt < 0.001 || !this.maskObj) return;

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
                    
                    if (dist <= maxDrip) {
                        const px = sampleBilinear(copyData, w, h, x, topY);
                        let shade = 1.0;
                        if (dist < 40) {
                            shade = 0.8 + Math.sin((dist / 40.0) * Math.PI) * 0.5;
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

window.applyRetroEffect7 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    const maxImgHeight = Math.round(obj.height || 1000);
    
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, dripLen: maxImgHeight, wobble: 18,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    
    let filter = obj.filters.find(f => f.type === 'PaintDrip');
    if (!filter) {
        filter = new fabric.Image.filters.PaintDrip({ ...obj.retroSettings });
        obj.filters = [filter];
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
        { id: 'brushSize', label: 'Brush Size', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize') syncFilter();
    });

    const controlPanel = document.getElementById('retro-effect-controls');
    if (controlPanel) {
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '5px';
        btnGroup.style.marginTop = '10px';
        
        const btnStraight = document.createElement('button');
        btnStraight.innerText = '\\uc9c1\\uc120 \\uc0c1\\ub2e8\\uc120 \\uadf8\\ub9ac\\uae30';
        btnStraight.className = 'retro-action-btn';
        
        const btnCurve = document.createElement('button');
        btnCurve.innerText = '\\uace1\\uc120 \\uc0c1\\ub2e8\\uc120 \\uadf8\\ub9ac\\uae30';
        btnCurve.className = 'retro-action-btn';
        
        const btnStart = document.createElement('button');
        btnStart.innerText = '\\ud6a8\\uacfc \\uc2dc\\uc791';
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
                const group = new fabric.Group(paths);
                obj.retroSettings.maskObj = group;
                window.globalRetroMemory[id].maskObj = group;
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
// \ud6a8\uacfc 8\ubc88
"""
code = re.sub(fn_pattern, new_fn, code, flags=re.DOTALL)

with open('js/retrofx_fixed5.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved js/retrofx_fixed5.js")
