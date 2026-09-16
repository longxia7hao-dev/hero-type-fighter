# HUD-VOICE-001 — 聽筒狀態／雙段提示（CHANGE-VOICE-001）

**狀態：** 可掛給主程式  
**對齊：** `CHANGE-VOICE-001-rules.md`、`ART-LOCK-001-silhouette.md`  
**作廢（主循環）：** 打字送招、螢幕鍵當出招（鍵可留教學示意，不送招）  
**血條／勝負鈕：** 沿 HUD-001；本單只補收音介面  

---

## A｜聽筒狀態 `HudMicState`

| 狀態 | 顯示（白話） | 視覺（ART-LOCK） |
|------|--------------|------------------|
| `off` | 麥克風關 | 灰聽筒＋斜線 |
| `needPermission` | 請允許麥克風 | 金框提示；擋戰鬥直到允許或回標題 |
| `unsupported` | 此瀏覽器暫不支援（注音） | 導向改英文／換 Chrome·Edge |
| `listen1` | 聽第①段… | 金聽筒脈衝 |
| `listen2` | 聽第②段… | 金聽筒脈衝（可略不同節奏） |
| `recognizing` | 辨識中… | 聽筒＋小點動畫 |
| `stageOk` | 第①／②段過！ | 短綠閃 `#7CFC00` ≤0.35s |
| `fail` | 沒聽清／念錯 | 短紅 `#ff4d4d`；明確錯＝挨打回饋 |
| `timeout` | 時間到 | 同失敗被打 |

位置：提示面板上方或右側，**不擋**中央大字 `display`。

---

## B｜雙段提示（每一招）

| 掛點 | 內容 |
|------|------|
| `HudPromptDisplay` | 大字 `display`（例 `ㄓㄠ`／`A-P-P-L-E`）— 維持全場最大 |
| `HudStageBadge` | **①** 或 **②** 圓章（金邊） |
| `HudStageLabel` | 注音：①「念注音（含聲調）」②「念漢字」；英文：①「念字母」②「念整詞」 |
| `HudStageExpect` | 當前段要念什麼的可讀提示（① 可顯 `stage1Expect` 或「帶調」提醒；② 顯 `stage2Expect`）— 勿小於 display |
| `HudStageProgress` | ① 空心→過關實心綠；② 鎖定灰→①過後亮起 |
| `HudTimerBar` | **整招** `timeMs` 一條；可選在 55% 處淡線＝建議第①段用完前切②（軟提示，非硬切） |
| `HudPartialTranscript` | 可選：interim 小字（muted）；錯時可閃一下 |

### 段切換
- 進招：① 亮、② 鎖；`listen1`  
- ① 成功：`stageOk` → 立刻 `listen2`，② 解鎖  
- ② 成功：出招飄字／勇者攻（現包回饋）  
- 任段明確失敗或倒數 0：魔物打、勇者 −14  

---

## C｜標題／權限文案

| 處 | 文案 |
|----|------|
| 怎麼玩（取代打字條） | · 中央出現提示 → **用麥克風念兩段**（①注音／字母 → ②字／詞）才出招<br/>· 念錯或逾時會扣自己血<br/>· 打滿**對方**血條即勝 |
| 拒麥 | 沒麥克風權限就無法對打，請允許後重試或回標題 |
| 模式鈕下 | 小字「需麥克風」 |

---

## D｜鍵盤區處置

| 項 | 規格 |
|----|------|
| 戰鬥中螢幕鍵 | **不送招**；可隱藏，或半透展示「這招字母／注音長怎樣」且無 `next` 出招語意 |
| 實體鍵盤 | 同樣不送招 |

---

## E｜掛點總表

`HudMicState`／`HudPromptDisplay`／`HudStageBadge`／`HudStageLabel`／`HudStageExpect`／`HudStageProgress`／`HudTimerBar`／`HudPartialTranscript`（可選）

---

## 驗收（介面）
1. 一眼分出正在聽①還是②。  
2. display 仍最大；聽筒狀態不搶主字。  
3. ①過→②亮有明確切換。  
4. 標題怎麼玩已改收音雙段，無「打字出招」主說明。  
5. 色跟 ART-LOCK-001。


---

**疊加：** 見 `HUD-VOICE-002-lit-ok.md`（`#prompt-primary.lit-ok`／`#prompt-secondary.lit-ok`）。
