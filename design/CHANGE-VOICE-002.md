# CHANGE-VOICE-002 / 002b — 念對亮綠 + 注音音對 + 單符題庫

**Status:** Implemented on main / Pages  
**Date:** 2026-09-16 (Asia/Taipei)  
**Scope:** `hero-type-fighter` only（不動 office-drink-draw）

## 綠燈（兩模式）

| 通過 | 亮綠目標 | 之後 |
|------|----------|------|
| Stage 1 | `#prompt-primary`（注音符／音節 或 `A-P-P-L-E`） | 約 400ms → Stage 2 |
| Stage 2 | `#prompt-secondary`（漢字 或 整詞） | 約 400ms → 勇者出招 |

英文：整段過關亮整塊（不做逐字母綠）。戰鬥規則不變。

## 注音 Stage 1＝音對（002b）

- STT 不必吐出正確調號字形；同一音的注音／拼音／漢字變體皆可過①。
- Stage 2 仍要目標漢字。
- 題庫優先 **單注音符號 + 常用字**（ㄐ→雞、ㄅ→八、ㄆ→皮…）；保留少數完整音節（ㄓㄠ／罩等）。

## 檔案

- `src/main.ts` — 綠燈 hold、文案
- `src/match.ts` — `matchZhuyinStage1` 音對
- `src/prompts.ts`、`design/voice-prompts-v1.json` — 單符題庫
- `src/style.css` — `.lit-ok`／`.pass`
