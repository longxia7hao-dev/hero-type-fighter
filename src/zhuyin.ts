/** Standard Taiwan Zhuyin keyboard layout (rows) */
export const ZHUYIN_ROWS: string[][] = [
  ['ㄅ', 'ㄉ', 'ˇ', 'ˋ', 'ㄓ', 'ˊ', 'ˆ', 'ㄚ', 'ㄞ', 'ㄢ', 'ㄦ'],
  ['ㄆ', 'ㄊ', 'ㄍ', 'ㄐ', 'ㄔ', 'ㄗ', 'ㄧ', 'ㄛ', 'ㄟ', 'ㄣ'],
  ['ㄇ', 'ㄋ', 'ㄎ', 'ㄑ', 'ㄕ', 'ㄘ', 'ㄨ', 'ㄜ', 'ㄠ', 'ㄤ'],
  ['ㄈ', 'ㄌ', 'ㄏ', 'ㄒ', 'ㄖ', 'ㄙ', 'ㄩ', 'ㄝ', 'ㄡ', 'ㄥ'],
]

/** Map common physical-key output / IME leftovers to Zhuyin symbols if needed */
export const TONE_ALIASES: Record<string, string> = {
  'ˇ': 'ˇ',
  'ˋ': 'ˋ',
  'ˊ': 'ˊ',
  'ˆ': 'ˆ',
  '˙': '˙',
}

export function normalizeInputChar(ch: string): string {
  // Keep Zhuyin as-is; uppercase English letters for English mode matching
  if (/[\u3105-\u3129\u02C7\u02CB\u02CA\u02C6\u02D9]/.test(ch)) return ch
  return ch
}

export function isZhuyinChar(ch: string): boolean {
  return /[\u3105-\u3129]/.test(ch) || ch in TONE_ALIASES
}
