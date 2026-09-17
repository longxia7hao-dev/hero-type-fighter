import './style.css'
import './castle-skin.css'

/** ART-STYLE-MOONCASTLE backdrop (public/art) */
document.documentElement.style.setProperty(
  '--castle-bg',
  `url(${import.meta.env.BASE_URL}art/bg-castle.jpg)`,
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
  const expected =
    state.stage === 1
      ? (state.prompt.stage1[0] ?? state.prompt.displayPrimary)
      : (state.prompt.stage2[0] ?? state.prompt.displaySecondary)
  const label = state.stage === 1 ? '階段①' : '階段②'
  return `${label} 可打：${expected}`
}

/** QA / no-mic: force win → gold → result (shop reachable). Voice core untouched. */
function simulateQaVictory() {
  if (!state.mode) state.mode = 'zhuyin'
  if (!state.jobId) state.jobId = 'swordsman'
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


type Screen = 'title' | 'select' | 'shop' | 'fight' | 'result'
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
  swordsman: 'hero-swordsman.jpg',
  paladin: 'hero-paladin.jpg',
  mage: 'hero-mage.jpg',
  rogue: 'hero-rogue.jpg',
}
const MONSTER_ART = 'monster.jpg'

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
  const j = job()
  const cls = j?.cssClass ?? 'job-swordsman'
  const id = (j?.id ?? 'swordsman') as JobId
  const file = JOB_ART[id]
  return `
    <div class="fighter hero portrait-wrap ${cls}" id="hero">
      ${portraitImg(file, j?.name ?? '勇者', 'portrait-fight')}
    </div>`
}

function chibiMonsterHtml(): string {
  return `
    <div class="fighter monster portrait-wrap" id="monster">
      ${portraitImg(MONSTER_ART, '魔物', 'portrait-fight')}
    </div>`
}

function render() {
  if (state.screen === 'title') {
    const speechOk = isSpeechSupported()
    app.innerHTML = `
      <div class="screen title-screen active">
        <div class="title-badge">JRPG VOICE QUEST</div>
        <h1 class="game-title">勇者拼音快打</h1>
        <p class="subtitle">選職業、逛商店，再用麥克風（或打字）唸出口令出招！</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-mode="zhuyin" type="button">注音語音版</button>
          <button class="btn btn-english" data-mode="english" type="button">英文語音版</button>
        </div>
        <div class="howto">
          <strong>冒險流程</strong><br/>
          · 選模式 → 選職業 → 商店（可跳過）→ 戰鬥<br/>
          · <strong>注音</strong>：先唸「音」，再唸漢字 · <strong>英文</strong>：先拼字母，再說單字<br/>
          · 兩階段綠燈 → 攻擊；失敗／逾時 → 魔物反擊（可用技能／道具）<br/>
          · 語音不可用時可在戰鬥畫面用<strong>打字 fallback</strong>（輸入框會提示當前答案）<br/>
          · <strong>品管／無麥</strong>：長按標題 1.2 秒 → 模擬勝利（金幣→可回商店）
          ${
            speechOk
              ? ''
              : '<br/><span class="warn-inline">此瀏覽器不支援 Web Speech API — 請用打字，或改 Chrome／Edge。</span>'
          }
        </div>
      </div>
    `
    app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode as GameMode
        state.screen = 'select'
        render()
      })
    })
    wireTitleLongPressQa()
    return
  }

  if (state.screen === 'select') {
    app.innerHTML = `
      <div class="screen select-screen active">
        <div class="panel-head">
          <h2>選擇職業</h2>
          <p class="panel-sub">日系 Q 版勇者 · 模式：${state.mode === 'zhuyin' ? '注音' : '英文'}</p>
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
    app.innerHTML = `
      <div class="screen result-screen active ${win ? 'win' : 'lose'}">
        <h2>${win ? '勝利！' : '敗北…'}</h2>
        <p class="result-msg">
          ${
            win
              ? `魔物倒下了！獲得 🪙 <strong>${state.lastWinGold}</strong> 金幣（現有 ${state.gold}）。`
              : '勇者力竭倒下。道具仍保留，再試一次吧！'
          }
        </p>
        <p class="result-msg">
          ${j ? escapeHtml(j.name) : '勇者'} · 回合 ${state.round} ·
          ${state.mode === 'zhuyin' ? '注音' : '英文'}
        </p>
        <div class="mode-row">
          ${
            win
              ? `<button class="btn btn-english" data-to-shop type="button">回商店</button>
                 <button class="btn btn-zhuyin" data-again type="button">再戰一場</button>`
              : `<button class="btn btn-zhuyin" data-again type="button">再戰一場</button>
                 <button class="btn btn-english" data-to-shop type="button">回商店補貨</button>`
          }
          <button class="btn btn-ghost" data-reselect type="button">重選職業</button>
          <button class="btn btn-ghost" data-title type="button">回標題</button>
        </div>
      </div>
    `
    app.querySelector('[data-again]')?.addEventListener('click', () => {
      void startFight()
    })
    app.querySelector('[data-to-shop]')?.addEventListener('click', () => {
      state.screen = 'shop'
      render()
    })
    app.querySelector('[data-reselect]')?.addEventListener('click', () => {
      state.screen = 'select'
      render()
    })
    app.querySelector('[data-title]')!.addEventListener('click', () => {
      goTitleFresh()
    })
    return
  }

  // Fight
  const p = state.prompt
  const timerPct = state.timeMax > 0 ? clamp((state.timeLeft / state.timeMax) * 100, 0, 100) : 0
  const stage1Cls = stage1Passed || state.stage === 2 ? 'done' : state.stage === 1 ? 'current' : ''
  const stage2Cls = state.stage === 2 ? 'current' : stage1Passed ? '' : 'locked'
  const j = job()!

  app.innerHTML = `
    <div class="screen fight-screen active">
      <div class="hud">
        <div class="hp-block">
          <div class="hp-label">${escapeHtml(j.name)} ${Math.ceil(state.heroHp)}</div>
          <div class="hp-bar"><div class="hp-fill hero" style="width:${(state.heroHp / MAX_HP) * 100}%"></div></div>
        </div>
        <div class="round-chip">第 ${state.round} 回合 · 🪙${state.gold}</div>
        <div class="hp-block monster">
          <div class="hp-label">魔物 ${Math.ceil(state.monsterHp)}</div>
          <div class="hp-bar"><div class="hp-fill monster" style="width:${(state.monsterHp / MAX_HP) * 100}%"></div></div>
        </div>
      </div>

      <div class="buff-row" id="buff-row">
        ${state.blockCharges > 0 ? `<span class="buff-chip">護盾×${state.blockCharges}</span>` : ''}
        ${state.dodgeCharges > 0 ? `<span class="buff-chip dodge">影遁×${state.dodgeCharges}</span>` : ''}
        ${j.damageMult > 1 ? `<span class="buff-chip">傷×${j.damageMult}</span>` : ''}
      </div>

      <div class="stage" id="stage">
        <img class="stage-bg" src="${import.meta.env.BASE_URL}art/bg-battle.jpg" alt="" aria-hidden="true" />
        <div class="stage-ground"></div>
        ${chibiHeroHtml()}
        ${chibiMonsterHtml()}
        <div class="fx-slash" id="fx-slash"><div class="lottie-box" id="lottie-box"></div></div>
      </div>

      <div class="action-bar" id="action-bar">
        <button type="button" class="act-btn skill" data-skill ${state.skillLeft <= 0 ? 'disabled' : ''}>
          ${escapeHtml(j.skillName)} <span class="act-count">${state.skillLeft}</span>
        </button>
        ${ITEMS.map((it) => {
          const n = state.inventory[it.id]
          return `<button type="button" class="act-btn item" data-item="${it.id}" ${n <= 0 ? 'disabled' : ''}>
            ${escapeHtml(it.name)} <span class="act-count">${n}</span>
          </button>`
        }).join('')}
      </div>

      <div class="prompt-panel voice-panel">
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
      </div>
    </div>
  `

  mountLottie()
  wireFightControls()
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

  state.phase = 'resolving'

  if (state.stage === 1) {
    stage1Passed = true
    state.heard = ''
    state.status = '① 綠燈！這段音對了'
    lightPromptTarget('primary')
    updateVoiceHud()
    await wait(STAGE_OK_HOLD_MS)
    if (state.screen !== 'fight' || !state.prompt) return
    state.stage = 2
    state.status = '① 綠燈已亮 → 繼續唸第 ② 段'
    state.phase = 'input'
    updateVoiceHud()
    return
  }

  state.status = '② 綠燈！出招'
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
    await wait(550)
    if (state.monsterHp <= 0) {
      endFight()
      return
    }
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
    await wait(550)
    if (state.monsterHp <= 0) {
      endFight()
      return
    }
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

  nextRound()
  startLoop()
  if (ok) {
    voice.start()
  }
}

function nextRound() {
  if (state.heroHp <= 0 || state.monsterHp <= 0) {
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
  state.phase = 'resolving'
  const mult = job()?.damageMult ?? 1
  const dmg = Math.round(state.prompt.damage * mult)
  state.status = `雙階段通過！命中 -${dmg}！`
  updateVoiceHud()
  state.monsterHp = clamp(state.monsterHp - dmg, 0, MAX_HP)
  playHeroAttackFx(dmg)
  updateHpBars()
  await wait(550)
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
  const j = job()
  if (heroFill) heroFill.style.width = `${(state.heroHp / MAX_HP) * 100}%`
  if (monFill) monFill.style.width = `${(state.monsterHp / MAX_HP) * 100}%`
  if (heroLabel) heroLabel.textContent = `${j?.name ?? '勇者'} ${Math.ceil(state.heroHp)}`
  if (monLabel) monLabel.textContent = `魔物 ${Math.ceil(state.monsterHp)}`
  const status = document.querySelector('#status')
  if (status) status.textContent = state.status
}

function endFight() {
  stopLoop()
  voice.stop()
  state.phase = 'idle'
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
    if (state.screen === 'fight' && state.phase === 'input') {
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

// Boot
render()
