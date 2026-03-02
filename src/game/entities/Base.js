export class Base {
  constructor({ x, y, radius, owner, color, label }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.owner = owner   // 'player' | 'ai1' | 'ai2'
    this.color = color
    this.label = label
    this.bottles = []    // Bottle instances stored here
  }

  get bottleCount() {
    return this.bottles.length
  }

  addBottle(bottle) {
    this.bottles.push(bottle)
    // Arrange bottles visually inside base
    const angle = (this.bottles.length - 1) * (Math.PI * 2 / 3)
    const r = this.radius * 0.4
    bottle.x = this.x + Math.cos(angle) * r
    bottle.y = this.y + Math.sin(angle) * r
    bottle.state = 'ground'
    bottle.carrier = null
    bottle.base = this
  }

  removeBottle(bottle) {
    this.bottles = this.bottles.filter(b => b !== bottle)
    bottle.base = null
  }

  contains(point) {
    const dx = point.x - this.x
    const dy = point.y - this.y
    return Math.sqrt(dx * dx + dy * dy) < this.radius
  }
}
