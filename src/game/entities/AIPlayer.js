import { Player, SPEED } from './Player.js'
import { distance, normalize } from '../../utils/math.js'

// AI는 플레이어보다 약간 느리지만 판단은 더 빠름
const AI_SPEED = SPEED * 0.82

export class AIPlayer extends Player {
  constructor(opts) {
    super(opts)
    this._target = null
    this._thinkTimer = 0
    // 매 0.1초마다 리타겟 (기존 0.4~0.7s → 대폭 단축)
    this._thinkInterval = 0.08 + Math.random() * 0.05
  }

  update(dt, bottles, bases) {
    this._thinkTimer += dt
    if (this._thinkTimer >= this._thinkInterval) {
      this._thinkTimer = 0
      this._think(bottles, bases)
    }

    if (this._target) {
      const dx = this._target.x - this.x
      const dy = this._target.y - this.y
      const norm = normalize(dx, dy)
      this.vx = norm.x * AI_SPEED
      this.vy = norm.y * AI_SPEED
    } else {
      this.vx = 0
      this.vy = 0
    }

    super.update(dt, bottles, bases)
  }

  _think(bottles, bases) {
    // 들고 있으면 즉시 귀환
    if (this.carrying) {
      this._target = this.base
      return
    }

    // ── 점수 기반 타겟 선택 ────────────────────────────────────────────────────
    // 모든 ground 상태 병 후보를 점수화
    // 점수 = distToMe + 0.4 * distAppleToMyBase  (낮을수록 좋음)
    // 단, 내 베이스에 이미 있는 병은 제외
    let bestTarget = null
    let bestScore = Infinity

    for (const bottle of bottles) {
      if (bottle.state !== 'ground') continue
      if (bottle.base === this.base) continue

      const distToMe = distance(this, bottle)
      const distToBase = distance(bottle, this.base)
      // 상대 베이스 안의 병은 꺼내기 어려우므로 패널티 부여
      const inEnemyBase = bottle.base !== null
      const penalty = inEnemyBase ? 60 : 0

      const score = distToMe + 0.4 * distToBase + penalty
      if (score < bestScore) {
        bestScore = score
        bestTarget = bottle
      }
    }

    if (bestTarget) {
      this._target = bestTarget
      return
    }

    // ── ground 병이 없으면 상대 베이스 병 훔치기 ──────────────────────────────
    // 가장 병이 많은 상대 베이스 선택 (높은 곳이 훔칠 가치가 높음)
    let stealBase = null
    let maxCount = 0

    for (const base of bases) {
      if (base === this.base) continue
      if (base.bottleCount > maxCount) {
        maxCount = base.bottleCount
        stealBase = base
      }
    }

    if (stealBase && stealBase.bottleCount > 0) {
      // 해당 베이스로 이동 (진입하면 Player.update의 auto-pickup이 처리)
      this._target = stealBase
    } else {
      this._target = null
    }
  }
}
