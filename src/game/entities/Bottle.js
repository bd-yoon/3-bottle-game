export class Bottle {
  constructor({ x, y }) {
    this.x = x
    this.y = y
    this.state = 'ground'   // 'ground' | 'carried'
    this.carrier = null     // Player reference when carried
    this.base = null        // Base reference when stored in a base
    this.radius = 14
  }
}
