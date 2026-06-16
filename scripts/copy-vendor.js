/**
 * CDN 의존 파일을 vendor/ 로 복사 (postinstall)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vendorDir = path.join(root, 'vendor');
const transformersDir = path.join(vendorDir, 'transformers');
const fontsDir = path.join(vendorDir, 'fonts');

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn('[copy-vendor] missing:', src);
        return false;
    }
    fs.copyFileSync(src, dest);
    return true;
}

ensureDir(vendorDir);
ensureDir(transformersDir);
ensureDir(fontsDir);

copyFile(
    path.join(root, 'node_modules', 'fabric', 'dist', 'fabric.min.js'),
    path.join(vendorDir, 'fabric.min.js')
);
copyFile(
    path.join(root, 'node_modules', '@xenova', 'transformers', 'dist', 'transformers.min.js'),
    path.join(transformersDir, 'transformers.min.js')
);

const fontsUrl =
    'https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;800&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Noto+Sans+KR:wght@400;700;900&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&family=Dancing+Script:wght@400;700&family=Pacifico&family=Great+Vibes&family=Satisfy&display=swap';

(async () => {
    try {
        const res = await fetch(fontsUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (res.ok) {
            let css = await res.text();
            css =
                '/* 로컬 CSS — woff 파일은 fonts.gstatic.com 에서 로드 (완전 오프라인 시 폰트 파일 추가 필요) */\n' +
                css;
            fs.writeFileSync(path.join(fontsDir, 'editor-fonts.css'), css, 'utf8');
            console.log('[copy-vendor] fonts CSS saved');
        }
    } catch (e) {
        console.warn('[copy-vendor] fonts download skipped:', e.message);
        if (!fs.existsSync(path.join(fontsDir, 'editor-fonts.css'))) {
            fs.writeFileSync(
                path.join(fontsDir, 'editor-fonts.css'),
                '/* 오프라인: 시스템 폰트 사용 */\nbody{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;}\n',
                'utf8'
            );
        }
    }
    console.log('[copy-vendor] done');
})();
