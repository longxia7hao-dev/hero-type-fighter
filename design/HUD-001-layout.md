# HUD-001 — BRIEF-HUD-001 佈局規格

**狀態：** 已交（對齊現包＋ART-LOCK-001）  
**試玩：** https://longxia7hao-dev.github.io/hero-type-fighter/  
**皮：** 扁平剪影語感；色跟 ART-LOCK-001（現包 CSS 佔位可暫時沿用 token）  
**不做：** 不改傷害／題庫秒數；公司酒局／魔刃皮不套用  

---

## 色板（鎖）

| 用途 | token | hex |
|------|-------|-----|
| 夜底／紫中 | — | `#0b1020`／`#1a1240` |
| 金 UI | `--gold` | `#ffd76a` |
| 勇者血 | `--hero` | `#4ecdc4`→`#1a8a82` |
| 魔物血 | — | `#ff6b6b`→`#a12b2b` |
| 對／錯 | — | `#7CFC00`／`#ff4d4d` |

---

## 三屏

### A｜標題 `Screen_Title`
| 掛點 | 內容 |
|------|------|
| `HudTitleBadge` | TYPE FIGHTER（金小標） |
| `HudGameTitle` | 勇者拼音快打 |
| `HudSubtitle` | 一句玩法說明 |
| `BtnModeZhuyin`／`BtnModeEnglish` | 注音版／英文版 |

### B｜對打 `Screen_Fight`（上→下）
| 區 | 掛點 | 規格 |
|----|------|------|
| 血量左 | `HudHpHero`＋`HudHpFillHero` | 左上；標「勇者」＋數；青綠填 |
| 血量右 | `HudHpMonster`＋`HudHpFillMonster` | 右上；標「魔物」；赤紅填；可鏡向減少 |
| 中間大提示 | `HudPromptRow` | **最大可讀**；逐字：`done`／`current`（金邊）／錯閃 `wrong-flash` |
| 提示副行 | `HudPromptHint` | 小字；勿搶主提示 |
| 倒數 | `HudTimerBar`／`HudTimerText` | 回合時限；緊時可轉錯紅 |
| 對錯回饋 | `HudFeedback`／`FxFloatDmg` | 打對短暫綠／打錯紅；傷害飄字（勇者側粉紅、魔物側淺綠可沿現包） |
| 狀態句 | `HudStatus` | 一行；可淡 |
| 舞台 | （美術剪影） | 左勇右魔；HUD 不擋腰以上剪影中心 |
| 注音／英文鍵 | `HudKeypad` | 見下 |

### C｜勝負 `Screen_Result`
| 掛點 | 內容 |
|------|------|
| `HudResultTitle` | 勝利／敗北（大金／赤） |
| `HudResultMsg` | 短句＋回合／模式 |
| `BtnAgain` | 再來一局 |
| `BtnTitle` | 回標題 |

---

## 注音鍵盤高亮（BRIEF 重點）

| class／狀態 | 行為 |
|-------------|------|
| `.key.next` | **下一個該打的鍵** — 最強高亮（金邊＋略放大／脈衝） |
| `.key.needed` | 本招式仍需要、但非下一個 — 次亮金邊 |
| 其餘 `.key` | 暗底可點；勿比 `next` 搶眼 |
| 英文模式 | 同規則（字母列＋`next`） |
| ⌫ | `key wide`；不搶 `next` |

現包已有 `needed`／`next`：定稿皮時 **保持語意**，只換塗裝跟 ART-LOCK。

---

## 直式／橫式

現包偏橫向對打舞台。手機：鍵區貼底、提示字仍大於鍵；血條厚度 ≥ 視覺清楚（約 ≥14px 填）。  
橫屏桌機：鍵可略縮、提示維持中央最大。

---

## 對現包缺口（介面）
1. 皮仍是色塊佔位 — 等剪影資產；HUD token 已可當準。  
2. `next` 高亮需在實機一眼壓過 `needed`（若場上不夠跳，加脈衝／尺寸差，不改玩法）。  
3. 倒數與大提示互不遮；錯閃 ≤0.25s。

## 驗收
左右血可辨；中間提示最大；對錯／倒數可讀；注音版下一個鍵明顯高亮；結算有再戰／回標題；色跟 ART-LOCK-001。
