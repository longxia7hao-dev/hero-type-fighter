# AI智能獸之讀音之戰

《AI智能獸之讀音之戰》— 日系 Q 版冒險殼 + **語音／打字兩階段戰鬥核**：選職業 → 商店 → 戰鬥 → 勝利領金 → 可回商店再戰。

> BRIEF-RPG-001：選角／商店／技能道具。語音引擎（`speech.ts`）不重寫。

## 流程

1. 選注音／英文模式  
2. 選職業（劍士／聖騎士／法師／盜賊）  
3. 商店購買道具（可跳過）  
4. 戰鬥：兩階段綠燈 → 攻擊；失敗／逾時 → 魔物反擊（技能／道具可擋或閃）  
5. 勝利獲得金幣，可回商店或再戰  

## 本機

```bash
npm install
npm run dev
```

建置（GitHub Pages）：

```bash
VITE_BASE=/hero-type-fighter/ npm run build
```

## Pages

https://longxia7hao-dev.github.io/hero-type-fighter/
