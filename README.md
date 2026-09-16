# 勇者拼音快打（Hero Type Fighter）

2D 側視打字格鬥 Prototype：勇者（左）對魔物（右）。正確輸入提示 → 勇者攻擊；打錯或逾時 → 魔物反擊。

## 模式

1. **注音版**：提示為注音符號／短音節。可用實體注音鍵盤，或點選螢幕注音鍵盤（手機無注音 IME 也能玩）。
2. **英文版**：提示為英文字母／短單字。實體鍵盤或螢幕字母鍵。

## 本機預覽

```bash
cd /workspace/hero-type-fighter
npm install
npm run dev
```

建置：

```bash
npm run build
npm run preview
```

GitHub Pages 建置（base path）：

```bash
VITE_BASE=/hero-type-fighter/ npm run build
```

## 操作

- 標題選模式後開戰
- 在時限內依序輸入畫面中央提示
- 注音版：點金色高亮鍵最省事；也可接實體注音鍵盤
- Esc 回標題（桌面）

## 技術

Vite + TypeScript + CSS。可選 Lottie 斬擊（`public/lottie/hero_sword_attack.json`）。
