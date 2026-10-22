# 把 GLB 模型繞 Y 軸轉 90 度（臉從 +x 轉到 +z），直接改頂點資料，給綁骨架服務用
# 用法：python3 tools/face_front.py 輸入.glb 輸出.glb
import json, struct, sys
src, dst = sys.argv[1], sys.argv[2]
b = bytearray(open(src, 'rb').read())
jlen = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jlen])
bin_off = 20 + jlen + 8  # BIN 區塊資料起點

def rot(x, y, z):  # (x,y,z) → (-z, y, x)：+x 轉到 +z
    return -z, y, x

done = set()
for m in j['meshes']:
    for p in m['primitives']:
        for key in ('POSITION', 'NORMAL'):
            ai = p['attributes'].get(key)
            if ai is None or ai in done: continue
            done.add(ai)
            a = j['accessors'][ai]; bv = j['bufferViews'][a['bufferView']]
            assert a['componentType'] == 5126 and a['type'] == 'VEC3'
            stride = bv.get('byteStride', 12)
            base = bin_off + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
            lo, hi = [1e9] * 3, [-1e9] * 3
            for i in range(a['count']):
                o = base + i * stride
                v = rot(*struct.unpack_from('<3f', b, o))
                struct.pack_into('<3f', b, o, *v)
                lo = [min(lo[k], v[k]) for k in range(3)]; hi = [max(hi[k], v[k]) for k in range(3)]
            if 'min' in a: a['min'], a['max'] = lo, hi
            print(key, a['count'], 'min', [round(x, 3) for x in lo], 'max', [round(x, 3) for x in hi])

# 寫回 JSON（長度要補到 4 的倍數）
js = json.dumps(j, separators=(',', ':')).encode()
js += b' ' * ((4 - len(js) % 4) % 4)
rest = bytes(b[20 + jlen:])
out = bytearray(b[:12]) + struct.pack('<I', len(js)) + b'JSON' + js + rest
struct.pack_into('<I', out, 8, len(out))
open(dst, 'wb').write(out)
print('寫出', dst, len(out))
