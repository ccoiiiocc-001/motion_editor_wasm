// ── 상세페이지 모드 전용 레이어 및 필터 베이킹(Bake) 유틸리티 모듈 ──
(function initDetailBakeModule() {
    // Fabric.js 및 코어 모듈 로드 완료 후 실행을 위한 대기
    setTimeout(() => {
        const canvas = window.canvas;
        if (!canvas) return;

        // 레이어 순서 조절 단추 바인딩 (기존 index.html 내의 버튼들 활용)
        const bringFrontBtn = document.getElementById('bring-front-btn');
        const sendBackBtn = document.getElementById('send-back-btn');

        if (bringFrontBtn) {
            bringFrontBtn.addEventListener('click', function() {
                const activeObj = canvas.getActiveObject();
                if (activeObj) {
                    canvas.bringToFront(activeObj);
                    canvas.requestRenderAll();
                    showBakeToast('선택한 레이어를 맨 위로 올렸습니다.');
                } else {
                    alert('순서를 변경할 레이어를 선택하세요.');
                }
            });
        }

        if (sendBackBtn) {
            sendBackBtn.addEventListener('click', function() {
                const activeObj = canvas.getActiveObject();
                if (activeObj) {
                    canvas.sendToBack(activeObj);
                    canvas.requestRenderAll();
                    showBakeToast('선택한 레이어를 맨 아래로 내렸습니다.');
                } else {
                    alert('순서를 변경할 레이어를 선택하세요.');
                }
            });
        }

        // 특정 선택 이미지에 효과/필터를 구워 정적 이미지로 고정하는 함수
        window.bakeSelectedObjectEffect = function() {
            const activeObj = canvas.getActiveObject();
            if (!activeObj) {
                alert('효과를 고정할 이미지 레이어를 선택해 주세요.');
                return;
            }
            if (activeObj.type !== 'image') {
                alert('필터/효과 고정은 이미지 레이어에만 적용 가능합니다.');
                return;
            }

            if (typeof window.bakeEffectVisualToObject === 'function') {
                try {
                    window.bakeEffectVisualToObject(activeObj);
                    canvas.requestRenderAll();
                    showBakeToast('선택한 이미지 레이어의 필터/효과가 정적으로 고정(Bake)되었습니다.');
                } catch (err) {
                    console.error('Bake failed:', err);
                    alert('효과 고정 중 오류가 발생했습니다.');
                }
            } else {
                alert('코어 베이크 엔진(bakeEffectVisualToObject)을 찾을 수 없습니다.');
            }
        };

        // 토스트 알림창 표시 유틸리티
        function showBakeToast(msg) {
            let toast = document.getElementById('bake-toast-alert');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'bake-toast-alert';
                toast.style.position = 'fixed';
                toast.style.bottom = '80px';
                toast.style.left = '50%';
                toast.style.transform = 'translateX(-50%)';
                toast.style.backgroundColor = 'rgba(0, 188, 212, 0.9)';
                toast.style.color = '#000';
                toast.style.padding = '10px 20px';
                toast.style.borderRadius = '20px';
                toast.style.fontSize = '13px';
                toast.style.fontWeight = 'bold';
                toast.style.zIndex = '99999';
                toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                toast.style.transition = 'opacity 0.3s';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.opacity = '1';
            
            if (window.bakeToastTimer) clearTimeout(window.bakeToastTimer);
            window.bakeToastTimer = setTimeout(() => {
                toast.style.opacity = '0';
            }, 2500);
        }

        // 이미지 객체 선택 시 우측의 '현재상태 적용 (Bake)' 버튼을 조건부 활성화
        canvas.on('selection:created', (e) => {
            const obj = e.selected?.[0] || e.target;
            toggleBakeButtonState(obj);
        });
        canvas.on('selection:updated', (e) => {
            const obj = e.selected?.[0] || e.target;
            toggleBakeButtonState(obj);
        });
        canvas.on('selection:cleared', () => {
            const bakeBtn = document.getElementById('effect-state-bake-btn');
            if (bakeBtn) bakeBtn.style.display = 'none';
        });

        function toggleBakeButtonState(obj) {
            const bakeBtn = document.getElementById('effect-state-bake-btn');
            if (!bakeBtn) return;

            // 상세페이지 모드가 켜져있고 이미지 레이어가 선택되었을 때 베이크 단추를 표시
            const detailCheckbox = document.getElementById('detail-page-mode');
            const isDetail = detailCheckbox ? detailCheckbox.checked : false;

            if (isDetail && obj && obj.type === 'image') {
                bakeBtn.style.display = 'block';
                bakeBtn.textContent = '🎨 이 레이어 효과 고정 (Bake)';
                bakeBtn.title = '이 이미지 레이어에 적용된 필터/레트로 효과를 정적 픽셀 이미지로 고정시킵니다.';
                
                // 베이크 이벤트 연동 (중복 방지)
                if (!bakeBtn.dataset.wiredDetail) {
                    bakeBtn.dataset.wiredDetail = '1';
                    bakeBtn.addEventListener('click', function(evt) {
                        evt.stopPropagation();
                        window.bakeSelectedObjectEffect();
                    });
                }
            }
        }
    }, 800);
})();
