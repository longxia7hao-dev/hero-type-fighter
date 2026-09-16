# 勇者拼音快打（Hero Type Fighter）

2D 側視**語音**格鬥 Prototype：勇者（左）對魔物（右）。兩階段語音都通過 → 勇者攻擊；失敗或逾時 → 魔物反擊。

> CHANGE-VOICE-001：戰鬥改為麥克風語音，螢幕打字鍵盤已降級停用。

## 模式

1. **注音語音版**（`zh-TW`）：顯示注音基底 + 漢字。先唸帶調音節，再唸漢字。
2. **英文語音版**（`en-US`）：顯示 `A-P-P-L-E` + `APPLE`。先拼字母，再說單字。

## 本機預覽

```bash
cd hero-type-fighter
npm install
npm run dev
```

建置（GitHub Pages base）：

```bash
VITE_BASE=/hero-type-fighter/ npm run build
```

## 技術

Vite + TypeScript + Web Speech API + 可選 Lottie 斬擊。

## Pages

https://longxia7hao-dev.github.io/hero-type-fighter/
