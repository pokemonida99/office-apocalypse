# 表情頭像：GPT 畫的 3×2 表情表（work/gpt/expr/sheet_<角色>.png）切成六格 → icons/expr/<角色>_<表情>.webp（小劇場對話框用）
# 用法：python3 tools/cut_expr.py
import glob, os
from PIL import Image
FACES = ['happy', 'shock', 'angry', 'tired', 'smug', 'cry']   # 左上→右下，跟提示詞順序一樣
os.makedirs('icons/expr', exist_ok=True)
for f in sorted(glob.glob('work/gpt/expr/sheet_*.png')):
    k = os.path.basename(f)[6:-4]; im = Image.open(f).convert('RGB'); W, H = im.size; cw, ch = W / 3, H / 2
    for i, face in enumerate(FACES):
        x0, y0 = (i % 3) * cw, (i // 3) * ch; s = min(cw, ch) * 0.94
        cx, cy = x0 + cw / 2, y0 + ch / 2
        im.crop((int(cx - s / 2), int(cy - s / 2), int(cx + s / 2), int(cy + s / 2))).resize((192, 192), Image.LANCZOS).save(f'icons/expr/{k}_{face}.webp', quality=82)
    print(k, 'ok')
