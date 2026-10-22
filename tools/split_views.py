# 三視圖（正面｜面向右的側面｜背面）切成 Tripo 要的四張：front、left（側面鏡像）、back、right
# 用法：python3 tools/split_views.py work/art/d_npc_m.png work/3d/npc_m
import sys
from PIL import Image, ImageOps
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); w, h = im.size; bg = im.getpixel((5, 5))
views = {}
for i, n in enumerate(['front', 'right', 'back']):
    c = im.crop((int(w * i / 3), 0, int(w * (i + 1) / 3), h)); s = max(c.size)
    sq = Image.new('RGB', (s, s), bg); sq.paste(c, ((s - c.width) // 2, (s - c.height) // 2))
    views[n] = sq.resize((1024, 1024))
views['left'] = ImageOps.mirror(views['right'])
for n in ['front', 'left', 'back', 'right']:
    views[n].save(f'{out}_{n}.png')
print('ok', out)
