"""Build-time glyph outlines for the shared link-preview image (MOD-Meta, F-015, NFR-12).

Usage: python scripts/preview-glyphs.py <fontsource-root> <out.json>   (request JSON on stdin)
Needs fonttools + brotli (requirements-build.txt, DEP-42 and DEP-43).

The preview image is an SVG rasterized by sharp (DEP-31). Its text is drawn as outlines, so the image looks the
same on every machine without system fonts. Request: {"<key>": {"font": "<file under fontsource-root>",
"wght": 600, "size": 48, "text": "..."}}. Output, per key: the words as SVG path data in pixels (baseline at
y = 0, each word starting at x = 0) with their advance widths, the width of a space, and the ascent and descent.
Kerning is not applied; at preview sizes the advance widths alone read well.
"""
import json
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

_fonts = {}


def load(path, wght):
    key = (path, wght)
    if key not in _fonts:
        font = TTFont(path)
        if 'fvar' in font:
            font = instancer.instantiateVariableFont(font, {'wght': wght})
        _fonts[key] = font
    return _fonts[key]


def fmt(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s == '-0' else s


def word_run(font, size, word):
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    scale = size / font['head'].unitsPerEm
    pen = SVGPathPen(glyphs, ntos=fmt)
    x = 0.0
    for ch in word:
        name = cmap.get(ord(ch))
        if name is None:
            raise SystemExit(f'preview-glyphs: no glyph for {ch!r} (U+{ord(ch):04X}) in {font.reader.file.name}')
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        x += glyphs[name].width * scale
    return {'d': pen.getCommands(), 'width': round(x, 2)}


def run(root, spec):
    font = load(os.path.join(root, spec['font']), spec['wght'])
    size = spec['size']
    scale = size / font['head'].unitsPerEm
    space = font.getGlyphSet()[font.getBestCmap()[ord(' ')]].width * scale
    hhea = font['hhea']
    return {
        'words': [word_run(font, size, w) for w in spec['text'].split()],
        'space': round(space, 2),
        'ascent': round(hhea.ascent * scale, 2),
        'descent': round(-hhea.descent * scale, 2),
    }


def main():
    root, out = sys.argv[1], sys.argv[2]
    request = json.load(sys.stdin)
    result = {key: run(root, spec) for key, spec in request.items()}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(result, f, separators=(',', ':'))
    print(f'preview: glyph outlines for {len(result)} runs')


if __name__ == '__main__':
    main()
