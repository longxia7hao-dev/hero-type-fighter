# CHANGE-VOICE-001 — Producer lock: microphone speech combat

**Status:** Implemented on main / Pages  
**Date:** 2026-09-16 (Asia/Taipei)

## Goal

Combat uses **microphone speech**, not typing. On-screen typing keypads are demoted (disabled note only; not attack input).

## Modes

### 注音版 (`zh-TW`)

- Prompt: Zhuyin **base** (e.g. `ㄓㄠ`) + character (`罩`)
- **Stage 1:** Speak Zhuyin **with tone** (e.g. `ㄓㄠˋ`). Accept STT variants: zhuyin text, pinyin+tone number, spoken Chinese of that syllable.
- **Stage 2:** Speak the word/character (`罩`)
- Both pass → hero damage; fail/timeout either stage → monster attacks

### English版 (`en-US`)

- Prompt: `A-P-P-L-E` + `APPLE`
- **Stage 1:** Spell letters aloud
- **Stage 2:** Say the word
- Both pass → hero attack

## Tech

- Web Speech API: `SpeechRecognition` / `webkitSpeechRecognition`
- Vite + TypeScript; `base` `/hero-type-fighter/`
- Prompt bank: `design/voice-prompts-v1.json` → `src/prompts.ts` (16 zhuyin + 16 english)
- Fuzzy match: `src/match.ts`
- Recognizer + auto-restart: `src/speech.ts`
- Runtime `timeMs` = bank value **+ 4000 ms** for STT latency

## UI

- Mic permission CTA, listening badge, Stage 1 / Stage 2 pills
- Live「聽到：…」transcript feedback
- One timer for both stages

## Matching (summary)

- **Zhuyin S1:** normalize tones; match zhuyin string, pinyin+digit (`zhao4`), or CJK syllable char in accept list
- **Zhuyin S2:** CJK char / phrase contains expected character
- **English S1:** extract spelled letters (names or A B C); fuzzy ≤1 for long words
- **English S2:** strip spaces; exact / contains / Levenshtein ≤1

## Safari / mobile caveats

- Needs user gesture → tap「啟用麥克風」
- Often ends after one utterance → `onend` auto-restart (~280ms)
- HTTPS required (GitHub Pages OK)
- Firefox may lack Web Speech; Chrome / Edge / Safari best

## Known gaps

- STT quality for zhuyin symbols is uneven; pinyin+CJK fallbacks help
- Producer `ㄐㄩ` for 絕 is incomplete (should be ㄐㄩㄝ) — kept as bank authored
- No intentional “wrong answer” fail path besides timeout (wrong speech simply does not advance)
