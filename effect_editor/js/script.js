// 1. 캔버스 초기화 및 해상도 설정
const canvas = new fabric.Canvas('main-canvas', { backgroundColor: null, preserveObjectStacking: true });
fabric.filterBackend = new fabric.Canvas2dFilterBackend();
const wrapper = document.getElementById('canvas-wrapper');
const resolutionSelect = document.getElementById('resolution');

function updateCanvasSize() {
    const [w, h] = resolutionSelect.value.split('x').map(Number);
    canvas.setWidth(w);
    canvas.setHeight(h);
    
    // 화면 크기에 맞게 캔버스 시각적 배율 조정 (실제 해상도는 유지)
    const scale = Math.min((wrapper.clientWidth - 40) / w, (wrapper.clientHeight - 40) / h);
    canvas.setZoom(scale);
    canvas.setWidth(w * scale);
    canvas.setHeight(h * scale);
}
window.addEventListener('resize', updateCanvasSize);
resolutionSelect.addEventListener('change', updateCanvasSize);
updateCanvasSize(); // 초기 실행

// GSAP 확장 플러그인 등록
gsap.registerPlugin(MotionPathPlugin);
// 선 긋기 브러시 세팅
canvas.freeDrawingBrush.color = '#ffeb3b'; // 노란색 선
canvas.freeDrawingBrush.width = 4;

// [수정] 마우스로 선 긋기 버튼 이벤트 (확실한 초기화 보장)
document.getElementById('draw-mode-btn').addEventListener('click', function() {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    
    if (canvas.isDrawingMode) {
        // 그리기 모드 켜짐
        this.style.background = "#d32f2f";
        this.innerText = "✏️ 선 긋기 종료";
    } else {
        // 그리기 모드 꺼짐
        this.style.background = "#9c27b0";
        this.innerText = "✏️ 마우스로 선 긋기";
        
        // [해결 1] 그리기 종료 시 마우스에 잡혀있는 모든 선택값을 강제 초기화
        canvas.discardActiveObject(); 
        canvas.defaultCursor = 'default'; 
        canvas.requestRenderAll();
    }
});

// [추가] 캔버스에 새로운 선(Path)이 그려질 때마다 자동으로 감지하는 이벤트
canvas.on('path:created', function(e) {
    const newPath = e.path;
    
    // [해결 2] 방금 그려진 선을 캔버스 레이어의 맨 밑바닥으로 즉시 추락시킴
    canvas.sendToBack(newPath);
    
    // 선을 긋자마자 선택 박스가 잡혀 실수로 건드리는 것을 방지
    canvas.discardActiveObject();
    canvas.requestRenderAll();
});

// [수정] 가이드선 숨기기 기능 복구
let isPathVisible = true;
document.getElementById('toggle-path-btn').addEventListener('click', function() {
    isPathVisible = !isPathVisible;
    canvas.getObjects().forEach(o => {
        if (o.type === 'path') o.set('visible', isPathVisible);
    });
    canvas.renderAll();
    
    this.innerText = isPathVisible ? "👁️ 가이드선 숨기기" : "👁️ 가이드선 보이기";
    this.style.background = isPathVisible ? "#009688" : "#757575";
});

// 2. 객체 불러오기 (이미지/텍스트) 및 삭제 + 초기 상태 저장 시스템
function saveBaseState(obj) {
    if (!obj) return;
    // GSAP 애니메이션이 진행 중이지 않을 때만 사용자가 지정한 진짜 상태를 기억합니다.
    if (!gsap.isTweening(obj)) {
        obj.baseState = {
            left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY, angle: obj.angle, opacity: obj.opacity
        };
    }
}
// 캔버스에 객체가 추가되거나 마우스로 크기/위치를 조작할 때마다 상태 저장
canvas.on('object:added', (e) => saveBaseState(e.target));
canvas.on('object:modified', (e) => saveBaseState(e.target));

// [수정] 객체 불러오기 (중심축을 정중앙으로 설정)
document.getElementById('img-loader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            const loadOption = document.getElementById('img-load-option').value;
            const logicalW = canvas.width / canvas.getZoom();
            const logicalH = canvas.height / canvas.getZoom();

            // 사용자가 선택한 옵션에 따라 크기 조절
            if (loadOption === 'shrink') {
                img.scaleToWidth(300);
            } else if (loadOption === 'fit') {
                // 가로/세로 중 긴 쪽을 캔버스 화면에 꽉 차게(90% 크기) 맞춤
                const scaleX = logicalW / img.width;
                const scaleY = logicalH / img.height;
                const scale = Math.min(scaleX, scaleY) * 0.9; 
                img.scale(scale);
            } else if (loadOption === 'original') {
                // 원본 크기 100% 유지
                img.scale(1);
            }

            img.set({ 
                originX: 'center', originY: 'center', 
                left: logicalW / 2, 
                top: logicalH / 2 
            });
            canvas.add(img);
            canvas.setActiveObject(img);
        });
    };
    reader.readAsDataURL(file);
});

document.getElementById('add-text-btn').addEventListener('click', () => {
    const text = document.getElementById('text-input').value || "새 텍스트";
    const textObj = new fabric.IText(text, { 
        originX: 'center', originY: 'center', // [핵심] 텍스트 중심축도 중앙으로
        left: canvas.width / 2, top: canvas.height / 2, 
        fontFamily: 'Arial', fontSize: 50, fill: '#000000', fontWeight: 'bold' 
    });
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
});

document.getElementById('delete-btn').addEventListener('click', () => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach(obj => canvas.remove(obj));
    }
});

// [기존 기능 수정] 수동 초기화 버튼 동작
// [수정] 수동 초기화 버튼 동작 (숨은 애니메이션까지 강제 종료)
document.getElementById('reset-obj-btn').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (obj) {
        gsap.killTweensOf(obj); // 객체에 걸린 기본 애니메이션 정지
        
        if (obj.activeTween) obj.activeTween.kill(); // [핵심] 선 따라가기 등 프록시 애니메이션 강제 정지
        if (obj.waterTween) obj.waterTween.kill();   // 물결 애니메이션 정지
        
        if (obj.originalElement) {
            obj.setElement(obj.originalElement);
            obj.dirty = true;
        }

        if (obj.baseState) {
            obj.set(obj.baseState); // 기억해둔 원래 상태로 덮어쓰기
        }
        
        // [정적 필터 초기화 추가]
        if (obj.filters) {
            obj.filters = [];
            obj.applyFilters();
        }

        obj.setCoords();        
        canvas.renderAll();
        hideFilterControls();
    }
});
// [새 기능] 레이어(순서) 관리 및 배경색 변경
document.getElementById('bring-front-btn').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (obj) {
        if (typeof window.moveRetroPuzzleBlock === 'function' && window.moveRetroPuzzleBlock(obj, 'forward')) {
            // handled
        } else {
            canvas.bringForward(obj); // 한 단계 앞으로
        }
    }
});

document.getElementById('send-back-btn').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (obj) {
        if (typeof window.moveRetroPuzzleBlock === 'function' && window.moveRetroPuzzleBlock(obj, 'backward')) {
            // handled
        } else {
            canvas.sendBackwards(obj); // 한 단계 뒤로
        }
    }
});

document.getElementById('bg-color-picker').addEventListener('input', (e) => {
    canvas.backgroundColor = e.target.value;
    canvas.renderAll();
});
document.getElementById('bg-white-btn').addEventListener('click', () => {
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    const picker = document.getElementById('bg-color-picker');
    if (picker) picker.value = '#ffffff';
});
// [새 기능] 배경을 투명하게 만드는 로직 (아래 4줄을 복사해서 추가해 주세요)
document.getElementById('bg-transparent-btn').addEventListener('click', () => {
    canvas.backgroundColor = null; // 캔버스의 배경색 데이터를 완전히 삭제 (투명화)
    canvas.renderAll();
});

// [업그레이드 완결판] 정적 이미지 - 호수 물결(Lake Ripple) + 경계선 블렌딩 + 옵션 기억
document.getElementById('water-filter-btn').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'image') {
        alert("물결 효과를 적용할 '이미지'를 먼저 선택해주세요.");
        return;
    }

    if (!obj.originalElement) obj.originalElement = obj.getElement();

    const img = obj.originalElement;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const rippleCanvas = document.createElement('canvas');
    rippleCanvas.width = w;
    rippleCanvas.height = h;
    const ctx = rippleCanvas.getContext('2d', { willReadFrequently: true });
    obj.setElement(rippleCanvas);

    // 1. 객체에 저장된 이전 설정값이 있으면 불러오고, 없으면 기본값 세팅
    if (!obj.waterSettings) {
        obj.waterSettings = {
            waterLevel: 0.6,        
            amplitude: 15,          
            frequency: 0.05,        
            horizontalSpread: 0.03, 
            speed: 15,              
            tintOpacity: 0.15,
            boundaryBlend: 40       // [신규] 경계선을 부드럽게 풀어줄 픽셀 범위
        };
    }
    const settings = obj.waterSettings;

    // 2. 만능 패널에 슬라이더 그리기 (기억된 설정값으로 렌더링)
    showFilterControls("호수 물결 효과", [
        { id: 'waterLevel', label: '수면 높이', min: 0.1, max: 0.9, step: 0.05, value: settings.waterLevel },
        { id: 'boundaryBlend', label: '경계선 부드러움 (블렌딩)', min: 0, max: 150, step: 5, value: settings.boundaryBlend },
        { id: 'amplitude', label: '물결 진폭 (흔들림 크기)', min: 0, max: 50, step: 1, value: settings.amplitude },
        { id: 'frequency', label: '물결 파장 (촘촘함)', min: 0.01, max: 0.15, step: 0.01, value: settings.frequency },
        { id: 'horizontalSpread', label: '가로 퍼짐 정도', min: 0, max: 0.1, step: 0.01, value: settings.horizontalSpread },
        { id: 'speed', label: '애니메이션 속도', min: 1, max: 40, step: 1, value: settings.speed },
        { id: 'tintOpacity', label: '푸른빛 농도', min: 0, max: 0.8, step: 0.05, value: settings.tintOpacity }
    ], (id, val) => {
        settings[id] = val; // 실시간 갱신 및 객체에 기억
        if (id === 'speed' && obj.waterTween) obj.waterTween.duration(500 / val);
    });

    const gapFix = 100;
    const durationInput = parseFloat(document.getElementById('effect-duration').value);
    let repeatCount = parseInt(document.getElementById('effect-repeat').value) - 1;
    if (document.getElementById('repeat-infinite').checked) repeatCount = -1;

    obj.waterTime = 0;
    gsap.killTweensOf(obj);
    obj.waterTween = gsap.to(obj, {
        waterTime: Math.PI * 100,
        duration: durationInput,
        repeat: repeatCount,
        ease: "none",
        onUpdate: () => {
            ctx.clearRect(0, 0, w, h);
            const waterY = h * settings.waterLevel;

            // 상단 렌더링 (물 밖)
            ctx.drawImage(img, 0, 0, w, waterY, 0, 0, w, waterY);

            // 하단 렌더링 (물 속)
            for (let y = waterY; y < h; y += 2) {
                let distanceFromSurface = y - waterY;
                let currentAmp = settings.amplitude;
                let currentSpread = settings.horizontalSpread;
                
                // [경계선 부드러움 로직] 수면 근처에서는 흔들림이 0부터 서서히 커지도록 계산
                if (settings.boundaryBlend > 0 && distanceFromSurface < settings.boundaryBlend) {
                    const blendRatio = distanceFromSurface / settings.boundaryBlend;
                    currentAmp = settings.amplitude * blendRatio;
                    currentSpread = settings.horizontalSpread * blendRatio;
                }

                let xOffset = Math.sin(obj.waterTime + (y * settings.frequency)) * currentAmp;
                let spreadScale = 1 + Math.cos(obj.waterTime + (y * settings.frequency * 0.5)) * currentSpread;
                let newWidth = w * spreadScale;

                ctx.drawImage(img, 0, y, w, 2, (w - newWidth)/2 + xOffset - gapFix, y, newWidth + gapFix*2, 2);
            }

            // [푸른빛 그라데이션 오버레이] 물 색상도 수면 경계에서 투명하게 서서히 나타남
            if (settings.boundaryBlend > 0 && settings.tintOpacity > 0) {
                const tintGradient = ctx.createLinearGradient(0, waterY, 0, waterY + settings.boundaryBlend);
                tintGradient.addColorStop(0, `rgba(0, 100, 255, 0)`);
                tintGradient.addColorStop(1, `rgba(0, 100, 255, ${settings.tintOpacity})`);
                ctx.fillStyle = tintGradient;
                ctx.fillRect(0, waterY, w, settings.boundaryBlend);
                
                ctx.fillStyle = `rgba(0, 100, 255, ${settings.tintOpacity})`;
                ctx.fillRect(0, waterY + settings.boundaryBlend, w, h - (waterY + settings.boundaryBlend));
            } else if (settings.tintOpacity > 0) {
                ctx.fillStyle = `rgba(0, 100, 255, ${settings.tintOpacity})`;
                ctx.fillRect(0, waterY, w, h - waterY);
            }

            obj.dirty = true;
            canvas.renderAll();
        }
    });
});

// 3. GSAP 동적 효과 라이브러리 및 자동 복구 시스템 구축
const container = document.getElementById('buttons-container');
const durationInput = document.getElementById('effect-duration');

// 카테고리별 효과 이름 정의 (1~100)
const effectNames = {	
    1: "360도 스핀", 2: "심장 박동(스케일)", 3: "페이드 아웃 & 인", 4: "좌우 흔들기(도리도리)", 5: "블랙홀(축소 회전)",
    6: "위에서 쿵 떨어지기", 7: "탄성 확대(젤리)", 8: "좌우 끄덕임(진자)", 9: "플래시(깜빡임)", 10: "흐려지기(블러 효과)",
    11: "상하 둥둥 떠다니기", 12: "지진(격렬한 흔들림)", 13: "투명도 펄스", 14: "고무줄 늘어나기", 15: "시계추 회전",
    16: "X축 3D 회전(플립)", 17: "Y축 3D 회전(플립)", 18: "랜덤 순간이동", 19: "점진적 페이드인", 20: "스포트라이트",
    21: "통통 튀며 이동", 22: "회오리 등장", 23: "좌측에서 슬라이드 인", 24: "우측으로 슬라이드 아웃", 25: "긍정 끄덕임(Yes)",
    26: "부정 도리도리(No)", 27: "심호흡(천천히 확대/축소)", 28: "엔진 덜컹거림", 29: "글리치(에러)", 30: "빠른 줌인",
    31: "빠른 줌아웃", 32: "무중력 유영", 33: "회전하며 페이드인", 34: "낙엽처럼 떨어지기", 35: "팽이 회전",
    36: "스프링 점프", 37: "핸드폰 진동", 38: "유령(투명도 덜덜)", 39: "로봇 움직임", 40: "심장 연속 박동",    
    // 41~100 신규 효과
    41: "로켓 발사(위로 슈웅)", 42: "바람 빠진 풍선", 43: "심해 잠수(가라앉기)", 44: "수면 위 부상", 45: "갸우뚱(좌우 틸트)",
    46: "전구 켜지기(번뜩)", 47: "그림자 숨기", 48: "깜짝 놀라기(점프스케어)", 49: "우주 미아(천천히 표류)", 50: "지그재그 이동",
    51: "태엽 인형 걷기", 52: "물수제비 통통통", 53: "블랙아웃(정전)", 54: "타자기 타닥타닥", 55: "텔레포트 등장",
    56: "텔레포트 퇴장", 57: "토네이도 휩쓸림", 58: "종이 비행기 활공", 59: "자석에 끌려가기", 60: "벽 맞고 튕기기(리바운드)",
    61: "과호흡(빠른 수축팽창)", 62: "느린 끄덕임(이해함)", 63: "바나나 밟고 미끄러짐", 64: "엘리베이터 상승", 65: "엘리베이터 하강",
    66: "초고속 스핀", 67: "슬로우 모션 스핀", 68: "좌우 고속 진동", 69: "상하 고속 진동", 70: "멀미(어질어질)",
    71: "절반으로 수축", 72: "두배로 팽창", 73: "수축 후 폭발적 팽창", 74: "바람에 날려가기", 75: "무거운 짐(짓눌림)",
    76: "풍선껌 터지기", 77: "도약 준비(웅크리기)", 78: "벽돌처럼 추락", 79: "깃털처럼 하강", 80: "레이더망 스캔",
    81: "카메라 셔터(찰칵)", 82: "고장난 네온사인", 83: "숨바꼭질(빼꼼)", 84: "위성 궤도 돌기", 85: "경고등 깜빡임",
    86: "기지개 쭈욱 켜기", 87: "움찔하기(회피)", 88: "수영하기(헤엄)", 89: "얼음 땡(가다 서다)", 90: "후진 기어",
    91: "드릴 회전 돌파", 92: "부메랑 투척", 93: "위풍당당 걷기", 94: "거인의 발걸음(쿵쿵)", 95: "닌자 대시(순간이동)",
    96: "마술사 짠! 등장", 97: "마술사 펑! 퇴장", 98: "최면술 빙글빙글", 99: "불꽃놀이 팡!", 100: "대피날레(스포트라이트)",
};

// [수정됨] 1~100번 기본 효과 버튼만 생성 (101~104번은 아래에서 따로 생성함)
for (let i = 1; i <= 100; i++) {
    const btn = document.createElement('button');   
    btn.innerText = effectNames[i] ? `${i}. ${effectNames[i]}` : `${i}. 기본 모션 ${i}`;     
    btn.onclick = () => applyEffect(i);
    container.appendChild(btn);	
}

// 101 ~ 104번 고급 특수 효과 버튼 수동 추가
const advancedNames = {
    101: "제자리 돌기 (옵션 패널)",
    102: "돌기 + 심장박동 (옵션 패널)",
    103: "출렁이며 날기 (옵션 패널)",
    104: "선 따라 움직이기 (경로 애니)"
};

for (let i = 101; i <= 104; i++) {
    const btn = document.createElement('button');
    btn.innerText = `${i}. ${advancedNames[i]}`;
    btn.style.background = "#e91e63"; // 눈에 띄게 핑크색으로 지정
    btn.onclick = () => applyEffect(i);
    container.appendChild(btn);
}

// 개별 효과 애니메이션 정의 통합본 (1~100)
const effectLibrary = {
    // 1~40 (기존)
    1: (obj, dur, render) => gsap.to(obj, { angle: obj.angle + 360, duration: dur, ease: "power1.inOut", onUpdate: render }),
    2: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.3, scaleY: obj.scaleY * 1.3, duration: dur/2, yoyo: true, repeat: 1, ease: "bounce.out", onUpdate: render }),
    3: (obj, dur, render) => gsap.to(obj, { opacity: 0, duration: dur/2, yoyo: true, repeat: 1, onUpdate: render }),
    4: (obj, dur, render) => gsap.to(obj, { left: obj.left + 50, duration: dur/6, yoyo: true, repeat: 5, ease: "sine.inOut", onUpdate: render }),
    5: (obj, dur, render) => gsap.to(obj, { angle: obj.angle - 720, scaleX: 0, scaleY: 0, opacity: 0, duration: dur, ease: "power2.in", onUpdate: render }),
    6: (obj, dur, render) => { const startY = obj.top; obj.set('top', -200); return gsap.to(obj, { top: startY, duration: dur, ease: "bounce.out", onUpdate: render }); },
    7: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.5, scaleY: obj.scaleY * 0.5, duration: dur/4, yoyo: true, repeat: 3, ease: "elastic.out(1, 0.3)", onUpdate: render }),
    8: (obj, dur, render) => gsap.to(obj, { angle: obj.angle + 30, duration: dur/4, yoyo: true, repeat: 3, ease: "power1.inOut", onUpdate: render }),
    9: (obj, dur, render) => { let repeats = Math.floor(dur / 0.1); if (repeats % 2 !== 0) repeats += 1; return gsap.to(obj, { opacity: 0, duration: 0.1, yoyo: true, repeat: repeats, onUpdate: render }); },
    10: (obj, dur, render) => gsap.to(obj, { opacity: 0.5, scaleX: 1.1, scaleY: 1.1, duration: dur, ease: "power2.out", onUpdate: render }),
    11: (obj, dur, render) => gsap.to(obj, { top: obj.top - 30, duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    12: (obj, dur, render) => gsap.to(obj, { left: "+=15", top: "+=15", duration: 0.05, yoyo: true, repeat: Math.floor(dur / 0.05), ease: "rough", onUpdate: render }),
    13: (obj, dur, render) => gsap.to(obj, { opacity: 0.2, duration: dur/3, yoyo: true, repeat: 2, ease: "sine.inOut", onUpdate: render }),
    14: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 2, duration: dur/2, yoyo: true, repeat: 1, ease: "power2.inOut", onUpdate: render }),
    15: (obj, dur, render) => gsap.to(obj, { angle: obj.angle + 45, duration: dur/4, yoyo: true, repeat: 3, transformOrigin: "top center", ease: "sine.inOut", onUpdate: render }),
    16: (obj, dur, render) => gsap.to(obj, { scaleX: -obj.scaleX, duration: dur, ease: "power1.inOut", onUpdate: render }), 
    17: (obj, dur, render) => gsap.to(obj, { scaleY: -obj.scaleY, duration: dur, ease: "power1.inOut", onUpdate: render }), 
    18: (obj, dur, render) => gsap.to(obj, { left: () => Math.random() * canvas.width, top: () => Math.random() * canvas.height, duration: dur, ease: "steps(5)", onUpdate: render }),
    19: (obj, dur, render) => { obj.set('opacity', 0); return gsap.to(obj, { opacity: 1, duration: dur, ease: "power1.in", onUpdate: render }); },
    20: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.2, scaleY: obj.scaleY * 1.2, duration: dur * 0.8, ease: "power2.out", onComplete: () => gsap.to(obj, { scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, duration: dur * 0.2, onUpdate: render }), onUpdate: render }),
    21: (obj, dur, render) => gsap.to(obj, { top: obj.top - 50, left: obj.left + 50, duration: dur/4, yoyo: true, repeat: 3, ease: "power1.inOut", onUpdate: render }),
    22: (obj, dur, render) => { obj.set({ scaleX: 0, scaleY: 0, angle: -1080 }); return gsap.to(obj, { scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, angle: obj.baseState.angle, duration: dur, ease: "power2.out", onUpdate: render }); },
    23: (obj, dur, render) => { const endLeft = obj.left; obj.set('left', -200); return gsap.to(obj, { left: endLeft, duration: dur, ease: "back.out(1.5)", onUpdate: render }); },
    24: (obj, dur, render) => gsap.to(obj, { left: canvas.width + 200, duration: dur, ease: "power2.in", onUpdate: render }),
    25: (obj, dur, render) => gsap.to(obj, { top: "+=15", angle: "+=5", duration: 0.15, yoyo: true, repeat: Math.floor(dur/0.15), ease: "sine.inOut", onUpdate: render }),
    26: (obj, dur, render) => gsap.to(obj, { left: "+=15", angle: "-=5", duration: 0.1, yoyo: true, repeat: Math.floor(dur/0.1), ease: "sine.inOut", onUpdate: render }),
    27: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.05, scaleY: obj.scaleY * 1.05, duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    28: (obj, dur, render) => gsap.to(obj, { left: "+=5", top: "+=5", angle: "+=2", duration: 0.05, yoyo: true, repeat: Math.floor(dur/0.05), ease: "rough", onUpdate: render }),
    29: (obj, dur, render) => gsap.to(obj, { left: () => obj.baseState.left + (Math.random()*40-20), top: () => obj.baseState.top + (Math.random()*40-20), opacity: () => Math.random() > 0.5 ? 1 : 0.2, duration: 0.1, repeat: Math.floor(dur/0.1), onUpdate: render }),
    30: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 2.5, scaleY: obj.scaleY * 2.5, opacity: 0, duration: dur, ease: "power2.in", onUpdate: render }),
    31: (obj, dur, render) => { obj.set({ scaleX: 3, scaleY: 3, opacity: 0 }); return gsap.to(obj, { scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, opacity: 1, duration: dur, ease: "power2.out", onUpdate: render }); },
    32: (obj, dur, render) => gsap.to(obj, { top: "-=30", left: "+=20", angle: "+=10", duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    33: (obj, dur, render) => { obj.set({ opacity: 0, angle: obj.angle - 180 }); return gsap.to(obj, { opacity: 1, angle: obj.baseState.angle, duration: dur, ease: "power1.out", onUpdate: render }); },
    34: (obj, dur, render) => gsap.to(obj, { top: "+=150", left: "+=50", angle: "+=45", duration: dur, ease: "power1.in", onUpdate: render }),
    35: (obj, dur, render) => gsap.to(obj, { angle: obj.angle + 1440, scaleX: obj.scaleX * 0.8, duration: dur, ease: "power3.inOut", onUpdate: render }),
    36: (obj, dur, render) => { obj.set({ scaleY: obj.scaleY * 0.5, top: obj.top + 50 }); return gsap.to(obj, { scaleY: obj.baseState.scaleY, top: obj.baseState.top - 100, duration: dur, ease: "elastic.out(1, 0.3)", onUpdate: render }); },
    37: (obj, dur, render) => gsap.to(obj, { left: "+=3", duration: 0.02, yoyo: true, repeat: Math.floor(dur/0.02), onUpdate: render }),
    38: (obj, dur, render) => gsap.to(obj, { opacity: 0.3, left: "+=10", duration: 0.1, yoyo: true, repeat: Math.floor(dur/0.1), ease: "steps(2)", onUpdate: render }),
    39: (obj, dur, render) => gsap.to(obj, { left: "+=100", top: "-=50", duration: dur, ease: "steps(5)", onUpdate: render }),
    40: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.15, scaleY: obj.scaleY * 1.15, duration: 0.2, yoyo: true, repeat: Math.floor(dur/0.2), ease: "power1.out", onUpdate: render }),

    // 41~100 (신규 추가)
    41: (obj, dur, render) => gsap.to(obj, { top: -200, opacity: 0, duration: dur, ease: "power2.in", onUpdate: render }),
    42: (obj, dur, render) => gsap.to(obj, { scaleX: 0.2, scaleY: 0.2, left: "+=150", top: "-=100", angle: "+=360", duration: dur, ease: "rough", onUpdate: render }),
    43: (obj, dur, render) => gsap.to(obj, { top: "+=200", opacity: 0.2, duration: dur, ease: "power1.inOut", onUpdate: render }),
    44: (obj, dur, render) => { obj.set({ top: obj.top + 200, opacity: 0 }); return gsap.to(obj, { top: obj.baseState.top, opacity: 1, duration: dur, ease: "back.out(1)", onUpdate: render }); },
    45: (obj, dur, render) => gsap.to(obj, { angle: "+=20", duration: dur/4, yoyo: true, repeat: 3, ease: "sine.inOut", onUpdate: render }),
    46: (obj, dur, render) => { obj.set({ opacity: 0, scaleX: 0.8, scaleY: 0.8 }); return gsap.to(obj, { opacity: 1, scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, duration: 0.1, onUpdate: render }); },
    47: (obj, dur, render) => gsap.to(obj, { opacity: 0.1, scaleX: 0.9, scaleY: 0.9, duration: dur, ease: "power2.inOut", onUpdate: render }),
    48: (obj, dur, render) => gsap.to(obj, { scaleX: 1.5, scaleY: 1.5, top: "-=50", duration: 0.1, yoyo: true, repeat: 1, onUpdate: render }),
    49: (obj, dur, render) => gsap.to(obj, { left: "+=30", top: "-=20", angle: "+=15", duration: dur, ease: "sine.inOut", onUpdate: render }),
    50: (obj, dur, render) => gsap.to(obj, { left: "+=100", top: "-=50", duration: dur/4, yoyo: true, repeat: 3, ease: "none", onUpdate: render }),
    51: (obj, dur, render) => gsap.to(obj, { angle: "+=45", duration: dur, ease: "steps(4)", onUpdate: render }),
    52: (obj, dur, render) => gsap.to(obj, { left: "+=150", top: "-=30", duration: dur/3, yoyo: true, repeat: 2, ease: "power1.out", onUpdate: render }),
    53: (obj, dur, render) => gsap.to(obj, { opacity: 0, duration: 0.01, onUpdate: render }),
    54: (obj, dur, render) => gsap.to(obj, { left: "+=100", duration: dur, ease: "steps(10)", onUpdate: render }),
    55: (obj, dur, render) => { obj.set({ scaleX: 0, scaleY: 0 }); return gsap.to(obj, { scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, duration: 0.2, ease: "back.out(2)", onUpdate: render }); },
    56: (obj, dur, render) => gsap.to(obj, { scaleX: 0, scaleY: 0, duration: 0.2, ease: "back.in(2)", onUpdate: render }),
    57: (obj, dur, render) => gsap.to(obj, { angle: "+=1080", scaleX: 0.1, scaleY: 0.1, top: "-=150", duration: dur, ease: "power3.in", onUpdate: render }),
    58: (obj, dur, render) => gsap.to(obj, { left: "+=300", top: "-=100", angle: "+=15", duration: dur, ease: "sine.inOut", onUpdate: render }),
    59: (obj, dur, render) => gsap.to(obj, { left: "+=200", duration: dur, ease: "expo.in", onUpdate: render }),
    60: (obj, dur, render) => gsap.to(obj, { left: "+=150", duration: dur/2, yoyo: true, repeat: 1, ease: "bounce.out", onUpdate: render }),
    61: (obj, dur, render) => gsap.to(obj, { scaleX: 1.1, scaleY: 1.1, duration: 0.1, yoyo: true, repeat: Math.floor(dur/0.1), onUpdate: render }),
    62: (obj, dur, render) => gsap.to(obj, { top: "+=20", duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    63: (obj, dur, render) => gsap.to(obj, { left: "+=200", angle: "+=90", duration: dur/2, ease: "power2.out", onUpdate: render }),
    64: (obj, dur, render) => gsap.to(obj, { top: "-=150", duration: dur, ease: "none", onUpdate: render }),
    65: (obj, dur, render) => gsap.to(obj, { top: "+=150", duration: dur, ease: "none", onUpdate: render }),
    66: (obj, dur, render) => gsap.to(obj, { angle: "+=1440", duration: dur, ease: "none", onUpdate: render }),
    67: (obj, dur, render) => gsap.to(obj, { angle: "+=90", duration: dur, ease: "none", onUpdate: render }),
    68: (obj, dur, render) => gsap.to(obj, { left: "+=20", duration: 0.05, yoyo: true, repeat: Math.floor(dur/0.05), ease: "none", onUpdate: render }),
    69: (obj, dur, render) => gsap.to(obj, { top: "+=20", duration: 0.05, yoyo: true, repeat: Math.floor(dur/0.05), ease: "none", onUpdate: render }),
    70: (obj, dur, render) => gsap.to(obj, { scaleX: 1.2, angle: "+=20", left: "+=30", duration: dur/3, yoyo: true, repeat: 2, ease: "sine.inOut", onUpdate: render }),
    71: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 0.5, scaleY: obj.scaleY * 0.5, duration: dur, ease: "power1.inOut", onUpdate: render }),
    72: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 2, scaleY: obj.scaleY * 2, duration: dur, ease: "power1.inOut", onUpdate: render }),
    73: (obj, dur, render) => { const tl = gsap.timeline({onUpdate: render}); tl.to(obj, {scaleX: 0.5, scaleY: 0.5, duration: dur*0.3, ease: "power1.in"}).to(obj, {scaleX: 2.5, scaleY: 2.5, duration: dur*0.7, ease: "elastic.out(1, 0.3)"}); return tl; },
    74: (obj, dur, render) => gsap.to(obj, { left: "+=200", top: "-=50", angle: "+=45", duration: dur, ease: "power2.in", onUpdate: render }),
    75: (obj, dur, render) => gsap.to(obj, { top: "+=50", scaleY: 0.7, scaleX: 1.2, duration: dur, ease: "power1.out", onUpdate: render }),
    76: (obj, dur, render) => gsap.to(obj, { scaleX: 1.5, scaleY: 1.5, duration: dur*0.8, ease: "power1.in", onComplete: () => { obj.set({opacity: 0, scaleX: 2, scaleY: 2}); render(); }, onUpdate: render }),
    77: (obj, dur, render) => gsap.to(obj, { scaleY: 0.6, scaleX: 1.3, top: "+=30", duration: dur, ease: "power2.out", onUpdate: render }),
    78: (obj, dur, render) => gsap.to(obj, { top: "+=200", duration: dur/2, ease: "power3.in", onUpdate: render }),
    79: (obj, dur, render) => gsap.to(obj, { top: "+=150", left: "+=50", angle: "+=20", duration: dur, ease: "sine.inOut", onUpdate: render }),
    80: (obj, dur, render) => gsap.to(obj, { angle: "+=360", opacity: 0.5, duration: dur, ease: "none", onUpdate: render }),
    81: (obj, dur, render) => gsap.to(obj, { opacity: 0, duration: 0.1, yoyo: true, repeat: 1, ease: "none", onUpdate: render }),
    82: (obj, dur, render) => gsap.to(obj, { opacity: 0.3, duration: 0.1, yoyo: true, repeat: Math.floor(dur/0.1), ease: "rough", onUpdate: render }),
    83: (obj, dur, render) => { const startLeft = obj.left; obj.set('left', -100); return gsap.to(obj, { left: startLeft, duration: dur/2, yoyo: true, repeat: 1, ease: "power1.inOut", onUpdate: render }); },
    84: (obj, dur, render) => gsap.to(obj, { left: "+=100", top: "-=50", angle: "+=90", duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    85: (obj, dur, render) => gsap.to(obj, { opacity: 0.2, scaleX: 1.1, scaleY: 1.1, duration: 0.3, yoyo: true, repeat: Math.floor(dur/0.3), ease: "power1.inOut", onUpdate: render }),
    86: (obj, dur, render) => gsap.to(obj, { scaleY: 1.4, top: "-=20", duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    87: (obj, dur, render) => gsap.to(obj, { left: "-=30", angle: "-=10", duration: 0.2, yoyo: true, repeat: 1, ease: "back.out(2)", onUpdate: render }),
    88: (obj, dur, render) => gsap.to(obj, { left: "+=150", angle: "+=10", duration: dur, ease: "sine.inOut", onUpdate: render }),
    89: (obj, dur, render) => gsap.to(obj, { left: "+=100", duration: dur, ease: "steps(3)", onUpdate: render }),
    90: (obj, dur, render) => gsap.to(obj, { left: "-=100", top: "+=50", duration: dur, ease: "power1.inOut", onUpdate: render }),
    91: (obj, dur, render) => gsap.to(obj, { left: "+=150", angle: "+=720", duration: dur, ease: "power2.inOut", onUpdate: render }),
    92: (obj, dur, render) => gsap.to(obj, { left: "+=200", top: "-=100", duration: dur/2, yoyo: true, repeat: 1, ease: "power1.out", onUpdate: render }),
    93: (obj, dur, render) => gsap.to(obj, { top: "-=20", angle: "+=10", duration: dur/4, yoyo: true, repeat: 3, ease: "bounce.out", onUpdate: render }),
    94: (obj, dur, render) => gsap.to(obj, { top: "-=50", scaleX: 1.2, duration: dur/3, yoyo: true, repeat: 2, ease: "power3.in", onUpdate: render }),
    95: (obj, dur, render) => gsap.to(obj, { left: "+=200", opacity: 0.5, duration: 0.2, ease: "power4.in", onUpdate: render }),
    96: (obj, dur, render) => { obj.set({ opacity: 0, scaleX: 0, scaleY: 0 }); return gsap.to(obj, { opacity: 1, scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, angle: "+=360", duration: dur, ease: "back.out(1.5)", onUpdate: render }); },
    97: (obj, dur, render) => gsap.to(obj, { scaleX: 0, scaleY: 0, angle: "-=360", duration: dur, ease: "back.in(1.5)", onUpdate: render }),
    98: (obj, dur, render) => gsap.to(obj, { scaleX: 1.3, scaleY: 1.3, angle: "+=180", duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    99: (obj, dur, render) => { obj.set({ scaleX: 0.1, scaleY: 0.1, top: obj.top + 100 }); return gsap.to(obj, { scaleX: 2.5, scaleY: 2.5, opacity: 0, top: "-=150", duration: dur, ease: "expo.out", onUpdate: render }); },
    100: (obj, dur, render) => gsap.to(obj, { left: canvas.width / 2 / canvas.getZoom() - (obj.width * obj.scaleX)/2, top: canvas.height / 2 / canvas.getZoom() - (obj.height * obj.scaleY)/2, scaleX: 2, scaleY: 2, angle: "+=720", duration: dur, ease: "power2.inOut", onUpdate: render })
};

// [핵심] 통합 이펙트 적용 함수 (숨은 프록시 애니메이션 제어 강화)
function applyEffect(id) {
    const obj = canvas.getActiveObject();
    if (!obj) {
        alert("효과를 적용할 대상을 먼저 선택해주세요.");
        return;
    }
    
    const durationInput = document.getElementById('effect-duration');
    const duration = durationInput ? parseFloat(durationInput.value) : 2;
    
    const repeatInput = document.getElementById('effect-repeat');
    let repeatCount = repeatInput ? parseInt(repeatInput.value) - 1 : 0;
    
    const infInput = document.getElementById('repeat-infinite');
    if (infInput && infInput.checked) repeatCount = -1;
    
    const restoreInput = document.getElementById('auto-restore');
    const isAutoRestore = restoreInput ? restoreInput.checked : false;
    
    const render = () => canvas.renderAll();

    // [버그 수정 1] 일반 애니메이션뿐만 아니라 백그라운드에 숨어있는 가상(Proxy) 애니메이션까지 모조리 사살
    gsap.killTweensOf(obj);
    if (obj.activeTween) obj.activeTween.kill();
    if (obj.waterTween) obj.waterTween.kill();

    if (!obj.baseState) saveBaseState(obj);

    const doAutoRestore = (anim) => {
        if (isAutoRestore && repeatCount !== -1) {
            anim.then(() => gsap.to(obj, { ...obj.baseState, duration: 0.5, ease: "power2.out", onUpdate: render, onComplete: () => obj.setCoords() }));
        }
    };

    // ----------------------------------------------------
    // 101~104번 고급 옵션 패널 효과 분기
    // ----------------------------------------------------
    if (id >= 101 && id <= 104) {
        if (!obj.advSettings) obj.advSettings = {};

        if (id === 101) {
            if(!obj.advSettings[101]) obj.advSettings[101] = { speed: 1 };
            showFilterControls("제자리 돌기 옵션", [
                { id: 'speed', label: '회전 속도 (몇 바퀴 돌지)', min: 0.5, max: 10, step: 0.5, value: obj.advSettings[101].speed }
            ], (pid, val) => { obj.advSettings[101][pid] = val; play101(); });
            
            const play101 = () => {
                gsap.killTweensOf(obj);
                if (obj.activeTween) obj.activeTween.kill();
                obj.set(obj.baseState);
                const anim = gsap.to(obj, { angle: obj.baseState.angle + (360 * obj.advSettings[101].speed), duration: duration, ease: "none", repeat: repeatCount, onUpdate: render });
                obj.activeTween = anim;
                doAutoRestore(anim);
            };
            play101();
        } 
          else if (id === 102) {
            if(!obj.advSettings[102]) obj.advSettings[102] = { speed: 1, pulse: 1.5 };
            showFilterControls("돌면서 심장박동 옵션", [
                { id: 'speed', label: '회전 속도 (몇 바퀴 돌지)', min: 0.5, max: 10, step: 0.5, value: obj.advSettings[102].speed },
                { id: 'pulse', label: '박동 크기 (배수)', min: 1.1, max: 3, step: 0.1, value: obj.advSettings[102].pulse }
            ], (pid, val) => { obj.advSettings[102][pid] = val; play102(); });

            const play102 = () => {
                gsap.killTweensOf(obj);
                if (obj.activeTween) obj.activeTween.kill();
                obj.set(obj.baseState);
                const tl = gsap.timeline({ repeat: repeatCount });
                tl.to(obj, { angle: obj.baseState.angle + (360 * obj.advSettings[102].speed), duration: duration, ease: "none", onUpdate: render }, 0);
                tl.to(obj, { scaleX: obj.baseState.scaleX * obj.advSettings[102].pulse, scaleY: obj.baseState.scaleY * obj.advSettings[102].pulse, duration: duration / 4, yoyo: true, repeat: 3, ease: "power1.inOut", onUpdate: render }, 0);
                obj.activeTween = tl;
                doAutoRestore(tl);
            };
            play102();
        }

        else if (id === 103) {
            const logicalW = canvas.width / canvas.getZoom();
            const logicalH = canvas.height / canvas.getZoom();

            if(!obj.advSettings[103]) obj.advSettings[103] = { dir: 1, startY: Math.round(logicalH / 2), endY: Math.round(logicalH / 2), amp: 80, freq: 3 };
            showFilterControls("출렁이며 날기 옵션", [
                { id: 'dir', label: '방향 (1:우측으로, -1:좌측으로)', min: -1, max: 1, step: 2, value: obj.advSettings[103].dir },
                { id: 'startY', label: '진입 높이 (수치가 클수록 화면 위쪽)', min: 0, max: Math.round(logicalH), step: 10, value: obj.advSettings[103].startY },
                { id: 'endY', label: '퇴장 높이 (수치가 클수록 화면 위쪽)', min: 0, max: Math.round(logicalH), step: 10, value: obj.advSettings[103].endY },
                { id: 'amp', label: '오르내리는 폭 (진폭)', min: 0, max: Math.round(logicalH / 2), step: 10, value: obj.advSettings[103].amp },
                { id: 'freq', label: '출렁임 횟수 (주파수)', min: 1, max: 15, step: 1, value: obj.advSettings[103].freq }
            ], (pid, val) => { obj.advSettings[103][pid] = val; play103(); });

            const play103 = () => {
                gsap.killTweensOf(obj);
                if (obj.activeTween) obj.activeTween.kill();
                
                const set = obj.advSettings[103];
                const startX = set.dir === 1 ? -obj.width : logicalW + obj.width;
                const endX = set.dir === 1 ? logicalW + obj.width : -obj.width;
                const realStartY = logicalH - set.startY;
                const realEndY = logicalH - set.endY;
                
                obj.set({ left: startX, top: realStartY });
                const proxy = { t: 0 };
                const tl = gsap.timeline({ repeat: repeatCount, onUpdate: render });
                
                tl.to(obj, { left: endX, duration: duration, ease: "none" }, 0);
                tl.to(proxy, {
                    t: 1, duration: duration, ease: "none",
                    onUpdate: () => {
                        const linearY = realStartY + (realEndY - realStartY) * proxy.t;
                        const waveY = Math.sin(proxy.t * Math.PI * 2 * set.freq) * set.amp;
                        obj.set('top', linearY - waveY);
                    }
                }, 0);
                obj.activeTween = tl; 
                doAutoRestore(tl);
            };
            play103();
        }

        else if (id === 104) {
            hideFilterControls();
            const paths = canvas.getObjects().filter(o => o.type === 'path');
            if (paths.length === 0) {
                alert("그려진 선이 없습니다. 툴바의 '✏️ 마우스로 선 긋기'를 눌러 먼저 경로를 그려주세요!");
                return;
            }
            const targetPath = paths[paths.length - 1]; 
            const dString = targetPath.path.map(p => p.join(' ')).join(' ');
            
            const firstCmd = targetPath.path[0];
            const rawX = firstCmd[1];
            const rawY = firstCmd[2];
            
            const startPoint = new fabric.Point(rawX - targetPath.pathOffset.x, rawY - targetPath.pathOffset.y);
            const matrix = targetPath.calcTransformMatrix();
            const absoluteStart = fabric.util.transformPoint(startPoint, matrix);
            
            const offsetX = absoluteStart.x - rawX;
            const offsetY = absoluteStart.y - rawY;
            
            const proxy = { x: 0, y: 0 };
            if (obj.activeTween) obj.activeTween.kill();
            
            const anim = gsap.to(proxy, {
                motionPath: { path: dString }, 
                duration: duration,
                repeat: repeatCount,
                ease: "none",
                onUpdate: () => {
                    // [버그 수정 2] 사용자가 '선택 삭제'로 기준선을 지워버렸다면 스스로 애니메이션 정지
                    if (!targetPath.canvas) {
                        anim.kill();
                        return;
                    }
                    
                    obj.set({ left: proxy.x + offsetX, top: proxy.y + offsetY });
                    render();
                }
            });
            obj.activeTween = anim; 
            doAutoRestore(anim);
        }
        return; 
    } 
	// [기존 applyEffect 함수 내부 하단부, 혹은 라이브러리 추가]
// 5번 효과를 effectLibrary에 등록합니다.
effectLibrary[5] = (obj, dur, render) => {
    // 5. 블랙홀(축소 회전) 효과
    const tl = gsap.timeline({ onUpdate: render });
    
    // 회전하면서 중앙으로 빨려 들어가는 애니메이션
    tl.to(obj, { 
        angle: obj.angle + 720, // 2바퀴 회전
        scaleX: 0, 
        scaleY: 0, 
        opacity: 0, 
        duration: dur, 
        ease: "power2.in" // 빨려 들어가는 듯한 가속도
    });
    
    return tl;
};
    // ----------------------------------------------------
    // 1~100번 기본 이펙트 로직
    // ----------------------------------------------------
    hideFilterControls(); 
    // [추가된 안정화 로직] 새 효과를 적용하기 전에, 객체가 찌그러져 있거나 
    // 허공에 있다면 원래 저장해둔 기본 상태(baseState)로 깔끔하게 원상복구합니다.
    if (obj.baseState) {
        obj.set(obj.baseState);
        obj.setCoords();
    }

    let animation;
    if (effectLibrary[id]) {
        animation = effectLibrary[id](obj, duration, render);
    } else {
        animation = gsap.to(obj, { left: "+=50", angle: "+=45", duration: duration, onUpdate: render });
    }

    if (animation) {
        // [치명적 버그 수정] animation.repeat()를 직접 쓰면 효과 내부의 왕복(yoyo)이 다 깨집니다!
        // 타임라인 캡슐로 한 겹 감싸서, 효과의 흐름이 끊기지 않고 통째로 안전하게 반복되도록 수정했습니다.
        const masterTl = gsap.timeline({ repeat: repeatCount });
        masterTl.add(animation);
        
        // 무한반복 연동 및 초기화를 위해 마스터 타임라인을 등록
        obj.activeTween = masterTl;
        doAutoRestore(masterTl);
    }
}

// 4. 동영상 녹화 제어 (가이드선 자동 숨김 기능 포함)
let mediaRecorder;
let recordedChunks = [];

const recordBtn = document.getElementById('record-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');

function forceRender() { canvas.renderAll(); }

// 캔버스 내의 모든 가이드선(Path)의 시각적 표시 여부를 제어하는 헬퍼 함수
function setPathVisibility(visible) {
    canvas.getObjects().forEach(o => {
        if (o.type === 'path') o.set('visible', visible);
    });
    canvas.renderAll();
}

recordBtn.addEventListener('click', () => {
    // [핵심] 녹화가 시작되거나 재개될 때 무조건 가이드선을 숨김
    setPathVisibility(false);
    document.getElementById('toggle-path-btn').innerText = "👁️ 가이드선 보이기";
    document.getElementById('toggle-path-btn').style.background = "#757575";
    isPathVisible = false;

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        const canvasElement = document.getElementById('main-canvas');
        const stream = canvasElement.captureStream(60); 
        
        // Extract audio from playing video safely without modifying audio graph
        if (window.activeVideoElement && !window.activeVideoElement.muted) {
            try {
                const getStream = window.activeVideoElement.captureStream || window.activeVideoElement.mozCaptureStream;
                if (getStream) {
                    const videoStream = getStream.call(window.activeVideoElement);
                    videoStream.getAudioTracks().forEach(track => stream.addTrack(track));
                }
            } catch(e) {
                console.warn("[record] Native audio capture failed:", e);
            }
        }
        
        const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        let selectedMime = 'video/webm';
        for (const type of mimeTypes) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
                selectedMime = type;
                break;
            }
        }
        mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMime, videoBitsPerSecond: 20000000 });
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mv_${window.getFormattedDateString ? window.getFormattedDateString() : new Date().getTime()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            recordedChunks = [];
        };
        
        mediaRecorder.start();
        gsap.ticker.add(forceRender); 

        recordBtn.innerText = "⏺ 녹화 중...";
        recordBtn.style.background = "#d32f2f";
        pauseBtn.style.display = "inline-block";
        stopBtn.style.display = "inline-block";
        pauseBtn.innerText = "⏸ 일시정지";
        pauseBtn.style.background = "#ff9800";

    } else if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        gsap.ticker.add(forceRender);

        recordBtn.innerText = "⏺ 녹화 중...";
        recordBtn.style.background = "#d32f2f";
        pauseBtn.innerText = "⏸ 일시정지";
        pauseBtn.style.background = "#ff9800";
    }
});

pauseBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        gsap.ticker.remove(forceRender); 
        
        // [핵심] 일시정지 중에는 편집을 해야 하므로 다시 선을 보여줌
        setPathVisibility(true);
        document.getElementById('toggle-path-btn').innerText = "👁️ 가이드선 숨기기";
        document.getElementById('toggle-path-btn').style.background = "#009688";
        isPathVisible = true;

        recordBtn.innerText = "▶ 이어서 녹화 (재개)";
        recordBtn.style.background = "#4caf50";
        pauseBtn.innerText = "⏸ 일시정지 됨 (객체 조작 중)";
        pauseBtn.style.background = "#795548";
    }
});

stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        gsap.ticker.remove(forceRender);
        
        // [핵심] 완전 종료 시에도 편집을 위해 선을 복구함
        setPathVisibility(true);
        document.getElementById('toggle-path-btn').innerText = "👁️ 가이드선 숨기기";
        document.getElementById('toggle-path-btn').style.background = "#009688";
        isPathVisible = true;

        recordBtn.innerText = "⏺ 녹화 시작";
        recordBtn.style.background = "#f44336";
        pauseBtn.style.display = "none";
        stopBtn.style.display = "none";
    }
});

// [시스템] 만능 필터 옵션 패널 생성기
function showFilterControls(title, params, onChangeCallback) {
    const panel = document.getElementById('filter-settings-panel');
    const titleEl = document.getElementById('filter-title');
    const slidersContainer = document.getElementById('filter-sliders');

    titleEl.innerText = `⚙️ ${title}`;
    slidersContainer.innerHTML = ''; // 기존 슬라이더 초기화
    panel.style.display = 'block';

    // 전달받은 파라미터(옵션) 수만큼 슬라이더 생성
    params.forEach(param => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '12px';

        const label = document.createElement('label');
        label.style.fontSize = '12px';
        label.style.display = 'flex';
        label.style.justifyContent = 'space-between';
        label.style.marginBottom = '5px';
        
        const labelText = document.createElement('span');
        labelText.innerText = param.label;
        
        const valueDisplay = document.createElement('span');
        valueDisplay.innerText = param.value;
        valueDisplay.style.color = '#00bcd4';
        valueDisplay.style.fontWeight = 'bold';

        label.appendChild(labelText);
        label.appendChild(valueDisplay);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.value = param.value;
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        // 슬라이더를 움직일 때마다 실시간으로 값 갱신 및 콜백 실행
        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valueDisplay.innerText = val;
            onChangeCallback(param.id, val); // 변경된 아이디와 값을 원본 효과로 전달
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        slidersContainer.appendChild(wrapper);
    });
}

// 패널 숨기기 함수 (선택 초기화 시 사용)
function hideFilterControls() {
    document.getElementById('filter-settings-panel').style.display = 'none';
}

// ----------------------------------------------------
// [새 기능] 무한 반복 및 횟수 옵션 실시간 연동 시스템
// ----------------------------------------------------
const repeatInfiniteCb = document.getElementById('repeat-infinite');
const repeatCountInput = document.getElementById('effect-repeat');

function updateLiveRepeat() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    
    let repeatCount = parseInt(repeatCountInput.value) - 1;
    
    // 무한 반복이 체크되어 있으면 -1, 아니면 지정된 횟수 적용
    if (repeatInfiniteCb && repeatInfiniteCb.checked) {
        repeatCount = -1;
    }
    
    // 현재 객체에서 달리고 있는 애니메이션을 찾아 반복 횟수를 즉각 수정
    if (obj.activeTween) {
        obj.activeTween.repeat(repeatCount);
    }
    if (obj.waterTween) {
        obj.waterTween.repeat(repeatCount);
    }
}

// 사용자가 마우스로 옵션을 건드리는 즉시 함수 실행
if (repeatInfiniteCb) repeatInfiniteCb.addEventListener('change', updateLiveRepeat);
if (repeatCountInput) repeatCountInput.addEventListener('input', updateLiveRepeat);

// ====================================================
// 🎨 정적 이미지 필터 엔진 (100선) 및 UI 연동 시스템
// ====================================================

// ====================================================
// 🎨 정적 이미지 필터 엔진 (100선) 및 UI 연동 시스템
// ====================================================

const staticNames = {
    1: "VHS 글리치", 2: "브라운관(CRT)", 3: "세피아 톤", 4: "완전 흑백", 5: "필름 그레인",
    6: "거친 흑백", 7: "빛바랜 폴라로이드", 8: "블록 픽셀화", 9: "게임보이(8비트)", 10: "듀오톤(블루)",
    11: "듀오톤(레드)", 12: "듀오톤(그린)", 13: "대비 극대화", 14: "청사진(Cyan)", 15: "포스터라이즈 느낌",
    16: "솔라라이즈", 17: "어두운 테두리", 18: "노이즈 캔디", 19: "흐린 흑백", 20: "열화 텍스처",
    21: "안개/스모그", 22: "햇살 가득", 23: "수중 느낌(푸른빛)", 24: "황혼(노을빛)", 25: "얼음 큐브(차가움)",
    26: "모래 폭풍(누런 노이즈)", 27: "어두운 그림자", 28: "숲속(초록빛)", 29: "강한 흐림(심도)", 30: "약한 흐림(소프트)",
    31: "초점 나감", 32: "어지러움(노이즈+블러)", 33: "샤픈(날카롭게)", 34: "엣지 추출(네온)", 35: "엠보싱(입체감)",
    36: "강한 모자이크", 37: "소프트 블러", 38: "거친 픽셀", 39: "익명처리(모자이크)", 40: "윤곽선 강조",
    41: "유화 질감 대용", 42: "연필 스케치 톤", 43: "흑백 선화", 44: "강렬한 채도", 45: "스테인드글라스 톤",
    46: "적외선 카메라", 47: "야간 투시경(녹색)", 48: "화보 톤(크로스 프로세스)", 49: "차가운 도시", 50: "따뜻한 카페",
    51: "화사한 피부톤", 52: "색수차 톤", 53: "시네마틱 룩", 54: "빈티지 필름 룩", 55: "따뜻한 조명",
    56: "차가운 조명", 57: "사이버펑크(마젠타)", 58: "매트릭스(형광녹색)", 59: "채도 200%", 60: "흑백 대비 극대화",
    61: "약한 보케", 62: "소프트 포커스", 63: "HDR 과장", 64: "먼지 낀 렌즈", 65: "선명도 100%",
    66: "적색 강조", 67: "청색 강조", 68: "녹색 강조", 69: "빛 바랜 옐로우", 70: "과노출(하얗게)",
    71: "노출 부족(어둡게)", 72: "오래된 신문", 73: "보라색 틴트", 74: "핑크빛 무드", 75: "오렌지 선셋",
    76: "민트 초코", 77: "다크 블루", 78: "다크 레드", 79: "다크 그린", 80: "형광 옐로우",
    81: "페이드 아웃 느낌", 82: "고대 벽화", 83: "에메랄드 바다", 84: "심해 깊은 곳", 85: "우주 공간",
    86: "화성 표면", 87: "달빛 은은함", 88: "뱀파이어 룩", 89: "좀비 핏기없음", 90: "오로라 보라빛",
    91: "골드 러시", 92: "실버 메탈릭", 93: "브론즈 빈티지", 94: "마젠타 쇼크", 95: "형광 페인트",
    96: "탁한 회색빛", 97: "밝은 파스텔", 98: "다크 판타지", 99: "애니메이션 톤", 100: "색상 완전 반전"
};

const staticPresets = {
    1: { noise: 150, saturation: 0.5, hue: 0.1 }, 2: { noise: 80, contrast: 0.2, brightness: -0.05 },
    3: { sepia: true, brightness: 0.05 }, 4: { saturation: -1, contrast: 0.1 }, 5: { noise: 300, saturation: -0.5 },
    6: { saturation: -1, contrast: 0.4, noise: 100 }, 7: { sepia: true, brightness: 0.1, contrast: -0.2 },
    8: { pixelate: 10 }, 9: { pixelate: 6, contrast: 0.5, saturation: 0.5 }, 10: { saturation: -1, tint: '#0044ff', tintAlpha: 0.5 },
    11: { saturation: -1, tint: '#ff0000', tintAlpha: 0.5 }, 12: { saturation: -1, tint: '#00ff00', tintAlpha: 0.5 },
    13: { contrast: 0.8 }, 14: { saturation: -1, tint: '#00ffff', tintAlpha: 0.6 }, 15: { contrast: 0.5, saturation: 1, pixelate: 2 },
    16: { invert: true, hue: 0.5 }, 17: { brightness: -0.3, contrast: 0.4 }, 18: { noise: 400, hue: 0.8 },
    19: { saturation: -1, blur: 0.1 }, 20: { noise: 200, contrast: 0.3, sepia: true },
    21: { brightness: 0.2, contrast: -0.4, blur: 0.3 }, 22: { brightness: 0.1, tint: '#ffcc00', tintAlpha: 0.3 },
    23: { tint: '#00bcd4', tintAlpha: 0.4 }, 24: { tint: '#ff9800', tintAlpha: 0.3, saturation: 0.5 },
    25: { tint: '#0055ff', tintAlpha: 0.2, brightness: 0.1 }, 26: { tint: '#cddc39', tintAlpha: 0.3, noise: 200 },
    27: { brightness: -0.4, contrast: 0.2 }, 28: { tint: '#228b22', tintAlpha: 0.3 }, 29: { blur: 0.6 },
    30: { blur: 0.2 }, 31: { blur: 0.4, brightness: 0.1 }, 32: { blur: 0.3, noise: 150 },
    33: { matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }, 34: { matrix: [-1, -1, -1, -1, 8, -1, -1, -1, -1], saturation: -1 },
    35: { matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1] }, 36: { pixelate: 25 }, 37: { blur: 0.1, brightness: 0.05 },
    38: { pixelate: 15, noise: 50 }, 39: { pixelate: 30, blur: 0.1 }, 40: { contrast: 0.6, matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
    41: { pixelate: 3, blur: 0.1, contrast: 0.2 }, 42: { saturation: -1, contrast: 0.5, noise: 80 }, 43: { saturation: -1, contrast: 0.8 },
    44: { saturation: 1.5 }, 45: { saturation: 1, contrast: 0.5, tint: '#8a2be2', tintAlpha: 0.2 },
    46: { invert: true, hue: -0.5 }, 47: { tint: '#00ff00', tintAlpha: 0.6, saturation: -1, noise: 100 },
    48: { contrast: 0.3, tint: '#ff00ff', tintAlpha: 0.2 }, 49: { tint: '#00aaff', tintAlpha: 0.2, saturation: -0.3 },
    50: { tint: '#d2b48c', tintAlpha: 0.3, sepia: true }, 51: { brightness: 0.1, contrast: 0.1, saturation: 0.2 },
    52: { hue: 0.2, blur: 0.05, contrast: 0.2 }, 53: { contrast: 0.3, saturation: -0.2, tint: '#002244', tintAlpha: 0.2 },
    54: { sepia: true, noise: 50, contrast: 0.1 }, 55: { tint: '#ffa500', tintAlpha: 0.2 }, 56: { tint: '#add8e6', tintAlpha: 0.2 },
    57: { hue: -0.8, saturation: 1, contrast: 0.3 }, 58: { tint: '#00ff00', tintAlpha: 0.5, saturation: -1, contrast: 0.5 },
    59: { saturation: 2 }, 60: { saturation: -1, contrast: 1 }, 61: { blur: 0.15, brightness: 0.05 },
    62: { blur: 0.05, contrast: -0.1 }, 63: { contrast: 0.7, saturation: 0.5 }, 64: { noise: 100, blur: 0.05, sepia: true },
    65: { matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0], contrast: 0.2 }, 66: { tint: '#ff0000', tintAlpha: 0.4 },
    67: { tint: '#0000ff', tintAlpha: 0.4 }, 68: { tint: '#00ff00', tintAlpha: 0.4 }, 69: { tint: '#ffff00', tintAlpha: 0.3, sepia: true },
    70: { brightness: 0.6 }, 71: { brightness: -0.6 }, 72: { sepia: true, noise: 150, saturation: -0.8 },
    73: { tint: '#800080', tintAlpha: 0.4 }, 74: { tint: '#ffc0cb', tintAlpha: 0.3 }, 75: { tint: '#ff4500', tintAlpha: 0.3 },
    76: { tint: '#00ff7f', tintAlpha: 0.3 }, 77: { tint: '#00008b', tintAlpha: 0.5, brightness: -0.2 },
    78: { tint: '#8b0000', tintAlpha: 0.5, brightness: -0.2 }, 79: { tint: '#006400', tintAlpha: 0.5, brightness: -0.2 },
    80: { tint: '#ccff00', tintAlpha: 0.3, saturation: 1 }, 81: { brightness: 0.3, contrast: -0.4 },
    82: { sepia: true, contrast: 0.4, noise: 50 }, 83: { tint: '#50c878', tintAlpha: 0.4 }, 84: { tint: '#000033', tintAlpha: 0.6 },
    85: { tint: '#0a0a2a', tintAlpha: 0.5, noise: 100 }, 86: { tint: '#cc3300', tintAlpha: 0.4, contrast: 0.2 },
    87: { tint: '#e6e6fa', tintAlpha: 0.2, brightness: -0.1 }, 88: { saturation: -0.8, contrast: 0.3, tint: '#8a0303', tintAlpha: 0.2 },
    89: { saturation: -0.5, brightness: -0.1, tint: '#556b2f', tintAlpha: 0.2 }, 90: { hue: 0.7, saturation: 0.5 },
    91: { tint: '#ffd700', tintAlpha: 0.3, contrast: 0.2 }, 92: { saturation: -1, contrast: 0.3, brightness: 0.1 },
    93: { sepia: true, contrast: 0.5, tint: '#8b4513', tintAlpha: 0.2 }, 94: { tint: '#ff00ff', tintAlpha: 0.4, contrast: 0.3 },
    95: { saturation: 1.5, contrast: 0.3, tint: '#00ffcc', tintAlpha: 0.2 }, 96: { saturation: -0.5, brightness: -0.2, blur: 0.05 },
    97: { brightness: 0.2, contrast: -0.2, saturation: 0.2 }, 98: { brightness: -0.4, contrast: 0.5, saturation: -0.3 },
    99: { contrast: 0.6, saturation: 0.8, pixelate: 2 }, 100: { invert: true }
};
// ====================================================
// 🌊 레트로 특수 효과(FX) 100선 UI 생성 및 실행 엔진
// ====================================================

// 1. 레트로 특수 효과 100선 이름 정의
const retroFxNames = {
    1: "호수 잔물결", 2: "소용돌이 물결", 3: "세로 폭포 왜곡", 4: "유리병 반사", 5: "물방울 파동",
    6: "수면 굴절", 7: "거울 굴절", 8: "기름막 무지개 왜곡", 9: "얼음 큐브 굴절", 10: "비 오는 유리창",
    21: "그라데이션 플래시", 22: "무지개 스트로브", 23: "색상 채널 분리(RGB)", 24: "네온 테두리 점멸", 25: "빛 방울(Lens Flare)",
    26: "오로라 그라데이션", 27: "십자 별빛 반짝임", 28: "CRT 스캔라인", 29: "색상 밴딩(Posterize)", 30: "모노크롬 발광",
    41: "픽셀 흩날림", 42: "블록 셔플(격자 이동)", 43: "색상 반전 플래시", 44: "데이터 손실(글리치)", 45: "픽셀 타일링",
    46: "도트 매트릭스", 47: "옛날 웹 브라우저 질감", 48: "저해상도 변환", 49: "픽셀 회오리", 50: "모자이크 흐림",
    61: "입자(Particle) 분해", 62: "안개 속 발광", 63: "금가루 날림", 64: "불꽃 튀기기", 65: "연기 텍스처",
    66: "눈 내리는 효과", 67: "꽃잎 휘날림", 68: "별 가루", 69: "먼지 입자", 70: "비눗방울 생성",
    81: "좌우 롤링(무한)", 82: "위아래 바운싱", 83: "줌 인/아웃(숨쉬기)", 84: "회전 발광", 85: "색상 순환(Cycling)",
    86: "네온 루프", 87: "그림자 잔상", 88: "번개 깜빡임", 89: "데이터 스트림", 90: "오버레이 점멸",
    91: "캔버스 찢기(왜곡)", 92: "유리 깨짐(왜곡)", 93: "열기 왜곡(아지랑이)", 94: "종이 텍스처 합치기", 95: "필름 노이즈",
    96: "브라운관 흔들림", 97: "옛날 TV 노이즈", 98: "흑백 반전 루프", 99: "포스터 컬러 변환", 100: "최종 믹스(All FX)"
};

// 2. 좌측 패널에 100개 레트로 특수 효과 버튼 자동으로 그리기
const retroFxContainer = document.getElementById('retro-fx-container');
if (retroFxContainer) {
    for (let i = 1; i <= 100; i++) {
        const btn = document.createElement('button');
        const fxName = retroFxNames[i] || `특수 효과 ${i}`;
        btn.innerText = `${i}. ${fxName}`;
        btn.style.background = "#ff9800"; // 주황색 레트로 테마
        btn.style.color = "#ffffff";
        btn.style.fontWeight = "bold";
        btn.onclick = () => applyRetroFx(i);
        retroFxContainer.appendChild(btn);
    }
}

// 3. 레트로 특수 효과 분기 및 실행 핸들러
function applyRetroFx(id) {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'image') {
        alert("이 효과는 '이미지' 객체에만 적용할 수 있습니다.");
        return;
    }

    // 기존 애니메이션 요소가 달리고 있다면 깨끗이 정지
    gsap.killTweensOf(obj);
    if (obj.activeTween) obj.activeTween.kill();
    if (obj.waterTween) obj.waterTween.kill();
    if (!obj.baseState) saveBaseState(obj);

    const duration = parseFloat(document.getElementById('effect-duration').value);
    let repeatCount = parseInt(document.getElementById('effect-repeat').value) - 1;
    if (document.getElementById('repeat-infinite').checked) repeatCount = -1;
    const render = () => canvas.renderAll();

    // 사용자가 요청한 [5번 물방울 파동] 알고리즘 연결 및 구현
    if (id === 5) {
        if (!obj.originalElement) obj.originalElement = obj.getElement();
        const img = obj.originalElement;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const fxCanvas = document.createElement('canvas');
        fxCanvas.width = w;
        fxCanvas.height = h;
        const ctx = fxCanvas.getContext('2d', { willReadFrequently: true });
        obj.setElement(fxCanvas);

        obj.fxTime = 0;
        obj.waterTween = gsap.to(obj, {
            fxTime: Math.PI * 20,
            duration: duration,
            repeat: repeatCount,
            ease: "none",
            onUpdate: () => {
                ctx.clearRect(0, 0, w, h);
                const centerX = w / 2;
                const centerY = h / 2;

                // 픽셀을 정밀하게 분해하여 중앙을 기준으로 파동 왜곡 연산 처리 (자바 애플릿 감성 구현)
                for (let y = 0; y < h; y += 4) {
                    let dy = y - centerY;
                    for (let x = 0; x < w; x += 4) {
                        let dx = x - centerX;
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // 중앙으로부터 퍼져나가는 사인파 왜곡 오프셋 계산
                        let distortion = Math.sin(distance * 0.05 - obj.fxTime) * 15 * (1 - distance / Math.sqrt(centerX * centerX + centerY * centerY));
                        if (distortion < 0) distortion = 0;

                        let sx = x + (dx / (distance || 1)) * distortion;
                        let sy = y + (dy / (distance || 1)) * distortion;

                        // 경계선 제한 처리
                        if (sx < 0) sx = 0; if (sx > w - 4) sx = w - 4;
                        if (sy < 0) sy = 0; if (sy > h - 4) sy = h - 4;

                        ctx.drawImage(img, sx, sy, 4, 4, x, y, 4, 4);
                    }
                }
                obj.dirty = true;
                render();
            }
        });
    } else {
        alert(`${id}번 효과는 목록 연결이 완료되었으며, 세부 알고리즘은 순차적으로 구현 예정입니다.`);
    }
}
const staticContainer = document.getElementById('static-filters-container');
if (staticContainer) {
    for (let i = 1; i <= 100; i++) {
        const btn = document.createElement('button');
        const name = staticNames[i] || `정적 효과 ${i}`;
        btn.innerText = `${i}. ${name}`;
        btn.style.background = "#00bcd4";
        btn.style.color = "#000";
        btn.style.fontWeight = "bold";
        btn.onclick = () => applyStaticFilter(i);
        staticContainer.appendChild(btn);
    }
}

function applyStaticFilter(id) {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'image') {
        alert("이 효과는 '이미지' 객체에만 적용할 수 있습니다.");
        return;
    }

    const name = staticNames[id] || `필터 ${id}`;
    const p = staticPresets[id] || {};

    obj.filterSettings = {
        brightness: p.brightness || 0,
        contrast: p.contrast || 0,
        saturation: p.saturation !== undefined ? p.saturation : 0,
        hue: p.hue || 0,
        noise: p.noise || 0,
        pixelate: p.pixelate || 1,
        blur: p.blur || 0,
        sepia: p.sepia || false,
        invert: p.invert || false,
        matrix: p.matrix || null,
        tint: p.tint || null,
        tintAlpha: p.tintAlpha || 0
    };

    showFilterControls(`🎨 ${name} (미세조정)`, [
        { id: 'brightness', label: '밝기 (-1 ~ 1)', min: -1, max: 1, step: 0.05, value: obj.filterSettings.brightness },
        { id: 'contrast', label: '대비 (-1 ~ 1)', min: -1, max: 1, step: 0.05, value: obj.filterSettings.contrast },
        { id: 'saturation', label: '채도 (색상 농도)', min: -1, max: 2, step: 0.1, value: obj.filterSettings.saturation },
        { id: 'hue', label: '색조 변경(Hue)', min: -2, max: 2, step: 0.1, value: obj.filterSettings.hue },
        { id: 'noise', label: '노이즈(지직거림)', min: 0, max: 500, step: 10, value: obj.filterSettings.noise },
        { id: 'pixelate', label: '모자이크(픽셀화)', min: 1, max: 50, step: 1, value: obj.filterSettings.pixelate },
        { id: 'blur', label: '흐림(블러)', min: 0, max: 1, step: 0.05, value: obj.filterSettings.blur }
    ], (paramId, val) => {
        obj.filterSettings[paramId] = val;
        renderFilters(obj);
    });

    renderFilters(obj);
}

function renderFilters(obj) {
    const s = obj.filterSettings;
    const f = fabric.Image.filters;
    
    obj.filters = []; 

    if (s.brightness !== 0) obj.filters.push(new f.Brightness({ brightness: s.brightness }));
    if (s.contrast !== 0) obj.filters.push(new f.Contrast({ contrast: s.contrast }));
    if (s.saturation !== 0) obj.filters.push(new f.Saturation({ saturation: s.saturation }));
    if (s.hue !== 0) obj.filters.push(new f.HueRotation({ rotation: s.hue }));
    if (s.noise > 0) obj.filters.push(new f.Noise({ noise: s.noise }));
    if (s.pixelate > 1) obj.filters.push(new f.Pixelate({ blocksize: s.pixelate }));
    if (s.blur > 0) obj.filters.push(new f.Blur({ blur: s.blur }));

    if (s.sepia) obj.filters.push(new f.Sepia());
    if (s.invert) obj.filters.push(new f.Invert());
    if (s.tint) obj.filters.push(new f.BlendColor({ color: s.tint, mode: 'tint', alpha: s.tintAlpha }));
    if (s.matrix) obj.filters.push(new f.Convolute({ matrix: s.matrix }));

    obj.applyFilters();
    canvas.renderAll();
}