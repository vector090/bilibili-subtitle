#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> [build] bilibili-subtitle"

# 1. 安装依赖（若 node_modules 缺失或 lockfile 变更）
if [ ! -d node_modules ]; then
    echo "==> 依赖未安装，执行 pnpm install"
    pnpm install
elif [ pnpm-lock.yaml -nt node_modules ]; then
    echo "==> lockfile 已更新，执行 pnpm install"
    pnpm install
fi

# 2. 确保 esbuild 的构建脚本已执行（pnpm 默认忽略 postinstall）
if [ ! -x node_modules/esbuild/bin/esbuild ] && [ -f node_modules/esbuild/install.js ]; then
    echo "==> 重建 esbuild"
    pnpm rebuild esbuild
fi

# 3. 构建
echo "==> 执行 pnpm run build"
pnpm run build

echo "==> 构建完成，产物位于 dist/"

# 4. 可选：打包为 dist.zip（传入 --zip 启用）
if [ "${1:-}" = "--zip" ]; then
    echo "==> 打包 dist.zip"
    rm -f dist.zip
    ( cd dist && zip -r ../dist.zip ./* )
    echo "==> 已生成 dist.zip"
fi
