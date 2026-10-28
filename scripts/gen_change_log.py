#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成发布说明 publish/changeLog.md：
1) 变更列表 = git log 自上次 tag 以来的提交（过滤 CI 自动提交），首次构建回退最近 30 条
2) File MD5 = artifacts/ 目录下所有 APK 的 MD5 清单

由 .github/workflows/release.yml 的 "Generate file MD5" 步骤调用。
"""
import glob
import hashlib
import os
import subprocess


def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip()


def main():
    # 1) 变更列表
    last_tag = run("git describe --tags --abbrev=0 2>/dev/null")
    if last_tag:
        raw = run("git log --oneline --no-merges {}..HEAD".format(last_tag))
    else:
        raw = run("git log --oneline --no-merges -30")
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    # 过滤 CI 自动提交（版本信息回写）
    filtered = [ln for ln in lines if 'chore: 更新版本信息' not in ln]
    if not filtered:
        filtered = ['- 本次无代码变更（仅发布/文档调整）']
    else:
        filtered = ['- ' + ln for ln in filtered[:40]]
    body = '\n'.join(filtered)

    # 2) File MD5
    md5_lines = []
    for apk in sorted(glob.glob('artifacts/*.apk')):
        md5_lines.append('{}  {}'.format(hashlib.md5(open(apk, 'rb').read()).hexdigest(),
                                         os.path.basename(apk)))

    content = (
        '### 更新内容\n\n'
        '基于洛雪音乐原版 v1.9.1 的定制版构建。本次更新：\n\n'
        + body + '\n\n'
        '### File MD5\n```\n'
        + '\n'.join(md5_lines) +
        '\n```\n\n'
        '[软件安装包说明](https://lyswhut.github.io/lx-music-doc/download#%E8%BD%AF%E4%BB%B6%E5%AE%89%E8%A3%85%E5%8C%85%E8%AF%B4%E6%98%8E)\n'
    )

    os.makedirs('publish', exist_ok=True)
    with open('publish/changeLog.md', 'w', encoding='utf-8') as f:
        f.write(content)
    print(content)


if __name__ == '__main__':
    main()
