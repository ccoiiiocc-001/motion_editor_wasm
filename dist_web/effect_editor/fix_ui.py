import re

with open('js/retrofx_fixed.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix applyRetroEffect8
eff8_pattern = r"window\.applyRetroEffect8 = function\(.*?\}\);"
eff8_new = """window.applyRetroEffect8 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, angle: 0, holeSize: 0.45, depth: 1.2, vignette: 0.5,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'HolePerspective');
    if (!filter) {
        filter = new fabric.Image.filters.HolePerspective({ ...obj.retroSettings });
        obj.filters = [filter];
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.angle = obj.retroSettings.angle;
        filter.holeSize = obj.retroSettings.holeSize;
        filter.depth = obj.retroSettings.depth;
        filter.vignette = obj.retroSettings.vignette;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };
    window.showFilterControls('º® ±¸¸Û Åõ½Ã', [
        { id: 'angle', label: 'µÎ²² ¹æÇâ (0~315)', min: 0, max: 315, step: 45, value: obj.retroSettings.angle, inputType: 'range' },
        { id: 'holeSize', label: '±¸¸Û Å©±â', min: 0.15, max: 0.85, step: 0.01, value: obj.retroSettings.holeSize, inputType: 'range' },
        { id: 'depth', label: '±íÀÌ ¿Ö°î', min: 0.3, max: 2.5, step: 0.05, value: obj.retroSettings.depth, inputType: 'range' },
        { id: 'brushSize', label: 'º× Å©±â', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: 'Æä´õ', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });
    bindRetroMaskFilter(obj, settings, id, filter, syncFilter);
};"""
code = re.sub(eff8_pattern, eff8_new, code, flags=re.DOTALL)

# Fix applyRetroEffect6
eff6_pattern = r"window\.applyRetroEffect6 = function\(.*?\}\);"
eff6_new = """window.applyRetroEffect6 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, roughness: 10,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'ImageTear');
    if (!filter) {
        filter = new fabric.Image.filters.ImageTear({ ...obj.retroSettings });
        obj.filters = [filter];
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.roughness = obj.retroSettings.roughness;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };
    window.showFilterControls('ÀÌ¹ÌÁö Âõ±â', [
        { id: 'roughness', label: '°ÅÄ¥±â (Åé´Ï)', min: 0, max: 20, step: 1, value: obj.retroSettings.roughness, inputType: 'range' },
        { id: 'brushSize', label: 'º× Å©±â', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: 'Æä´õ', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });
    bindRetroMaskFilter(obj, settings, id, filter, syncFilter);
};"""
code = re.sub(eff6_pattern, eff6_new, code, flags=re.DOTALL)

# Fix applyRetroEffect9
eff9_pattern = r"window\.applyRetroEffect9 = function\(.*?\}\);"
eff9_new = """window.applyRetroEffect9 = function(obj, settings, id) {
    if (typeof window.ensureFabricOriginalElement === 'function') window.ensureFabricOriginalElement(obj);
    if (!window.globalRetroMemory[id]) {
        window.globalRetroMemory[id] = {
            amount: 0, cols: 6, rows: 4,
            brushSize: 40, feather: 20, maskObj: null
        };
    }
    obj.retroSettings = { ...window.globalRetroMemory[id], activeFxId: id };
    let filter = obj.filters.find(f => f.type === 'PuzzleShuffle');
    if (!filter) {
        filter = new fabric.Image.filters.PuzzleShuffle({ ...obj.retroSettings });
        obj.filters = [filter];
    }
    const syncFilter = () => {
        filter.amount = obj.retroSettings.amount;
        filter.cols = obj.retroSettings.cols;
        filter.rows = obj.retroSettings.rows;
        filter.maskObj = obj.retroSettings.maskObj;
        obj.dirty = true;
        obj.applyFilters();
        window.canvas.renderAll();
    };
    window.showFilterControls('ÆÛÁñ Á¶°¢È­', [
        { id: 'cols', label: '°¡·Î Á¶°¢ ¼ö', min: 2, max: 12, step: 1, value: obj.retroSettings.cols, inputType: 'range' },
        { id: 'rows', label: '¼¼·Î Á¶°¢ ¼ö', min: 2, max: 12, step: 1, value: obj.retroSettings.rows, inputType: 'range' },
        { id: 'brushSize', label: 'º× Å©±â', min: 5, max: 150, step: 1, value: obj.retroSettings.brushSize },
        { id: 'feather', label: 'Æä´õ', min: 0, max: 100, step: 1, value: obj.retroSettings.feather }
    ], (pid, val) => {
        obj.retroSettings[pid] = val;
        window.globalRetroMemory[id][pid] = val;
        if (pid === 'brushSize' && window.maskDrawState?.active && window.canvas.freeDrawingBrush) window.canvas.freeDrawingBrush.width = val;
        if (pid !== 'brushSize' && pid !== 'feather') syncFilter();
    });
    bindRetroMaskFilter(obj, settings, id, filter, syncFilter);
};"""
code = re.sub(eff9_pattern, eff9_new, code, flags=re.DOTALL)

with open('js/retrofx_fixed_ui.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved js/retrofx_fixed_ui.js")
