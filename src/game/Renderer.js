// ─── Renderer – Pixel Art Style ───────────────────────────────────────────────

const C = {
  sky1: '#5ec8ff', sky2: '#9dd9ff', cloud: '#f5faff',
  grass1: '#6bcc30', grass2: '#50a020', grass3: '#3c7818', grassHL: '#84e040',
  dirt1: '#b07840', dirt2: '#8b5e28', dirt3: '#6a4018',
  trunk: '#6b3a10', trunkDk: '#3a1e08',
  leaf1: '#52cc28', leaf2: '#38a018', leaf3: '#286414',
  black: '#1a1a2e', white: '#f0f5e8',
  panelBg: '#0c1e10', panelHL: '#1e3820', panelSH: '#060e08',
  gold: '#fcd34d', green: '#30c860',
  aRed: '#e83030', aRedDk: '#901818', aRedLt: '#ff5858',
  aGreen: '#38a018', aStem: '#5a3210',
  capyBr: '#b87c38', capyLt: '#d4a060', capyDk: '#785028', capyNose: '#5a3010',
  pandaW: '#e8e8e8', pandaB: '#1a1a2e',
  goldnYl: '#f0a020', goldnLt: '#f8c840', goldnDk: '#b07818',
  pink: '#f47890',
  pPlayer: '#f9a8d4', pAI1: '#a5b4fc', pAI2: '#fde68a',
}

const KR = `bold %px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`
const MN = `bold %px 'Courier New', monospace`
const font = (tpl, sz) => tpl.replace('%', sz)

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

  drawTitle(w, h, level, totalPoints, todayEarned) {
    const { ctx } = this
    this._drawBg(w, h)
    this._panel(w * 0.06, h * 0.10, w * 0.88, h * 0.65)

    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = font(KR, Math.round(w * 0.10))
    ctx.fillText('사과는 다 내꺼!', w / 2, h * 0.235)

    this._levelBadge(w / 2, h * 0.305, level, false)

    // 포인트 현황
    ctx.fillStyle = C.gold
    ctx.font = font(KR, Math.round(w * 0.038))
    ctx.textAlign = 'center'
    ctx.fillText(`🍎 잔고 ${totalPoints}원`, w / 2, h * 0.375)
    ctx.fillStyle = '#a0d890'
    ctx.font = font(KR, Math.round(w * 0.028))
    ctx.fillText(`오늘 ${todayEarned}/9원 획득`, w / 2, h * 0.418)

    const chars = [
      { type: 'ai1',    label: '팬더',    col: C.pAI1   },
      { type: 'player', label: '카피바라', col: C.pPlayer },
      { type: 'ai2',    label: '골댕이',  col: C.pAI2   },
    ]
    const sp = w / 4
    chars.forEach((c, i) => {
      const cx = sp * (i + 1)
      const cy = h * 0.515
      const r  = Math.round(w * 0.065)
      this._pxFrame(cx - r - 3, cy - r - 3, (r + 3) * 2, (r + 3) * 2, c.col)
      if (c.type === 'player')   this._drawCapybara(ctx, cx, cy, r, false)
      else if (c.type === 'ai1') this._drawPanda(ctx, cx, cy, r, false)
      else                       this._drawGolden(ctx, cx, cy, r, false)
      ctx.textAlign = 'center'
      ctx.fillStyle = c.col
      ctx.font = font(KR, Math.round(w * 0.028))
      ctx.fillText(c.label, cx, cy + r + 16)
    })

    ctx.fillStyle = '#c8f0a8'
    ctx.font = font(KR, Math.round(w * 0.025))
    ctx.textAlign = 'center'
    ctx.fillText('카피바라를 이동해 사과를 집어 내 진영으로!', w / 2, h * 0.645)

    ctx.fillStyle = '#a0d890'
    ctx.font = font(KR, Math.round(w * 0.027))
    ctx.textAlign = 'center'
    ctx.fillText('먼저 3개 모으면 승리! 이길 때마다 3원씩 받아요', w / 2, h * 0.692)

    this._btn(w / 2, h * 0.765, w * 0.62, 52, '사과 줍기', '#2a6e3a')
  }

  drawWin(w, h, level, lastEarned, totalPoints, todayEarned, canWithdrawFlag, isFinalStage) {
    const { ctx } = this
    this._drawBg(w, h)
    ctx.fillStyle = 'rgba(0,10,0,0.55)'
    ctx.fillRect(0, 0, w, h)
    this._panel(w * 0.06, h * 0.12, w * 0.88, h * 0.72)

    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = font(KR, Math.round(w * 0.12))
    ctx.fillText('클리어!', w / 2, h * 0.255)
    ctx.fillStyle = C.green
    ctx.font = font(KR, Math.round(w * 0.042))
    ctx.fillText(`단계 ${level} 완료!`, w / 2, h * 0.350)

    if (!isFinalStage) {
      // 단계 1 & 2: 다음 단계 배지 + 포인트 표시 + 티저 + 다음 단계 버튼
      this._levelBadge(w / 2, h * 0.425, level + 1, true)

      if (lastEarned > 0) {
        ctx.fillStyle = '#50ff80'
        ctx.font = font(KR, Math.round(w * 0.060))
        ctx.fillText(`+${lastEarned}원 획득!`, w / 2, h * 0.513)
      } else {
        ctx.fillStyle = '#a0d890'
        ctx.font = font(KR, Math.round(w * 0.032))
        ctx.fillText('오늘 한도 달성 — 내일 또 도전!', w / 2, h * 0.513)
      }
      ctx.fillStyle = '#fcd34d'
      ctx.font = font(KR, Math.round(w * 0.030))
      ctx.fillText(`잔고 ${totalPoints}원  ·  오늘 ${todayEarned}/9원`, w / 2, h * 0.571)

      ctx.fillStyle = '#f0c040'
      ctx.font = font(KR, Math.round(w * 0.026))
      ctx.fillText('💸 오늘 9원 모으면 토스 포인트로 출금 가능!', w / 2, h * 0.625)

      this._btn(w / 2, h * 0.710, w * 0.70, 54, `▶  단계 ${level + 1} 시작`, '#1a6a2e')
    } else {
      // 단계 3: 포인트 표시 + 수확 완료 버튼 + 교환하기 버튼
      if (lastEarned > 0) {
        ctx.fillStyle = '#50ff80'
        ctx.font = font(KR, Math.round(w * 0.060))
        ctx.fillText(`+${lastEarned}원 획득!`, w / 2, h * 0.450)
      } else {
        ctx.fillStyle = '#a0d890'
        ctx.font = font(KR, Math.round(w * 0.032))
        ctx.fillText('오늘 한도 달성 — 내일 또 도전!', w / 2, h * 0.450)
      }
      ctx.fillStyle = '#fcd34d'
      ctx.font = font(KR, Math.round(w * 0.030))
      ctx.fillText(`잔고 ${totalPoints}원  ·  오늘 ${todayEarned}/9원`, w / 2, h * 0.508)

      this._btn(w / 2, h * 0.615, w * 0.70, 54, '🎉  오늘 수확 완료!', '#4a2a7a')
      this._btn(w / 2, h * 0.730, w * 0.72, 52, '💸  토스 포인트로 교환하기', '#1a4a7a')
    }
  }

  drawLose(w, h, level, winner, adLoading, totalPoints) {
    const { ctx } = this
    this._drawBg(w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.60)'
    ctx.fillRect(0, 0, w, h)
    this._panel(w * 0.06, h * 0.15, w * 0.88, h * 0.70)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff5050'
    ctx.font = font(KR, Math.round(w * 0.10))
    ctx.fillText('게임 오버', w / 2, h * 0.265)

    const wx = w / 2, wy = h * 0.365, wr = Math.round(w * 0.075)
    if (winner.type === 'player')   this._drawCapybara(ctx, wx, wy, wr, false)
    else if (winner.type === 'ai1') this._drawPanda(ctx, wx, wy, wr, false)
    else                            this._drawGolden(ctx, wx, wy, wr, false)

    ctx.fillStyle = winner.color || C.white
    ctx.font = font(KR, Math.round(w * 0.038))
    ctx.fillText(`${winner.label} 승리!`, w / 2, h * 0.465)

    this._levelBadge(w / 2, h * 0.530, level, false)

    ctx.textAlign = 'center'
    ctx.font = font(KR, Math.round(w * 0.028))
    if (level === 1) {
      ctx.fillStyle = '#fcd34d'
      ctx.fillText('사과 3개 모으면 토스포인트 3원이에요', w / 2, h * 0.592)
    } else {
      const needed = Math.max(1, 9 - totalPoints)
      ctx.fillStyle = '#50ff80'
      ctx.fillText(`${needed}원만 더 모으면 토스포인트로 출금할 수 있어요`, w / 2, h * 0.592)
    }

    if (adLoading) {
      this._btn(w / 2, h * 0.650, w * 0.80, 52, '로딩 중...', '#555')
    } else {
      this._btn(w / 2, h * 0.650, w * 0.80, 52, '▶  광고 보고 다시 도전', '#a04810')
    }
    this._btn(w / 2, h * 0.765, w * 0.62, 44, '돌아가기  (레벨 유지)', '#3a3a60')

    if (adLoading) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = C.white
      ctx.font = font(KR, Math.round(w * 0.048))
      ctx.textAlign = 'center'
      ctx.fillText('로딩 중...', w / 2, h / 2)
    }
  }

  drawDailyLimit(w, h, totalPoints, canWithdrawFlag) {
    const { ctx } = this
    this._drawBg(w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, w, h)
    this._panel(w * 0.06, h * 0.15, w * 0.88, h * 0.68)

    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = font(KR, Math.round(w * 0.10))
    ctx.fillText('오늘 수확 완료!', w / 2, h * 0.285)

    ctx.fillStyle = C.green
    ctx.font = font(KR, Math.round(w * 0.040))
    ctx.fillText('하루 최대 9원을 모았어요 🍎', w / 2, h * 0.365)

    ctx.fillStyle = C.gold
    ctx.font = font(KR, Math.round(w * 0.055))
    ctx.fillText(`잔고 ${totalPoints}원`, w / 2, h * 0.455)

    ctx.fillStyle = '#a0d890'
    ctx.font = font(KR, Math.round(w * 0.030))
    ctx.fillText('자정이 지나면 다시 도전할 수 있어요', w / 2, h * 0.525)

    if (canWithdrawFlag) {
      this._btn(w / 2, h * 0.625, w * 0.65, 52, '💸  출금하기', '#1a4a7a')
      this._btn(w / 2, h * 0.730, w * 0.55, 44, '확인', '#2a4030')
    } else {
      const needed = 10 - totalPoints
      ctx.fillStyle = '#80b8a0'
      ctx.font = font(KR, Math.round(w * 0.028))
      ctx.fillText(`출금까지 ${needed}원 더 필요해요`, w / 2, h * 0.588)
      this._btn(w / 2, h * 0.685, w * 0.55, 48, '확인', '#2a4030')
    }
  }

  drawWithdrawModal(w, h, totalPoints) {
    const { ctx } = this
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(0, 0, w, h)
    this._panel(w * 0.08, h * 0.22, w * 0.84, h * 0.56)

    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = font(KR, Math.round(w * 0.058))
    ctx.fillText('토스 포인트 출금', w / 2, h * 0.318)

    ctx.fillStyle = '#a0d890'
    ctx.font = font(KR, Math.round(w * 0.030))
    ctx.fillText('현재 잔액', w / 2, h * 0.390)

    ctx.fillStyle = C.white
    ctx.font = font(KR, Math.round(w * 0.072))
    ctx.fillText(`${totalPoints}원`, w / 2, h * 0.462)

    ctx.fillStyle = '#80a890'
    ctx.font = font(KR, Math.round(w * 0.026))
    ctx.fillText('출금 후 잔액: 0원', w / 2, h * 0.515)

    this._btn(w / 2, h * 0.585, w * 0.65, 52, '✓  출금 신청하기', '#1a4a7a')
    this._btn(w / 2, h * 0.678, w * 0.50, 44, '취소', '#3a3a60')
  }

  // ── Background ────────────────────────────────────────────────────────────

  _drawBg(w, h) {
    const { ctx } = this
    const groundY = h * 0.55

    // Sky
    ctx.fillStyle = C.sky1
    ctx.fillRect(0, 0, w, groundY)
    ctx.fillStyle = C.sky2
    ctx.fillRect(0, h * 0.36, w, h * 0.21)

    // Clouds
    if (this._clouds) {
      for (const cl of this._clouds) this._pixelCloud(cl.x, cl.y, cl.s)
    }

    // Dirt layer (below grass)
    ctx.fillStyle = C.dirt1
    ctx.fillRect(0, groundY + 8, w, h - groundY - 8)
    // Dirt shade band
    ctx.fillStyle = C.dirt2
    ctx.fillRect(0, groundY + 8 + Math.round(h * 0.06), w, h - groundY)

    // Green grass layer
    ctx.fillStyle = C.grass1
    ctx.fillRect(0, groundY, w, 20)

    // Grass highlight strip at very top
    ctx.fillStyle = C.grassHL
    ctx.fillRect(0, groundY, w, 3)

    // Stepped/jagged grass edge (pixel teeth going down into dirt)
    const gp = Math.max(4, Math.round(w / 55))
    ctx.fillStyle = C.grass2
    ctx.fillRect(0, groundY + 8, w, 6)
    ctx.fillStyle = C.grass3
    for (let i = 0; i * gp * 5 < w; i++) {
      const gx = i * gp * 5
      ctx.fillRect(gx,          groundY + 16, gp * 2, gp)
      ctx.fillRect(gx + gp * 3, groundY + 14, gp,     gp * 2)
    }

    // Trees drawn over background
    this._drawTrees()
  }

  _generateClouds(w, h) {
    return [
      { x: w * 0.12, y: h * 0.07, s: w * 0.14 },
      { x: w * 0.52, y: h * 0.04, s: w * 0.18 },
      { x: w * 0.82, y: h * 0.10, s: w * 0.12 },
      { x: w * 0.35, y: h * 0.17, s: w * 0.10 },
    ]
  }

  _pixelCloud(x, y, s) {
    const { ctx } = this
    const p = Math.max(4, Math.round(s / 8))
    ctx.fillStyle = C.cloud
    for (const [ox, oy, pw, ph] of [[-1.5,0,3,1],[-1,-1,2,1],[-0.5,-2,1,1],[1.5,0,1,1],[-2.5,0,1,1]]) {
      ctx.fillRect(Math.round(x + ox * p), Math.round(y + oy * p), Math.round(pw * p), Math.round(ph * p))
    }
  }

  _generateTrees(w, h) {
    const pos = [
      { x: 0.04, y: 0.00 }, { x: 0.16, y: -0.01 }, { x: 0.28, y: 0.01 },
      { x: 0.41, y: -0.01 }, { x: 0.54, y: 0.00 }, { x: 0.67, y: -0.01 },
      { x: 0.79, y: 0.01 }, { x: 0.91, y: -0.01 },
      { x: 0.05, y: 0.94 }, { x: 0.19, y: 0.96 }, { x: 0.31, y: 0.93 },
      { x: 0.71, y: 0.95 }, { x: 0.83, y: 0.93 }, { x: 0.95, y: 0.96 },
      { x: -0.01, y: 0.13 }, { x: 0.01, y: 0.29 }, { x: -0.01, y: 0.46 },
      { x: 0.01,  y: 0.62 }, { x: -0.01, y: 0.78 },
      { x: 0.97, y: 0.16 }, { x: 0.99, y: 0.32 }, { x: 0.97, y: 0.49 },
      { x: 0.99, y: 0.65 }, { x: 0.97, y: 0.81 },
    ]
    const sizes = [30, 26, 34, 28, 32, 24, 36, 30, 27, 31, 33, 25, 29, 35, 30, 26]
    return pos.map((p, i) => ({ x: p.x * w, y: p.y * h, size: sizes[i % sizes.length] }))
  }

  _drawTrees() {
    if (!this._trees) return
    for (const t of this._trees) this._pixelTree(t.x, t.y, t.size)
  }

  // Round deciduous tree — oval crown made of horizontal pixel strips
  _pixelTree(x, y, s) {
    const { ctx } = this
    const p  = Math.max(2, Math.round(s / 6))
    const cx = Math.round(x)
    const ty = Math.round(y)

    // Trunk
    ctx.fillStyle = C.trunk
    ctx.fillRect(cx - p, ty + p * 8, p * 2, p * 3)
    ctx.fillStyle = C.trunkDk
    ctx.fillRect(cx, ty + p * 8, p, p * 3)

    // Oval crown: 8 rows forming an ellipse shape
    //   row: [yOffset, widthInP]
    const rows = [[0,2],[1,4],[2,6],[3,7],[4,7],[5,6],[6,4],[7,2]]

    // Step 1: black outline (each row drawn 1p wider on each side)
    ctx.fillStyle = C.black
    rows.forEach(([ry, w]) => {
      ctx.fillRect(Math.round(cx - (w / 2 + 1) * p), ty + ry * p, (w + 2) * p, p)
    })

    // Step 2: mid green fill
    ctx.fillStyle = C.leaf2
    rows.forEach(([ry, w]) => {
      ctx.fillRect(Math.round(cx - w / 2 * p), ty + ry * p, w * p, p)
    })

    // Step 3: light highlight on upper-left 55%
    ctx.fillStyle = C.leaf1
    rows.slice(0, 5).forEach(([ry, w]) => {
      ctx.fillRect(Math.round(cx - w / 2 * p), ty + ry * p, Math.ceil(w * 0.55) * p, p)
    })

    // Step 4: dark shadow on lower-right 35%
    ctx.fillStyle = C.leaf3
    rows.slice(4).forEach(([ry, w]) => {
      ctx.fillRect(Math.round(cx + w * 0.25 * p), ty + ry * p, Math.ceil(w * 0.35) * p, p)
    })
  }

  // ── Apple ─────────────────────────────────────────────────────────────────

  _drawApple(x, y, r) {
    const { ctx } = this
    const p  = Math.max(2, Math.round(r / 3.5))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // Stem
    ctx.fillStyle = C.aStem
    ctx.fillRect(cx, cy - p * 3, p, p * 2)

    // Leaf (two pixels)
    ctx.fillStyle = C.aGreen
    ctx.fillRect(cx + p, cy - p * 4, p, p)
    ctx.fillRect(cx + p, cy - p * 3, p, p)
    ctx.fillStyle = '#52d428'
    ctx.fillRect(cx + p, cy - p * 4, p, Math.ceil(p * 0.5))

    // Black outline for body
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 2 - 1, cy - p * 2 - 1, p * 4 + 2, p * 5 + 2)

    // Apple body (layered for roundness)
    ctx.fillStyle = C.aRed
    ctx.fillRect(cx - p,     cy - p * 2, p * 2, p)       // top bump
    ctx.fillRect(cx - p * 2, cy - p,     p * 4, p * 3)   // main body
    ctx.fillRect(cx - p,     cy + p * 2, p * 2, p)       // bottom bump

    // Top-left highlight band
    ctx.fillStyle = C.aRedLt
    ctx.fillRect(cx - p * 2, cy - p,     p, p * 2)
    ctx.fillRect(cx - p,     cy - p * 2, p, p)

    // Right shadow band
    ctx.fillStyle = C.aRedDk
    ctx.fillRect(cx + p,     cy - p, p, p * 3)
    ctx.fillRect(cx - p * 0, cy + p * 2, p, p)
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

    ctx.fillStyle = 'rgba(10,40,15,0.55)'
    ctx.fillRect(bx, by, bs, bs)

    // Pixel border
    ctx.fillStyle = base.color
    ctx.fillRect(bx,           by,           bs, bp)
    ctx.fillRect(bx,           by + bs - bp, bs, bp)
    ctx.fillRect(bx,           by,           bp, bs)
    ctx.fillRect(bx + bs - bp, by,           bp, bs)

    // White corner pixels
    const cs = bp * 2
    ctx.fillStyle = C.white
    ctx.fillRect(bx,           by,           cs, cs)
    ctx.fillRect(bx + bs - cs, by,           cs, cs)
    ctx.fillRect(bx,           by + bs - cs, cs, cs)
    ctx.fillRect(bx + bs - cs, by + bs - cs, cs, cs)

    // Label
    ctx.textAlign = 'center'
    ctx.fillStyle = base.color
    ctx.font = font(KR, 13)
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
    ctx.font = font(KR, 11)
    ctx.fillText(player.label, x, y + r + 15)
  }

  // ── Pixel art animal sprites ───────────────────────────────────────────────
  // p = one pixel block (larger = more visible pixels)

  _drawCapybara(ctx, x, y, r, carrying) {
    const p  = Math.max(2, Math.round(r / 4.5))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // === 카피바라: 넓적하고 낮은 직사각형 몸체, 특징적인 납작한 코 ===

    // Black outline
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 5 - 1, cy - p * 5 - 1, p * 10 + 2, p * 9 + 2)

    // Body (very wide)
    ctx.fillStyle = C.capyBr
    ctx.fillRect(cx - p * 5, cy,       p * 10, p * 3) // lower body
    ctx.fillRect(cx - p * 4, cy - p * 5, p * 8, p * 5) // head + upper body

    // Body top highlight
    ctx.fillStyle = C.capyLt
    ctx.fillRect(cx - p * 5, cy,       p * 10, p)
    ctx.fillRect(cx - p * 4, cy - p * 5, p * 8, p)

    // Belly (darker strip)
    ctx.fillStyle = C.capyDk
    ctx.fillRect(cx - p * 4, cy + p * 2, p * 8, p)

    // Ears (small rounded squares at top)
    ctx.fillStyle = C.capyBr
    ctx.fillRect(cx - p * 4, cy - p * 6, p * 2, p * 2)
    ctx.fillRect(cx + p * 2, cy - p * 6, p * 2, p * 2)
    ctx.fillStyle = C.pink
    ctx.fillRect(cx - p * 3, cy - p * 6, p, p)
    ctx.fillRect(cx + p * 2, cy - p * 6, p, p)

    // Eyes (two-tone)
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 3, cy - p * 3, p * 2, p * 2)
    ctx.fillRect(cx + p,     cy - p * 3, p * 2, p * 2)
    ctx.fillStyle = '#5a8a5a'  // brown iris
    ctx.fillRect(cx - p * 2, cy - p * 2, p, p)
    ctx.fillRect(cx + p,     cy - p * 2, p, p)
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p * 3, cy - p * 3, p, p)  // eye white top-left
    ctx.fillRect(cx + p * 2, cy - p * 3, p, p)

    // Flat wide muzzle (capybara's most distinctive feature)
    ctx.fillStyle = C.capyNose
    ctx.fillRect(cx - p * 3, cy - p * 1, p * 6, p * 2)
    ctx.fillStyle = C.capyDk
    ctx.fillRect(cx - p * 3, cy - p * 1, p * 6, p)  // muzzle top shadow

    // Nostrils
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 2, cy - p * 1, p, p)
    ctx.fillRect(cx + p,     cy - p * 1, p, p)
    ctx.fillStyle = '#3a1a0a'
    ctx.fillRect(cx - p * 1, cy - p * 1, p * 2, p)  // center muzzle dark

    if (carrying) {
      ctx.fillStyle = '#f8c060'
      ctx.fillRect(cx - p, cy - p * 6, p * 2, p)  // apple on head highlight
    }
  }

  _drawPanda(ctx, x, y, r, carrying) {
    const p  = Math.max(2, Math.round(r / 4.5))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // === 팬더: 흰 몸 + 검은 눈패치 + 검은 귀 ===

    // Black base (outline + ear + eye patches)
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p * 4 - 1, cy - p * 6 - 1, p * 8 + 2, p * 10 + 2)

    // Black ears (bumps above head)
    ctx.fillRect(cx - p * 4, cy - p * 7, p * 3, p * 2)
    ctx.fillRect(cx + p,     cy - p * 7, p * 3, p * 2)

    // White body (fills over black outline area)
    ctx.fillStyle = C.pandaW
    ctx.fillRect(cx - p * 3, cy - p * 5, p * 6, p * 9)

    // White ear inner patches
    ctx.fillRect(cx - p * 3, cy - p * 7, p * 2, p)
    ctx.fillRect(cx + p,     cy - p * 7, p * 2, p)

    // Black eye patches (large, distinctive)
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p * 3, cy - p * 3, p * 2, p * 3)
    ctx.fillRect(cx + p,     cy - p * 3, p * 2, p * 3)

    // White eyes (inside patches)
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p * 3, cy - p * 3, p * 2, p * 2)
    ctx.fillRect(cx + p,     cy - p * 3, p * 2, p * 2)

    // Pupils (black, slightly off-center for cute look)
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p * 2, cy - p * 2, p, p)
    ctx.fillRect(cx + p,     cy - p * 2, p, p)

    // Pupil highlights
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p * 2, cy - p * 2, Math.ceil(p * 0.5), Math.ceil(p * 0.5))
    ctx.fillRect(cx + p,     cy - p * 2, Math.ceil(p * 0.5), Math.ceil(p * 0.5))

    // Panda's round snout
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(cx - p * 2, cy, p * 4, p * 2)

    // Pink nose
    ctx.fillStyle = C.pink
    ctx.fillRect(cx - p, cy, p * 2, p)

    // Nostrils
    ctx.fillStyle = C.pandaB
    ctx.fillRect(cx - p, cy, Math.ceil(p * 0.5), Math.ceil(p * 0.5))
    ctx.fillRect(cx + Math.ceil(p * 0.5), cy, Math.ceil(p * 0.5), Math.ceil(p * 0.5))

    // Smile
    ctx.fillRect(cx - p, cy + p, p, Math.ceil(p * 0.5))
    ctx.fillRect(cx,     cy + p, p, Math.ceil(p * 0.5))

    // Bamboo when carrying
    if (carrying) {
      ctx.fillStyle = '#38a018'
      ctx.fillRect(cx + p * 3, cy - p * 6, p, p * 4)
      ctx.fillStyle = '#52cc28'
      ctx.fillRect(cx + p * 3, cy - p * 6, p, p)
      ctx.fillRect(cx + p * 3, cy - p * 4, p, p)
    }
  }

  _drawGolden(ctx, x, y, r, carrying) {
    const p  = Math.max(2, Math.round(r / 4.5))
    const cx = Math.round(x)
    const cy = Math.round(y)

    // === 골댕이: 골든리트리버 — 황금빛 몸, 늘어진 귀, 핑크 혀 ===

    // Black outline
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 5 - 1, cy - p * 5 - 1, p * 10 + 2, p * 9 + 2)

    // Floppy ears (darker gold, wide and long)
    ctx.fillStyle = C.goldnDk
    ctx.fillRect(cx - p * 5, cy - p * 3, p * 3, p * 5)
    ctx.fillRect(cx + p * 2, cy - p * 3, p * 3, p * 5)

    // Main body (golden)
    ctx.fillStyle = C.goldnYl
    ctx.fillRect(cx - p * 4, cy - p * 5, p * 8, p * 8)

    // Face center (lighter golden, paler)
    ctx.fillStyle = C.goldnLt
    ctx.fillRect(cx - p * 2, cy - p * 4, p * 4, p * 5)

    // Forehead (slightly darker for definition)
    ctx.fillStyle = C.goldnYl
    ctx.fillRect(cx - p * 2, cy - p * 4, p * 4, p)

    // Eyes (two-tone with highlights)
    ctx.fillStyle = C.black
    ctx.fillRect(cx - p * 2, cy - p * 2, p * 2, p * 2)
    ctx.fillRect(cx,         cy - p * 2, p * 2, p * 2)
    ctx.fillStyle = '#6b3010'  // brown iris
    ctx.fillRect(cx - p * 2, cy - p, p * 2, p)
    ctx.fillRect(cx,         cy - p, p * 2, p)
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p * 2, cy - p * 2, p, p)  // highlight
    ctx.fillRect(cx,         cy - p * 2, p, p)

    // Snout / nose
    ctx.fillStyle = C.goldnLt
    ctx.fillRect(cx - p * 2, cy, p * 4, p * 2)
    ctx.fillStyle = C.capyDk
    ctx.fillRect(cx - p, cy, p * 2, p)  // nose bridge

    // Wet nose (dark shiny)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(cx - p, cy, p * 2, p)
    ctx.fillStyle = C.white
    ctx.fillRect(cx - p, cy, Math.ceil(p * 0.5), Math.ceil(p * 0.5))  // nose shine

    // Tongue (pink, dangling out)
    ctx.fillStyle = C.pink
    ctx.fillRect(cx - Math.ceil(p * 0.5), cy + p, p, p * 2)
    ctx.fillStyle = '#d04070'
    ctx.fillRect(cx, cy + p, Math.ceil(p * 0.5), p * 2)  // tongue groove

    // Happy tail when carrying
    if (carrying) {
      ctx.fillStyle = C.goldnYl
      ctx.fillRect(cx + p * 4, cy - p * 5, p, p * 3)
      ctx.fillRect(cx + p * 5, cy - p * 6, p, p * 2)
      ctx.fillRect(cx + p * 4, cy - p * 2, p * 2, p)  // tail curl
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
    ctx.font = font(KR, 13)
    ctx.fillText('사과 3개를 모아라!', w / 2, 25)

    const player = state.players.find(p => p.type === 'player')
    if (player) {
      ctx.fillStyle = C.pPlayer
      ctx.font = font(KR, 12)
      ctx.textAlign = 'left'
      ctx.fillText(`나:${player.base.bottleCount}/3`, 12, 25)
    }
    ctx.textAlign = 'right'
    ctx.fillStyle = C.gold
    ctx.font = font(KR, 12)
    ctx.fillText(`단계 ${state.level}`, w - 10, 25)
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  _levelBadge(cx, cy, level, isNext) {
    const { ctx } = this
    const bw = 170, bh = 36
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
    ctx.font = font(KR, 14)
    ctx.fillText(isNext ? `다음: 단계 ${level}` : `단계 ${level}`, cx, cy + 6)
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
    ctx.font = font(KR, Math.round(bh * 0.40))
    ctx.fillText(text, cx, cy + bh * 0.16)
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
