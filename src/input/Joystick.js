import nipplejs from 'nipplejs'

export class Joystick {
  constructor(zone) {
    this.x = 0   // -1 to 1
    this.y = 0   // -1 to 1
    this._manager = null
    this._zone = zone
  }

  init() {
    this._manager = nipplejs.create({
      zone: this._zone,
      mode: 'dynamic',
      restJoystick: true,
      color: 'rgba(255,255,255,0.55)',
      size: 90,
      threshold: 0.1,
      fadeTime: 200,
    })

    this._manager.on('move', (evt, data) => {
      if (!data.vector) return
      this.x = data.vector.x    // nippleJS already provides -1..1
      this.y = -data.vector.y   // nippleJS y is inverted vs canvas
    })

    this._manager.on('end', () => {
      this.x = 0
      this.y = 0
    })
  }

  destroy() {
    if (this._manager) {
      this._manager.destroy()
      this._manager = null
    }
  }
}
