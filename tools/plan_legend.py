# Appends each plan map's legend as a panel under the map (works-board olive and cream), so no legend hides the plan.
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
def font(sz, bold=False):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSerif%s.ttf' % ('-Bold' if bold else ''), '/usr/share/fonts/truetype/liberation/LiberationSerif-%s.ttf' % ('Bold' if bold else 'Regular')]:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
for lv in (5, 6, 7, 8):
    src = os.path.join(d, 'level%d_plan.png' % lv); js = os.path.join(d, 'level%d_plan.json' % lv)
    if not os.path.exists(js): continue
    items = json.load(open(js)); im = Image.open(src).convert('RGB'); W, H = im.size
    cols = 2; rows = (len(items) + 1) // 2; ph = 30 + rows * 30
    out = Image.new('RGB', (W, H + ph), (31, 37, 18)); out.paste(im, (0, 0)); g = ImageDraw.Draw(out)
    g.line([(0, H), (W, H)], fill=(226, 181, 74), width=3); f = font(17); fb = font(13, True)
    for i, (n, label, col) in enumerate(items):
        c, r = i // rows, i % rows; x = 20 + c * (W // 2); y = H + 18 + r * 30
        rgb = tuple(int(col[k:k+2], 16) for k in (1, 3, 5)); g.ellipse([x, y, x + 22, y + 22], fill=rgb)
        t = str(n); tw = g.textlength(t, font=fb); g.text((x + 11 - tw / 2, y + 4), t, fill=(31, 37, 18), font=fb)
        g.text((x + 32, y + 1), label if g.textlength(label, font=f) < W // 2 - 60 else label[:int(len(label) * (W // 2 - 80) / g.textlength(label, font=f))] + '…', fill=(236, 226, 198), font=f)
    out.save(src); os.remove(js); print('legend', lv)
