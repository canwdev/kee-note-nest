# KeeNote Electron + Nest.js Backend

## Dev Electron

```shell
yarn
yarn watch:electron-src
# open a new terminal, run:
yarn dev:electron
```

## 如果不需要构建Electron

```shell
# 忽略 electron 的 npm 包
yarn install --ignore-optional
yarn build-nest
yarn start-nest
```
