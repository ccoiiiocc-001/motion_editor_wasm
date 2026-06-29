/**
 * scripts/obfuscate-dist.js
 *
 * dist_web/ 배포본에 대해:
 *  1. 불필요한 임시/백업 파일 제거
 *  2. dist_web/js/core.js 최상단에 도메인 잠금 코드 삽입
 *  3. dist_web 내 모든 JS 파일 강력 난독화
 *
 * 사용: node scripts/obfuscate-dist.js
 * ※ dist_web/ 파일만 수정. 원본 소스(js/, effect_editor/) 는 건드리지 않음.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// ──────────────────────────────────────────────
// 1. 경로 설정
// ──────────────────────────────────────────────
const ROOT      = path.join(__dirname, '..');
const DIST      = path.join(ROOT, 'dist_web');
const CORE_FILE = path.join(DIST, 'js', 'core.js');

// ──────────────────────────────────────────────
// 2. 도메인 잠금 코드 (난독화 전 삽입)
//    허용: granda.biz / *.granda.biz / yesbb.kr / *.yesbb.kr
//    개발: localhost / 127.0.0.1
// ──────────────────────────────────────────────
const DOMAIN_LOCK_CODE = `
(function(){
    var h = (typeof location !== 'undefined' ? location.hostname : '').toLowerCase().replace(/^www\\./, '');
    var ok = ['localhost', '127.0.0.1', 'granda.biz', 'yesbb.kr'];
    var sub = ['.granda.biz', '.yesbb.kr'];
    var pass = ok.indexOf(h) !== -1;
    if (!pass) {
        for (var i = 0; i < sub.length; i++) {
            if (h.length > sub[i].length && h.slice(-sub[i].length) === sub[i]) { pass = true; break; }
        }
    }
    if (!pass) {
        try { document.documentElement.innerHTML = ''; } catch(e){}
        try {
            document.open();
            document.write('<html><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;font-family:sans-serif;"><div style="color:#ef4444;font-size:20px;font-weight:bold;text-align:center;">' +
            atob('7ZeI6rCA65CY7KeAIOyViuydgCDrj4TrqZTsnbjsnoXri4jri6Qu') +
            '<br><span style="font-size:13px;color:#94a3b8;font-weight:normal;">Unauthorized Domain</span></div></body></html>');
            document.close();
        } catch(e) {}
        throw new Error('Domain not allowed');
    }
})();
`;

// ──────────────────────────────────────────────
// 3. 난독화 옵션 (강화)
// ──────────────────────────────────────────────
const OBFUSCATION_OPTIONS = {
    compact:                          true,
    controlFlowFlattening:            true,
    controlFlowFlatteningThreshold:   0.85,
    deadCodeInjection:                true,
    deadCodeInjectionThreshold:       0.3,
    debugProtection:                  true,
    debugProtectionInterval:          4000,
    disableConsoleOutput:             false,   // console.log 유지 (에러 진단용)
    identifierNamesGenerator:         'hexadecimal',
    numbersToExpressions:             true,
    renameGlobals:                    false,   // 전역 변수 rename 금지 (다른 파일 참조 깨짐 방지)
    selfDefending:                    true,
    simplify:                         true,
    splitStrings:                     true,
    splitStringsChunkLength:          10,
    stringArray:                      true,
    stringArrayCallsTransform:        true,
    stringArrayEncoding:              ['base64', 'rc4'],
    stringArrayIndexShift:            true,
    stringArrayRotate:                true,
    stringArrayShuffle:               true,
    stringArrayThreshold:             0.85,
    transformObjectKeys:              true,
    unicodeEscapeSequence:            false,   // base64 인코딩과 중복 방지
};

// ──────────────────────────────────────────────
// 4. 배포 불필요 파일 패턴 (삭제 대상)
// ──────────────────────────────────────────────
const REMOVE_PATTERNS = [
    /\.bak$/i,
    /\.bak_/i,
    /\.orig$/i,
    /\.rej$/i,
    /retrofx_base\.js$/i,
    /retrofx_fixed.*\.js$/i,
    /retrofx_restored\.js$/i,
    /retrofx_fixed2\.js$/i,
    /retrofx_fixed4\.js$/i,
    /retrofx_fixed7\.js$/i,
    /retrofx_fixed8\.js$/i,
];

// ──────────────────────────────────────────────
// 5. 난독화 제외 파일 (이미 min된 외부 라이브러리)
// ──────────────────────────────────────────────
const SKIP_PATTERNS = [
    /fabric\.min\.js$/i,
    /transformers\.min\.js$/i,
];

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────
function walkJs(dir, list = []) {
    if (!fs.existsSync(dir)) return list;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkJs(full, list);
        } else if (entry.name.endsWith('.js')) {
            list.push(full);
        }
    }
    return list;
}

function shouldRemove(filePath) {
    const base = path.basename(filePath);
    return REMOVE_PATTERNS.some(p => p.test(base));
}

function shouldSkip(filePath) {
    return SKIP_PATTERNS.some(p => p.test(filePath));
}

// ──────────────────────────────────────────────
// 메인
// ──────────────────────────────────────────────
(function main() {
    if (!fs.existsSync(DIST)) {
        console.error('[protect] ERROR: dist_web/ 가 없습니다. 먼저 deploy-dist.js 를 실행하세요.');
        process.exit(1);
    }

    // ── STEP 1: 불필요 파일 삭제 ──────────────────
    console.log('\n[protect] STEP 1: 임시/백업 파일 제거...');
    let removed = 0;
    const allFiles = walkJs(DIST);
    for (const f of allFiles) {
        if (shouldRemove(f)) {
            fs.rmSync(f);
            console.log('  [삭제]', path.relative(DIST, f));
            removed++;
        }
    }
    // .bak_* 확장자 포함 비-.js 파일도 제거
    function cleanNonJs(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) { cleanNonJs(full); }
            else if (!entry.name.endsWith('.js') && REMOVE_PATTERNS.some(p => p.test(entry.name))) {
                fs.rmSync(full);
                console.log('  [삭제]', path.relative(DIST, full));
                removed++;
            }
        }
    }
    cleanNonJs(DIST);
    console.log(`  → ${removed}개 파일 삭제 완료`);

    // ── STEP 2: 도메인 잠금 코드 삽입 ────────────
    console.log('\n[protect] STEP 2: 도메인 잠금 코드 삽입...');
    if (!fs.existsSync(CORE_FILE)) {
        console.error('[protect] ERROR: dist_web/js/core.js 가 없습니다.');
        process.exit(1);
    }
    const coreOriginal = fs.readFileSync(CORE_FILE, 'utf8');
    // 이미 삽입된 경우 중복 방지
    if (!coreOriginal.includes('Domain not allowed')) {
        fs.writeFileSync(CORE_FILE, DOMAIN_LOCK_CODE + '\n' + coreOriginal, 'utf8');
        console.log('  → dist_web/js/core.js 에 도메인 잠금 삽입 완료');
    } else {
        console.log('  → 이미 도메인 잠금이 적용되어 있습니다. 건너뜀.');
    }

    // ── STEP 3: JS 전체 난독화 ──────────────────
    console.log('\n[protect] STEP 3: JS 난독화 시작...');
    const jsFiles = walkJs(DIST).filter(f => !shouldRemove(f));
    let ok = 0, skip = 0, fail = 0;

    for (const file of jsFiles) {
        const rel = path.relative(DIST, file);
        if (shouldSkip(file)) {
            console.log(`  [skip] ${rel}`);
            skip++;
            continue;
        }
        try {
            const code = fs.readFileSync(file, 'utf8');
            const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
            fs.writeFileSync(file, result.getObfuscatedCode(), 'utf8');
            console.log(`  [done] ${rel}`);
            ok++;
        } catch (err) {
            console.error(`  [FAIL] ${rel}:`, err.message);
            fail++;
        }
    }

    console.log(`\n[protect] ✅ 완료!`);
    console.log(`  난독화: ${ok}개 | 건너뜀: ${skip}개 | 실패: ${fail}개`);
    if (fail > 0) console.warn('[protect] ⚠️  실패한 파일이 있습니다. 위 로그를 확인하세요.');
})();
