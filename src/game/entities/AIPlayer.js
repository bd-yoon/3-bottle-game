import { Player, SPEED } from './Player.js'
import { distance, normalize } from '../../utils/math.js'

// ── 난이도 파라미터 계산 ──────────────────────────────────────────────────────
// 구간 1 — 온보딩 (L1~6): 선형 완만 상승, 레벨 1~3은 매우 쉬움
//   L1: speed=0.50, think=0.50s, steal=0.02, harass=0.02  (거의 산책 수준)
//   L6: speed=0.78, think=0.10s, steal=0.14, harass=0.24  (메인 L7 직전)
// 구간 2 — 메인 (L7+): 구버전 L1 난이도에서 시작, 무한 상승
//   L7 (dl=1): speed=0.80, think=0.10s, steal=0.15, harass=0.25
//   L10(dl=4): speed=0.88, think=0.061s, steal=0.375, harass=0.55
export function getDifficultyParams(level) {
  const l = Math.max(1, level)

  // ── 온보딩 구간 L1~6 ─────────────────────────────────────────────────────
  if (l <= 6) {
    const t = (l - 1) / 5  // 0(L1) → 1(L6)
    return {
      speedMult:          0.70 + t * 0.08,   // L1=0.70, L6=0.78
      thinkInterval:      0.50 - t * 0.40,   // L1=0.50s, L6=0.10s
      stealWeight:        0.02 + t * 0.12,   // L1=0.02, L6=0.14
      playerHarassWeight: 0.02 + t * 0.22,   // L1=0.02, L6=0.24
    }
  }

  // ── 메인 구간 L7+ ─────────────────────────────────────────────────────────
  // dl=1이 구버전 L1과 동일, 이후 무한 상승
  const dl = l - 6
  return {
    speedMult:          0.80 + 0.04 * Math.log2(dl),
    thinkInterval:      Math.max(0.02, 0.10 * Math.pow(0.85, dl - 1)),
    stealWeight:        Math.min(0.9, 0.15 + (dl - 1) * 0.075),
    playerHarassWeight: Math.min(1.0, 0.25 + (dl - 1) * 0.10),
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
