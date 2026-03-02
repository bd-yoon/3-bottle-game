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
    // 전반적 속도 상향: L1=0.80, L5=0.89, L10=1.00, L20=1.11 ...
    speedMult: 0.80 + 0.04 * Math.log2(l),
    // 반응 빠르게: L1=0.10s, L5=0.053s, L10=0.027s, L18+=0.02s(floor)
    thinkInterval: Math.max(0.02, 0.10 * Math.pow(0.85, l - 1)),
    // 일반 훔치기 공격성: L1=0.15, L5=0.43, L10=0.78, L12+=0.9(cap)
    stealWeight: Math.min(0.9, 0.15 + (l - 1) * 0.075),
    // 플레이어 집중 공략: L1=0.25, L5=0.57, L9+=1.0(cap) — 항상 AI끼리보다 플레이어를 더 노림
    playerHarassWeight: Math.min(1.0, 0.25 + (l - 1) * 0.10),
  }
}

export class AIPlayer extends Player {
  constructor(opts) {
    super(opts)
    const diff = opts.difficulty || getDifficultyParams(1)
    this._speedMult = diff.speedMult
    this._thinkInterval = diff.thinkInterval + Math.random() * 0.02
    this._stealWeight = diff.stealWeight
    this._playerHarassWeight = diff.playerHarassWeight
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
      // 플레이어 베이스는 playerHarassWeight로 별도 강화 보너스 적용
      let penalty = 0
      if (bottle.base !== null) {
        const isPlayerBase = bottle.base.owner === 'player'
        if (isPlayerBase) {
          // 플레이어 베이스 전용: 거리 불리를 극복하도록 강한 보너스
          // L1: 60*0.75 - 0.25*50 = 45-12.5 = 32.5
          // L5: 60*0.57 - 0.57*50 = 34.2-28.5 = 5.7  (중립 수준)
          // L9+: 음수 → 중앙 사과보다 플레이어 베이스를 더 선호
          penalty = 60 * (1 - this._stealWeight) - this._playerHarassWeight * 50
        } else {
          // AI끼리: 일반 stealWeight만 적용 (플레이어보다 덜 노림)
          penalty = 60 * (1 - this._stealWeight) + 15
        }
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
