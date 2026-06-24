<?php
// Simple Domain Lock Check
$host = $_SERVER['HTTP_HOST'] ?? '';
$host_only = explode(':', $host)[0];

// Allow granda.biz, its subdomains, localhost, and 127.0.0.1
$is_allowed = false;
if (
    $host_only === 'localhost' || 
    $host_only === '127.0.0.1' || 
    $host_only === 'granda.biz' || 
    (strlen($host_only) > 11 && substr($host_only, -11) === '.granda.biz') ||
    empty($host_only)
) {
    $is_allowed = true;
}

if (!$is_allowed) {
    header('HTTP/1.1 403 Forbidden');
    echo '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;font-size:20px;color:#ef4444;background:#fef2f2;font-weight:bold;">허가되지 않은 도메인입니다. (Unauthorized Domain)</div>';
    exit;
}
?>
<!DOCTYPE html>
<html lang="ko">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Motion Editor</title>
  <link rel="stylesheet" href="vendor/fonts/editor-fonts.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>">
  <link rel="stylesheet" href="css/style.css">

  <script defer src="vendor/fabric.min.js"></script>
  <script defer src="js/project-fs.js"></script>
  <script defer src="js/core.js?v=<?php echo filemtime('js/core.js'); ?>"></script>
  <script defer src="js/editor-ui.js"></script>
  <script defer src="js/image-alpha-editor.js"></script>
  <script defer src="js/media-duration.js"></script>
  <script defer src="js/media-dispose.js"></script>
  <script defer src="js/effect-editor-bridge.js?v=<?php echo filemtime('js/effect-editor-bridge.js'); ?>"></script>
  <script defer src="js/editor-events.js?v=<?php echo filemtime('js/editor-events.js'); ?>"></script>
  <script defer src="js/timeline-placement.js?v=<?php echo filemtime('js/timeline-placement.js'); ?>"></script>
  <script defer src="js/timeline-state.js?v=<?php echo filemtime('js/timeline-state.js'); ?>"></script>
  <script defer src="js/timeline-guides.js?v=<?php echo filemtime('js/timeline-guides.js'); ?>"></script>
  <script defer src="js/timeline-core.js?v=<?php echo filemtime('js/timeline-core.js'); ?>"></script>
  <script defer src="js/timeline-events.js?v=<?php echo filemtime('js/timeline-events.js'); ?>"></script>
  <script type="module" src="js/auto-subtitle.js?v=<?php echo filemtime('js/auto-subtitle.js'); ?>"></script>
  <script type="module" src="js/lyrics-subtitle.js?v=<?php echo filemtime('js/lyrics-subtitle.js'); ?>"></script>
</head>
<body>
  <!-- 에디터 초기화 지연 감춤용 오버레이 (레이아웃 틀어짐 방지) -->
  <div id="editorLoadingOverlay" style="position:fixed;inset:0;background:#0f172a;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999;transition:opacity 0.3s ease, visibility 0.3s ease;font-family:sans-serif;color:white;">
    <div style="font-size:24px;font-weight:bold;margin-bottom:12px;display:flex;align-items:center;gap:8px;letter-spacing:-0.5px;">
      🎬 Motion Editor
    </div>
    <div style="font-size:12.5px;color:#94a3b8;margin-bottom:24px;">작업 환경을 준비하는 중입니다...</div>
    <div style="width:36px;height:36px;border:3.5px solid rgba(255,255,255,0.1);border-radius:50%;border-top-color:#2563eb;animation:editorSpin 0.8s linear infinite;"></div>
    <style>
      @keyframes editorSpin {
        to { transform: rotate(360deg); }
      }
    </style>
  </div>
  <div class="editor-layout">
    <div class="workspace-layout">
      <aside class="left-panel">
        <h1 class="logo">Motion Editor</h1>
        <input type="file" id="projectFileInput" accept=".motionproj,.json" hidden>
        <div class="section left-settings-row" style="margin-bottom:10px;">
          <div class="left-settings-resolution">
            <label>해상도</label>
            <select id="ratioSelect">
              <option value="1920x1080">1920x1080(16:9)</option>
              <option value="1080x1920">1080x1920(9:16)</option>
              <option value="2750x1536">2750x1536(16:9)</option>
              <option value="1536x2750">1536x2750(9:16)</option>
              <option value="3000x3000">3000x3000(1:1)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
              <option value="2160x3840">2160x3840 (4K)</option>
              <option value="7680x4320">7680x4320 (8K)</option>
              <option value="4320x7680">4320x7680 (8K)</option>
            </select>
          </div>
          <div class="left-settings-duration">
            <label>이미지 길이(초)</label>
            <input type="number" id="defaultImageDuration" min="1" max="180" step="1" value="5">
          </div>
        </div>
        <div class="section buttons" style="margin-top:0;">
          <input type="file" id="bgInput" accept="image/*" multiple hidden>
          <button id="bgBtn">배경</button>
          <input type="file" id="videoInput" accept="video/*" multiple hidden>
          <button id="videoBtn">동영상</button>
          <input type="file" id="imageInput" accept="image/*,video/*" multiple hidden>
          <button id="imageBtn">클립,이미지</button>
          <button id="addTextBtn">자막</button>
          <button id="drawBtn" style="background:#8b5cf6;box-shadow:0 2px 4px rgba(139,92,246,0.4);">🎬 클립 만들기</button>
          <button id="effectEditorLeftBtn" type="button" title="효과 편집기 열기" onclick="window.openEffectEditorEmpty?.()" style="background:#f59e0b;color:white;box-shadow:0 2px 4px rgba(245,158,11,0.4);">🎨 효과 편집기</button>
          <input type="file" id="audioInput" accept="audio/*" multiple hidden>
          <button id="audioBtn">음악</button>
          <button id="recordBtn" class="record-btn">🎙️ 마이크 녹음</button>
          <button id="lyricsSubtitleBtn" type="button" class="lyrics-subtitle-btn" title="가사 자막">가사 자막</button>
        </div>
        <div class="clip-preset-container"
          style="background:#f1f5f9;padding:12px;border-radius:8px;margin-top:auto;box-shadow:0 1px 3px rgba(0,0,0,0.1); border:1px solid #e2e8f0;">
          <div style="display:flex; gap:6px; margin-bottom:10px;">
            <button id="projectSaveBtn" title="작업 저장"
              style="flex:1;background:#2563eb;color:white;border:none;border-radius:6px;padding:8px 0;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              💾 작업저장
            </button>
            <button id="projectLoadBtn" title="작업 불러오기"
              style="flex:1;background:#0284c7;color:white;border:none;border-radius:6px;padding:8px 0;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              📂 작업열기
            </button>
          </div>
          <label style="color:#1e293b;font-weight:800;font-size:12px;display:block;margin-bottom:8px;">🎬 선택 클립
            내보내기</label>
          <input type="file" id="loadLyricsClipInput" accept=".lyricsclip.json,.json,image/*,video/*,.webm" hidden>
          <div class="preset-row">
            <input type="text" id="clipPresetNameInput" placeholder="클립 이름 지정" style="flex:1;">
            <button id="saveClipLocalBtn"
              style="background:#10b981;color:white;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:bold;box-shadow:0 2px 4px rgba(16,185,129,0.3);"
              title="가사 클립(.lyricsclip) 또는 이미지·영상 저장">로컬 저장</button>
            <button id="loadClipLocalBtn"
              style="background:#0284c7;color:white;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:bold;box-shadow:0 2px 4px rgba(2,132,199,0.3);"
              title="가사 클립(.lyricsclip) 또는 이미지·영상 불러오기">불러오기</button>
          </div>
          <div style="display:flex; gap:6px; align-items:stretch; height:32px; margin-top:8px;">
            <select id="exportFormatSelect" title="저장 형식"
              style="width:70px; border-radius:6px; border:1px solid #cbd5e1; padding:0 4px; font-size:12px; font-weight:600; background:#f8fafc; color:#334155; cursor:pointer; outline:none; text-align:center;">
              <option value="webm">WebM</option>
              <option value="mp4">MP4</option>
            </select>
            <button id="videoExportBtn" title="동영상으로 저장"
              style="flex:1;background:#e11d48;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              🎬 동영상 렌더링
            </button>
            <button id="videoExportPauseBtn" title="렌더링 보류/재개" hidden
              style="width:36px;background:#f59e0b;color:white;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;">⏸</button>
            <button id="videoExportCancelBtn" title="렌더링 취소" hidden
              style="width:36px;background:#64748b;color:white;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;">✕</button>
          </div>
          <hr style="border:0; border-top:1px solid #cbd5e1; margin:12px 0;">
          <div class="prop-group" style="margin-top:0;">
            <label
              style="color:#1e293b;font-weight:800;font-size:11px;display:flex;align-items:center;margin-bottom:8px;position:relative;cursor:pointer;">
              전환효과, 파란선 기준
              <span class="info-icon"
                onclick="var p = this.nextElementSibling; p.classList.remove('hidden'); var r = this.getBoundingClientRect(); p.style.top = (r.botton - 45) + 'px'; p.style.left = r.left + 'px';"
                style="margin-left:4px;background:#8fa5be;color:white;border-radius:50%;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">i</span>
              <div class="info-popup hidden"
                style="position:fixed;margin:0;background:white;border:1px solid #cbd5e1;padding:8px;border-radius:6px;font-size:10px;color:#475569;width:200px;z-index:999999;box-shadow:0 4px 10px rgba(0,0,0,0.15);font-weight:normal;line-height:1.4;cursor:default;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;font-weight:bold;color:#1e293b;"><span onclick="event.stopPropagation(); this.closest('.info-popup').classList.add('hidden')" style="cursor:pointer;font-size:14px;padding:0 4px;color:#94a3b8;line-height:1;">&times;</span></div>
                파란선은 클립의 가장자리 좌우화살표를 더블클릭하면 나타납니다. 전환효과 선택 후 트랙 버튼을 누르면 해당 타임라인 전체 클립에 적용됩니다.</div>
            </label>
            <div style="display:flex; gap:4px;">
              <select id="propTransitionSelect"
                style="flex:1; height:24px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; padding:0 6px;">
                <option value="">없음</option>
                <option value="fade">페이드 (Fade)</option>
                <option value="zoomIn">줌 인 (Zoom In)</option>
                <option value="zoomOut">줌 아웃 (Zoom Out)</option>
                <option value="slideLeft">왼쪽 밀기 (Slide L)</option>
                <option value="slideRight">오른쪽 밀기 (Slide R)</option>
                <option value="spin">회전 (Spin)</option>
              </select>
              <button id="btnApplyEffect"
                style="padding:0 8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; height:24px; box-sizing:border-box; white-space:nowrap; box-shadow:0 1px 2px rgba(37,99,235,0.2);">클립</button>
              <button id="btnApplyTrackEffect"
                style="padding:0 8px; background:#8b5cf6; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; height:24px; box-sizing:border-box; white-space:nowrap; box-shadow:0 1px 2px rgba(139,92,246,0.2);">트랙</button>
            </div>
          </div>
        </div>
      </aside>
      <div class="workspace-center">
        <div class="canvas-toolbar" style="display:flex; gap:8px; justify-content:flex-end;">
          <button id="undoBtn" class="toolbar-btn btn-undo" title="이전 (Undo)" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:18px;">↶</button>
          <button id="redoBtn" class="toolbar-btn btn-undo" title="이후 (Redo)" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:18px;">↷</button>
        </div>
        <main class="canvas-area">
          <canvas id="mainCanvas"></canvas>
        </main>
      </div>
      <aside class="right-panel" style="display:flex;flex-direction:column;">
        <div class="panel-title">PROPERTIES</div>
        <div id="propertiesPanel" style="flex:1;overflow-y:auto;">
          <select id="propTrackIndex" style="display:none;"></select>
          <div class="prop-group prop-common flex-row-center" style="gap:4px;">
            <label style="margin:0;white-space:nowrap;width:40px;">투명도</label>
            <input type="range" id="propOpacity" min="0" max="100" value="100" style="flex:1;min-width:30px;">
            <input type="number" id="propOpacityNum" min="0" max="100" value="100" step="1"
              style="width:42px;padding:2px 3px;font-size:11px;text-align:center;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;">
            <label style="margin:0;margin-left:6px;white-space:nowrap;width:28px;">회전</label>
            <input type="range" id="propAngle" min="-180" max="180" value="0" style="flex:1;min-width:30px;">
            <input type="number" id="propAngleNum" min="-180" max="180" value="0" step="1"
              style="width:46px;padding:2px 3px;font-size:11px;text-align:center;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;">
          </div>
          <div class="prop-group prop-image-mask" style="margin-top: 5px; margin-bottom: 5px;">
            <label style="margin-bottom: 4px; display: block;">캔버스 크기에 맞추기</label>
            <div style="display:flex; gap: 4px;">
              <button type="button" onclick="if(window.fitObjectToCanvas) window.fitObjectToCanvas('fill')" style="flex:1; height:20px; border:none; border-radius:3px;font-size:10px;background:#e2e8f0; cursor:pointer;" title="비율 무시하고 100% 맞추기">전체</button>
              <button type="button" onclick="if(window.fitObjectToCanvas) window.fitObjectToCanvas('width')" style="flex:1; height:20px; border:none; border-radius:3px;font-size:10px; background:#e2e8f0; cursor:pointer;" title="가로 비율 유지하여 맞추기">가로</button>
              <button type="button" onclick="if(window.fitObjectToCanvas) window.fitObjectToCanvas('height')" style="flex:1; height:20px; border:none; border-radius:3px;font-size:10px; background:#e2e8f0; cursor:pointer;" title="세로 비율 유지하여 맞추기">세로</button>
            </div>
          </div>
          <div class="prop-group prop-common prop-scale-group flex-row-center">
            <label style="margin:0;white-space:nowrap;">크기</label>
            <input type="range" id="propScale" min="10" max="300" value="100" style="flex:1;min-width:40px;">
            <label style="margin:0;margin-left:4px;white-space:nowrap;">W</label>
            <input type="number" id="propScaleX" min="20" max="300" value="100" style="width:45px;padding:4px;">
            <label style="margin:0;margin-left:4px;white-space:nowrap;">H</label>
            <input type="number" id="propScaleY" min="20" max="300" value="100" style="width:45px;padding:4px;">
          </div>
          <div class="compact-grid">
            <div class="prop-group prop-text" style="grid-column: span 2;">
              <label>폰트 선택</label>
              <div style="position:relative; width:100%;">
                <button type="button" id="fontBtn"
                  style="width:100%; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; background:white; text-align:left; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-size:12px; font-weight:bold; height:24px; box-sizing:border-box;">
                  <span id="fontLabel" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Pretendard</span>
                  <svg style="width:14px; height:14px; flex-shrink:0;" fill="none" stroke="#94a3b8"
                    viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                <div id="fontList" class="dropdown-list hidden" style="max-height:60vh;"></div>
              </div>
            </div>

            <div class="prop-group prop-text">
              <label>폰트 크기</label>
              <div class="num-ctrl"><button type="button" class="num-btn"
                  onclick="stepInput('propFontSize', -5)">-</button><input type="number" id="propFontSize" min="20"
                  max="400" value="80"><button type="button" class="num-btn"
                  onclick="stepInput('propFontSize', 5)">+</button></div>
            </div>
            <div class="prop-group prop-text">
              <label>폰트 색상</label>
              <input type="color" id="propFill" value="#000000">
            </div>

            <div class="prop-group prop-text">
              <label>외곽선 두께</label>
              <div class="num-ctrl"><button type="button" class="num-btn"
                  onclick="stepInput('propStrokeWidth', -1)">-</button><input type="number" id="propStrokeWidth" min="0"
                  max="30" value="0"><button type="button" class="num-btn"
                  onclick="stepInput('propStrokeWidth', 1)">+</button></div>
            </div>
            <div class="prop-group prop-text">
              <label>외곽선 색상</label>
              <input type="color" id="propStroke" value="#000000">
            </div>

            <div class="prop-group prop-text" style="grid-column: span 2;">
              <label>그림자 효과 (크기 / 번짐 / 색상)</label>
              <div style="display:flex; gap:6px;">
                <div class="num-ctrl" style="flex:1.5;"><button type="button" class="num-btn"
                    onclick="stepInput('shadowOffset', -1)">-</button><input type="number" id="shadowOffset" min="-100"
                    max="100" value="0" title="그림자 크기(방향)"><button type="button" class="num-btn"
                    onclick="stepInput('shadowOffset', 1)">+</button></div>
                <div class="num-ctrl" style="flex:1.5;"><button type="button" class="num-btn"
                    onclick="stepInput('shadowBlur', -1)">-</button><input type="number" id="shadowBlur" min="0"
                    max="100" value="0" title="그림자 번짐"><button type="button" class="num-btn"
                    onclick="stepInput('shadowBlur', 1)">+</button></div>
                <input type="color" id="shadowColor" value="#000000"
                  style="flex:1; height:24px; border:1px solid #cbd5e1; border-radius:4px; padding:0; cursor:pointer;"
                  title="그림자 색상">
              </div>
            </div>

            <div class="prop-group prop-text">
              <label>자간</label>
              <div class="num-ctrl"><button type="button" class="num-btn"
                  onclick="stepInput('propCharSpacing', -5)">-</button><input type="number" id="propCharSpacing"
                  min="-200" max="1000" value="0"><button type="button" class="num-btn"
                  onclick="stepInput('propCharSpacing', 5)">+</button></div>
            </div>
            <div class="prop-group prop-text">
              <label>줄간격</label>
              <div class="num-ctrl"><button type="button" class="num-btn"
                  onclick="stepInput('propLineHeight', -0.1)">-</button><input type="number" id="propLineHeight"
                  min="0.6" max="3" step="0.1" value="1.1"><button type="button" class="num-btn"
                  onclick="stepInput('propLineHeight', 0.1)">+</button></div>
            </div>

            <div class="prop-group prop-media">
              <label>음량(%)</label>
              <input type="range" id="propVolume" min="0" max="100" value="100">
            </div>
            <div class="prop-group prop-image-mask" style="grid-column: span 2;">
              <label>이미지 투명 편집</label>
              <button type="button" id="imageAlphaEditBtn"
                style="width:100%;height:28px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-weight:800;cursor:pointer;">투명 영역 편집</button>
            </div>
          </div>
          <div class="prop-group prop-text">
            <label>자막 내용</label>
            <textarea id="subtitleTextInput" rows="3"></textarea>
          </div>
          <div class="prop-group prop-text">
            <label>정렬 및 스타일</label>
            <div style="display:flex; gap:6px;">
              <div class="layer-buttons" style="flex:1;">
                <button id="alignLeftBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="17" y1="10" x2="3" y2="10"></line>
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="21" y1="14" x2="3" y2="14"></line>
                    <line x1="17" y1="18" x2="3" y2="18"></line>
                  </svg></button>
                <button id="alignCenterBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="10" x2="6" y2="10"></line>
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="21" y1="14" x2="3" y2="14"></line>
                    <line x1="18" y1="18" x2="6" y2="18"></line>
                  </svg></button>
                <button id="alignRightBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="21" y1="10" x2="7" y2="10"></line>
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="21" y1="14" x2="3" y2="14"></line>
                    <line x1="21" y1="18" x2="7" y2="18"></line>
                  </svg></button>
              </div>
              <div class="layer-buttons" style="flex:1;">
                <button id="fontNormalBtn" title="Normal" style="font-weight:normal; font-size:12px;">N</button>
                <button id="fontBoldBtn" title="Bold" style="font-weight:bold; font-size:12px;">B</button>
                <button id="fontItalicBtn" title="Italic"
                  style="font-style:italic; font-family:serif; font-size:12px;">I</button>
              </div>
            </div>
          </div>
          <div class="prop-preset prop-group"
            style="background:#f1f5f9; padding:8px; border-radius:6px; margin-top:8px;">
            <label style="margin-bottom:6px;">자막 프리셋</label>
            <div style="display:flex; gap:4px; margin-bottom:6px;">
              <input type="text" id="presetNameInput" placeholder="새 프리셋 이름"
                style="flex:1; height:24px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; padding:0 6px;">
              <button id="savePresetBtn"
                style="padding:0 12px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; height:24px; box-sizing:border-box; white-space:nowrap; box-shadow:0 1px 2px rgba(16,185,129,0.2);">저장</button>
            </div>
            <div style="display:flex; gap:4px;">
              <select id="presetSelect"
                style="flex:1; height:24px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; padding:0 6px; appearance:none; -webkit-appearance:none; -moz-appearance:none;"></select>
              <button id="loadPresetBtn"
                style="padding:0 12px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; height:24px; box-sizing:border-box; white-space:nowrap; box-shadow:0 1px 2px rgba(37,99,235,0.2);">적용</button>
              <button id="deletePresetBtn"
                style="padding:0 12px; background:#fee2e2; color:#ef4444; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; height:24px; box-sizing:border-box; white-space:nowrap;">삭제</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
    <div class="timeline-wrap">
      <div class="timeline-top">
        <div class="timeline-time-wrap">
          <div id="currentTimeText">00:00</div>
          <div>/</div>
          <div id="durationText">00:00</div>
        </div>
        <div class="timeline-cut-controls" style="display:flex; align-items:center;">
          <div style="display:flex; gap:2px; margin-right:12px;">
            <button id="projectNewBtn" title="새 프로젝트"
              style="background:#96d1b0;color:#1e293b;border:none;border-radius:4px;padding:0;width:28px;height:24px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
            </button>
          </div>
          <div style="display:flex; gap:2px; margin-right:12px;">
            <button id="trimLeftBtn" title="왼쪽 자르기" style="background:#ccccff;"><svg width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M4 2v20 M20 6l-8 6 8 6Z" />
              </svg></button>
            <button id="rangeCutBtn" title="구간 선택" style="background:#ccccff;"><svg width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M9 4H5v16h4 M15 4h4v16h-4" />
              </svg></button>
            <button id="trimRightBtn" title="오른쪽 자르기" style="background:#ccccff;"><svg width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M20 2v20 M4 6l8 6-8 6Z" />
              </svg></button>
          </div>
          <div style="display:flex; gap:2px; margin-right:12px;">
            <button id="splitClipBtn" title="클립 자르기 (C)" style="background:#ffccff;"><svg width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
                <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
              </svg></button>
            <button id="copyClipBtn" title="클립 복사" style="background:#ffccff;"><svg width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg></button>
            <button id="pasteClipBtn" title="클립 붙이기" style="background:#ffccff;"><svg width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg></button>
          </div>
          <div style="display:flex; gap:2px; margin-right:12px;">
            <button id="moveUpBtn" class="move-btn" title="위 트랙으로 이동" style="background:#e7f1ec;"><svg width="14"
                height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg></button>
            <button id="moveDownBtn" class="move-btn" title="아래 트랙으로 이동" style="background:#e7f1ec;"><svg width="14"
                height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg></button>
          </div>
          <div style="display:flex; gap:2px; margin-right:12px;">
            <button id="swapPrevBtn" class="swap-btn" title="앞 클립과 교환" style="background:#ececdf;">◀</button>
            <button id="swapNextBtn" class="swap-btn" title="뒤 클립과 교환" style="background:#ececdf;">▶</button>
          </div>
          <div style="display:flex; gap:2px; margin-right:12px;">
            <button id="magnetStartBtn" class="mag-btn" title="선택 붙이기 (S)" style="background:#ece3ff;"><svg width="16"
                height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="4" x2="4" y2="20"></line>
                <polygon points="20 4 8 12 20 20 20 4"></polygon>
              </svg></button>
            <button id="magnetBackBtn" class="mag-btn" title="뒤 클립/파란선에 붙이기 (B)" style="background:#ece3ff;"><svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polygon points="4 4 16 12 4 20 4 4"></polygon>
                <line x1="20" y1="4" x2="20" y2="20"></line>
              </svg></button>
            <button id="magnetAllBtn" class="mag-btn" title="전체 이어붙이기 (A)" style="background:#ece3ff;">A</button>&nbsp;&nbsp;
            <button id="deleteBlueGuidelineBtn" class="mag-btn" title="선택한 파란 기준선 삭제 (Del)" style="background:#ff9999;color:#00ffff;font:bold;display:none;">Ⅸ</button>
          </div>
          <div style="display:flex; gap:2px;">
            <button id="resetClipBtn" class="reset-btn" title="선택 클립 초기화 (↺C)" style="background:#edffe3;">↺C</button>
            <button id="resetTrackBtn" class="reset-btn" title="트랙 클립들 초기화 (↺T)" style="background:#edffe3;">↺T</button>
            <button id="deleteLayerBtn" class="reset-btn" title="선택 항목 삭제 (Del)" style="background:#fee2e2; color:#ef4444; margin-left:4px; display:none;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
          <div id="autoSubtitleWrap" style="display:none; gap:6px; margin-left:12px; align-items:center;" hidden aria-hidden="true">
            <div id="autoSubtitlePopup" class="auto-subtitle-popup" hidden role="status" aria-live="polite">
              실시간 자막 추출 중입니다.<br>끝날 때까지 기다려주십시요.
            </div>
            <button id="autoSubtitleBtn" title="자동 자막 생성 (AI)"
              style="background:#e6e6ff; color:#f4b69d; font-weight:bold; padding:0; width:28px; border-radius:4px; font-size:0.7em; height:24px; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f4b69d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
              </svg>
            </button>
            <button id="autoSubtitleToggleBtn" title="자막 추출 일시정지"
              style="background:#f59e0b; color:white; font-weight:bold; padding:0 10px; border-radius:4px; font-size:0.7em; height:24px; border:none; cursor:pointer; align-items:center; justify-content:center; min-width:28px;">⏸</button>
            <button id="autoSubtitleStopBtn" title="자막 추출 종료"
              style="background:#ef4444; color:white; font-weight:bold; padding:0 10px; border-radius:4px; font-size:0.7em; height:24px; border:none; cursor:pointer;">종료</button>
            <span id="autoSubtitleStatus" style="font-size:11px; color:#64748b; display:none;">모델 로딩 중...</span>
          </div>
        </div>
        <div class="timeline-zoom-wrap" style="margin-left: auto;">
          <select id="defaultZoomSelect"
            style="width:60px;margin:0 4px;padding:4px;border-radius:4px;border:1px solid #cbd5e1;">
            <option value="1">1X</option>
            <option value="2">2X</option>
            <option value="3">3X</option>
            <option value="4">4X</option>
            <option value="5">5X</option>
            <option value="7">7X</option>
            <option value="10">10X</option>
            <option value="15">15X</option>
            <option value="20">20X</option>
            <option value="25">25X</option>
            <option value="35">35X</option>
            <option value="40">40X</option>
          </select>
          <button id="zoomOutBtn" title="축소 (−)">−</button>
          <input type="range" id="timelineZoom" min="1" max="40" step="1" value="5">
          <button id="zoomInBtn" title="확대 (+)">+</button>
        </div>
      </div>
      <div class="timeline-main">
        <div class="timeline-progress-row">
          <div class="timeline-controls">
            <button id="timelinePlayBtn">▶</button>
            <button id="timelineStopBtn">↺</button>
          </div>
          <div id="timelineBar">
            <div id="timelineProgress"></div>
          </div>
        </div>
        <div id="blueGuidelinesLayer"></div>
        <div id="yellowPlayhead">
          <div class="playhead-handle"></div>
        </div>
        <div id="timelineTracks"></div>
        <div id="timelineRuler" class="timeline-ruler"></div>
        <div id="timelineScrollbar" class="timeline-scrollbar">
          <div id="timelineScrollThumb"></div>
          <div id="whitePlayhead">
            <div class="white-playhead-hit" title="재생 위치 (드래그)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="toast"></div>
  <div id="lyricsSubtitleModal" class="modal-overlay lyrics-modal-overlay" aria-modal="true" role="dialog" style="display:none;">
    <div class="modal-content lyrics-modal-content" tabindex="-1">
      <div class="lyrics-modal-header">
        <div class="modal-title">🎵 가사 자막 작업</div>
        <div class="lyrics-modal-header-actions">
          <input type="file" id="lyricsModalClipInput" accept=".lyricsclip.json,.json" hidden>
          <button type="button" id="lyricsModalClipImportBtn" class="lyrics-secondary-btn">가사 클립 불러오기</button>
          <button type="button" id="lyricsModalCloseBtn" class="lyrics-modal-close" title="닫기">✕</button>
        </div>
      </div>

      <div id="lyricsInputPhase" class="lyrics-phase">
        <label class="lyrics-label">가사 입력 (한 줄에 한 구절)</label>
        <textarea id="lyricsTextInput" class="lyrics-textarea lyrics-textarea-grow" rows="8" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="노래 가사를 줄마다 입력하세요 (구조 태그는 자동 제거)"></textarea>
        <label class="lyrics-label">오디오</label>
        <div class="lyrics-audio-pick">
          <input type="file" id="lyricsAudioFile" accept="audio/*" hidden>
          <button type="button" id="lyricsAudioPickBtn" class="lyrics-secondary-btn">파일 선택</button>
          <span id="lyricsAudioFileName" class="lyrics-audio-name">없음</span>
        </div>
        <div class="lyrics-action-row">
          <button type="button" id="lyricsPrepareBtn" class="lyrics-primary-btn">가사자막 만들기</button>
        </div>
      </div>

      <div id="lyricsWorkPhase" class="lyrics-phase hidden">
        <p id="lyricsStatus" class="lyrics-status">재생하며 각 줄 [▶]·[타임]으로 시간을 맞추세요.</p>
        <div id="lyricsExtractProgress" class="lyrics-extract-progress hidden" role="status" aria-live="polite"></div>
        <div id="lyricsLineList" class="lyrics-line-list"></div>
        <div id="lyricsFlowPreview" class="lyrics-flow-preview" aria-live="polite">
          <div class="lyrics-flow-preview-inner">
            <span id="lyricsFlowPreviewText" class="lyrics-flow-preview-text"></span>
          </div>
        </div>
        <div class="lyrics-audio-timeline">
          <div class="lyrics-time-row">
            <span id="lyricsAudioCur">00:00</span><span>/</span><span id="lyricsAudioDur">00:00</span>
          </div>
          <input type="range" id="lyricsAudioSeek" min="0" max="1000" value="0" step="1">
          <audio id="lyricsAudioEl" preload="auto"></audio>
        </div>
        <div class="lyrics-action-row lyrics-action-row-wrap">
          <button type="button" id="lyricsPlayPauseBtn" class="lyrics-secondary-btn">▶ 재생</button>
          <button type="button" id="lyricsExtractStopBtn" class="lyrics-secondary-btn hidden" title="AI 추출 중지">추출 중지</button>
          <button type="button" id="lyricsSaveMp3Btn" class="lyrics-secondary-btn" disabled title="MP3 가사 저장">MP3 가사 저장</button>
          <button type="button" id="lyricsCompleteBtn" class="lyrics-complete-btn">완료 (타임라인에 클립 배치)</button>
        </div>
      </div>
    </div>
  </div>
  <div id="newProjectModal" class="modal-overlay">
    <div class="modal-content new-project-modal">
      <div class="new-project-modal-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2v6h-6"></path>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
          <path d="M3 22v-6h6"></path>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
      </div>
      <div class="modal-title">새 프로젝트</div>
      <div class="modal-desc">현재 작업 중인 모든 클립·자막·오디오가 삭제됩니다.<br>저장하지 않은 내용은 복구할 수 없습니다.</div>
      <div class="modal-buttons new-project-modal-actions">
        <button type="button" id="newProjectCancelBtn" class="cancel-btn">취소</button>
        <button type="button" id="newProjectConfirmBtn" class="new-project-confirm-btn">새로 시작</button>
      </div>
    </div>
  </div>
  <div id="imageAlphaModal" class="modal-overlay image-alpha-modal-overlay" style="display:none;" aria-modal="true" role="dialog">
    <div class="image-alpha-modal-content">
      <div class="image-alpha-header">
        <div class="modal-title">이미지 투명 영역 편집</div>
        <button type="button" id="imageAlphaCloseBtn" class="lyrics-modal-close" title="닫기">✕</button>
      </div>
      <div class="image-alpha-toolbar">
        <button type="button" class="image-alpha-tool active" data-tool="brush">붓</button>
        <button type="button" class="image-alpha-tool" data-tool="rect">사각형</button>
        <button type="button" class="image-alpha-tool" data-tool="circle">원</button>
        <button type="button" class="image-alpha-tool" data-tool="ellipse">타원</button>
        <button type="button" class="image-alpha-tool" data-tool="heart">하트</button>
        <button type="button" class="image-alpha-tool" data-tool="star">별</button>
        <button type="button" class="image-alpha-tool" data-tool="flower">꽃</button>
        <button type="button" class="image-alpha-tool" data-tool="gear">톱니</button>
        <button type="button" class="image-alpha-tool" data-tool="drop">방울</button>
        <button type="button" class="image-alpha-tool" data-tool="ribbon">리본</button>
        <button type="button" class="image-alpha-tool" data-tool="free">자유형</button>
        <label class="image-alpha-brush-label">붓 크기
          <input type="range" id="imageAlphaBrushSize" min="4" max="120" value="28">
        </label>
        <button type="button" id="imageAlphaUndoBtn">되돌리기</button>
        <button type="button" id="imageAlphaResetBtn">원본 복원</button>
        <span id="imageAlphaStatus" class="image-alpha-status">이미지 클립을 선택해 주세요</span>
      </div>
      <div class="image-alpha-stage">
        <div class="image-alpha-canvas-wrap">
          <canvas id="imageAlphaCanvas"></canvas>
          <canvas id="imageAlphaPreviewCanvas"></canvas>
        </div>
      </div>
      <div class="image-alpha-actions">
        <button type="button" id="imageAlphaSavePngBtn">PNG로 저장</button>
        <button type="button" id="imageAlphaApplyBtn">현재 클립에 적용</button>
      </div>
    </div>
  </div>
  <div id="overlapModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-title">클립 겹침 발생</div>
      <div class="modal-desc">이동하려는 트랙에 이미 다른 클립이 존재합니다. 빈 트랙을 선택해 주세요.</div>
      <div id="modalEmptyTrackList" class="modal-buttons" style="margin-bottom:12px;"></div>
      <div class="modal-buttons">
        <button id="btnAppendClip">해당 클립 뒤에 붙이기</button>
        <button id="btnCancelMove" class="cancel-btn">취소</button>
      </div>
    </div>
  </div>
  <div id="previewModal" class="modal-overlay" style="z-index:999999;">
    <div class="modal-content" style="width:600px;text-align:center;">
      <div class="modal-title">🎬 완성된 클립 미리보기</div>
      <video id="previewVideoEl" controls autoplay loop
        style="max-width:100%;max-height:300px;background:#000;margin-bottom:10px;border-radius:8px;"></video>
      <div class="flex-row-center" style="margin-bottom:10px; padding:0 10px; gap:8px;">
        <span id="previewTimeText" style="font-size:12px; font-weight:bold; color:#475569; width:40px;">0.0s</span>
        <input type="range" id="previewProgressBar" min="0" max="100" value="0" style="flex:1;">
      </div>
      <div id="previewDurationInfo"
        style="color:#ef4444;font-size:13px;font-weight:bold;margin-bottom:10px;border:1px dashed #cbd5e1;padding:8px;background:#f8fafc;border-radius:4px;">
        저장 길이 계산 중...</div>
      <div class="flex-row-center" style="margin-bottom:15px;background:#f1f5f9;padding:10px;border-radius:6px;">
        <label style="margin:0;font-weight:bold;">재생 속도 (빠르기)</label>
        <input type="range" id="previewSpeedSlider" min="0.1" max="5" step="0.1" value="1" style="flex:1;">
        <span id="previewSpeedVal" style="font-weight:bold;color:#2563eb;width:40px;">1.0x</span>
        <button id="previewSpeed1xBtn"
          style="margin-left:8px;padding:4px 8px;background:#e2e8f0;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;">1X
          리셋</button>
      </div>
      <div class="modal-buttons" style="flex-direction:row;">
        <button id="previewSaveBtn"
          style="flex:1;background:#10b981;font-size:14px;color:white;border:none;border-radius:6px;padding:10px;cursor:pointer;font-weight:bold;">✅
          최종 타임라인에 추가</button>
        <button id="previewCancelBtn" class="cancel-btn"
          style="flex:1;font-size:14px;background:#e2e8f0;color:#475569;border:none;border-radius:6px;padding:10px;cursor:pointer;font-weight:bold;">❌
          다시 만들기</button>
      </div>
    </div>
  </div>
  <div id="drawModal" class="modal-overlay">
    <div class="modal-content"
      style="position:absolute;inset:24px;width:auto;height:auto;display:flex;gap:12px;padding:10px;flex-direction:row;background:#1e293b;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.6);overflow:hidden;">
      <div class="draw-tools-panel" style="width:340px;overflow-y:auto;background:#f8fafc;padding:10px;">
        <div class="tool-box" style="border-color:#ef4444;background:#fff1f2;padding:8px;">
          <div class="flex-row-center" style="gap:4px;margin-bottom:6px;">
            <button id="popupRecordContBtn"
              style="background:#ef4444;color:white;padding:8px 6px;border-radius:4px;border:none;font-weight:bold;cursor:pointer;font-size:12px;flex:1;">연속녹화</button>
            <button id="popupRecordInterBtn"
              style="background:#f97316;color:white;padding:8px 6px;border-radius:4px;border:none;font-weight:bold;cursor:pointer;font-size:12px;flex:1;">단속녹화</button>
            <button id="popupStopBtn"
              style="display:none;background:#10b981;color:white;padding:8px 6px;border-radius:4px;border:none;font-weight:bold;cursor:pointer;font-size:12px;flex:1;">⏹
              녹화 종료</button>
          </div>
          <div class="flex-row-center" style="justify-content:center;">
            <span id="popupRecordTimer"
              style="display:none;color:#ef4444;font-weight:bold;font-size:14px;margin-right:8px;">00.0초</span>
            <input type="checkbox" id="recordEraseCheck" style="width:auto;margin:0 4px 0 0;cursor:pointer;">
            <label for="recordEraseCheck"
              style="margin:0 8px 0 0;cursor:pointer;font-weight:bold;color:#1e293b;font-size:11px;">지우개 궤적 녹화</label>
            <input type="checkbox" id="waveIncludeAudioCheck" style="width:auto;margin:0 4px 0 0;cursor:pointer;">
            <label for="waveIncludeAudioCheck"
              style="margin:0;cursor:pointer;font-weight:bold;color:#1e293b;font-size:11px;">오디오 녹화 포함</label>
          </div>
        </div>
        <div style="position:relative;">
          <div id="fpBlockOverlay"
            style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.7);z-index:10;align-items:center;justify-content:center;color:#ef4444;font-weight:bold;font-size:13px;border-radius:4px;">
            단속녹화 중 사용 불가</div>
          <div class="modal-title" style="margin-top:4px;margin-bottom:6px;font-size:13px;">화면 필터 & 파티클 엔진</div>
          <div class="tool-box" style="padding:8px;">
            <label>컬러 필터 (전체 덮기)</label>
            <select id="colorFilterMode"
              style="margin-bottom:4px;width:100%;padding:4px;border-radius:4px;border:1px solid #cbd5e1;">
              <option value="manual">단색 수동 조절</option>
              <option value="sweep">좌우 스윕 자동</option>
              <option value="random">랜덤 플래시 자동</option>
            </select>
            <div class="flex-row-center" style="margin-bottom:6px;">
              <label style="font-size:10px;width:45px;margin:0;">왕복시간</label>
              <input type="number" id="filterSweepTime" min="1" max="10" step="0.5" value="5"
                style="flex:1;width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
            </div>
            <div class="flex-row-center"
              style="background:#e0f2fe;padding:4px;border-radius:4px;border:1px solid #7dd3fc;">
              <input type="checkbox" id="colorFilterToggle" style="margin:0;cursor:pointer;">
              <label for="colorFilterToggle"
                style="margin:0 0 0 4px;cursor:pointer;font-weight:bold;color:#0369a1;font-size:11px;">필터 효과 켜기</label>
            </div>
          </div>
          <div class="tool-box" style="padding:8px;">
            <label>파티클 입자</label>
            <select id="particleItemSelect" style="display:none;">
              <option value="snow">❄ 눈송이</option>
              <option value="rain">🌧 비</option>
              <option value="petal">🌸 벚꽃잎</option>
              <option value="bubble">🫧 비눗방울</option>
              <option value="heart">💖 하트</option>
              <option value="star">⭐ 별</option>
              <option value="music">🎵 음표</option>
              <option value="confetti">🎉 색종이</option>
              <option value="flower">✿ 꽃</option>
              <option value="spark">✨ 불꽃</option>
              <option value="fog">🌫️ 안개</option>
              <option value="steam">☁️ 수증기</option>
            </select>
            <div id="particleGrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin-bottom:6px;">
              <button class="p-grid-btn" data-val="snow"     title="눈송이"   style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">❄</button>
              <button class="p-grid-btn" data-val="rain"     title="비"       style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🌧</button>
              <button class="p-grid-btn" data-val="petal"    title="벚꽃잎"  style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🌸</button>
              <button class="p-grid-btn" data-val="bubble"   title="비눗방울" style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🫧</button>
              <button class="p-grid-btn" data-val="heart"    title="하트"     style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">💖</button>
              <button class="p-grid-btn" data-val="star"     title="별"       style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">⭐</button>
              <button class="p-grid-btn" data-val="music"    title="음표"     style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🎵</button>
              <button class="p-grid-btn" data-val="confetti" title="색종이"   style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🎉</button>
              <button class="p-grid-btn" data-val="flower"   title="꽃"       style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">✿</button>
              <button class="p-grid-btn" data-val="spark"    title="불꽃"     style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">✨</button>
              <button class="p-grid-btn" data-val="fog"      title="안개"     style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🌫️</button>
              <button class="p-grid-btn" data-val="steam"    title="수증기"   style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">☁️</button>
            </div>
            <div id="particleSelectedLabel" style="font-size:10px;color:#64748b;margin-bottom:4px;text-align:center;">❄ 눈송이 선택됨</div>
            <div style="display:flex;gap:8px;justify-content:center;margin-bottom:6px;">
              <label style="display:flex;align-items:center;gap:2px;font-size:12px;font-weight:bold;cursor:pointer;"><input type="checkbox" id="pCtrlUp" style="width:auto;margin:0;"> ↑</label>
              <label style="display:flex;align-items:center;gap:2px;font-size:12px;font-weight:bold;cursor:pointer;"><input type="checkbox" id="pCtrlDown" style="width:auto;margin:0;"> ↓</label>
              <label style="display:flex;align-items:center;gap:2px;font-size:12px;font-weight:bold;cursor:pointer;"><input type="checkbox" id="pCtrlGrow" style="width:auto;margin:0;"> +</label>
              <label style="display:flex;align-items:center;gap:2px;font-size:12px;font-weight:bold;cursor:pointer;"><input type="checkbox" id="pCtrlOff" style="width:auto;margin:0;"> X</label>
            </div>
            <div class="compact-grid">
              <div>
                <label style="font-size:10px;">생성량</label>
                <input type="number" id="pAmt" min="0" max="50" value="5"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">크기</label>
                <input type="number" id="pSz" min="1" max="100" value="15"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">속도</label>
                <input type="number" id="pSpd" min="0" max="150" value="30"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">바람진폭</label>
                <input type="number" id="pWnd" min="0" max="100" value="20"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">투명도 (%)</label>
                <input type="number" id="pOpac" min="0" max="100" value="80"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">블러 (px)</label>
                <input type="number" id="pBlur" min="0" max="30" value="0"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div style="display:flex;align-items:center;gap:4px;height:100%;margin-top:12px;">
                <input type="checkbox" id="pUseCol" style="width:auto;margin:0;cursor:pointer;">
                <label for="pUseCol" style="font-size:10px;margin:0;cursor:pointer;font-weight:bold;">지정 색상 사용</label>
              </div>
              <div>
                <label style="font-size:10px;">색상 선택</label>
                <input type="color" id="pColVal" value="#ffffff"
                  style="width:100%;height:24px;padding:0;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;">
              </div>
            </div>
          </div>
        </div>

        <div class="modal-title" style="margin-top:4px;margin-bottom:6px;font-size:13px;">뮤직웨이브 (Waveform)</div>
        <div class="tool-box" style="padding:8px;">
          <div class="flex-row-center" style="gap:4px;margin-bottom:6px;">
            <select id="waveModeSelect"
              style="width:100%;padding:4px;border-radius:4px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;">
              <option value="none">사용 안함</option>
              <option value="effect">단순효과 파형 (애니메이션)</option>
              <option value="audio">오디오 파형 (파일 업로드)</option>
            </select>
          </div>
          <div id="waveOptionsDiv" style="display:none;">
            <div class="flex-row-center" style="gap:4px;margin-bottom:6px;">
              <select id="waveShapeSelect"
                style="flex:1;padding:4px;border-radius:4px;border:1px solid #cbd5e1;font-size:11px;">
                <option value="bar">막대형 (하단)</option>
                <option value="mirror-bar">대칭 막대형 (중앙)</option>
                <option value="line">선형 (중앙)</option>
                <option value="wave">채워진 물결 (하단)</option>
                <option value="circle">원형 (중앙)</option>
                <option value="dots">점형 (분산)</option>
                <option value="stamp">도장 연동 (Stamp)</option>
                <option value="performance">퍼포먼스 방출</option>
              </select>
              <select id="waveColorSelect"
                style="flex:1;padding:4px;border-radius:4px;border:1px solid #cbd5e1;font-size:11px;">
                <option value="tier3" selected>3단 색상 (저/중/고)</option>
                <option value="brush">브러시 색상</option>
                <option value="rainbow">무지개</option>
                <option value="gradient">그라데이션</option>
              </select>
            </div>
            <div class="compact-grid" style="margin-bottom:6px; grid-template-columns: repeat(3, 1fr);">
              <div>
                <label style="font-size:10px;">속도(x)</label>
                <input type="number" id="waveSpeed" min="0.1" max="5.0" step="0.1" value="1.0"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">파형 갯수</label>
                <select id="waveCount"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;font-size:10px;">
                  <option value="16">16</option>
                  <option value="32">32</option>
                  <option value="64">64</option>
                  <option value="128" selected>128</option>
                  <option value="256">256</option>
                </select>
              </div>
              <div>
                <label style="font-size:10px;">선 두께</label>
                <input type="number" id="waveLineWidth" min="1" max="50" value="5"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">가로크기(%)</label>
                <input type="number" id="waveWidth" min="10" max="500" value="100"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">세로크기(%)</label>
                <input type="number" id="waveHeight" min="10" max="500" value="100"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">전체크기(%)</label>
                <input type="number" id="waveSize" min="10" max="500" value="100"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">가로(X %)</label>
                <input type="number" id="wavePosX" min="0" max="100" value="50"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10px;">세로(Y %)</label>
                <input type="number" id="wavePosY" min="0" max="100" value="50"
                  style="width:100%;padding:2px;border:1px solid #cbd5e1;border-radius:4px;">
              </div>
            </div>
            <div id="wavePerformanceOptions" style="display:none;margin-bottom:6px;">
              <label style="font-size:10px; font-weight:bold;">방출 형태</label>
              <select id="wavePerformanceMode"
                style="width:100%;padding:4px;border-radius:4px;border:1px solid #cbd5e1;font-size:11px;">
                <option value="burst">사방으로 퍼지기 (Burst)</option>
                <option value="fountain">위로 솟구치기 (Fountain)</option>
              </select>
            </div>
            <div id="waveAudioDiv" style="display:none;margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:6px;">
              <input type="file" id="waveAudioInput" accept="audio/*" hidden>
              <button id="waveAudioBtn" class="layer-btn-custom"
                style="width:100%;font-weight:bold;margin-bottom:4px;font-size:11px;">🎵 오디오 파일 불러오기</button>
              <div id="waveAudioLabel"
                style="font-size:10px;color:#64748b;margin-bottom:4px;text-align:center;word-break:break-all;">오디오 없음
              </div>
              <div class="flex-row-center" style="justify-content:center;gap:4px;margin-bottom:4px;">
                <button id="wavePlayBtn"
                  style="flex:1;background:#2563eb;color:white;border:none;border-radius:4px;padding:6px;font-size:11px;cursor:pointer;font-weight:bold;">▶
                  재생/녹화시작</button>
                <button id="wavePauseBtn"
                  style="flex:1;background:#f59e0b;color:white;border:none;border-radius:4px;padding:6px;font-size:11px;cursor:pointer;font-weight:bold;">⏸
                  일시정지</button>
                <button id="waveStopBtn"
                  style="flex:1;background:#ef4444;color:white;border:none;border-radius:4px;padding:6px;font-size:11px;cursor:pointer;font-weight:bold;">⏹
                  종료</button>
              </div>
              <div style="margin-top:4px;">
                <input type="range" id="waveAudioProgress" min="0" max="100" value="0"
                  style="width:100%;height:4px;accent-color:#2563eb;cursor:pointer;">
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:2px;">
                  <span id="waveAudioCurrent">0:00</span>
                  <span id="waveAudioDuration">0:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-title" style="margin-top:4px;margin-bottom:6px;font-size:13px;">도장 찍기</div>
        <div class="tool-box" style="padding:8px;">
          <div class="flex-row-center stamp-tabs" style="gap:4px;margin-bottom:6px;">
            <button class="stamp-tab active" data-page="1">1</button>
            <button class="stamp-tab" data-page="2">2</button>
            <button class="stamp-tab" data-page="3">3</button>
            <button class="stamp-tab" data-page="4">4</button>
          </div>
          <div id="stampPage1" class="stamp-grid">
            <button class="stamp-btn" data-stamp="●">●</button>
            <button class="stamp-btn" data-stamp="■">■</button>
            <button class="stamp-btn" data-stamp="▲">▲</button>
            <button class="stamp-btn" data-stamp="▼">▼</button>
            <button class="stamp-btn" data-stamp="◈">◈</button>
            <button class="stamp-btn" data-stamp="○">○</button>
            <button class="stamp-btn" data-stamp="□">□</button>
            <button class="stamp-btn" data-stamp="△">△</button>
            <button class="stamp-btn" data-stamp="▽">▽</button>
            <button class="stamp-btn" data-stamp="◇">◇</button>
            <button class="stamp-btn" data-stamp="◎">◎</button>
            <button class="stamp-btn" data-stamp="◉">◉</button>
            <button class="stamp-btn" data-stamp="▣">▣</button>
            <button class="stamp-btn" data-stamp="▤">▤</button>
            <button class="stamp-btn" data-stamp="▥">▥</button>
          </div>
          <div id="stampPage2" class="stamp-grid" style="display:none;">
            <button class="stamp-btn" data-stamp="★">★</button>
            <button class="stamp-btn" data-stamp="♥">♥</button>
            <button class="stamp-btn" data-stamp="☁">☁</button>
            <button class="stamp-btn" data-stamp="✈">✈</button>
            <button class="stamp-btn" data-stamp="❀">❀</button>
            <button class="stamp-btn" data-stamp="☂">☂</button>
            <button class="stamp-btn" data-stamp="☀">☀</button>
            <button class="stamp-btn" data-stamp="☾">☾</button>
            <button class="stamp-btn" data-stamp="♫">♫</button>
            <button class="stamp-btn" data-stamp="✎">✎</button>
          </div>
          <div id="stampPage3" class="stamp-grid" style="display:none;">
            <button class="stamp-btn" data-stamp="☺">☺</button>
            <button class="stamp-btn" data-stamp="☹">☹</button>
            <button class="stamp-btn" data-stamp="✌">✌</button>
            <button class="stamp-btn" data-stamp="✉">✉</button>
            <button class="stamp-btn" data-stamp="✂">✂</button>
            <button class="stamp-btn" data-stamp="♺">♺</button>
            <button class="stamp-btn" data-stamp="⚑">⚑</button>
            <button class="stamp-btn" data-stamp="⚠">⚠</button>
            <button class="stamp-btn" data-stamp="⚡">⚡</button>
            <button class="stamp-btn" data-stamp="❄">❄</button>
          </div>
          <div id="stampPage4" class="stamp-grid" style="display:none;">
            <button class="stamp-btn" data-stamp="➔">➔</button>
            <button class="stamp-btn" data-stamp="↔">↔</button>
            <button class="stamp-btn" data-stamp="↕">↕</button>
            <button class="stamp-btn" data-stamp="✔">✔</button>
            <button class="stamp-btn" data-stamp="✖">✖</button>
            <button class="stamp-btn" data-stamp="✚">✚</button>
            <button class="stamp-btn" data-stamp="➖">➖</button>
            <button class="stamp-btn" data-stamp="✿">✿</button>
            <button class="stamp-btn" data-stamp="🐾">🐾</button>
            <button class="stamp-btn" data-stamp="☕">☕</button>
          </div>
          <input type="file" id="customStampInput" accept="image/*" hidden>
          <button id="customStampBtn" class="layer-btn-custom" style="width:100%;margin-top:8px;font-weight:bold;">🖼️
            이미지 도장 불러오기</button>
        </div>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; gap:12px; overflow:hidden;">
        <!-- Top Workspace (2/3) -->
        <div id="drawWorkspaceArea"
          style="flex:2; height:66.6%; background:#e2e8f0; position:relative; overflow:hidden; display:flex; justify-content:center; align-items:center; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          <canvas id="drawPopupCanvas" width="800" height="450" style="touch-action:none;"></canvas>
        </div>
        <!-- Bottom Additional Menu (1/3) -->
        <div id="drawBottomMenu" class="draw-bottom-menu">
          <div class="draw-bottom-tabs" style="justify-content:space-between; align-items:center;">
            <!-- Left: Preset Controls (Compact) -->
            <div class="preset-controls-group" style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:11px; font-weight:bold; color:#cbd5e1; white-space:nowrap; display:flex; align-items:center; gap:3px; margin-right:4px;">💾 프리셋:</span>
              <input type="text" id="drawPresetNameInput" placeholder="새 프리셋 이름" 
                style="width:100px; height:24px; background:#111827; border:1px solid #4b5563; border-radius:4px; padding:0 6px; color:white; font-size:11px; box-sizing:border-box;">
              <button id="saveDrawPresetBtn" 
                style="background:#10b981; color:white; border:none; border-radius:4px; padding:0 10px; font-size:11px; font-weight:bold; cursor:pointer; transition:all 0.2s; height:24px; display:flex; align-items:center; justify-content:center;">
                저장
              </button>
              <div style="width:1px; height:14px; background:#374151; margin:0 4px;"></div>
              <select id="drawPresetSelect" 
                style="width:120px; height:24px; background:#111827; border:1px solid #4b5563; border-radius:4px; padding:0 4px; color:white; font-size:11px; cursor:pointer; box-sizing:border-box;">
                <option value="">-- 프리셋 선택 --</option>
              </select>
              <button id="loadDrawPresetBtn" 
                style="background:#2563eb; color:white; border:none; border-radius:4px; padding:0 10px; font-size:11px; font-weight:bold; cursor:pointer; transition:all 0.2s; height:24px; display:flex; align-items:center; justify-content:center;">
                적용
              </button>
              <button id="deleteDrawPresetBtn" 
                style="background:#ef4444; color:white; border:none; border-radius:4px; padding:0 10px; font-size:11px; font-weight:bold; cursor:pointer; transition:all 0.2s; height:24px; display:flex; align-items:center; justify-content:center;">
                삭제
              </button>
              <div style="width:1px; height:14px; background:#374151; margin:0 4px;"></div>
              <span style="font-size:11px; font-weight:bold; color:#cbd5e1; white-space:nowrap; display:flex; align-items:center; gap:3px;">🖥️ 해상도:</span>
              <select id="popupRatioSelect" 
                style="width:120px; height:24px; background:#111827; border:1px solid #4b5563; border-radius:4px; padding:0 4px; color:white; font-size:11px; cursor:pointer; box-sizing:border-box;">
                <option value="1920x1080">1920x1080(16:9)</option>
                <option value="1080x1920">1080x1920(9:16)</option>
                <option value="2750x1536">2750x1536(16:9)</option>
                <option value="1536x2750">1536x2750(9:16)</option>
                <option value="3000x3000">3000x3000(1:1)</option>
                <option value="3840x2160">3840x2160 (4K)</option>
                <option value="2160x3840">2160x3840 (4K)</option>
                <option value="7680x4320">7680x4320 (8K)</option>
                <option value="4320x7680">4320x7680 (8K)</option>
                <option value="custom">직접 입력 (Custom)</option>
              </select>
              <div id="popupCustomRatioContainer" style="display: none; align-items: center; gap: 4px; background:#111827; padding: 0 6px; border: 1px solid #4b5563; border-radius: 4px; height: 24px; box-sizing: border-box;">
                <input type="number" id="popupCustomWidthInput" min="100" max="10000" step="1" value="1920" style="width: 45px; height: 18px; padding: 0 2px; border: none; background: transparent; color: white; font-size: 11px; text-align: center; outline: none;">
                <span style="color: #94a3b8; font-size: 11px;">x</span>
                <input type="number" id="popupCustomHeightInput" min="100" max="10000" step="1" value="1080" style="width: 45px; height: 18px; padding: 0 2px; border: none; background: transparent; color: white; font-size: 11px; text-align: center; outline: none;">
                <button id="popupApplyCustomRatioBtn" style="height: 18px; padding: 0 6px; background: #8b5cf6; color: white; border: none; border-radius: 3px; font-size: 10px; font-weight: bold; cursor: pointer;">적용</button>
              </div>
            </div>
            <!-- Right: Tab Buttons -->
            <div style="display:flex; gap:6px;">
              <button class="draw-bottom-tab active" data-target="bottomTabStats">📊 작업 정보</button>
              <button class="draw-bottom-tab" data-target="bottomTabGuide">💡 사용법</button>
            </div>
          </div>
          <div class="draw-bottom-tab-content">
            <div id="bottomTabStats" class="draw-bottom-pane active">
              <div class="stats-panel">
                <div class="stat-card">
                  <span class="stat-label">캔버스 해상도</span>
                  <span id="statCanvasRes" class="stat-val">-</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">활성 파티클 종류</span>
                  <span id="statActiveParticle" class="stat-val">-</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">특수 마우스 효과</span>
                  <span id="statMouseEffect" class="stat-val">-</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">오디오 상태</span>
                  <span id="statAudioStatus" class="stat-val">-</span>
                </div>
              </div>
            </div>
            <div id="bottomTabGuide" class="draw-bottom-pane">
              <div class="guide-grid">
                <div class="guide-item">
                  <span class="guide-key">연속 녹화</span>
                  <span class="guide-desc">녹화 버튼을 누른 시점부터 멈출 때까지 드로잉과 효과를 실시간 녹화합니다.</span>
                </div>
                <div class="guide-item">
                  <span class="guide-key">단속 녹화</span>
                  <span class="guide-desc">마우스를 누르고 그리는 순간만 녹화가 진행됩니다.</span>
                </div>
                <div class="guide-item">
                  <span class="guide-key">지우개 궤적</span>
                  <span class="guide-desc">활성화하면 지우개로 지우는 행위까지 모션 클립에 고스란히 담깁니다.</span>
                </div>
                <div class="guide-item">
                  <span class="guide-key">도장 찍기</span>
                  <span class="guide-desc">스탬프를 찍거나 로컬 이미지 파일을 불러와 스탬프로 찍어낼 수 있습니다.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="draw-tools-panel"
        style="width:240px;overflow-y:hidden;background:#f8fafc;display:flex;flex-direction:column;gap:6px;">
        <div class="tool-box"
          style="margin-bottom:2px;display:flex;justify-content:space-between;align-items:center;padding:8px;">
          <label style="margin:0;">현재 브러시 상태</label>
          <span id="brushIndicator"
            style="display:inline-block;border-radius:50%;background:#ef4444;width:15px;height:15px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></span>
        </div>
        <div class="tool-box" style="padding:8px;margin-bottom:2px;">
          <div class="flex-row-center" style="justify-content:space-between;margin-bottom:6px;">
            <label style="margin:0;">펜 선택</label>
          </div>
          <div class="pen-types" style="grid-template-columns:1fr 1fr;margin-bottom:8px;">
            <button data-type="pencil">✏️ 연필</button>
            <button data-type="fountain">🖋️ 만년필</button>
            <button data-type="brush">🖌️ 붓</button>
            <button data-type="colorpencil">🖍️ 색연필</button>
            <button data-type="charcoal">⬛ 목탄</button>
            <button data-type="eraser" style="color:#ef4444;">🧽 지우개</button>
          </div>
          <label style="margin-bottom:4px;">특수 마우스 퍼포먼스</label>
          <!-- hidden select kept for JS compatibility -->
          <select id="mouseEffectSelect" style="display:none;">
            <option value="sparkle">✨ 반짝이</option>
            <option value="bubble">🫧 비눗방울</option>
            <option value="spray">💨 스프레이</option>
            <option value="hearts">💖 하트</option>
            <option value="fireworks">🎆 폭죽</option>
            <option value="neon">💡 네온</option>
            <option value="rainbow">🌈 무지개</option>
            <option value="ribbon">🎀 리본</option>
            <option value="squares">🔲 네모</option>
            <option value="snow">❄ 눈보라</option>
            <option value="matrix">💻 매트릭스</option>
            <option value="stars">⭐ 별</option>
            <option value="lightning">⚡ 번개</option>
            <option value="pixel">🎨 픽셀</option>
            <option value="smoke">🌫️ 연기</option>
            <option value="confetti">🎉 축포</option>
            <option value="dna">🧬 DNA</option>
            <option value="comet">☄️ 혜성</option>
            <option value="flowers">🌸 꽃가루</option>
            <option value="music">🎵 음표</option>
            <option value="none">❌ 없음</option>
          </select>
          <div id="mouseEffectGrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:3px;">
            <button class="eff-btn" data-eff="sparkle" title="반짝이"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">✨</button>
            <button class="eff-btn" data-eff="bubble" title="비눗방울"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🫧</button>
            <button class="eff-btn" data-eff="spray" title="스프레이"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">💨</button>
            <button class="eff-btn" data-eff="hearts" title="하트"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">💖</button>
            <button class="eff-btn" data-eff="fireworks" title="폭죽"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🎆</button>
            <button class="eff-btn" data-eff="neon" title="네온"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">💡</button>
            <button class="eff-btn" data-eff="rainbow" title="무지개"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🌈</button>
            <button class="eff-btn" data-eff="ribbon" title="리본"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🎀</button>
            <button class="eff-btn" data-eff="squares" title="네모"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🔲</button>
            <button class="eff-btn" data-eff="snow" title="눈보라"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">❄</button>
            <button class="eff-btn" data-eff="matrix" title="매트릭스"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">💻</button>
            <button class="eff-btn" data-eff="stars" title="별"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">⭐</button>
            <button class="eff-btn" data-eff="lightning" title="번개"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">⚡</button>
            <button class="eff-btn" data-eff="pixel" title="픽셀"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🎨</button>
            <button class="eff-btn" data-eff="smoke" title="연기"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🌫️</button>
            <button class="eff-btn" data-eff="confetti" title="축포"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🎉</button>
            <button class="eff-btn" data-eff="dna" title="DNA"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🧬</button>
            <button class="eff-btn" data-eff="comet" title="혜성"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">☄️</button>
            <button class="eff-btn" data-eff="flowers" title="꽃가루"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🌸</button>
            <button class="eff-btn" data-eff="music" title="음표"
              style="font-size:16px;padding:4px 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;cursor:pointer;line-height:1;">🎵</button>
          </div>
          <div id="effSelectedLabel" style="font-size:10px;color:#64748b;margin-top:3px;text-align:center;">선택 없음 (클릭하면
            선택, 다시 클릭하면 해제)</div>
        </div>
        <div class="tool-box" style="padding:0;border:none;background:transparent;margin-bottom:2px;">
          <label style="padding-left:4px;margin-bottom:2px;">색상 확장표</label>
          <canvas id="colorPickerCanvas" width="200" height="200"
            style="width:100%;height:200px;cursor:crosshair;border-radius:6px;border:1px solid #cbd5e1;display:block;box-shadow:inset 0 2px 4px rgba(0,0,0,0.1);"></canvas>
        </div>
        <div class="tool-box" style="padding:0;border:none;background:transparent;margin-bottom:2px;">
          <label style="padding-left:4px;margin-bottom:2px;">투명도</label>
          <div
            style="border-radius:6px;border:1px solid #cbd5e1;height:35px;position:relative;overflow:hidden;background:#fff;">
            <canvas id="opacityPickerCanvas" width="200" height="35"
              style="width:100%;height:100%;cursor:crosshair;display:block;position:relative;z-index:2;"></canvas>
          </div>
        </div>
        <div class="tool-box" style="padding:0;border:none;background:transparent;margin-bottom:2px;">
          <label style="padding-left:4px;margin-bottom:2px;">굵기 / 크기</label>
          <canvas id="widthPickerCanvas" width="200" height="35"
            style="width:100%;height:35px;cursor:crosshair;border-radius:6px;border:1px solid #cbd5e1;background:white;display:block;"></canvas>
        </div>
        <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:flex-end;gap:6px;">
            <button id="turnOffEffectsBtn"
              style="background:#64748b;color:white;padding:8px 12px;border-radius:6px;border:none;font-weight:bold;cursor:pointer;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.2);flex:1;">❌
              효과끄기</button>
            <button id="popupClearBtn"
              style="background:#f59e0b;color:white;padding:8px 12px;border-radius:6px;border:none;font-weight:bold;cursor:pointer;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.2);flex:1;">🗑️
              비우기</button>
          </div>
          <button id="popupUndoBtn"
            style="background:#64748b;color:white;padding:12px;border-radius:6px;border:none;font-weight:bold;cursor:pointer;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">↶
            한 획 되돌리기</button>
          <button id="popupCancelBtn"
            style="background:#cbd5e1;color:#1e293b;padding:12px;border-radius:6px;border:none;font-weight:bold;cursor:pointer;font-size:14px;">창
            닫기</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 해상도 권장 안내 모달 -->
  <div id="resolutionWarningModal" class="modal-overlay" style="display:none; align-items:center; justify-content:center; background:rgba(15,23,42,0.65); backdrop-filter:blur(8px); z-index:100000;">
    <div class="modal-content" style="background:white; padding:28px; border-radius:16px; width:380px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); text-align:center; border:1px solid rgba(255,255,255,0.1);">
      <div class="modal-title" style="font-size:16px; font-weight:800; color:#f59e0b; margin-bottom:14px; border-bottom:2px solid #fef3c7; padding-bottom:8px; display:flex; align-items:center; justify-content:center; gap:6px;">
        ⚠️ 해상도 권장 안내
      </div>
      <p style="font-size:12.5px; color:#475569; line-height:1.6; margin:0 0 20px 0; text-align:left; font-family:sans-serif;">
        본 프로그램은 <strong>1920x1080 (FHD)</strong> 이상의 해상도에서 최적의 상태로 구동됩니다.<br><br>
        현재 감지된 해상도(<span id="warnResText" style="font-weight:bold; color:#1e293b;">-</span>)는 FHD 권장 기준보다 작아, 작업 화면 일부가 좁아 보이거나 가려질 수 있습니다.
      </p>
      <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:24px; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
        <input type="checkbox" id="hideResWarnCheck" style="width:16px; height:16px; cursor:pointer; accent-color:#2563eb; margin:0;">
        <label for="hideResWarnCheck" style="font-size:11.5px; font-weight:800; color:#475569; cursor:pointer; user-select:none;">다시 보지 않기</label>
      </div>
      <button id="closeResWarnBtn" style="width:100%; padding:11px; background:#2563eb; color:white; border:none; border-radius:8px; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 6px rgba(37,99,235,0.2);">
        확인 후 계속 진행
      </button>
    </div>
  </div>

  <!-- 최저 해상도 위반 차단/종료 모달 -->
  <div id="resolutionLimitModal" class="modal-overlay" style="display:none; align-items:center; justify-content:center; background:rgba(15,23,42,0.85); backdrop-filter:blur(10px); z-index:100001;">
    <div class="modal-content" style="background:white; padding:32px 28px; border-radius:16px; width:380px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.6); text-align:center; border:1px solid rgba(239,68,68,0.1);">
      <div class="modal-title" style="font-size:16px; font-weight:800; color:#ef4444; margin-bottom:16px; border-bottom:2px solid #fee2e2; padding-bottom:8px; display:flex; align-items:center; justify-content:center; gap:6px;">
        🚨 작업 진행 불가 (해상도 초과)
      </div>
      <p style="font-size:12.5px; color:#475569; line-height:1.6; margin:0 0 24px 0; text-align:left; font-family:sans-serif;">
        현재 감지된 해상도(<span id="limitResText" style="font-weight:bold; color:#ef4444;">-</span>)는 프로그램의 <strong>최저 지원 해상도(1280x720)</strong> 미만입니다.<br><br>
        더 이상 안전한 편집을 진행할 수 없으므로 확인을 클릭하면 프로그램을 종료합니다.
      </p>
      <button id="exitAppBtn" style="width:100%; padding:12px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 6px rgba(239,68,68,0.2);">
        확인 및 프로그램 종료
      </button>
    </div>
  <script>
    // Fade out and remove the loading overlay when all resources are loaded
    window.addEventListener('load', function() {
      const overlay = document.getElementById('editorLoadingOverlay');
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        setTimeout(function() {
          overlay.remove();
        }, 300);
      }
    });
  </script>
</body>

</html>
