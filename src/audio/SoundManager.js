// src/audio/SoundManager.js
// Web Audio API 기반 사운드 합성 — 외부 파일 불필요, 저작권 없음

const BPM  = 168
const BEAT = 60 / BPM  // ≈ 0.357s per quarter note

// ── 배경음 멜로디 시퀀스 [Hz, beats] ──────────────────────────────────────────
// 96비트 루프 (≈34s), 마리오 오버월드 스타일 C장조 칩튠
// 구조: Section A(8bar) → B(8bar) → C(4bar) → D(4bar)
// 0 = 쉼표
const MELODY = [
  // ── Section A: 메인 테마 (bars 1~8, 32beats) ─────────────────────────────
  // Bar 1 — 도약 + 스타카토 리듬 (마리오 오버월드 오마주)
  [659,.5],[659,.5],[0,.5],[659,.5],[0,.5],[523,.5],[659,1],
  // Bar 2 — 고음 등장 후 낮은 음으로 드롭
  [784,2],[0,1],[392,1],
  // Bar 3 — 상승 아르페지오
  [523,.5],[392,.5],[523,1],[659,.5],[523,.5],[440,1],
  // Bar 4 — 여운
  [440,3],[0,1],
  // Bar 5 — G5에서 D4까지 흘러내리는 8분음표
  [784,.5],[698,.5],[659,.5],[523,.5],[440,.5],[392,.5],[330,.5],[294,.5],
  // Bar 6 — 다시 상승
  [330,.5],[294,.5],[330,1],[392,1],[440,1],
  // Bar 7 — 계단 상승 패턴
  [523,.5],[440,.5],[523,.5],[659,.5],[784,.5],[659,.5],[523,.5],[440,.5],
  // Bar 8 — 섹션 마무리
  [523,3],[0,1],

  // ── Section B: 브릿지 (bars 9~16, 32beats) ───────────────────────────────
  // Bar 9 — 스타카토 리듬 (긴장감 전환)
  [392,.5],[0,.5],[392,.5],[0,.5],[392,1],[0,.5],[392,.5],
  // Bar 10 — 계단 상승
  [523,1],[440,1],[349,1],[392,1],
  // Bar 11 — 고음 클라이맥스 도입
  [659,.5],[784,.5],[880,1],[784,.5],[659,.5],[523,1],
  // Bar 12 — 숨 고르기
  [440,2],[0,2],
  // Bar 13 — 달리는 8분음표 상승 (C5→A5)
  [523,.5],[587,.5],[659,.5],[784,.5],[880,.5],[784,.5],[659,.5],[587,.5],
  // Bar 14 — 응답 선율
  [698,.5],[659,.5],[698,1],[784,.5],[659,.5],[523,.5],[440,.5],
  // Bar 15 — 클라이맥스 빌드업
  [392,.5],[440,.5],[523,.5],[659,.5],[784,.5],[659,.5],[784,.5],[880,.5],
  // Bar 16 — 클라이맥스 해소
  [784,1],[880,1],[784,1],[0,1],

  // ── Section C: 테마 귀환 (bars 17~20, 16beats) ───────────────────────────
  // Bar 17 — bar 1 재현
  [659,.5],[659,.5],[0,.5],[659,.5],[0,.5],[523,.5],[659,1],
  // Bar 18 — bar 2 재현
  [784,2],[0,1],[392,1],
  // Bar 19 — 변형 하강 (상승 후 G5→D4)
  [523,.5],[659,.5],[784,.5],[659,.5],[523,.5],[392,.5],[330,.5],[294,.5],
  // Bar 20 — 섹션 종결
  [523,3],[0,1],

  // ── Section D: 아웃트로 (bars 21~24, 16beats) ────────────────────────────
  // Bar 21 — 상승 선율
  [784,.5],[659,.5],[784,1],[880,.5],[784,.5],[659,.5],[523,.5],
  // Bar 22 — 하강 후 다시 고음으로
  [659,.5],[523,.5],[440,.5],[523,.5],[659,.5],[784,.5],[880,1],
  // Bar 23 — 물결 패턴
  [784,.5],[659,.5],[784,.5],[659,.5],[523,.5],[659,.5],[523,.5],[392,.5],
  // Bar 24 — 최종 해결
  [523,4],
]

// ── 베이스 시퀀스 [Hz, beats] ─────────────────────────────────────────────────
// triangle 파형으로 따뜻한 저음, 96비트
const BASS = [
  // Section A (32 beats)
  // Bar 1-2: C
  [130,1],[130,1],[130,1],[98,1],
  [130,1],[130,1],[98,1],[87,1],
  // Bar 3: C
  [130,1],[130,1],[130,1],[130,1],
  // Bar 4: Am
  [110,1],[110,1],[110,1],[110,1],
  // Bar 5: F
  [87,1],[87,1],[87,1],[87,1],
  // Bar 6: F→Am
  [87,1],[87,1],[110,1],[110,1],
  // Bar 7: G
  [98,1],[98,1],[98,1],[98,1],
  // Bar 8: C
  [130,2],[130,2],

  // Section B (32 beats)
  // Bar 9: Am
  [110,2],[110,2],
  // Bar 10: Am→G→F→G
  [110,1],[98,1],[87,1],[98,1],
  // Bar 11: C
  [130,1],[130,1],[130,1],[196,1],
  // Bar 12: C
  [130,2],[0,2],
  // Bar 13: F
  [87,1],[87,1],[87,1],[87,1],
  // Bar 14: F→G
  [87,1],[87,1],[98,1],[98,1],
  // Bar 15: G
  [98,1],[98,1],[98,1],[98,1],
  // Bar 16: C
  [130,4],

  // Section C (16 beats)
  // Bar 17: C
  [130,1],[130,1],[130,1],[98,1],
  // Bar 18: C
  [130,1],[130,1],[98,1],[87,1],
  // Bar 19: F
  [87,1],[87,1],[110,1],[110,1],
  // Bar 20: C
  [130,2],[130,2],

  // Section D (16 beats)
  // Bar 21: C
  [130,1],[130,1],[130,1],[130,1],
  // Bar 22: C→G
  [130,1],[130,1],[196,1],[196,1],
  // Bar 23: G
  [196,1],[196,1],[196,1],[98,1],
  // Bar 24: C
  [130,4],
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

  /** 사과 득점음 — C5→E5→G5 상승 아르페지오 */
  playScore() {
    [[523, 0], [659, 0.13], [784, 0.26]].forEach(([f, delay]) => {
      this._blip({ freq: f, endFreq: f, dur: 0.2, type: 'sine', gain: 0.48, delay })
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
   * bgGain 조작만으로는 미래 스케줄 노드가 gain 복원 시 다시 살아나는 문제가 있어,
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
