# 離職結局劇照：work/gpt/ending/<id>.png → art/ending/<id>.webp（寬 1024）
# 用法：python3 tools/ending_webp.py
import glob, os
from PIL import Image
os.makedirs('art/ending', exist_ok=True)
for f in sorted(glob.glob('work/gpt/ending/e*.png')):
    k = os.path.basename(f)[:-4]; im = Image.open(f).convert('RGB')
    if im.width > 1024: im = im.resize((1024, round(im.height * 1024 / im.width)), Image.LANCZOS)
    im.save(f'art/ending/{k}.webp', quality=80); print(k, im.size)
