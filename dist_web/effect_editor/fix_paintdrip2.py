# -*- coding: utf-8 -*-
import re

with open('js/retrofx.js', 'r', encoding='utf-8') as f:
    code = f.read()

drip_pattern = r"fabric\.Image\.filters\.PaintDrip = fabric\.util\.createClass\(.*?\}\);\n"
drip_new = """fabric.Image.filters.PaintDrip = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PaintDrip',
    amount: 0,
    dripLen: 120,
    wobble: 18,
    phase: 0,
    viscosity: 0.6,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const amt = Math.max(0, Math.min(1, this.amount));
        const maxDrip = amt * this.dripLen;
        const visc = Math.max(0.1, this.viscosity);
        
        if (amt < 0.001) return;

        for (let y = 0; y < h; y++) {
            const yNorm = y / h;
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                
                const wob = Math.sin(x * 0.06 + this.phase) * this.wobble * amt
                          + Math.sin(x * 0.14 + y * 0.03 + this.phase * 1.3) * this.wobble * 0.35 * amt;
                          
                const drip = maxDrip * Math.pow(Math.max(0, yNorm - 0.08), Math.max(0.1, visc - yNorm*0.5));
                
                const totalShift = Math.max(0, drip + wob);
                const sy = y - totalShift;
                
                const weight = getMaskWeightAt(this.maskObj, x, sy, w, h);
                const originalWeight = getMaskWeightAt(this.maskObj, x, y, w, h);
                
                if (weight > 0.001) {
                    const px = sampleBilinear(copyData, w, h, x, sy);
                    
                    let distToTop = 0;
                    for (let step = 1; step <= 40; step++) {
                        if (getMaskWeightAt(this.maskObj, x, sy - step, w, h) < 0.5) {
                            distToTop = step;
                            break;
                        }
                    }
                    
                    let shade = 1.0;
                    if (distToTop > 0 && distToTop < 40) {
                        const norm = distToTop / 40.0;
                        shade = 0.8 + Math.sin(norm * Math.PI) * 0.5;
                    } else if (distToTop === 0) {
                        shade = 1.0;
                    }
                    
                    const dwob = Math.cos(x * 0.06 + this.phase) * this.wobble * amt;
                    shade += dwob * 0.01;
                    
                    let distToBottom = 0;
                    for (let step = 1; step <= 20; step++) {
                        if (getMaskWeightAt(this.maskObj, x, sy + step, w, h) < 0.5) {
                            distToBottom = step;
                            break;
                        }
                    }
                    if (distToBottom > 0 && distToBottom < 20) {
                        const norm = distToBottom / 20.0;
                        shade = 0.6 + norm * 0.4;
                    }
                    
                    data[dstIdx] = Math.min(255, Math.max(0, px[0] * shade)) * weight + copyData[dstIdx] * (1 - weight);
                    data[dstIdx + 1] = Math.min(255, Math.max(0, px[1] * shade)) * weight + copyData[dstIdx + 1] * (1 - weight);
                    data[dstIdx + 2] = Math.min(255, Math.max(0, px[2] * shade)) * weight + copyData[dstIdx + 2] * (1 - weight);
                    data[dstIdx + 3] = px[3] * weight + copyData[dstIdx + 3] * (1 - weight);
                } else if (originalWeight > 0.001) {
                    let clampSy = sy;
                    while(clampSy <= y && getMaskWeightAt(this.maskObj, x, clampSy, w, h) < 0.5) {
                        clampSy++;
                    }
                    if (getMaskWeightAt(this.maskObj, x, clampSy, w, h) > 0.5) {
                        const px = sampleBilinear(copyData, w, h, x, clampSy);
                        let shade = 1.2;
                        data[dstIdx] = Math.min(255, px[0] * shade);
                        data[dstIdx + 1] = Math.min(255, px[1] * shade);
                        data[dstIdx + 2] = Math.min(255, px[2] * shade);
                        data[dstIdx + 3] = px[3];
                    } else {
                        data[dstIdx] = copyData[dstIdx];
                        data[dstIdx + 1] = copyData[dstIdx + 1];
                        data[dstIdx + 2] = copyData[dstIdx + 2];
                        data[dstIdx + 3] = copyData[dstIdx + 3];
                    }
                } else {
                    data[dstIdx] = copyData[dstIdx];
                    data[dstIdx + 1] = copyData[dstIdx + 1];
                    data[dstIdx + 2] = copyData[dstIdx + 2];
                    data[dstIdx + 3] = copyData[dstIdx + 3];
                }
            }
        }
    }
});
"""
code = re.sub(drip_pattern, drip_new, code, flags=re.DOTALL)

with open('js/retrofx_fixed4.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved js/retrofx_fixed4.js")
