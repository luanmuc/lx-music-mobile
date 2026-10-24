#!/usr/bin/env python3
# 发布 npm 版本信息包（luanmuc-lx-music-version-info）
# 由 CI（release.yml）在每次发布后调用：
#   - 读取 publish/version.json（本次版本信息）
#   - 查询 registry 当前最大版本号，patch+1（避免与已发布版本冲突 403）
#   - 更新 npm-version-info/package.json（versionInfo 字段）
#   - npm publish 到官方 registry（npmmirror 会自动镜像同步；staged 暂存会自动提升）
# 需要环境变量 NPM_TOKEN
import json
import os
import re
import subprocess
import urllib.request

PKG_NAME = 'luanmuc-lx-music-version-info'

with open('publish/version.json', encoding='utf-8') as f:
    vi = json.load(f)

# 查询 registry 当前生产版本，取最大 patch + 1
try:
    req = urllib.request.Request(f'https://registry.npmjs.org/{PKG_NAME}')
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode())
    nums = []
    for v in data.get('versions', {}):
        m = re.match(r'^(\d+)\.(\d+)\.(\d+)$', v)
        if m:
            nums.append(tuple(int(x) for x in m.groups()))
    if nums:
        major, minor, patch = max(nums)
        new_ver = f'{major}.{minor}.{patch + 1}'
    else:
        new_ver = '1.0.0'
except Exception:
    new_ver = '1.0.0'

pkg_dir = 'npm-version-info'
os.makedirs(pkg_dir, exist_ok=True)
pkg_file = os.path.join(pkg_dir, 'package.json')
pkg = {
    'name': PKG_NAME,
    'version': new_ver,
    'description': 'lx-music-mobile（落雪音乐移动版）在线更新版本信息',
    'author': 'luanyu',
    'license': 'MIT',
}
pkg['versionInfo'] = json.dumps(vi, ensure_ascii=False)
with open(pkg_file, 'w', encoding='utf-8') as f:
    json.dump(pkg, f, ensure_ascii=False, indent=2)

# 写入认证（CI 临时目录，不会被提交）
with open(os.path.join(pkg_dir, '.npmrc'), 'w') as f:
    f.write('//registry.npmjs.org/:_authToken={}\n'.format(os.environ['NPM_TOKEN']))

env = dict(os.environ)
env['npm_config_registry'] = 'https://registry.npmjs.org'
result = subprocess.run(['npm', 'publish', '--publish-tag=latest'], cwd=pkg_dir, env=env)
if result.returncode != 0:
    # 容错：token 过期/网络异常时不阻塞 Release（GitHub raw/jsdelivr 源仍正常提供版本信息）
    print('WARNING: npm publish 失败（可能 NPM_TOKEN 过期），本次 Release 不受影响；')
    print('        npm 版本信息通道未更新，需在 token 到期前更换 GitHub secret NPM_TOKEN。')
else:
    print('npm published:', pkg['name'], pkg['version'], '| versionInfo.version =', vi.get('version'))
