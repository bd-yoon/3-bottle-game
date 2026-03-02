// ─── Renderer ─────────────────────────────────────────────────────────────────
// Responsible for all canvas drawing. Pure visual layer – no game logic here.

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    // Pre-generate stable tree positions (seed with fixed values)
    this._trees = null
  }

  resize(w, h) {
    this.canvas.width = w
    this.canvas.height = h
    this._trees = this._generateTrees(w, h)
  }

  // ── Entry points ────────────────────────────────────────────────────────────

  drawGame(state) {
    const w = this.canvas.width
    const h = this.canvas.height

    this._clearBackground(w, h)
    this._drawField(w, h)
    this._drawTrees()

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
    this._clearBackground(w, h)
    this._drawField(w, h)
    this._drawTrees()

    // Title card
    this._roundRect(ctx, w * 0.08, h * 0.15, w * 0.84, h * 0.58, 28,
      'rgba(0,30,0,0.55)', 'rgba(100,200,100,0.35)')

    ctx.textAlign = 'center'
    ctx.fillStyle = '#e8f5e9'
    ctx.font = `bold ${Math.round(w * 0.085)}px sans-serif`
    ctx.fillText('🍎 3 Apple Game', w / 2, h * 0.27)

    // Level badge
    this._drawLevelBadge(ctx, w / 2, h * 0.35, level, false)

    // Character preview row
    const chars = [
      { emoji: '🐼', label: 'PANDA', color: '#a5b4fc' },
      { emoji: '🦫', label: 'CAPI', color: '#f9a8d4' },
      { emoji: '🐕', label: 'GOLDIE', color: '#fde68a' },
    ]
    const spacing = w / (chars.length + 1)
    chars.forEach((c, i) => {
      const cx = spacing * (i + 1)
      const cy = h * 0.50

      ctx.beginPath()
      ctx.arc(cx, cy, 28, 0, Math.PI * 2)
      ctx.fillStyle = c.color + '44'
      ctx.fill()
      ctx.strokeStyle = c.color
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = '30px serif'
      ctx.textAlign = 'center'
      ctx.fillText(c.emoji, cx, cy + 10)

      ctx.font = `bold ${Math.round(w * 0.028)}px sans-serif`
      ctx.fillStyle = c.color
      ctx.fillText(c.label, cx, cy + 46)
    })

    ctx.fillStyle = '#c8e6c9'
    ctx.font = `${Math.round(w * 0.036)}px sans-serif`
    ctx.fillText('먼저 3개 사과를 모으면 승리!', w / 2, h * 0.67)

    this._drawButton(ctx, w / 2, h * 0.76, w * 0.55, 52, '게임 시작', '#2d6a4f')
  }

  // ── 승리 화면 ─────────────────────────────────────────────────────────────────
  drawWin(w, h, level) {
    const { ctx } = this
    this._clearBackground(w, h)
    this._drawField(w, h)
    this._drawTrees()

    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, w, h)

    this._roundRect(ctx, w * 0.07, h * 0.18, w * 0.86, h * 0.62, 28,
      'rgba(0,40,0,0.92)', 'rgba(100,220,100,0.4)')

    ctx.textAlign = 'center'

    ctx.font = `bold ${Math.round(w * 0.11)}px sans-serif`
    ctx.fillStyle = '#fde68a'
    ctx.fillText('🎉 클리어!', w / 2, h * 0.32)

    // 레벨 완료 표시
    ctx.font = `${Math.round(w * 0.042)}px sans-serif`
    ctx.fillStyle = '#c8e6c9'
    ctx.fillText(`레벨 ${level} 완료!`, w / 2, h * 0.42)

    // 다음 레벨 프리뷰
    this._drawLevelBadge(ctx, w / 2, h * 0.52, level + 1, true)

    ctx.font = `${Math.round(w * 0.034)}px sans-serif`
    ctx.fillStyle = '#86efac'
    ctx.fillText('난이도가 올라갔어요!', w / 2, h * 0.62)

    this._drawButton(ctx, w / 2, h * 0.74, w * 0.58, 56, `레벨 ${level + 1} 시작 →`, '#15803d')
  }

  // ── 패배 화면 ─────────────────────────────────────────────────────────────────
  drawLose(w, h, level, winner, adLoading) {
    const { ctx } = this
    this._clearBackground(w, h)
    this._drawField(w, h)
    this._drawTrees()

    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, w, h)

    this._roundRect(ctx, w * 0.07, h * 0.18, w * 0.86, h * 0.68, 28,
      'rgba(20,0,0,0.92)', 'rgba(200,100,100,0.3)')

    ctx.textAlign = 'center'

    ctx.font = `bold ${Math.round(w * 0.1)}px sans-serif`
    ctx.fillStyle = '#fca5a5'
    ctx.fillText('😢 패배...', w / 2, h * 0.30)

    ctx.font = `36px serif`
    ctx.fillStyle = '#fff'
    ctx.fillText(winner.emoji, w / 2, h * 0.40)

    ctx.font = `${Math.round(w * 0.038)}px sans-serif`
    ctx.fillStyle = '#fecaca'
    ctx.fillText(`${winner.label}이 사과 3개를 먼저 모았어요!`, w / 2, h * 0.49)

    // 현재 레벨 표시
    this._drawLevelBadge(ctx, w / 2, h * 0.56, level, false)

    // 광고 버튼
    if (adLoading) {
      this._drawButton(ctx, w / 2, h * 0.68, w * 0.75, 52, '광고 로딩 중...', '#6b7280')
    } else {
      this._drawButton(ctx, w / 2, h * 0.68, w * 0.75, 52, '📺  광고 보고 다시 도전', '#b45309')
    }

    // 처음부터 버튼
    this._drawButton(ctx, w / 2, h * 0.79, w * 0.55, 44, '처음부터 (레벨 1)', '#374151')

    if (adLoading) {
      // 로딩 오버레이 힌트
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.round(w * 0.045)}px sans-serif`
      ctx.fillText('광고 준비 중...', w / 2, h / 2)
    }
  }

  // ── 레벨 배지 ─────────────────────────────────────────────────────────────────
  _drawLevelBadge(ctx, cx, cy, level, isNext) {
    const bw = 160
    const bh = 40
    const color = isNext ? '#15803d' : '#2d6a4f'
    this._roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 12,
      color + 'cc', 'rgba(255,255,255,0.25)')
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font = `bold 16px sans-serif`
    const label = isNext ? `NEXT  Lv.${level}` : `Lv.${level}`
    ctx.fillText(label, cx, cy + 6)
  }

  // ── Background & field ───────────────────────────────────────────────────────

  _clearBackground(w, h) {
    const { ctx } = this
    // Dark forest gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0d2b0d')
    grad.addColorStop(0.5, '#1a3d1a')
    grad.addColorStop(1, '#0f280f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  _drawField(w, h) {
    const { ctx } = this
    // Soft grass oval in the center – the play area
    const grad = ctx.createRadialGradient(w / 2, h * 0.44, h * 0.05, w / 2, h * 0.44, h * 0.52)
    grad.addColorStop(0, 'rgba(56,130,56,0.55)')
    grad.addColorStop(0.65, 'rgba(34,100,34,0.30)')
    grad.addColorStop(1, 'rgba(10,40,10,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Subtle grass texture dots
    ctx.fillStyle = 'rgba(80,160,80,0.07)'
    const seed = [0.12, 0.37, 0.63, 0.88, 0.24, 0.51, 0.76, 0.19, 0.44, 0.68, 0.93]
    for (let i = 0; i < 40; i++) {
      const sx = seed[i % seed.length]
      const sy = seed[(i * 3) % seed.length]
      ctx.beginPath()
      ctx.arc(sx * w + (i * 17 % 40) - 20, sy * h + (i * 11 % 30) - 15, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _generateTrees(w, h) {
    // Place trees deterministically around the canvas border
    const trees = []
    const positions = [
      // Top edge
      { x: 0.04, y: 0.02 }, { x: 0.15, y: -0.01 }, { x: 0.28, y: 0.03 },
      { x: 0.42, y: -0.01 }, { x: 0.55, y: 0.02 }, { x: 0.68, y: -0.01 },
      { x: 0.80, y: 0.03 }, { x: 0.92, y: 0.00 },
      // Bottom edge
      { x: 0.05, y: 0.96 }, { x: 0.18, y: 0.98 }, { x: 0.32, y: 0.95 },
      { x: 0.70, y: 0.97 }, { x: 0.84, y: 0.95 }, { x: 0.95, y: 0.98 },
      // Left edge
      { x: -0.02, y: 0.15 }, { x: 0.00, y: 0.30 }, { x: -0.01, y: 0.50 },
      { x: 0.01, y: 0.70 }, { x: -0.02, y: 0.85 },
      // Right edge
      { x: 0.98, y: 0.18 }, { x: 0.97, y: 0.35 }, { x: 0.99, y: 0.55 },
      { x: 0.97, y: 0.72 }, { x: 0.98, y: 0.88 },
    ]
    const sizes = [28, 24, 32, 26, 30, 22, 34, 28, 25, 29, 31, 23, 27, 33, 28, 24]
    positions.forEach((p, i) => {
      trees.push({
        x: p.x * w,
        y: p.y * h,
        size: sizes[i % sizes.length],
      })
    })
    return trees
  }

  _drawTrees() {
    if (!this._trees) return
    const { ctx } = this
    for (const t of this._trees) {
      const s = t.size
      // Trunk
      ctx.fillStyle = '#5c3d11'
      ctx.fillRect(t.x - s * 0.15, t.y + s * 0.5, s * 0.3, s * 0.6)
      // Crown (two overlapping circles for a fluffy look)
      ctx.beginPath()
      ctx.arc(t.x, t.y + s * 0.1, s * 0.55, 0, Math.PI * 2)
      ctx.fillStyle = '#1b4d1b'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(t.x - s * 0.2, t.y + s * 0.25, s * 0.38, 0, Math.PI * 2)
      ctx.fillStyle = '#1f5c1f'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(t.x + s * 0.2, t.y + s * 0.25, s * 0.38, 0, Math.PI * 2)
      ctx.fillStyle = '#1f5c1f'
      ctx.fill()
      // Small highlight
      ctx.beginPath()
      ctx.arc(t.x - s * 0.1, t.y - s * 0.1, s * 0.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(60,120,60,0.4)'
      ctx.fill()
    }
  }

  // ── Apple drawing ────────────────────────────────────────────────────────────

  _drawApple(x, y, r) {
    const { ctx } = this
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 4

    // Body
    ctx.beginPath()
    ctx.arc(x, y + r * 0.1, r * 0.85, 0, Math.PI * 2)
    ctx.fillStyle = '#e53935'
    ctx.fill()

    // Darker side shadow
    const sideGrad = ctx.createRadialGradient(x + r * 0.3, y + r * 0.3, 0, x, y, r)
    sideGrad.addColorStop(0, 'rgba(80,0,0,0.35)')
    sideGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.arc(x, y + r * 0.1, r * 0.85, 0, Math.PI * 2)
    ctx.fillStyle = sideGrad
    ctx.fill()

    ctx.restore()

    // Shine highlight
    ctx.beginPath()
    ctx.ellipse(x - r * 0.28, y - r * 0.22, r * 0.22, r * 0.32, -0.6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.40)'
    ctx.fill()

    // Top indent
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.7, r * 0.12, r * 0.1, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#b71c1c'
    ctx.fill()

    // Stem
    ctx.beginPath()
    ctx.moveTo(x + r * 0.04, y - r * 0.75)
    ctx.quadraticCurveTo(x + r * 0.18, y - r * 1.15, x + r * 0.08, y - r * 1.3)
    ctx.strokeStyle = '#5d4037'
    ctx.lineWidth = r * 0.18
    ctx.lineCap = 'round'
    ctx.stroke()

    // Leaf
    ctx.save()
    ctx.translate(x + r * 0.15, y - r * 1.05)
    ctx.rotate(0.5)
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.35, r * 0.18, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#388e3c'
    ctx.fill()
    // Leaf vein
    ctx.beginPath()
    ctx.moveTo(-r * 0.3, 0)
    ctx.lineTo(r * 0.3, 0)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  _drawAppleCarried(player) {
    const apple = player.carrying
    this._drawApple(apple.x, apple.y, apple.radius * 0.82)
  }

  // ── Base drawing ─────────────────────────────────────────────────────────────

  _drawBase(base) {
    const { ctx } = this

    // Outer glow ring
    const grad = ctx.createRadialGradient(base.x, base.y, base.radius * 0.5,
      base.x, base.y, base.radius * 1.2)
    grad.addColorStop(0, base.color + '44')
    grad.addColorStop(1, base.color + '00')
    ctx.beginPath()
    ctx.arc(base.x, base.y, base.radius * 1.2, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    // Base circle (earthy fill)
    ctx.beginPath()
    ctx.arc(base.x, base.y, base.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(30,60,20,0.55)'
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

    // Apple count indicators (🍎 filled vs ○ empty)
    const total = 3
    const dotR = 6
    const spacing = dotR * 2.8
    const startX = base.x - ((total - 1) * spacing) / 2
    for (let i = 0; i < total; i++) {
      const dx = startX + i * spacing
      const dy = base.y + base.radius + 14
      if (i < base.bottleCount) {
        // Mini apple icon
        ctx.beginPath()
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2)
        ctx.fillStyle = '#e53935'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(dx - dotR * 0.3, dy - dotR * 0.3, dotR * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fill()
      }
    }
  }

  // ── Player drawing ───────────────────────────────────────────────────────────

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

    ctx.textAlign = 'center'
    ctx.fillStyle = player.color
    ctx.font = `bold 11px sans-serif`
    ctx.fillText(player.label, x, y + r + 13)
  }

  // ── Animal drawing functions ──────────────────────────────────────────────────

  _drawCapybara(ctx, x, y, r, carrying) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 5

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.1, r * 0.95, r * 0.85, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#b45309'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.1, r * 0.7, r * 0.65, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#d97706'
    ctx.fill()

    ctx.restore()

    this._drawEar(ctx, x - r * 0.5, y - r * 0.7, r * 0.22, '#b45309')
    this._drawEar(ctx, x + r * 0.5, y - r * 0.7, r * 0.22, '#b45309')

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.05, r * 0.42, r * 0.22, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#92400e'
    ctx.fill()

    ctx.fillStyle = '#78350f'
    ctx.beginPath()
    ctx.ellipse(x - r * 0.14, y + r * 0.04, r * 0.07, r * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + r * 0.14, y + r * 0.04, r * 0.07, r * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()

    this._drawEye(ctx, x - r * 0.28, y - r * 0.28)
    this._drawEye(ctx, x + r * 0.28, y - r * 0.28)

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

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.05, r * 0.88, r * 0.88, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()

    ctx.restore()

    this._drawEar(ctx, x - r * 0.52, y - r * 0.65, r * 0.28, '#1e293b')
    this._drawEar(ctx, x + r * 0.52, y - r * 0.65, r * 0.28, '#1e293b')

    ctx.beginPath()
    ctx.ellipse(x - r * 0.3, y - r * 0.12, r * 0.27, r * 0.22, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + r * 0.3, y - r * 0.12, r * 0.27, r * 0.22, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#1e293b'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x - r * 0.3, y - r * 0.14, r * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + r * 0.3, y - r * 0.14, r * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(x - r * 0.28, y - r * 0.14, r * 0.06, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + r * 0.28, y - r * 0.14, r * 0.06, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.08, r * 0.12, r * 0.08, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f9a8d4'
    ctx.fill()

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

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.1, r * 1.0, r * 0.92, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f59e0b'
    ctx.fill()

    ctx.restore()

    ctx.beginPath()
    ctx.ellipse(x - r * 0.62, y + r * 0.05, r * 0.28, r * 0.5, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#d97706'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + r * 0.62, y + r * 0.05, r * 0.28, r * 0.5, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#d97706'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.08, r * 0.68, r * 0.62, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#fcd34d'
    ctx.fill()

    this._drawEye(ctx, x - r * 0.26, y - r * 0.22)
    this._drawEye(ctx, x + r * 0.26, y - r * 0.22)

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.04, r * 0.16, r * 0.11, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#92400e'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.26, r * 0.18, r * 0.2, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f9a8d4'
    ctx.fill()

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
    ctx.beginPath()
    ctx.arc(x, y, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + 0.8, y + 0.5, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + 1.5, y - 0.5, 1.2, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────

  _drawHUD(state, w, h) {
    const { ctx } = this

    ctx.fillStyle = 'rgba(0,20,0,0.5)'
    ctx.fillRect(0, 0, w, 36)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#c8e6c9'
    ctx.font = `bold 14px sans-serif`
    ctx.fillText('먼저 사과 3개를 진영에 모으세요!', w / 2, 23)

    const player = state.players.find(p => p.type === 'player')
    if (player) {
      const count = player.base.bottleCount
      ctx.fillStyle = player.color
      ctx.font = `bold 13px sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(`나: ${count}/3 🍎`, 16, h - 16)
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

  hitButton(cx, cy, bw, bh, px, py) {
    return px >= cx - bw / 2 && px <= cx + bw / 2 &&
      py >= cy - bh / 2 && py <= cy + bh / 2
  }
}
