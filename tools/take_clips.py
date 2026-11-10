# -*- coding: utf-8 -*-
# 從下班先鬥牛的動作包（models/moves/pack/角色.glb）只抽出要用的幾段動作，存成小檔
# 用法：python3 tools/take_clips.py 動作包.glb 輸出.glb run [其他動作名...]
import sys, json, struct

def read(path):
    d = open(path, 'rb').read()
    n = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + n]), d[28 + n:]

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3:]
j, b = read(src)
nodes, node_of, buf, views, accs, anims, seen = [], {}, bytearray(), [], [], [], {}
def copy(i):
    if i in seen: return seen[i]
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    raw = bytes(b[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
    while len(buf) % 4: buf.append(0)
    views.append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)}); buf.extend(raw)
    acc = {k: a[k] for k in a if k != 'bufferView'}; acc['bufferView'] = len(views) - 1
    accs.append(acc); seen[i] = len(accs) - 1
    return seen[i]
for an in j['animations']:
    if an['name'] not in names: continue
    samplers, chans = [], []
    for c in an['channels']:
        s = an['samplers'][c['sampler']]
        samplers.append({'input': copy(s['input']), 'output': copy(s['output']), 'interpolation': s.get('interpolation', 'LINEAR')})
        nm = j['nodes'][c['target']['node']]['name']
        if nm not in node_of: node_of[nm] = len(nodes); nodes.append({'name': nm})
        chans.append({'sampler': len(samplers) - 1, 'target': {'node': node_of[nm], 'path': c['target']['path']}})
    anims.append({'name': an['name'], 'samplers': samplers, 'channels': chans})
missing = set(names) - {a['name'] for a in anims}
if missing: sys.exit(f'找不到動作：{missing}')
while len(buf) % 4: buf.append(0)
g = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'animations': anims, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}]}
js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
with open(out, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(buf)) + b'BIN\0' + bytes(buf))
print(out, len(anims), '段', (28 + len(js) + len(buf)) // 1024, 'KB')
