/**
 * BRIEF-CATCH-001 — 靈域捕捉／印靈圖鑑（只收藏）
 * Numbers from design/catch-001-rules.json. Does not touch speech/match engines.
 * ART-CATCH-001: seal/codex chrome only; monster slots = 占位 until producer art.
 */

import type { GameMode, VoicePrompt } from './prompts'

export type SpiritRarity = 'common' | 'rare'

export interface SpiritDef {
  id: string
  name: string
  rarity: SpiritRarity
  /** CSS tint for 占位 tile (not final art) */
  tint: string
  blurb: string
}

export interface CodexEntry {
  id: string
  name: string
  rarity: SpiritRarity
  caughtAt: number
}

export const CATCH_MAX_HP = 100
export const CATCH_THRESHOLD: Record<SpiritRarity, number> = {
  common: 40,
  rare: 20,
}
export const ENCOUNTER_WEIGHT = { common: 0.7, rare: 0.3 } as const
export const WIN_GOLD_RARE_MULT = 1.5
/** Realm run: encounter 2–3 spirits then return */
export const REALM_ENCOUNTERS_MIN = 2
export const REALM_ENCOUNTERS_MAX = 3

export const CODEX_STORAGE_KEY = 'hero-type-fighter-codex-v1'

export const SPIRITS: SpiritDef[] = [
  {
    id: 'spirit_ember',
    name: '焰靈',
    rarity: 'common',
    tint: '#c45a2a',
    blurb: '月城餘燼凝成的印靈・占位',
  },
  {
    id: 'spirit_dew',
    name: '露靈',
    rarity: 'common',
    tint: '#3a8ec4',
    blurb: '夜露結印的輕靈・占位',
  },
  {
    id: 'spirit_pebble',
    name: '石靈',
    rarity: 'common',
    tint: '#7a6a58',
    blurb: '城基碎石醒成靈・占位',
  },
  {
    id: 'spirit_moon',
    name: '月靈',
    rarity: 'rare',
    tint: '#c9b4ff',
    blurb: '滿月符影・稀有印靈・占位',
  },
  {
    id: 'spirit_void',
    name: '虛靈',
    rarity: 'rare',
    tint: '#4a2a6a',
    blurb: '虛空月符・稀有印靈・占位',
  },
]

const SEAL_ZHUYIN: VoicePrompt[] = [
  {
    id: 's_yin',
    displayPrimary: 'ㄧㄣ',
    displaySecondary: '印',
    hint: 'yin',
    stage1: ['ㄧㄣ', 'yin', 'in', '印'],
    stage2: ['印'],
    timeMs: 5500,
    damage: 0,
  },
  {
    id: 's_feng',
    displayPrimary: 'ㄈㄥ',
    displaySecondary: '封',
    hint: 'feng',
    stage1: ['ㄈㄥ', 'feng', 'fong', '封'],
    stage2: ['封'],
    timeMs: 5500,
    damage: 0,
  },
  {
    id: 's_ling',
    displayPrimary: 'ㄌㄧㄥ',
    displaySecondary: '靈',
    hint: 'ling',
    stage1: ['ㄌㄧㄥ', 'ling', '靈'],
    stage2: ['靈'],
    timeMs: 5500,
    damage: 0,
  },
  {
    id: 's_zhu',
    displayPrimary: 'ㄓㄨ',
    displaySecondary: '住',
    hint: 'zhu',
    stage1: ['ㄓㄨ', 'zhu', 'ju', '住'],
    stage2: ['住'],
    timeMs: 5500,
    damage: 0,
  },
]

/** English seal = single whole-word stage (englishSingleWord) */
const SEAL_ENGLISH: VoicePrompt[] = [
  {
    id: 's_seal',
    displayPrimary: 'SEAL',
    displaySecondary: 'SEAL',
    stage1: ['SEAL', 'seal'],
    stage2: ['SEAL', 'seal'],
    timeMs: 5000,
    damage: 0,
  },
  {
    id: 's_bind',
    displayPrimary: 'BIND',
    displaySecondary: 'BIND',
    stage1: ['BIND', 'bind'],
    stage2: ['BIND', 'bind'],
    timeMs: 5000,
    damage: 0,
  },
  {
    id: 's_catch',
    displayPrimary: 'CATCH',
    displaySecondary: 'CATCH',
    stage1: ['CATCH', 'catch'],
    stage2: ['CATCH', 'catch'],
    timeMs: 5000,
    damage: 0,
  },
  {
    id: 's_mark',
    displayPrimary: 'MARK',
    displaySecondary: 'MARK',
    stage1: ['MARK', 'mark'],
    stage2: ['MARK', 'mark'],
    timeMs: 5000,
    damage: 0,
  },
]

export function getSpirit(id: string): SpiritDef | undefined {
  return SPIRITS.find((s) => s.id === id)
}

export function catchThreshold(rarity: SpiritRarity): number {
  return CATCH_THRESHOLD[rarity]
}

export function isCatchReady(monsterHp: number, rarity: SpiritRarity): boolean {
  return monsterHp <= CATCH_THRESHOLD[rarity]
}

export function rollSpirit(): SpiritDef {
  const rareRoll = Math.random() < ENCOUNTER_WEIGHT.rare
  const pool = SPIRITS.filter((s) => (rareRoll ? s.rarity === 'rare' : s.rarity === 'common'))
  return pool[Math.floor(Math.random() * pool.length)]!
}

export function buildRealmQueue(): SpiritDef[] {
  const n =
    REALM_ENCOUNTERS_MIN +
    Math.floor(Math.random() * (REALM_ENCOUNTERS_MAX - REALM_ENCOUNTERS_MIN + 1))
  return Array.from({ length: n }, () => rollSpirit())
}

export function pickSealPrompt(mode: GameMode): VoicePrompt {
  const list = mode === 'zhuyin' ? SEAL_ZHUYIN : SEAL_ENGLISH
  return list[Math.floor(Math.random() * list.length)]!
}

/** English seal is single-word: start at stage 2. Zhuyin keeps dual. */
export function sealStartStage(mode: GameMode): 1 | 2 {
  return mode === 'english' ? 2 : 1
}

export function realmWinGold(baseGold: number, rarity: SpiritRarity): number {
  if (rarity === 'rare') return Math.round(baseGold * WIN_GOLD_RARE_MULT)
  return baseGold
}

export function loadCodex(): CodexEntry[] {
  try {
    const raw = localStorage.getItem(CODEX_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CodexEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e) => e && typeof e.id === 'string')
  } catch {
    return []
  }
}

export function saveCodex(entries: CodexEntry[]): void {
  localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(entries))
}

/** Returns true if newly added; false if duplicate (still success UX). */
export function addToCodex(spirit: SpiritDef): { entry: CodexEntry; isNew: boolean } {
  const list = loadCodex()
  const existing = list.find((e) => e.id === spirit.id)
  if (existing) {
    return { entry: existing, isNew: false }
  }
  const entry: CodexEntry = {
    id: spirit.id,
    name: spirit.name,
    rarity: spirit.rarity,
    caughtAt: Date.now(),
  }
  list.push(entry)
  saveCodex(list)
  return { entry, isNew: true }
}

export function rarityLabel(r: SpiritRarity): string {
  return r === 'rare' ? '稀有' : '普通'
}

/** Placeholder tile HTML — ART-CATCH-001 empty window; no invented monster art */
export function spiritPlaceholderHtml(spirit: SpiritDef, cls = ''): string {
  return `
    <div class="spirit-slot ${cls}" data-spirit="${spirit.id}" style="--spirit-tint:${spirit.tint}">
      <div class="spirit-slot-art" aria-hidden="true">
        <div class="spirit-watermark"></div>
        <span class="spirit-ph-label">占位</span>
        <span class="spirit-ph-wait">等待造型板</span>
      </div>
      <div class="spirit-slot-meta">
        <span class="spirit-name">${escapeCatch(spirit.name)}</span>
        <span class="spirit-rarity rarity-${spirit.rarity}">${rarityLabel(spirit.rarity)}</span>
      </div>
    </div>`
}

function escapeCatch(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
