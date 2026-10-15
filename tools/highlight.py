#!/usr/bin/env python3
"""Add syntax-highlight spans to the code blocks in index.html (static markup, no runtime library): the install window and the BibTeX blocks.

Panes: pane-install and pane-run are shell, pane-python is Python. Re-running is safe: existing spans are stripped first.
"""
import html
import re

SRC = 'index.html'
PY_KW = {'from', 'import', 'with', 'as', 'def', 'return', 'for', 'in', 'if', 'else', 'None', 'True', 'False'}


def span(cls, text):
    return '<span class="tk-%s">%s</span>' % (cls, html.escape(text, quote=False))


def sh(line):
    out, i, expect_cmd, after_var = [], 0, True, False
    while i < len(line):
        c = line[i]
        if c == '#' and (i == 0 or line[i - 1] in ' \t'):
            out.append(span('com', line[i:])); break
        if c in '"\'':
            j = line.find(c, i + 1); j = len(line) if j < 0 else j + 1
            out.append(span('str', line[i:j])); i = j
            expect_cmd = after_var and expect_cmd; after_var = False; continue
        if line.startswith('&&', i) or line.startswith('||', i) or c == ';':
            n = 2 if c != ';' else 1
            out.append(span('op', line[i:i + n])); i += n; expect_cmd = True; continue
        if c == '\\' and i == len(line) - 1:
            out.append(span('op', c)); i += 1; continue
        m = re.match(r'[ \t]+', line[i:])
        if m:
            out.append(html.escape(m.group(0), quote=False)); i += m.end(); continue
        m = re.match(r'[^\s"\'&|;]+', line[i:])
        word = m.group(0); i += len(word)
        if word.startswith('-') and len(word) > 1:
            if '=' in word:
                k, v = word.split('=', 1)
                out.append(span('flag', k) + html.escape('=', quote=False) + (span('str', v) if v else ''))
            else:
                out.append(span('flag', word))
        elif re.match(r'^[A-Za-z_][A-Za-z0-9_]*=', word) and expect_cmd:
            k, v = word.split('=', 1)
            out.append(span('var', k) + html.escape('=', quote=False) + html.escape(v, quote=False))
            after_var = v == ''  # VAR="..." keeps the next word a command
        elif expect_cmd:
            out.append(span('cmd', word)); expect_cmd = False
        elif re.match(r'^\d+(\.\d+)?([eE]-?\d+)?$', word):
            out.append(span('num', word))
        elif re.match(r'^\d+-\d+$', word):
            out.append(span('num', word))
        elif word.startswith('http'):
            out.append(span('url', word))
        else:
            out.append(html.escape(word, quote=False))
    return ''.join(out)


def py(line):
    out, i = [], 0
    while i < len(line):
        c = line[i]
        if c == '#':
            out.append(span('com', line[i:])); break
        if c in '"\'':
            j = line.find(c, i + 1); j = len(line) if j < 0 else j + 1
            out.append(span('str', line[i:j])); i = j; continue
        m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', line[i:])
        if m:
            w = m.group(0); i += len(w)
            if w in PY_KW:
                out.append(span('kw', w))
            elif line[i:i + 1] == '(':
                out.append(span('fn', w))
            else:
                out.append(html.escape(w, quote=False))
            continue
        m = re.match(r'\d+(\.\d+)?([eE]-?\d+)?', line[i:])
        if m:
            out.append(span('num', m.group(0))); i += m.end(); continue
        out.append(html.escape(c, quote=False)); i += 1
    return ''.join(out)


def bib(line):
    out, i = [], 0
    while i < len(line):
        c = line[i]
        m = re.match(r'(@\w+)(\{)([^,\s]*)(,?)', line[i:])
        if m:
            out.append(span('kw', m.group(1)) + html.escape('{', quote=False) + span('fn', m.group(3)) + html.escape(m.group(4), quote=False))
            i += m.end(); continue
        m = re.match(r'([A-Za-z_]\w*)(\s*=\s*)', line[i:])
        if m:
            out.append(span('flag', m.group(1)) + html.escape(m.group(2), quote=False))
            i += m.end()
            if line[i:i + 1] == '{':
                depth, j = 0, i
                while j < len(line):
                    depth += (line[j] == '{') - (line[j] == '}')
                    j += 1
                    if depth == 0:
                        break
                inner = line[i + 1:j - 1] if depth == 0 else line[i + 1:]
                if re.fullmatch(r'\d+', inner):
                    out.append(html.escape('{', quote=False) + span('num', inner) + html.escape('}', quote=False))
                else:
                    out.append(span('str', line[i:j]))
                i = j
            continue
        out.append(html.escape(c, quote=False)); i += 1
    return ''.join(out)


def run():
    s = open(SRC).read()

    def block(m):
        pane, body = m.group(1), m.group(2)
        lang = py if pane == 'python' else sh
        text = html.unescape(re.sub(r'</?span[^>]*>', '', body))
        return m.group(0)[:m.start(2) - m.start(0)] + '\n'.join(lang(l) for l in text.split('\n')) + m.group(0)[m.end(2) - m.start(0):]

    def pane(m):
        name = m.group(1)
        count = [0]

        def pre(b):
            lang = py if (name == 'python' and count[0] > 0) else sh
            count[0] += 1
            text = html.unescape(re.sub(r'</?span[^>]*>', '', b.group(2)))
            return b.group(1) + '\n'.join(lang(l) for l in text.split('\n')) + b.group(3)

        inner = re.sub(r'(<pre><code>)(.*?)(</code></pre>)', pre, m.group(2), flags=re.S)
        return m.group(0).replace(m.group(2), inner, 1)

    s = re.sub(r'<div class="win-pane" id="pane-(install|run|python)"[^>]*>(.*?)\n              </div>', pane, s, flags=re.S)
    s = re.sub(r'(<pre class="bib"><code>)(.*?)(</code></pre>)',
               lambda b: b.group(1) + '\n'.join(bib(l) for l in html.unescape(re.sub(r'</?span[^>]*>', '', b.group(2))).split('\n')) + b.group(3),
               s, flags=re.S)
    open(SRC, 'w').write(s)


if __name__ == '__main__':
    run()
