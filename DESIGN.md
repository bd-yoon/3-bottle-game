# three-bottle-game — DESIGN.md

> 최종 업데이트: 2026-03-07
> 담당: Designer Agent
> 게임 타입: Game WebView (Vite + Vanilla JS + Canvas)
> 적용 원칙: 토스 5대 원칙 (One Thing Per Page, Value First, Sleek Experience)
> 주의: Game 타입이므로 TDS 컴포넌트 불필요

---

## 0. 토스 Product Principle & 앱인토스 디자인 가이드

### 토스 5대 Product Principle — 이 게임에서의 적용

| 원칙 | 설명 | 이 게임 적용 사례 |
|------|------|-----------------|
| **One Thing Per Page** | 화면당 하나의 메시지/액션만 | TITLE(진입), PLAYING(게임), WIN(축하), LOSE(재도전), DAILY_LIMIT(종료) — 각 화면이 단 하나의 목적 |
| **Value First** | 이점 먼저, 정보 요청은 나중 | 튜토리얼 → 규칙 이해 후 첫 플레이. TITLE에서 즉시 "오늘 획득 포인트" 확인 가능 |
| **No Loading** | 대기 시간 제거 또는 숨기기 | Canvas 기반 즉시 렌더링. 상태 전환 시 대기 화면 없음 |
| **Tap & Scroll** | 세로 스크롤 + 탭만 사용 | 터치 → 이동 방향 (화면 어디서나). 스크롤 없는 단일 Canvas 화면 |
| **Sleek Experience** | 미묘한 애니메이션으로 세련된 느낌 | 파티클 이펙트(P1-A), 카운트업 애니메이션(P1-B), HUD 슬롯 pop 효과(P2-B) |

### 앱인토스 Game WebView 규칙

| 항목 | 규칙 | 준수 여부 |
|------|------|---------|
| TDS 컴포넌트 | Game 타입은 TDS 불필요, 자유 UI 허용 | ✅ Vanilla JS Canvas 사용 |
| 커스텀 네비게이션 바 | 금지 (토스 기본 네비 사용) | ✅ 없음 (전체 Canvas) |
| 토스 하단 탭 모방 | 금지 | ✅ 없음 |
| 이모지 아이콘 | 앱 UI에 이모지 아이콘 사용 금지 | ✅ 픽셀 아트 캐릭터 사용 |
| `granite.config.ts` | `type: 'game'`, `outdir: 'dist'` | ✅ 설정 완료 |
| AdMob 권한 | `permissions: ['admob']` 필수 | ✅ 설정 완료 |
| 앱 아이콘 | 600×600 정사각형, 모서리 클립 없음 | ☐ 생성 필요 |

### 구현 완료 현황

| 개선 항목 | 상태 | 커밋 |
|---------|------|------|
| P1-A: 사과 수집 파티클 이펙트 | ✅ 완료 | `10712d5` |
| P1-B: WIN 카운트업 + 별 파티클 | ✅ 완료 | `10712d5` |
| P2-A: DAILY_LIMIT KST 카운트다운 | ✅ 완료 | `10712d5` |
| P2-B: HUD 사과 슬롯 UI | ✅ 완료 | `10712d5` |
| P3: 튜토리얼 레벨 | ✅ 완료 | `10712d5` |

---

## 1. 화면 상태 머신

```
TITLE
  ↓ [사과 줍기 버튼]
PLAYING (레벨 1~3)
  ↓ 승리
WIN
  ↓ [다음 단계] or [수확 완료 (일일 한도)]
  ↓ 패배
LOSE
  ↓ [광고 보고 다시 도전] or [타이틀로]
  ↓ 일일 한도(9점) 달성 시
DAILY_LIMIT
  ↓ [확인]
TITLE
```

**포인트 시스템**
- 1승 = 3포인트, 일일 한도 9포인트 (3게임)
- `getTodayStage()` = `Math.min(Math.floor(getTodayEarned() / 3) + 1, 3)`
- `WITHDRAW_MIN = 9` — 출금 최소 조건

---

## 2. 화면별 설계

### 2-1. TITLE (타이틀)

**목적**: 게임 진입, 현재 누적 포인트 확인, 규칙 이해

**레이아웃 (캔버스 픽셀 아트)**
```
[게임 타이틀: "사과는 다 내꺼!"]
[현재 오늘 획득 포인트: X/9]
[게임 규칙 텍스트]
[사과 줍기 버튼: #2a6e3a 픽셀 아트 스타일]
```

**색상**
- 버튼: `#2a6e3a` (진한 녹색)
- 포인트: `#fcd34d` (황금색)

---

### 2-2. PLAYING (게임 플레이)

**목적**: 카피바라를 조종해 사과 3개를 먼저 베이스로 가져간다.

**레이아웃 (캔버스)**
```
[배경: 픽셀 아트 (하늘/구름/풀/나무)]
[HUD 상단: "사과 3개를 모아라!" + 진행도] ← 개선 항목
[플레이어 카피바라 + AI 캐릭터 2명]
[사과 아이템들]
[베이스 영역]
```

**캐릭터 색상**
- 카피바라(플레이어): `#f9a8d4` (핑크)
- 팬더(AI1): `#a5b4fc` (라벤더)
- 골댕이(AI2): `#fde68a` (옐로우)

---

### 2-3. WIN (승리)

**목적**: 승리 축하 + 포인트 획득 성취감 강조

**레이아웃 (캔버스 오버레이)**
```
[승리 메시지: "사과 수확 완료!"]
[획득 포인트: +3 카운트업 애니메이션] ← 개선 항목
[별 파티클 폭발 이펙트] ← 개선 항목
[다음 단계 버튼 or 수확 완료 버튼]
```

---

### 2-4. LOSE (패배)

**목적**: 패배 인정 + 광고 시청(보상형) 으로 재도전 기회 제공

**레이아웃 (캔버스 오버레이)**
```
[AI 승리 메시지]
[광고 보고 다시 도전 버튼] ← 수익화 핵심, 유지
[타이틀로 돌아가기 버튼]
```

---

### 2-5. DAILY_LIMIT (일일 한도 달성)

**목적**: 오늘 게임 종료 알림 + 내일 재방문 동기 제공

**레이아웃 (캔버스 오버레이)**
```
[축하 메시지: "오늘 수확 완료!"]
[오늘 기록: 9/9포인트]
[내일까지 카운트다운] ← 개선 항목
[출금하기 버튼] (미완성 → 준비 중 안내)
[확인 버튼]
```

---

## 3. 색상 팔레트

**배경 (픽셀 아트 C 객체)**
| 요소 | 색상 |
|------|------|
| 하늘 밝음 | `#5ec8ff` |
| 하늘 중간 | `#9dd9ff` |
| 구름 | `#f5faff` |
| 풀 밝음 | `#6bcc30` |
| 풀 중간 | `#50a020` |
| 풀 어두움 | `#3c7818` |
| 흙 밝음 | `#b07840` |

**UI 패널**
| 요소 | 색상 |
|------|------|
| 패널 배경 | `#0c1e10` |
| 패널 하이라이트 | `#1e3820` |
| HUD 텍스트 | `#70ffb0` |
| 포인트 | `#fcd34d` |

**버튼별 색상**
| 버튼 | 색상 |
|------|------|
| 사과 줍기 (타이틀) | `#2a6e3a` |
| 다음 단계 (WIN) | `#1a6a2e` |
| 광고 재도전 (LOSE) | `#a04810` |
| 수확 완료 (최종) | `#4a2a7a` |
| 출금하기 | `#1a4a7a` |

---

## 4. 개선 명세 (우선순위순)

### P1-A: 사과 수집/보관 시 픽셀 아트 파티클 이펙트

**목표**: 사과를 베이스에 가져갈 때 시각/청각적 피드백을 강화해 성취감을 높인다.

**적용 위치**: `three-bottle-game/game.js` (또는 메인 게임 파일) — 사과 베이스 충돌 처리 시점

**스펙 — 파티클**
```
트리거: 플레이어가 사과를 베이스에 전달하는 순간
파티클 수: 8~12개
색상: ['#ff4444', '#ff8888', '#ffcc00', '#ffffff'] (사과 빨강 + 하이라이트)
크기: 3~6px 사각형 (픽셀 아트 일관성)
물리: 중력 0.4, 수평 분산 ±3px/frame, 라이프타임 0.6~1.0s
위치: 플레이어 캐릭터 위치 기준
```

**스펙 — 사운드 강화**
```
현재: playScore() — 기본 비프음
개선: 사과 보관 시 상승 톤 3음 연속 (C4→E4→G4, 각 0.08s)
구현: Web Audio API oscillator, 기존 sound.js 패턴 확장
```

**캔버스 파티클 구현 패턴**
```javascript
// 기존 게임 루프에 통합
function spawnAppleParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 4 - 2,
      size: Math.random() * 3 + 3,
      color: APPLE_PARTICLE_COLORS[Math.floor(Math.random() * 4)],
      life: 1.0
    });
  }
}
// 게임 루프에서 particles 배열 업데이트 및 렌더링
```

**코드 참조**
- 메인 게임 파일: `three-bottle-game/` 내 canvas 기반 게임 루프
- 사운드: `playScore()` 함수 — 기존 Web Audio API 활용
- AI 캐릭터 관련: `AIPlayer` 클래스

---

### P1-B: WIN 화면 연출 강화 — 포인트 카운트업 + 별 파티클 폭발

**목표**: WIN 화면에서 포인트 획득이 시각적으로 강하게 전달되어 "다음 게임도 하고 싶다"는 동기를 강화한다.

**적용 위치**: 게임 WIN 상태 진입 시 캔버스 오버레이 렌더링

**스펙 — 포인트 카운트업**
```
시작값: 0
목표값: +3 (획득 포인트)
duration: 800ms
easing: ease-out (처음 빠르게 → 마지막 느리게)
텍스트 크기: 기존 1.5× 확대
색상: #fcd34d (황금색)
효과: 각 숫자 업데이트 시 scale 1.3 → 1.0 pop 애니메이션
```

**스펙 — 별 파티클**
```
파티클 수: 20개
모양: 픽셀 아트 4각형 (밝은 색 계열)
색상: ['#fcd34d', '#ffffff', '#70ffb0', '#5ec8ff']
발사 위치: 화면 중앙 (WIN 메시지 위치)
물리: 방사형 발사, 속도 3~8px/frame, 중력 0.2, 라이프타임 1.2~1.8s
트리거: WIN 화면 진입 후 0.3s delay
```

**구현 패턴**
```javascript
// WIN 상태 진입 시
function onWin() {
  setState('WIN');
  setTimeout(() => spawnWinParticles(canvas.width/2, canvas.height*0.4), 300);
  animatePointCountup(0, 3, 800);
}

function animatePointCountup(from, to, duration) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    currentDisplayPoints = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

**코드 참조**
- 현재 WIN 화면 렌더링: `drawWinScreen()` 또는 유사 함수
- 기존 `playClear()` 사운드와 타이밍 동기화

---

### P2-A: 일일 한도 달성 화면 — 카운트다운 + 기록 요약

**목표**: 9포인트 달성 후 빈 화면 대신 내일 재방문 동기를 명확히 제공한다.

**적용 위치**: DAILY_LIMIT 상태 캔버스 오버레이

**스펙**
```
화면 구성:
  [축하 헤더] "오늘의 수확 완료!"
  [기록 요약] "오늘 9포인트 획득"
  [카운트다운] "내일 00:00까지 HH:MM:SS"
  [출금 안내] "포인트는 출금 기능 오픈 시 사용 가능합니다" (현재 상태 솔직히 표시)
  [확인 버튼]

카운트다운 구현:
  KST 기준 다음 자정까지 남은 시간 계산
  const nextMidnight = new Date(...) // KST 자정
  const remaining = nextMidnight - Date.now();
  // HH:MM:SS 포맷으로 렌더링
  // setInterval 1초 업데이트
```

**색상**
- 헤더: `#fcd34d` (황금색)
- 카운트다운: `#70ffb0` (밝은 초록)
- 안내 텍스트: `#888` (회색)

**코드 참조**
- `WITHDRAW_MIN`, `getTotalPoints()` 함수 — 기존 포인트 계산 로직
- KST 오프셋: `Date.now() + 9 * 60 * 60 * 1000` (CLAUDE.md 공통 패턴)

---

### P2-B: 게임 중 실시간 진행도 HUD 강화

**목표**: 현재 사과 수집 현황을 HUD에 시각적으로 표시해 게임 중 목표 명확화 및 긴장감 부여.

**적용 위치**: PLAYING 상태 캔버스 — 매 프레임 HUD 렌더링

**현재 상태**: "사과 3개를 모아라!" 텍스트만 있음

**개선 스펙**
```
위치: 화면 상단 좌측 (HUD 영역)
표시 형식: 사과 아이콘 3개 (■ ■ ■) → 수집한 만큼 채워짐
  미수집: 빈 사각형 (border only, #6bcc30)
  수집: 채워진 사각형 (#ff4444 사과 빨강)

예시: 1개 수집 → [■ □ □], 2개 → [■ ■ □], 3개 → [■ ■ ■]

아이콘 크기: 16×16px (픽셀 아트)
위치: canvas 좌상단 (x:10, y:10)
애니메이션: 사과 수집 시 해당 슬롯 scale 1.4 → 1.0 pop (0.2s)
```

**구현 패턴**
```javascript
// 게임 루프 내 HUD 렌더링
function drawHUD(ctx, playerAppleCount) {
  for (let i = 0; i < 3; i++) {
    const filled = i < playerAppleCount;
    drawAppleIcon(ctx, 10 + i * 22, 10, filled);
  }
}
```

---

### P3: 튜토리얼 레벨 (레벨 0)

**목표**: 첫 방문 사용자에게 장애물 없는 연습 게임을 제공해 학습 곡선을 낮춘다.

**트리거**: `localStorage`에 `apple_game_tutorialDone` 없을 때 자동 실행

**스펙**
```
레벨 0 특성:
  - AI 없음 (또는 매우 느린 AI 1명)
  - 사과 3개 고정 배치 (이동 없음)
  - 화면에 "→ 베이스로 이동하세요!" 화살표 가이드
  - 클리어 후: "첫 수확 성공! 이제 실전입니다!" 메시지
  - 포인트 미지급 (연습용)

완료 처리:
  localStorage.setItem('apple_game_tutorialDone', '1')
  → 이후 방문 시 레벨 1부터 시작
```

**코드 참조**
- `getTodayStage()` — 레벨 결정 로직 참고
- `AIPlayer.getDifficultyParams(level)` — 레벨 0 파라미터 추가

---

## 5. 앱스토어 에셋 계획

| 에셋 | 크기 | 컨셉 |
|------|------|------|
| 로고 (라이트) | 600×600 | 초록 배경 + 픽셀 아트 카피바라 + 사과 |
| 로고 (다크) | 600×600 | 다크 초록 + 사과 픽셀 아트 빛남 |
| 썸네일 | 1000×1000 | 카피바라, 팬더, 골댕이 + "사과는 다 내꺼!" 타이틀 |
| 썸네일 와이드 | 1932×828 | 게임 플레이 스크린샷 파노라마 |
| 프리뷰 1 | 636×1048 | 타이틀 화면 |
| 프리뷰 2 | 636×1048 | 게임 중 (사과 수집 장면) |
| 프리뷰 3 | 636×1048 | WIN 화면 (포인트 획득 연출) |
| 프리뷰 4 | 636×1048 | 일일 한도 달성 화면 |

**생성 도구**: `three-bottle-game/tools/generate-assets.html`
**브랜드 색상**: `#2a6e3a` (진한 초록)

---

## 6. 미니앱 브랜딩 가이드 준수 체크리스트

- [x] 로고: 600×600 정사각형
- [x] 브랜드명 한글: "사과는 다 내꺼!"
- [x] 브랜드 색상 HEX: `#2a6e3a`
- [x] 커스텀 네비게이션 바 없음 (Game 타입은 자체 UI 허용)
- [x] TDS 미사용 (Game WebView 타입)
- [x] `granite.config.ts`: `type: 'game'`, `port: 4173`
- [x] AdMob 권한: `permissions: ['admob']`
- [x] 출금 기능: 미완성 상태 사용자에게 명확히 안내 (P2-A에서 처리)
