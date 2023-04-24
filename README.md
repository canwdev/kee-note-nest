# KeeNote V4

A safe note editor server & web client, powered by KeePass (kdbxweb) + Nest.js / Electron + Vue 3 (NaiveUI)

![screenshot](./nest/test/screenshot1.jpg)
![screenshot](./nest/test/screenshot2.jpg)

## Directory Structure

- `electron` App based backend, communicate frontend with IPC 
- `nest` Web based backend, communicate frontend with HTTP (Support encryption)
- `vue` Frontend folder, adapt backend(Election or Nest) automatically

## Quick Start Development

1. Start frontend development

```sh
cd vue
yarn
yarn dev
```

2. Start backend(nest) development

```sh
cd nest
yarn
yarn dev
```

3. Open http://127.0.0.1:3030/ ([Config](./vue/vite.config.ts))

---

## Build for production

### Build Frontend (First)

```sh
cd vue
yarn
yarn build
```

### Build Nest

See [README](./nest/README.md)

### Build Electron (Optional)

```sh
cd electron
yarn
yarn build
```