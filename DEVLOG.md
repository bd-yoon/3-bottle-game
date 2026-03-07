# 사과는 다 내꺼! — 개발 로그

> **이 문서의 목적**: "사과는 다 내꺼!" 개발 전 과정을 기록.
> 앱인토스 패키징 및 다음 프로젝트 시 이 파일을 Claude에게 전달하면 컨텍스트 없이 바로 작업 재개 가능.
> 앱인토스 플랫폼 공통 사항은 `sowon-candle/DEVLOG.md`를 함께 참조.

---

## 목차

1. [프로젝트 정보](#1-프로젝트-정보)
2. [기술 스택 & 파일 구조](#2-기술-스택--파일-구조)
3. [게임 메커니즘](#3-게임-메커니즘)
4. [입력 시스템 — 터치 방향 이동](#4-입력-시스템--터치-방향-이동)
5. [사운드 시스템 (Web Audio API)](#5-사운드-시스템-web-audio-api)
6. [AI 난이도 시스템](#6-ai-난이도-시스템)
7. [앱스토어 에셋 생성기 (generate-assets.html)](#7-앱스토어-에셋-생성기-generate-assetshtml)
8. [배포 파이프라인](#8-배포-파이프라인)
9. [앱인토스 패키징 (미완료)](#9-앱인토스-패키징-미완료)
10. [개발 중 마주친 버그 & 해결책](#10-개발-중-마주친-버그--해결책)

---

## 1. 프로젝트 정보

| 항목 | 내용 |
|------|------|
| **게임 이름** | 사과는 다 내꺼! |
| **앱인토스 appName** | 미정 (콘솔에서 앱 생성 후 결정) |
| **GitHub** | `bd-yoon/3-bottle-game` |
| **Vercel** | 자동배포 연결됨 (URL은 Vercel 대시보드 확인) |
| **로컬 경로** | `~/Desktop/vibe-coding/three-bottle-game/` |
| **앱 타입** | 앱인토스 게임 (`appType: 'game'`) |

### 게임 한 줄 요약
3인 실시간 사과 수집 경쟁. 카피바라(플레이어)가 팬더·골댕이(AI) 2마리와 경쟁해 사과를 자기 진영으로 먼저 3개 모으면 승리.

---

## 2. 기술 스택 & 파일 구조

### 스택
| 항목 | 선택 | 이유 |
|------|------|------|
| 빌드 도구 | **Vite** (Vanilla JS) | 앱인토스 게임 권장 스택, 빠른 빌드 |
| 렌더링 | **HTML5 Canvas 2D** | 외부 게임 엔진 없이 경량 구현 |
| 입력 | **순수 Touch/Mouse 이벤트** | 초기 nippleJS → 화면 전체 터치 방향 이동으로 교체 |
| 사운드 | **Web Audio API** | 외부 파일·저작권 없음, 코드로 합성 |
| 광고 | **앱인토스 AdMob** | 패배 후 광고 시청 → 같은 레벨 재도전 |

### 파일 구조
```
three-bottle-game/
├── index.html                  # 캔버스 + 진입점
├── src/
│   ├── main.js                 # Game 인스턴스 생성 & start()
│   ├── game/
│   │   ├── Game.js             # 핵심 게임 루프, 상태 머신, 입력 처리
│   │   ├── Renderer.js         # 모든 화면 그리기 (Canvas 2D)
│   │   └── entities/
│   │       ├── Player.js       # 플레이어 이동, 픽업, 드롭 로직
│   │       ├── AIPlayer.js     # AI 행동 트리 + 난이도 파라미터
│   │       ├── Bottle.js       # 사과 상태 (ground / carried / scored)
│   │       └── Base.js         # 진영 베이스, 사과 수집 카운트
│   ├── input/
│   │   └── TouchInput.js       # 터치→방향 벡터 변환 (nippleJS 대체)
│   ├── audio/
│   │   └── SoundManager.js     # Web Audio API 사운드 합성 전체
│   └── lib/
│       └── adsInToss.js        # 앱인토스 AdMob 연동 (브라우저 Mock 포함)
├── tools/
│   └── generate-assets.html    # 앱스토어 이미지 에셋 생성기 (빌드 불필요)
├── granite.config.ts           # 앱인토스 빌드 설정 (appName 결정 후 작성)
└── DEVLOG.md                   # 이 파일
```

### 게임 상태 머신
```
TITLE ──[게임 시작]──▶ PLAYING ──[사과 3개 수집]──▶ WIN ──[다음 레벨]──▶ PLAYING
                           │                          │
                           │                         [처음부터]──▶ TITLE
                           │
                      [AI 먼저 3개]──▶ LOSE ──[광고 시청]──▶ PLAYING (같은 레벨)
                                           │
                                          [처음부터]──▶ TITLE
```

---

## 3. 게임 메커니즘

### 기본 규칙
- 플레이어 1 (카피바라) vs AI 2마리 (팬더, 골댕이)
- 맵 중앙에 사과 5개 배치 (원형 배치)
- 캐릭터가 사과에 닿으면 자동 픽업
- 자기 베이스에 닿으면 자동 드롭 (득점)
- **먼저 3개 모으는 팀이 승리**

### 좌표 시스템
- 3개 베이스가 정삼각형 꼭짓점 배치
- 플레이어 베이스: 화면 하단 중앙
- AI1 (팬더): 좌상단, AI2 (골댕이): 우상단

```js
const cx = w / 2
const cy = h * 0.42
const R = Math.min(w * 0.42, h * 0.27)
const SIN60 = Math.sin(Math.PI / 3)
const COS60 = 0.5

// 플레이어: 하단
pBx = cx,  pBy = cy + R
// AI1: 좌상단
a1Bx = cx - R * SIN60,  a1By = cy - R * COS60
// AI2: 우상단
a2Bx = cx + R * SIN60,  a2By = cy - R * COS60
```

### 레벨 영속성
- `localStorage['3bottle_level']`에 저장
- 게임 시작 시 이전 레벨 복원
- WIN → 레벨 +1, LOSE [처음부터] → 레벨 1 리셋

---

## 4. 입력 시스템 — 터치 방향 이동

### 설계 변경 이유
초기: **nippleJS 조이스틱** (화면 하단 40% 전용 영역)
→ 문제: 상단 터치 시 아무 반응 없어 첫 사용자가 조작법을 이해 못 함

변경: **화면 어디든 터치 → 그 방향으로 이동**

### TouchInput.js 구조
```js
// src/input/TouchInput.js
export class TouchInput {
  constructor() {
    this._x = null   // 현재 터치 X (canvas 좌표), null = 터치 없음
    this._y = null
  }

  setPos(x, y) { this._x = x; this._y = y }
  clear() { this._x = null; this._y = null }

  // 플레이어 위치 → 터치 방향 정규화 벡터 반환
  getDirection(px, py) {
    if (this._x === null) return { x: 0, y: 0 }
    const dx = this._x - px
    const dy = this._y - py
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 10) return { x: 0, y: 0 }  // 너무 가까우면 정지
    return { x: dx / dist, y: dy / dist }
  }
}
```

### Game.js 이벤트 처리 분기
```js
// 터치: PLAYING 중이면 이동, 아니면 버튼 클릭
canvas.addEventListener('touchstart', e => {
  e.preventDefault()
  this.sound.init()                        // AudioContext 활성화
  if (this._state === GAME_STATES.PLAYING)
    this.touchInput.setPos(...this._canvasPos(t.clientX, t.clientY))
}, { passive: false })

canvas.addEventListener('touchmove', e => {
  e.preventDefault()
  if (this._state === GAME_STATES.PLAYING)
    this.touchInput.setPos(...this._canvasPos(t.clientX, t.clientY))
}, { passive: false })

canvas.addEventListener('touchend', e => {
  e.preventDefault()
  if (this._state === GAME_STATES.PLAYING)
    this.touchInput.clear()               // 손 떼면 정지
  else
    this._handleClick(...)               // UI 상태에서는 버튼 클릭으로
}, { passive: false })
```

### _update()에서 방향 적용
```js
const dir = this.touchInput.getDirection(this.playerEntity.x, this.playerEntity.y)
this.playerEntity.vx = dir.x * SPEED
this.playerEntity.vy = dir.y * SPEED
```

### 데스크톱 마우스 지원 (테스트용)
```js
canvas.addEventListener('mousedown', e => {
  if (this._state === GAME_STATES.PLAYING) {
    this._mouseDown = true
    this.touchInput.setPos(...this._canvasPos(e.clientX, e.clientY))
  }
})
canvas.addEventListener('mousemove', e => {
  if (this._state === GAME_STATES.PLAYING && this._mouseDown)
    this.touchInput.setPos(...this._canvasPos(e.clientX, e.clientY))
})
canvas.addEventListener('mouseup', () => {
  this._mouseDown = false
  this.touchInput.clear()
})
```

---

## 5. 사운드 시스템 (Web Audio API)

> **핵심 원칙**: 외부 오디오 파일 없음 → 저작권 걱정 없음, 번들 크기 0 증가

### 구조 개요
```
SoundManager
├── _ctx        AudioContext (최초 사용자 제스처 후 생성)
├── _bgGain     BGM 볼륨 노드 (gain: 0.18)
├── _sfxGain    SFX 볼륨 노드 (gain: 0.5)
└── _bgNodes[]  스케줄된 oscillator 추적 배열 (stopBGM 시 즉시 중단)
```

### 효과음 목록
| 메서드 | 파형 | 설명 |
|--------|------|------|
| `playClick()` | square | 880→440Hz 하강 블립 70ms |
| `playScore()` | sine | G4→B4→D5 아르페지오 (G장조 맞춤) |
| `playGameOver()` | triangle | D5→B4→G4→E4 하강 + G3 슬라이드 (슬픈 호른) |
| `playClear()` | sawtooth+square | 5단계 팡파르 (트럼펫 콜 → 강조 → 후퇴 → 화음 클라이맥스 → 여운) |

### BGM 구조
- **BPM**: 168, **조성**: G장조, **총 길이**: 96비트 ≈ 34초 루프
- **섹션**: A(메인 테마) → B(브릿지) → C(테마 귀환) → D(아웃트로)
- **멜로디**: square 파형 (칩튠 느낌), gain 0.15
- **베이스**: triangle 파형, G/Em/C/D 코드 진행, gain 0.20
- **루프 방식**: setTimeout lookahead — 루프 종료 200ms 전에 다음 루프 예약

### BGM 루프 코드 패턴
```js
_scheduleBGM(startTime) {
  if (!this._bgActive || !this._ctx) return
  const loopDur = MELODY.reduce((s, [, b]) => s + b, 0) * BEAT

  this._scheduleSeq(MELODY, startTime, 'square',   0.15)
  this._scheduleSeq(BASS,   startTime, 'triangle', 0.20)

  // 루프 종료 200ms 전에 다음 루프 예약
  const msLeft = (startTime + loopDur - this._ctx.currentTime) * 1000 - 200
  this._bgTimer = setTimeout(() => {
    this._scheduleBGM(startTime + loopDur)
  }, Math.max(0, msLeft))
}
```

### ⚠️ BGM 중복 재생 버그 (중요 교훈)
- **증상**: 게임오버 후 재시작 시 이전 BGM + 새 BGM이 동시 재생
- **잘못된 해결**: `bgGain.gain = 0` → startBGM에서 복원 시 이전 oscillator가 되살아남
- **올바른 해결**: 모든 oscillator를 `_bgNodes[]`에 등록 → stopBGM 시 `osc.stop(now)` 호출

```js
stopBGM() {
  this._bgActive = false
  clearTimeout(this._bgTimer)
  const now = this._ctx ? this._ctx.currentTime : 0
  for (const osc of this._bgNodes) {
    try { osc.stop(now) } catch (_) {}
  }
  this._bgNodes = []
}
```

### ⚠️ Web Audio 저작권 주의
- 멜로디를 C장조로 시작했다가 슈퍼마리오 오버월드 테마 Bar 1과 동일한 것이 발각됨
  - 문제 패턴: `E E (쉼표) E (쉼표) C E` = 정확히 마리오 첫 소절
- **해결**: G장조로 전환, 완전히 다른 멜로디 프로파일 (다른 리듬, 다른 음정 도약)
- **교훈**: Web Audio로 작곡 시에도 잘 알려진 곡의 첫 소절을 그대로 쓰면 저작권 문제

---

## 6. AI 난이도 시스템

### 레벨별 파라미터 (AIPlayer.js)
```js
function getDifficultyParams(level) {
  return {
    speed: ...,           // 이동 속도
    reactionTime: ...,    // 목표 변경 주기 (ms)
    mistakeRate: ...,     // 실수 확률 (0~1)
    stealRate: ...,       // 상대 진영 사과 뺏기 확률
  }
}
```

### 레벨 구조
- **L1~L6**: 온보딩 단계. AI가 느리고 실수를 많이 함
- **L7+**: 본격 난이도. AI 속도 증가, 실수율 감소, 사과 뺏기 전략 활성화
- 플레이어 속도(SPEED = 240px/s)는 모든 레벨에서 고정 — AI 속도만 변경

### AI 행동 트리
1. 사과를 들고 있으면 → 자기 베이스로 이동
2. 사과가 없으면 → 가장 가까운 사과(또는 stealRate 확률로 상대 진영 사과)를 타겟으로 이동
3. reactionTime 주기로 목표 재계산

---

## 7. 앱스토어 에셋 생성기 (generate-assets.html)

> **다른 프로젝트에서 재활용 가능한 패턴. 이 섹션을 Claude에게 참조시키면 됨.**

### 개념

빌드 도구 없이 **브라우저에서 바로 실행**되는 단일 HTML 파일.
Canvas 2D API로 앱스토어 규격 PNG를 픽셀 단위로 그리고 다운로드.

- npm/webpack 불필요
- 인터넷 불필요 (완전 오프라인 동작)
- 다크모드/라이트모드 변형 지원
- 각 에셋 개별 다운로드 + 전체 일괄 다운로드 버튼

### 생성하는 에셋 (앱인토스 규격)
| 파일명 | 크기 | 용도 |
|--------|------|------|
| `logo_600x600.png` | 600×600 | 앱 아이콘 (라이트) |
| `logo_dark_600x600.png` | 600×600 | 앱 아이콘 (다크모드) |
| `thumbnail_1000x1000.png` | 1000×1000 | 정방형 썸네일 |
| `thumbnail_1932x828.png` | 1932×828 | 가로형 썸네일 |
| `preview_title_636x1048.png` | 636×1048 | 미리보기 1: 타이틀 |
| `preview_gameplay_636x1048.png` | 636×1048 | 미리보기 2: 게임플레이 |
| `preview_clear_636x1048.png` | 636×1048 | 미리보기 3: 클리어 |
| `preview_landscape_1504x741.png` | 1504×741 | 미리보기 가로형 |

### 사용법
1. `tools/generate-assets.html`을 브라우저에서 직접 열기 (파일 더블클릭 또는 `open` 명령)
2. 8개 캔버스가 자동 렌더링됨
3. 개별 다운로드: 각 카드의 [⬇ 다운로드] 버튼
4. 전체 다운로드: 상단 [⬇ 전체 다운로드] 버튼 (400ms 간격 순차 저장)

### 핵심 구조 (재활용 템플릿)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>{게임명} — Asset Generator</title>
  <style>
    /* 다크 배경, 카드 그리드 레이아웃 */
    body { background: #1a1a2e; color: #eee; padding: 24px; }
    .grid { display: flex; flex-wrap: wrap; gap: 28px; }
    .card { background: #16213e; border-radius: 12px; padding: 16px; ... }
    canvas { image-rendering: pixelated; max-width: 300px; ... }
  </style>
</head>
<body>
<button id="downloadAll">⬇ 전체 다운로드</button>
<div class="grid" id="grid"></div>
<script>
// ① 색상 팔레트 (게임 팔레트와 동일하게)
const C = { sky: '#87ceeb', grass: '#5a9e3a', ... }

// ② 공통 드로잉 함수들 (게임 캐릭터, 배경, UI 요소)
function drawBackground(ctx, W, H) { ... }
function drawCharacter(ctx, cx, cy, r) { ... }

// ③ 에셋 정의 배열
const ASSETS = [
  {
    id: 'logo',
    label: '앱 로고 (라이트)',
    filename: 'logo_600x600.png',
    w: 600, h: 600,
    draw(ctx, W, H) {
      // Canvas 2D API로 원하는 그림 작성
    }
  },
  // ... 나머지 에셋들
]

// ④ 카드 자동 생성 + 다운로드 버튼 연결
ASSETS.forEach(asset => {
  const canvas = document.createElement('canvas')
  canvas.width = asset.w; canvas.height = asset.h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false   // 픽셀아트 선명하게
  asset.draw(ctx, asset.w, asset.h)
  // ... 카드 DOM 생성
})

// ⑤ 다운로드 함수
function downloadCanvas(canvas, filename) {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = filename
  a.click()
}
</script>
</body>
</html>
```

### 핵심 Canvas 2D 드로잉 기법

**픽셀아트 스타일**
```js
ctx.imageSmoothingEnabled = false  // 필수: 안티앨리어싱 비활성화

// 픽셀 단위 fillRect으로 모든 도형 표현
function fillPx(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}
```

**해상도 독립적 크기 계산**
```js
// 고정 px 대신 W/H 비율로 계산 → 모든 크기에서 동일한 비율
const p = Math.max(2, Math.round(W / 80))  // 픽셀 단위 크기 (최소 2px 보장)
drawTree(ctx, W * 0.12, H * 0.72, W * 0.04)  // 모든 좌표를 비율로
```

**둥근 사각형 (roundRect)**
```js
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
// 사용: roundRect2(ctx, x, y, w, h, r); ctx.fill() 또는 ctx.clip()
```

**그라디언트 배경**
```js
const g = ctx.createLinearGradient(0, 0, W, H)
g.addColorStop(0, '#2d6a4f')
g.addColorStop(1, '#1b4332')
ctx.fillStyle = g
ctx.fillRect(0, 0, W, H)
```

**텍스트 그림자**
```js
ctx.shadowColor = '#00000088'
ctx.shadowBlur = 6
ctx.shadowOffsetY = 3
ctx.fillText('제목', W / 2, H * 0.3)
ctx.shadowBlur = 0; ctx.shadowOffsetY = 0  // 반드시 리셋
```

**라운드 코너 클립 (앱 아이콘)**
```js
// 아이콘은 둥근 모서리가 필요 → clip() 활용
roundRect(ctx, 0, 0, W, H, 80)
ctx.clip()
ctx.fillStyle = gradient
ctx.fillRect(0, 0, W, H)  // 클립 영역 안에만 그려짐
```

### 다른 프로젝트에서 사용 시 체크리스트
- [ ] 게임 팔레트 색상을 `const C = {...}` 에 정의
- [ ] 게임 캐릭터 드로잉 함수 추가 (픽셀아트 스타일 권장)
- [ ] `ASSETS` 배열에 앱인토스 규격에 맞는 크기 입력
  - 앱 아이콘: 600×600 (라이트), 600×600 (다크)
  - 썸네일: 1000×1000 (정방형), 1932×828 (가로형)
  - 미리보기 세로: 636×1048 × 3장 이상
  - 미리보기 가로: 1504×741 × 1장 이상
- [ ] 각 에셋의 `draw(ctx, W, H)` 함수 내에서 해당 화면 장면 재현
- [ ] 파일명은 한눈에 알아볼 수 있게 (`logo_600x600.png` 형식)
- [ ] `tools/generate-assets.html`로 저장 (소스코드와 분리)

---

## 8. 배포 파이프라인

### 현재 구성
```
로컬 수정
    ↓
git add ... && git commit -m "..." && git push
    ↓
GitHub (bd-yoon/3-bottle-game) main 브랜치
    ↓
Vercel 자동 감지 → Vite 빌드 → 배포 (약 1-2분)
    ↓
Vercel URL 업데이트
```

### Vite 관련 설정
- `index.html` + `src/main.js` → Vite가 자동으로 엔트리 감지
- 빌드 출력: `dist/` (앱인토스 game 타입 기본값과 일치)
- nippleJS 제거 후 외부 의존성: 사실상 Vite만 남음 (자체 Web Audio API 사용)

---

## 9. 앱인토스 패키징 (미완료)

> 아래 작업이 남아 있음. 순서대로 진행.

### 남은 작업
1. **앱인토스 콘솔에서 앱 생성** → 영문 appName 확정
2. **granite.config.ts 작성** (게임 타입)
   ```typescript
   import { defineConfig } from '@apps-in-toss/web-framework/config'

   export default defineConfig({
     appName: '{결정된 appName}',
     brand: {
       displayName: '사과는 다 내꺼!',
       primaryColor: '#2a6e3a',
       icon: '',  // 콘솔 아이콘 업로드 후 URL 입력
     },
     web: {
       host: 'localhost',
       port: 5173,
       commands: {
         dev: 'vite',
         build: 'vite build',
       },
     },
     // outdir 기본값이 'dist'이므로 생략 가능
     webViewProps: {
       type: 'game',
       mediaPlaybackRequiresUserAction: false,
     },
     permissions: [],
   })
   ```
3. **package.json에 granite:build 추가**
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "granite:build": "granite build"
   }
   ```
4. **npm run granite:build** → `{appName}.ait` 생성 확인
5. **AdMob 연동**: 개인사업자 등록 승인 후
   - `src/lib/adsInToss.js`의 테스트 ID → 실제 AdMob Unit ID 교체
6. **콘솔에서 .ait 업로드 & 심사 신청**

### 게임 타입 심사 체크리스트
- [ ] `appType: 'game'`, `webViewProps.type: 'game'` 설정
- [ ] 앱 아이콘 업로드 완료 (generate-assets.html로 생성)
- [ ] granite build 성공, .ait 파일 생성 확인
- [ ] 샌드박스 앱에서 실기기 동작 확인

---

## 10. 개발 중 마주친 버그 & 해결책

### 🐛 BGM 중복 재생 (가장 까다로운 버그)
- **증상**: 게임오버 → 처음부터 재시작 시 BGM 두 개가 겹쳐 재생
- **1차 시도 (실패)**: `stopBGM()`에서 `bgGain.gain = 0`, `startBGM()`에서 복원
  - 실패 이유: gain을 복원하면 Web Audio 타임라인에 살아있던 oscillator들이 되살아남
- **올바른 해결**: oscillator를 `_bgNodes[]`로 추적 → `stopBGM()` 시 `osc.stop(now)` 강제 중단
- **교훈**: Web Audio API에서 BGM을 "끄는" 유일한 완전한 방법은 `osc.stop()` 호출

### 🐛 BGM이 슈퍼마리오 오버월드 테마와 동일
- **증상**: 첫 멜로디 Bar 1이 마리오 시작음 `E E E (쉼표) C E`와 정확히 일치
- **해결**: C장조 → G장조 전환 + 완전히 다른 멜로디 구성
- **교훈**: Web Audio API로 작곡해도 저작권 있는 멜로디 도용은 동일하게 문제

### 🐛 타이틀 텍스트 박스 삐져나옴
- **증상**: "우다다! 사과는 다 내꺼!" 제목이 캔버스 경계를 넘어감
- **해결**: 폰트 크기가 `w * 0.10` 기준인데 제목이 너무 길어서 발생
  - "우다다! 사과는 다 내꺼!" → "사과는 다 내꺼!"로 단축
- **교훈**: Canvas fillText는 자동 줄바꿈 없음. 텍스트 길이 × 폰트 크기를 실측 필요

### 🐛 조이스틱 상단 터치 무반응 (UX 문제)
- **증상**: nippleJS 조이스틱이 하단 40% 영역에만 활성화 → 상단 터치 시 아무 반응 없음
- **해결**: nippleJS 제거 → 화면 어디든 터치하면 그 방향으로 이동 (TouchInput.js)
- **교훈**: 첫 사용자가 UI를 탐색할 때 화면 전체에서 반응이 있어야 직관적

### 🐛 canvas.addEventListener('click')이 touch 후 두 번 발생
- **증상**: 모바일에서 버튼 터치 시 이벤트가 두 번 처리될 수 있음
- **해결**: `touchend` 핸들러에서 `e.preventDefault()` 호출 → 브라우저가 생성하는 synthetic click 억제
- **교훈**: touch + click 둘 다 듣는 경우, touchend에서 반드시 preventDefault()

---

## 참고 링크

| 링크 | 설명 |
|------|------|
| https://github.com/bd-yoon/3-bottle-game | 소스코드 |
| https://console-apps-in-toss.toss.im/ | 앱인토스 콘솔 |
| https://developers-apps-in-toss.toss.im/ | 앱인토스 개발자 문서 |
| `sowon-candle/DEVLOG.md` | 앱인토스 공통 설정 (계정, TDS, granite, 광고) |

---

## 디자인 개선 결정사항 (2026-03-07)

> `DESIGN.md` 신규 작성 완료. 아래는 핵심 결정 이유 기록.

### 개선 방향 원칙
- 패배 시 광고 구조 변경 없음 (수익화 유지)
- 성취감 이펙트 강화 (사과 수집/WIN 화면) + 재방문 유도 (일일 한도 화면) 집중

### P1-A: 사과 수집 시 픽셀 아트 파티클
- **결정**: 캔버스 파티클 시스템 추가, 사과 빨강 계열 색상, 베이스 전달 시 트리거
- **이유**: 사과를 수집해도 시각/청각 피드백이 없어 성취감 낮음
- **구현 키포인트**: 게임 루프에 `particles[]` 배열 추가, 기존 `playScore()` 와 동기화

### P1-B: WIN 화면 포인트 카운트업 + 별 파티클
- **결정**: ease-out cubic 카운트업 800ms + 방사형 픽셀 파티클 20개
- **이유**: 현재 WIN 화면은 정적 텍스트만 — 포인트 획득의 중요성이 시각적으로 전달 안 됨
- **구현 키포인트**: `requestAnimationFrame` 기반 카운트업, `spawnWinParticles()` 함수 추가

### P2-A: 일일 한도 달성 화면 카운트다운
- **결정**: KST 자정까지 남은 시간 HH:MM:SS + 오늘 기록 요약
- **이유**: 9포인트 달성 후 빈 화면은 재방문 동기 없음 → 내일 다시 오는 이유 제공
- **구현 키포인트**: `Date.now() + 9*60*60*1000` KST 오프셋, `setInterval` 1초 업데이트

### P2-B: HUD 사과 진행도 표시
- **결정**: 상단 좌측에 사과 아이콘 슬롯 3개 (수집 수량만큼 채움)
- **이유**: 현재 "3개를 모아라!" 텍스트만 — 지금 몇 개 가졌는지 게임 중 확인 불가

### P3: 튜토리얼 레벨 (레벨 0)
- **결정**: 첫 방문 시 자동 실행, AI 없음, 포인트 미지급, `localStorage` 완료 기록
- **이유**: 레벨 1 첫 시작 시 규칙 이해 전 AI에게 패배하는 경우 이탈 리스크

---

## 11. UX/UI 개선 구현 완료 (2026-03-07)

**커밋**: `10712d5` — "UX/UI 개선: 파티클 이펙트, 카운트업, 카운트다운, HUD 슬롯, 튜토리얼"

**수정 파일**
- `src/game/Game.js` — 파티클 시스템, WIN 이펙트, 카운트다운 로직, HUD pop 타이머, 튜토리얼 플래그
- `src/game/Renderer.js` — `drawParticles()` 메서드, WIN 카운트업 파라미터, DAILY_LIMIT 카운트다운 표시, HUD 슬롯 UI, 튜토리얼 힌트 텍스트

### P1-A 구현: 사과 수집 파티클 이펙트
- `Game.js`: `this._particles = []` 배열 + `_emitAppleParticles(base)` 메서드
- 트리거: 플레이어가 베이스에 사과 전달 시 8~12개 파티클 방사
- 색상: `['#ff4444','#ff8888','#ffcc00','#ffffff']`
- `Renderer.js`: `drawParticles(particles)` 메서드 — Canvas 픽셀 사각형 렌더링

### P1-B 구현: WIN 화면 포인트 카운트업 + 별 파티클
- `Game.js`: `_winParticles[]`, `_winCountupTarget`, `_winCountupStart` 상태 추가
- `_initWinEffect(earned)`: 20개 방사형 황금 파티클 생성
- `_getWinDisplay()`: ease-out cubic 보간 (800ms) 카운트업 값 계산
- `Renderer.js`: `drawWin()` 함수에 `displayEarned` 파라미터 추가해 카운트업 숫자 렌더링

### P2-A 구현: 일일 한도 KST 카운트다운
- `Game.js`: `_getCountdownStr()` — `Date.now() + 9*60*60*1000` KST 오프셋 기준 자정까지 HH:MM:SS 계산
- `Renderer.js`: `drawDailyLimit()` 함수에 `countdownStr`, `todayEarned` 파라미터 추가

### P2-B 구현: HUD 사과 슬롯 UI
- `Renderer.js`: `_drawHUD()` — 텍스트 대신 14px 픽셀 사각형 슬롯 3개로 교체
- 수집 슬롯: 빨간 채움 + `_hudPopTimer` 기반 pop 플래시 효과
- 미수집 슬롯: 어두운 테두리 사각형

### P3 구현: 튜토리얼 레벨
- `Game.js`: `this._isTutorial = !localStorage.getItem('3bottle_tutorial_done')` — 영구 1회 플래그
- 튜토리얼 조건: `_update()` 내 AI 이동 스킵, 포인트 미지급
- WIN 처리: `_tutorialJustWon = true` 설정 → "연습 완료!" 전용 화면 표시
- 완료: `localStorage.setItem('3bottle_tutorial_done', '1')` 저장 → 이후 레벨 1부터 시작
- `Renderer.js`: 튜토리얼 WIN 화면 분기 + TITLE 화면 힌트 텍스트 표시
