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
  WIN: 'win',           // 승리 → 포인트 적립 + 다음 단계
  LOSE: 'lose',         // 패배 → 광고 or 타이틀 복귀
  DAILY_LIMIT: 'daily_limit',  // 일일 한도 달성 → 플레이 차단
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this.touchInput = new TouchInput()
    this._state = GAME_STATES.TITLE
    this._level = pointManager.getTodayStage()
    this._winner = null
    this._adLoading = false   // 광고 로딩 중 플래그
    this._lastEarned = 0      // 마지막 승리에서 적립한 포인트
    this._showWithdrawModal = false  // 출금 모달 표시 플래그
    this._rafId = null
    this._lastTime = 0

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
    const ai1Base    = new Base({ x: a1Bx, y: a1By, radius: baseRadius, owner: 'ai1',    color: '#a5b4fc', label: '팬더' })
    const ai2Base    = new Base({ x: a2Bx, y: a2By, radius: baseRadius, owner: 'ai2',    color: '#fde68a', label: '골댕이' })

    // ── Players ──────────────────────────────────────────────────────────────
    const bounds = { w, h }

    this.playerEntity = new Player({ x: pBx, y: pBy, type: 'player', base: playerBase, color: '#f9a8d4', label: '카피바라', emoji: '🦫' })
    this.playerEntity._bounds = bounds

    const ai1 = new AIPlayer({ x: a1Bx, y: a1By, type: 'ai1', base: ai1Base, color: '#a5b4fc', label: '팬더', emoji: '🐼', difficulty: diff })
    ai1._bounds = bounds

    const ai2 = new AIPlayer({ x: a2Bx, y: a2By, type: 'ai2', base: ai2Base, color: '#fde68a', label: '골댕이', emoji: '🐕', difficulty: diff })
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
    this.touchInput.clear()
    this._state = GAME_STATES.PLAYING

    // BGM 재시작 (레벨업/재도전 시 끊김 없이)
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
    if (this._state !== GAME_STATES.PLAYING) return

    // 득점 감지용 이전 카운트
    const prevCounts = this.bases.map(b => b.bottleCount)

    // 터치 위치 → 플레이어 이동 방향
    const dir = this.touchInput.getDirection(this.playerEntity.x, this.playerEntity.y)
    this.playerEntity.vx = dir.x * SPEED
    this.playerEntity.vy = dir.y * SPEED

    for (const player of this.players) {
      player.update(dt, this.bottles, this.bases)
    }

    // 플레이어 베이스에 사과가 추가됐으면 득점음
    this.bases.forEach((base, i) => {
      if (base.owner === 'player' && base.bottleCount > prevCounts[i]) {
        this.sound.playScore()
      }
    })

    for (const base of this.bases) {
      if (base.bottleCount >= WIN_COUNT) {
        this._winner = this.players.find(p => p.base === base)
        this._state = this._winner.type === 'player' ? GAME_STATES.WIN : GAME_STATES.LOSE
        this.touchInput.clear()
        this.sound.stopBGM()
        if (this._state === GAME_STATES.WIN) {
          this._lastEarned = pointManager.awardWin()
          this.sound.playClear()
        } else {
          this.sound.playGameOver()
        }
        return
      }
    }
  }

  _render() {
    const w = this.canvas.width
    const h = this.canvas.height

    switch (this._state) {
      case GAME_STATES.TITLE:
        this.renderer.drawTitle(w, h, this._level, pointManager.getTotalPoints(), pointManager.getTodayEarned())
        break
      case GAME_STATES.PLAYING:
        this.renderer.drawGame({ players: this.players, bottles: this.bottles, bases: this.bases, level: this._level })
        break
      case GAME_STATES.WIN:
        this.renderer.drawWin(w, h, this._level, this._lastEarned, pointManager.getTotalPoints(), pointManager.getTodayEarned(), pointManager.canWithdraw(), !pointManager.canEarnToday())
        break
      case GAME_STATES.LOSE:
        this.renderer.drawLose(w, h, this._level, this._winner, this._adLoading, pointManager.getTotalPoints())
        break
      case GAME_STATES.DAILY_LIMIT:
        this.renderer.drawDailyLimit(w, h, pointManager.getTotalPoints(), pointManager.canWithdraw())
        break
    }

    if (this._showWithdrawModal) {
      this.renderer.drawWithdrawModal(w, h, pointManager.getTotalPoints())
    }
  }

  // ── 입력 처리 ───────────────────────────────────────────────────────────────

  _setupInput() {
    // ── 터치 이벤트 (모바일) ─────────────────────────────────────────────────
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

    // ── 마우스 이벤트 (데스크톱 테스트) ─────────────────────────────────────
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

    // ── 클릭 (데스크톱 버튼) ────────────────────────────────────────────────
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
    if (this._adLoading) return   // 광고 로딩 중 버튼 비활성

    // 최초 터치에서 Web Audio 컨텍스트 활성화
    this.sound.init()

    const [px, py] = this._canvasPos(e.clientX, e.clientY)
    const w = this.canvas.width
    const h = this.canvas.height

    // 출금 모달 처리 (최우선)
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
        if (!pointManager.canEarnToday()) {
          this._state = GAME_STATES.DAILY_LIMIT
        } else {
          this._startGame(this._level)
        }
      }
    } else if (this._state === GAME_STATES.WIN) {
      const isFinalStage = this._level >= 3 || !pointManager.canEarnToday()
      if (!isFinalStage) {
        // 단계 1 & 2: 다음 단계 시작 버튼 (h*0.710)
        if (this.renderer.hitButton(w / 2, h * 0.710, w * 0.70, 54, px, py)) {
          this.sound.playClick()
          this._startGame(this._level + 1)
        }
      } else {
        // 단계 3: 수확 완료 버튼 (h*0.615)
        if (this.renderer.hitButton(w / 2, h * 0.615, w * 0.70, 54, px, py)) {
          this.sound.playClick()
          this._state = GAME_STATES.DAILY_LIMIT
        }
        // 토스 포인트로 교환하기 버튼 (h*0.730)
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
      // 광고 보고 다시 도전
      if (this.renderer.hitButton(w / 2, h * 0.65, w * 0.80, 52, px, py)) {
        this.sound.playClick()
        this._handleAdRetry()
      }
      // 그냥 돌아가기 (레벨 유지)
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
      this._startGame(this._level)   // 같은 레벨 재도전
    }
    // 광고 스킵/실패 시 LOSE 화면 유지
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
