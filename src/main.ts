import './style.css'
import './castle-skin.css'
import './catch.css'

/** ART-STYLE-MOONCASTLE backdrop (public/art) */
document.documentElement.style.setProperty(
  '--castle-bg',
  `url(${import.meta.env.BASE_URL}art/bg-castle.jpg)`,
)
document.documentElement.style.setProperty(
  '--title-bg',
  `url(${import.meta.env.BASE_URL}art/bg-title-moon.jpg)`,
)
document.documentElement.style.setProperty(
  '--battle-bg',
  `url(${import.meta.env.BASE_URL}art/bg-battle.jpg)`,
)

import lottie, { type AnimationItem } from 'lottie-web'
import {
  type GameMode,
  type VoicePrompt,
  createPromptDeck,
  speechLang,
} from './prompts'
import { matchStage, nearMissHint } from './match'
import { VoiceRecognizer, isSpeechSupported, type SpeechStatus } from './speech'
import {
  MAX_HP,
  MONSTER_DMG,
  START_GOLD,
  JOBS,
  ITEMS,
  SKILL_FLAT,
  MAGE_TIME_BONUS_MS,
  type JobId,
  type ItemId,
  type Inventory,
  emptyInventory,
  getJob,
  getItem,
  winGold,
} from './rpg'

import {
  type SpiritDef,
  buildRealmQueue,
  catchThreshold,
  isCatchReady,
  pickSealPrompt,
  sealStartStage,
  realmWinGold,
  addToCodex,
  loadCodex,
  spiritPlaceholderHtml,
  rarityLabel,
  getSpirit,
  REALM_ENCOUNTERS_MIN,
  REALM_ENCOUNTERS_MAX,
} from './catch'
import {
  type PlayerGender,
  type BeastDef,
  STORY_SLIDES,
  createBeastFromPrompt,
  pickWildBeast,
  beastPlaceholderHtml,
  DEFAULT_BEAST_NAME,
} from './beast'

/** Brief green-lamp hold after a stage is accepted (ms) */
const STAGE_OK_HOLD_MS = 450
/** Long-press duration on title for QA simulate-win (ms) */
const QA_TITLE_HOLD_MS = 1200

function resetAdventureSession() {
  state.mode = null
  state.jobId = null
  state.gold = START_GOLD
  state.inventory = emptyInventory()
  state.heroHp = MAX_HP
  state.monsterHp = MAX_HP
  state.round = 1
  state.deck = []
  state.deckIndex = 0
  state.prompt = null
  state.stage = 1
  state.phase = 'idle'
  state.timeLeft = 0
  state.timeMax = 0
  state.result = null
  state.lastWinGold = 0
  state.skillLeft = 0
  state.blockCharges = 0
  state.dodgeCharges = 0
  state.firstStrikeDone = false
  state.heard = ''
  state.status = ''
  stage1Passed = false
  state.playMode = 'adventure'
  state.pendingPath = 'adventure'
  state.realmQueue = []
  state.realmIndex = 0
  state.spirit = null
  state.catchReady = false
  state.realmKnockout = false
  state.sealOpen = false
  state.sealPrompt = null
  state.sealHpSnapshot = 100
  state.lastCatchMsg = ''
  state.codexSelectedId = null
  state.wildBeast = null
  state.storyIndex = 0
  // keep playerGender / playerBeast across title returns (hub continuity)
}

function goTitleFresh() {
  voice.stop()
  stopLoop()
  window.onkeydown = null
  resetAdventureSession()
  state.screen = 'title'
  render()
}

function typeFallbackPlaceholder(): string {
  if (!state.prompt) return '打字 fallback：輸入答案後送出'
  const s1 = state.prompt.stage1[0] ?? state.prompt.displayPrimary
  const s2 = state.prompt.stage2[0] ?? state.prompt.displaySecondary
  if (state.stage === 1) {
    return `①可打：${s1}　（或直接打②「${s2}」一次出招）`
  }
  return `②可打：${s2}　→ 送出才扣怪血`
}

/** QA / no-mic: force win → gold → result (shop reachable). Voice core untouched. */
function simulateQaVictory() {
  if (!state.mode) state.mode = 'zhuyin'
  if (!state.jobId) state.jobId = 'swordsman'
  if (!state.playerBeast) {
    state.playerBeast = createBeastFromPrompt('測試')
  }
  if (!state.playerGender) state.playerGender = 'male'
  state.playMode = state.playMode === 'realm' ? 'realm' : 'wild'
  voice.stop()
  stopLoop()
  window.onkeydown = null
  const awardRound = Math.max(1, state.round || 1)
  state.monsterHp = 0
  if (state.heroHp <= 0) state.heroHp = 1
  state.phase = 'idle'
  state.result = 'win'
  state.lastWinGold = winGold(awardRound)
  state.gold += state.lastWinGold
  state.status = '【測試】模擬勝利'
  state.screen = 'result'
  render()
}

function wireTitleLongPressQa() {
  const el = document.querySelector<HTMLElement>('.game-title')
  if (!el) return
  let timer: number | null = null
  const clear = () => {
    if (timer != null) {
      window.clearTimeout(timer)
      timer = null
    }
  }
  const start = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    clear()
    timer = window.setTimeout(() => {
      timer = null
      simulateQaVictory()
    }, QA_TITLE_HOLD_MS)
  }
  el.addEventListener('pointerdown', start)
  el.addEventListener('pointerup', clear)
  el.addEventListener('pointerleave', clear)
  el.addEventListener('pointercancel', clear)
  el.setAttribute('title', '長按 1.2 秒＝品管模擬勝利（測試）')
}


type Screen = 'title' | 'gender' | 'story' | 'prompt-beast' | 'hub' | 'select' | 'shop' | 'fight' | 'result' | 'realm' | 'codex' | 'realm-result'
type StageNum = 1 | 2

interface State {
  screen: Screen
  mode: GameMode | null
  jobId: JobId | null
  gold: number
  inventory: Inventory
  heroHp: number
  monsterHp: number
  round: number
  deck: VoicePrompt[]
  deckIndex: number
  prompt: VoicePrompt | null
  stage: StageNum
  phase: 'idle' | 'input' | 'resolving'
  timeLeft: number
  timeMax: number
  result: 'win' | 'lose' | null
  lastWinGold: number
  status: string
  heard: string
  micStatus: SpeechStatus
  micDetail: string
  /** Remaining skill uses this battle */
  skillLeft: number
  /** Block charges (paladin skill + amulet) */
  blockCharges: number
  /** Rogue dodge next fail */
  dodgeCharges: number
  firstStrikeDone: boolean
  /** wild = BEAST-001 main; adventure = legacy RPG; realm = CATCH side */
  playMode: 'adventure' | 'realm' | 'wild'
  /** Where mode→job should lead (legacy / realm) */
  pendingPath: 'adventure' | 'realm'
  /** BRIEF-BEAST-001 */
  playerGender: PlayerGender | null
  playerBeast: BeastDef | null
  wildBeast: BeastDef | null
  storyIndex: number
  beastPromptDraft: string
  realmQueue: SpiritDef[]
  realmIndex: number
  spirit: SpiritDef | null
  /** HP at/below catch threshold; pause voice prompts */
  catchReady: boolean
  /** Knocked out (HP 0) in realm — choose seal or take gold */
  realmKnockout: boolean
  sealOpen: boolean
  sealPrompt: VoicePrompt | null
  /** Snapshot monster HP when opening seal (restore on fail) */
  sealHpSnapshot: number
  lastCatchMsg: string
  codexSelectedId: string | null
}

const state: State = {
  screen: 'title',
  mode: null,
  jobId: null,
  gold: START_GOLD,
  inventory: emptyInventory(),
  heroHp: MAX_HP,
  monsterHp: MAX_HP,
  round: 0,
  deck: [],
  deckIndex: 0,
  prompt: null,
  stage: 1,
  phase: 'idle',
  timeLeft: 0,
  timeMax: 1,
  result: null,
  lastWinGold: 0,
  status: '',
  heard: '',
  micStatus: isSpeechSupported() ? 'need-permission' : 'unsupported',
  micDetail: '',
  skillLeft: 0,
  blockCharges: 0,
  dodgeCharges: 0,
  firstStrikeDone: false,
  playMode: 'wild',
  pendingPath: 'adventure',
  playerGender: null,
  playerBeast: null,
  wildBeast: null,
  storyIndex: 0,
  beastPromptDraft: '',
  realmQueue: [],
  realmIndex: 0,
  spirit: null,
  catchReady: false,
  realmKnockout: false,
  sealOpen: false,
  sealPrompt: null,
  sealHpSnapshot: 100,
  lastCatchMsg: '',
  codexSelectedId: null,
}

const app = document.querySelector<HTMLDivElement>('#app')!
let rafId = 0
let lastTs = 0
let lottieAnim: AnimationItem | null = null
let lottieReady = false
let stage1Passed = false

const voice = new VoiceRecognizer({
  onResult: (transcript, isFinal) => {
    if (state.sealOpen) {
      if (state.phase !== 'input' || !state.prompt) return
      state.heard = transcript
      updateSealHud()
      pulseHeardLine(isFinal)
      if (!isFinal && transcript.trim().length < 1) return
      void trySealMatch(transcript, isFinal)
      return
    }
    if (state.screen !== 'fight' || state.phase !== 'input' || !state.prompt) return
    if (state.catchReady || state.realmKnockout) return
    state.heard = transcript
    updateVoiceHud()
    pulseHeardLine(isFinal)
    if (!isFinal && transcript.trim().length < 1) return
    void tryMatch(transcript, isFinal)
  },
  onStatus: (status, detail) => {
    state.micStatus = status
    state.micDetail = detail ?? ''
    updateVoiceHud()
  },
  onError: (err) => {
    if (err === 'network') {
      state.status = '語音服務網路錯誤'
      updateVoiceHud()
    }
  },
})

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** ART-STYLE-MOONCASTLE — public/art portraits (do not touch voice match) */
const ART_BASE = `${import.meta.env.BASE_URL}art/`
const JOB_ART: Record<JobId, string> = {
  swordsman: 'hero-swordsman.png',
  paladin: 'hero-paladin.png',
  mage: 'hero-mage.png',
  rogue: 'hero-rogue.png',
}
const MONSTER_ART = 'monster.png'

function portraitImg(file: string, alt: string, cls = ''): string {
  return `<img class="portrait ${cls}" src="${ART_BASE}${file}" alt="${escapeHtml(alt)}" draggable="false" loading="eager" />`
}

function job() {
  return state.jobId ? getJob(state.jobId) : null
}

function micBadgeHtml(): string {
  const map: Record<SpeechStatus, { cls: string; label: string }> = {
    unsupported: { cls: 'mic-bad', label: '不支援語音' },
    'need-permission': { cls: 'mic-warn', label: '需麥克風權限' },
    idle: { cls: 'mic-idle', label: '麥克風待命' },
    listening: { cls: 'mic-on', label: '聆聽中…' },
    error: { cls: 'mic-bad', label: '語音錯誤' },
  }
  const m = map[state.micStatus]
  return `<div class="mic-badge ${m.cls}" id="mic-badge"><span class="mic-dot"></span>${m.label}${
    state.micDetail && state.micStatus !== 'listening' ? ` · ${escapeHtml(state.micDetail)}` : ''
  }</div>`
}

function stageInstruction(): string {
  if (!state.prompt || !state.mode) return ''
  if (state.mode === 'zhuyin') {
    return state.stage === 1
      ? `階段 1／2：唸出注音「音」（例：${escapeHtml(state.prompt.displayPrimary)}／${escapeHtml(state.prompt.hint ?? '')}）— 音對即可`
      : `階段 2／2：說出漢字「${escapeHtml(state.prompt.displaySecondary)}」`
  }
  return state.stage === 1
    ? `Stage 1/2：逐字母拼出（${escapeHtml(state.prompt.displayPrimary)}）`
    : `Stage 2/2：說出單字「${escapeHtml(state.prompt.displaySecondary)}」`
}

function chibiHeroHtml(): string {
  if ((state.playMode === 'wild' || state.playMode === 'realm') && state.playerBeast) {
    const b = state.playerBeast
    return `
    <div class="fighter hero portrait-wrap beast-fighter" id="hero" style="--beast-a:${b.tint};--beast-b:${b.tint2}">
      ${beastPlaceholderHtml(b, 'fight-beast')}
    </div>`
  }
  const j = job()
  const cls = j?.cssClass ?? 'job-swordsman'
  const id = (j?.id ?? 'swordsman') as JobId
  const file = JOB_ART[id]
  return `
    <div class="fighter hero portrait-wrap ${cls}" id="hero">
      ${portraitImg(file, j?.name ?? '訓練師', 'portrait-fight')}
    </div>`
}

function chibiMonsterHtml(): string {
  if (state.playMode === 'wild' && state.wildBeast) {
    const b = state.wildBeast
    return `
    <div class="fighter monster portrait-wrap beast-fighter" id="monster" style="--beast-a:${b.tint};--beast-b:${b.tint2}">
      ${beastPlaceholderHtml(b, 'fight-beast')}
    </div>`
  }
  if (state.playMode === 'realm' && state.spirit) {
    const s = state.spirit
    return `
    <div class="fighter monster portrait-wrap spirit-fighter" id="monster" style="--spirit-tint:${s.tint}">
      <div class="spirit-slot-art fight-spirit-art" aria-label="${escapeHtml(s.name)} 占位">
        <div class="spirit-watermark"></div>
        <span class="spirit-ph-label">占位</span>
        <span class="spirit-ph-wait">${escapeHtml(s.name)}</span>
      </div>
    </div>`
  }
  return `
    <div class="fighter monster portrait-wrap" id="monster">
      ${portraitImg(MONSTER_ART, '野生智能獸', 'portrait-fight')}
    </div>`
}

function fighterLabelLeft(): string {
  if (state.playerBeast && (state.playMode === 'wild' || state.playMode === 'realm')) {
    return state.playerBeast.name
  }
  return job()?.name ?? '訓練師'
}

function fighterLabelRight(): string {
  if (state.playMode === 'wild' && state.wildBeast) return state.wildBeast.name
  if (state.playMode === 'realm' && state.spirit) {
    return `${state.spirit.name}（${rarityLabel(state.spirit.rarity)}）`
  }
  return '野生智能獸'
}

function render() {
  if (state.screen === 'title') {
    const speechOk = isSpeechSupported()
    app.innerHTML = `
      <div class="screen title-screen active">
        <div class="title-badge">AI 次世界</div>
        <h1 class="game-title">AI智能獸之讀音之戰</h1>
        <p class="subtitle">創造智能獸，用讀音在野外對戰！</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" id="btn-start" type="button">開始</button>
          ${
            state.playerBeast
              ? `<button class="btn btn-english" id="btn-hub" type="button">進入據點</button>`
              : ''
          }
        </div>
        <div class="howto">
          <strong>訓練師流程</strong><br/>
          · 選性別 → 故事 → 關鍵字喚獸 → 據點<br/>
          · <strong>野外遭遇</strong>：與野生智能獸讀音對戰（語音或打字）<br/>
          · <strong>注音</strong>：先唸「音」，再唸漢字 · <strong>英文</strong>：先拼字母，再說單字<br/>
          · 兩階段綠燈 → 攻擊；失敗／逾時 → 對方反擊<br/>
          · 語音不可用時可用<strong>打字 fallback</strong><br/>
          · <strong>品管／無麥</strong>：長按標題 1.2 秒 → 模擬勝利
          ${
            speechOk
              ? ''
              : '<br/><span class="warn-inline">此瀏覽器不支援 Web Speech API — 請用打字，或改 Chrome／Edge。</span>'
          }
        </div>
      </div>
    `
    app.querySelector('#btn-start')!.addEventListener('click', () => {
      state.screen = 'gender'
      state.storyIndex = 0
      render()
    })
    app.querySelector('#btn-hub')?.addEventListener('click', () => {
      state.screen = 'hub'
      render()
    })
    wireTitleLongPressQa()
    return
  }

  if (state.screen === 'gender') {
    app.innerHTML = `
      <div class="screen gender-screen active">
        <div class="panel-head">
          <div class="title-badge">AI智能獸之讀音之戰</div>
          <h2>選擇性別</h2>
          <p class="panel-sub">訓練師的外觀標記（僅存於本機狀態）</p>
        </div>
        <div class="mode-row gender-row">
          <button class="btn btn-zhuyin gender-btn" data-gender="male" type="button">男</button>
          <button class="btn btn-english gender-btn" data-gender="female" type="button">女</button>
        </div>
        <div class="mode-row">
          <button class="btn btn-ghost" data-back-title type="button">回標題</button>
        </div>
      </div>
    `
    app.querySelectorAll<HTMLButtonElement>('[data-gender]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.playerGender = btn.dataset.gender as PlayerGender
        state.storyIndex = 0
        state.screen = 'story'
        render()
      })
    })
    app.querySelector('[data-back-title]')!.addEventListener('click', () => {
      state.screen = 'title'
      render()
    })
    return
  }

  if (state.screen === 'story') {
    const i = Math.max(0, Math.min(state.storyIndex, STORY_SLIDES.length - 1))
    const slide = STORY_SLIDES[i]!
    const last = i >= STORY_SLIDES.length - 1
    app.innerHTML = `
      <div class="screen story-screen active" id="story-tap">
        <div class="panel-head">
          <div class="title-badge">AI智能獸之讀音之戰</div>
          <h2>序章 ${i + 1}/${STORY_SLIDES.length}</h2>
        </div>
        <div class="story-card story-anim">
          <div class="story-orb" aria-hidden="true"></div>
          <p class="story-text">${escapeHtml(slide)}</p>
        </div>
        <p class="panel-sub story-hint">點畫面或按鈕繼續</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" id="btn-story-next" type="button">${last ? '喚出智能獸' : '下一頁'}</button>
          <button class="btn btn-ghost" id="btn-story-skip" type="button">跳過</button>
        </div>
      </div>
    `
    const advance = () => {
      if (state.storyIndex >= STORY_SLIDES.length - 1) {
        state.screen = 'prompt-beast'
        state.beastPromptDraft = ''
        render()
        return
      }
      state.storyIndex += 1
      render()
    }
    app.querySelector('#btn-story-next')!.addEventListener('click', (e) => {
      e.stopPropagation()
      advance()
    })
    app.querySelector('#btn-story-skip')!.addEventListener('click', (e) => {
      e.stopPropagation()
      state.screen = 'prompt-beast'
      state.beastPromptDraft = ''
      render()
    })
    app.querySelector('#story-tap')!.addEventListener('click', (e) => {
      const t = e.target as HTMLElement
      if (t.closest('button')) return
      advance()
    })
    return
  }

  if (state.screen === 'prompt-beast') {
    const draft = state.beastPromptDraft
    const preview = createBeastFromPrompt(draft || DEFAULT_BEAST_NAME)
    app.innerHTML = `
      <div class="screen prompt-beast-screen active">
        <div class="panel-head">
          <div class="title-badge">AI智能獸之讀音之戰</div>
          <h2>喚出第一隻智能獸</h2>
          <p class="panel-sub">輸入關鍵字（無需 AI API · 占位立繪）</p>
        </div>
        <div class="beast-preview-wrap">
          ${beastPlaceholderHtml(preview, 'preview-beast')}
        </div>
        <label class="beast-prompt-label" for="beast-prompt">關鍵字</label>
        <textarea id="beast-prompt" class="beast-prompt-input" rows="3" placeholder="例：火焰 狐狸 迅捷" maxlength="80">${escapeHtml(draft)}</textarea>
        <p class="panel-sub">名稱預覽：<strong>${escapeHtml(preview.name)}</strong> · 關鍵字回顯：${escapeHtml(preview.keywords.join(' · '))}</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" id="btn-create-beast" type="button">確認創造</button>
          <button class="btn btn-ghost" data-back-story type="button">回故事</button>
        </div>
      </div>
    `
    const ta = app.querySelector<HTMLTextAreaElement>('#beast-prompt')!
    ta.addEventListener('input', () => {
      state.beastPromptDraft = ta.value
      const p = createBeastFromPrompt(ta.value || DEFAULT_BEAST_NAME)
      const wrap = app.querySelector('.beast-preview-wrap')
      if (wrap) wrap.innerHTML = beastPlaceholderHtml(p, 'preview-beast')
      const sub = app.querySelectorAll('.panel-sub')[1]
      if (sub) {
        sub.innerHTML = `名稱預覽：<strong>${escapeHtml(p.name)}</strong> · 關鍵字回顯：${escapeHtml(p.keywords.join(' · '))}`
      }
    })
    app.querySelector('#btn-create-beast')!.addEventListener('click', () => {
      state.beastPromptDraft = ta.value
      state.playerBeast = createBeastFromPrompt(ta.value.trim() || DEFAULT_BEAST_NAME)
      state.playMode = 'wild'
      state.screen = 'hub'
      render()
    })
    app.querySelector('[data-back-story]')!.addEventListener('click', () => {
      state.storyIndex = STORY_SLIDES.length - 1
      state.screen = 'story'
      render()
    })
    return
  }

  if (state.screen === 'hub') {
    const b = state.playerBeast
    const genderLabel =
      state.playerGender === 'female' ? '女訓練師' : state.playerGender === 'male' ? '男訓練師' : '訓練師'
    app.innerHTML = `
      <div class="screen hub-screen active">
        <div class="panel-head">
          <div class="title-badge">AI智能獸之讀音之戰</div>
          <h2>訓練師據點</h2>
          <p class="panel-sub">${escapeHtml(genderLabel)} · 🪙 ${state.gold}</p>
        </div>
        <div class="hub-beast">
          ${b ? beastPlaceholderHtml(b, 'hub-beast') : '<p class="panel-sub">尚未創造智能獸</p>'}
          ${b ? `<p class="panel-sub">${escapeHtml(b.blurb)}</p>` : ''}
        </div>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-mode="zhuyin" type="button">注音野外遭遇</button>
          <button class="btn btn-english" data-mode="english" type="button">英文野外遭遇</button>
        </div>
        <div class="mode-row title-extra-row">
          <button class="btn btn-ghost" id="btn-codex" type="button">圖鑑</button>
          <button class="btn btn-ghost" id="btn-realm" type="button">靈域（側路徑）</button>
          <button class="btn btn-ghost" id="btn-recreate" type="button">重新喚獸</button>
          <button class="btn btn-ghost" data-title type="button">回標題</button>
        </div>
        <p class="howto hub-howto">主路徑不開放四職業選角與商店。讀音核心：語音／打字兩階段出招。</p>
      </div>
    `
    app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!state.playerBeast) {
          state.screen = 'prompt-beast'
          render()
          return
        }
        state.mode = btn.dataset.mode as GameMode
        state.playMode = 'wild'
        void startWildFight()
      })
    })
    app.querySelector('#btn-codex')!.addEventListener('click', () => {
      state.screen = 'codex'
      state.codexSelectedId = null
      render()
    })
    app.querySelector('#btn-realm')!.addEventListener('click', () => {
      if (!state.mode) state.mode = 'zhuyin'
      if (!state.jobId) state.jobId = 'swordsman'
      if (!state.playerBeast) {
        state.playerBeast = createBeastFromPrompt(DEFAULT_BEAST_NAME)
      }
      beginRealmEntry()
    })
    app.querySelector('#btn-recreate')!.addEventListener('click', () => {
      state.beastPromptDraft = ''
      state.screen = 'prompt-beast'
      render()
    })
    app.querySelector('[data-title]')!.addEventListener('click', () => goTitleFresh())
    return
  }

  if (state.screen === 'select') {
    app.innerHTML = `
      <div class="screen select-screen active">
        <div class="panel-head">
          <div class="title-badge">AI智能獸之讀音之戰</div>
          <h2>選擇職業</h2>
          <p class="panel-sub">日系 Q 版 · 智能獸 · 模式：${state.mode === 'zhuyin' ? '注音' : '英文'}</p>
        </div>
        <div class="job-grid">
          ${JOBS.map(
            (j) => `
            <button type="button" class="job-card ${j.cssClass}" data-job="${j.id}">
              <div class="job-portrait ${j.cssClass}">
                ${portraitImg(JOB_ART[j.id], j.name, 'portrait-select')}
              </div>
              <div class="job-name">${escapeHtml(j.name)}</div>
              <div class="job-blurb">${escapeHtml(j.blurb)}</div>
              <div class="job-skill"><strong>${escapeHtml(j.skillName)}</strong> — ${escapeHtml(j.skillBlurb)}</div>
            </button>`,
          ).join('')}
        </div>
        <div class="mode-row">
          <button class="btn btn-ghost" data-back-title type="button">回標題</button>
        </div>
      </div>
    `
    app.querySelectorAll<HTMLButtonElement>('[data-job]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.jobId = btn.dataset.job as JobId
        if (state.pendingPath === 'realm') {
          beginRealmEntry()
          return
        }
        state.screen = 'shop'
        render()
      })
    })
    app.querySelector('[data-back-title]')!.addEventListener('click', () => {
      state.screen = 'title'
      render()
    })
    return
  }

  if (state.screen === 'shop') {
    const j = job()!
    app.innerHTML = `
      <div class="screen shop-screen active">
        <div class="panel-head">
          <div class="title-badge">AI智能獸之讀音之戰</div>
          <h2>冒險商店</h2>
          <p class="panel-sub">
            <span class="gold-chip">🪙 ${state.gold}</span>
            · ${escapeHtml(j.name)} ${j.weaponCue}
          </p>
        </div>
        <div class="shop-grid">
          ${ITEMS.map((it) => {
            const owned = state.inventory[it.id]
            const can = state.gold >= it.price
            return `
              <div class="shop-card">
                <div class="shop-name">${escapeHtml(it.name)}</div>
                <div class="shop-blurb">${escapeHtml(it.blurb)}</div>
                <div class="shop-meta">價 ${it.price} · 持有 ${owned}</div>
                <button type="button" class="btn btn-buy" data-buy="${it.id}" ${can ? '' : 'disabled'}>購買</button>
              </div>`
          }).join('')}
        </div>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-to-fight type="button">出征！</button>
          <button class="btn btn-english" id="btn-realm" type="button">靈域探索</button>
          <button class="btn btn-ghost" data-skip-shop type="button">跳過商店</button>
          <button class="btn btn-ghost" data-back-select type="button">重選職業</button>
        </div>
      </div>
    `
    app.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.buy as ItemId
        const def = getItem(id)
        if (state.gold < def.price) return
        state.gold -= def.price
        state.inventory[id] += 1
        render()
      })
    })
    const goFight = () => {
      void startFight()
    }
    app.querySelector('[data-to-fight]')!.addEventListener('click', goFight)
    app.querySelector('[data-skip-shop]')!.addEventListener('click', goFight)
    app.querySelector('#btn-realm')!.addEventListener('click', () => beginRealmEntry())
    app.querySelector('[data-back-select]')!.addEventListener('click', () => {
      state.screen = 'select'
      render()
    })
    return
  }

  if (state.screen === 'result') {
    const win = state.result === 'win'
    voice.stop()
    const j = job()
    const isWild = state.playMode === 'wild' || !!state.playerBeast
    const foe = state.wildBeast?.name ?? '野生智能獸'
    const self = state.playerBeast?.name ?? (j ? j.name : '訓練師')
    app.innerHTML = `
      <div class="screen result-screen active ${win ? 'win' : 'lose'}">
        <div class="title-badge">AI智能獸之讀音之戰</div>
        <h2>${win ? '勝利！' : '敗北…'}</h2>
        <p class="result-msg">
          ${
            win
              ? `${escapeHtml(foe)}倒下了！獲得 🪙 <strong>${state.lastWinGold}</strong> 金幣（現有 ${state.gold}）。`
              : `${escapeHtml(self)}力竭倒下。回據點休整再試吧！`
          }
        </p>
        <p class="result-msg">
          ${escapeHtml(self)} · 回合 ${state.round} ·
          ${state.mode === 'zhuyin' ? '注音' : '英文'}
        </p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-again type="button">再戰一場</button>
          <button class="btn btn-english" data-to-hub type="button">回據點</button>
          <button class="btn btn-ghost" id="btn-codex" type="button">圖鑑</button>
          <button class="btn btn-ghost" id="btn-realm" type="button">靈域（側）</button>
          <button class="btn btn-ghost" data-title type="button">回標題</button>
        </div>
      </div>
    `
    app.querySelector('[data-again]')?.addEventListener('click', () => {
      if (isWild && state.playerBeast) {
        void startWildFight()
        return
      }
      void startFight()
    })
    app.querySelector('[data-to-hub]')?.addEventListener('click', () => {
      state.playMode = 'wild'
      state.screen = 'hub'
      render()
    })
    app.querySelector('#btn-realm')!.addEventListener('click', () => {
      if (!state.mode) state.mode = 'zhuyin'
      if (!state.jobId) state.jobId = 'swordsman'
      beginRealmEntry()
    })
    app.querySelector('#btn-codex')!.addEventListener('click', () => {
      state.screen = 'codex'
      state.codexSelectedId = null
      render()
    })
    app.querySelector('[data-title]')!.addEventListener('click', () => {
      goTitleFresh()
    })
    return
  }

  if (state.screen === 'realm') {
    renderRealmScreen()
    return
  }
  if (state.screen === 'codex') {
    renderCodexScreen()
    return
  }
  if (state.screen === 'realm-result') {
    renderRealmResultScreen()
    return
  }

  // Fight
  const p = state.prompt
  const timerPct = state.timeMax > 0 ? clamp((state.timeLeft / state.timeMax) * 100, 0, 100) : 0
  const stage1Cls = stage1Passed || state.stage === 2 ? 'done' : state.stage === 1 ? 'current' : ''
  const stage2Cls = state.stage === 2 ? 'current' : stage1Passed ? '' : 'locked'
  const j = job()
  const leftName = fighterLabelLeft()
  const monName = fighterLabelRight()
  const isWild = state.playMode === 'wild'
  const sealSrc = `${import.meta.env.BASE_URL}art/catch/seal.png`
  // Sync flag from live HP before paint (covers missed maybeEnter calls)
  if (inRealmFight() && state.spirit && !state.sealOpen) {
    if (state.monsterHp <= 0) {
      state.realmKnockout = true
      state.catchReady = true
      state.playMode = 'realm'
    } else if (isCatchReady(state.monsterHp, state.spirit.rarity)) {
      state.catchReady = true
      state.playMode = 'realm'
      state.phase = 'idle'
    }
  }
  const showCatchUi = shouldShowCatchUi()

  app.innerHTML = `
    <div class="screen fight-screen active ${state.playMode === 'realm' ? 'realm-fight' : ''}${showCatchUi ? ' is-catch-ready' : ''}">
      <div class="fight-brand title-badge">AI智能獸之讀音之戰</div>
      <div class="hud">
        <div class="hp-block">
          <div class="hp-label">${escapeHtml(leftName)} ${Math.ceil(state.heroHp)}</div>
          <div class="hp-bar"><div class="hp-fill hero" style="width:${(state.heroHp / MAX_HP) * 100}%"></div></div>
        </div>
        <div class="round-chip">${state.playMode === 'realm' ? `靈域 ${state.realmIndex + 1}/${Math.max(1, state.realmQueue.length)} · ` : isWild ? '野外 · ' : ''}第 ${state.round} 回合 · 🪙${state.gold}</div>
        <div class="hp-block monster">
          <div class="hp-label">${escapeHtml(monName)} ${Math.ceil(state.monsterHp)} ${
          state.playMode === 'realm' && state.spirit
            ? `<span class="threshold-chip ${showCatchUi ? 'ready' : ''}">門檻≤${catchThreshold(state.spirit.rarity)}</span>`
            : ''
        }</div>
          <div class="hp-bar"><div class="hp-fill monster" style="width:${(state.monsterHp / MAX_HP) * 100}%"></div></div>
        </div>
      </div>

      ${
        inRealmFight() && showCatchUi
          ? `<div id="catch-ready" class="catch-ready-bar ${state.spirit?.rarity === 'rare' ? 'rare-ready' : ''}" data-catch-ready="1">
              <div class="catch-ready-copy">
                <strong>可施印</strong>
                <span>· ${state.spirit ? rarityLabel(state.spirit.rarity) : ''} · 門檻≤${state.spirit ? catchThreshold(state.spirit.rarity) : '?'} · HP ${Math.ceil(state.monsterHp)}${state.realmKnockout ? ' · 已擊倒' : ''}</span>
              </div>
              <div class="catch-ready-actions">
                <button type="button" class="btn btn-seal" id="btn-seal">
                  <img id="catch-seal" src="${sealSrc}" alt="印符" width="28" height="28" onerror="this.onerror=null;this.src='${import.meta.env.BASE_URL}art/catch/seal.svg'" />
                  ${state.realmKnockout ? '施印嘗試' : '施印'}
                </button>
                ${
                  state.status.includes('再打') || state.status.includes('施印失敗') || state.status.includes('施印逾時') || state.status.includes('取消施印')
                    ? `<button type="button" class="btn btn-zhuyin" id="btn-seal-retry">再打</button>`
                    : ''
                }
                ${
                  state.realmKnockout
                    ? `<button type="button" class="btn btn-ghost" id="btn-knockout-gold">收下金幣離開</button>`
                    : `<button type="button" class="btn btn-ghost" id="btn-flee-catch">逃</button>
                <button type="button" class="btn btn-ghost" id="catch-qa-snap">【測】壓門檻</button>`
                }
              </div>
              <p class="catch-ready-hint">出招已暫停 — 按「施印」開短題（語音或打字）</p>
            </div>`
          : inRealmFight()
            ? `<div class="mode-row catch-flee-row" style="margin:4px 0">
                <button type="button" class="btn btn-ghost" id="btn-flee-catch">逃離靈域</button>
                <button type="button" class="btn btn-ghost" id="catch-qa-snap" title="測試：長按或點擊將怪血壓至門檻">【測】壓門檻</button>
              </div>`
            : ''
      }

      <div class="buff-row" id="buff-row">
        ${state.blockCharges > 0 ? `<span class="buff-chip">護盾×${state.blockCharges}</span>` : ''}
        ${state.dodgeCharges > 0 ? `<span class="buff-chip dodge">影遁×${state.dodgeCharges}</span>` : ''}
        ${!isWild && j && j.damageMult > 1 ? `<span class="buff-chip">傷×${j.damageMult}</span>` : ''}
      </div>

      <div class="stage" id="stage">
        <img class="stage-bg" src="${import.meta.env.BASE_URL}art/bg-battle.jpg" alt="" aria-hidden="true" />
        <div class="stage-ground"></div>
        ${chibiHeroHtml()}
        ${chibiMonsterHtml()}
        <div class="fx-slash" id="fx-slash"><div class="lottie-box" id="lottie-box"></div></div>
      </div>

      ${
        isWild
          ? `<div class="action-bar action-bar-wild" id="action-bar"><span class="buff-chip">智能獸讀音對戰</span></div>`
          : `<div class="action-bar" id="action-bar">
        <button type="button" class="act-btn skill" data-skill ${state.skillLeft <= 0 ? 'disabled' : ''}>
          ${escapeHtml(j?.skillName ?? '技能')} <span class="act-count">${state.skillLeft}</span>
        </button>
        ${ITEMS.map((it) => {
          const n = state.inventory[it.id]
          return `<button type="button" class="act-btn item" data-item="${it.id}" ${n <= 0 ? 'disabled' : ''}>
            ${escapeHtml(it.name)} <span class="act-count">${n}</span>
          </button>`
        }).join('')}
      </div>`
      }


      ${
        showCatchUi
          ? `<div class="prompt-panel voice-panel voice-masked catch-paused" aria-hidden="true">
              <div class="status-toast" id="status">${escapeHtml(state.status)}</div>
              <div class="voice-actions">
                <button type="button" class="btn btn-ghost" id="btn-quit">回標題</button>
              </div>
            </div>`
          : `<div class="prompt-panel voice-panel">
        <div class="timer-bar"><div class="timer-fill" id="timer-fill" style="transform:scaleX(${timerPct / 100})"></div></div>
        ${micBadgeHtml()}
        <div class="stage-pills">
          <span class="stage-pill ${stage1Cls}">Stage 1</span>
          <span class="stage-arrow">→</span>
          <span class="stage-pill ${stage2Cls}">Stage 2</span>
        </div>
        <div class="prompt-row voice-prompt" id="prompt-row">
          <span class="prompt-primary" id="prompt-primary">${p ? escapeHtml(p.displayPrimary) : ''}</span>
          <span class="prompt-sep">·</span>
          <span class="prompt-secondary" id="prompt-secondary">${p ? escapeHtml(p.displaySecondary) : ''}</span>
        </div>
        <div class="prompt-hint" id="stage-hint">${stageInstruction()}</div>
        <div class="heard-line" id="heard-line">聽到：${escapeHtml(state.heard) || '（尚未辨識）'}</div>
        <div class="status-toast" id="status">${escapeHtml(state.status)}</div>
        <form class="type-fallback" id="type-form">
          <input type="text" id="type-input" class="type-input" placeholder="${escapeHtml(typeFallbackPlaceholder())}" autocomplete="off" enterkeyhint="done" />
          <button type="submit" class="btn btn-ghost" id="btn-type">送出</button>
        </form>
        <div class="voice-actions">
          <button type="button" class="btn btn-mic" id="btn-mic" ${
            state.micStatus === 'unsupported' ? 'disabled' : ''
          }>${state.micStatus === 'listening' ? '🎤 聆聽中' : '🎤 啟用／重啟麥克風'}</button>
          <button type="button" class="btn btn-ghost" id="btn-quit">回標題</button>
        </div>
      </div>`
      }
    </div>
  `

  mountLottie()
  wireFightControls()
  wireRealmFightExtras()
  wireRealmQaSnapShortcut()
  if (state.sealOpen) mountSealModal()
}

function wireFightControls() {
  document.querySelector('#btn-mic')?.addEventListener('click', () => {
    void (async () => {
      const ok = await voice.ensurePermission()
      if (!ok) return
      if (state.mode) voice.setLang(speechLang(state.mode))
      voice.stop()
      voice.start()
      state.status = '麥克風已啟動，請依階段唸出'
      updateVoiceHud()
    })()
  })

  document.querySelector('#btn-quit')?.addEventListener('click', () => {
    if (state.playMode === 'wild' && state.playerBeast) {
      voice.stop()
      stopLoop()
      window.onkeydown = null
      state.screen = 'hub'
      state.phase = 'idle'
      render()
      return
    }
    goTitleFresh()
  })

  document.querySelector('#type-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const input = document.querySelector<HTMLInputElement>('#type-input')
    if (!input) return
    const text = input.value.trim()
    if (!text) return
    state.heard = text
    input.value = ''
    updateVoiceHud()
    tryMatch(text)
  })

  document.querySelector('[data-skill]')?.addEventListener('click', () => {
    void useSkill()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void useItem(btn.dataset.item as ItemId)
    })
  })

  window.onkeydown = (e) => {
    if (e.key === 'Escape' && state.screen === 'fight') {
      goTitleFresh()
    }
  }
}

function refreshActionBar() {
  if (state.screen !== 'fight') return
  const skillBtn = document.querySelector<HTMLButtonElement>('[data-skill]')
  const j = job()
  if (skillBtn && j) {
    skillBtn.disabled = state.skillLeft <= 0 || state.phase !== 'input'
    skillBtn.innerHTML = `${escapeHtml(j.skillName)} <span class="act-count">${state.skillLeft}</span>`
  }
  ITEMS.forEach((it) => {
    const btn = document.querySelector<HTMLButtonElement>(`[data-item="${it.id}"]`)
    if (!btn) return
    const n = state.inventory[it.id]
    btn.disabled = n <= 0 || state.phase !== 'input'
    btn.innerHTML = `${escapeHtml(it.name)} <span class="act-count">${n}</span>`
  })
  const buff = document.querySelector('#buff-row')
  if (buff && j) {
    buff.innerHTML = `
      ${state.blockCharges > 0 ? `<span class="buff-chip">護盾×${state.blockCharges}</span>` : ''}
      ${state.dodgeCharges > 0 ? `<span class="buff-chip dodge">影遁×${state.dodgeCharges}</span>` : ''}
      ${j.damageMult > 1 ? `<span class="buff-chip">傷×${j.damageMult}</span>` : ''}
    `
  }
}

function updateVoiceHud() {
  if (state.sealOpen) {
    updateSealHud()
    return
  }
  if (state.screen !== 'fight') return
  const badge = document.querySelector('#mic-badge')
  if (badge) {
    const wrap = document.createElement('div')
    wrap.innerHTML = micBadgeHtml()
    badge.replaceWith(wrap.firstElementChild!)
  }
  const hint = document.querySelector('#stage-hint')
  if (hint) hint.innerHTML = stageInstruction()
  const heard = document.querySelector('#heard-line')
  if (heard) heard.textContent = `聽到：${state.heard || '（尚未辨識）'}`
  const status = document.querySelector('#status')
  if (status) status.textContent = state.status
  const btn = document.querySelector('#btn-mic')
  if (btn) btn.textContent = state.micStatus === 'listening' ? '🎤 聆聽中' : '🎤 啟用／重啟麥克風'
  const typeIn = document.querySelector<HTMLInputElement>('#type-input')
  if (typeIn) typeIn.placeholder = typeFallbackPlaceholder()

  const pills = document.querySelectorAll('.stage-pill')
  if (pills.length >= 2) {
    pills[0]!.className = `stage-pill ${stage1Passed || state.stage === 2 ? 'done' : state.stage === 1 ? 'current' : ''}`
    pills[1]!.className = `stage-pill ${state.stage === 2 ? 'current' : stage1Passed ? '' : 'locked'}`
  }
  refreshActionBar()
}

function lightPromptTarget(which: 'primary' | 'secondary') {
  const el = document.querySelector(
    which === 'primary' ? '#prompt-primary' : '#prompt-secondary',
  )
  el?.classList.add('lit-ok', 'pass')
}

function pulseHeardLine(isFinal: boolean) {
  const el = document.querySelector('#heard-line')
  if (!el) return
  el.classList.remove('heard-pulse', 'heard-final')
  // reflow so animation can replay
  void (el as HTMLElement).offsetWidth
  el.classList.add('heard-pulse')
  if (isFinal) el.classList.add('heard-final')
}

async function tryMatch(transcript: string, isFinal = true) {
  if (state.sealOpen) return
  if (state.catchReady || state.realmKnockout) return
  if (state.phase !== 'input' || !state.prompt || !state.mode) return
  const expected = state.stage === 1 ? state.prompt.stage1 : state.prompt.stage2
  const ok = matchStage(state.mode, state.stage, transcript, expected)
  if (!ok) {
    if (isFinal && transcript.trim()) {
      const target =
        state.stage === 1 ? state.prompt.displayPrimary : state.prompt.displaySecondary
      state.status = nearMissHint(
        state.mode,
        state.stage,
        transcript,
        expected,
        target,
      )
      updateVoiceHud()
    }
    return
  }

  // Typing UX: if still on stage① but input already matches stage②, skip straight to damage
  if (
    state.stage === 1 &&
    matchStage(state.mode, 2, transcript, state.prompt.stage2)
  ) {
    stage1Passed = true
    state.stage = 2
    state.phase = 'resolving'
    state.status = '①② 一次過！出招'
    lightPromptTarget('primary')
    lightPromptTarget('secondary')
    updateVoiceHud()
    await wait(220)
    if (state.screen !== 'fight' || !state.prompt) return
    void resolveSuccess()
    return
  }

  state.phase = 'resolving'

  if (state.stage === 1) {
    stage1Passed = true
    state.heard = ''
    state.status = '① 綠燈！這段音對了 → 再打／唸②'
    lightPromptTarget('primary')
    updateVoiceHud()
    await wait(STAGE_OK_HOLD_MS)
    if (state.screen !== 'fight' || !state.prompt) return
    state.stage = 2
    state.status = '① 已過 → 請送出②答案才會扣怪血'
    state.phase = 'input'
    updateVoiceHud()
    return
  }

  state.status = '② 綠燈！出招扣血'
  lightPromptTarget('secondary')
  updateVoiceHud()
  await wait(STAGE_OK_HOLD_MS)
  if (state.screen !== 'fight' || !state.prompt) return
  void resolveSuccess()
}

async function useSkill() {
  if (state.phase !== 'input' || state.skillLeft <= 0 || !state.jobId) return
  const id = state.jobId
  if (id === 'swordsman') {
    state.skillLeft -= 1
    const dmg = SKILL_FLAT.swordsman
    state.phase = 'resolving'
    state.status = `破甲斬！-${dmg}`
    state.monsterHp = clamp(state.monsterHp - dmg, 0, MAX_HP)
    playHeroAttackFx(dmg)
    updateHpBars()
    refreshActionBar()
    await wait(280)
    if (state.monsterHp <= 0) {
      if (inRealmFight()) onRealmMonsterDown()
      else endFight()
      return
    }
    if (inRealmFight() && syncCatchReadyFromHp()) return
    state.phase = 'input'
    updateVoiceHud()
    return
  }
  if (id === 'paladin') {
    state.skillLeft -= 1
    state.blockCharges += 1
    state.status = '聖盾展開！下次傷害將被阻擋'
    refreshActionBar()
    updateVoiceHud()
    return
  }
  if (id === 'mage') {
    state.skillLeft -= 1
    state.timeLeft += MAGE_TIME_BONUS_MS
    state.timeMax += MAGE_TIME_BONUS_MS
    state.status = `時光延展！+${MAGE_TIME_BONUS_MS / 1000} 秒`
    const fill = document.querySelector<HTMLElement>('#timer-fill')
    if (fill && state.timeMax > 0) {
      fill.style.transform = `scaleX(${clamp(state.timeLeft / state.timeMax, 0, 1)})`
    }
    refreshActionBar()
    updateVoiceHud()
    return
  }
  if (id === 'rogue') {
    state.skillLeft -= 1
    state.dodgeCharges += 1
    state.status = '影遁就緒！下次失敗將閃過'
    refreshActionBar()
    updateVoiceHud()
  }
}

async function useItem(itemId: ItemId) {
  if (state.phase !== 'input') return
  if (state.inventory[itemId] <= 0) return
  const def = getItem(itemId)

  if (def.damage) {
    state.inventory[itemId] -= 1
    state.phase = 'resolving'
    state.status = `${def.name}！-${def.damage}`
    state.monsterHp = clamp(state.monsterHp - def.damage, 0, MAX_HP)
    playHeroAttackFx(def.damage)
    updateHpBars()
    refreshActionBar()
    await wait(280)
    if (state.monsterHp <= 0) {
      if (inRealmFight()) onRealmMonsterDown()
      else endFight()
      return
    }
    if (inRealmFight() && syncCatchReadyFromHp()) return
    state.phase = 'input'
    updateVoiceHud()
    return
  }

  state.inventory[itemId] -= 1
  if (def.timeBonusMs) {
    state.timeLeft += def.timeBonusMs
    state.timeMax += def.timeBonusMs
    state.status = `沙漏！+${def.timeBonusMs / 1000} 秒`
    const fill = document.querySelector<HTMLElement>('#timer-fill')
    if (fill && state.timeMax > 0) {
      fill.style.transform = `scaleX(${clamp(state.timeLeft / state.timeMax, 0, 1)})`
    }
  }
  if (def.block) {
    state.blockCharges += 1
    state.status = '護符生效！下次傷害將被阻擋'
  }
  if (def.heal) {
    state.heroHp = clamp(state.heroHp + def.heal, 0, MAX_HP)
    state.status = `回復藥！+${def.heal} HP`
    updateHpBars()
  }
  refreshActionBar()
  updateVoiceHud()
}

function mountLottie() {
  const box = document.querySelector<HTMLDivElement>('#lottie-box')
  if (!box) return
  if (lottieAnim) {
    try {
      lottieAnim.destroy()
    } catch {
      /* ignore */
    }
    lottieAnim = null
  }
  lottieReady = false
  const base = import.meta.env.BASE_URL || '/'
  lottieAnim = lottie.loadAnimation({
    container: box,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: `${base}lottie/hero_sword_attack.json`,
  })
  lottieAnim.addEventListener('DOMLoaded', () => {
    lottieReady = true
  })
}

function playHeroAttackFx(dmgOverride?: number) {
  const hero = document.querySelector('#hero')
  const mon = document.querySelector('#monster')
  const fx = document.querySelector('#fx-slash')
  hero?.classList.add('attack-lunge')
  mon?.classList.add('hit')
  fx?.classList.add('active')
  if (lottieAnim && lottieReady) {
    lottieAnim.goToAndPlay(0, true)
  }
  const dmg =
    dmgOverride ??
    Math.round((state.prompt?.damage ?? 0) * (job()?.damageMult ?? 1))
  spawnFloat('mon-dmg', `-${dmg}`)
  setTimeout(() => {
    hero?.classList.remove('attack-lunge')
    mon?.classList.remove('hit')
    fx?.classList.remove('active')
  }, 450)
}

function playMonsterAttackFx(dealt: number) {
  const hero = document.querySelector('#hero')
  const mon = document.querySelector('#monster')
  mon?.classList.add('attack-lunge')
  hero?.classList.add('hit')
  spawnFloat('hero-dmg', dealt > 0 ? `-${dealt}` : 'MISS')
  setTimeout(() => {
    mon?.classList.remove('attack-lunge')
    hero?.classList.remove('hit')
  }, 450)
}

function spawnFloat(cls: string, text: string) {
  const stageEl = document.querySelector('#stage')
  if (!stageEl) return
  const el = document.createElement('div')
  el.className = `damage-float ${cls}`
  el.textContent = text
  stageEl.appendChild(el)
  setTimeout(() => el.remove(), 800)
}

async function startWildFight() {
  if (!state.mode || !state.playerBeast) return
  const ok = await voice.ensurePermission()
  state.playMode = 'wild'
  state.wildBeast = pickWildBeast(state.playerBeast.id)
  state.spirit = null
  state.catchReady = false
  state.realmKnockout = false
  state.sealOpen = false
  state.screen = 'fight'
  state.heroHp = MAX_HP
  state.monsterHp = MAX_HP
  state.round = 0
  state.deck = createPromptDeck(state.mode)
  state.deckIndex = 0
  state.result = null
  state.lastWinGold = 0
  state.heard = ''
  state.skillLeft = 0
  state.blockCharges = 0
  state.dodgeCharges = 0
  state.firstStrikeDone = true
  state.status = ok
    ? `${state.playerBeast.name} vs ${state.wildBeast.name}！`
    : '請點「啟用麥克風」或使用打字 fallback'
  voice.setLang(speechLang(state.mode))
  render()
  nextRound()
  startLoop()
  if (ok) voice.start()
}

async function startFight() {
  if (!state.mode || !state.jobId) return
  const ok = await voice.ensurePermission()
  const j = getJob(state.jobId)
  state.screen = 'fight'
  state.heroHp = MAX_HP
  state.monsterHp = MAX_HP
  state.round = 0
  state.deck = createPromptDeck(state.mode)
  state.deckIndex = 0
  state.result = null
  state.lastWinGold = 0
  state.heard = ''
  state.skillLeft = j.skillMax
  state.blockCharges = 0
  state.dodgeCharges = 0
  state.firstStrikeDone = false
  state.status = ok
    ? `${j.name}出征！`
    : '請點「啟用麥克風」或使用打字 fallback'
  voice.setLang(speechLang(state.mode))
  render()

  // Rogue first-strike
  if (j.firstStrike > 0 && !state.firstStrikeDone) {
    state.firstStrikeDone = true
    state.monsterHp = clamp(state.monsterHp - j.firstStrike, 0, MAX_HP)
    state.status = `盜賊先制！-${j.firstStrike}`
    playHeroAttackFx(j.firstStrike)
    updateHpBars()
    await wait(500)
    if (state.monsterHp <= 0) {
      endFight()
      return
    }
  }

  state.playMode = 'adventure'
  nextRound()
  startLoop()
  if (ok) {
    voice.start()
  }
}

function nextRound() {
  if (state.sealOpen || state.catchReady) return
  if (state.heroHp <= 0 || state.monsterHp <= 0) {
    if (state.playMode === 'realm') {
      if (state.monsterHp <= 0) onRealmMonsterDown()
      else endFight()
      return
    }
    endFight()
    return
  }
  if (state.deckIndex >= state.deck.length) {
    state.deck = createPromptDeck(state.mode!)
    state.deckIndex = 0
  }
  state.round += 1
  state.prompt = state.deck[state.deckIndex++]!
  state.stage = 1
  stage1Passed = false
  state.heard = ''
  state.phase = 'input'
  state.timeMax = state.prompt.timeMs
  state.timeLeft = state.prompt.timeMs
  state.status = '依階段唸出招式！'
  render()
  if (state.micStatus !== 'listening' && state.micStatus !== 'unsupported') {
    voice.setLang(speechLang(state.mode!))
    voice.start()
  }
}

async function resolveSuccess() {
  if (!state.prompt) return
  if (state.phase !== 'input' && state.phase !== 'resolving') return
  if (state.sealOpen) return
  state.phase = 'resolving'
  const mult = job()?.damageMult ?? 1
  const dmg = Math.round(state.prompt.damage * mult)
  state.status = `雙階段通過！命中 -${dmg}！`
  updateVoiceHud()
  state.monsterHp = clamp(state.monsterHp - dmg, 0, MAX_HP)
  playHeroAttackFx(dmg)
  updateHpBars()
  // BRIEF-CATCH-001: enter catch-ready synchronously when HP crosses threshold
  if (inRealmFight()) {
    if (syncCatchReadyFromHp()) return
  }
  await wait(550)
  if (inRealmFight()) {
    if (syncCatchReadyFromHp()) return
    nextRound()
    return
  }
  if (state.monsterHp <= 0) {
    endFight()
    return
  }
  nextRound()
}

async function resolveFail(reason: string) {
  if (state.phase !== 'input') return
  state.phase = 'resolving'

  if (state.dodgeCharges > 0) {
    state.dodgeCharges -= 1
    state.status = `${reason} → 影遁閃過！`
    updateVoiceHud()
    playMonsterAttackFx(0)
    await wait(550)
    nextRound()
    return
  }

  let dealt = MONSTER_DMG
  if (state.blockCharges > 0) {
    state.blockCharges -= 1
    dealt = 0
    state.status = `${reason} → 護盾擋下！`
  } else {
    state.status = reason
  }
  updateVoiceHud()
  state.heroHp = clamp(state.heroHp - dealt, 0, MAX_HP)
  playMonsterAttackFx(dealt)
  updateHpBars()
  await wait(550)
  if (state.heroHp <= 0) {
    endFight()
    return
  }
  nextRound()
}

function updateHpBars() {
  const heroFill = document.querySelector<HTMLElement>('.hp-fill.hero')
  const monFill = document.querySelector<HTMLElement>('.hp-fill.monster')
  const heroLabel = document.querySelector('.hp-block:not(.monster) .hp-label')
  const monLabel = document.querySelector('.hp-block.monster .hp-label')
  if (heroFill) heroFill.style.width = `${(state.heroHp / MAX_HP) * 100}%`
  if (monFill) monFill.style.width = `${(state.monsterHp / MAX_HP) * 100}%`
  if (heroLabel) heroLabel.textContent = `${fighterLabelLeft()} ${Math.ceil(state.heroHp)}`
  if (monLabel) {
    if (state.playMode === 'realm' && state.spirit) {
      const monName = state.spirit.name
      const ready = state.catchReady || state.realmKnockout || isCatchReady(state.monsterHp, state.spirit.rarity)
      monLabel.innerHTML = `${escapeHtml(monName)} ${Math.ceil(state.monsterHp)} <span class="threshold-chip ${ready ? 'ready' : ''}">門檻≤${catchThreshold(state.spirit.rarity)}</span>`
    } else {
      monLabel.textContent = `${fighterLabelRight()} ${Math.ceil(state.monsterHp)}`
    }
  }
  const status = document.querySelector('#status')
  if (status) status.textContent = state.status
}

function endFight() {
  stopLoop()
  voice.stop()
  state.sealOpen = false
  document.querySelector('#seal-modal')?.remove()
  state.phase = 'idle'
  if (state.playMode === 'realm' && state.monsterHp <= 0) {
    onRealmMonsterDown()
    return
  }
  if (state.playMode === 'realm' && state.heroHp <= 0) {
    state.lastCatchMsg = '訓練師力竭 — 未收入印靈。'
    state.screen = 'realm-result'
    window.onkeydown = null
    render()
    return
  }
  state.result = state.monsterHp <= 0 ? 'win' : 'lose'
  if (state.result === 'win') {
    state.lastWinGold = winGold(state.round)
    state.gold += state.lastWinGold
  }
  state.screen = 'result'
  window.onkeydown = null
  render()
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function startLoop() {
  stopLoop()
  lastTs = performance.now()
  const tick = (ts: number) => {
    const dt = ts - lastTs
    lastTs = ts
    if (state.sealOpen && state.phase === 'input') {
      state.timeLeft -= dt
      const fill = document.querySelector<HTMLElement>('#seal-timer-fill')
      if (fill && state.timeMax > 0) {
        fill.style.transform = `scaleX(${clamp(state.timeLeft / state.timeMax, 0, 1)})`
      }
      if (state.timeLeft <= 0) {
        onSealFail('施印逾時')
      }
    } else if (state.screen === 'fight' && inRealmFight() && !state.sealOpen && !state.catchReady && !state.realmKnockout) {
      // Safety net: HP may already be ≤ threshold if a path skipped maybeEnter
      if (state.spirit && isCatchReady(state.monsterHp, state.spirit.rarity)) {
        syncCatchReadyFromHp()
        rafId = requestAnimationFrame(tick)
        return
      }
    } else if (
      state.screen === 'fight' &&
      state.phase === 'input' &&
      !state.catchReady &&
      !state.realmKnockout
    ) {
      state.timeLeft -= dt
      const fill = document.querySelector<HTMLElement>('#timer-fill')
      if (fill && state.timeMax > 0) {
        fill.style.transform = `scaleX(${clamp(state.timeLeft / state.timeMax, 0, 1)})`
      }
      if (state.timeLeft <= 0) {
        void resolveFail(state.stage === 1 ? '階段 1 逾時！' : '階段 2 逾時！')
      }
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}


/* ========== BRIEF-CATCH-001 / HUD-CATCH-001 ========== */

function beginRealmEntry() {
  voice.stop()
  stopLoop()
  window.onkeydown = null
  state.playMode = 'realm'
  state.pendingPath = 'realm'
  state.realmQueue = buildRealmQueue()
  state.realmIndex = 0
  state.spirit = null
  state.catchReady = false
  state.realmKnockout = false
  state.sealOpen = false
  state.sealPrompt = null
  state.lastCatchMsg = ''
  state.screen = 'realm'
  render()
}

function renderRealmScreen() {
  const q = state.realmQueue
  app.innerHTML = `
    <div class="screen realm-screen active">
      <div class="panel-head">
        <div class="title-badge">AI智能獸之讀音之戰</div>
        <h2>靈域探索</h2>
        <p class="panel-sub">
          本趟將遭遇 <strong>${q.length}</strong> 隻印靈（${REALM_ENCOUNTERS_MIN}–${REALM_ENCOUNTERS_MAX}）
          · 模式：${state.mode === 'zhuyin' ? '注音' : '英文'}
          · ${state.playerBeast ? escapeHtml(state.playerBeast.name) : '智能獸'}
        </p>
      </div>
      <div class="realm-queue">
        ${q.map((s) => spiritPlaceholderHtml(s)).join('')}
      </div>
      <p class="panel-sub" style="text-align:center">語音壓血至門檻後按「施印」；成功收入圖鑑（只收藏，不上陣）。立繪為占位，等待製作人板。</p>
      <div class="mode-row">
        <button class="btn btn-zhuyin" id="btn-realm-start" type="button">進入靈域</button>
        <button class="btn btn-ghost" id="btn-codex" type="button">圖鑑</button>
        <button class="btn btn-ghost" data-title type="button">回標題</button>
      </div>
    </div>
  `
  app.querySelector('#btn-realm-start')!.addEventListener('click', () => {
    void startRealmEncounter()
  })

  // QA: long-press 靈域探索 title → snap after entering fight is via fight HUD;
  // here long-press h2 also notes the shortcut in status for discoverability
  {
    const h2 = app.querySelector<HTMLElement>('.realm-screen h2')
    if (h2) {
      let t: number | null = null
      const clear = () => { if (t != null) { window.clearTimeout(t); t = null } }
      h2.addEventListener('pointerdown', () => {
        clear()
        t = window.setTimeout(() => {
          t = null
          state.status = '【測】進戰後：點【測】壓門檻，或長按怪血條／回合晶片'
          // If already mid-fight somehow, snap
          if (state.screen === 'fight') qaSnapMonsterToThreshold()
          else render()
        }, 900)
      })
      h2.addEventListener('pointerup', clear)
      h2.addEventListener('pointerleave', clear)
    }
  }

  app.querySelector('#btn-codex')!.addEventListener('click', () => {
    state.screen = 'codex'
    state.codexSelectedId = null
    render()
  })
  app.querySelector('[data-title]')!.addEventListener('click', () => goTitleFresh())
}

function renderCodexScreen() {
  const list = loadCodex()
  const selected = state.codexSelectedId ? getSpirit(state.codexSelectedId) : null
  const selectedEntry = list.find((e) => e.id === state.codexSelectedId)
  app.innerHTML = `
    <div class="screen dex-screen active" id="screen-codex">
      <div class="panel-head">
        <div class="title-badge">AI智能獸之讀音之戰</div>
        <h2>印靈圖鑑</h2>
        <p class="panel-sub">只收藏 · 不可出戰 · 已印 ${list.length} 種</p>
      </div>
      ${
        list.length === 0
          ? `<p class="codex-empty">還沒印到靈獸。去靈域探索，施印後會出現在這裡。</p>`
          : `<div class="codex-grid">
              ${list
                .map((e) => {
                  const s = getSpirit(e.id)
                  if (!s) return ''
                  return `<button type="button" class="spirit-slot codex-card codex-frame" data-codex="${s.id}">
                    ${spiritPlaceholderHtml(s, 'codex-card').replace(/^<div class="spirit-slot[^"]*"[^>]*>/, '').replace(/<\/div>$/, '')}
                  </button>`
                })
                .join('')}
            </div>`
      }
      ${
        selected
          ? `<div id="codex-detail" class="codex-frame">
              ${spiritPlaceholderHtml(selected, 'codex-card')}
              <p class="panel-sub">${escapeHtml(selected.blurb)}</p>
              <p class="dex-caught-at">${selectedEntry ? new Date(selectedEntry.caughtAt).toLocaleString('zh-TW') : ''}</p>
              <p class="panel-sub">無數值養成 · 無出戰</p>
            </div>`
          : ''
      }
      <div class="mode-row">
        <button class="btn btn-english" id="btn-realm" type="button">靈域</button>
        <button class="btn btn-ghost" data-title type="button">回標題</button>
      </div>
    </div>
  `
  // Fix broken nested HTML for cards — rebuild simply
  const grid = app.querySelector('.codex-grid')
  if (grid && list.length) {
    grid.innerHTML = list
      .map((e) => {
        const s = getSpirit(e.id)
        if (!s) return ''
        return `<button type="button" class="codex-card-btn" data-codex="${s.id}">${spiritPlaceholderHtml(s, 'codex-card')}</button>`
      })
      .join('')
  }
  app.querySelectorAll<HTMLButtonElement>('[data-codex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.codexSelectedId = btn.dataset.codex ?? null
      render()
    })
  })
  app.querySelector('#btn-realm')?.addEventListener('click', () => {
    state.pendingPath = 'realm'
    state.playMode = 'realm'
    if (!state.mode) state.mode = 'zhuyin'
    if (!state.jobId) state.jobId = 'swordsman'
    beginRealmEntry()
  })
  const back = app.querySelector('[data-title]')
  if (back) {
    back.addEventListener('click', () => {
      if (state.playerBeast) {
        state.screen = 'hub'
        render()
        return
      }
      goTitleFresh()
    })
    if (state.playerBeast) back.textContent = '回據點'
  }
}

function renderRealmResultScreen() {
  app.innerHTML = `
    <div class="screen realm-result-screen result-screen active">
      <div class="title-badge">AI智能獸之讀音之戰</div>
      <h2>靈域結束</h2>
      <p class="result-msg">${escapeHtml(state.lastCatchMsg || '本趟探索結束。')}</p>
      <p class="result-msg">圖鑑收藏 ${loadCodex().length} 種 · 🪙 ${state.gold}</p>
      <div class="mode-row">
        <button class="btn btn-zhuyin" id="btn-realm" type="button">再探靈域</button>
        <button class="btn btn-english" id="btn-codex" type="button">圖鑑</button>
        <button class="btn btn-ghost" data-to-hub type="button">回據點</button>
        <button class="btn btn-ghost" data-title type="button">回標題</button>
      </div>
    </div>
  `
  app.querySelector('#btn-realm')!.addEventListener('click', () => beginRealmEntry())
  app.querySelector('#btn-codex')!.addEventListener('click', () => {
    state.screen = 'codex'
    state.codexSelectedId = null
    render()
  })
  app.querySelector('[data-to-hub]')!.addEventListener('click', () => {
    state.playMode = 'wild'
    state.screen = 'hub'
    render()
  })
  app.querySelector('[data-title]')!.addEventListener('click', () => goTitleFresh())
}

async function startRealmEncounter() {
  if (!state.mode || !state.jobId) return
  state.playMode = 'realm'
  if (state.realmIndex >= state.realmQueue.length) {
    state.lastCatchMsg = '本趟印靈皆已處理。'
    state.screen = 'realm-result'
    render()
    return
  }
  state.spirit = state.realmQueue[state.realmIndex]!
  state.catchReady = false
  state.realmKnockout = false
  state.sealOpen = false
  state.sealPrompt = null
  const ok = await voice.ensurePermission()
  const j = getJob(state.jobId)
  state.screen = 'fight'
  state.heroHp = MAX_HP
  state.monsterHp = MAX_HP
  state.round = 0
  state.deck = createPromptDeck(state.mode)
  state.deckIndex = 0
  state.result = null
  state.lastWinGold = 0
  state.heard = ''
  state.skillLeft = j.skillMax
  state.blockCharges = 0
  state.dodgeCharges = 0
  state.firstStrikeDone = false
  state.status = ok
    ? `印靈「${state.spirit.name}」出現！壓至 HP≤${catchThreshold(state.spirit.rarity)} 可施印`
    : '請啟用麥克風或打字；壓血後可施印'
  voice.setLang(speechLang(state.mode))
  render()

  if (j.firstStrike > 0 && !state.firstStrikeDone) {
    state.firstStrikeDone = true
    state.monsterHp = clamp(state.monsterHp - j.firstStrike, 0, MAX_HP)
    state.status = `盜賊先制！-${j.firstStrike}`
    playHeroAttackFx(j.firstStrike)
    updateHpBars()
    await wait(500)
    if (state.monsterHp <= 0) {
      onRealmMonsterDown()
      return
    }
    maybeEnterCatchReady()
  }

  if (!state.catchReady && !state.realmKnockout) {
    nextRound()
    startLoop()
    if (ok) voice.start()
  }
}


/** Realm fight if playMode says so, OR spirit is present on fight screen (defensive). */
function inRealmFight(): boolean {
  if (state.spirit && state.screen === 'fight') {
    // Heal accidental playMode flips during realm encounters
    if (state.playMode !== 'realm') state.playMode = 'realm'
    return true
  }
  return state.playMode === 'realm' && !!state.spirit
}

/** True when catch CTA should show (flag OR live HP ≤ threshold). */
function shouldShowCatchUi(): boolean {
  if (!inRealmFight() || !state.spirit) return false
  if (state.catchReady || state.realmKnockout) return true
  return isCatchReady(state.monsterHp, state.spirit.rarity)
}

/** Sync catchReady from live HP; call after any monster HP change. Returns true if now in catch UI. */
function syncCatchReadyFromHp(): boolean {
  if (!inRealmFight() || !state.spirit || state.sealOpen) return false
  if (state.monsterHp <= 0) {
    if (!state.realmKnockout || !state.catchReady) onRealmMonsterDown()
    return true
  }
  if (isCatchReady(state.monsterHp, state.spirit.rarity)) {
    return maybeEnterCatchReady()
  }
  return false
}

function maybeEnterCatchReady() {
  if (!inRealmFight() || !state.spirit) return false
  if (!isCatchReady(state.monsterHp, state.spirit.rarity) && state.monsterHp > 0) return false
  state.playMode = 'realm'
  state.catchReady = true
  state.phase = 'idle'
  stopLoop()
  voice.stop()
  state.status =
    state.monsterHp <= 0
      ? '擊倒！可施印嘗試或收下金幣離開 — 按「施印嘗試」'
      : `可施印！HP ${Math.ceil(state.monsterHp)}≤${catchThreshold(state.spirit.rarity)}（${rarityLabel(state.spirit.rarity)}）— 按「施印」`
  if (state.monsterHp <= 0) state.realmKnockout = true
  render()
  requestAnimationFrame(() => {
    document.querySelector('#catch-ready')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const sealBtn = document.querySelector('#btn-seal') as HTMLButtonElement | null
    sealBtn?.focus()
  })
  return true
}

function onRealmMonsterDown() {
  stopLoop()
  voice.stop()
  state.playMode = 'realm'
  state.phase = 'idle'
  state.realmKnockout = true
  state.catchReady = true
  state.status = '擊倒！可施印嘗試或收下金幣離開 — 按「施印嘗試」'
  render()
  requestAnimationFrame(() => {
    document.querySelector('#btn-seal')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}


/** QA: snap realm monster HP to catch threshold (does not auto-open seal). */
function qaSnapMonsterToThreshold() {
  if (!inRealmFight() || !state.spirit) return
  if (state.sealOpen) return
  const th = catchThreshold(state.spirit.rarity)
  state.monsterHp = Math.min(state.monsterHp, th)
  state.status = `【測試】已壓至門檻 HP=${Math.ceil(state.monsterHp)}≤${th} — 應出現可施印`
  syncCatchReadyFromHp()
  if (!state.catchReady) {
    // force show even if sync somehow no-oped
    state.catchReady = true
    state.phase = 'idle'
    stopLoop()
    voice.stop()
    render()
  }
}

function wireRealmQaSnapShortcut() {
  if (!inRealmFight()) return
  document.querySelector('#catch-qa-snap')?.addEventListener('click', (e) => {
    e.preventDefault()
    qaSnapMonsterToThreshold()
  })
  const targets = [
    document.querySelector<HTMLElement>('.hp-block.monster'),
    document.querySelector<HTMLElement>('.round-chip'),
  ].filter(Boolean) as HTMLElement[]
  for (const el of targets) {
    let timer: number | null = null
    const clear = () => {
      if (timer != null) {
        window.clearTimeout(timer)
        timer = null
      }
    }
    const start = () => {
      clear()
      timer = window.setTimeout(() => {
        timer = null
        qaSnapMonsterToThreshold()
      }, 900)
    }
    el.addEventListener('pointerdown', start)
    el.addEventListener('pointerup', clear)
    el.addEventListener('pointerleave', clear)
    el.addEventListener('pointercancel', clear)
  }
}

function wireRealmFightExtras() {
  // Wire whenever CTA exists (don't gate on playMode — defensive)
  document.querySelector('#btn-seal')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    openSealModal()
  })
  document.querySelector('#btn-flee-catch')?.addEventListener('click', () => fleeRealmEncounter(false))
  document.querySelector('#btn-knockout-gold')?.addEventListener('click', () => {
    takeKnockoutGoldAndAdvance()
  })
  document.querySelector('#btn-seal-retry')?.addEventListener('click', () => {
    state.catchReady = false
    state.realmKnockout = state.monsterHp <= 0
    state.status = '繼續戰鬥！'
    if (state.realmKnockout) {
      state.catchReady = true
      render()
      return
    }
    nextRound()
    startLoop()
    void voice.ensurePermission().then((ok) => {
      if (ok) voice.start()
    })
    render()
  })
}

function takeKnockoutGoldAndAdvance() {
  if (!state.spirit) return
  const award = realmWinGold(winGold(Math.max(1, state.round)), state.spirit.rarity)
  state.gold += award
  state.lastWinGold = award
  state.lastCatchMsg = `擊倒 ${state.spirit.name}，獲得 🪙${award}（未施印）。`
  advanceRealmAfterEncounter()
}

function fleeRealmEncounter(_fromSeal: boolean) {
  voice.stop()
  stopLoop()
  state.sealOpen = false
  state.catchReady = false
  state.realmKnockout = false
  state.phase = 'idle'
  state.lastCatchMsg = state.spirit
    ? `逃離「${state.spirit.name}」— 未收入、無勝金。`
    : '已逃離靈域。'
  // end whole realm run on flee (brief: back to shop/title)
  state.screen = 'realm-result'
  window.onkeydown = null
  render()
}

function openSealModal() {
  if (state.sealOpen) return
  if (!state.mode || !state.spirit) return
  // Allow when catch-ready UI is up (flag) or HP already at threshold / knockout
  const hpReady = isCatchReady(state.monsterHp, state.spirit.rarity)
  if (!state.catchReady && !state.realmKnockout && !hpReady) return
  if (hpReady) state.catchReady = true
  if (state.monsterHp <= 0) state.realmKnockout = true
  stopLoop()
  voice.stop()
  state.sealHpSnapshot = state.monsterHp
  state.sealPrompt = pickSealPrompt(state.mode)
  state.prompt = state.sealPrompt
  state.stage = sealStartStage(state.mode)
  stage1Passed = state.stage === 2
  state.phase = 'input'
  state.timeMax = state.sealPrompt.timeMs
  state.timeLeft = state.sealPrompt.timeMs
  state.heard = ''
  state.sealOpen = true
  state.status = state.mode === 'english' ? '施印：說出整詞！' : '施印：先音後字！'
  voice.setLang(speechLang(state.mode))
  render()
  startLoop()
  void voice.ensurePermission().then((ok) => {
    if (ok && state.sealOpen) voice.start()
  })
}

function mountSealModal() {
  const existing = document.querySelector('#seal-modal')
  existing?.remove()
  const p = state.sealPrompt
  if (!p) return
  const sealSrc = `${import.meta.env.BASE_URL}art/catch/seal.png`
  const timerPct = state.timeMax > 0 ? clamp((state.timeLeft / state.timeMax) * 100, 0, 100) : 0
  const modal = document.createElement('div')
  modal.id = 'seal-modal'
  modal.innerHTML = `
    <div class="seal-modal-card">
      <h2 style="text-align:center;color:#ffd76a;margin:0 0 4px">施印</h2>
      <img id="catch-seal" class="seal-lg" src="${sealSrc}" alt="印符" width="96" height="96" />
      <div class="prompt-panel voice-panel" style="margin:0;padding:10px">
        <div class="timer-bar"><div class="timer-fill" id="seal-timer-fill" style="transform:scaleX(${timerPct / 100})"></div></div>
        ${micBadgeHtml()}
        <div class="stage-pills">
          <span class="stage-pill ${state.stage === 1 ? 'current' : stage1Passed ? 'done' : ''}">${state.mode === 'english' ? 'WORD' : 'Stage 1'}</span>
          ${
            state.mode === 'zhuyin'
              ? `<span class="stage-arrow">→</span><span class="stage-pill ${state.stage === 2 ? 'current' : ''}">Stage 2</span>`
              : ''
          }
        </div>
        <div class="prompt-row voice-prompt">
          <span class="prompt-primary" id="prompt-primary">${escapeHtml(p.displayPrimary)}</span>
          ${
            state.mode === 'zhuyin'
              ? `<span class="prompt-sep">·</span><span class="prompt-secondary" id="prompt-secondary">${escapeHtml(p.displaySecondary)}</span>`
              : ''
          }
        </div>
        <div class="prompt-hint" id="stage-hint">${sealInstruction()}</div>
        <div class="heard-line" id="heard-line">聽到：${escapeHtml(state.heard) || '（尚未辨識）'}</div>
        <div class="status-toast" id="status">${escapeHtml(state.status)}</div>
        <form class="type-fallback" id="seal-type-form">
          <input type="text" id="seal-type-input" class="type-input" placeholder="打字施印…" autocomplete="off" />
          <button type="submit" class="btn btn-ghost">送出</button>
        </form>
        <div class="mode-row" style="margin-top:8px">
          <button type="button" class="btn btn-ghost" id="btn-seal-cancel">取消</button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
  modal.querySelector('#seal-type-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const input = modal.querySelector<HTMLInputElement>('#seal-type-input')
    if (!input) return
    const t = input.value.trim()
    if (!t) return
    state.heard = t
    input.value = ''
    updateSealHud()
    void trySealMatch(t)
  })
  modal.querySelector('#btn-seal-cancel')?.addEventListener('click', () => {
    onSealFail('取消施印')
  })
}

function sealInstruction(): string {
  if (!state.sealPrompt || !state.mode) return ''
  if (state.mode === 'english') {
    return `施印：說出「${escapeHtml(state.sealPrompt.displaySecondary)}」`
  }
  return state.stage === 1
    ? `施印①：唸音「${escapeHtml(state.sealPrompt.displayPrimary)}」`
    : `施印②：說「${escapeHtml(state.sealPrompt.displaySecondary)}」`
}

function updateSealHud() {
  if (!state.sealOpen) return
  const heard = document.querySelector('#seal-modal #heard-line')
  if (heard) heard.textContent = `聽到：${state.heard || '（尚未辨識）'}`
  const status = document.querySelector('#seal-modal #status')
  if (status) status.textContent = state.status
  const hint = document.querySelector('#seal-modal #stage-hint')
  if (hint) hint.innerHTML = sealInstruction()
  const badge = document.querySelector('#seal-modal #mic-badge')
  if (badge) {
    const wrap = document.createElement('div')
    wrap.innerHTML = micBadgeHtml()
    badge.replaceWith(wrap.firstElementChild!)
  }
  const fill = document.querySelector<HTMLElement>('#seal-timer-fill')
  if (fill && state.timeMax > 0) {
    fill.style.transform = `scaleX(${clamp(state.timeLeft / state.timeMax, 0, 1)})`
  }
}

async function trySealMatch(transcript: string, isFinal = true) {
  if (!state.sealOpen || state.phase !== 'input' || !state.prompt || !state.mode) return
  const expected = state.stage === 1 ? state.prompt.stage1 : state.prompt.stage2
  const ok = matchStage(state.mode, state.stage, transcript, expected)
  if (!ok) {
    if (isFinal && transcript.trim()) {
      state.status = nearMissHint(
        state.mode,
        state.stage,
        transcript,
        expected,
        state.stage === 1 ? state.prompt.displayPrimary : state.prompt.displaySecondary,
      )
      updateSealHud()
    }
    return
  }
  state.phase = 'resolving'
  if (state.mode === 'zhuyin' && state.stage === 1) {
    stage1Passed = true
    state.heard = ''
    state.status = '① 綠燈！繼續施印②'
    lightPromptTarget('primary')
    updateSealHud()
    await wait(STAGE_OK_HOLD_MS)
    if (!state.sealOpen) return
    state.stage = 2
    state.phase = 'input'
    updateSealHud()
    return
  }
  state.status = '施印成功！'
  const sealEl = document.querySelector('#seal-modal #catch-seal')
  sealEl?.classList.add('hit')
  updateSealHud()
  await wait(500)
  onSealSuccess()
}

function onSealSuccess() {
  stopLoop()
  voice.stop()
  state.sealOpen = false
  document.querySelector('#seal-modal')?.remove()
  if (!state.spirit) return
  const { isNew } = addToCodex(state.spirit)
  state.lastCatchMsg = isNew
    ? `「${state.spirit.name}」已收入圖鑑！`
    : `「${state.spirit.name}」施印成功（圖鑑已有・重複）。`
  state.catchReady = false
  state.realmKnockout = false
  state.phase = 'idle'
  advanceRealmAfterEncounter()
}

function onSealFail(reason: string) {
  stopLoop()
  voice.stop()
  state.sealOpen = false
  document.querySelector('#seal-modal')?.remove()
  state.monsterHp = state.sealHpSnapshot
  state.prompt = null
  state.phase = 'idle'
  state.status = `${reason} — 選再打或逃`
  state.catchReady = true
  if (state.monsterHp <= 0) state.realmKnockout = true
  render()
}

function advanceRealmAfterEncounter() {
  voice.stop()
  stopLoop()
  window.onkeydown = null
  state.sealOpen = false
  document.querySelector('#seal-modal')?.remove()
  state.realmIndex += 1
  state.spirit = null
  state.catchReady = false
  state.realmKnockout = false
  if (state.realmIndex >= state.realmQueue.length) {
    if (!state.lastCatchMsg) state.lastCatchMsg = '本趟靈域探索結束。'
    state.screen = 'realm-result'
    render()
    return
  }
  // brief pause then next
  state.screen = 'realm'
  // skip queue overview — auto next encounter
  void startRealmEncounter()
}


// Boot
render()
