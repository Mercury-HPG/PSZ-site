// The temperature field as an AMR-style ASCII mesh (assets/ascii-amr.js, built by tools/amr_from_2048.ipynb): one block shade per leaf cell,
// coarse cells in quiet regions and cells a half and a quarter the size on the filaments, shaded by value in the four block steps \u2591 \u2592 \u2593 \u2588. Drawn over a fine graph-paper grid and a
// ruler, fixed behind the page, in the stretch of canvas the page sheet uncovers at the bottom. Rulers run down both edges.
(() => {
  const A = window.ASCII_AMR2
  if (!A) return
  const SHADES = ' \u2591\u2592\u2593\u2588'            // none, light, medium, dark, full block: colour depth as block shades
  const shade = (v) => (v < 2 ? 0 : v < 5 ? 1 : v < 9 ? 2 : v < 13 ? 3 : 4)   // the 16 data levels folded onto 5 shades
  const CW = 12, CH = 24                              // the page grid cell
  const hex = (g) => g.map((r) => [...r].map((h) => (h === '-' ? -1 : parseInt(h, 16))))
  const g0 = hex(A.l0), g1 = hex(A.l1), g2 = hex(A.l2)
  const R0 = g0.length, C0 = g0[0].length            // 36 x 64 level-0 cells

  // refinement per level-0 cell, used to centre the window on the densest part of the mesh
  const dens = g0.map((row, r) => row.map((v, c) => (v >= 0 ? 0 : 1 + [0, 1].reduce((s, dr) => s + [0, 1].reduce((t, dc) => t + (g1[2 * r + dr][2 * c + dc] >= 0 ? 0 : 1), 0), 0))))

  const canvas = document.createElement('canvas')
  canvas.className = 'ascii-bg'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.prepend(canvas)
  const ctx = canvas.getContext('2d')
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

  const bestWindow = (wr, wc) => {
    const ii = Array.from({ length: R0 + 1 }, () => new Float64Array(C0 + 1))
    for (let r = 0; r < R0; r++) for (let c = 0; c < C0; c++) ii[r + 1][c + 1] = dens[r][c] + ii[r][c + 1] + ii[r + 1][c] - ii[r][c]
    let best = [-1, 0, 0]
    for (let r = 0; r + wr <= R0; r++) for (let c = 0; c + wc <= C0; c++) {
      const s = ii[r + wr][c + wc] - ii[r][c + wc] - ii[r + wr][c] + ii[r][c]
      if (s > best[0]) best = [s, r, c]
    }
    return [best[1], best[2]]
  }

  const draw = () => {
    const dpr = window.devicePixelRatio || 1
    const W = innerWidth, H = innerHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const fam = getComputedStyle(document.body).fontFamily

    // the grid is anchored to the page's text column, so the column edges, panels and buttons land on grid lines
    const col = document.querySelector('main .wrap')
    const left = col ? col.getBoundingClientRect().left + parseFloat(getComputedStyle(col).paddingLeft) : 0
    const ox = Math.round(((left % CW) + CW) % CW)  // whole pixels, so lines and cells meet without seams
    const bar = document.querySelector('.site-header')
    const top = bar ? bar.getBoundingClientRect().bottom : 0
    const oy = Math.round(((top % CH) + CH) % CH)

    // fine graph-paper grid, one square per page cell
    ctx.strokeStyle = css('--ascii-fine') || 'rgba(110,108,96,.13)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = ox; x <= W; x += CW) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H) }
    for (let y = oy; y <= H; y += CH) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5) }
    ctx.stroke()

    // the mesh is centred in the part of the canvas the page sheet uncovers at the bottom, with equal blank space above and below and equal margins left and right
    const L0W = CW * 2, L0H = CH * 2                    // a level-0 cell is 2x2 page cells; level 1 is one page cell; level 2 is half
    // where the sheet's bottom edge sits when the page is scrolled all the way down, measured from the real layout
    const mainEl = document.querySelector('main')
    const docH = document.documentElement.scrollHeight
    const sheetBottom = mainEl ? H - (docH - (mainEl.getBoundingClientRect().bottom + scrollY)) : H * .38
    const topLimit = oy + Math.ceil((Math.max(top, sheetBottom) - oy) / CH) * CH
    const bottomLimit = oy + Math.floor((H - oy) / CH) * CH   // symmetric against the window's bottom edge; the footer line sits inside the blank
    // seat the footer line and the theme switch on one grid row at the foot of the window, sharing a text baseline
    const foot = document.querySelector('.site-footer')
    const sw = document.querySelector('.theme-switch')
    const baseOf = (el) => {
      const s = document.createElement('span')
      s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
      el.appendChild(s)
      const y = s.getBoundingClientRect().bottom
      s.remove()
      return y
    }
    if (foot) foot.style.paddingBottom = Math.max(0, H - bottomLimit) + 'px'
    if (foot && sw) {
      const txt = foot.querySelector('.wrap span') || foot.querySelector('.wrap')
      const wrap = foot.querySelector('.wrap')
      const rel = baseOf(txt) - wrap.getBoundingClientRect().top            // text baseline below the top of its row
      const target = bottomLimit - CH + rel                                    // viewport y that baseline should sit at
      sw.style.bottom = Math.max(0, H - bottomLimit + (CH - sw.offsetHeight) / 2) + 'px'
      const btn = sw.querySelector('button')
      sw.style.bottom = (parseFloat(sw.style.bottom) + (baseOf(btn) - target)) + 'px'
    }
    let S = Math.floor((bottomLimit - topLimit) / CH)   // free grid rows
    if (S % 2) S--                                      // an even count splits equally
    const GAP = 3                                       // blank grid rows kept above and below at the least
    const M = Math.max(6, Math.floor((S - 2 * GAP) / 2) * 2)   // mesh rows, a whole number of level-0 cells
    const TY = topLimit + ((S - M) / 2) * CH
    const wr = Math.min(R0, M / 2)
    const wc = Math.min(C0, Math.floor((W - 2 * 28) / L0W))
    const x0 = ox + Math.round(((W - wc * L0W) / 2 - ox) / CW) * CW
    const [r0, c0] = bestWindow(wr, wc)

    const accent = css('--accent') || '#0061bf'
    // the block shades \u2591 \u2592 \u2593 \u2588 as 2x2 device-pixel dither tiles: 1, 2, 3 and 4 of 4 pixels filled, so depth reads at any cell size and zoom
    const tiles = [[], [[0, 0]], [[0, 0], [1, 1]], [[0, 0], [1, 1], [1, 0]], [[0, 0], [1, 1], [1, 0], [0, 1]]].map((px) => {
      if (!px.length) return null
      const t = document.createElement('canvas')
      t.width = t.height = 2
      const tc = t.getContext('2d')
      tc.fillStyle = accent
      for (const [x, y] of px) tc.fillRect(x, y, 1, 1)
      const pat = ctx.createPattern(t, 'repeat')
      pat.setTransform(new DOMMatrix().scale(1 / dpr))
      return pat
    })
    const strength = [.55, .68, .8]                     // finer levels read a little stronger
    const put = (v, x, y, w, h, l) => {
      const k = shade(v)
      if (k < 1) return
      ctx.globalAlpha = strength[l]
      ctx.fillStyle = tiles[k]
      ctx.fillRect(x, y, w, h)
    }
    for (let r = 0; r < wr; r++) {
      for (let c = 0; c < wc; c++) {
        const R = r0 + r, C = c0 + c
        const px = x0 + c * L0W, py = TY + r * L0H
        if (g0[R][C] >= 0) { put(g0[R][C], px, py, L0W, L0H, 0); continue }
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const r1 = 2 * R + dr, c1 = 2 * C + dc
            const qx = px + dc * L0W / 2, qy = py + dr * L0H / 2
            if (g1[r1][c1] >= 0) { put(g1[r1][c1], qx, qy, L0W / 2, L0H / 2, 1); continue }
            for (let er = 0; er < 2; er++) for (let ec = 0; ec < 2; ec++) put(g2[2 * r1 + er][2 * c1 + ec], qx + ec * L0W / 4, qy + er * L0H / 4, L0W / 4, L0H / 4, 2)
          }
        }
      }
    }
    ctx.globalAlpha = 1

    // rulers down both edges, mirrored: a tick per row, a longer one every fifth, the row number every tenth
    const RW = 26
    const ruler = (side) => {
      const edge = side === 'l' ? RW : W - RW            // the ruler's inner line
      const dir = side === 'l' ? -1 : 1                   // ticks point away from the page
      ctx.fillStyle = css('--bg') || '#fefdfb'
      ctx.fillRect(side === 'l' ? 0 : W - RW, 0, RW, H)
      ctx.strokeStyle = css('--ascii-ruler') || 'rgba(110,108,96,.5)'
      ctx.fillStyle = css('--ascii-ruler') || 'rgba(110,108,96,.7)'
      ctx.beginPath()
      ctx.moveTo(edge + .5, 0); ctx.lineTo(edge + .5, H)
      ctx.font = '500 9px ' + fam
      ctx.textAlign = side === 'l' ? 'left' : 'right'
      ctx.textBaseline = 'middle'
      for (let r = 0, y = oy; y <= H; r++, y += CH) {
        const len = r % 10 === 0 ? 14 : r % 5 === 0 ? 9 : 5
        ctx.moveTo(edge + .5, y + .5); ctx.lineTo(edge + .5 + dir * len, y + .5)
        if (r % 10 === 0) ctx.fillText(String(r), side === 'l' ? 2 : W - 2, y - 7)
      }
      ctx.stroke()
    }
    ruler('l')
    ruler('r')
  }

  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw)
  addEventListener('resize', draw)
  if (window.ResizeObserver) new ResizeObserver(draw).observe(document.body)
  draw()
})()
