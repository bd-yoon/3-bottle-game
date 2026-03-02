// ─── Renderer ─────────────────────────────────────────────────────────────────
// Responsible for all canvas drawing. Pure visual layer – no game logic here.

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
  }

  resize(w, h) {
    this.canvas.width = w
    this.canvas.height = h
  }

  // ── Entry points ────────────────────────────────────────────────────────────

  drawGame(state) {
    const { ctx } = this
    const w = this.canvas.width
    const h = this.canvas.height

    this._clearBackground(w, h)
    this._drawField(w, h)

    for (const base of state.bases) this._drawBase(base)
    for (const bottle of state.bottles) {
      if (bottle.state === 'ground') this._drawBottle(bottle)
    }
    for (const player of state.players) {
      this._drawPlayer(player)
      if (player.carrying) this._drawBottleCarried(player)
    }

    this._drawHUD(state, w, h)
  }

  drawTitle(w, h) {
    const { ctx } = this
    this._clearBackground(w, h)
    this._drawField(w, h)

    // Title card
    this._roundRect(ctx, w * 0.08, h * 0.18, w * 0.84, h * 0.55, 28,
      'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.18)')

    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.round(w * 0.09)}px sans-serif`
    ctx.fillText('3 Bottle Game', w / 2, h * 0.32)

    // Character preview row
    const chars = [
      { emoji: '🐼', label: 'PANDA', color: '#a5b4fc' },
      { emoji: '🦫', label: 'CAPI', color: '#f9a8d4' },
      { emoji: '🐕', label: 'GOLDIE', color: '#fde68a' },
    ]
    const spacing = w / (chars.length + 1)
    chars.forEach((c, i) => {
      const cx = spacing * (i + 1)
      const cy = h * 0.46

      ctx.beginPath()
      ctx.arc(cx, cy, 30, 0, Math.PI * 2)
      ctx.fillStyle = c.color + '44'
      ctx.fill()
      ctx.strokeStyle = c.color
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = '32px serif'
      ctx.textAlign = 'center'
      ctx.fillText(c.emoji, cx, cy + 11)

      ctx.font = `bold ${Math.round(w * 0.03)}px sans-serif`
      ctx.fillStyle = c.color
      ctx.fillText(c.label, cx, cy + 50)
    })

    ctx.fillStyle = '#fff'
    ctx.font = `${Math.round(w * 0.038)}px sans-serif`
    ctx.fillText('먼저 3개 병을 모으면 승리!', w / 2, h * 0.63)

    // Start button
    this._drawButton(ctx, w / 2, h * 0.76, w * 0.55, 52, '게임 시작', '#4F46E5')
  }

  drawGameOver(winner, w, h) {
    const { ctx } = this
    this._clearBackground(w, h)
    this._drawField(w, h)

    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, w, h)

    // Result card
    this._roundRect(ctx, w * 0.08, h * 0.22, w * 0.84, h * 0.5, 28,
      'rgba(30,28,60,0.92)', 'rgba(255,255,255,0.2)')

    ctx.textAlign = 'center'

    const isPlayerWin = winner.type === 'player'
    const emoji = winner.emoji
    const resultText = isPlayerWin ? '🎉 승리!' : '😢 패배...'
    const subText = isPlayerWin
      ? `${winner.label}가 3병을 모았어요!`
      : `${winner.label}가 먼저 3병을 모았어요!`

    ctx.font = `bold ${Math.round(w * 0.1)}px sans-serif`
    ctx.fillStyle = isPlayerWin ? '#fde68a' : '#a5b4fc'
    ctx.fillText(resultText, w / 2, h * 0.37)

    ctx.font = `40px serif`
    ctx.fillText(emoji, w / 2, h * 0.48)

    ctx.font = `${Math.round(w * 0.04)}px sans-serif`
    ctx.fillStyle = '#e2e8f0'
    ctx.fillText(subText, w / 2, h * 0.56)

    // Restart button
    this._drawButton(ctx, w / 2, h * 0.74, w * 0.55, 52, '다시 하기', '#4F46E5')
  }

  // ── Private drawing helpers ──────────────────────────────────────────────────

  _clearBackground(w, h) {
    const { ctx } = this
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#16213e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  _drawField(w, h) {
    const { ctx } = this
    // Subtle hexagonal grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    const size = 36
    for (let row = 0; row < h / size + 1; row++) {
      for (let col = 0; col < w / size + 1; col++) {
        const x = col * size + (row % 2) * (size / 2)
        const y = row * size
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  _drawBase(base) {
    const { ctx } = this

    // Outer glow ring
    const grad = ctx.createRadialGradient(base.x, base.y, base.radius * 0.5,
      base.x, base.y, base.radius * 1.15)
    grad.addColorStop(0, base.color + '33')
    grad.addColorStop(1, base.color + '00')
    ctx.beginPath()
    ctx.arc(base.x, base.y, base.radius * 1.15, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    // Base circle
    ctx.beginPath()
    ctx.arc(base.x, base.y, base.radius, 0, Math.PI * 2)
    ctx.fillStyle = base.color + '18'
    ctx.fill()
    ctx.strokeStyle = base.color
    ctx.lineWidth = 2.5
    ctx.setLineDash([8, 5])
    ctx.stroke()
    ctx.setLineDash([])

    // Label
    ctx.textAlign = 'center'
    ctx.fillStyle = base.color
    ctx.font = `bold 13px sans-serif`
    ctx.fillText(base.label, base.x, base.y - base.radius - 8)

    // Bottle count indicator  e.g.  ●●○
    const total = 3
    const dotR = 6
    const spacing = dotR * 2.8
    const startX = base.x - ((total - 1) * spacing) / 2
    for (let i = 0; i < total; i++) {
      ctx.beginPath()
      ctx.arc(startX + i * spacing, base.y + base.radius + 14, dotR, 0, Math.PI * 2)
      ctx.fillStyle = i < base.bottleCount ? base.color : 'rgba(255,255,255,0.12)'
      ctx.fill()
    }
  }

  _drawBottle(bottle) {
    const { ctx } = this
    const x = bottle.x
    const y = bottle.y
    const r = bottle.radius

    // Shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 4

    // Bottle body
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.2, r * 0.6, r * 0.85, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#7dd3fc'
    ctx.fill()

    // Bottle neck
    ctx.beginPath()
    ctx.rect(x - r * 0.22, y - r * 0.75, r * 0.44, r * 0.55)
    ctx.fillStyle = '#93c5fd'
    ctx.fill()

    // Cap
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.78, r * 0.28, r * 0.18, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f9a8d4'
    ctx.fill()

    // Shine
    ctx.beginPath()
    ctx.ellipse(x - r * 0.18, y - r * 0.1, r * 0.12, r * 0.3, -0.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fill()

    ctx.restore()
  }

  _drawBottleCarried(player) {
    // Draw bottle slightly above player head
    const bottle = player.carrying
    const x = bottle.x
    const y = bottle.y
    const r = bottle.radius * 0.85

    const { ctx } = this

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.2, r * 0.6, r * 0.85, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#7dd3fc'
    ctx.fill()
    ctx.beginPath()
    ctx.rect(x - r * 0.22, y - r * 0.75, r * 0.44, r * 0.55)
    ctx.fillStyle = '#93c5fd'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.78, r * 0.28, r * 0.18, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f9a8d4'
    ctx.fill()
  }

  _drawPlayer(player) {
    const { ctx } = this
    const x = player.x
    const y = player.y
    const r = player.radius

    if (player.type === 'player') {
      this._drawCapybara(ctx, x, y, r, player.carrying != null)
    } else if (player.type === 'ai1') {
      this._drawPanda(ctx, x, y, r, player.carrying != null)
    } else {
      this._drawGoldenRetriever(ctx, x, y, r, player.carrying != null)
    }

    // Name label
    ctx.textAlign = 'center'
    ctx.fillStyle = player.color
    ctx.font = `bold 11px sans-serif`
    ctx.fillText(player.label, x, y + r + 13)
  }

  // ── Animal drawing functions ──────────────────────────────────────────────────

  _drawCapybara(ctx, x, y, r, carrying) {
    // Body (warm brown ellipse)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 5

    // Body
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.1, r * 0.95, r * 0.85, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#b45309'
    ctx.fill()

    // Face (lighter brown)
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.1, r * 0.7, r * 0.65, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#d97706'
    ctx.fill()

    ctx.restore()

    // Ears (small rounded rectangles on top)
    this._drawEar(ctx, x - r * 0.5, y - r * 0.7, r * 0.22, '#b45309')
    this._drawEar(ctx, x + r * 0.5, y - r * 0.7, r * 0.22, '#b45309')

    // Wide flat nose (capybara signature feature)
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.05, r * 0.42, r * 0.22, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#92400e'
    ctx.fill()

    // Nostrils
    ctx.fillStyle = '#78350f'
    ctx.beginPath()
    ctx.ellipse(x - r * 0.14, y + r * 0.04, r * 0.07, r * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + r * 0.14, y + r * 0.04, r * 0.07, r * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    this._drawEye(ctx, x - r * 0.28, y - r * 0.28)
    this._drawEye(ctx, x + r * 0.28, y - r * 0.28)

    // Happy smile when carrying
    if (carrying) {
      ctx.beginPath()
      ctx.arc(x, y + r * 0.18, r * 0.2, 0.1, Math.PI - 0.1)
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  _drawPanda(ctx, x, y, r, carrying) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 5

    // White body
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.05, r * 0.88, r * 0.88, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()

    ctx.restore()

    // Black ears
    this._drawEar(ctx, x - r * 0.52, y - r * 0.65, r * 0.28, '#1e293b')
    this._drawEar(ctx, x + r * 0.52, y - r * 0.65, r * 0.28, '#1e293b')

    // Black eye patches
    ctx.beginPath()
    ctx.ellipse(x - r * 0.3, y - r * 0.12, r * 0.27, r * 0.22, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + r * 0.3, y - r * 0.12, r * 0.27, r * 0.22, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#1e293b'
    ctx.fill()

    // White eyes
    ctx.beginPath()
    ctx.arc(x - r * 0.3, y - r * 0.14, r * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + r * 0.3, y - r * 0.14, r * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    // Pupils
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(x - r * 0.28, y - r * 0.14, r * 0.06, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + r * 0.28, y - r * 0.14, r * 0.06, 0, Math.PI * 2)
    ctx.fill()

    // Nose
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.08, r * 0.12, r * 0.08, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f9a8d4'
    ctx.fill()

    // Mouth
    ctx.beginPath()
    ctx.arc(x, y + r * 0.2, r * 0.15, 0.15, Math.PI - 0.15)
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  _drawGoldenRetriever(ctx, x, y, r, carrying) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 5

    // Fluffy golden body (slightly larger base)
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.1, r * 1.0, r * 0.92, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f59e0b'
    ctx.fill()

    ctx.restore()

    // Floppy ears
    ctx.beginPath()
    ctx.ellipse(x - r * 0.62, y + r * 0.05, r * 0.28, r * 0.5, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#d97706'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + r * 0.62, y + r * 0.05, r * 0.28, r * 0.5, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#d97706'
    ctx.fill()

    // Face (lighter golden)
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.08, r * 0.68, r * 0.62, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#fcd34d'
    ctx.fill()

    // Eyes
    this._drawEye(ctx, x - r * 0.26, y - r * 0.22)
    this._drawEye(ctx, x + r * 0.26, y - r * 0.22)

    // Nose
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.04, r * 0.16, r * 0.11, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#92400e'
    ctx.fill()

    // Tongue (happy dog!)
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.26, r * 0.18, r * 0.2, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f9a8d4'
    ctx.fill()

    // Tongue line
    ctx.beginPath()
    ctx.moveTo(x, y + r * 0.16)
    ctx.lineTo(x, y + r * 0.44)
    ctx.strokeStyle = '#ec4899'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  _drawEar(ctx, x, y, r, color) {
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  _drawEye(ctx, x, y) {
    // White sclera
    ctx.beginPath()
    ctx.arc(x, y, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    // Pupil
    ctx.beginPath()
    ctx.arc(x + 0.8, y + 0.5, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
    // Shine
    ctx.beginPath()
    ctx.arc(x + 1.5, y - 0.5, 1.2, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────

  _drawHUD(state, w, h) {
    const { ctx } = this

    // Top banner
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, w, 36)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#e2e8f0'
    ctx.font = `bold 14px sans-serif`
    ctx.fillText('먼저 3병을 진영에 모으세요!', w / 2, 23)

    // Player score indicator at bottom
    const player = state.players.find(p => p.type === 'player')
    if (player) {
      const count = player.base.bottleCount
      ctx.fillStyle = player.color
      ctx.font = `bold 13px sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(`나: ${count}/3`, 16, h - 16)
    }
  }

  // ── UI helpers ───────────────────────────────────────────────────────────────

  _roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    if (fill) { ctx.fillStyle = fill; ctx.fill() }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke() }
  }

  _drawButton(ctx, cx, cy, bw, bh, text, color) {
    const x = cx - bw / 2
    const y = cy - bh / 2
    this._roundRect(ctx, x, y, bw, bh, 14, color, 'rgba(255,255,255,0.3)')
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.round(bh * 0.38)}px sans-serif`
    ctx.fillText(text, cx, cy + bh * 0.14)
  }

  // Check if a point is inside a button drawn by _drawButton
  hitButton(cx, cy, bw, bh, px, py) {
    return px >= cx - bw / 2 && px <= cx + bw / 2 &&
      py >= cy - bh / 2 && py <= cy + bh / 2
  }
}
