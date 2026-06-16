// ============================================================================
// 레트로 특수효과 1~100 — 미구현 슬롯 자동 등록 (프리셋 / 별칭 / 모션 / 필터 애니)
// ============================================================================
(function () {
    const names = window.retroFxNames || {};

    const FILTER_SLIDERS = [
        { id: 'brightness', label: '밝기 (-1 ~ 1)', min: -1, max: 1, step: 0.05, value: 0 },
        { id: 'contrast', label: '대비 (-1 ~ 1)', min: -1, max: 1, step: 0.05, value: 0 },
        { id: 'saturation', label: '채도', min: -1, max: 2, step: 0.1, value: 0 },
        { id: 'hue', label: '색조(Hue)', min: -2, max: 2, step: 0.1, value: 0 },
        { id: 'noise', label: '노이즈', min: 0, max: 500, step: 10, value: 0 },
        { id: 'pixelate', label: '픽셀화', min: 1, max: 50, step: 1, value: 1 },
        { id: 'blur', label: '블러', min: 0, max: 1, step: 0.05, value: 0 }
    ];

    function defaultFilterSettings(p) {
        return {
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
    }

    function slidersFromSettings(s) {
        return FILTER_SLIDERS.map((row) => ({ ...row, value: s[row.id] !== undefined ? s[row.id] : row.value }));
    }

    function getStaticPreset(id) {
        const presets = window.motionEditorStaticPresets || {};
        return presets[id] || presets[((id - 1) % 100) + 1] || { noise: 80, contrast: 0.1 };
    }

    function applyFilterPreset(obj, settings, id, preset, animTo) {
        obj.retroSettings = { activeFxId: id, effectStarted: false };
        obj.filterSettings = defaultFilterSettings(preset);
        const title = '🌊 ' + (names[id] || '특수 효과 ' + id);
        window.showFilterControls(title, slidersFromSettings(obj.filterSettings), (paramId, val) => {
            obj.filterSettings[paramId] = val;
            if (window.isRetroEffectStarted(obj)) window.renderFilters(obj);
        });

        if (animTo && obj.filterSettings) {
            window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
                window.renderFilters(o);
                o.activeTween = gsap.to(o.filterSettings, {
                    ...animTo,
                    duration: s.duration,
                    repeat: s.repeat,
                    yoyo: true,
                    ease: 'none',
                    onUpdate: () => {
                        if (typeof window.scheduleRetroCanvasRefresh === 'function') {
                            window.scheduleRetroCanvasRefresh(o, () => window.renderFilters(o));
                        } else {
                            window.renderFilters(o);
                        }
                    }
                });
            });
        } else {
            window.mountRetroEffectStartButton(obj, settings, id, () => {
                window.renderFilters(obj);
            });
        }
    }

    function saveBaseState(obj) {
        if (!obj.baseState) {
            obj.baseState = {
                left: obj.left,
                top: obj.top,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                angle: obj.angle,
                opacity: obj.opacity
            };
        }
    }

    function applyObjectMotion(obj, settings, id, tweenVars) {
        saveBaseState(obj);
        obj.retroSettings = { activeFxId: id, effectStarted: false };
        window.showFilterControls('🌊 ' + (names[id] || '모션 ' + id), [], () => {});
        obj.set(obj.baseState);
        window.mountRetroEffectStartButton(obj, settings, id, (o, s) => {
            o.set(o.baseState);
            o.activeTween = gsap.to(o, {
                ...tweenVars,
                duration: s.duration,
                repeat: s.repeat,
                yoyo: tweenVars.yoyo !== false,
                ease: tweenVars.ease || 'power1.inOut',
                onUpdate: () => window.canvas.renderAll()
            });
        });
    }

    function makeAliasHandler(targetId, defaults) {
        return function (obj, settings, id) {
            window.globalRetroMemory[id] = {
                ...(window.globalRetroMemory[targetId] || {}),
                ...(defaults || {}),
                ...(window.globalRetroMemory[id] || {})
            };
            const fn = window['applyRetroEffect' + targetId];
            if (typeof fn === 'function') fn(obj, settings, id);
        };
    }

    /** 기존 1~5, 31 구현에 연결되는 변형 */
    const ALIASES = {
        12: { t: 1, d: { amplitude: 42, frequency: 0.2, speed: 5 } },
        13: { t: 1, d: { amplitude: 14, frequency: 0.07, speed: 0.7 } },
        14: { t: 3 },
        15: { t: 3 },
        16: { t: 3 },
        17: { t: 3 },
        18: { t: 3 },
        19: { t: 3 },
        20: { t: 3 },
        91: { t: 5, d: { amount: 0.6, direction: 0 } },
        92: { t: 4 },
        93: { t: 1, d: { amplitude: 22, frequency: 0.09, speed: 2.5 } }
    };

    /** 필터 값 애니메이션 (21~30, 51~60 등) */
    const FILTER_ANIM = {
        21: { brightness: 0.45 },
        22: { hue: 0.8, saturation: 0.6 },
        23: { hue: 0.35, contrast: 0.25 },
        24: { contrast: 0.5, brightness: 0.2 },
        25: { brightness: 0.35, blur: 0.15 },
        26: { hue: 0.6, saturation: 0.8 },
        27: { brightness: 0.4, contrast: 0.3 },
        28: { noise: 220, contrast: 0.2 },
        29: { pixelate: 8, saturation: 0.5 },
        30: { saturation: -0.8, brightness: 0.15 },
        51: { pixelate: 12, noise: 120 },
        52: { noise: 280, contrast: 0.35 },
        53: { noise: 200, brightness: -0.1 },
        54: { noise: 250, hue: 0.08 },
        55: { blur: 0.12, brightness: 0.1 },
        56: { hue: 0.25, contrast: 0.3 },
        57: { pixelate: 6, noise: 90 },
        58: { pixelate: 10, noise: 150 },
        59: { hue: 0.4, blur: 0.08 },
        60: { contrast: 0.4, saturation: 0.6 },
        61: { noise: 180, blur: 0.05 },
        62: { blur: 0.2, brightness: 0.1 },
        63: { noise: 250, brightness: 0.2 },
        64: { contrast: 0.4, saturation: 0.5 },
        65: { noise: 160, blur: 0.1 },
        66: { blur: 0.08, brightness: 0.15 },
        67: { saturation: 0.4, hue: 0.1 },
        68: { brightness: 0.25, noise: 100 },
        69: { noise: 140, contrast: -0.1 },
        70: { blur: 0.12, brightness: 0.12 },
        72: { brightness: 0.6, contrast: 0.4 },
        88: { brightness: 0.5, contrast: 0.35 },
        95: { noise: 200, sepia: true },
        96: { noise: 100, contrast: 0.15 },
        97: { noise: 320, contrast: 0.2 },
        98: { brightness: 0.25, contrast: 0.3 }
    };

    /** 캔버스 객체 모션 (81~90, 96 일부) */
    const OBJECT_MOTION = {
        81: { left: '+=40', ease: 'sine.inOut' },
        82: { top: '+=35', ease: 'bounce.inOut' },
        83: { scaleX: 1.08, scaleY: 1.08, ease: 'sine.inOut' },
        84: { angle: '+=12', ease: 'none' },
        85: { opacity: 0.65, ease: 'power1.inOut' },
        86: { scaleX: 1.05, scaleY: 1.05, angle: '+=3', ease: 'sine.inOut' },
        87: { left: '+=8', top: '+=5', opacity: 0.75, ease: 'power1.inOut' },
        89: { skewX: 3, ease: 'sine.inOut' },
        90: { opacity: 0.4, ease: 'steps(2)' },
        96: { left: '+=6', top: '+=4', angle: '+=2', ease: 'sine.inOut' }
    };

    /** 정적 프리셋 번호 오버라이드 (없으면 id와 동일) */
    const PRESET_MAP = {
        32: 34, 33: 33, 34: 32, 35: 52, 36: 16, 37: 31, 38: 31,
        39: 52, 40: 62, 41: 38, 42: 42, 43: 100, 44: 1, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50,
        51: 38, 52: 44, 53: 28, 54: 2, 55: 55, 56: 23, 57: 8, 58: 58, 59: 57, 60: 58,
        71: 27, 73: 26, 74: 55, 75: 87, 76: 21, 77: 22, 78: 12, 79: 28, 80: 21, 94: 7, 98: 100, 99: 15, 100: 53
    };

    function applyCombo100(obj, settings, id) {
        const presets = window.motionEditorStaticPresets || {};
        const mix = {
            brightness: 0.05,
            contrast: 0.25,
            saturation: 0.2,
            hue: 0.1,
            noise: 120,
            pixelate: 2,
            blur: 0.05,
            ...(presets[53] || {})
        };
        applyFilterPreset(obj, settings, id, mix, { hue: 0.5, noise: 200, brightness: 0.2 });
    }

    const NATIVE_IMPLEMENTED = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 31]);

    for (let id = 1; id <= 100; id++) {
        const fnName = 'applyRetroEffect' + id;
        if (typeof window[fnName] === 'function') continue;
        if (NATIVE_IMPLEMENTED.has(id)) continue;

        if (id === 100) {
            window[fnName] = applyCombo100;
            continue;
        }

        if (ALIASES[id]) {
            const a = ALIASES[id];
            window[fnName] = makeAliasHandler(a.t, a.d);
            continue;
        }

        if (OBJECT_MOTION[id]) {
            window[fnName] = (obj, settings, fxId) => applyObjectMotion(obj, settings, fxId, OBJECT_MOTION[id]);
            continue;
        }

        const presetId = PRESET_MAP[id] || id;
        const anim = FILTER_ANIM[id];
        window[fnName] = (obj, settings, fxId) => {
            applyFilterPreset(obj, settings, fxId, getStaticPreset(presetId), anim);
        };
    }
})();
