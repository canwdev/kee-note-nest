#!/bin/bash

set -e

# 切换到脚本执行目录
cd "$(dirname "$0")"

# 检查electron目录是否有dist-frontend.tar文件（适用于Termux终端的情况）
if [ -f "./electron/dist-frontend.tar" ]; then
    # 解压缩dist-frontend.tar到electron目录
    cd ./electron
    tar xf dist-frontend.tar
    # 只构建nest.js
    yarn install --ignore-optional
    yarn build-nest
else
    # 切换到 vue 目录，并执行 yarn build
    cd ./vue && yarn && yarn build:frontend
    # 切换到 ../electron 目录，并执行 yarn build
    cd ../electron && yarn && yarn build:electron
fi


