# 讀 Higgsfield media_upload 存下來的回應檔，把檔案 PUT 上去（不用手抄網址）
# 用法：python3 tools/hf_put.py 回應檔.txt 檔案所在資料夾 [只上傳這些檔名...]
import json, sys, re, subprocess, os
raw = json.loads(open(sys.argv[1]).read())
if isinstance(raw, list): raw = json.loads(raw[0]['text'])
folder = sys.argv[2]; only = set(sys.argv[3:])
for u in raw['uploads']:
    fn = re.search(r'--data-binary @(\S+)', u['instructions']).group(1)
    if only and fn not in only: continue
    path = os.path.join(folder, fn)
    if not os.path.exists(path): continue
    r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'PUT', '-H', 'Content-Type: ' + u['content_type'], '-H', 'If-None-Match: *', '--data-binary', '@' + path, u['upload_url']], capture_output=True, text=True)
    print(fn, r.stdout, u['media_id'], u['url'])
