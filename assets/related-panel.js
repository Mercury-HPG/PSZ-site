// Hovering the banner's Related cell drops a small panel listing the related projects.
(() => {
  const header = document.querySelector('.site-header')
  const cell = [...document.querySelectorAll('.banner a')].find((a) => a.querySelector('.label') && a.querySelector('.label').textContent.trim() === 'Related')
  if (!header || !cell || !matchMedia('(hover: hover)').matches) return

  const panel = document.createElement('div')
  panel.className = 'related-panel'
  panel.id = 'related-panel'
  panel.hidden = true
  panel.innerHTML = [
    '<p class="related-note">related projects</p>',
    '<p><a href="https://mercury-hpg.github.io/SGCC-site/">SGCC</a><span class="related-what">NSF CSSI cyberinfrastructure</span></p>',
    '<p><a href="https://mercury-hpg.github.io/PHF-site/">Parallel Huffman</a><span class="related-what">GPU entropy coding</span></p>',
    '<p><a href="https://github.com/robertu94/libpressio">LibPressio</a><span class="related-what">compressor interface</span></p>',
  ].join('')
  header.append(panel)
  cell.setAttribute('aria-controls', panel.id)
  cell.setAttribute('aria-expanded', 'false')

  const place = () => {
    const r = cell.getBoundingClientRect()
    const w = panel.offsetWidth
    panel.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px'
  }
  let timer = 0
  const open = () => {
    clearTimeout(timer)
    panel.hidden = false
    place()
    cell.setAttribute('aria-expanded', 'true')
  }
  const close = () => {
    clearTimeout(timer)
    panel.hidden = true
    cell.setAttribute('aria-expanded', 'false')
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(close, 160) }

  for (const el of [cell.parentElement, panel]) {
    el.addEventListener('mouseenter', open)
    el.addEventListener('mouseleave', later)
  }
  cell.addEventListener('focus', open)
  panel.addEventListener('focusout', (e) => { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== cell) later() })
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close() })
})()
