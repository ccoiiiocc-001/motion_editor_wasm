# Motion Editor — Windows 데스크톱

## 실행 (개발)

```bash
npm install
npm start
```

`npm install` 시 `vendor/` 에 Fabric·Transformers·폰트 CSS가 복사됩니다.

## Windows 설치 파일 빌드

```bash
npm run dist
```

결과: `release/` 폴더 (NSIS 설치 프로그램)

## 브라우저에서만 실행

`index.html`을 로컬 서버로 열거나, Chrome에서 폴더를 연다.  
Electron 없이도 동작하지만 프로젝트 폴더 저장은 Chrome File System Access API가 필요합니다.

## CDN 로컬화

| 이전 | 이후 |
|------|------|
| cdnjs fabric.js | `vendor/fabric.min.js` |
| jsdelivr @xenova/transformers | `vendor/transformers/transformers.min.js` |
| fonts.googleapis.com | `vendor/fonts/editor-fonts.css` (woff는 gstatic, 완전 오프라인 시 폰트 파일 추가) |

## 소스 보호 (질문 답)

설치 후 `resources/app.asar` 안에 HTML/JS가 들어갑니다.  
**완전히 복사·수정 불가**하게 만드는 것은 웹/Electron 앱에서는 불가능에 가깝고, 할 수 있는 것은 **난이도 상승**뿐입니다.

- `asar` 패키징 (기본)
- 난독화 (javascript-obfuscator 등)
- 핵심 로직만 Native addon (C++/Rust)
- 라이선스·온라인 인증

진짜 비즈니스 로직 보호가 필요하면 서버 API로 옮기는 방식이 일반적입니다.
