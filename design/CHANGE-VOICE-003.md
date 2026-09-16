# CHANGE-VOICE-003 — 放寬語音匹配＋聽到回饋＋收音重啟

## 目標
製作人：判別過嚴。放寬注音音對／漢字／英文匹配；加強「聽到」與近錯提示；加快收音重啟。雙段語音核保留。

## 實作
- `src/match.ts`：較寬 fuzzy、注音声母對拼音、多候選（空格／STT alts）、英文拼字容錯；`nearMissHint()`
- `src/speech.ts`：`maxAlternatives=5`、alts 空格串接、onend 重啟 120ms
- `src/main.ts`：final 未中顯示近錯提示（聽到／目標）

## 不改
雙段流程、綠燈、題庫結構、RPG 殼。
