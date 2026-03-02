// ─── Renderer – Pixel Art Style ───────────────────────────────────────────────

const C = {
  sky1:    '#5ec8ff', sky2:    '#9dd9ff', cloud:   '#f5faff',
  grass1:  '#6bcc30', grass2:  '#50a020', grass3:  '#3c7818', grassHL: '#84e040',
  trunk:   '#6b3a10', leaf1:   '#52cc28', leaf2:   '#38a018', leaf3:   '#286414',
  black:   '#1a1a2e', white:   '#f0f5e8',
  panelBg: '#0c1e10', panelHL: '#1e3820', panelSH: '#060e08',
  gold:    '#fcd34d', green:   '#30c860',
  aRed:    '#e83030', aRedDk:  '#901818', aRedLt:  '#ff5858',
  aGreen:  '#38a018', aStem:   '#5a3210',
  capyBr:  '#b87c38', capyLt:  '#d4a060', capyDk:  '#785028',
  pandaW:  '#e8e8e8', pandaB:  '#1a1a2e',
  goldnYl: '#f0a020', goldnLt: '#f8c840', goldnDk: '#b07818',
  pink:    '#f47890',
  pPlayer: '#f9a8d4', pAI1:    '#a5b4fc', pAI2:    '#fde68a',
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this._trees = null
    this._clouds = null
  }

  resize(w, h) {
    this.canvas.width = w
    this.canvas.height = h
    this.ctx.imageSmoothingEnabled = false
    this._trees = this._generateTrees(w, h)
    this._clouds = this._generateClouds(w, h)
  }

  // ── Entry points ────────────────────────────────────────────────────────────

  drawGame(state) {
    const w = this.canvas.width
    const h = this.canvas.height
    this._drawBg(w, h)
    for (const base of state.bases) this._drawBase(base)
    for (const apple of state.bottles) {
      if (apple.state === 'ground') this._drawApple(apple.x, apple.y, apple.radius)
    }
    for (const player of state.players) {
      this._drawPlayer(player)
      if (player.carrying) this._drawAppleCarried(player)
    }
    this._drawHUD(state, w, h)
  }

  drawTitle(w, h, level) {
    const { ctx } = this
    this._drawBg(w, h)
    this._panel(w * 0.06, h * 0.13, w * 0.88, h * 0.60)

    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = `bold ${Math.round(w * 0.09)}px 'Courier New', monospace`
    ctx.fillText('3 APPLE', w / 2, h * 0.25)
    ctx.fillStyle = C.white
    ctx.font = `bold ${Math.round(w * 0.055)}px 'Courier New', monospace`
    ctx.fillText('GAME', w / 2, h * 0.32)

    this._levelBadge(w / 2, h * 0.385, level, false)

    const chars = [
      { type: 'ai1',    label: 'PANDA',  col: C.pAI1   },
      { type: 'player', label: 'CAPI',   col: C.pPlayer },
      { type: 'ai2',    label: 'GOLDIE', col: C.pAI2   },
    ]
    const sp = w / 4
    chars.forEach((c, i) => {
      const cx = sp * (i + 1)
      const cy = h * 0.505
      const r  = Math.round(w * 0.07)
      this._pxFrame(cx - r - 3, cy - r - 3, (r + 3) * 2, (r + 3) * 2, c.col)
      if (c.type === 'player')   this._drawCapybara(ctx, cx, cy, r, false)
      else if (c.type === 'ai1') this._drawPanda(ctx, cx, cy, r, false)
      else                       this._drawGolden(ctx, cx, cy, r, false)
      ctx.textAlign = 'center'
      ctx.fillStyle = c.col
      ctx.font = `bold ${Math.round(w * 0.026)}px 'Courier New', monospace`
      ctx.fillText(c.label, cx, cy + r + 16)
    })

    ctx.fillStyle = '#a0d890'
    ctx.font = `${Math.round(w * 0.030)}px 'Courier New', monospace`
    ctx.textAlign = 'center'
    ctx.fillText('COLLECT 3 APPLES TO WIN!', w / 2, h * 0.675)

    this._btn(w / 2, h * 0.765, w * 0.62, 52, '> GAME START <', '#2a6e3a')
  }

  drawWin(w, h, level) {
    const { ctx } = this
    this._drawBg(w, h)
    ctx.fillStyle = 'rgba(0,10,0,0.55)'
    ctx.fillRect(0, 0, w, h)
    this._panel(w * 0.06, h * 0.18, w * 0.88, h * 0.58)

    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = `bold ${Math.round(w * 0.12)}px 'Courier New', monospace`
    ctx.fillText('CLEAR!', w / 2, h * 0.31)
    ctx.fillStyle = C.green
    ctx.font = `bold ${Math.round(w * 0.040)}px 'Courier New', monospace`
    ctx.fillText(`LEVEL ${level} COMPLETE`, w / 2, h * 0.41)

    this._levelBadge(w / 2, h * 0.50, level + 1, true)

    ctx.fillStyle = '#80ff60'
    ctx.font = `${Math.round(w * 0.030)}px 'Courier New', monospace`
    ctx.fillText('DIFFICULTY UP!', w / 2, h * 0.595)

    this._btn(w / 2, h * 0.725, w * 0.70, 54, `> LEVEL ${level + 1} START`, '#1a6a2e')
  }

  drawLose(w, h, level, winner, adLoading) {
    const { ctx } = this
    this._drawBg(w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.60)'
    ctx.fillRect(0, 0, w, h)
    this._panel(w * 0.06, h * 0.15, w * 0.88, h * 0.70)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff5050'
    ctx.font = `bold ${Math.round(w * 0.095)}px 'Courier New', monospace`
    ctx.fillText('GAME OVER', w / 2, h * 0.265)

    const wx = w / 2, wy = h * 0.365, wr = Math.round(w * 0.075)
    if (winner.type === 'player')   this._drawCapybara(ctx, wx, wy, wr, false)
    else if (winner.type === 'ai1') this._drawPanda(ctx, wx, wy, wr, false)
    else                            this._drawGolden(ctx, wx, wy, wr, false)

    ctx.fillStyle = winner.color || C.white
    ctx.font = `bold ${Math.round(w * 0.036)}px 'Courier New', monospace`
    ctx.fillText(`${winner.label} WINS!`, w / 2, h * 0.465)

    this._levelBadge(w / 2, h * 0.530, level, false)

    if (adLoading) {
      this._btn(w / 2, h * 0.650, w * 0.80, 52, 'LOADING...', '#555')
    } else {
      this._btn(w / 2, h * 0.650, w * 0.80, 52, '> WATCH AD & RETRY', '#a04810')
    }
    this._btn(w / 2, h * 0.765, w * 0.62, 44, '> RESTART (LV.1)', '#3a3a60')

    if (adLoading) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = C.white
      ctx.font = `bold ${Math.round(w * 0.045)}px 'Courier New', monospace`
      ctx.textAlign = 'center'
      ctx.fillText('LOADING...', w / 2, h / 2)
    }
  }

  // ── Background ────────────────────────────────────────────────────────────

  _drawBg(w, h) {
    const { ctx } = this
    // Sky
    ctx.fillStyle = C.sky1
    ctx.fillRect(0, 0, w, h * 0.58)
    ctx.fillStyle = C.sky2
    ctx.fillRect(0, h * 0.38, w, h * 0.22)

    // Pixel clouds
    if (this._clouds) {
      for (const cl of this._clouds) this._pixelCloud(cl.x, cl.y, cl.s)
    }

    // Ground
    ctx.fillStyle = C.grass1
    ctx.fillRect(0, h * 0.56, w, h * 0.44)
    // Grass highlight strip
    ctx.fillStyle = C.grassHL
    ctx.fillRect(0, h * 0.56, w, 3)
    ctx.fillStyle = C.grass2
    ctx.fillRect(0, h * 0.56 + 3, w, 3)

    // Grass tufts (pixel pattern)
    const gp = Math.max(3, Math.round(w / 65))
    ctx.fillStyle = C.grass3
    for (let i = 0; gp * i * 7 < w; i++) {
      const gx = gp * i * 7
      const gy = Math.round(h * 0.56 + 5)
      ctx.fillRect(gx,           gy,                    gp, Math.round(h * 0.025))
      ctx.fillRect(gx + gp * 3,  gy + Math.round(h * 0.01), gp, Math.round(h * 0.018))
    }
    // Dark bottom strip
    ctx.fillStyle = C.grass3
    ctx.fillRect(0, h * 0.93, w, h * 0.07)

    // Trees (drawn as part of background)
    this._drawTrees()
  }

  _generateClouds(w, h) {
    return [
      { x: w * 0.12, y: h * 0.07, s: w * 0.14 },
      { x: w * 0.52, y: h * 0.04, s: w * 0.18 },
      { x: w * 0.82, y: h * 0.10, s: w * 0.12 },
      { x: w * 0.35, y: h * 0.16, s: w * 0.10 },
    ]
  }

  _pixelCloud(x, y, s) {
    const { ctx } = this
    const p = Math.max(4, Math.round(s / 8))
    ctx.fillStyle = C.cloud
    const parts = [[-1.5, 0, 3, 1], [-1, -1, 2, 1], [-0.5, -2, 1, 1], [1.5, 0, 1, 1], [-2.5, 0, 1, 1]]
    for (const [ox, oy, pw, ph] of parts) {
      ctx.fillRect(Math.round(x + ox * p), Math.round(y + oy * p), Math.round(pw * p), Math.round(ph * p))
    }
  }

  _generateTrees(w, h) {
    const pos = [
      { x: 0.04, y: 0.01 }, { x: 0.15, y: -0.01 }, { x: 0.27, y: 0.02 },
      { x: 0.40, y: -0.01 }, { x: 0.53, y: 0.01 }, { x: 0.66, y: -0.01 },
      { x: 0.78, y: 0.02 }, { x: 0.90, y: -0.01 },
      { x: 0.05, y: 0.95 }, { x: 0.18, y: 0.97 }, { x: 0.30, y: 0.94 },
      { x: 0.70, y: 0.96 }, { x: 0.82, y: 0.94 }, { x: 0.94, y: 0.97 },
      { x: -0.01, y: 0.14 }, { x: 0.01, y: 0.30 }, { x: -0.01, y: 0.46 },
      { x: 0.01,  y: 0.62 }, { x: -0.01, y: 0.78 },
      { x: 0.97, y: 0.17 }, { x: 0.99, y: 0.33 }, { x: 0.97, y: 0.49 },
      { x: 0.99, y: 0.65 }, { x: 0.97, y: 0.81 },
    ]
    const sizes = [28, 24, 32, 26, 30, 22, 34, 28, 25, 29, 31, 23, 27, 33, 28, 24]
    return pos.map((p, i) => ({ x: p.x * w, y: p.y * h, size: sizes[i % sizes.length] }))
  }

  _drawTrees() {
    if (!this._trees) return
    for (const t of this._trees) this._pixelTree(t.x, t.y, t.size)
  }

  _pixelTree(x, y, s) {
    const { ctx } = this
    const p  = Math.max(2, Math.round(s / 5))
    const cx = Math.round(x)
    const top = Math.round(y)

    // Trunk
    ctx.fillStyle = C.trunk
    ctx.fillRect(cx - p, top + p * 5, p * 2, p * 3)
    ctx.fillStyle = C.leaf3
    ctx.fillRect(cx,     top + p * 5, p,     p * 3)  // trunk shadow

    // 3-layer stepped crown (bottom widest)
    const layers = [
      { y: top + p * 3, w: 3, col: C.leaf2 },
      { y: top + p * 1, w: 2, col: C.leaf2 },
      { y: top,         w: 1, col: C.leaf2 },
    ]
    for (const l of layers) {
      ctx.fillStyle = l.col
      ctx.fillRect(cx - l.w * p, l.y, l.w * p * 2, p * 2)
      ctx.fillStyle = C.leaf1  // top highlight
      ctx.fillRect(cx - l.w * p, l.y, l.w * p * 2, p)
      ctx.fillStyle = C.leaf3  // right shadow
      ctx.fillRect(cx + (l.w - 1) * p, l.y, p, p * 2)
    }

    // Black pixel outlines
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 3 - 1, top + p * 3, 1, p * 2)
    ctx.fillRect(cx + p * 3,     top + p * 3, 1, p * 2)
    ctx.fillRect(cx - p * 2 - 1, top + p,     1, p * 2)
    ctx.fillRect(cx + p * 2,     top + p,     1, p * 2)
    ctx.fillRect(cx - p - 1,     top,         1, p)
    ctx.fillRect(cx + p,         top,         1, p)
    ctx.fillRect(cx - p * 3, top + p * 3 - 1, p * 6, 1)
    ctx.fillRect(cx - p * 2, top + p - 1,     p * 4, 1)
    ctx.fillRect(cx - p,     top - 1,          p * 2, 1)
  }

  // ── Apple ─────────────────────────────────────────────────────────────────

  _drawApple(x, y, r) {
    const { ctx } = this
    const p  = Math.max(2, Math.round(r / 4))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // Stem & leaf (above outline)
    ctx.fillStyle = C.aStem
    ctx.fillRect(cx, cy - p * 3, p, p)
    ctx.fillStyle = C.aGreen
    ctx.fillRect(cx + p, cy - p * 4, p, p)
    ctx.fillRect(cx + p, cy - p * 3, p, p)

    // Black outline
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 2 - 1, cy - p * 2 - 1, p * 4 + 2, p * 5 + 2)

    // Body
    ctx.fillStyle = C.aRed
    ctx.fillRect(cx - p,     cy - p * 2, p * 2, p)      // top bump
    ctx.fillRect(cx - p * 2, cy - p,     p * 4, p * 3)  // main body
    ctx.fillRect(cx - p,     cy + p * 2, p * 2, p)      // bottom bump

    // Highlight top-left
    ctx.fillStyle = C.aRedLt
    ctx.fillRect(cx - p * 2, cy - p, p, p)

    // Shadow right side
    ctx.fillStyle = C.aRedDk
    ctx.fillRect(cx + p, cy - p, p, p * 3)
    ctx.fillRect(cx - p, cy + p * 2, p * 2, p)
  }

  _drawAppleCarried(player) {
    const apple = player.carrying
    this._drawApple(apple.x, apple.y, apple.radius * 0.82)
  }

  // ── Base ──────────────────────────────────────────────────────────────────

  _drawBase(base) {
    const { ctx } = this
    const r  = base.radius
    const bx = Math.round(base.x - r)
    const by = Math.round(base.y - r)
    const bs = Math.round(r * 2)
    const bp = Math.max(3, Math.round(r / 12))

    // Fill
    ctx.fillStyle = 'rgba(10,40,15,0.55)'
    ctx.fillRect(bx, by, bs, bs)

    // Pixel border
    ctx.fillStyle = base.color
    ctx.fillRect(bx,          by,          bs, bp)
    ctx.fillRect(bx,          by + bs - bp, bs, bp)
    ctx.fillRect(bx,          by,          bp, bs)
    ctx.fillRect(bx + bs - bp, by,          bp, bs)

    // White corner squares
    const cs = bp * 2
    ctx.fillStyle = C.white
    ctx.fillRect(bx,          by,          cs, cs)
    ctx.fillRect(bx + bs - cs, by,          cs, cs)
    ctx.fillRect(bx,          by + bs - cs, cs, cs)
    ctx.fillRect(bx + bs - cs, by + bs - cs, cs, cs)

    // Label
    ctx.textAlign = 'center'
    ctx.fillStyle = base.color
    ctx.font = `bold 12px 'Courier New', monospace`
    ctx.fillText(base.label, base.x, by - 5)

    // Apple count dots
    const total = 3
    const dp    = bp * 2 + 2
    const gap   = dp + 4
    const startX = base.x - ((total - 1) * gap) / 2
    for (let i = 0; i < total; i++) {
      const dx = Math.round(startX + i * gap)
      const dy = Math.round(by + bs + 6)
      if (i < base.bottleCount) {
        ctx.fillStyle = C.black
        ctx.fillRect(dx - dp / 2 - 1, dy - 1, dp + 2, dp + 2)
        ctx.fillStyle = C.aRed
        ctx.fillRect(dx - dp / 2, dy, dp, dp)
        ctx.fillStyle = C.aRedLt
        ctx.fillRect(dx - dp / 2, dy, Math.ceil(dp / 2), Math.ceil(dp / 2))
      } else {
        ctx.fillStyle = base.color + '50'
        ctx.fillRect(dx - dp / 2, dy, dp, dp)
        ctx.fillStyle = base.color
        ctx.fillRect(dx - dp / 2, dy, dp, 1)
        ctx.fillRect(dx - dp / 2, dy, 1,  dp)
      }
    }
  }

  // ── Player ────────────────────────────────────────────────────────────────

  _drawPlayer(player) {
    const { ctx } = this
    const x = Math.round(player.x)
    const y = Math.round(player.y)
    const r = player.radius

    if (player.type === 'player')   this._drawCapybara(ctx, x, y, r, player.carrying != null)
    else if (player.type === 'ai1') this._drawPanda(ctx, x, y, r, player.carrying != null)
    else                            this._drawGolden(ctx, x, y, r, player.carrying != null)

    ctx.textAlign = 'center'
    ctx.fillStyle = player.color
    ctx.font = `bold 10px 'Courier New', monospace`
    ctx.fillText(player.label, x, y + r + 14)
  }

  // ── Pixel art animal sprites ───────────────────────────────────────────────

  _drawCapybara(ctx, x, y, r, carrying) {
    const p  = Math.max(2, Math.round(r / 5.5))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // Outline
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 4 - 1, cy - p * 5 - 1, p * 8 + 2, p * 8 + 2)

    // Body (wide, chunky)
    ctx.fillStyle = C.capyBr
    ctx.fillRect(cx - p * 4, cy,      p * 8, p * 3)   // lower body
    ctx.fillRect(cx - p * 3, cy - p * 4, p * 6, p * 4) // head/upper

    // Light top
    ctx.fillStyle = C.capyLt
    ctx.fillRect(cx - p * 3, cy - p * 4, p * 6, p)   // head top
    ctx.fillRect(cx - p * 4, cy,          p * 8, p)   // body top

    // Dark belly
    ctx.fillStyle = C.capyDk
    ctx.fillRect(cx - p * 3, cy + p * 2, p * 6, p)

    // Ears
    ctx.fillStyle = C.capyBr
    ctx.fillRect(cx - p * 3, cy - p * 5, p * 2, p)
    ctx.fillRect(cx + p,     cy - p * 5, p * 2, p)
    ctx.fillStyle = C.pink
    ctx.fillRect(cx - p * 2, cy - p * 5, p, p)
    ctx.fillRect(cx + p * 1, cy - p * 5, p, p)

    // Eyes
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 2, cy - p * 2, p, p)
    ctx.fillRect(cx + p,     cy - p * 2, p, p)
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p * 2, cy - p * 2, Math.ceil(p * 0.5), Math.ceil(p * 0.5))
    ctx.fillRect(cx + p,     cy - p * 2, Math.ceil(p * 0.5), Math.ceil(p * 0.5))

    // Wide flat nose
    ctx.fillStyle = C.capyDk
    ctx.fillRect(cx - p * 2, cy - p, p * 4, p)
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 1.5, cy - p, Math.ceil(p * 0.5), Math.ceil(p * 0.5))
    ctx.fillRect(cx + p * 0.5, cy - p, Math.ceil(p * 0.5), Math.ceil(p * 0.5))

    if (carrying) {
      ctx.fillStyle = C.capyDk
      ctx.fillRect(cx - p, cy, p * 2, Math.ceil(p * 0.4))
    }
  }

  _drawPanda(ctx, x, y, r, carrying) {
    const p  = Math.max(2, Math.round(r / 5.5))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // Black base
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p * 4 - 1, cy - p * 5 - 1, p * 8 + 2, p * 8 + 2)

    // White body
    ctx.fillStyle = C.pandaW
    ctx.fillRect(cx - p * 3, cy - p * 4, p * 6, p * 7)

    // Black ears
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p * 3, cy - p * 5, p * 2, p)
    ctx.fillRect(cx + p,     cy - p * 5, p * 2, p)

    // Black eye patches
    ctx.fillRect(cx - p * 3, cy - p * 2, p * 2, p * 2)
    ctx.fillRect(cx + p,     cy - p * 2, p * 2, p * 2)

    // White eyes
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p * 2.5, cy - p * 2, p, p)
    ctx.fillRect(cx + p * 1.5, cy - p * 2, p, p)

    // Pupils
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p * 2,  cy - p * 1.5, Math.ceil(p * 0.5), Math.ceil(p * 0.5))
    ctx.fillRect(cx + p * 1.5, cy - p * 1.5, Math.ceil(p * 0.5), Math.ceil(p * 0.5))

    // Pink nose
    ctx.fillStyle = C.pink
    ctx.fillRect(cx - Math.ceil(p * 0.5), cy, p, Math.ceil(p * 0.5))

    // Smile
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p, cy + Math.ceil(p * 0.5), p * 2, Math.ceil(p * 0.4))

    if (carrying) {
      ctx.fillStyle = C.aGreen
      ctx.fillRect(cx + p * 2, cy - p * 5, p, p * 3)
    }
  }

  _drawGolden(ctx, x, y, r, carrying) {
    const p  = Math.max(2, Math.round(r / 5.5))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // Outline
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 4 - 1, cy - p * 5 - 1, p * 8 + 2, p * 8 + 2)

    // Floppy ears
    ctx.fillStyle = C.goldnDk
    ctx.fillRect(cx - p * 4, cy - p * 2, p * 2, p * 4)
    ctx.fillRect(cx + p * 2, cy - p * 2, p * 2, p * 4)

    // Body
    ctx.fillStyle = C.goldnYl
    ctx.fillRect(cx - p * 3, cy - p * 4, p * 6, p * 7)

    // Face (lighter)
    ctx.fillStyle = C.goldnLt
    ctx.fillRect(cx - p * 2, cy - p * 3, p * 4, p * 4)

    // Eyes
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 1.5, cy - p * 2, p, p)
    ctx.fillRect(cx + p * 0.5, cy - p * 2, p, p)
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p * 1.5, cy - p * 2, Math.ceil(p * 0.5), Math.ceil(p * 0.5))
    ctx.fillRect(cx + p * 0.5, cy - p * 2, Math.ceil(p * 0.5), Math.ceil(p * 0.5))

    // Nose
    ctx.fillStyle = C.capyDk
    ctx.fillRect(cx - p, cy - p * 0.5, p * 2, p)

    // Tongue
    ctx.fillStyle = C.pink
    ctx.fillRect(cx - Math.ceil(p * 0.5), cy + Math.ceil(p * 0.5), p, p)

    if (carrying) {
      ctx.fillStyle = C.goldnYl
      ctx.fillRect(cx + p * 3, cy - p * 4, p, p * 2)
      ctx.fillRect(cx + p * 4, cy - p * 5, p, p)
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _drawHUD(state, w, _h) {
    const { ctx } = this
    ctx.fillStyle = C.black
    ctx.fillRect(0, 0, w, 40)
    ctx.fillStyle = '#18302a'
    ctx.fillRect(0, 3, w, 35)
    ctx.fillStyle = '#28504a'
    ctx.fillRect(0, 3, w, 3)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#70ffb0'
    ctx.font = `bold 13px 'Courier New', monospace`
    ctx.fillText('COLLECT 3 APPLES!', w / 2, 25)

    const player = state.players.find(p => p.type === 'player')
    if (player) {
      ctx.fillStyle = C.pPlayer
      ctx.font = `bold 12px 'Courier New', monospace`
      ctx.textAlign = 'left'
      ctx.fillText(`YOU:${player.base.bottleCount}/3`, 12, 25)
    }
    ctx.textAlign = 'right'
    ctx.fillStyle = C.gold
    ctx.font = `bold 12px 'Courier New', monospace`
    ctx.fillText(`LV.${state.level}`, w - 10, 25)
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  _levelBadge(cx, cy, level, isNext) {
    const { ctx } = this
    const bw = 160, bh = 36
    const col = isNext ? '#1a7030' : '#1a4060'
    ctx.fillStyle = C.black
    ctx.fillRect(cx - bw / 2 - 2, cy - bh / 2 - 2, bw + 4, bh + 4)
    ctx.fillStyle = col
    ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, 3)
    ctx.fillRect(cx - bw / 2, cy - bh / 2, 3, bh)
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    ctx.fillRect(cx - bw / 2,     cy + bh / 2 - 3, bw, 3)
    ctx.fillRect(cx + bw / 2 - 3, cy - bh / 2,     3,  bh)
    ctx.textAlign = 'center'
    ctx.fillStyle = C.white
    ctx.font = `bold 14px 'Courier New', monospace`
    ctx.fillText(isNext ? `NEXT: LV.${level}` : `LV.${level}`, cx, cy + 5)
  }

  _panel(x, y, w, h) {
    const { ctx } = this
    const b = 4
    ctx.fillStyle = C.black
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = C.panelBg
    ctx.fillRect(x + b, y + b, w - b * 2, h - b * 2)
    ctx.fillStyle = C.panelHL
    ctx.fillRect(x + b, y + b, w - b * 2, b)
    ctx.fillRect(x + b, y + b, b, h - b * 2)
    ctx.fillStyle = C.panelSH
    ctx.fillRect(x + b, y + h - b * 2, w - b * 2, b)
    ctx.fillRect(x + w - b * 2, y + b, b, h - b * 2)
  }

  _pxFrame(x, y, w, h, color) {
    const { ctx } = this
    ctx.fillStyle = C.black
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
    ctx.fillStyle = color + '40'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, 2)
    ctx.fillRect(x, y, 2, h)
  }

  _btn(cx, cy, bw, bh, text, color) {
    const { ctx } = this
    const x = Math.round(cx - bw / 2)
    const y = Math.round(cy - bh / 2)
    const b = 4
    ctx.fillStyle = C.black
    ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4)
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(x + b, y + bh, bw, b)
    ctx.fillRect(x + bw, y + b, b,  bh)
    ctx.fillStyle = color
    ctx.fillRect(x, y, bw, bh)
    ctx.fillStyle = 'rgba(255,255,255,0.30)'
    ctx.fillRect(x, y, bw, b)
    ctx.fillRect(x, y, b,  bh)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x,      y + bh - b, bw, b)
    ctx.fillRect(x + bw - b, y,      b,  bh)
    ctx.textAlign = 'center'
    ctx.fillStyle = C.white
    ctx.font = `bold ${Math.round(bh * 0.38)}px 'Courier New', monospace`
    ctx.fillText(text, cx, cy + bh * 0.14)
  }

  // Keep for Game.js compatibility
  _drawButton(_ctx, cx, cy, bw, bh, text, color) {
    this._btn(cx, cy, bw, bh, text, color)
  }

  hitButton(cx, cy, bw, bh, px, py) {
    return px >= cx - bw / 2 && px <= cx + bw / 2 &&
           py >= cy - bh / 2 && py <= cy + bh / 2
  }
}
