/**
 * Fuzzy match helpers for voice STT transcripts vs expected answers.
 * CHANGE-VOICE-003: looser matching — more STT variants, tone-optional,
 * common mishears for single Zhuyin symbols, fuzzy English spell/word.
 */

const LETTER_NAMES: Record<string, string> = {
  a: 'a',
  ay: 'a',
  eh: 'a',
  hey: 'a',
  ei: 'a',
  b: 'b',
  be: 'b',
  bee: 'b',
  bi: 'b',
  c: 'c',
  see: 'c',
  sea: 'c',
  si: 'c',
  d: 'd',
  dee: 'd',
  di: 'd',
  e: 'e',
  ee: 'e',
  f: 'f',
  ef: 'f',
  eff: 'f',
  g: 'g',
  gee: 'g',
  jee: 'g',
  ji: 'g',
  h: 'h',
  aitch: 'h',
  haitch: 'h',
  eich: 'h',
  i: 'i',
  eye: 'i',
  ai: 'i',
  j: 'j',
  jay: 'j',
  k: 'k',
  kay: 'k',
  kei: 'k',
  l: 'l',
  el: 'l',
  ell: 'l',
  m: 'm',
  em: 'm',
  n: 'n',
  en: 'n',
  o: 'o',
  oh: 'o',
  p: 'p',
  pee: 'p',
  pi: 'p',
  q: 'q',
  queue: 'q',
  cue: 'q',
  kyu: 'q',
  r: 'r',
  ar: 'r',
  are: 'r',
  s: 's',
  ess: 's',
  es: 's',
  t: 't',
  tee: 't',
  ti: 't',
  u: 'u',
  you: 'u',
  yu: 'u',
  v: 'v',
  vee: 'v',
  vi: 'v',
  w: 'w',
  'double-u': 'w',
  'double u': 'w',
  doubleu: 'w',
  dabalyu: 'w',
  x: 'x',
  ex: 'x',
  eks: 'x',
  y: 'y',
  why: 'y',
  wye: 'y',
  z: 'z',
  zee: 'z',
  zed: 'z',
  // zh-TW STT often returns Chinese letter names in en-US mix
  诶: 'a',
  欸: 'a',
  ㄟ: 'a',
  比: 'b',
  西: 'c',
  弟: 'd',
  第: 'd',
  伊: 'e',
  艾: 'a',
  艾弗: 'f',
  吉: 'g',
  艾尺: 'h',
  艾奇: 'h',
  艾斯: 's',
  杰: 'j',
  傑: 'j',
  开: 'k',
  開: 'k',
  艾勒: 'l',
  艾姆: 'm',
  艾恩: 'n',
  欧: 'o',
  歐: 'o',
  皮: 'p',
  丘: 'q',
  阿: 'r',
  提: 't',
  优: 'u',
  優: 'u',
  维: 'v',
  維: 'v',
  达布溜: 'w',
  艾克斯: 'x',
  歪: 'y',
  贼德: 'z',
}

/**
 * Common STT returns when the player says a single Zhuyin initial sound
 * (e.g. ㄐ → 雞／基／ji／gee). Keys are Zhuyin symbols.
 */
const ZHUYIN_SOUND_ALIASES: Record<string, string[]> = {
  ㄅ: ['ㄅ', 'b', 'bo', 'ba', 'bu', 'bi', '八', '吧', '爸', '波', '伯', '不', '比'],
  ㄆ: ['ㄆ', 'p', 'po', 'pa', 'pi', 'pu', '皮', '坡', '泼', '潑', '怕', '趴'],
  ㄇ: ['ㄇ', 'm', 'mo', 'ma', 'mi', 'mu', '媽', '妈', '摸', '嗎', '吗', '馬', '马'],
  ㄈ: ['ㄈ', 'f', 'fo', 'fa', 'fu', 'fei', '飛', '飞', '佛', '發', '发', '夫'],
  ㄉ: ['ㄉ', 'd', 'de', 'da', 'di', 'du', '大', '的', '得', '哒', '打'],
  ㄊ: ['ㄊ', 't', 'te', 'ta', 'ti', 'tu', '他', '她', '它', '特', '踢'],
  ㄋ: ['ㄋ', 'n', 'ne', 'na', 'ni', 'nu', '你', '呢', '那', '娜'],
  ㄌ: ['ㄌ', 'l', 'le', 'la', 'li', 'lu', 'lo', '了', '勒', '拉', '哩'],
  ㄍ: ['ㄍ', 'g', 'ge', 'ga', 'gu', '哥', '歌', '格', '個', '个'],
  ㄎ: ['ㄎ', 'k', 'ke', 'ka', 'ku', '可', '科', '咳', '克'],
  ㄏ: ['ㄏ', 'h', 'he', 'ha', 'hu', '喝', '呵', '哈', '河'],
  ㄐ: [
    'ㄐ',
    'j',
    'ji',
    'jie',
    'jia',
    'ju',
    'gee',
    'chi',
    '雞',
    '鸡',
    '基',
    '機',
    '机',
    '及',
    '急',
    '幾',
    '几',
    '击',
    '擊',
    '吉',
    '記',
    '记',
    '季',
  ],
  ㄑ: [
    'ㄑ',
    'q',
    'qi',
    'chie',
    'chee',
    'chi',
    '七',
    '吃',
    '期',
    '其',
    '奇',
    '氣',
    '气',
    '騎',
    '骑',
  ],
  ㄒ: ['ㄒ', 'x', 'xi', 'shi', 'see', '西', '吸', '希', '兮', '習', '习', '喜'],
  ㄓ: ['ㄓ', 'zh', 'zhi', 'jr', '知', '之', '隻', '只', '支', '枝', '織', '织'],
  ㄔ: ['ㄔ', 'ch', 'chi', '吃', '持', '池', '尺', '赤'],
  ㄕ: ['ㄕ', 'sh', 'shi', '是', '事', '師', '师', '十', '石', '時', '时', '詩', '诗'],
  ㄖ: ['ㄖ', 'r', 'ri', '日', '入', '如'],
  ㄗ: ['ㄗ', 'z', 'zi', '資', '资', '子', '字', '自'],
  ㄘ: ['ㄘ', 'c', 'ci', '词', '詞', '此', '次', '刺'],
  ㄙ: ['ㄙ', 's', 'si', '思', '司', '四', '絲', '丝', '死'],
  ㄚ: ['ㄚ', 'a', 'ah', '啊', '阿'],
  ㄛ: ['ㄛ', 'o', 'oh', '喔', '哦'],
  ㄜ: ['ㄜ', 'e', 'eh', '鵝', '鹅', '額', '额'],
  ㄝ: ['ㄝ', 'ê', 'eh', '耶'],
  ㄞ: ['ㄞ', 'ai', '爱', '愛', '哀'],
  ㄟ: ['ㄟ', 'ei', '欸', '诶'],
  ㄠ: ['ㄠ', 'ao', '凹', '奧', '奥'],
  ㄡ: ['ㄡ', 'ou', '歐', '欧', '喔'],
  ㄢ: ['ㄢ', 'an', '安'],
  ㄣ: ['ㄣ', 'en', '恩'],
  ㄤ: ['ㄤ', 'ang', '昂'],
  ㄥ: ['ㄥ', 'eng', '鞥'],
  ㄦ: ['ㄦ', 'er', '兒', '儿', '而'],
  ㄧ: ['ㄧ', 'yi', 'i', '一', '衣', '依'],
  ㄨ: ['ㄨ', 'wu', 'u', '烏', '乌', '五', '無', '无'],
  ㄩ: ['ㄩ', 'yu', 'v', '魚', '鱼', '于', '余'],
}

/** Collapse whitespace / punctuation; keep CJK + Latin + digits + zhuyin + tones */
export function normalizeRaw(s: string): string {
  return s
    .normalize('NFKC')
    .trim()
    .replace(/[．，。、！？!?,;:·•～~「」『』【】（）()]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function stripSpaces(s: string): string {
  return normalizeRaw(s).replace(/\s+/g, '').toLowerCase()
}

/** Remove tone marks from zhuyin (keep base symbols) */
export function stripZhuyinTones(s: string): string {
  return s.replace(/[ˊˇˋ˙ˉˆ´`']/g, '')
}

/** Map common tone mark variants */
export function normalizeZhuyinTones(s: string): string {
  return s
    .replace(/ˆ/g, 'ˇ')
    .replace(/´/g, 'ˊ')
    .replace(/`/g, 'ˋ')
}

/** Convert pinyin-ish string to compact form: letters + optional tone digit */
export function normalizePinyin(s: string): string {
  let t = normalizeRaw(s).toLowerCase()
  t = t.replace(/ü/g, 'v').replace(/ǖ|ǘ|ǚ|ǜ/g, 'v')
  const toneMap: Record<string, string> = {
    ā: 'a1',
    á: 'a2',
    ǎ: 'a3',
    à: 'a4',
    ē: 'e1',
    é: 'e2',
    ě: 'e3',
    è: 'e4',
    ī: 'i1',
    í: 'i2',
    ǐ: 'i3',
    ì: 'i4',
    ō: 'o1',
    ó: 'o2',
    ǒ: 'o3',
    ò: 'o4',
    ū: 'u1',
    ú: 'u2',
    ǔ: 'u3',
    ù: 'u4',
  }
  let tone = ''
  let out = ''
  for (const ch of t) {
    if (toneMap[ch]) {
      out += toneMap[ch][0]
      tone = toneMap[ch][1] ?? ''
    } else {
      out += ch
    }
  }
  out = out.replace(/[^a-z0-9]/g, '')
  if (tone && !/[1-5]$/.test(out)) out += tone
  return out
}

/** Extract letter sequence from English spelling speech */
export function extractSpelledLetters(transcript: string): string {
  const raw = normalizeRaw(transcript).toLowerCase()
  const compact = raw.replace(/[\s.\-_/,|]+/g, '')
  if (/^[a-z]+$/i.test(compact) && compact.length >= 2) {
    return compact.toUpperCase()
  }

  const tokens = raw
    .replace(/double[\s-]?u/gi, 'double-u')
    .split(/[\s.\\-_/,|]+/)
    .filter(Boolean)

  const letters: string[] = []
  for (const tok of tokens) {
    const mapped = LETTER_NAMES[tok.toLowerCase()]
    if (mapped) letters.push(mapped.toUpperCase())
    else if (/^[a-z]$/i.test(tok)) letters.push(tok.toUpperCase())
    else if (LETTER_NAMES[tok]) letters.push(LETTER_NAMES[tok]!.toUpperCase())
  }
  return letters.join('')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      )
    }
  }
  return dp[m]![n]!
}

/** Looser distance budget (VOICE-003) */
function fuzzyEqual(a: string, b: string, maxDist?: number): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const dist =
    maxDist ??
    (b.length <= 2 ? 1 : b.length <= 4 ? 1 : b.length <= 7 ? 2 : 3)
  return levenshtein(a, b) <= dist
}

/** STT often returns several alts joined with " | " — try each piece */
function transcriptCandidates(transcript: string): string[] {
  const raw = normalizeRaw(transcript)
  if (!raw) return []
  const parts = raw
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  const out = new Set<string>()
  out.add(raw)
  for (const p of parts) out.add(p)
  // also bare CJK chars as solo candidates
  for (const ch of raw) {
    if (/[\u4e00-\u9fff]/.test(ch)) out.add(ch)
  }
  return [...out]
}

function expandExpected(expected: string[]): string[] {
  const out = new Set<string>()
  for (const exp of expected) {
    out.add(exp)
    const e = normalizeRaw(exp)
    out.add(e)
    out.add(stripSpaces(e))
    out.add(stripZhuyinTones(e))
    // single Zhuyin → inject STT alias family
    if (/^[\u3105-\u3129]$/.test(stripZhuyinTones(e))) {
      const sym = stripZhuyinTones(e)
      for (const a of ZHUYIN_SOUND_ALIASES[sym] ?? []) out.add(a)
    }
    // multi-zhuyin: also add toneless
    if (/[\u3105-\u3129]/.test(e)) {
      out.add(stripZhuyinTones(e.replace(/\s+/g, '')))
    }
  }
  return [...out]
}

/** Does transcript contain any CJK char from expected list? */
function cjkHit(transcript: string, expected: string[]): boolean {
  const chars = [...transcript].filter((c) => /[\u4e00-\u9fff]/.test(c))
  if (!chars.length) return false
  for (const exp of expected) {
    for (const ch of exp) {
      if (/[\u4e00-\u9fff]/.test(ch) && chars.includes(ch)) return true
    }
  }
  for (const exp of expected) {
    if (/^[\u4e00-\u9fff]$/.test(exp) && (transcript.includes(exp) || chars.includes(exp))) {
      return true
    }
  }
  return false
}

/**
 * Stage 1 = 音對 (sound match). Tone orthography from STT is not required.
 * VOICE-003: try every STT alt, expand Zhuyin alias families, looser fuzzy.
 */
export function matchZhuyinStage1(transcript: string, expected: string[]): boolean {
  const expanded = expandExpected(expected)
  for (const piece of transcriptCandidates(transcript)) {
    if (matchZhuyinStage1One(piece, expanded, expected)) return true
  }
  return false
}

function matchZhuyinStage1One(
  transcript: string,
  expanded: string[],
  originalExpected: string[],
): boolean {
  const t = normalizeZhuyinTones(normalizeRaw(transcript))
  const tNoSpace = t.replace(/\s+/g, '')
  const tBase = stripZhuyinTones(tNoSpace)
  const tp = normalizePinyin(t)
  const tpBase = tp.replace(/[1-5]$/, '')
  const tLower = tNoSpace.toLowerCase()

  for (const exp of expanded) {
    const e = normalizeZhuyinTones(normalizeRaw(exp))
    const eNoSpace = e.replace(/\s+/g, '')
    const eBase = stripZhuyinTones(eNoSpace)
    const eLower = eNoSpace.toLowerCase()

    if (!eNoSpace) continue

    // Exact / contains (with or without tone marks)
    if (tNoSpace.includes(eNoSpace) || eNoSpace.includes(tNoSpace)) return true
    if (tLower === eLower) return true

    // Toneless zhuyin base
    if (eBase && (tBase.includes(eBase) || eBase.includes(tBase))) {
      if (/[\u3105-\u3129]/.test(eBase) || /[\u3105-\u3129]/.test(tBase)) return true
    }
    if (/[\u3105-\u3129]/.test(eBase) && tBase === eBase) return true

    // Pinyin (tone-optional) + fuzzy
    const ep = normalizePinyin(e)
    const epBase = ep.replace(/[1-5]$/, '')
    if (ep && (tp === ep || tp.includes(ep) || ep.includes(tp) || fuzzyEqual(tp, ep))) {
      return true
    }
    if (
      epBase &&
      tpBase &&
      (tpBase === epBase ||
        tpBase.startsWith(epBase) ||
        epBase.startsWith(tpBase) ||
        fuzzyEqual(tpBase, epBase))
    ) {
      return true
    }

    // Latin token equality (j / ji / bo …)
    if (/^[a-z]+$/i.test(eLower) && /^[a-z0-9]+$/i.test(tLower)) {
      const tb = tLower.replace(/[1-5]/g, '')
      if (tb === eLower || tb.startsWith(eLower) || fuzzyEqual(tb, eLower)) return true
    }
  }

  // Spoken Chinese of that syllable / teaching character
  if (cjkHit(t, expanded)) return true
  if (cjkHit(t, originalExpected)) return true

  // Single-initial: any alias family whose zhuyin is in original expected
  for (const exp of originalExpected) {
    const sym = stripZhuyinTones(normalizeRaw(exp))
    if (!/^[\u3105-\u3129]$/.test(sym)) continue
    const aliases = ZHUYIN_SOUND_ALIASES[sym] ?? []
    for (const a of aliases) {
      if (/[\u4e00-\u9fff]/.test(a) && t.includes(a)) return true
      const ap = normalizePinyin(a)
      const apBase = ap.replace(/[1-5]$/, '')
      if (apBase && tpBase && (tpBase === apBase || fuzzyEqual(tpBase, apBase))) return true
      if (/^[a-z]+$/i.test(a) && (tLower === a || tLower.startsWith(a))) return true
    }
  }

  return false
}

export function matchZhuyinStage2(transcript: string, expected: string[]): boolean {
  for (const piece of transcriptCandidates(transcript)) {
    const t = normalizeRaw(piece)
    if (cjkHit(t, expected)) return true
    for (const exp of expected) {
      const e = normalizeRaw(exp)
      if (!e) continue
      if (t.includes(e) || e.includes(t)) return true
      // multi-char phrase containing every CJK of expected
      const need = [...e].filter((c) => /[\u4e00-\u9fff]/.test(c))
      if (need.length && need.every((c) => t.includes(c))) return true
      // single char: accept if STT padded with particles (的／了／啊…)
      if (/^[\u4e00-\u9fff]$/.test(e)) {
        const stripped = t.replace(/[的了啊阿呢吧呀喔哦！!。．\s]/g, '')
        if (stripped === e || stripped.includes(e)) return true
      }
    }
  }
  return false
}

export function matchEnglishStage1(transcript: string, expected: string[]): boolean {
  for (const piece of transcriptCandidates(transcript)) {
    const spelled = extractSpelledLetters(piece)
    for (const exp of expected) {
      const target = extractSpelledLetters(exp) || stripSpaces(exp).toUpperCase().replace(/[^A-Z]/g, '')
      if (!target) continue
      if (spelled === target) return true
      // VOICE-003: allow 1 typo from length 3; 2 from length 6+
      const budget = target.length >= 6 ? 2 : target.length >= 3 ? 1 : 0
      if (fuzzyEqual(spelled, target, budget)) return true
      // order-preserving subsequence ≈ full target (STT dropped one letter name)
      if (spelled.length >= target.length - 1 && isSubsequence(spelled, target) && target.length >= 3) {
        return true
      }
    }
    // Whole-word blurted during spelling stage
    const compact = stripSpaces(piece).toUpperCase().replace(/[^A-Z]/g, '')
    for (const exp of expected) {
      const word = stripSpaces(exp).toUpperCase().replace(/[^A-Z]/g, '')
      if (word.length >= 2 && (compact === word || fuzzyEqual(compact, word, word.length >= 5 ? 1 : 0))) {
        return true
      }
    }
  }
  return false
}

function isSubsequence(short: string, long: string): boolean {
  // every char of short appears in order inside long OR vice-versa when lengths close
  let i = 0
  for (const ch of long) {
    if (ch === short[i]) i++
    if (i >= short.length) return true
  }
  // also: long is subsequence of short (STT inserted noise letter)
  i = 0
  for (const ch of short) {
    if (ch === long[i]) i++
    if (i >= long.length) return true
  }
  return false
}

export function matchEnglishStage2(transcript: string, expected: string[]): boolean {
  for (const piece of transcriptCandidates(transcript)) {
    const t = stripSpaces(piece).toUpperCase().replace(/[^A-Z]/g, '')
    if (!t) continue
    for (const exp of expected) {
      const e = stripSpaces(exp).toUpperCase().replace(/[^A-Z]/g, '')
      if (!e) continue
      if (t === e || t.includes(e) || e.includes(t)) return true
      const budget = e.length <= 3 ? 1 : e.length <= 6 ? 1 : 2
      if (fuzzyEqual(t, e, budget)) return true
    }
  }
  return false
}

export function matchStage(
  mode: 'zhuyin' | 'english',
  stage: 1 | 2,
  transcript: string,
  expected: string[],
): boolean {
  if (!transcript.trim()) return false
  if (mode === 'zhuyin') {
    return stage === 1
      ? matchZhuyinStage1(transcript, expected)
      : matchZhuyinStage2(transcript, expected)
  }
  return stage === 1
    ? matchEnglishStage1(transcript, expected)
    : matchEnglishStage2(transcript, expected)
}
