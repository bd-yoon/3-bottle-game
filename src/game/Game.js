import { Player, SPEED } from './entities/Player.js'
import { AIPlayer } from './entities/AIPlayer.js'
import { Bottle } from './entities/Bottle.js'
import { Base } from './entities/Base.js'
import { Renderer } from './Renderer.js'
import { Joystick } from '../input/Joystick.js'

const WIN_COUNT = 3
const BOTTLE_COUNT = 5

const GAME_STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this._joystickZone = document.getElementById('joystick-zone')
    this.joystick = new Joystick(this._joystickZone)
    this._state = GAME_STATES.TITLE
    this._winner = null
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

  // ── Game state transitions ──────────────────────────────────────────────────

  _startGame() {
    const w = this.canvas.width
    const h = this.canvas.height

    // ── 정삼각형 베이스 좌표 계산 ─────────────────────────────────────────────
    // 세 꼭짓점이 픽셀 거리상 동일한 정삼각형
    const cx = w / 2
    const cy = h * 0.42
    const R = Math.min(w * 0.42, h * 0.27)   // 중심 → 꼭짓점 거리(px)
    const SIN60 = Math.sin(Math.PI / 3)       // ≈ 0.866
    const COS60 = 0.5

    const baseRadius = R * 0.32

    // Capi(플레이어): 하단 중앙
    const pBx = cx
    const pBy = cy + R
    // Panda(AI1): 좌상단
    const a1Bx = cx - R * SIN60
    const a1By = cy - R * COS60
    // Golden(AI2): 우상단
    const a2Bx = cx + R * SIN60
    const a2By = cy - R * COS60

    // ── Bases ────────────────────────────────────────────────────────────────
    const playerBase = new Base({
      x: pBx, y: pBy,
      radius: baseRadius,
      owner: 'player',
      color: '#f9a8d4',
      label: '카피바라',
    })

    const ai1Base = new Base({
      x: a1Bx, y: a1By,
      radius: baseRadius,
      owner: 'ai1',
      color: '#a5b4fc',
      label: '판다',
    })

    const ai2Base = new Base({
      x: a2Bx, y: a2By,
      radius: baseRadius,
      owner: 'ai2',
      color: '#fde68a',
      label: '골든',
    })

    // ── Players ──────────────────────────────────────────────────────────────
    const bounds = { w, h }

    this.playerEntity = new Player({
      x: pBx, y: pBy,
      type: 'player',
      base: playerBase,
      color: '#f9a8d4',
      label: 'CAPI',
      emoji: '🦫',
    })
    this.playerEntity._bounds = bounds

    const ai1 = new AIPlayer({
      x: a1Bx, y: a1By,
      type: 'ai1',
      base: ai1Base,
      color: '#a5b4fc',
      label: 'PANDA',
      emoji: '🐼',
    })
    ai1._bounds = bounds

    const ai2 = new AIPlayer({
      x: a2Bx, y: a2By,
      type: 'ai2',
      base: ai2Base,
      color: '#fde68a',
      label: 'GOLDIE',
      emoji: '🐕',
    })
    ai2._bounds = bounds

    this.players = [this.playerEntity, ai1, ai2]
    this.bases = [playerBase, ai1Base, ai2Base]

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
    this._state = GAME_STATES.PLAYING
    this._syncJoystickZone()
  }

  // ── Main loop ───────────────────────────────────────────────────────────────

  _loop(now) {
    const dt = Math.min((now - this._lastTime) / 1000, 0.05)  // cap at 50ms
    this._lastTime = now

    this._update(dt)
    this._render()

    this._rafId = requestAnimationFrame(t => this._loop(t))
  }

  _update(dt) {
    if (this._state !== GAME_STATES.PLAYING) return

    // Apply joystick to player
    const speed = SPEED
    this.playerEntity.vx = this.joystick.x * speed
    this.playerEntity.vy = this.joystick.y * speed

    // Update all entities
    for (const player of this.players) {
      player.update(dt, this.bottles, this.bases)
    }

    // Win check
    for (const base of this.bases) {
      if (base.bottleCount >= WIN_COUNT) {
        const winner = this.players.find(p => p.base === base)
        this._winner = winner
        this._state = GAME_STATES.GAME_OVER
        this._syncJoystickZone()
        return
      }
    }
  }

  _render() {
    const w = this.canvas.width
    const h = this.canvas.height

    if (this._state === GAME_STATES.TITLE) {
      this.renderer.drawTitle(w, h)
      return
    }

    if (this._state === GAME_STATES.GAME_OVER) {
      this.renderer.drawGameOver(this._winner, w, h)
      return
    }

    this.renderer.drawGame({
      players: this.players,
      bottles: this.bottles,
      bases: this.bases,
    })
  }

  // ── Input ────────────────────────────────────────────────────────────────────

  _setupInput() {
    this.canvas.addEventListener('click', e => this._handleClick(e))
    this.canvas.addEventListener('touchend', e => {
      e.preventDefault()
      const t = e.changedTouches[0]
      this._handleClick({ clientX: t.clientX, clientY: t.clientY })
    }, { passive: false })
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (this.canvas.width / rect.width)
    const py = (e.clientY - rect.top) * (this.canvas.height / rect.height)
    const w = this.canvas.width
    const h = this.canvas.height

    if (this._state === GAME_STATES.TITLE) {
      // Check start button area
      if (this.renderer.hitButton(w / 2, h * 0.76, w * 0.55, 52, px, py)) {
        this._startGame()
      }
    } else if (this._state === GAME_STATES.GAME_OVER) {
      // Check restart button area
      if (this.renderer.hitButton(w / 2, h * 0.74, w * 0.55, 52, px, py)) {
        this._startGame()
      }
    }
  }

  // ── Joystick zone visibility ─────────────────────────────────────────────────

  _syncJoystickZone() {
    // PLAYING 상태일 때만 조이스틱 zone이 포인터 이벤트를 받음
    // 나머지(TITLE, GAME_OVER)는 pointer-events:none으로 캔버스 클릭이 통과
    this._joystickZone.style.pointerEvents =
      this._state === GAME_STATES.PLAYING ? 'auto' : 'none'
  }

  // ── Resize ───────────────────────────────────────────────────────────────────

  _setupResize() {
    const doResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      this.renderer.resize(w, h)

      // If mid-game, restart positions (simple approach)
      if (this._state === GAME_STATES.PLAYING) {
        this._startGame()
      }
    }
    window.addEventListener('resize', doResize)
    doResize()
  }
}
