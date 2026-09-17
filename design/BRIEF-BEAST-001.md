# BRIEF-BEAST-001 — 智能獸訓練師主路徑

## Goal
Replace the hero-class（四職業／商店）main path with a beast-trainer skeleton.
Voice reading core（speech / match / zhuyin / prompt deck）stays intact.

## Player flow
1. **Title** —「AI智能獸之讀音之戰」only（zero player-facing「勇者」／「勇者拼音快打」）
2. **Gender** — 男／女 → `state.playerGender`
3. **Story** — 3–5 tap-to-advance slides（AI 次世界／智能獸）
4. **Prompt-beast** — free-text keywords → first beast（placeholder gradient/SVG, no AI API）
5. **Hub** — 野外遭遇／圖鑑；hide 四職業選角 & 商店 from this path
6. **Wild fight** — player beast vs wild beast；reuse fight UI + voice core；show beast names not jobs
7. **CATCH／realm** — optional side path；must not block main path

## Constraints
- Night-purple castle CSS may stay
- Deploy: commit main；clean-deploy `dist/` only to `gh-pages` with base `/hero-type-fighter/`
