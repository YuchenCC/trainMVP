#!/bin/bash

# 获取当前日期
current_date=$(date +%Y%m%d)

# 查找最新版本号
latest_version=$(ls handoff-${current_date}-v*.md 2>/dev/null | sort -V | tail -n1 | sed "s/handoff-${current_date}-v\([0-9]*\)\.md/\1/")

# 计算下一个版本号
next_version=$((latest_version + 1))

# 如果没有找到版本号，默认从 v1 开始
if [ -z "$next_version" ] || [ "$next_version" -eq 0 ]; then
    next_version=1
fi

# 生成输出文件名
handoff_file="handoff-${current_date}-v${next_version}.md"

# 输出文件名供后续使用
echo "$handoff_file"