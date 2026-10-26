"""Build-time font subsetting (ADR-0003, amendment from SP-6).

Usage: python scripts/subset-fonts.py <fontsource-root> <out-dir>
Needs fonttools + brotli (requirements-build.txt).

Ships exactly these faces, and nothing else (scripts/check-dist-fonts.ts enforces it):
- Manrope: variable 400-700, Latin core + Vietnamese.
- Unbounded: static 600, Latin (headings: ASCII set plus the Latin-1 letters Vietnamese uses, é included) + Vietnamese.
- JetBrains Mono: variable 400-600, ASCII only, code ligatures off.
No latin-ext: its range overlaps Vietnamese, so any Vietnamese text would download both faces.
"""
import io
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

LATIN = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,'
         'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD')
VIET = ('U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,'
        'U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB')
# Headings and mono text: ASCII letters, digits and basic punctuation.
ASCII = 'U+0020-007E,U+00A0,U+00B7,U+2013-2014,U+2018-201D,U+2026'
# Headings also get é (COPY-resume.title is "My résumé", F-017) and the other Latin-1 letters Vietnamese uses
# (F-019, ADR-0012: à á â ã è é ê ì í ò ó ô õ ù ú ý and their capitals); the Vietnamese file has the rest.
VIET_LATIN1 = ('U+00C0-00C3,U+00C8-00CA,U+00CC-00CD,U+00D2-00D5,U+00D9-00DA,U+00DD,'
               'U+00E0-00E3,U+00E8-00EA,U+00EC-00ED,U+00F2-00F5,U+00F9-00FA,U+00FD')
HEADINGS = ASCII + ',' + VIET_LATIN1

TEXT_FEATURES = ('kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk')
NO_LIGATURES = ('kern', 'ccmp', 'locl', 'mark', 'mkmk')

# (source file under @fontsource-variable, output name, unicode range, weight axis, layout features)
JOBS = [
    ('manrope/files/manrope-latin-wght-normal.woff2', 'manrope-latin.woff2', LATIN, (400, 700), TEXT_FEATURES),
    ('manrope/files/manrope-vietnamese-wght-normal.woff2', 'manrope-vietnamese.woff2', VIET, (400, 700), TEXT_FEATURES),
    ('unbounded/files/unbounded-latin-wght-normal.woff2', 'unbounded-600-latin.woff2', HEADINGS, 600, TEXT_FEATURES),
    ('unbounded/files/unbounded-vietnamese-wght-normal.woff2', 'unbounded-600-vietnamese.woff2', VIET, 600, TEXT_FEATURES),
    ('jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'jbmono-ascii.woff2', ASCII, (400, 600), NO_LIGATURES),
]


def codepoints(ranges):
    out = []
    for part in ranges.replace('U+', '').split(','):
        a, _, b = part.partition('-')
        out += range(int(a, 16), int(b or a, 16) + 1)
    return out


def make(src, dst, unicodes, wght, features):
    font = TTFont(src, lazy=False)
    opts = subset.Options()
    opts.layout_features = list(features)
    opts.name_IDs = [1, 2]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=codepoints(unicodes))
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = None
    font.save(buf)
    buf.seek(0)
    font = instancer.instantiateVariableFont(TTFont(buf, lazy=False), {'wght': wght}, updateFontNames=False)
    font.flavor = 'woff2'
    font.save(dst)
    return os.path.getsize(dst)


def main():
    root, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for name in os.listdir(out):
        if name.endswith('.woff2'):
            os.remove(os.path.join(out, name))
    total = 0
    for src, dst, unicodes, wght, features in JOBS:
        total += make(os.path.join(root, src), os.path.join(out, dst), unicodes, wght, features)
    print(f'fonts: {len(JOBS)} subsets, {total / 1024:.1f} KB')


if __name__ == '__main__':
    main()
