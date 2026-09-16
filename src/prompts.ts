export type GameMode = 'zhuyin' | 'english'

export interface PromptItem {
  text: string
  /** Hint shown under prompt (English gloss or romanization) */
  hint?: string
  /** Time limit in ms */
  timeMs: number
  damage: number
}

/** 注音單音與簡單組合（可點螢幕鍵盤輸入） */
const ZHUYIN_PROMPTS: PromptItem[] = [
  { text: 'ㄅ', hint: 'b', timeMs: 2800, damage: 12 },
  { text: 'ㄆ', hint: 'p', timeMs: 2800, damage: 12 },
  { text: 'ㄇ', hint: 'm', timeMs: 2800, damage: 12 },
  { text: 'ㄉ', hint: 'd', timeMs: 2800, damage: 12 },
  { text: 'ㄊ', hint: 't', timeMs: 2800, damage: 12 },
  { text: 'ㄋ', hint: 'n', timeMs: 2800, damage: 12 },
  { text: 'ㄍ', hint: 'g', timeMs: 2800, damage: 12 },
  { text: 'ㄐ', hint: 'j', timeMs: 2800, damage: 12 },
  { text: 'ㄓ', hint: 'zh', timeMs: 2800, damage: 12 },
  { text: 'ㄔ', hint: 'ch', timeMs: 2800, damage: 12 },
  { text: 'ㄕ', hint: 'sh', timeMs: 2800, damage: 12 },
  { text: 'ㄗ', hint: 'z', timeMs: 2800, damage: 12 },
  { text: 'ㄚ', hint: 'a', timeMs: 2800, damage: 12 },
  { text: 'ㄧ', hint: 'i', timeMs: 2800, damage: 12 },
  { text: 'ㄨ', hint: 'u', timeMs: 2800, damage: 12 },
  { text: 'ㄩ', hint: 'ü', timeMs: 2800, damage: 12 },
  { text: 'ㄞ', hint: 'ai', timeMs: 2800, damage: 12 },
  { text: 'ㄠ', hint: 'ao', timeMs: 2800, damage: 12 },
  { text: 'ㄢ', hint: 'an', timeMs: 2800, damage: 12 },
  { text: 'ㄤ', hint: 'ang', timeMs: 2800, damage: 12 },
  { text: 'ㄅㄚ', hint: 'ba', timeMs: 3600, damage: 16 },
  { text: 'ㄆㄚ', hint: 'pa', timeMs: 3600, damage: 16 },
  { text: 'ㄇㄚ', hint: 'ma', timeMs: 3600, damage: 16 },
  { text: 'ㄉㄚ', hint: 'da', timeMs: 3600, damage: 16 },
  { text: 'ㄊㄚ', hint: 'ta', timeMs: 3600, damage: 16 },
  { text: 'ㄋㄚ', hint: 'na', timeMs: 3600, damage: 16 },
  { text: 'ㄍㄚ', hint: 'ga', timeMs: 3600, damage: 16 },
  { text: 'ㄏㄚ', hint: 'ha', timeMs: 3600, damage: 16 },
  { text: 'ㄐㄧ', hint: 'ji', timeMs: 3600, damage: 16 },
  { text: 'ㄑㄧ', hint: 'qi', timeMs: 3600, damage: 16 },
  { text: 'ㄒㄧ', hint: 'xi', timeMs: 3600, damage: 16 },
  { text: 'ㄓㄨ', hint: 'zhu', timeMs: 3600, damage: 16 },
  { text: 'ㄔㄨ', hint: 'chu', timeMs: 3600, damage: 16 },
  { text: 'ㄕㄨ', hint: 'shu', timeMs: 3600, damage: 16 },
  { text: 'ㄗㄨ', hint: 'zu', timeMs: 3600, damage: 16 },
  { text: 'ㄧㄚ', hint: 'ya', timeMs: 3600, damage: 16 },
  { text: 'ㄨㄚ', hint: 'wa', timeMs: 3600, damage: 16 },
  { text: 'ㄅㄞ', hint: 'bai', timeMs: 4000, damage: 18 },
  { text: 'ㄆㄠ', hint: 'pao', timeMs: 4000, damage: 18 },
  { text: 'ㄇㄢ', hint: 'man', timeMs: 4000, damage: 18 },
  { text: 'ㄉㄤ', hint: 'dang', timeMs: 4000, damage: 18 },
  { text: 'ㄊㄡ', hint: 'tou', timeMs: 4000, damage: 18 },
  { text: 'ㄍㄥ', hint: 'geng', timeMs: 4000, damage: 18 },
  { text: 'ㄐㄧㄚ', hint: 'jia', timeMs: 4500, damage: 20 },
  { text: 'ㄑㄧㄢ', hint: 'qian', timeMs: 4500, damage: 20 },
  { text: 'ㄒㄧㄠ', hint: 'xiao', timeMs: 4500, damage: 20 },
  { text: 'ㄓㄨㄤ', hint: 'zhuang', timeMs: 4800, damage: 22 },
  { text: 'ㄔㄨㄢ', hint: 'chuan', timeMs: 4800, damage: 22 },
  { text: 'ㄕㄨㄟ', hint: 'shui', timeMs: 4800, damage: 22 },
  { text: 'ㄧㄤ', hint: 'yang', timeMs: 4000, damage: 18 },
  { text: 'ㄨㄥ', hint: 'weng', timeMs: 4000, damage: 18 },
  { text: 'ㄩㄢ', hint: 'yuan', timeMs: 4500, damage: 20 },
]

const ENGLISH_PROMPTS: PromptItem[] = [
  { text: 'A', timeMs: 2500, damage: 10 },
  { text: 'S', timeMs: 2500, damage: 10 },
  { text: 'D', timeMs: 2500, damage: 10 },
  { text: 'F', timeMs: 2500, damage: 10 },
  { text: 'J', timeMs: 2500, damage: 10 },
  { text: 'K', timeMs: 2500, damage: 10 },
  { text: 'L', timeMs: 2500, damage: 10 },
  { text: 'HIT', timeMs: 3200, damage: 14 },
  { text: 'RUN', timeMs: 3200, damage: 14 },
  { text: 'GO', timeMs: 2800, damage: 12 },
  { text: 'FIRE', timeMs: 3600, damage: 16 },
  { text: 'SLASH', timeMs: 4000, damage: 18 },
  { text: 'HERO', timeMs: 3600, damage: 16 },
  { text: 'SWORD', timeMs: 4000, damage: 18 },
  { text: 'STRIKE', timeMs: 4200, damage: 20 },
  { text: 'ATTACK', timeMs: 4500, damage: 22 },
  { text: 'COMBO', timeMs: 3800, damage: 18 },
  { text: 'POWER', timeMs: 3800, damage: 18 },
  { text: 'MAGIC', timeMs: 4000, damage: 18 },
  { text: 'BLADE', timeMs: 3800, damage: 18 },
  { text: 'FAST', timeMs: 3400, damage: 15 },
  { text: 'TYPE', timeMs: 3400, damage: 15 },
  { text: 'WIN', timeMs: 3000, damage: 14 },
  { text: 'DODGE', timeMs: 3800, damage: 18 },
  { text: 'GUARD', timeMs: 3800, damage: 18 },
  { text: 'SMASH', timeMs: 4000, damage: 18 },
  { text: 'QUEST', timeMs: 4000, damage: 18 },
  { text: 'FIGHT', timeMs: 3800, damage: 18 },
  { text: 'BRAVE', timeMs: 4000, damage: 20 },
  { text: 'VICTORY', timeMs: 5000, damage: 24 },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createPromptDeck(mode: GameMode): PromptItem[] {
  return shuffle(mode === 'zhuyin' ? ZHUYIN_PROMPTS : ENGLISH_PROMPTS)
}

/** Characters needed for on-screen keypad for a given prompt */
export function charsNeeded(prompt: string): Set<string> {
  return new Set([...prompt])
}
