/**
 * JRPG shell data — jobs / items / economy (BRIEF-RPG-001)
 * Does not touch the speech engine.
 */

export type JobId = 'swordsman' | 'paladin' | 'mage' | 'rogue'
export type ItemId = 'scroll' | 'hourglass' | 'amulet' | 'potion'

export interface JobDef {
  id: JobId
  name: string
  blurb: string
  skillName: string
  skillBlurb: string
  /** Max skill uses per battle */
  skillMax: number
  damageMult: number
  /** Rogue: free damage at battle start */
  firstStrike: number
  cssClass: string
  weaponCue: string
}

export interface ItemDef {
  id: ItemId
  name: string
  blurb: string
  price: number
  /** Instant monster damage when used in battle */
  damage?: number
  /** Extra ms this round */
  timeBonusMs?: number
  /** HP restore */
  heal?: number
  /** Grant one block charge */
  block?: boolean
}

export const MAX_HP = 100
export const MONSTER_DMG = 14
export const START_GOLD = 40

export const JOBS: JobDef[] = [
  {
    id: 'swordsman',
    name: '劍士',
    blurb: '被動傷害 ×1.35；擅長正面輸出。',
    skillName: '破甲斬',
    skillBlurb: '立刻對魔物造成 22 傷害（每場 1 次）',
    skillMax: 1,
    damageMult: 1.35,
    firstStrike: 0,
    cssClass: 'job-swordsman',
    weaponCue: '⚔️',
  },
  {
    id: 'paladin',
    name: '聖騎士',
    blurb: '聖盾可擋下一次傷害。',
    skillName: '聖盾',
    skillBlurb: '阻擋下一次所受傷害（每場 1 次）',
    skillMax: 1,
    damageMult: 1,
    firstStrike: 0,
    cssClass: 'job-paladin',
    weaponCue: '🛡️',
  },
  {
    id: 'mage',
    name: '法師',
    blurb: '延長唸招／讀題時間。',
    skillName: '時光延展',
    skillBlurb: '本回合時限 +5 秒（每場 2 次）',
    skillMax: 2,
    damageMult: 1,
    firstStrike: 0,
    cssClass: 'job-mage',
    weaponCue: '🪄',
  },
  {
    id: 'rogue',
    name: '盜賊',
    blurb: '開戰先制一擊；技能可閃過一次失敗。',
    skillName: '影遁',
    skillBlurb: '下一次失敗／逾時不受傷（每場 1 次）',
    skillMax: 1,
    damageMult: 1,
    firstStrike: 12,
    cssClass: 'job-rogue',
    weaponCue: '🗡️',
  },
]

export const ITEMS: ItemDef[] = [
  {
    id: 'scroll',
    name: '直接攻擊卷',
    blurb: '立刻對魔物造成 28 傷害',
    price: 25,
    damage: 28,
  },
  {
    id: 'hourglass',
    name: '沙漏',
    blurb: '本回合時限 +4 秒',
    price: 15,
    timeBonusMs: 4000,
  },
  {
    id: 'amulet',
    name: '護符',
    blurb: '阻擋下一次所受傷害',
    price: 20,
    block: true,
  },
  {
    id: 'potion',
    name: '回復藥',
    blurb: '回復 35 HP',
    price: 18,
    heal: 35,
  },
]

export const SKILL_FLAT: Record<JobId, number> = {
  swordsman: 22,
  paladin: 0,
  mage: 0,
  rogue: 0,
}

export const MAGE_TIME_BONUS_MS = 5000

export function getJob(id: JobId): JobDef {
  return JOBS.find((j) => j.id === id)!
}

export function getItem(id: ItemId): ItemDef {
  return ITEMS.find((i) => i.id === id)!
}

export function winGold(round: number): number {
  return 35 + Math.floor(round / 2)
}

export type Inventory = Record<ItemId, number>

export function emptyInventory(): Inventory {
  return { scroll: 0, hourglass: 0, amulet: 0, potion: 0 }
}
