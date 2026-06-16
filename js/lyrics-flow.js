/**
 * 가사 흐름 위치 — 왼쪽 1/2 지점에서 시작해 중앙으로 이동
 */
export function calcLyricsFlowX(containerWidth, textWidth, progress) {
    const cw = containerWidth || 400;
    const textW = textWidth || 0;
    const prog = Math.max(0, Math.min(1, progress || 0));
    const fromX = cw * 0.5;
    const centerX = cw / 2;
    return fromX - (fromX - centerX) * prog - textW / 2;
}

export function calcLyricsFlowCanvasLeft(canvasWidth, progress) {
    const cw = canvasWidth || 1920;
    const prog = Math.max(0, Math.min(1, progress || 0));
    const fromX = cw * 0.5;
    const centerX = cw / 2;
    return fromX - (fromX - centerX) * prog;
}
