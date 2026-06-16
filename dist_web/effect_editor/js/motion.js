const effectNames = {	
    1: "360도 스핀", 2: "심장 박동(스케일)", 3: "페이드 아웃 & 인", 4: "좌우 흔들기(도리도리)", 5: "블랙홀(축소 회전)",
    6: "위에서 쿵 떨어지기", 7: "탄성 확대(젤리)", 8: "좌우 끄덕임(진자)", 9: "플래시(깜빡임)", 10: "흐려지기(블러 효과)",
    11: "상하 둥둥 떠다니기", 12: "지진(격렬한 흔들림)", 13: "투명도 펄스", 14: "고무줄 늘어나기", 15: "시계추 회전",
    16: "X축 3D 회전(플립)", 17: "Y축 3D 회전(플립)", 18: "랜덤 순간이동", 19: "점진적 페이드인", 20: "스포트라이트",
    21: "통통 튀며 이동", 22: "회오리 등장", 23: "좌측에서 슬라이드 인", 24: "우측으로 슬라이드 아웃", 25: "긍정 끄덕임(Yes)",
    26: "부정 도리도리(No)", 27: "심호흡(천천히 확대/축소)", 28: "엔진 덜컹거림", 29: "글리치(에러)", 30: "빠른 줌인",
    31: "빠른 줌아웃", 32: "무중력 유영", 33: "회전하며 페이드인", 34: "낙엽처럼 떨어지기", 35: "팽이 회전",
    36: "스프링 점프", 37: "핸드폰 진동", 38: "유령(투명도 덜덜)", 39: "로봇 움직임", 40: "심장 연속 박동",    
    41: "로켓 발사(위로 슈웅)", 42: "바람 빠진 풍선", 43: "심해 잠수(가라앉기)", 44: "수면 위 부상", 45: "갸우뚱(좌우 틸트)",
    46: "전구 켜지기(번뜩)", 47: "그림자 숨기", 48: "깜짝 놀라기(점프스케어)", 49: "우주 미아(천천히 표류)", 50: "지그작 이동",
    51: "태엽 인형 걷기", 52: "물수제비 통통통", 53: "블랙아웃(정전)", 54: "타자기 타닥타닥", 55: "텔레포트 등장",
    56: "텔레포트 퇴장", 57: "토네이도 휩쓸림", 58: "종이 비행기 활공", 59: "자석에 끌려가기", 60: "벽 맞고 튕기기(리바운드)",
    61: "과호흡(빠른 수축팽창)", 62: "느린 끄덕임(이해함)", 63: "바나나 밟고 미끄러짐", 64: "엘리베이터 상승", 65: "엘리베이터 하강",
    66: "초고속 스핀", 67: "슬로우 모션 스핀", 68: "좌우 고속 진동", 69: "상하 고속 진동", 70: "멀미(어질어질)",
    71: "절반으로 수축", 72: "두배로 팽창", 73: "수축 후 폭발적 팽창", 74: "바람에 날려가기", 75: "무거운 짐(짓눌림)",
    76: "풍선껌 터지기", 77: "도약 준비(웅크리기)", 78: "벽돌처럼 추락", 79: "깃털처럼 하강", 80: "레이더망 스캔",
    81: "카메라 셔터(찰칵)", 82: "고장난 네온사인", 83: "숨바꼭질(빼꼼)", 84: "위성 궤도 돌기", 85: "경고등 깜빡임",
    86: "기지개 쭈욱 켜기", 87: "움찔하기(회피)", 88: "수영하기(헤엄)", 89: "얼음 땡(가다 서다)", 90: "후진 기어",
    91: "드릴 회전 돌파", 92: "부메랑 투척", 93: "위풍당당 걷기", 94: "거인의 발걸음(쿵쿵)", 95: "닌자 대시(순간이동)",
    96: "마술사 짠! 등장", 97: "마술사 펑! 퇴장", 98: "최면술 빙글빙글", 99: "불꽃놀이 팡!", 100: "대피날레(스포트라이트)"
};

const effectLibrary = {
    1: (obj, dur, render) => gsap.to(obj, { angle: obj.angle + 360, duration: dur, ease: "power1.inOut", onUpdate: render }),
    2: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.3, scaleY: obj.scaleY * 1.3, duration: dur/2, yoyo: true, repeat: 1, ease: "bounce.out", onUpdate: render }),
    3: (obj, dur, render) => gsap.to(obj, { opacity: 0, duration: dur/2, yoyo: true, repeat: 1, onUpdate: render }),
    4: (obj, dur, render) => gsap.to(obj, { left: obj.left + 50, duration: dur/6, yoyo: true, repeat: 5, ease: "sine.inOut", onUpdate: render }),
    5: (obj, dur, render) => { const tl = gsap.timeline({ onUpdate: render }); tl.to(obj, { angle: obj.angle + 720, scaleX: 0, scaleY: 0, opacity: 0, duration: dur, ease: "power2.in" }); return tl; },
    6: (obj, dur, render) => { const startY = obj.top; obj.set('top', -200); return gsap.to(obj, { top: startY, duration: dur, ease: "bounce.out", onUpdate: render }); },
    7: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.5, scaleY: obj.scaleY * 0.5, duration: dur/4, yoyo: true, repeat: 3, ease: "elastic.out(1, 0.3)", onUpdate: render }),
    8: (obj, dur, render) => gsap.to(obj, { angle: obj.angle + 30, duration: dur/4, yoyo: true, repeat: 3, ease: "power1.inOut", onUpdate: render }),
    9: (obj, dur, render) => { let repeats = Math.floor(dur / 0.1); if (repeats % 2 !== 0) repeats += 1; return gsap.to(obj, { opacity: 0, duration: 0.1, yoyo: true, repeat: repeats, onUpdate: render }); },
    10: (obj, dur, render) => gsap.to(obj, { opacity: 0.5, scaleX: obj.scaleX * 1.1, scaleY: obj.scaleY * 1.1, duration: dur, ease: "power2.out", onUpdate: render }),
    11: (obj, dur, render) => gsap.to(obj, { top: obj.top - 30, duration: dur/2, yoyo: true, repeat: 1, ease: "sine.inOut", onUpdate: render }),
    12: (obj, dur, render) => gsap.to(obj, { left: "+=15", top: "+=15", duration: 0.05, yoyo: true, repeat: Math.floor(dur / 0.05), ease: "rough", onUpdate: render }),
    13: (obj, dur, render) => gsap.to(obj, { opacity: 0.2, duration: dur/3, yoyo: true, repeat: 2, ease: "sine.inOut", onUpdate: render }),
    14: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 2, duration: dur/2, yoyo: true, repeat: 1, ease: "power2.inOut", onUpdate: render }),
    15: (obj, dur, render) => gsap.to(obj, { angle: obj.angle + 45, duration: dur/4, yoyo: true, repeat: 3, transformOrigin: "top center", ease: "sine.inOut", onUpdate: render }),
    16: (obj, dur, render) => gsap.to(obj, { scaleX: -obj.scaleX, duration: dur, ease: "power1.inOut", onUpdate: render }), 
    17: (obj, dur, render) => gsap.to(obj, { scaleY: -obj.scaleY, duration: dur, ease: "power1.inOut", onUpdate: render }), 
    18: (obj, dur, render) => gsap.to(obj, { left: () => Math.random() * window.canvas.width, top: () => Math.random() * window.canvas.height, duration: dur, ease: "steps(5)", onUpdate: render }),
    19: (obj, dur, render) => { obj.set('opacity', 0); return gsap.to(obj, { opacity: 1, duration: dur, ease: "power1.in", onUpdate: render }); },
    20: (obj, dur, render) => gsap.to(obj, { scaleX: obj.scaleX * 1.2, scaleY: obj.scaleY * 1.2, duration: dur * 0.8, ease: "power2.out", onComplete: () => gsap.to(obj, { scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, duration: dur * 0.2, onUpdate: render }), onUpdate: render }),
    21: (obj, dur, render) => gsap.to(obj, { top: obj.top - 50, left: obj.left + 50, duration: dur/4, yoyo: true, repeat: 3, ease: "power1.inOut", onUpdate: render }),
    22: (obj, dur, render) => { obj.set({ scaleX: 0, scaleY: 0, angle: -1080 }); return gsap.to(obj, { scaleX: obj.baseState.scaleX, scaleY: obj.baseState.scaleY, angle: obj.baseState.angle, duration: dur, ease: "power2.out", onUpdate: render }); },
    23: (obj, dur, render) => { const endLeft = obj.left; obj.set('left', -200); return gsap.to(obj, { left: endLeft, duration: dur, ease: "back.out(1.5)", onUpdate: render }); },
    24: (obj, dur, render) => gsap.to(obj, { left: window.canvas.width + 200, duration: dur, ease: "power2.in", onUpdate: render }),
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
    100: (obj, dur, render) => gsap.to(obj, { left: window.canvas.width / 2 / window.canvas.getZoom() - (obj.width * obj.scaleX)/2, top: window.canvas.height / 2 / window.canvas.getZoom() - (obj.height * obj.scaleY)/2, scaleX: 2, scaleY: 2, angle: "+=720", duration: dur, ease: "power2.inOut", onUpdate: render })
};

const advancedNames = {
    101: "제자리 돌기 (옵션 패널)", 102: "돌기 + 심장박동 (옵션 패널)",
    103: "출렁이며 날기 (옵션 패널)", 104: "선 따라 움직이기 (경로 애니)"
};

const motionContainer = document.getElementById('buttons-container');
if (motionContainer) {
    for (let i = 101; i <= 104; i++) {
        const btn = document.createElement('button'); btn.innerText = `${i}. ${advancedNames[i]}`;
        btn.style.background = "#e91e63"; btn.onclick = () => window.applyEffect(i); motionContainer.appendChild(btn);
    }
    for (let i = 1; i <= 100; i++) {
        const btn = document.createElement('button'); btn.innerText = effectNames[i] ? `${i}. ${effectNames[i]}` : `${i}. 효과 ${i}`;
        btn.onclick = () => window.applyEffect(i); motionContainer.appendChild(btn);
    }
}

window.applyEffect = function(id) {
    const obj = window.canvas.getActiveObject();
    if (!obj) return alert("효과를 적용할 대상을 먼저 선택해주세요.");
    
    const duration = parseFloat(document.getElementById('effect-duration').value);
    let repeatCount = document.getElementById('repeat-infinite').checked ? -1 : parseInt(document.getElementById('effect-repeat').value) - 1;
    const render = () => window.canvas.renderAll();

    gsap.killTweensOf(obj);
    if (obj.activeTween) obj.activeTween.kill();
    if (obj.waterTween) obj.waterTween.kill();
    if (!obj.baseState) window.saveBaseState(obj);

    if (id >= 101 && id <= 104) {
        if (!obj.advSettings) obj.advSettings = {};
        if (id === 101) {
            if(!obj.advSettings[101]) obj.advSettings[101] = { speed: 1 };
            window.showFilterControls("제자리 돌기 옵션", [{ id: 'speed', label: '회전 속도', min: 0.5, max: 10, step: 0.5, value: obj.advSettings[101].speed }], (pid, val) => { obj.advSettings[101][pid] = val; play101(); });
            const play101 = () => { gsap.killTweensOf(obj); if(obj.activeTween) obj.activeTween.kill(); obj.set(obj.baseState); const anim = gsap.to(obj, { angle: obj.baseState.angle + (360 * obj.advSettings[101].speed), duration: duration, ease: "none", repeat: repeatCount, onUpdate: render }); obj.activeTween = anim; window.setEffectPlaybackRunning(obj); };
            play101();
        } else if (id === 102) {
            if(!obj.advSettings[102]) obj.advSettings[102] = { speed: 1, pulse: 1.5 };
            window.showFilterControls("돌면서 심장박동 옵션", [{ id: 'speed', label: '회전 속도', min: 0.5, max: 10, step: 0.5, value: obj.advSettings[102].speed }, { id: 'pulse', label: '박동 크기', min: 1.1, max: 3, step: 0.1, value: obj.advSettings[102].pulse }], (pid, val) => { obj.advSettings[102][pid] = val; play102(); });
            const play102 = () => { gsap.killTweensOf(obj); if(obj.activeTween) obj.activeTween.kill(); obj.set(obj.baseState); const tl = gsap.timeline({ repeat: repeatCount }); tl.to(obj, { angle: obj.baseState.angle + (360 * obj.advSettings[102].speed), duration: duration, ease: "none", onUpdate: render }, 0); tl.to(obj, { scaleX: obj.baseState.scaleX * obj.advSettings[102].pulse, scaleY: obj.baseState.scaleY * obj.advSettings[102].pulse, duration: duration / 4, yoyo: true, repeat: 3, ease: "power1.inOut", onUpdate: render }, 0); obj.activeTween = tl; window.setEffectPlaybackRunning(obj); };
            play102();
        } else if (id === 103) {
            const logicalW = window.canvas.width / window.canvas.getZoom(); const logicalH = window.canvas.height / window.canvas.getZoom();
            if(!obj.advSettings[103]) obj.advSettings[103] = { dir: 1, startY: Math.round(logicalH / 2), endY: Math.round(logicalH / 2), amp: 80, freq: 3 };
            window.showFilterControls("출렁이며 날기 옵션", [{ id: 'dir', label: '방향 (1:우측, -1:좌측)', min: -1, max: 1, step: 2, value: obj.advSettings[103].dir }, { id: 'startY', label: '진입 높이', min: 0, max: Math.round(logicalH), step: 10, value: obj.advSettings[103].startY }, { id: 'endY', label: '퇴장 높이', min: 0, max: Math.round(logicalH), step: 10, value: obj.advSettings[103].endY }, { id: 'amp', label: '진폭', min: 0, max: Math.round(logicalH / 2), step: 10, value: obj.advSettings[103].amp }, { id: 'freq', label: '주파수', min: 1, max: 15, step: 1, value: obj.advSettings[103].freq }], (pid, val) => { obj.advSettings[103][pid] = val; play103(); });
            const play103 = () => { gsap.killTweensOf(obj); if(obj.activeTween) obj.activeTween.kill(); const set = obj.advSettings[103]; const startX = set.dir === 1 ? -obj.width : logicalW + obj.width; const endX = set.dir === 1 ? logicalW + obj.width : -obj.width; const realStartY = logicalH - set.startY; const realEndY = logicalH - set.endY; obj.set({ left: startX, top: realStartY }); const proxy = { t: 0 }; const tl = gsap.timeline({ repeat: repeatCount, onUpdate: render }); tl.to(obj, { left: endX, duration: duration, ease: "none" }, 0); tl.to(proxy, { t: 1, duration: duration, ease: "none", onUpdate: () => { obj.set('top', (realStartY + (realEndY - realStartY) * proxy.t) - Math.sin(proxy.t * Math.PI * 2 * set.freq) * set.amp); } }, 0); obj.activeTween = tl; window.setEffectPlaybackRunning(obj); };
            play103();
        } else if (id === 104) {
            window.hideFilterControls(); const paths = window.canvas.getObjects().filter(o => o.type === 'path'); if (paths.length === 0) return alert("그려진 선이 없습니다.");
            const targetPath = paths[paths.length - 1]; const dString = targetPath.path.map(p => p.join(' ')).join(' ');
            const firstCmd = targetPath.path[0]; const startPoint = new fabric.Point(firstCmd[1] - targetPath.pathOffset.x, firstCmd[2] - targetPath.pathOffset.y);
            const absoluteStart = fabric.util.transformPoint(startPoint, targetPath.calcTransformMatrix());
            const offsetX = absoluteStart.x - firstCmd[1]; const offsetY = absoluteStart.y - firstCmd[2]; const proxy = { x: 0, y: 0 };
            const anim = gsap.to(proxy, { motionPath: { path: dString }, duration: duration, repeat: repeatCount, ease: "none", onUpdate: () => { if (!targetPath.canvas) { anim.kill(); return; } obj.set({ left: proxy.x + offsetX, top: proxy.y + offsetY }); render(); } });
            obj.activeTween = anim; window.setEffectPlaybackRunning(obj);
        }
        return; 
    } 

    window.hideFilterControls();
    if (obj.baseState) { obj.set(obj.baseState); obj.setCoords(); }

    let animation = effectLibrary[id] ? effectLibrary[id](obj, duration, render) : gsap.to(obj, { left: "+=50", angle: "+=45", duration: duration, onUpdate: render });
    if (animation) {
        const masterTl = gsap.timeline({ repeat: repeatCount });
        masterTl.add(animation); obj.activeTween = masterTl; window.setEffectPlaybackRunning(obj);
    }
};