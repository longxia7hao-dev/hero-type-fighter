# HUD-MOONCASTLE-001 — UI 對齊月紫城（ART-STYLE-MOONCASTLE）

**狀態：** 線框可掛  
**票：** ART-STYLE-MOONCASTLE  
**語音邏輯：** 禁動（雙段／mic／聽到行／綠段皆不動）  
**上位鎖：** `design/ART-STYLE-MOONCASTLE.md`  
**升級自：** HUD-CASTLE-001（金邊深紫玻璃保留；底圖改掛 style-ref）

## 白話
全 UI 跟月紫城 HTML／參考圖同語：卡片＝**金邊深紫玻璃**；**標題系底**用 style-ref **title**；**戰鬥場**用 style-ref **battle**。語音核一概不碰。

## 底圖掛點

| 屏 | 用途 | 參考源 | 實掛路徑（建議） |
|----|------|--------|------------------|
| 標題／選角／商店／結算 | 全屏夜紫滿月哥德城堡 | `public/art/style-ref/title.jpg` | `--castle-bg` → `art/bg-castle.jpg`（與 title 同源） |
| 戰鬥舞台 | 灰石徑＋花草＋亮窗城堡整張進框 | `public/art/style-ref/battle.jpg` | `.stage-bg` → `art/bg-battle.jpg`（與 battle 同源） |

## 金邊深紫玻璃（五屏共用）

| token | 值 |
|-------|-----|
| `--castle-glass` | `rgba(28, 14, 58, 0.72)` |
| `--gold` | `#ffd76a` |
| `--gold-edge` | `rgba(255, 215, 106, 0.55)` |

## 不做
不改 match／雙段／mic 狀態機；不刪 `public/art/style-ref/`。

## 驗收
1. 標題系底＝月紫滿月城堡（對 style-ref title）。  
2. 戰鬥場＝石徑／花草／亮窗城堡可讀（對 style-ref battle），不裁頂。  
3. 五屏卡／列＝金邊深紫玻璃。  
4. 語音行為與換皮前一致。
