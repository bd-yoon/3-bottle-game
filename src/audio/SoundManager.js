// src/audio/SoundManager.js
// Web Audio API 기반 사운드 합성 — 외부 파일 불필요, 저작권 없음

const BPM  = 138
const BEAT = 60 / BPM  // ≈ 0.435s per quarter note

// ── 배경음 멜로디 시퀀스 [Hz, beats] ──────────────────────────────────────────
// 32비트 루프 (≈13.9s), C 장조 기반 경쾌한 칩튠
const MELODY = [
  // Bar 1 — C 아르페지오 상승
  [523,1],[659,1],[784,1],[659,1],
  // Bar 2 — 하강
  [523,1],[494,1],[440,1],[392,1],
  // Bar 3 — Am 상승
  [440,1],[523,1],[659,1],[523,1],
  // Bar 4 — D→E 선율
  [587,2],[0,.5],[587,.5],[659,1],
  // Bar 5 — F 전개
  [698,1],[587,1],[659,1],[523,1],
  // Bar 6 — Am 여운
  [440,1],[523,1],[587,1],[0,1],
  // Bar 7 — C 반복
  [523,1],[659,1],[784,1],[659,1],
  // Bar 8 — 마무리
  [523,1.5],[494,.5],[523,2],
]

// ── 베이스 시퀀스 [Hz, beats] ─────────────────────────────────────────────────
// triangle 파형으로 따뜻한 저음
const BASS = [
  // Bar 1-2 : C 페달
  [130,1],[130,1],[130,1],[130,1],
  [130,1],[130,1],[196,1],[196,1],
  // Bar 3-4 : Am → D
  [220,1],[220,1],[220,1],[220,1],
  [147,2],[0,1],[147,1],
  // Bar 5-6 : F → Am
  [175,1],[175,1],[175,1],[175,1],
  [220,1],[220,1],[220,2],
  // Bar 7-8 : C
  [130,1],[130,1],[130,1],[130,1],
  [130,2],[196,2],
]

export class SoundManager {
  constructor() {
    this._ctx      = null
    this._bgGain   = null
    this._sfxGain  = null
    this._bgActive = false
    this._bgTimer  = null
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

  /** 배경음 정지 */
  stopBGM() {
    this._bgActive = false
    clearTimeout(this._bgTimer)
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
