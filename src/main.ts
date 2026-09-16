import './style.css'
import './castle-skin.css'
import lottie, { type AnimationItem } from 'lottie-web'
import { type GameMode, type VoicePrompt, createPromptDeck, speechLang } from './prompts'
import { matchStage, nearMissHint } from './match'
import { VoiceRecognizer, isSpeechSupported, type SpeechStatus } from './speech'
import {
  MAX_HP, MONSTER_DMG, START_GOLD, JOBS, ITEMS, SKILL_FLAT, MAGE_TIME_BONUS_MS,
  type JobId, type ItemId, emptyInventory, getJob, getItem, winGold,
} from './rpg'

document.documentElement.style.setProperty('--castle-bg', `url(${import.meta.env.BASE_URL}art/bg-castle.png)`)
document.documentElement.style.setProperty('--battle-bg', `url(${import.meta.env.BASE_URL}art/bg-battle.png)`)

const STAGE_OK_MS = 450
const ART = `${import.meta.env.BASE_URL}art/`
const JOB_ART: Record<JobId, string> = {
  swordsman: 'hero-swordsman.png', paladin: 'hero-paladin.png', mage: 'hero-mage.png', rogue: 'hero-rogue.png',
}

type Screen = 'title' | 'select' | 'shop' | 'fight' | 'result'
const state = {
  screen: 'title' as Screen,
  mode: null as GameMode | null,
  jobId: null as JobId | null,
  gold: START_GOLD,
  inventory: emptyInventory(),
  heroHp: MAX_HP,
  monsterHp: MAX_HP,
  round: 0,
  deck: [] as VoicePrompt[],
  deckIndex: 0,
  prompt: null as VoicePrompt | null,
  stage: 1 as 1 | 2,
  phase: 'idle' as 'idle' | 'input' | 'resolving',
  timeLeft: 0,
  timeMax: 1,
  result: null as 'win' | 'lose' | null,
  lastWinGold: 0,
  status: '',
  heard: '',
  micStatus: (isSpeechSupported() ? 'need-permission' : 'unsupported') as SpeechStatus,
  micDetail: '',
  skillLeft: 0,
  blockCharges: 0,
  dodgeCharges: 0,
  firstStrikeDone: false,
}

const app = document.querySelector<HTMLDivElement>('#app')!
let rafId = 0
let lastTs = 0
let lottieAnim: AnimationItem | null = null
let lottieReady = false
let stage1Passed = false

const voice = new VoiceRecognizer({
  onResult: (transcript, isFinal) => {
    if (state.screen !== 'fight' || state.phase !== 'input' || !state.prompt) return
    state.heard = transcript
    updateVoiceHud()
    if (!isFinal && transcript.trim().length < 1) return
    void tryMatch(transcript, isFinal)
  },
  onStatus: (status, detail) => {
    state.micStatus = status
    state.micDetail = detail ?? ''
    updateVoiceHud()
  },
  onError: (err) => {
    if (err === 'network') { state.status = '語音服務網路錯誤'; updateVoiceHud() }
  },
})

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
function esc(s: string) {
  return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"')
}
const job = () => (state.jobId ? getJob(state.jobId) : null)
const img = (file: string, alt: string, cls = '') =>
  `<img class="portrait ${cls}" src="${ART}${file}" alt="${esc(alt)}" draggable="false" />`
