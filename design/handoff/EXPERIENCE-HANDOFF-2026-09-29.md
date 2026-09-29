# 經驗交接：退休席位知識封存

**日期：** 2026-09-29（台北時間）  
**製作人：** Bubble（瑞哥）  
**狀態：** 九席退休；五核心承接。本文件只留經驗，不代表再開或出貨。

---

## 為什麼寫這份

虛擬工作室從「多專家席」收成 **五核心**：遊戲總監、遊戲設計師、Unity主程式、美術總監、內容品管。  
九席（Lottie設計師、動畫師、作曲配樂、法律顧問、3D建模師、技術美術、Three.js備援、遊戲特效師、介面HUD）的實戰坑、路徑、可重用設定，全部收進這裡，避免人走知識走。

**現行主案：** 《AI智能獸之讀音之戰》（repo `hero-type-fighter`）  
**掛起：** 《公司酒局》（`office-drink-draw`）  
**暫停 STOP：** 《魔刃行者》（`blade-walker`，2026-09-12 起；再開前各席不得自行開工）

---

## 一、退休九席（逐席）

### 1) Lottie設計師

| 項 | 內容 |
|----|------|
| **職責摘要** | 只做可匯出的 Lottie（`.json`）與掛點說明：抽籤／翻牌／懲罰／按鈕彈跳等短動效。不改玩法數值、不改主邏輯、不覆寫鎖定圖。 |
| **有用路徑** | `/workspace/office-drink-draw/lottie/penalty/`（進包罰圖 Lottie）；`/workspace/office-drink-draw/public/lottie/`；`/workspace/lottie/company-drink/`（BRIEF-LOTTIE-001 試作＋`build_lottie001.py`）；掛點元件 `src/components/game/StudioLottie.tsx`、`preload.ts` 的 `prefetchLottie`。罰圖靜圖鎖：`public/art/penalty-{half,full,fitness,forehead,custom}.png`。 |
| **平台限制** | iPhone **同一時間只能穩播一支 video** → 開場／迴圈影片留給「唯一 video」，其餘短動效用 **Lottie**。檔要輕、單次／循環標清。 |
| **踩坑** | 幾何圓三角拼圖當角色＝FAIL。畫風硬鎖：動漫／漫畫角色＋粗白邊貼紙。必須對齊已鎖 PNG，禁止另開風格。 |
| **可重用設定** | `lottie-web` 載入、`autoplay`＋`loop` 由呼叫端標清；預先 `prefetchLottie`；開場 sting／貓走路與罰圖分開路徑。色板曾用塗鴉霓虹（洋紅／青／黃），智能獸案另跟月紫城，勿混案。 |

**承接：** 美術總監定風格；需要時由美術＋主程式點名做／掛 Lottie。

---

### 2) 動畫師

| 項 | 內容 |
|----|------|
| **職責摘要** | 角色／魔物／FP 武器動作規格；主線對 Unity。無可 skin mesh 時只出 clip 清單，不空轉綁骨。 |
| **有用路徑** | `blade-walker/design/ANIM-001-frost-clips.md`；`blade-walker/design/retro-20260912/anim.md`；`art/wip/char_baishuang_mid*`（曾有 softbone、無權重，後作廢）。 |
| **平台限制** | 靜態 GLB（材質分塊）無法直接承載骨骼動畫；先鎖定身體來源再寫 clip。KayKit 等第三方包自帶 Idle／Run／Hit…優先對照玩法狀態。 |
| **踩坑** | 自製穿衣＋softbone 與 BRIEF-010 KayKit 路線並行＝浪費。王招華麗編排在灰盒／無剪影前不該排。二次動（衣襬 softbone）與風格化免費身體衝突——標竿降級為「剪影可讀＋掛點武器」。 |
| **可重用設定** | ANIM-001 clip 對齊玩法秒數（例 `ULT_SWORD≈0.9s`）；武器走 View／掛點，不跟身體包綁死；第三方包先做「自帶 clip → 玩法狀態」對照，只補缺片。 |

**承接：** 美術總監定要不要動；Unity主程式掛 Animator／狀態機。

---

### 3) 作曲配樂

| 項 | 內容 |
|----|------|
| **職責摘要** | 原創可合成譜／短迴圈規格；**不改** `audio.ts`／玩法數值。進包前須法律綠（現由品管／總監代掃來源）。 |
| **有用路徑** | `blade-walker/design/scores/`（README＝貼碼契約）；各 `bgm_*.md`、`theme_*.md`、`stip_ult_*.md`；`CHANGE-005-audio-scores.md`；`retro-20260912/audio.md`。 |
| **平台限制** | 第一次點擊才 `unlock` 音訊；靜音開關維持；最多約 4 聲部同時；無採樣、無他人旋律。魔刃現況＝Web Audio 自製譜。 |
| **踩坑** | `bgm_king_slime` 票２彈跳版作廢，改用**修正條**（4/4 全音符踏步＋音尾下垂）。實作勿排成著名遊戲鉤子（法律黃燈）。幽靈王／終王曲曾進包但擂台未聽測。 |
| **可重用設定** | 原創「刃」細胞 A3–C4–F4–E4（220–262–349–330）移調；`setMode`／`setTheme` full|thin／`playStip`；主題 `t_beat` 從 0；stip 走 sfxBus 一發、BGM 不停。 |

**承接：** 遊戲設計師寫 cue 需求；Unity主程式接點；內容品管聽測＋來源可追溯。

---

### 4) 法律顧問

| 項 | 內容 |
|----|------|
| **職責摘要** | 出貨／對外公開前侵權與授權：綠／黃／紅＋一句觀察。**不改檔**。 |
| **有用路徑** | `blade-walker/design/POLICY-FREE-SAFE-SOURCES.md`；`ART-ASSET-POLICY.md`；`CHANGE-003-legal-names.md`；`ENEMY-BOSS-CC0-MAP.md`；`FREE-HQ-ASSET-PIPELINE.md`；`retro-20260912/legal.md`。 |
| **平台限制** | 進專案＝免費可商用（或自製）＋安全管道＋授權可追溯。他作截圖僅內部感覺，不進 `public`／Pages。 |
| **踩坑** | art 綠 ≠ 進包綠（要對指名 md5／三處 hash）。Unity Asset Store EULA ≠ GitHub CC0——KayKit 必須走 GitHub／itch CC0。CC0 底模≠造型過關。心之容器近似薩爾達→黃→改剪影撤黃。顯示名：史萊姆王→晶黏帝、史萊姆騎士→膠盾騎；PWA short_name 勿單獨「魔刃」。 |
| **可重用設定** | 准：自製、CC0、CC-BY（署名）、官方免費樣品。不准：他作抽貼、授權不清下載站。針點「傳說對決級精緻」本身不擋；只抓抄造型／抄 UI。 |

**承接：** 內容品管出貨前抽查來源表；遊戲總監擋 SHIPPED；美術總監造型否決仍獨立。

---

### 5) 3D建模師

| 項 | 內容 |
|----|------|
| **職責摘要** | 交付 GLB 至 `art/glb`：傳說對決級可讀（勒布、金緣、厚材質）；手機預算跟 TA gate。不改數值、不擅自拷 public／StreamingAssets。 |
| **有用路徑** | `/workspace/art/glb/`（`MANIFEST.md`、`*.SOURCE.md`、`gate.py`）；`/workspace/art/locked/`（例 `slime_king.c590fc73.glb`）；`/workspace/art/wip/`；`blade-walker/design/FREE-HQ-ASSET-PIPELINE.md`；`retro-20260912/modeling.md`。 |
| **平台限制（角色硬預算）** | **char：gzip ≤1.5MB／raw ≤2MB／tri ≤8k／mats ≤2；須 combo JPEG×1＋每材質 baseColorTexture。** 武器 gzip≤1.5MB／tri≤8k／mats≤2；boss gzip≤4MB／tri≤25k／mats≤4；midboss／fodder 見 TA 表。PNG in GLB＝FAIL。 |
| **踩坑** | 鎖 md5 **禁止重做／覆蓋**；旁路另存 wip、檔名不得叫現檔名。自製白霜 mid artkit 作廢，禁復辟。主角定案「不換模、可精修材質」。預覽要**實心上色三視**，點雲／灰剪影不當證據。肥檔常因未壓縮 PNG／過多 skin clip。 |
| **可重用設定** | 准用源：Kenney、Poly Haven（1K／2K）、ambientCG、KayKit 免費層、Quaternius（皆 CC0）。交檔：新 md5 → art/glb → TA＋美術 → **總監點名主程式拷**。一次一檔；已交 md5 未重開單不得再做。 |

**承接：** 美術總監造型 PASS／FAIL；主程式點名拷；品管場上可讀抽樣。預算閘邏輯見下「技術美術」。

---

### 6) 技術美術

| 項 | 內容 |
|----|------|
| **職責摘要** | GLB 進包否決；`gate.py` 當法律。自己不拷 public；過閘後總監點名、主程式拷。 |
| **有用路徑** | `/workspace/art/glb/gate.py`；`MANIFEST.md`；`retro-20260912/ta.md`；COMMS 凍結規則。 |
| **平台限制** | 分 kind 預算（weapon／boss／midboss／fodder／char）。技術紅線：PNG in GLB、DARK（baseColor RGB 皆 <0.1）、hash-mismatch＝FAIL。禁止 `/tmp/glb-work` 肥檔蓋瘦來源。 |
| **踩坑** | char 列管來得晚→unknown-kind。誤 prune（砍未掛載 mesh）曾「數字綠、內容錯」。Unity 粉紅＝shader stripping；白模＝Rematerialize 抹貼圖——根因在 runtime，不在 art 預算。膠盾 prepare 順序洗白。WIP `--also` 檔名帶 hash 會誤報 unknown-kind。 |
| **可重用設定** | 重解 GLB、比 md5、FAIL 非零退出。場上可讀煙測建議（重開時）：載入後非粉紅／非白模、須留 baseColorTexture。新 kind 先列管再進 art/glb。 |

**承接：** Unity主程式在拷檔／建置前跑閘與煙測；美術總監不管預算數字但服從否決。

---

### 7) Three.js備援

| 項 | 內容 |
|----|------|
| **職責摘要** | 只修備援崩潰級或總監點名拷檔／熱修；**禁主線新功能**。Pages 根不當 Three.js 首頁。 |
| **有用路徑** | `/workspace/blade-walker/`（PWA 根、`three.html`、`src/`、`public/art`）；`BRIEF-007`／`retro-20260912/threejs-backup.md`；QA 鉤 `?at=`／`?near=gel`／`?stage=`。 |
| **平台限制** | Vite + TS + Three.js r169；SW 未點名勿 bump。拷 GLB 前 `gate.py` exit 0；Vite build 會把 public 拷到 dist——只改 dist 會被蓋。 |
| **踩坑** | 未瘦身 30–60MB GLB 上手機＝死。備援 2026-09-09 已 STOP 新作；09-12 整案暫停。末版備援約 SW v77。 |
| **可重用設定** | 交付報一次：三處 md5＋SW 即停。正確瘦身量級見 MANIFEST（武器約 300K、王 500–700K）。 |

**承接：** 崩潰級熱修改由 Unity主程式（Web）或總監點名臨時處理；魔刃重開前備援仍 STOP。

---

### 8) 遊戲特效師

| 項 | 內容 |
|----|------|
| **職責摘要** | 可讀優先的即時 VFX 規格；先查再改；未獲改檔令不動程式。不改 `types.ts`／mesh。 |
| **有用路徑** | `blade-walker/design/VFX-001`～`VFX-005-*.md`（＋對照 png）；`retro-20260912/vfx.md`。 |
| **平台限制** | 手機直式、守 overdraw；**iPhone 一 video → Lottie**（短特效勿再開第二支影片）。Pages 驗收用**新目錄**，先 `curl` 確認 200。Unity WebGL：同一 GameObject 只能一個 LineRenderer（雷柱用子物件）；優先粗 Unlit。 |
| **踩坑** | **流程：先規格 → 掛點 → 幀檢。** **可見 ≠ 好看**（金緣堆太粗製作人嫌醜，要另開收斂單）。VFX-004 力場環主循環已被 019c 覆蓋，不當最終。**VFX-005 垂直雷柱未閉環（FAIL）。** 蒼焰禁粉紅 `#ff6ad8`。免費網頁特效模組僅參考，進包須來源綠。 |
| **可重用設定** | 色票：蒼青 `#7ee0ff`／蓄滿金；暴擊金緣 `#D4A526`＋「暴」。閃避邊光 kick 不綁 `DODGE_IFRAME`。驗包：強制金包與乾淨包分開記。 |

**承接：** 美術總監審美；Unity主程式掛點實作；品管幀檢。

---

### 9) 介面HUD

| 項 | 內容 |
|----|------|
| **職責摘要** | 直式 9:16 HUD／選單規格；清楚好認。**只交** `design/HUD-*.md`（與定稿圖），不擅自改戰鬥數字／語音引擎。 |
| **有用路徑（智能獸現行）** | `hero-type-fighter/design/HUD-MOONCASTLE-001.md`、`HUD-BEAST-001.md`、`HUD-CATCH-001.md`、`HUD-RENAME-001.md`、`HUD-VOICE-001.md`、`HUD-VOICE-002-lit-ok.md`、`HUD-RPG-001.md`、`HUD-001-layout.md`、`ART-STYLE-MOONCASTLE.md`。 |
| **有用路徑（魔刃／酒局封存）** | `blade-walker/design/HUD-001`～`HUD-020-*.md`、`HUD-COLOR-TOKENS.md`（**凍結**）、`design/hud/` 四屏圖；`office-drink-draw/design/HUD-FLIP-001-office-layout.md`。 |
| **平台限制** | 手機直式優先；底鍵勿擋路／怪；語音相關 **禁動引擎**（`speech.ts` 不重寫），只改 HUD 文案／提示。 |
| **踩坑** | 色板 hex 未總監重開＝凍結（舊 `#F4D06A` 作廢；主 CTA＝`#D4A526`＋深字）。頭像只用列管立繪。公司酒局少數罰：`.hud-chip.is-minority-hit`。魔刃 HUD-019b／019c 規格有交，跟手／雷柱品管未驗死。 |
| **可重用設定** | 凍結 token 見 `HUD-COLOR-TOKENS.md`；線框→上色→掛點分單；教學提示短時收起（例 1.5s）。 |

**承接：** **美術總監＋Unity主程式兼 HUD**（規格／實作）；品管查可讀與文案。

---

## 二、共用平台速查（製作人規則濃縮）

| 主題 | 白話規則 |
|------|----------|
| **iOS 影片** | 同一畫面／流程 **一次只穩播一支 video**。開場迴圈留那一支；其餘短動效改 **Lottie**。 |
| **Autoplay** | video 必須 `muted`＋`playsInline`（含 webkit）；音訊第一次點擊才 unlock。 |
| **Lottie** | 輕量 JSON；標清 loop／單次；預先暖快取；風格跟該案美術鎖。 |
| **WebGL（Unity）** | 建置鎖約 30 FPS；shader／Collider 注意 stripping（Resources＋`link.xml`）；繁中用子集字型防方框；新試玩一律新目錄 `unity-preview/<id>/`，**禁蓋** milestone。 |
| **Pages 部署** | orphan `gh-pages`；普通 fast-forward；先 curl 200 再叫人測；Auto-review 常擋部署→等製作人核准。 |
| **素材** | 免費可商用／自製＋安全管道＋可追溯；他作 REF 不進包。 |
| **通訊** | 繁中白話；只報狀態改變；禁純「收到」；最新總監指令覆蓋舊 brief。 |
| **凍結** | 鎖 md5／milestone／色板：禁 bump、禁覆蓋、旁路另存 wip。 |
| **SHIPPED** | 試玩 PASS ≠ 出貨；須品管＋來源／法律抽查。 |

---

## 三、專案指標

### 《公司酒局》office-drink-draw — Pages 活著、案掛起

- **Repo：** https://github.com/longxia7hao-dev/office-drink-draw  
- **線上：** https://longxia7hao-dev.github.io/office-drink-draw/  
- **日常改：** `grok-src`；上鎖還原點見 README（V9.7 等）。  
- **設計：** `design/ART-*`、`HUD-FLIP-*`、`CHANGE-FLIP-*`。  
- **Lottie／影片：** `public/lottie/`、`lottie/penalty/`、`public/art/ui/home-loop.mp4`（唯一主選單 video）。

### 《AI智能獸之讀音之戰》hero-type-fighter — 現行主案 Pages

- **Repo：** https://github.com/longxia7hao-dev/hero-type-fighter  
- **線上：** https://longxia7hao-dev.github.io/hero-type-fighter/  
- **設計：** `design/BRIEF-BEAST-001`、`BRIEF-CATCH-001`、`BRIEF-RPG-001`、`HUD-*`、`CHANGE-VOICE-*`、`ART-*`。  
- **注意：** 語音引擎不重寫；四職商店曾暫藏；月紫城／BEAST／CATCH 線框以 HUD 單為準。

### 《魔刃行者》blade-walker — **STOP（2026-09-12）**

- **Repo：** https://github.com/longxia7hao-dev/blade-walker  
- **狀態：** 製作人定案暫停（不好玩）。再開前不建置、不上線、不改檔。  
- **凍結基線（禁蓋）：**  
  - https://longxia7hao-dev.github.io/blade-walker/unity-preview/milestone-20260909-failfix2-playable/  
  - 原包 `…/20260909-9fac797-failfix2/`  
- **復盤總表：** `design/retro-20260912/00-director-producer-asks.md`  
- **Three.js 備援：** 僅對照；主線曾改 Unity；備援亦 STOP。

---

## 四、五核心如何吸收退休席職責

| 核心席 | 吸收什麼 | 怎麼做（白話） |
|--------|----------|----------------|
| **遊戲總監** | 調度、凍結、對製作人只轉結論；代法律擋 SHIPPED；備援／STOP 令 | 維持 COMMS；點名才開工；禁席位噪音轉給 Bubble |
| **遊戲設計師** | 作曲 cue／變更單節奏；原 HUD 文案需求；特效「要表達什麼」 | 寫 CHANGE／BRIEF；不改程式；秒數與提示寫死在單上 |
| **Unity主程式** | Three.js 熱修精神；TA 拷檔閘；特效掛點；**兼 HUD 實作**；語音以外的 Web 行為 | 跑 `gate.py`；新 preview 目錄；Lottie／HUD 掛點；不改數值除非變更單 |
| **美術總監** | Lottie／動畫／建模造型否決；**兼 HUD 視覺**；特效好看度 | 風格鎖；Lottie 對齊鎖圖；色板未重開勿改；可見之後再收斂美 |
| **內容品管** | 原法律抽查來源＋場上可讀／文案／幀檢；語音體驗抽測 | 不改檔；綠黃紅或 PASS／FAIL／未驗證；舊包判決隨新包作廢 |

**點名兼職口訣**

- **HUD：** 美術定稿＋主程式掛＝原介面HUD。  
- **Lottie：** 需要時美術出／對齊，主程式掛；非常駐席。  
- **VFX：** 主程式掛＋美術審美＋品管幀檢；先規格再碼。  
- **3D／TA：** 外援或主程式暫代 gate；鎖 md5 紀律不變。  
- **音樂／法律：** 原創＋來源表；品管／總監出貨前過目。

---

## 五、文件與路徑速查

| 用途 | 路徑 |
|------|------|
| 本交接 | `/workspace/studio-handoff/EXPERIENCE-HANDOFF-2026-09-29.md` |
| 索引 | `/workspace/studio-handoff/INDEX.md` |
| 魔刃復盤 | `/workspace/blade-walker/design/retro-20260912/` |
| 魔刃 HUD／VFX／譜 | `/workspace/blade-walker/design/HUD-*`、`VFX-*`、`scores/` |
| GLB 閘 | `/workspace/art/glb/gate.py`、`MANIFEST.md`、`locked/` |
| 酒局 Lottie | `/workspace/office-drink-draw/lottie/`、`public/lottie/` |
| 智能獸 HUD | `/workspace/hero-type-fighter/design/HUD-*.md` |
| 通訊協定 | `/workspace/blade-walker/design/COMMS-PROTOCOL.md` |
| 素材政策 | `/workspace/blade-walker/design/POLICY-FREE-SAFE-SOURCES.md` |

---

## 六、給製作人的一句話

九席經驗已封進本檔；之後活人只有五核心。魔刃維持 STOP；酒局掛起可點名熱修；智能獸為主案。平台死記：**iPhone 一支影片、其餘 Lottie；WebGL 新目錄禁蓋；鎖檔不重做；只報狀態改變。**
