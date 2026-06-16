// 16진수 아스키 코드를 숫자로 변환하는 헬퍼 함수
function hexCharToInt(code: i32): i32 {
  if (code >= 48 && code <= 57) { // '0'..'9'
    return code - 48;
  }
  if (code >= 97 && code <= 102) { // 'a'..'f'
    return code - 97 + 10;
  }
  if (code >= 65 && code <= 70) { // 'A'..'F'
    return code - 65 + 10;
  }
  return 0;
}

// 1. JS에서 전달한 32비트 정수(Hex)를 받아 R, G, B 값을 비트 패킹하여 반환
// 예: 0xFF5733 -> (r << 16) | (g << 8) | b
export function hexToIntRgb(hexNum: i32): i32 {
  let r = (hexNum >> 16) & 0xFF;
  let g = (hexNum >> 8) & 0xFF;
  let b = hexNum & 0xFF;
  return (r << 16) | (g << 8) | b;
}

// 2. R, G, B 정수를 16진수 포인터 문자열로 변환 (#ffffff 형태)
export function rgbToHex(r: i32, g: i32, b: i32): string {
  let rHex = r.toString(16);
  let gHex = g.toString(16);
  let bHex = b.toString(16);
  
  if (rHex.length < 2) rHex = "0" + rHex;
  if (gHex.length < 2) gHex = "0" + gHex;
  if (bHex.length < 2) bHex = "0" + bHex;
  
  return "#" + rHex + gHex + bHex;
}

// 3. 시간 포맷팅 변환 (초 -> "MM:SS" 또는 "HH:MM:SS")
export function formatTime(seconds: f64): string {
  if (seconds < 0) seconds = 0;
  let totalSecs = i32(Math.floor(seconds));
  let h = totalSecs / 3600;
  let m = (totalSecs % 3600) / 60;
  let s = totalSecs % 60;
  
  let mStr = m.toString();
  let sStr = s.toString();
  
  if (mStr.length < 2) mStr = "0" + mStr;
  if (sStr.length < 2) sStr = "0" + sStr;
  
  if (h > 0) {
    let hStr = h.toString();
    if (hStr.length < 2) hStr = "0" + hStr;
    return hStr + ":" + mStr + ":" + sStr;
  }
  return mStr + ":" + sStr;
}

// 4. 타임라인 재생바 및 가이드라인의 정렬된 픽셀 높이 계산
export function calculatePlayheadHeight(
  clientHeight: i32,
  contentHeight: i32,
  progressRowHeight: i32,
  tracksHeight: i32,
  rulerHeight: i32,
  scrollbarHeight: i32,
  scrollbarVisible: i32,
  mainGap: i32
): i32 {
  let calculatedHeight = 0;
  let visibleChildren = 0;
  
  if (progressRowHeight > 0) {
    calculatedHeight += progressRowHeight;
    visibleChildren++;
  }
  if (tracksHeight > 0) {
    calculatedHeight += tracksHeight;
    visibleChildren++;
  }
  if (rulerHeight > 0) {
    calculatedHeight += rulerHeight;
    visibleChildren++;
  }
  if (scrollbarVisible > 0 && scrollbarHeight > 0) {
    calculatedHeight += scrollbarHeight;
    visibleChildren++;
  }
  
  if (visibleChildren > 1) {
    calculatedHeight += (visibleChildren - 1) * mainGap;
  }
  
  return calculatedHeight > clientHeight ? calculatedHeight : clientHeight;
}
