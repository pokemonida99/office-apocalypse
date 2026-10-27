# 連結縮圖（貼文預覽圖）：GPT 畫的主視覺（work/og/og_raw.png，左邊留白）＋遊戲字型的標題 → og.jpg（1200×630）
# 用法：python3 tools/make_og.py
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H = 1200, 630
im = Image.open('work/og/og_raw.png').convert('RGB')
s = max(W / im.width, H / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
def font(size, weight):
    f = ImageFont.truetype('work/fonts/NotoSansTC.ttf', size)
    try: f.set_variation_by_axes([weight])
    except Exception: pass
    return f
INK, RED, PAPER = (20, 43, 69), (217, 72, 59), (255, 253, 248)
# 左邊淡淡的奶油色漸層，讓字更清楚
fade = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(fade)
for x in range(560): fd.line([(x, 0), (x, H)], fill=int(170 * (1 - x / 560) ** 1.4))
im = Image.composite(Image.new('RGB', (W, H), (255, 246, 232)), im, fade)
d = ImageDraw.Draw(im)
def text(xy, t, f, fill, stroke=0, sc=PAPER, shadow=True):
    if shadow:
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).text((xy[0] + 4, xy[1] + 7), t, font=f, fill=(20, 43, 69, 110), stroke_width=stroke, stroke_fill=(20, 43, 69, 110))
        im.paste(sh.filter(ImageFilter.GaussianBlur(4)), (0, 0), sh.filter(ImageFilter.GaussianBlur(4)))
    ImageDraw.Draw(im).text(xy, t, font=f, fill=fill, stroke_width=stroke, stroke_fill=sc)
# 小標籤
tag = font(34, 900); tw = d.textlength('3D 打雜升級小遊戲', font=tag)
d.rounded_rectangle((56, 150, 56 + tw + 40, 206), 12, fill=RED); d.text((76, 152), '3D 打雜升級小遊戲', font=tag, fill=PAPER)
# 大標題（兩行）
big = font(132, 900)
text((50, 214), '上班', big, INK, 10)
text((50, 366), '啟示錄', big, INK, 10)
# 下面一行
sub = font(30, 800)
d.rounded_rectangle((56, 540, 56 + d.textlength('免費・手機直接玩・不用下載', font=sub) + 36, 590), 25, fill=INK)
d.text((74, 545), '免費・手機直接玩・不用下載', font=sub, fill=PAPER)
im.save('og.jpg', quality=88)
print('og.jpg', im.size)
