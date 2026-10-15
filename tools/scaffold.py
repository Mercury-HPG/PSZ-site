#!/usr/bin/env python3
"""Draw the hero's glyph scaffold (outlines and guides) as inline SVG between the scaffold markers in index.html.

usage: scaffold.py PaperMono-var.woff2 [index.html]
"""
import re
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib.removeOverlaps import removeOverlaps
from fontTools.varLib.instancer import instantiateVariableFont

ROWS = ['pSZ/', 'cuSZ']
ADV = 606
WGHT = 700
ROW_H = 980
BASE0 = 780
CAP, XH, DESC = 710, 509, -210
LEFT, RIGHT = 0, ADV * 4
H = BASE0 + ROW_H - DESC + 40


def glyph_svg(font, gs, name, ox, base):
    pen = SVGPathPen(gs)
    gs[name].draw(pen)
    d = pen.getCommands()
    s = [f'<g class="sc-glyph" transform="translate({ox} {base}) scale(1 -1)">',
         f'<rect class="sc-hit" x="0" y="{DESC - 30}" width="{ADV}" height="{CAP - DESC + 60}"/>',
         f'<path class="sc-shadow" d="{d}" transform="translate(0 -48)"/>',
         f'<path class="sc-outline" d="{d}"/>']
    s.append('</g>')
    return '\n'.join(s)


def build(font):
    cmap, gs = font.getBestCmap(), font.getGlyphSet()
    out = [f'<svg class="scaffold" viewBox="{LEFT} 0 {RIGHT - LEFT} {H}" aria-hidden="true" focusable="false">',
           '<defs><pattern id="sc-dot" width="22" height="22" patternUnits="userSpaceOnUse">'
           '<circle cx="0" cy="0" r="3.4"/><circle cx="11" cy="11" r="3.4"/><circle cx="22" cy="0" r="3.4"/>'
           '<circle cx="0" cy="22" r="3.4"/><circle cx="22" cy="22" r="3.4"/></pattern></defs>']
    for k in range(5):
        x = k * ADV
        out.append(f'<path class="sc-guide" d="M{x} 0V{H}"/>')
    for r, row in enumerate(ROWS):
        base = BASE0 + r * ROW_H
        for y in (CAP, XH, 0, DESC):
            out.append(f'<path class="sc-guide" d="M{LEFT} {base - y}H{RIGHT}"/>')
        for c, ch in enumerate(row):
            ox = c * ADV
            out.append(glyph_svg(font, gs, cmap[ord(ch)], ox, base))
    out.append('</svg>')
    return '\n'.join(out)


def main():
    font = instantiateVariableFont(TTFont(sys.argv[1]), {'wght': WGHT})
    removeOverlaps(font)
    path = sys.argv[2] if len(sys.argv) > 2 else 'index.html'
    svg = build(font)
    html = open(path, encoding='utf-8').read()
    html, n = re.subn(r'(<!-- scaffold:begin -->).*?(<!-- scaffold:end -->)',
                      lambda m: f'{m.group(1)}\n{svg}\n{m.group(2)}', html, flags=re.S)
    if n != 1:
        sys.exit('scaffold markers not found')
    open(path, 'w', encoding='utf-8').write(html)
    print(f'{len(svg)} bytes of SVG')


if __name__ == '__main__':
    main()
