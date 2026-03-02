import { Player, SPEED } from './Player.js'
import { distance, normalize } from '../../utils/math.js'

// ── 난이도 파라미터 계산 ──────────────────────────────────────────────────────
// 레벨이 올라갈수록:
//   - AI 속도 증가 (로그 스케일, 상한 없음)
//   - 반응 속도 증가 (지수 감소, 최소 0.02s)
//   - 훔치기 공격성 증가 (선형, 최대 0.9)
export function getDifficultyParams(level) {
  const l = Math.max(1, level)
  return {
    // L1=0.72, L5=0.84, L10=0.95, L20=1.07, L40=1.18 ...
    speedMult: 0.72 + 0.035 * Math.log2(l),
    // L1=0.14s, L3=0.10s, L6=0.07s, L12=0.04s, L25+=0.02s(floor)
    thinkInterval: Math.max(0.02, 0.14 * Math.pow(0.85, l - 1)),
    // L1=0, L5=0.24, L10=0.54, L16=0.9(cap)
    stealWeight: Math.min(0.9, (l - 1) * 0.06),
  }
}

export class AIPlayer extends Player {
  constructor(opts) {
    super(opts)
    const diff = opts.difficulty || getDifficultyParams(1)
    this._speedMult = diff.speedMult
    this._thinkInterval = diff.thinkInterval + Math.random() * 0.03
    this._stealWeight = diff.stealWeight
    this._target = null
    this._thinkTimer = 0
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
      const spd = SPEED * this._speedMult
      this.vx = norm.x * spd
      this.vy = norm.y * spd
    } else {
      this.vx = 0
      this.vy = 0
    }

    super.update(dt, bottles, bases)
  }

  _think(bottles, bases) {
    if (this.carrying) {
      this._target = this.base
      return
    }

    // ── 점수 기반 타겟 선택 ──────────────────────────────────────────────────
    // 점수 = distToMe + 0.4 * distAppleToMyBase + 상대베이스 페널티
    // stealWeight가 높을수록 상대 베이스 사과도 적극 노림
    let bestTarget = null
    let bestScore = Infinity

    for (const bottle of bottles) {
      if (bottle.state !== 'ground') continue
      if (bottle.base === this.base) continue

      const distToMe = distance(this, bottle)
      const distToBase = distance(bottle, this.base)

      // 상대 베이스 안의 사과는 stealWeight에 따라 페널티 감소
      // stealWeight=0: 패널티 60 (거의 안 훔침)
      // stealWeight=0.9: 패널티 6 (적극적으로 훔침)
      let penalty = 0
      if (bottle.base !== null) {
        const basePenalty = 60 * (1 - this._stealWeight)
        // 플레이어 베이스는 추가 공격 보너스
        const isPlayerBase = bottle.base.owner === 'player'
        const aggBonus = isPlayerBase ? this._stealWeight * 20 : 0
        penalty = basePenalty - aggBonus
      }

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

    // ── 바닥 사과 없을 때: 가장 사과 많은 상대 베이스 훔치기 ─────────────────
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
      this._target = stealBase
    } else {
      this._target = null
    }
  }
}
