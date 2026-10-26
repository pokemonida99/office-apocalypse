# 字型子集：只留遊戲裡用到的字，做成小小的 woff2 跟遊戲一起放（離線也能用）
# 改了畫面上的文字就重跑：python3 tools/build_font.py
# 原始字型（Noto Sans TC 可變字重、Bungee，都是 SIL OFL）放在 work/fonts/（不進 git）
import glob, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

files = ['index.html'] + glob.glob('js/*.js') + glob.glob('css/*.css')
text = ''.join(open(f, encoding='utf-8').read() for f in files)
chars = set(c for c in text if ord(c) > 0x2E7F)   # 中日韓文字、全形標點
chars |= set(chr(c) for c in range(0x20, 0x7F))     # 英數
chars |= set('０１２３４５６７８９，。、！？：；（）「」『』—…～・．％＋－×÷＝／')
print('字數', len(chars))

# Noto Sans TC：只留 500～900 字重，再取子集
# 先取子集再限制字重（反過來做 fontTools 會出錯）
f = TTFont('work/fonts/NotoSansTC.ttf')
opt = subset.Options(); opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.notdef_outline = True
s = subset.Subsetter(opt); s.populate(text=''.join(chars)); s.subset(f)
f = instancer.instantiateVariableFont(f, {'wght': (500, 900)})
f.flavor = 'woff2'; f.save('fonts/noto-tc-sub.woff2')

# Bungee：數字、金額用（只留英數）
b = TTFont('work/fonts/Bungee.ttf')
s = subset.Subsetter(opt); s.populate(text=''.join(chr(c) for c in range(0x20, 0x7F))); s.subset(b)
b.flavor = 'woff2'; b.save('fonts/bungee-sub.woff2')
import os
for p in ['fonts/noto-tc-sub.woff2', 'fonts/bungee-sub.woff2']: print(p, os.path.getsize(p) // 1024, 'KB')
