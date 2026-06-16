import re

with open('js/retrofx.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix PuzzleShuffle to include Rotation
puzzle_pattern = r"fabric\.Image\.filters\.PuzzleShuffle = fabric\.util\.createClass\(.*?\}\);\n"
puzzle_new = """fabric.Image.filters.PuzzleShuffle = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PuzzleShuffle',
    amount: 0,
    cols: 6,
    rows: 4,
    rotate: 0.15,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const cols = Math.max(2, Math.round(this.cols));
        const rows = Math.max(2, Math.round(this.rows));
        const cellW = w / cols;
        const cellH = h / rows;
        const amt = Math.max(0, Math.min(1, this.amount));
        
        if (amt < 0.001) return;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                
                if (weight > 0.001) {
                    const ci = Math.min(cols - 1, Math.floor(x / cellW));
                    const cj = Math.min(rows - 1, Math.floor(y / cellH));
                    
                    const hash = (ci * 17 + cj * 31) % 97;
                    const rot = ((hash % 5) - 2) * this.rotate * amt;
                    
                    let lx = x - (ci + 0.5) * cellW;
                    let ly = y - (cj + 0.5) * cellH;
                    
                    const cos = Math.cos(rot);
                    const sin = Math.sin(rot);
                    
                    const sx = Math.round((ci + 0.5) * cellW + lx * cos - ly * sin);
                    const sy = Math.round((cj + 0.5) * cellH + lx * sin + ly * cos);
                    
                    let px = [0, 0, 0, 0];
                    if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                        const sIdx = (sy * w + sx) * 4;
                        px = [copyData[sIdx], copyData[sIdx+1], copyData[sIdx+2], copyData[sIdx+3]];
                    }
                    
                    let bevel = 1.0;
                    const bSize = 3;
                    let ltx = lx + cellW * 0.5;
                    let lty = ly + cellH * 0.5;
                    
                    if (ltx < bSize && lty < bSize) bevel = 1.4; 
                    else if (ltx > cellW - bSize && lty > cellH - bSize) bevel = 0.6; 
                    else if (ltx < bSize) bevel = 1.2; 
                    else if (lty < bSize) bevel = 1.2; 
                    else if (ltx > cellW - bSize) bevel = 0.8; 
                    else if (lty > cellH - bSize) bevel = 0.8; 
                    
                    data[dstIdx] = Math.min(255, px[0] * bevel);
                    data[dstIdx + 1] = Math.min(255, px[1] * bevel);
                    data[dstIdx + 2] = Math.min(255, px[2] * bevel);
                    data[dstIdx + 3] = px[3];
                }
            }
        }
    }
});
"""
code = re.sub(puzzle_pattern, puzzle_new, code, flags=re.DOTALL)

# 2. Fix ImageTear to use static Math.sin for noise instead of Math.random array
tear_pattern = r"fabric\.Image\.filters\.ImageTear = fabric\.util\.createClass\(.*?\}\);\n"
tear_new = """fabric.Image.filters.ImageTear = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'ImageTear',
    amount: 0,
    roughness: 10,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const amt = Math.max(0, Math.min(1, this.amount));
        
        if (amt < 0.001) return;
        
        const copyData = new Uint8ClampedArray(data);
        const rough = Math.max(0, this.roughness);
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                
                if (weight > 0.5) {
                    const nx = Math.sin(y * 0.1) + Math.sin(y * 0.03) * 0.5;
                    const ny = Math.sin(x * 0.1) + Math.sin(x * 0.03) * 0.5;
                    
                    const dispX = nx * rough * amt;
                    const dispY = ny * rough * amt;
                    
                    const srcX = Math.round(x + dispX);
                    const srcY = Math.round(y + dispY);
                    
                    if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
                        const srcWeight = getMaskWeightAt(this.maskObj, srcX, srcY, w, h);
                        if (srcWeight <= 0.5) {
                            data[dstIdx] = 0;
                            data[dstIdx + 1] = 0;
                            data[dstIdx + 2] = 0;
                            data[dstIdx + 3] = 0;
                        } else {
                            data[dstIdx] = 0;
                            data[dstIdx + 1] = 0;
                            data[dstIdx + 2] = 0;
                            data[dstIdx + 3] = 0;
                        }
                    } else {
                        data[dstIdx] = 0;
                        data[dstIdx + 1] = 0;
                        data[dstIdx + 2] = 0;
                        data[dstIdx + 3] = 0;
                    }
                }
            }
        }
    }
});
"""
code = re.sub(tear_pattern, tear_new, code, flags=re.DOTALL)

# 3. Fix Brush Path closure rule in renderMaskObjectsToSceneCanvas
mask_pattern = r"        obj\.fill = obj\.type === 'path' \? '' : '#ffffff';"
mask_new = """        let isClosed = false;
        if (obj.type === 'path' && obj.path && obj.path.length > 2) {
            try {
                const first = obj.path[0];
                const last = obj.path[obj.path.length - 1];
                let fx = first[1] || 0, fy = first[2] || 0;
                let lx = last[last.length - 2] || 0, ly = last[last.length - 1] || 0;
                const dist = Math.hypot(fx - lx, fy - ly);
                if (dist < 60) isClosed = true;
            } catch (e) {
                console.error(e);
            }
        }
        obj.fill = (obj.type === 'path' && !isClosed) ? '' : '#ffffff';"""
code = re.sub(mask_pattern, mask_new, code)

with open('js/retrofx_fixed2.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved js/retrofx_fixed2.js")
