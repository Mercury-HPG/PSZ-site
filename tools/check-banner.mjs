#!/usr/bin/env node
// Regression test for the shared banner.
//
// The banner is one mechanism used by more than one site, so it has to be one
// piece of CSS: identical rules everywhere, with the palette pushed out into
// tokens. This asserts exactly that, plus the markup shape the rules assume.
// Run from a site's root:  node tools/check-banner.mjs
import { readFileSync, readdirSync } from 'node:fs'

const fail = []
const check = (ok, msg) => { if (!ok) fail.push(msg) }

const css = readFileSync('assets/style.css', 'utf8')
const canon = readFileSync('tools/banner.css', 'utf8')

// 1. the rules themselves, byte for byte
const i = css.indexOf('/* ---------- header')
const j = css.indexOf('/* ---------- headings')
check(i >= 0 && j > i, 'no banner block found in assets/style.css')
const block = i >= 0 && j > i ? css.slice(i, j) : ''
check(block === canon,
  'banner block has drifted from tools/banner.css -- the sites no longer share one banner')

// 1b. the rest of the component suite, each delimited by its own sentinels
for (const name of ['quiet']) {
  const want = readFileSync(`tools/${name}.css`, 'utf8')
  const open = `/* ==== component: ${name}`
  const close = `/* ==== end component: ${name} ==== */`
  const a = css.indexOf(open)
  const b = css.indexOf(close)
  check(a >= 0 && b > a, `component ${name} is missing from assets/style.css`)
  if (a >= 0 && b > a) {
    check(css.slice(a, b + close.length) + '\n' === want,
      `component ${name} has drifted from tools/${name}.css`)
  }
}

// 2. every token the block reads is declared
const used = [...new Set([...canon.matchAll(/var\((--bar[a-z-]*)\)/g)].map((m) => m[1]))]
for (const t of used) {
  check(new RegExp(`^\\s*${t}:`, 'm').test(css), `token ${t} is used by the banner but never declared`)
}

// 3. the block must not carry a literal colour: that is what drifted last time
const literals = block.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []
check(literals.length === 0, `banner block hardcodes ${literals.join(', ')} -- move it to a --bar token`)

// 4. cells fill the bar when there is room and never shrink below their label.
//    `0 0 auto` satisfied only the second half and left dead bar beside them.
check(/\.banner > li \{ flex: 1 0 auto; \}/.test(block),
  'narrow-width cells must be `flex: 1 0 auto` so they fill the bar')

// 5. the markup the rules assume
for (const page of readdirSync('.').filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(page, 'utf8')
  const nav = html.match(/<ul class="banner">([\s\S]*?)<\/ul>/)
  if (!nav) continue
  const cells = [...nav[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1])
  check(cells.length > 0, `${page}: banner has no cells`)
  check(/class="[^"]*\bbrand-cell\b/.test(nav[1]), `${page}: banner is missing its brand cell`)
  const current = (nav[1].match(/aria-current="page"/g) ?? []).length
  check(current === 1, `${page}: expected exactly one aria-current="page", found ${current}`)
  for (const c of cells) {
    check(/class="idx"/.test(c) && /class="label"/.test(c),
      `${page}: every banner cell needs an .idx and a .label`)
  }
  check(/class="ext"/.test(nav[1]), `${page}: banner has no external cell`)
}

if (fail.length) {
  console.error('banner check FAILED')
  for (const f of fail) console.error('  - ' + f)
  process.exit(1)
}
console.log(`component check ok (banner ${block.length}B + quiet, ${used.length} bar tokens)`)
