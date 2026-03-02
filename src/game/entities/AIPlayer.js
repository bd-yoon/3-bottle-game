import { Player, SPEED } from './Player.js'
import { distance, normalize } from '../../utils/math.js'

const AI_STATES = {
  IDLE: 'idle',
  FIND_BOTTLE: 'find_bottle',
  RETURN_HOME: 'return_home',
}

// AI is slightly slower than player so human can compete
const AI_SPEED = SPEED * 0.72

export class AIPlayer extends Player {
  constructor(opts) {
    super(opts)
    this._aiState = AI_STATES.IDLE
    this._target = null
    this._thinkTimer = 0
    this._thinkInterval = 0.4 + Math.random() * 0.3  // re-target every ~0.4-0.7s
  }

  update(dt, bottles, bases) {
    this._thinkTimer += dt
    if (this._thinkTimer >= this._thinkInterval) {
      this._thinkTimer = 0
      this._think(bottles, bases)
    }

    // Drive toward current target
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
    if (this.carrying) {
      // Head home
      this._aiState = AI_STATES.RETURN_HOME
      this._target = this.base
    } else {
      // Find nearest accessible bottle (ground state, not already in own base)
      let nearest = null
      let nearestDist = Infinity

      for (const bottle of bottles) {
        if (bottle.state !== 'ground') continue
        // Avoid targeting bottles already in own base
        if (bottle.base === this.base) continue

        const d = distance(this, bottle)
        if (d < nearestDist) {
          nearestDist = d
          nearest = bottle
        }
      }

      if (nearest) {
        this._aiState = AI_STATES.FIND_BOTTLE
        this._target = nearest
      } else {
        this._aiState = AI_STATES.IDLE
        this._target = null
        this.vx = 0
        this.vy = 0
      }
    }
  }
}
