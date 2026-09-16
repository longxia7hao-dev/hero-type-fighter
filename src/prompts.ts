export type GameMode = 'zhuyin' | 'english'

export interface VoicePrompt {
  id: string
  displayPrimary: string
  displaySecondary: string
  hint?: string
  stage1: string[]
  stage2: string[]
  timeMs: number
  damage: number
}

/** Sourced from design/voice-prompts-v1.json (+4s STT buffer on timeMs) */
const ZHUYIN_PROMPTS: VoicePrompt[] = [
  {
    id: "z_zhao",
    displayPrimary: "ㄓㄠ",
    displaySecondary: "罩",
    hint: "zhao4",
    stage1: ["ㄓㄠˋ","zhao4","ㄓㄠ4","罩"],
    stage2: ["罩"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_dao",
    displayPrimary: "ㄉㄠ",
    displaySecondary: "道",
    hint: "dao4",
    stage1: ["ㄉㄠˋ","dao4","道"],
    stage2: ["道"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_huo",
    displayPrimary: "ㄏㄨㄛ",
    displaySecondary: "火",
    hint: "huo3",
    stage1: ["ㄏㄨㄛˇ","huo3","火"],
    stage2: ["火"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_shui",
    displayPrimary: "ㄕㄨㄟ",
    displaySecondary: "水",
    hint: "shui3",
    stage1: ["ㄕㄨㄟˇ","shui3","水"],
    stage2: ["水"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_jian",
    displayPrimary: "ㄐㄧㄢ",
    displaySecondary: "劍",
    hint: "jian4",
    stage1: ["ㄐㄧㄢˋ","jian4","劍"],
    stage2: ["劍"],
    timeMs: 11000,
    damage: 20,
  },
  {
    id: "z_dao3",
    displayPrimary: "ㄉㄠ",
    displaySecondary: "刀",
    hint: "dao3",
    stage1: ["ㄉㄠˇ","dao3","刀"],
    stage2: ["刀"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_bao",
    displayPrimary: "ㄅㄠ",
    displaySecondary: "爆",
    hint: "bao4",
    stage1: ["ㄅㄠˋ","bao4","爆"],
    stage2: ["爆"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_lei",
    displayPrimary: "ㄌㄟ",
    displaySecondary: "雷",
    hint: "lei2",
    stage1: ["ㄌㄟˊ","lei2","雷"],
    stage2: ["雷"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_feng",
    displayPrimary: "ㄈㄥ",
    displaySecondary: "風",
    hint: "feng1",
    stage1: ["ㄈㄥ","feng1","ㄈㄥˉ","風"],
    stage2: ["風"],
    timeMs: 10000,
    damage: 16,
  },
  {
    id: "z_guang",
    displayPrimary: "ㄍㄨㄤ",
    displaySecondary: "光",
    hint: "guang1",
    stage1: ["ㄍㄨㄤ","guang1","光"],
    stage2: ["光"],
    timeMs: 10000,
    damage: 16,
  },
  {
    id: "z_hei",
    displayPrimary: "ㄏㄟ",
    displaySecondary: "黑",
    hint: "hei1",
    stage1: ["ㄏㄟ","hei1","黑"],
    stage2: ["黑"],
    timeMs: 10000,
    damage: 16,
  },
  {
    id: "z_jue",
    displayPrimary: "ㄐㄩ",
    displaySecondary: "絕",
    hint: "jue2",
    stage1: ["ㄐㄩˊ","jue2","絕"],
    stage2: ["絕"],
    timeMs: 11000,
    damage: 20,
  },
  {
    id: "z_zhan",
    displayPrimary: "ㄓㄢ",
    displaySecondary: "戰",
    hint: "zhan4",
    stage1: ["ㄓㄢˋ","zhan4","戰"],
    stage2: ["戰"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_kan",
    displayPrimary: "ㄎㄚ",
    displaySecondary: "砍",
    hint: "ka3",
    stage1: ["ㄎㄚˇ","ka3","砍"],
    stage2: ["砍"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_tu",
    displayPrimary: "ㄊㄨ",
    displaySecondary: "突",
    hint: "tu2",
    stage1: ["ㄊㄨˊ","tu2","突"],
    stage2: ["突"],
    timeMs: 10500,
    damage: 18,
  },
  {
    id: "z_sheng",
    displayPrimary: "ㄕㄥ",
    displaySecondary: "勝",
    hint: "sheng4",
    stage1: ["ㄕㄥˋ","sheng4","勝"],
    stage2: ["勝"],
    timeMs: 11000,
    damage: 22,
  },
]

const ENGLISH_PROMPTS: VoicePrompt[] = [
  {
    id: "e_apple",
    displayPrimary: "A-P-P-L-E",
    displaySecondary: "APPLE",
    stage1: ["A P P L E","APPLE","ay pee pee el ee"],
    stage2: ["APPLE","apple"],
    timeMs: 12000,
    damage: 22,
  },
  {
    id: "e_hit",
    displayPrimary: "H-I-T",
    displaySecondary: "HIT",
    stage1: ["H I T","HIT"],
    stage2: ["HIT","hit"],
    timeMs: 9500,
    damage: 14,
  },
  {
    id: "e_fire",
    displayPrimary: "F-I-R-E",
    displaySecondary: "FIRE",
    stage1: ["F I R E","FIRE"],
    stage2: ["FIRE","fire"],
    timeMs: 10500,
    damage: 16,
  },
  {
    id: "e_slash",
    displayPrimary: "S-L-A-S-H",
    displaySecondary: "SLASH",
    stage1: ["S L A S H","SLASH"],
    stage2: ["SLASH","slash"],
    timeMs: 11500,
    damage: 18,
  },
  {
    id: "e_hero",
    displayPrimary: "H-E-R-O",
    displaySecondary: "HERO",
    stage1: ["H E R O","HERO"],
    stage2: ["HERO","hero"],
    timeMs: 10500,
    damage: 16,
  },
  {
    id: "e_sword",
    displayPrimary: "S-W-O-R-D",
    displaySecondary: "SWORD",
    stage1: ["S W O R D","SWORD"],
    stage2: ["SWORD","sword"],
    timeMs: 11500,
    damage: 18,
  },
  {
    id: "e_magic",
    displayPrimary: "M-A-G-I-C",
    displaySecondary: "MAGIC",
    stage1: ["M A G I C","MAGIC"],
    stage2: ["MAGIC","magic"],
    timeMs: 11500,
    damage: 18,
  },
  {
    id: "e_attack",
    displayPrimary: "A-T-T-A-C-K",
    displaySecondary: "ATTACK",
    stage1: ["A T T A C K","ATTACK"],
    stage2: ["ATTACK","attack"],
    timeMs: 12000,
    damage: 22,
  },
  {
    id: "e_combo",
    displayPrimary: "C-O-M-B-O",
    displaySecondary: "COMBO",
    stage1: ["C O M B O","COMBO"],
    stage2: ["COMBO","combo"],
    timeMs: 11000,
    damage: 18,
  },
  {
    id: "e_power",
    displayPrimary: "P-O-W-E-R",
    displaySecondary: "POWER",
    stage1: ["P O W E R","POWER"],
    stage2: ["POWER","power"],
    timeMs: 11000,
    damage: 18,
  },
  {
    id: "e_fast",
    displayPrimary: "F-A-S-T",
    displaySecondary: "FAST",
    stage1: ["F A S T","FAST"],
    stage2: ["FAST","fast"],
    timeMs: 10000,
    damage: 15,
  },
  {
    id: "e_win",
    displayPrimary: "W-I-N",
    displaySecondary: "WIN",
    stage1: ["W I N","WIN"],
    stage2: ["WIN","win"],
    timeMs: 9500,
    damage: 14,
  },
  {
    id: "e_guard",
    displayPrimary: "G-U-A-R-D",
    displaySecondary: "GUARD",
    stage1: ["G U A R D","GUARD"],
    stage2: ["GUARD","guard"],
    timeMs: 11000,
    damage: 18,
  },
  {
    id: "e_smash",
    displayPrimary: "S-M-A-S-H",
    displaySecondary: "SMASH",
    stage1: ["S M A S H","SMASH"],
    stage2: ["SMASH","smash"],
    timeMs: 11000,
    damage: 18,
  },
  {
    id: "e_brave",
    displayPrimary: "B-R-A-V-E",
    displaySecondary: "BRAVE",
    stage1: ["B R A V E","BRAVE"],
    stage2: ["BRAVE","brave"],
    timeMs: 11500,
    damage: 20,
  },
  {
    id: "e_fight",
    displayPrimary: "F-I-G-H-T",
    displaySecondary: "FIGHT",
    stage1: ["F I G H T","FIGHT"],
    stage2: ["FIGHT","fight"],
    timeMs: 11000,
    damage: 18,
  },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createPromptDeck(mode: GameMode): VoicePrompt[] {
  return shuffle(mode === 'zhuyin' ? ZHUYIN_PROMPTS : ENGLISH_PROMPTS)
}

export function speechLang(mode: GameMode): string {
  return mode === 'zhuyin' ? 'zh-TW' : 'en-US'
}
