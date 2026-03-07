import { Player, SPEED } from './entities/Player.js'
import { AIPlayer, getDifficultyParams } from './entities/AIPlayer.js'
import { Bottle } from './entities/Bottle.js'
import { Base } from './entities/Base.js'
import { Renderer } from './Renderer.js'
import { TouchInput } from '../input/TouchInput.js'
import { showRewardedAd } from '../lib/adsInToss.js'
import { SoundManager } from '../audio/SoundManager.js'
import * as pointManager from '../utils/pointManager.js'

const WIN_COUNT = 3
const BOTTLE_COUNT = 5

const GAME_STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose',
  DAILY_LIMIT: 'daily_limit',
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this.touchInput = new TouchInput()
    this._state = GAME_STATES.TITLE
    this._level = pointManager.getTodayStage()
    this._winner = null
    this._adLoading = false
    this._lastEarned = 0
    this._showWithdrawModal = false
    this._rafId = null
    this._lastTime = 0

    // P1-A: apple pickup particles
    this._particles = []
    // P1-B: WIN screen star particles + countup
    this._winParticles = []
    this._winCountupTarget = 0
    this._winCountupStart = 0
    // P2-B: HUD apple slot pop animation
    this._hudPopTimer = 0
    // P3: tutorial mode for first-time visitors
    this._isTutorial = !localStorage.getItem('3bottle_tutorial_done')
    this._tutorialJustWon = false

    this.sound = new SoundManager()

    this._setupResize()
    this._setupInput()
  }

  start() {
    this._loop(performance.now())
  }

  // ── 게임 시작 / 레벨 설정 ──────────────────────────────────────────────────

  _startGame(level) {
    this._level = level

    const w = this.canvas.width
    const h = this.canvas.height
    const diff = getDifficultyParams(level)

    const cx = w / 2
    const cy = h * 0.42
    const R = Math.min(w * 0.42, h * 0.27)
    const SIN60 = Math.sin(Math.PI / 3)
    const COS60 = 0.5
    const baseRadius = R * 0.32

    const pBx = cx,              pBy = cy + R
    const a1Bx = cx - R * SIN60, a1By = cy - R * COS60
    const a2Bx = cx + R * SIN60, a2By = cy - R * COS60

    const playerBase = new Base({ x: pBx,  y: pBy,  radius: baseRadius, owner: 'player', color: '#f9a8d4', label: '카피바라' })
    const ai1Base    = new Base({ x: a1Bx, y: a1By, radius: baseRadius, owner: 'ai1',    color: '#a5b4fc', label: '팬더' })
    const ai2Base    = new Base({ x: a2Bx, y: a2By, radius: baseRadius, owner: 'ai2',    color: '#fde68a', label: '골댕이' })

    const bounds = { w, h }

    this.playerEntity = new Player({ x: pBx, y: pBy, type: 'player', base: playerBase, color: '#f9a8d4', label: '카피바라', emoji: '🦫' })
    this.playerEntity._bounds = bounds

    const ai1 = new AIPlayer({ x: a1Bx, y: a1By, type: 'ai1', base: ai1Base, color: '#a5b4fc', label: '팬더', emoji: '🐼', difficulty: diff })
    ai1._bounds = bounds

    const ai2 = new AIPlayer({ x: a2Bx, y: a2By, type: 'ai2', base: ai2Base, color: '#fde68a', label: '골댕이', emoji: '🐕', difficulty: diff })
    ai2._bounds = bounds

    this.players = [this.playerEntity, ai1, ai2]
    this.bases   = [playerBase, ai1Base, ai2Base]

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
    this._particles = []
    this._winParticles = []
    this._winCountupTarget = 0
    this._hudPopTimer = 0
    this.touchInput.clear()
    this._state = GAME_STATES.PLAYING

    this.sound.stopBGM()
    this.sound.startBGM()
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
    // P1-A: apple pickup particle physics (every frame)
    for (const p of this._particles) {
      p.x += p.vx; p.y += p.vy
      p.vy += 0.35
      p.life -= 0.048
    }
    this._particles = this._particles.filter(p => p.life > 0)

    // P1-B: WIN star particle physics (every frame)
    for (const p of this._winParticles) {
      p.x += p.vx; p.y += p.vy
      p.vy += 0.12
      p.life -= 0.016
    }
    this._winParticles = this._winParticles.filter(p => p.life > 0)

    // P2-B: HUD pop timer decay
    if (this._hudPopTimer > 0) this._hudPopTimer = Math.max(0, this._hudPopTimer - dt)

    if (this._state !== GAME_STATES.PLAYING) return

    const prevCounts = this.bases.map(b => b.bottleCount)

    const dir = this.touchInput.getDirection(this.playerEntity.x, this.playerEntity.y)
    this.playerEntity.vx = dir.x * SPEED
    this.playerEntity.vy = dir.y * SPEED

    // P3: freeze AI in tutorial mode
    const playersToUpdate = this._isTutorial ? [this.playerEntity] : this.players
    for (const player of playersToUpdate) {
      player.update(dt, this.bottles, this.bases)
    }

    this.bases.forEach((base, i) => {
      if (base.owner === 'player' && base.bottleCount > prevCounts[i]) {
        this.sound.playScore()
        this._emitAppleParticles(base)   // P1-A
        this._hudPopTimer = 0.45          // P2-B: trigger HUD slot pop
      }
    })

    for (const base of this.bases) {
      if (base.bottleCount >= WIN_COUNT) {
        this._winner = this.players.find(p => p.base === base)
        this._state = this._winner.type === 'player' ? GAME_STATES.WIN : GAME_STATES.LOSE
        this.touchInput.clear()
        this.sound.stopBGM()

        if (this._state === GAME_STATES.WIN) {
          if (this._isTutorial) {
            // P3: tutorial complete — no points, mark done, flag for tutorial WIN screen
            this._lastEarned = 0
            localStorage.setItem('3bottle_tutorial_done', '1')
            this._isTutorial = false
            this._tutorialJustWon = true
          } else {
            this._lastEarned = pointManager.awardWin()
            this._initWinEffect(this._lastEarned)  // P1-B
          }
          this.sound.playClear()
        } else {
          this.sound.playGameOver()
        }
        return
      }
    }
  }

  // P1-A: emit red pixel particles on apple score
  _emitAppleParticles(base) {
    const count = 8 + Math.floor(Math.random() * 5)
    const colors = ['#e83030', '#ff5858', '#ff2020', '#ff8080', '#c01818']
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 4
      this._particles.push({
        x: base.x + (Math.random() - 0.5) * base.radius,
        y: base.y + (Math.random() - 0.5) * base.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        r: 3 + Math.floor(Math.random() * 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      })
    }
  }

  // P1-B: init WIN star particles + countup animation
  _initWinEffect(earned) {
    const cx = this.canvas.width / 2
    const cy = this.canvas.height * 0.30
    const colors = ['#fcd34d', '#fde68a', '#ffffff', '#f0c040', '#ffe680']
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.3
      const speed = 3 + Math.random() * 6
      this._winParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        r: 4 + Math.floor(Math.random() * 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      })
    }
    this._winCountupTarget = earned
    this._winCountupStart = performance.now()
  }

  // P1-B: ease-out-cubic countup over 800ms
  _getWinDisplay() {
    if (this._winCountupTarget === 0) return 0
    const t = Math.min((performance.now() - this._winCountupStart) / 800, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    return Math.round(eased * this._winCountupTarget)
  }

  // P2-A: KST midnight countdown string HH:MM:SS
  _getCountdownStr() {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const totalSec = (24 * 3600) - (kstNow.getUTCHours() * 3600 + kstNow.getUTCMinutes() * 60 + kstNow.getUTCSeconds())
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  _render() {
    const w = this.canvas.width
    const h = this.canvas.height

    switch (this._state) {
      case GAME_STATES.TITLE:
        this.renderer.drawTitle(w, h, this._level, pointManager.getTotalPoints(), pointManager.getTodayEarned(), this._isTutorial)
        break
      case GAME_STATES.PLAYING:
        this.renderer.drawGame({
          players: this.players,
          bottles: this.bottles,
          bases: this.bases,
          level: this._level,
          hudPopTimer: this._hudPopTimer,   // P2-B
          isTutorial: this._isTutorial,     // P3
        })
        if (this._particles.length) this.renderer.drawParticles(this._particles)  // P1-A
        break
      case GAME_STATES.WIN:
        this.renderer.drawWin(
          w, h, this._level,
          this._getWinDisplay(),              // P1-B: animated countup
          pointManager.getTotalPoints(),
          pointManager.getTodayEarned(),
          pointManager.canWithdraw(),
          !pointManager.canEarnToday(),
          this._tutorialJustWon,             // P3
        )
        if (this._winParticles.length) this.renderer.drawParticles(this._winParticles)  // P1-B
        break
      case GAME_STATES.LOSE:
        this.renderer.drawLose(w, h, this._level, this._winner, this._adLoading, pointManager.getTotalPoints())
        break
      case GAME_STATES.DAILY_LIMIT:
        this.renderer.drawDailyLimit(
          w, h,
          pointManager.getTotalPoints(),
          pointManager.canWithdraw(),
          this._getCountdownStr(),           // P2-A
          pointManager.getTodayEarned(),
        )
        break
    }

    if (this._showWithdrawModal) {
      this.renderer.drawWithdrawModal(w, h, pointManager.getTotalPoints())
    }
  }

  // ── 입력 처리 ───────────────────────────────────────────────────────────────

  _setupInput() {
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault()
      this.sound.init()
      if (this._state === GAME_STATES.PLAYING) {
        const t = e.touches[0]
        this.touchInput.setPos(...this._canvasPos(t.clientX, t.clientY))
      }
    }, { passive: false })

    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault()
      if (this._state === GAME_STATES.PLAYING) {
        const t = e.touches[0]
        this.touchInput.setPos(...this._canvasPos(t.clientX, t.clientY))
      }
    }, { passive: false })

    this.canvas.addEventListener('touchend', e => {
      e.preventDefault()
      if (this._state === GAME_STATES.PLAYING) {
        this.touchInput.clear()
      } else {
        const t = e.changedTouches[0]
        this._handleClick({ clientX: t.clientX, clientY: t.clientY })
      }
    }, { passive: false })

    this.canvas.addEventListener('mousedown', e => {
      this.sound.init()
      if (this._state === GAME_STATES.PLAYING) {
        this._mouseDown = true
        this.touchInput.setPos(...this._canvasPos(e.clientX, e.clientY))
      }
    })

    this.canvas.addEventListener('mousemove', e => {
      if (this._state === GAME_STATES.PLAYING && this._mouseDown) {
        this.touchInput.setPos(...this._canvasPos(e.clientX, e.clientY))
      }
    })

    this.canvas.addEventListener('mouseup', () => {
      this._mouseDown = false
      this.touchInput.clear()
    })

    this.canvas.addEventListener('click', e => this._handleClick(e))
  }

  _canvasPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    return [
      (clientX - rect.left) * (this.canvas.width  / rect.width),
      (clientY - rect.top)  * (this.canvas.height / rect.height),
    ]
  }

  _handleClick(e) {
    if (this._adLoading) return
    this.sound.init()

    const [px, py] = this._canvasPos(e.clientX, e.clientY)
    const w = this.canvas.width
    const h = this.canvas.height

    if (this._showWithdrawModal) {
      if (this.renderer.hitButton(w / 2, h * 0.585, w * 0.65, 52, px, py)) {
        this.sound.playClick()
        this._showWithdrawModal = false
        window.alert('출금 기능은 곧 출시될 예정이에요 🙏')
      }
      if (this.renderer.hitButton(w / 2, h * 0.678, w * 0.50, 44, px, py)) {
        this._showWithdrawModal = false
      }
      return
    }

    if (this._state === GAME_STATES.TITLE) {
      if (this.renderer.hitButton(w / 2, h * 0.765, w * 0.62, 52, px, py)) {
        this.sound.playClick()
        if (!pointManager.canEarnToday() && !this._isTutorial) {
          this._state = GAME_STATES.DAILY_LIMIT
        } else {
          this._startGame(this._level)
        }
      }
    } else if (this._state === GAME_STATES.WIN) {
      // P3: tutorial just completed — single button goes to TITLE
      if (this._tutorialJustWon) {
        if (this.renderer.hitButton(w / 2, h * 0.710, w * 0.70, 54, px, py)) {
          this.sound.playClick()
          this._tutorialJustWon = false
          this._level = pointManager.getTodayStage()
          this._state = GAME_STATES.TITLE
        }
        return
      }
      const isFinalStage = this._level >= 3 || !pointManager.canEarnToday()
      if (!isFinalStage) {
        if (this.renderer.hitButton(w / 2, h * 0.710, w * 0.70, 54, px, py)) {
          this.sound.playClick()
          this._startGame(this._level + 1)
        }
      } else {
        if (this.renderer.hitButton(w / 2, h * 0.615, w * 0.70, 54, px, py)) {
          this.sound.playClick()
          this._state = GAME_STATES.DAILY_LIMIT
        }
        if (this.renderer.hitButton(w / 2, h * 0.730, w * 0.72, 52, px, py)) {
          this.sound.playClick()
          if (pointManager.canWithdraw()) {
            this._showWithdrawModal = true
          } else {
            const needed = pointManager.WITHDRAW_MIN - pointManager.getTotalPoints()
            window.alert(`${needed}원 더 모으면 출금 가능해요! 내일 또 도전하세요 🍎`)
          }
        }
      }
    } else if (this._state === GAME_STATES.LOSE) {
      if (this.renderer.hitButton(w / 2, h * 0.65, w * 0.80, 52, px, py)) {
        this.sound.playClick()
        this._handleAdRetry()
      }
      if (this.renderer.hitButton(w / 2, h * 0.765, w * 0.62, 44, px, py)) {
        this.sound.playClick()
        this._state = GAME_STATES.TITLE
      }
    } else if (this._state === GAME_STATES.DAILY_LIMIT) {
      if (pointManager.canWithdraw()) {
        if (this.renderer.hitButton(w / 2, h * 0.625, w * 0.65, 52, px, py)) {
          this.sound.playClick()
          this._showWithdrawModal = true
        }
        if (this.renderer.hitButton(w / 2, h * 0.730, w * 0.55, 44, px, py)) {
          this.sound.playClick()
          this._state = GAME_STATES.TITLE
        }
      } else {
        if (this.renderer.hitButton(w / 2, h * 0.685, w * 0.55, 48, px, py)) {
          this.sound.playClick()
          this._state = GAME_STATES.TITLE
        }
      }
    }
  }

  async _handleAdRetry() {
    this._adLoading = true
    const watched = await showRewardedAd()
    this._adLoading = false
    if (watched) {
      this._startGame(this._level)
    }
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
