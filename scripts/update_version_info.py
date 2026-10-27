#!/usr/bin/env python3
# 生成 publish/version.json（版本信息文件），供 App 在线更新检查
# 由 CI（release.yml）在每次发布后调用；环境变量 LX_VER 为本次版本号（不带 v 前缀，如 1.9.1-b9）
import json
import os

old = {}
try:
    with open('publish/version.json', encoding='utf-8') as f:
        old = json.load(f)
except Exception:
    old = {}

VER = os.environ.get('LX_VER', '')

# 更新内容段：取 changeLog.md 中 "### 更新内容" 到 "### File MD5" 之间的非空行
desc = ''
try:
    lines = open('publish/changeLog.md', encoding='utf-8').read().splitlines()
    capture = False
    parts = []
    for line in lines:
        s = line.strip()
        if s == '### 更新内容':
            capture = True
            continue
        if s == '### File MD5':
            break
        if capture and s:
            parts.append(s)
    desc = '\n'.join(parts)
except Exception:
    pass

# 累积历史版本（最近 6 条，新版本在前）
history = old.get('history', []) if isinstance(old.get('history', []), list) else []
if old.get('version') and old.get('version') != VER:
    history = [{'version': old['version'], 'desc': old.get('desc', '')}] + history
history = history[:6]

data = {
    'version': VER,
    'desc': desc,
    'history': history,
}
with open('publish/version.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('version.json ->', json.dumps(data, ensure_ascii=False))
