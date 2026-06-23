document.addEventListener('DOMContentLoaded', () => {
    // 기존의 글꼴 버튼을 찾습니다.
    const propFontBtn = document.getElementById('propFontBtn');
    const propFontLabel = document.getElementById('propFontLabel');

    if (!propFontBtn) return;

    // 1. 순수 JS로 완전히 새로운 독립된 모달창 생성 (고급스러운 둥근 테두리와 그림자 적용)
    const modal = document.createElement('div');
    modal.id = 'effectFontModal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';

    // 마지막 위치와 크기 복원
    const savedLeft = localStorage.getItem('shorts_font_modal_left');
    const savedTop = localStorage.getItem('shorts_font_modal_top');
    const savedWidth = localStorage.getItem('shorts_font_modal_width');
    const savedHeight = localStorage.getItem('shorts_font_modal_height');

    modal.style.left = savedLeft || '50%';
    modal.style.top = savedTop || '100px';
    if (savedLeft) {
        modal.style.transform = 'none';
    } else {
        modal.style.transform = 'translateX(-50%)';
    }
    modal.style.width = savedWidth || '350px';
    modal.style.height = savedHeight || '500px';

    modal.style.background = '#ffffff'; // 깔끔한 흰색 배경
    modal.style.border = '1px solid #cbd5e1'; // 연한 회색 테두리
    modal.style.borderRadius = '12px'; // 모서리 둥글게
    modal.style.zIndex = '99999999';
    modal.style.flexDirection = 'column';
    modal.style.resize = 'both';
    modal.style.overflow = 'hidden';
    modal.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    document.body.appendChild(modal);

    // 2. 모달 헤더 영역 생성 (배경색 그라데이션 Navy 적용 및 라운드 처리)
    const header = document.createElement('div');
    header.style.background = 'linear-gradient(135deg, #000080, #1e1b4b)';
    header.style.padding = '12px 16px';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    header.style.borderRadius = '10px 10px 0 0';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.cursor = 'move';
    header.style.userSelect = 'none';
    
    // 모달창 이름 (가로 공간 확보를 위해 좌측 정렬 및 줄바꿈 방지 적용)
    const title = document.createElement('span');
    title.style.color = '#ffffff';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '15px'; // 폰트 크기 미세 조절
    title.style.letterSpacing = '-0.025em';
    title.style.pointerEvents = 'none';
    title.style.flex = '1';
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.gap = '6px';
    title.style.whiteSpace = 'nowrap'; // 한 줄에 표시 강제
    
    const titleText = document.createTextNode("폰트목록 선택");
    title.appendChild(titleText);

    // 폰트 동기화 이모티콘 버튼 추가 (브라우저가 queryLocalFonts API를 지원하는 경우에만 표시)
    if (window.queryLocalFonts) {
        const syncIconBtn = document.createElement('button');
        syncIconBtn.textContent = "🔄";
        syncIconBtn.style.cursor = 'pointer';
        syncIconBtn.style.background = 'none';
        syncIconBtn.style.border = 'none';
        syncIconBtn.style.outline = 'none';
        syncIconBtn.style.fontSize = '16px';
        syncIconBtn.style.padding = '0';
        syncIconBtn.style.margin = '0';
        syncIconBtn.style.display = 'inline-flex';
        syncIconBtn.style.alignItems = 'center';
        syncIconBtn.style.justifyContent = 'center';
        syncIconBtn.style.pointerEvents = 'auto'; // title의 pointerEvents: none 영향을 극복
        syncIconBtn.style.transition = 'transform 0.2s';
        syncIconBtn.title = "PC 폰트 동기화";

        syncIconBtn.addEventListener('mouseenter', () => {
            syncIconBtn.style.transform = 'scale(1.2)';
        });
        syncIconBtn.addEventListener('mouseleave', () => {
            syncIconBtn.style.transform = 'scale(1)';
        });
        syncIconBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // 헤더 드래그 무력화 방지
        });
        syncIconBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await syncLocalFonts();
        });
        title.appendChild(syncIconBtn);
    }
    
    // 닫기 버튼 (너비 50px로 축소, 디자인 컴팩트화)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "닫기";
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.width = '50px';
    closeBtn.style.flexShrink = '0';
    closeBtn.style.background = '#ffffff';
    closeBtn.style.color = '#000080';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.padding = '4px 0';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.fontSize = '11px';
    closeBtn.style.outline = 'none';
    closeBtn.style.textAlign = 'center';
    closeBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    closeBtn.style.transition = 'background-color 0.2s, transform 0.1s';
    
    // 닫기 버튼 호버/클릭 시 애니메이션 및 캡처 전파 차단
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = '#f3f4f6';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = '#ffffff';
    });
    closeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.style.display = 'none';
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // 3. 폰트 목록이 들어갈 스크롤 영역
    const listContainer = document.createElement('div');
    listContainer.style.height = 'calc(100% - 46px)';
    listContainer.style.overflowY = 'auto';
    listContainer.style.padding = '10px';
    listContainer.style.background = '#ffffff';
    listContainer.style.boxSizing = 'border-box';
    modal.appendChild(listContainer);

    // PC 로컬 폰트 동기화 비동기 함수
    async function syncLocalFonts() {
        try {
            if (!window.queryLocalFonts) return;
            if (window.showToast) window.showToast("PC 폰트 동기화 시작...");
            const f = await window.queryLocalFonts();
            const fetched = [...new Set(f.map(x => x.family))];
            localStorage.setItem('shorts_local_fonts', JSON.stringify(fetched));
            renderFontList();
            if (window.showToast) window.showToast("폰트 동기화 완료!");
        } catch (e) {
            console.error("폰트 접근 권한 거부됨.", e);
            if (window.showToast) window.showToast("PC 폰트 접근 권한이 필요합니다.");
        }
    }

    // 이벤트 리스너 - 버튼 클릭 시 모달 열기
    propFontBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.style.display = 'flex';
        renderFontList();
        
        // 다시 열 때도 마지막 위치/크기를 재적용하여 틀어짐 방지
        const currentLeft = localStorage.getItem('shorts_font_modal_left');
        const currentTop = localStorage.getItem('shorts_font_modal_top');
        const currentWidth = localStorage.getItem('shorts_font_modal_width');
        const currentHeight = localStorage.getItem('shorts_font_modal_height');

        if (currentLeft) {
            modal.style.left = currentLeft;
            modal.style.transform = 'none';
        }
        if (currentTop) modal.style.top = currentTop;
        if (currentWidth) modal.style.width = currentWidth;
        if (currentHeight) modal.style.height = currentHeight;

        // 만약 로컬 폰트가 비어있다면 자동 동기화 시도
        let localFonts = [];
        try { localFonts = JSON.parse(localStorage.getItem('shorts_local_fonts')) || []; } catch(_) {}
        if (localFonts.length === 0 && window.queryLocalFonts) {
            syncLocalFonts();
        }
    });

    // 드래그 로직 (이동성 개선)
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    header.addEventListener('mousedown', function(e) {
        if (e.target === closeBtn) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = modal.getBoundingClientRect();
        
        // 드래그 시작 즉시 left, top을 absolute pixel 단위로 전환하여 튀거나 축이 밀리는 현상 방지
        modal.style.transform = 'none';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
        
        startLeft = rect.left;
        startTop = rect.top;
        header.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        modal.style.left = (startLeft + (e.clientX - startX)) + 'px';
        modal.style.top = (startTop + (e.clientY - startY)) + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
            localStorage.setItem('shorts_font_modal_left', modal.style.left);
            localStorage.setItem('shorts_font_modal_top', modal.style.top);
        }
        // 크기 조절 상태 저장 (Resize)
        localStorage.setItem('shorts_font_modal_width', modal.style.width || (modal.getBoundingClientRect().width + 'px'));
        localStorage.setItem('shorts_font_modal_height', modal.style.height || (modal.getBoundingClientRect().height + 'px'));
    });

    // 4. 폰트 목록 렌더링 함수
    function renderFontList() {
        listContainer.innerHTML = ''; // 초기화


        // 1. 기본 웹 폰트
        const googleFonts = [
            'Pretendard', 'Black Han Sans', 'Do Hyeon', 'Jua', 'Noto Sans KR', 
            'Nanum Gothic', 'Nanum Myeongjo', 'Dancing Script', 'Pacifico', 'Satisfy', 'Great Vibes'
        ];

        // 2. localStorage에서 로컬 폰트 가져오기 (비동기 API를 호출하지 않아 멈춤현상 방지)
        let localFonts = [];
        try {
            localFonts = JSON.parse(localStorage.getItem('shorts_local_fonts')) || [];
        } catch(e) {}

        // 즐겨찾기 목록 불러오기
        let favFonts = [];
        try { favFonts = JSON.parse(localStorage.getItem('shorts_fav_fonts')) || []; } catch(e) {}

        const allFonts = [...new Set([...googleFonts, ...localFonts])];
        drawList(allFonts, favFonts);
    }

    function drawList(allFonts, favFonts) {
        // 정렬: 즐겨찾기가 먼저 오도록
        allFonts.sort((a, b) => {
            const aF = favFonts.includes(a);
            const bF = favFonts.includes(b);
            if (aF && !bF) return -1;
            if (!aF && bF) return 1;
            return String(a).localeCompare(String(b));
        });

        // 현재 캔버스에서 선택된 객체의 폰트
        const activeObject = window.canvas ? window.canvas.getActiveObject() : null;
        const currentFont = activeObject ? activeObject.fontFamily : 'Pretendard';

        allFonts.forEach(fontName => {
            const isS = (fontName === currentFont || (currentFont && currentFont.indexOf(fontName) === 0));
            const isF = favFonts.includes(fontName);

            // Row container (Flex box, 부드러운 트랜지션 적용)
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.borderBottom = '1px solid #f1f5f9'; // 부드러운 테두리선
            row.style.background = isS ? '#e0f2fe' : 'transparent';
            if (isS) {
                row.style.borderLeft = '4px solid #00bcd4';
            } else {
                row.style.borderLeft = '4px solid transparent';
            }
            row.style.boxSizing = 'border-box';
            row.style.width = '100%';
            row.style.transition = 'background-color 0.15s ease, border-left-color 0.15s ease';

            // Left side: Clickable font selection area
            const fontClickArea = document.createElement('div');
            fontClickArea.style.flex = '1';
            fontClickArea.style.padding = '10px 12px';
            fontClickArea.style.cursor = 'pointer';
            fontClickArea.style.minWidth = '0'; // 텍스트 말줄임 보장
            
            // 폰트 이름 텍스트
            const nameEl = document.createElement('div');
            nameEl.textContent = "글꼴 이름: " + fontName;
            nameEl.style.fontSize = '11px';
            nameEl.style.color = '#64748b'; // Slate 500
            nameEl.style.marginBottom = '4px';
            nameEl.style.fontWeight = '500';
            nameEl.style.whiteSpace = 'nowrap';
            nameEl.style.overflow = 'hidden';
            nameEl.style.textOverflow = 'ellipsis';

            // 폰트 샘플 (실제 폰트 적용)
            const previewEl = document.createElement('div');
            previewEl.textContent = "가나다 ABC 123";
            previewEl.style.fontSize = '17px';
            previewEl.style.color = '#1e293b'; // Slate 800
            previewEl.style.fontWeight = '500';
            previewEl.style.fontFamily = `"${fontName}", sans-serif`;

            fontClickArea.appendChild(nameEl);
            fontClickArea.appendChild(previewEl);

            // Right side: Star button (completely separate sibling, no event overlap)
            const starBtn = document.createElement('button');
            starBtn.textContent = '★';
            starBtn.style.width = '42px';
            starBtn.style.height = '42px';
            starBtn.style.display = 'flex';
            starBtn.style.alignItems = 'center';
            starBtn.style.justifyContent = 'center';
            starBtn.style.fontSize = '20px';
            starBtn.style.cursor = 'pointer';
            starBtn.style.border = 'none';
            starBtn.style.background = 'none';
            starBtn.style.color = isF ? '#f59e0b' : '#cbd5e1'; // 즐겨찾기 오렌지 or 회색
            starBtn.style.outline = 'none';
            starBtn.style.flexShrink = '0';
            starBtn.style.transition = 'color 0.15s ease, transform 0.15s ease';

            // 별 버튼 클릭 로직
            starBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 부모 row나 fontClickArea의 클릭 방지
                let favs = [];
                try { favs = JSON.parse(localStorage.getItem('shorts_fav_fonts')) || []; } catch(e) {}
                if (favs.includes(fontName)) {
                    favs = favs.filter(f => f !== fontName);
                } else {
                    favs.push(fontName);
                }
                localStorage.setItem('shorts_fav_fonts', JSON.stringify(favs));
                renderFontList(); // 하트 상태 업데이트 후 재렌더링
            });

            // 아이템 클릭 로직 (폰트 적용, 모달 닫지 않음)
            fontClickArea.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.applySubtitleProperty) {
                    window.applySubtitleProperty('fontFamily', fontName);
                    if (propFontLabel) propFontLabel.textContent = fontName;
                    
                    // 선택된 항목 즉시 하이라이트
                    const allRows = listContainer.children;
                    for (let r of allRows) {
                        r.style.background = 'transparent';
                        r.style.borderLeft = '4px solid transparent';
                    }
                    row.style.background = '#e0f2fe';
                    row.style.borderLeft = '4px solid #00bcd4';

                    if (document.fonts) {
                        document.fonts.load(`10px "${fontName}"`).then(() => {
                            if (window.canvas) window.canvas.requestRenderAll();
                        });
                    }
                }
            });

            // 호버 효과 (폰트 선택 영역 호버 시에만 하이라이트 제공)
            fontClickArea.addEventListener('mouseenter', () => { 
                const currentFontObj = window.canvas ? window.canvas.getActiveObject() : null;
                const activeFont = currentFontObj ? currentFontObj.fontFamily : 'Pretendard';
                const currentIsS = (fontName === activeFont || (activeFont && activeFont.indexOf(fontName) === 0));
                if (!currentIsS) row.style.backgroundColor = '#f8fafc'; // Slate 50
            });
            fontClickArea.addEventListener('mouseleave', () => { 
                const currentFontObj = window.canvas ? window.canvas.getActiveObject() : null;
                const activeFont = currentFontObj ? currentFontObj.fontFamily : 'Pretendard';
                const currentIsS = (fontName === activeFont || (activeFont && activeFont.indexOf(fontName) === 0));
                if (!currentIsS) row.style.backgroundColor = 'transparent'; 
            });

            // 별 버튼 호버 효과
            starBtn.addEventListener('mouseenter', () => {
                starBtn.style.transform = 'scale(1.2)';
            });
            starBtn.addEventListener('mouseleave', () => {
                starBtn.style.transform = 'scale(1)';
            });

            row.appendChild(fontClickArea);
            row.appendChild(starBtn);
            listContainer.appendChild(row);
        });
    }
});