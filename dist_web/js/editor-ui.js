

window.fitObjectToCanvas = function(type) {
    if (!window.canvas) return;
    let obj = window.canvas.getActiveObject();
    if (!obj) {
        const objs = window.canvas.getObjects();
        obj = objs.find(o => o.type === 'image' || o.type === 'video') || objs[0];
    }
    if (!obj || !obj.width || !obj.height) return;
    const cWidth = window.canvas.width;
    const cHeight = window.canvas.height;
    let sX = 1, sY = 1;
    if (type === 'fill') { sX = cWidth / obj.width; sY = cHeight / obj.height; }
    else if (type === 'width') { sX = cWidth / obj.width; sY = sX; }
    else if (type === 'height') { sY = cHeight / obj.height; sX = sY; }
    obj.set({ scaleX: sX, scaleY: sY, left: cWidth / 2, top: cHeight / 2, originX: 'center', originY: 'center', baseScaleX: sX, baseScaleY: sY, baseLeft: cWidth / 2, baseTop: cHeight / 2 });
    obj.setCoords();
    window.canvas.requestRenderAll();
    const scaleSlider = document.getElementById('img-scale-slider');
    if (scaleSlider) scaleSlider.value = Math.round(sX * 100);
    if (typeof window.saveHistorySnapshot === 'function') window.saveHistorySnapshot();
    if (typeof window.updatePropertyPanel === 'function') window.updatePropertyPanel(obj);
};




