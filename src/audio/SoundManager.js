// src/audio/SoundManager.js
// Web Audio API 기반 사운드 합성 — 외부 파일 불필요, 저작권 없음

const BPM  = 168
const BEAT = 60 / BPM  // ≈ 0.357s per quarter note

// ── 배경음 멜로디 시퀀스 [Hz, beats] ──────────────────────────────────────────
// 96비트 루프 (≈34s), G장조 오리지널 칩튠
// 구조: Section A(8bar) → B(8bar) → C(4bar) → D(4bar)
// 0 = 쉼표
//
// ※ 저작권 관련: 이 멜로디는 특정 기존 곡과 유사하지 않은 오리지널 작곡입니다.
//    G장조 + 독자적인 리듬/음정 구성으로 Copyright 이슈 없음.
const MELODY = [
  // ── Section A: 메인 테마 (bars 1~8, 32beats) ─────────────────────────────
  // Bar 1 — 상승 아르페지오로 시작
  [392,.5],[494,.5],[587,.5],[659,.5],[784,2],
  // Bar 2 — 거울 하강
  [784,.5],[659,.5],[587,.5],[494,.5],[392,2],
  // Bar 3 — 도약 후 계단 하강
  [392,.5],[0,.5],[784,1],[659,.5],[587,.5],[494,.5],[392,.5],
  // Bar 4 — 여운
  [587,3],[0,1],
  // Bar 5 — 스텝 상승 + 도약
  [659,1],[784,1],[659,.5],[587,.5],[494,1],
  // Bar 6 — 물결 패턴
  [587,.5],[659,.5],[587,.5],[494,.5],[440,1],[392,1],
  // Bar 7 — 계단 상승 빌드
  [440,.5],[494,.5],[523,.5],[587,.5],[659,.5],[784,.5],[0,1],
  // Bar 8 — 섹션 해결
  [784,2],[392,2],

  // ── Section B: 브릿지 (bars 9~16, 32beats) ───────────────────────────────
  // Bar 9 — 새로운 리듬 feel
  [494,.5],[587,.5],[659,1],[784,.5],[659,.5],[587,1],
  // Bar 10 — 점프 패턴
  [392,.5],[0,.5],[659,1],[523,.5],[587,.5],[494,1],
  // Bar 11 — 고음 전개
  [784,.5],[880,.5],[784,1],[659,.5],[784,.5],[523,1],
  // Bar 12 — 숨 고르기
  [440,2],[0,2],
  // Bar 13 — 달리는 8분음표 상승
  [392,.5],[440,.5],[494,.5],[523,.5],[587,.5],[659,.5],[784,.5],[880,.5],
  // Bar 14 — 응답 선율
  [880,.5],[784,.5],[880,1],[784,.5],[659,.5],[587,.5],[494,.5],
  // Bar 15 — 클라이맥스 빌드업
  [587,.5],[659,.5],[784,.5],[880,.5],[784,.5],[659,.5],[784,.5],[880,.5],
  // Bar 16 — 클라이맥스 해소
  [784,1],[880,1],[784,1],[0,1],

  // ── Section C: 테마 귀환 (bars 17~20, 16beats) ───────────────────────────
  // Bar 17 — bar 1 재현
  [392,.5],[494,.5],[587,.5],[659,.5],[784,2],
  // Bar 18 — 변형 하강
  [784,.5],[659,.5],[587,.5],[494,.5],[440,1],[392,1],
  // Bar 19 — 흘러내리기
  [784,.5],[659,.5],[587,.5],[494,.5],[440,.5],[392,.5],[330,.5],[294,.5],
  // Bar 20 — 섹션 종결
  [392,3],[0,1],

  // ── Section D: 아웃트로 (bars 21~24, 16beats) ────────────────────────────
  // Bar 21 — 상승 선율
  [784,.5],[659,.5],[784,1],[880,.5],[784,.5],[659,.5],[523,.5],
  // Bar 22 — 하강 후 고음 도달
  [659,.5],[523,.5],[440,.5],[494,.5],[587,.5],[784,.5],[880,1],
  // Bar 23 — 물결 패턴
  [784,.5],[659,.5],[784,.5],[659,.5],[587,.5],[659,.5],[587,.5],[494,.5],
  // Bar 24 — 최종 해결
  [392,4],
]

// ── 베이스 시퀀스 [Hz, beats] ─────────────────────────────────────────────────
// triangle 파형, G장조 코드 진행 (G/Em/C/D), 96비트
const BASS = [
  // Section A (32 beats)
  // Bar 1-2: G
  [98,1],[98,1],[98,1],[147,1],
  [98,1],[98,1],[147,1],[123,1],
  // Bar 3: G
  [98,1],[98,1],[98,1],[98,1],
  // Bar 4: Em
  [165,1],[165,1],[165,1],[165,1],
  // Bar 5: C
  [131,1],[131,1],[131,1],[131,1],
  // Bar 6: Am
  [110,1],[110,1],[165,1],[165,1],
  // Bar 7: D
  [147,1],[147,1],[147,1],[147,1],
  // Bar 8: G
  [98,2],[98,2],

  // Section B (32 beats)
  // Bar 9: Em
  [165,2],[165,2],
  // Bar 10: Em→D→C→D
  [165,1],[147,1],[131,1],[147,1],
  // Bar 11: G
  [98,1],[98,1],[98,1],[196,1],
  // Bar 12: G
  [98,2],[0,2],
  // Bar 13: C
  [131,1],[131,1],[131,1],[131,1],
  // Bar 14: C→D
  [131,1],[131,1],[147,1],[147,1],
  // Bar 15: D
  [147,1],[147,1],[147,1],[147,1],
  // Bar 16: G
  [98,4],

  // Section C (16 beats)
  // Bar 17: G
  [98,1],[98,1],[98,1],[147,1],
  // Bar 18: G
  [98,1],[98,1],[147,1],[123,1],
  // Bar 19: C
  [131,1],[131,1],[110,1],[110,1],
  // Bar 20: G
  [98,2],[98,2],

  // Section D (16 beats)
  // Bar 21: G
  [98,1],[98,1],[98,1],[98,1],
  // Bar 22: G→D
  [98,1],[98,1],[196,1],[196,1],
  // Bar 23: D
  [196,1],[196,1],[196,1],[147,1],
  // Bar 24: G
  [98,4],
]

export class SoundManager {
  constructor() {
    this._ctx      = null
    this._bgGain   = null
    this._sfxGain  = null
    this._bgActive = false
    this._bgTimer  = null
    this._bgNodes  = []   // 스케줄된 oscillator 추적 — stopBGM 시 즉시 중단
  }

  /**
   * 최초 유저 제스처(터치/클릭) 이후 반드시 호출해야 Web Audio 활성화됨
   */
  init() {
    if (this._ctx) return
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)()

      this._bgGain = this._ctx.createGain()
      this._bgGain.gain.value = 0.18
      this._bgGain.connect(this._ctx.destination)

      this._sfxGain = this._ctx.createGain()
      this._sfxGain.gain.value = 0.5
      this._sfxGain.connect(this._ctx.destination)
    } catch (e) {
      console.warn('[Sound] Web Audio not supported:', e)
    }
  }

  // ── 효과음 ─────────────────────────────────────────────────────────────────

  /** 버튼 클릭음 — 짧은 하강 스퀘어 블립 */
  playClick() {
    this._blip({ freq: 880, endFreq: 440, dur: 0.07, type: 'square', gain: 0.32 })
  }

  /** 사과 득점음 — G4→B4→D5 상승 아르페지오 (G장조에 맞춤) */
  playScore() {
    [[392, 0], [494, 0.13], [587, 0.26]].forEach(([f, delay]) => {
      this._blip({ freq: f, endFreq: f, dur: 0.2, type: 'sine', gain: 0.48, delay })
    })
  }

  /** 게임 오버 — 띠로리~ D5→B4→G4 하강 후 E4→G3 슬라이드 */
  playGameOver() {
    // triangle 파형 = 둥글고 슬픈 호른 느낌
    [
      [587, 587, 0.18, 0   ],  // D5
      [494, 494, 0.18, 0.22],  // B4
      [392, 392, 0.18, 0.44],  // G4
      [330, 185, 0.60, 0.66],  // E4 → 아래로 슬라이드 (완전히 꺼지는 느낌)
    ].forEach(([freq, endFreq, dur, delay]) => {
      this._blip({ freq, endFreq, dur, type: 'triangle', gain: 0.52, delay })
    })
  }

  /** 클리어 — 아싸! G4→B4→D5→G5 빠른 상승 팡파르 */
  playClear() {
    // square 파형 = 밝고 통쾌한 칩튠 팡파르
    [
      [392, 392, 0.10, 0   ],  // G4
      [494, 494, 0.10, 0.1 ],  // B4
      [587, 587, 0.10, 0.2 ],  // D5
      [784, 830, 0.45, 0.32],  // G5 (상향 슬라이드로 "아싸!" 느낌)
      [784, 784, 0.25, 0.85],  // G5 여운
    ].forEach(([freq, endFreq, dur, delay]) => {
      this._blip({ freq, endFreq, dur, type: 'square', gain: 0.50, delay })
    })
  }

  // ── BGM ────────────────────────────────────────────────────────────────────

  /** 배경음 시작 */
  startBGM() {
    if (!this._ctx || this._bgActive) return
    this._bgActive = true
    this._scheduleBGM(this._ctx.currentTime)
  }

  /**
   * 배경음 정지.
   * 모든 스케줄된 oscillator를 osc.stop()으로 즉시 중단 → 중복 재생 원천 차단.
   */
  stopBGM() {
    this._bgActive = false
    clearTimeout(this._bgTimer)
    const now = this._ctx ? this._ctx.currentTime : 0
    for (const osc of this._bgNodes) {
      try { osc.stop(now) } catch (_) {}
    }
    this._bgNodes = []
  }

  // ── private ─────────────────────────────────────────────────────────────────

  _blip({ freq, endFreq, dur, type = 'sine', gain = 0.4, delay = 0 }) {
    if (!this._ctx) return
    const ctx = this._ctx
    const t   = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.linearRampToValueAtTime(endFreq, t + dur)
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(gain, t + 0.005)
    env.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(env)
    env.connect(this._sfxGain)
    osc.start(t)
    osc.stop(t + dur + 0.01)
  }

  _scheduleSeq(seq, t0, type, gainVal) {
    const ctx = this._ctx
    let t = t0
    seq.forEach(([hz, beats]) => {
      const dur = beats * BEAT
      if (hz > 0) {
        const osc = ctx.createOscillator()
        const env = ctx.createGain()
        osc.type = type
        osc.frequency.value = hz
        env.gain.setValueAtTime(0, t)
        env.gain.linearRampToValueAtTime(gainVal, t + 0.01)
        env.gain.setValueAtTime(gainVal, t + dur * 0.75)
        env.gain.linearRampToValueAtTime(0, t + dur * 0.95)
        osc.connect(env)
        env.connect(this._bgGain)
        osc.start(t)
        osc.stop(t + dur)
        this._bgNodes.push(osc)   // stopBGM() 시 즉시 중단 가능하도록 추적
      }
      t += dur
    })
    return t
  }

  _scheduleBGM(startTime) {
    if (!this._bgActive || !this._ctx) return
    const loopBeats = MELODY.reduce((s, [, b]) => s + b, 0)
    const loopDur   = loopBeats * BEAT

    this._scheduleSeq(MELODY, startTime, 'square',   0.15)
    this._scheduleSeq(BASS,   startTime, 'triangle', 0.20)

    // 루프 종료 200ms 전에 다음 루프 예약
    const msLeft = (startTime + loopDur - this._ctx.currentTime) * 1000 - 200
    this._bgTimer = setTimeout(() => {
      this._scheduleBGM(startTime + loopDur)
    }, Math.max(0, msLeft))
  }
}
