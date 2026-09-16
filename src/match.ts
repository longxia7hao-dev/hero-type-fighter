/**
 * Fuzzy match helpers for voice STT transcripts vs expected answers.
 */

const LETTER_NAMES: Record<string, string> = {
  a: 'a',
  ay: 'a',
  hey: 'a',
  b: 'b',
  be: 'b',
  bee: 'b',
  c: 'c',
  see: 'c',
  sea: 'c',
  d: 'd',
  dee: 'd',
  e: 'e',
  ee: 'e',
  f: 'f',
  ef: 'f',
  eff: 'f',
  g: 'g',
  gee: 'g',
  jee: 'g',
  h: 'h',
  aitch: 'h',
  haitch: 'h',
  i: 'i',
  eye: 'i',
  j: 'j',
  jay: 'j',
  k: 'k',
  kay: 'k',
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
  q: 'q',
  queue: 'q',
  cue: 'q',
  r: 'r',
  ar: 'r',
  are: 'r',
  s: 's',
  ess: 's',
  t: 't',
  tee: 't',
  u: 'u',
  you: 'u',
  yu: 'u',
  v: 'v',
  vee: 'v',
  w: 'w',
  'double-u': 'w',
  'double u': 'w',
  doubleu: 'w',
  x: 'x',
  ex: 'x',
  eks: 'x',
  y: 'y',
  why: 'y',
  wye: 'y',
  z: 'z',
  zee: 'z',
  zed: 'z',
}

/** Collapse whitespace / punctuation; keep CJK + Latin + digits + zhuyin + tones */
export function normalizeRaw(s: string): string {
  return s
    .normalize('NFKC')
    .trim()
    .replace(/[．，。、！？!?,;:·•]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function stripSpaces(s: string): string {
  return normalizeRaw(s).replace(/\s+/g, '').toLowerCase()
}

/** Remove tone marks from zhuyin (keep base symbols) */
export function stripZhuyinTones(s: string): string {
  return s.replace(/[ˊˇˋ˙ˉˆ]/g, '')
}

/** Map common tone mark variants */
export function normalizeZhuyinTones(s: string): string {
  return s
    .replace(/ˆ/g, 'ˇ') // sometimes caret used for 3rd
    .replace(/´/g, 'ˊ')
    .replace(/`/g, 'ˋ')
}

/** Digits 1–5 and tone words → tone digit */

/** Convert pinyin-ish string to compact form: letters + optional tone digit */
export function normalizePinyin(s: string): string {
  let t = normalizeRaw(s).toLowerCase()
  t = t.replace(/ü/g, 'v').replace(/ǖ|ǘ|ǚ|ǜ/g, 'v')
  // tone marks on vowels → digit at end
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
  // Already contiguous letters? A P P L E or APPLE or A.P.P.L.E
  const compact = raw.replace(/[\s.\-_]+/g, '')
  if (/^[a-z]+$/i.test(compact) && compact.length >= 2) {
    return compact.toUpperCase()
  }

  // Tokenize letter names
  const tokens = raw
    .replace(/double[\s-]?u/gi, 'double-u')
    .split(/[\s.\-_]+/)
    .filter(Boolean)

  const letters: string[] = []
  for (const tok of tokens) {
    const mapped = LETTER_NAMES[tok.toLowerCase()]
    if (mapped) letters.push(mapped.toUpperCase())
    else if (/^[a-z]$/i.test(tok)) letters.push(tok.toUpperCase())
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

function fuzzyEqual(a: string, b: string, maxDist?: number): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const dist = maxDist ?? (b.length <= 3 ? 0 : b.length <= 5 ? 1 : 2)
  return levenshtein(a, b) <= dist
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
  // single-char expected: allow if transcript is that char or ends with it
  for (const exp of expected) {
    if (/^[\u4e00-\u9fff]$/.test(exp) && (transcript.includes(exp) || chars.includes(exp))) {
      return true
    }
  }
  return false
}

export function matchZhuyinStage1(transcript: string, expected: string[]): boolean {
  const t = normalizeZhuyinTones(normalizeRaw(transcript))
  const tNoSpace = t.replace(/\s+/g, '')

  for (const exp of expected) {
    const e = normalizeZhuyinTones(normalizeRaw(exp))
    const eNoSpace = e.replace(/\s+/g, '')

    // Exact / contains zhuyin with tone
    if (tNoSpace.includes(eNoSpace) || eNoSpace.includes(tNoSpace)) return true

    // Zhuyin base without tone (only if expected has no tone OR first tone)
    const tBase = stripZhuyinTones(tNoSpace)
    const eBase = stripZhuyinTones(eNoSpace)
    if (/[\u3105-\u3129]/.test(eBase) && tBase === eBase) {
      // Accept toneless STT if expected is first tone or listed without tone mark
      if (!/[ˊˇˋ˙]/.test(e) || /ˉ/.test(e)) return true
    }

    // Pinyin + tone number
    const tp = normalizePinyin(t)
    const ep = normalizePinyin(e)
    if (ep && (tp === ep || tp.includes(ep) || fuzzyEqual(tp, ep, 1))) return true

    // Allow tone-less pinyin match when expected ends with 1 (first tone)
    if (ep.endsWith('1')) {
      const epBase = ep.slice(0, -1)
      const tpBase = tp.replace(/[1-5]$/, '')
      if (tpBase === epBase) return true
    }
  }

  // Spoken Chinese of that syllable (STT often returns the character)
  if (cjkHit(t, expected)) return true

  return false
}

export function matchZhuyinStage2(transcript: string, expected: string[]): boolean {
  const t = normalizeRaw(transcript)
  if (cjkHit(t, expected)) return true
  for (const exp of expected) {
    if (t.includes(exp)) return true
    // Sometimes STT returns multi-char phrase containing the target
    if ([...t].some((c) => exp.includes(c) && /[\u4e00-\u9fff]/.test(c))) {
      if ([...exp].every((c) => !/[\u4e00-\u9fff]/.test(c) || t.includes(c))) return true
    }
  }
  return false
}

export function matchEnglishStage1(transcript: string, expected: string[]): boolean {
  const spelled = extractSpelledLetters(transcript)
  for (const exp of expected) {
    const target = extractSpelledLetters(exp) || stripSpaces(exp).toUpperCase()
    if (!target) continue
    if (spelled === target) return true
    // Allow missing one letter for long words
    if (fuzzyEqual(spelled, target, target.length >= 5 ? 1 : 0)) return true
  }
  // Whole-word blurted during spelling stage: accept if matches any expected word form
  const compact = stripSpaces(transcript).toUpperCase()
  for (const exp of expected) {
    const word = stripSpaces(exp).toUpperCase().replace(/[^A-Z]/g, '')
    if (word.length >= 3 && compact === word) return true
  }
  return false
}

export function matchEnglishStage2(transcript: string, expected: string[]): boolean {
  const t = stripSpaces(transcript).toUpperCase().replace(/[^A-Z]/g, '')
  for (const exp of expected) {
    const e = stripSpaces(exp).toUpperCase().replace(/[^A-Z]/g, '')
    if (!e) continue
    if (t === e || t.includes(e) || e.includes(t)) return true
    if (fuzzyEqual(t, e, e.length <= 4 ? 0 : 1)) return true
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

// silence unused warning for TONE_WORD (kept for future spoken-tone expansion)
