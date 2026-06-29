/**
 * scripts/deploy-dist.js
 *
 * dist_web/ 배포본 생성:
 *  - index.php 를 그대로 복사 (PHP 도메인 잠금 유지)
 *  - 모든 정적 에셋 복사
 *  - PHP 서버가 없어도 파일 구조는 동일하게 유지
 *
 * ※ index.php 의 PHP 도메인 잠금은 절대 제거/변환하지 않습니다.
 *    PHP 서버 환경에서 index.php 가 먼저 실행되어
 *    허가되지 않은 도메인에는 HTML/JS 자체를 전송하지 않습니다.
 *
 * 사용: node scripts/deploy-dist.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist_web');

// ──────────────────────────────────────────────
// 배포 대상 파일/디렉토리
// ──────────────────────────────────────────────
const COPY_DIRS = [
    'css',
    'js',
    'vendor',
    'build',
    'effect_editor/css',
    'effect_editor/js',
];

const COPY_FILES = [
    { src: 'index.php',              dest: 'index.php'              },
    { src: 'effect_editor/index.html', dest: 'effect_editor/index.html' },
    { src: '.htaccess',              dest: '.htaccess'              },
];

// effect_editor/js 에서 배포에 불필요한 임시 파일 패턴
const EXCLUDE_PATTERNS = [
    /\.bak$/i,
    /\.bak_/i,
    /\.orig$/i,
    /\.rej$/i,
    /retrofx_base\.js$/i,
    /retrofx_fixed.*\.js$/i,
    /retrofx_restored\.js$/i,
];

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────
function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

function shouldExclude(filename) {
    return EXCLUDE_PATTERNS.some(p => p.test(filename));
}

function copyDirSync(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn('[deploy] ⚠ 없는 디렉토리 건너뜀:', src);
        return 0;
    }
    ensureDir(dest);
    let count = 0;
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (shouldExclude(entry.name)) {
            console.log('[deploy]  (제외)', entry.name);
            continue;
        }
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            count += copyDirSync(s, d);
        } else {
            fs.copyFileSync(s, d);
            count++;
        }
    }
    return count;
}

function copyFileSync(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn('[deploy] ⚠ 없는 파일 건너뜀:', src);
        return;
    }
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

// ──────────────────────────────────────────────
// 메인
// ──────────────────────────────────────────────
(function main() {
    console.log('[deploy] dist_web/ 초기화...');

    // 1. dist_web 전체 삭제 후 재생성
    if (fs.existsSync(DIST)) {
        fs.rmSync(DIST, { recursive: true, force: true });
    }
    ensureDir(DIST);

    // 2. index.php 및 기타 단일 파일 복사
    console.log('\n[deploy] 파일 복사...');
    for (const { src, dest } of COPY_FILES) {
        copyFileSync(path.join(ROOT, src), path.join(DIST, dest));
        console.log(`[deploy]  ✓ ${src}`);
    }

    // 3. 디렉토리 복사
    console.log('\n[deploy] 디렉토리 복사...');
    let totalFiles = 0;
    for (const dir of COPY_DIRS) {
        const n = copyDirSync(path.join(ROOT, dir), path.join(DIST, dir));
        console.log(`[deploy]  ✓ ${dir}/  (${n}개)`);
        totalFiles += n;
    }

    // 4. 결과
    console.log('\n[deploy] ──────────────────────────────');
    console.log('[deploy] ✅ 배포 완료!');
    console.log(`[deploy]    총 ${totalFiles}개 파일 → ${DIST}`);
    console.log('[deploy]');
    console.log('[deploy] 다음 단계: node scripts/obfuscate-dist.js');
    console.log('[deploy] ──────────────────────────────');
})();
