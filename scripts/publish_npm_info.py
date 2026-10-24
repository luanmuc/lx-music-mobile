#!/usr/bin/env python3
# 发布 npm 版本信息包（luanmuc-lx-music-version-info）
# 由 CI（release.yml）在每次发布后调用：
#   - 读取 publish/version.json（本次版本信息）
#   - 更新 npm-version-info/package.json（包版本递增 + versionInfo 字段）
#   - npm publish 到官方 registry（npmmirror 会自动镜像同步）
# 需要环境变量 NPM_TOKEN
import json
import os
import subprocess

with open('publish/version.json', encoding='utf-8') as f:
    vi = json.load(f)

pkg_dir = 'npm-version-info'
os.makedirs(pkg_dir, exist_ok=True)
pkg_file = os.path.join(pkg_dir, 'package.json')

# 包版本递增（npm 不允许同版本重复发布）
try:
    with open(pkg_file, encoding='utf-8') as f:
        pkg = json.load(f)
    major, minor, patch = pkg['version'].split('.')
    pkg['version'] = f'{major}.{minor}.{int(patch) + 1}'
except Exception:
    pkg = {
        'name': 'luanmuc-lx-music-version-info',
        'version': '1.0.0',
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
    raise SystemExit('npm publish failed')
print('npm published:', pkg['name'], pkg['version'], '| versionInfo.version =', vi.get('version'))
