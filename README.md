# Clippy

## 直接运行

```
npm install
npm run build
node dist/index.js
```

## 使用pm2

```
npm install pm2 -g
npm run build
pm2 start dist/index.js --name "clippy"
```

## 客户端

[clippy-client](https://github.com/oopstls/clippy-client)