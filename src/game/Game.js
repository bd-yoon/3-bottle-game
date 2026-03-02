import { Player, SPEED } from './entities/Player.js'
import { AIPlayer, getDifficultyParams } from './entities/AIPlayer.js'
import { Bottle } from './entities/Bottle.js'
import { Base } from './entities/Base.js'
import { Renderer } from './Renderer.js'
import { Joystick } from '../input/Joystick.js'
import { showRewardedAd } from '../lib/adsInToss.js'

const WIN_COUNT = 3
const BOTTLE_COUNT = 5
const LEVEL_KEY = '3bottle_level'

const GAME_STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  WIN: 'win',        // 승리 → 레벨업
  LOSE: 'lose',      // 패배 → 광고 or 리셋
}

// ── 레벨 영속성 ────────────────────────────────────────────────────────────────
function loadLevel() {
  return parseInt(localStorage.getItem(LEVEL_KEY) || '1', 10)
}
function saveLevel(level) {
  localStorage.setItem(LEVEL_KEY, String(level))
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this._joystickZone = document.getElementById('joystick-zone')
    this.joystick = new Joystick(this._joystickZone)
    this._state = GAME_STATES.TITLE
    this._level = loadLevel()
    this._winner = null
    this._adLoading = false   // 광고 로딩 중 플래그
    this._rafId = null
    this._lastTime = 0

    this._setupResize()
    this._setupInput()
    this._syncJoystickZone()
  }

  start() {
    this.joystick.init()
    this._loop(performance.now())
  }

  // ── 게임 시작 / 레벨 설정 ──────────────────────────────────────────────────

  _startGame(level) {
    this._level = level
    saveLevel(level)

    const w = this.canvas.width
    const h = this.canvas.height
    const diff = getDifficultyParams(level)

    // ── 정삼각형 베이스 좌표 계산 ────────────────────────────────────────────
    const cx = w / 2
    const cy = h * 0.42
    const R = Math.min(w * 0.42, h * 0.27)
    const SIN60 = Math.sin(Math.PI / 3)
    const COS60 = 0.5
    const baseRadius = R * 0.32

    const pBx = cx,              pBy = cy + R
    const a1Bx = cx - R * SIN60, a1By = cy - R * COS60
    const a2Bx = cx + R * SIN60, a2By = cy - R * COS60

    // ── Bases ────────────────────────────────────────────────────────────────
    const playerBase = new Base({ x: pBx,  y: pBy,  radius: baseRadius, owner: 'player', color: '#f9a8d4', label: '카피바라' })
    const ai1Base    = new Base({ x: a1Bx, y: a1By, radius: baseRadius, owner: 'ai1',    color: '#a5b4fc', label: '판다' })
    const ai2Base    = new Base({ x: a2Bx, y: a2By, radius: baseRadius, owner: 'ai2',    color: '#fde68a', label: '골든' })

    // ── Players ──────────────────────────────────────────────────────────────
    const bounds = { w, h }

    this.playerEntity = new Player({ x: pBx, y: pBy, type: 'player', base: playerBase, color: '#f9a8d4', label: 'CAPI', emoji: '🦫' })
    this.playerEntity._bounds = bounds

    const ai1 = new AIPlayer({ x: a1Bx, y: a1By, type: 'ai1', base: ai1Base, color: '#a5b4fc', label: 'PANDA', emoji: '🐼', difficulty: diff })
    ai1._bounds = bounds

    const ai2 = new AIPlayer({ x: a2Bx, y: a2By, type: 'ai2', base: ai2Base, color: '#fde68a', label: 'GOLDIE', emoji: '🐕', difficulty: diff })
    ai2._bounds = bounds

    this.players = [this.playerEntity, ai1, ai2]
    this.bases   = [playerBase, ai1Base, ai2Base]

    // ── Bottles ──────────────────────────────────────────────────────────────
    this.bottles = []
    const spreadR = Math.min(w, h) * 0.1
    for (let i = 0; i < BOTTLE_COUNT; i++) {
      const angle = (i / BOTTLE_COUNT) * Math.PI * 2
      this.bottles.push(new Bottle({
        x: cx + Math.cos(angle) * spreadR,
        y: cy + Math.sin(angle) * spreadR,
      }))
    }

    this._winner = null
    this._adLoading = false
    this._state = GAME_STATES.PLAYING
    this._syncJoystickZone()
  }

  // ── 메인 루프 ───────────────────────────────────────────────────────────────

  _loop(now) {
    const dt = Math.min((now - this._lastTime) / 1000, 0.05)
    this._lastTime = now
    this._update(dt)
    this._render()
    this._rafId = requestAnimationFrame(t => this._loop(t))
  }

  _update(dt) {
    if (this._state !== GAME_STATES.PLAYING) return

    this.playerEntity.vx = this.joystick.x * SPEED
    this.playerEntity.vy = this.joystick.y * SPEED

    for (const player of this.players) {
      player.update(dt, this.bottles, this.bases)
    }

    for (const base of this.bases) {
      if (base.bottleCount >= WIN_COUNT) {
        this._winner = this.players.find(p => p.base === base)
        this._state = this._winner.type === 'player' ? GAME_STATES.WIN : GAME_STATES.LOSE
        this._syncJoystickZone()
        return
      }
    }
  }

  _render() {
    const w = this.canvas.width
    const h = this.canvas.height

    switch (this._state) {
      case GAME_STATES.TITLE:
        this.renderer.drawTitle(w, h, this._level)
        break
      case GAME_STATES.PLAYING:
        this.renderer.drawGame({ players: this.players, bottles: this.bottles, bases: this.bases, level: this._level })
        break
      case GAME_STATES.WIN:
        this.renderer.drawWin(w, h, this._level)
        break
      case GAME_STATES.LOSE:
        this.renderer.drawLose(w, h, this._level, this._winner, this._adLoading)
        break
    }
  }

  // ── 입력 처리 ───────────────────────────────────────────────────────────────

  _setupInput() {
    this.canvas.addEventListener('click', e => this._handleClick(e))
    this.canvas.addEventListener('touchend', e => {
      e.preventDefault()
      const t = e.changedTouches[0]
      this._handleClick({ clientX: t.clientX, clientY: t.clientY })
    }, { passive: false })
  }

  _handleClick(e) {
    if (this._adLoading) return   // 광고 로딩 중 버튼 비활성

    const rect = this.canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (this.canvas.width / rect.width)
    const py = (e.clientY - rect.top) * (this.canvas.height / rect.height)
    const w = this.canvas.width
    const h = this.canvas.height

    if (this._state === GAME_STATES.TITLE) {
      if (this.renderer.hitButton(w / 2, h * 0.76, w * 0.55, 52, px, py)) {
        this._startGame(this._level)
      }
    } else if (this._state === GAME_STATES.WIN) {
      if (this.renderer.hitButton(w / 2, h * 0.74, w * 0.58, 56, px, py)) {
        this._startGame(this._level + 1)
      }
    } else if (this._state === GAME_STATES.LOSE) {
      // 광고 보고 다시 도전
      if (this.renderer.hitButton(w / 2, h * 0.68, w * 0.75, 52, px, py)) {
        this._handleAdRetry()
      }
      // 처음부터 (레벨 1)
      if (this.renderer.hitButton(w / 2, h * 0.79, w * 0.55, 44, px, py)) {
        saveLevel(1)
        this._level = 1
        this._state = GAME_STATES.TITLE
        this._syncJoystickZone()
      }
    }
  }

  async _handleAdRetry() {
    this._adLoading = true
    const watched = await showRewardedAd()
    this._adLoading = false
    if (watched) {
      this._startGame(this._level)   // 같은 레벨 재도전
    }
    // 광고 스킵/실패 시 LOSE 화면 유지
  }

  // ── 조이스틱 영역 가시성 ────────────────────────────────────────────────────

  _syncJoystickZone() {
    this._joystickZone.style.pointerEvents =
      this._state === GAME_STATES.PLAYING ? 'auto' : 'none'
  }

  // ── 리사이즈 ────────────────────────────────────────────────────────────────

  _setupResize() {
    const doResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      this.renderer.resize(w, h)
      if (this._state === GAME_STATES.PLAYING) {
        this._startGame(this._level)
      }
    }
    window.addEventListener('resize', doResize)
    doResize()
  }
}
