#!/bin/zsh
# 主畫面圖示：work/icons/<角色>.png（GPT 原圖）→ icons/<角色>-180/192/512.png ＋ manifest-<角色>.json
cd "${0:A:h}/.."
mkdir -p icons
typeset -A NAME=(kui 小葵 mi 小米 jie 阿傑 vivi Vivi)
typeset -A BG=(kui '#ffb347' mi '#5fd3b8' jie '#7b6cff' vivi '#ff5d8f')
for k in kui mi jie vivi; do
  src=work/icons/$k.png; [ -f $src ] || { echo "缺 $src"; continue; }
  # 裁成正方形（取短邊置中）再縮
  w=$(sips -g pixelWidth $src | awk '/pixelWidth/{print $2}'); h=$(sips -g pixelHeight $src | awk '/pixelHeight/{print $2}')
  s=$(( w < h ? w : h ))
  sips -s format png -c $s $s $src --out icons/$k-512.png >/dev/null && sips -z 512 512 icons/$k-512.png >/dev/null
  for n in 192 180; do sips -z $n $n icons/$k-512.png --out icons/$k-$n.png >/dev/null; done
  cat > icons/manifest-$k.json <<JSON
{
  "name": "上班啟示錄",
  "short_name": "上班啟示錄",
  "start_url": "../",
  "scope": "../",
  "display": "fullscreen",
  "orientation": "portrait",
  "background_color": "#f6e3c8",
  "theme_color": "${BG[$k]}",
  "icons": [
    { "src": "$k-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "$k-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "$k-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
JSON
  echo "$k（${NAME[$k]}）ok"
done
