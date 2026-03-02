import { distance } from '../../utils/math.js'

export const PLAYER_RADIUS = 22
export const PICKUP_RADIUS = 36
export const BASE_DROP_RADIUS = 60
export const SPEED = 160   // px per second

export class Player {
  constructor({ x, y, type, base, color, label, emoji }) {
    this.x = x
    this.y = y
    this.type = type       // 'player' | 'ai1' | 'ai2'
    this.base = base       // own Base instance
    this.color = color
    this.label = label
    this.emoji = emoji
    this.carrying = null   // Bottle instance or null
    this.radius = PLAYER_RADIUS
    this.vx = 0
    this.vy = 0
    // for carry animation bob
    this._t = 0
  }

  update(dt, bottles, bases) {
    // Move
    this.x += this.vx * dt
    this.y += this.vy * dt

    // Clamp to canvas bounds (set from outside)
    if (this._bounds) {
      this.x = Math.max(this.radius, Math.min(this._bounds.w - this.radius, this.x))
      this.y = Math.max(this.radius, Math.min(this._bounds.h - this.radius, this.y))
    }

    this._t += dt

    // Carrying bottle follows player
    if (this.carrying) {
      this.carrying.x = this.x
      this.carrying.y = this.y - this.radius - 12
    }

    // Auto pickup: empty-handed + touching a ground bottle
    if (!this.carrying) {
      for (const bottle of bottles) {
        if (bottle.state === 'ground' && distance(this, bottle) < PICKUP_RADIUS) {
          this._pickup(bottle)
          break
        }
      }
    }

    // Auto drop: carrying + inside own base
    if (this.carrying && distance(this, this.base) < BASE_DROP_RADIUS) {
      this._drop(this.base)
    }
  }

  _pickup(bottle) {
    if (bottle.base) {
      bottle.base.removeBottle(bottle)
    }
    bottle.state = 'carried'
    bottle.carrier = this
    this.carrying = bottle
  }

  _drop(base) {
    if (!this.carrying) return
    const bottle = this.carrying
    this.carrying = null
    base.addBottle(bottle)
  }
}
