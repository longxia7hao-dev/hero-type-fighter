# HUD-RPG-001 — 選角／商店／戰鬥技能列（BRIEF-RPG-001）

**狀態：** 對齊已上線 Pages＋`RPG-001-classes-items.md`＋`ART-RPG-001-chibi.md`  
**試玩：** https://longxia7hao-dev.github.io/hero-type-fighter/  
**語音核：** HUD-VOICE-001／002 沿用；本單只加 RPG 流程皮  
**直式／繁中**  

---

## 流程屏

`title` → `select` → `shop`（可跳過）→ `fight` → `result`（勝可回商店）

---

## A｜選角 `Screen_Select`

| 掛點 | 規格 |
|------|------|
| `HudSelectHead` | 標題「選職業」＋模式小標 |
| `.job-grid`／`.job-card` | **≥4** 卡；直式 2×2 可 |
| `.job-chibi` | 大頭小身佔位（ART-RPG）；色／武器 cue 跟表 |
| `.job-name` | 劍士／聖騎士／法師／盜賊 |
| `.job-skill` | **技能名 — 一句說明**（跟策劃表） |
| `BtnBackTitle` | 回標題 |

### 四職文案（卡面必顯）
| 職 | 技能句 |
|----|--------|
| 劍士 | 破甲斬 — 揮出一記重斬，立刻打魔物。 |
| 聖騎士 | 聖盾 — 舉起聖盾，擋掉下一次挨打。 |
| 法師 | 時光延展 — 延展時光，這題多給幾秒念。 |
| 盜賊 | 影遁 — 躲進影子，下次念錯也不掉血。 |

色：劍青綠／聖金白／法夜紫／盜暗綠。

---

## B｜商店 `Screen_Shop`

| 掛點 | 規格 |
|------|------|
| `.gold-chip` | 現有金幣，常駐可見 |
| `.shop-grid`／`.shop-card` | 四物：名／一句／價／持有／購買 |
| `BtnBuy` | 金幣不足＝disabled |
| `BtnToFight` | 出征！ |
| `BtnSkipShop` | 跳過商店 |
| `BtnBackSelect` | 重選職業 |

四物：攻擊卷／沙漏／護符／回復藥（文案跟 RPG-001 表）。

---

## C｜戰鬥技能列 `HudActionBar`（`#action-bar`）

| 掛點 | 規格 |
|------|------|
| `[data-skill].act-btn.skill` | 職業技名＋`.act-count` 剩餘次數；0 或非 input＝disabled |
| `[data-item].act-btn.item` | 已持有物；數 0＝灰掉隱藏或 disabled |
| 位置 | 提示／聽筒區下方或鍵區上方；**不擋**①②大字與聽筒 |
| 皮 | 金邊小鈕；disabled 降透明 |

語音①②＋`lit-ok` 綠燈沿用；左右血沿 HUD-001。

---

## D｜勝負 `Screen_Result`（RPG 補）

| 勝 | 敗 |
|----|----|
| 顯示獲得金幣；**回商店**／再戰 | 再戰／**回商店補貨** |
| 皆有：重選職業、回標題 | |

---

## 驗收（介面）
1. 四職卡有名＋一句技能＋色／武器 cue  
2. 商店四物＋金幣＋可跳過  
3. 戰中技能／物品次數可見，用完灰掉  
4. 勝可回商店；語音雙段 UI 仍在  

現包 CSS／emoji＝佔位，造型 PASS 歸美術下一刀。
