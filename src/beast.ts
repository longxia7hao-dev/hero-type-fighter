/**
 * BRIEF-BEAST-001 — beast trainer data + placeholder art (no AI API)
 */

export type PlayerGender = 'male' | 'female'

export interface BeastDef {
  id: string
  name: string
  keywords: string[]
  /** CSS gradient / tint for placeholder */
  tint: string
  tint2: string
  blurb: string
}

export const DEFAULT_BEAST_NAME = '我的智能獸'

export const STORY_SLIDES: string[] = [
  '在遙遠的未來，人類發現了一扇通往「AI 次世界」的門……',
  '那裡住著會回應語言與讀音的生命體——人們稱牠們為「智能獸」。',
  '訓練師以正確的讀音與智能獸溝通，才能激發牠們的力量。',
  '你將創造屬於自己的第一隻智能獸，並在野外與野生智能獸對讀。',
  '準備好了嗎？說出關鍵字，喚出你的夥伴！',
]

const WILD_POOL: BeastDef[] = [
  {
    id: 'wild_spark',
    name: '電光獸',
    keywords: ['電', '光'],
    tint: '#f0c040',
    tint2: '#ff6b3d',
    blurb: '野外徘徊的電光智能獸',
  },
  {
    id: 'wild_leaf',
    name: '翠葉獸',
    keywords: ['葉', '森'],
    tint: '#3ecf7a',
    tint2: '#1a8a4a',
    blurb: '森林邊緣的翠葉智能獸',
  },
  {
    id: 'wild_tide',
    name: '潮汐獸',
    keywords: ['水', '潮'],
    tint: '#4aa8ff',
    tint2: '#1a4a8a',
    blurb: '月城水岸的潮汐智能獸',
  },
  {
    id: 'wild_shade',
    name: '影霧獸',
    keywords: ['影', '霧'],
    tint: '#7a5cff',
    tint2: '#2a1558',
    blurb: '夜霧中的影霧智能獸',
  },
  {
    id: 'wild_glow',
    name: '月輝獸',
    keywords: ['月', '輝'],
    tint: '#e8d4ff',
    tint2: '#9b6dff',
    blurb: '沐浴月輝的稀有智能獸',
  },
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const GRADIENTS: [string, string][] = [
  ['#ff7eb3', '#7c4dff'],
  ['#4ecdc4', '#556270'],
  ['#f9d423', '#ff4e50'],
  ['#a8e063', '#56ab2f'],
  ['#89f7fe', '#66a6ff'],
  ['#c9b4ff', '#4a2a6a'],
  ['#ff9a9e', '#fad0c4'],
  ['#a18cd1', '#fbc2eb'],
]

export function parseKeywords(raw: string): string[] {
  return raw
    .split(/[\s,，、；;|/]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 8)
}

export function createBeastFromPrompt(raw: string): BeastDef {
  const keywords = parseKeywords(raw)
  const seed = keywords.join('|') || 'default'
  const h = hashStr(seed)
  const [tint, tint2] = GRADIENTS[h % GRADIENTS.length]!
  const name =
    keywords[0] && keywords[0].length <= 8
      ? keywords[0].length <= 2
        ? `${keywords[0]}智能獸`
        : keywords[0]
      : DEFAULT_BEAST_NAME
  return {
    id: `player_${h.toString(36)}`,
    name,
    keywords: keywords.length ? keywords : ['智能獸'],
    tint,
    tint2,
    blurb: keywords.length
      ? `由「${keywords.join('·')}」喚出的智能獸`
      : '初生的智能獸夥伴',
  }
}

export function pickWildBeast(excludeId?: string): BeastDef {
  const pool = WILD_POOL.filter((b) => b.id !== excludeId)
  const list = pool.length ? pool : WILD_POOL
  return list[Math.floor(Math.random() * list.length)]!
}

/** Placeholder art: CSS gradient orb + SVG silhouette — no external AI */
export function beastPlaceholderHtml(b: BeastDef, extraCls = ''): string {
  const kw = b.keywords.slice(0, 3).join(' · ')
  return `
    <div class="beast-slot ${extraCls}" style="--beast-a:${b.tint};--beast-b:${b.tint2}" aria-label="${escapeAttr(b.name)}">
      <div class="beast-orb">
        <svg class="beast-silhouette" viewBox="0 0 64 64" aria-hidden="true">
          <ellipse cx="32" cy="40" rx="18" ry="14" fill="rgba(255,255,255,0.25)"/>
          <circle cx="32" cy="24" r="12" fill="rgba(255,255,255,0.35)"/>
          <circle cx="27" cy="22" r="2" fill="rgba(20,10,40,0.55)"/>
          <circle cx="37" cy="22" r="2" fill="rgba(20,10,40,0.55)"/>
          <path d="M22 18 Q32 8 42 18" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <div class="beast-name">${escapeAttr(b.name)}</div>
      <div class="beast-kw">${escapeAttr(kw)}</div>
    </div>`
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
