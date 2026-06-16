import re

with open('js/retrofx.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. HolePerspective
hole_pattern = r"fabric\.Image\.filters\.HolePerspective = fabric\.util\.createClass\(.*?\}\);\n"
hole_new = """fabric.Image.filters.HolePerspective = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'HolePerspective',
    amount: 0,
    angle: 0,
    holeSize: 0.45,
    depth: 1.2,
    vignette: 0.5,
    maskObj: null,
    applyTo: function(options) {
        const data = options.imageData.data;
        const w = options.imageData.width;
        const h = options.imageData.height;
        const copyData = new Uint8ClampedArray(data);
        const cx = w * 0.5;
        const cy = h * 0.5;
        const maxR = Math.min(cx, cy);
        const holeR = maxR * Math.max(0.05, Math.min(0.95, this.holeSize));
        const amt = Math.max(0, Math.min(1, this.amount));
        
        if (amt < 0.001) return;

        const perspectiveDepth = 0.3 * amt * (this.depth || 1.2);
        const steps = 30;
        const checkIsHole = (px, py) => {
            if (px < 0 || px >= w || py < 0 || py >= h) return false;
            if (this.maskObj) {
                return getMaskWeightAt(this.maskObj, px, py, w, h) > 0.5;
            } else {
                return Math.hypot(px - cx, py - cy) < holeR;
            }
        };

        const angleRad = (this.angle || 0) * Math.PI / 180;
        const dxProj = Math.cos(angleRad);
        const dyProj = Math.sin(angleRad);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const isHole = checkIsHole(x, y);

                if (isHole) {
                    let hit = false;
                    let hitX = x;
                    let hitY = y;
                    let hitT = 0;

                    for (let step = 1; step <= steps; step++) {
                        const t = step / steps;
                        const px = Math.round(x + dxProj * t * perspectiveDepth * w);
                        const py = Math.round(y + dyProj * t * perspectiveDepth * w);
                        
                        if (!checkIsHole(px, py)) {
                            hit = true;
                            hitX = px;
                            hitY = py;
                            hitT = t;
                            break;
                        }
                    }
                    
                    if (hit) {
                        const nx = hitX - cx;
                        const ny = hitY - cy;
                        const R = Math.hypot(nx, ny) || 1;
                        const ang = Math.atan2(ny, nx);
                        const u = ang * R;
                        const z = hitT * perspectiveDepth * 100;
                        
                        const brickL = 50; 
                        const brickH = 20;
                        
                        const row = Math.floor(u / brickH);
                        const offsetZ = (row % 2 === 0) ? 0 : (brickL / 2);
                        
                        let shiftedZ = z + offsetZ;
                        shiftedZ = ((shiftedZ % brickL) + brickL) % brickL;
                        let shiftedU = ((u % brickH) + brickH) % brickH;
                        
                        const isMortar = (shiftedZ < 2 || shiftedU < 2);
                        
                        let rCol, gCol, bCol;
                        if (isMortar) {
                            rCol = 190; gCol = 190; bCol = 190; 
                        } else {
                            const col = Math.floor((z + offsetZ) / brickL);
                            const noise = ((Math.abs(row * 37 + col * 19)) % 30) - 15;
                            const gray = 135 + noise;
                            rCol = gray; gCol = gray; bCol = gray;
                        }
                        
                        const lighting = 0.5 + 0.5 * (1 - hitT);
                        const depthShadow = 1 - hitT * (0.4 + this.vignette * 0.4);
                        const shade = Math.max(0, lighting * depthShadow);
                        
                        data[dstIdx] = rCol * shade;
                        data[dstIdx + 1] = gCol * shade;
                        data[dstIdx + 2] = bCol * shade;
                        data[dstIdx + 3] = 255;
                    } else {
                        data[dstIdx] = 0;
                        data[dstIdx + 1] = 0;
                        data[dstIdx + 2] = 0;
                        data[dstIdx + 3] = 0;
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
code = re.sub(hole_pattern, hole_new, code, flags=re.DOTALL)

# 2. ImageTear
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
        
        // Simple 1D noise array for fast sawtooth displacement
        const noiseArr = new Float32Array(w + h);
        for (let i = 0; i < noiseArr.length; i++) {
            noiseArr[i] = (Math.random() - 0.5) * 2; // -1 to 1
        }
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstIdx = (y * w + x) * 4;
                const weight = getMaskWeightAt(this.maskObj, x, y, w, h);
                
                if (weight > 0.5) {
                    const dispX = noiseArr[y % noiseArr.length] * rough * amt;
                    const dispY = noiseArr[x % noiseArr.length] * rough * amt;
                    
                    const srcX = Math.round(x + dispX);
                    const srcY = Math.round(y + dispY);
                    
                    if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
                        const srcWeight = getMaskWeightAt(this.maskObj, srcX, srcY, w, h);
                        if (srcWeight <= 0.5) {
                            // Border of the tear, make it transparent (torn away)
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

# 3. PuzzleShuffle
puzzle_pattern = r"fabric\.Image\.filters\.PuzzleShuffle = fabric\.util\.createClass\(.*?\}\);\n"
puzzle_new = """fabric.Image.filters.PuzzleShuffle = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'PuzzleShuffle',
    amount: 0,
    cols: 6,
    rows: 4,
    gap: 0,
    rotate: 0,
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
                    const lx = x - (ci * cellW);
                    const ly = y - (cj * cellH);
                    
                    // Simple Bevel
                    let bevel = 1.0;
                    const bSize = 3;
                    if (lx < bSize && ly < bSize) bevel = 1.4; // Top-Left
                    else if (lx > cellW - bSize && ly > cellH - bSize) bevel = 0.6; // Bottom-Right
                    else if (lx < bSize) bevel = 1.2; // Left
                    else if (ly < bSize) bevel = 1.2; // Top
                    else if (lx > cellW - bSize) bevel = 0.8; // Right
                    else if (ly > cellH - bSize) bevel = 0.8; // Bottom
                    
                    data[dstIdx] = Math.min(255, copyData[dstIdx] * bevel);
                    data[dstIdx + 1] = Math.min(255, copyData[dstIdx + 1] * bevel);
                    data[dstIdx + 2] = Math.min(255, copyData[dstIdx + 2] * bevel);
                    data[dstIdx + 3] = copyData[dstIdx + 3];
                }
            }
        }
    }
});
"""
code = re.sub(puzzle_pattern, puzzle_new, code, flags=re.DOTALL)

with open('js/retrofx_fixed.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved js/retrofx_fixed.js")
