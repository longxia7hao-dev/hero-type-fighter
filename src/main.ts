import './style.css'
import lottie, { type AnimationItem } from 'lottie-web'
import {
  type GameMode,
  type VoicePrompt,
  createPromptDeck,
  speechLang,
} from './prompts'
import { matchStage } from './match'
import { VoiceRecognizer, isSpeechSupported, type SpeechStatus } from './speech'

const MAX_HP = 100
const MONSTER_DMG = 14
/** Brief green-lamp hold after a stage is accepted (ms) */
const STAGE_OK_HOLD_MS = 450

type Screen = 'title' | 'fight' | 'result'
type StageNum = 1 | 2

interface State {
  screen: Screen
  mode: GameMode | null
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
  status: string
  heard: string
  micStatus: SpeechStatus
  micDetail: string
}

const state: State = {
  screen: 'title',
  mode: null,
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
  status: '',
  heard: '',
  micStatus: isSpeechSupported() ? 'need-permission' : 'unsupported',
  micDetail: '',
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
    // Try match on interim too (faster feedback) and final
    tryMatch(transcript)
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

function render() {
  if (state.screen === 'title') {
    const speechOk = isSpeechSupported()
    app.innerHTML = `
      <div class="screen title-screen active">
        <div class="title-badge">VOICE FIGHTER</div>
        <h1 class="game-title">勇者拼音快打</h1>
        <p class="subtitle">用麥克風唸出口令，勇者出劍；說錯或太慢，魔物反擊！</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-mode="zhuyin" type="button" ${speechOk ? '' : 'disabled'}>注音語音版</button>
          <button class="btn btn-english" data-mode="english" type="button" ${speechOk ? '' : 'disabled'}>英文語音版</button>
        </div>
        <div class="howto">
          <strong>怎麼玩（語音）</strong><br/>
          · 允許麥克風後開戰；畫面會顯示<strong>聆聽中</strong><br/>
          · <strong>注音版</strong>：先唸注音「音」（音對即可，如 ㄐ），再唸漢字（如「雞」）<br/>
          · <strong>英文版</strong>：先逐字母拼出，再說出單字<br/>
          · 兩階段都過 → 勇者攻擊；失敗／逾時 → 魔物反擊<br/>
          · 打滿<strong>對方</strong>血條即勝
          ${
            speechOk
              ? ''
              : '<br/><span class="warn-inline">此瀏覽器不支援 Web Speech API，請改用 Chrome／Edge（桌面）或 Safari（需 iOS 設定）。</span>'
          }
        </div>
      </div>
    `
    app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as GameMode
        void startFight(mode)
      })
    })
    return
  }

  if (state.screen === 'result') {
    const win = state.result === 'win'
    voice.stop()
    app.innerHTML = `
      <div class="screen result-screen active ${win ? 'win' : 'lose'}">
        <h2>${win ? '勝利！' : '敗北…'}</h2>
        <p class="result-msg">
          ${win
            ? '魔物倒下了！你的嗓音拯救了村莊。'
            : '勇者力竭倒下。再練練發音吧！'}
        </p>
        <p class="result-msg">回合 ${state.round} · 模式：${state.mode === 'zhuyin' ? '注音語音' : '英文語音'}</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-again type="button">再來一局</button>
          <button class="btn btn-ghost" data-title type="button">回標題</button>
        </div>
      </div>
    `
    app.querySelector('[data-again]')!.addEventListener('click', () => {
      if (state.mode) void startFight(state.mode)
    })
    app.querySelector('[data-title]')!.addEventListener('click', () => {
      state.screen = 'title'
      stopLoop()
      voice.stop()
      render()
    })
    return
  }

  // Fight
  const p = state.prompt
  const timerPct = state.timeMax > 0 ? clamp((state.timeLeft / state.timeMax) * 100, 0, 100) : 0
  const stage1Cls = stage1Passed || state.stage === 2 ? 'done' : state.stage === 1 ? 'current' : ''
  const stage2Cls = state.stage === 2 ? 'current' : stage1Passed ? '' : 'locked'

  app.innerHTML = `
    <div class="screen fight-screen active">
      <div class="hud">
        <div class="hp-block">
          <div class="hp-label">勇者 ${Math.ceil(state.heroHp)}</div>
          <div class="hp-bar"><div class="hp-fill hero" style="width:${(state.heroHp / MAX_HP) * 100}%"></div></div>
        </div>
        <div class="round-chip">第 ${state.round} 回合</div>
        <div class="hp-block monster">
          <div class="hp-label">魔物 ${Math.ceil(state.monsterHp)}</div>
          <div class="hp-bar"><div class="hp-fill monster" style="width:${(state.monsterHp / MAX_HP) * 100}%"></div></div>
        </div>
      </div>

      <div class="stage" id="stage">
        <div class="stage-ground"></div>
        <div class="fighter hero" id="hero">
          <div class="body">
            <div class="silhouette"></div>
            <div class="face">🗡️</div>
            <div class="weapon"></div>
          </div>
        </div>
        <div class="fighter monster" id="monster">
          <div class="body">
            <div class="silhouette"></div>
            <div class="face">👹</div>
            <div class="weapon"></div>
          </div>
        </div>
        <div class="fx-slash" id="fx-slash"><div class="lottie-box" id="lottie-box"></div></div>
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
        <div class="voice-actions">
          <button type="button" class="btn btn-mic" id="btn-mic" ${
            state.micStatus === 'unsupported' ? 'disabled' : ''
          }>${state.micStatus === 'listening' ? '🎤 聆聽中' : '🎤 啟用／重啟麥克風'}</button>
          <button type="button" class="btn btn-ghost" id="btn-quit">回標題</button>
        </div>
      </div>

      <div class="keypad demoted" id="keypad" aria-hidden="true">
        <p class="keypad-note">打字鍵盤已停用 — 請用麥克風攻擊</p>
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
    voice.stop()
    state.screen = 'title'
    stopLoop()
    render()
  })

  window.onkeydown = (e) => {
    if (e.key === 'Escape' && state.screen === 'fight') {
      voice.stop()
      state.screen = 'title'
      stopLoop()
      render()
    }
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

  const pills = document.querySelectorAll('.stage-pill')
  if (pills.length >= 2) {
    pills[0]!.className = `stage-pill ${stage1Passed || state.stage === 2 ? 'done' : state.stage === 1 ? 'current' : ''}`
    pills[1]!.className = `stage-pill ${state.stage === 2 ? 'current' : stage1Passed ? '' : 'locked'}`
  }
}

function lightPromptTarget(which: 'primary' | 'secondary') {
  const el = document.querySelector(
    which === 'primary' ? '#prompt-primary' : '#prompt-secondary',
  )
  el?.classList.add('lit-ok', 'pass')
}

async function tryMatch(transcript: string) {
  if (state.phase !== 'input' || !state.prompt || !state.mode) return
  const expected = state.stage === 1 ? state.prompt.stage1 : state.prompt.stage2
  const ok = matchStage(state.mode, state.stage, transcript, expected)
  if (!ok) return

  // Lock input so rematch / timer cannot race during the green hold
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

  // Stage 2 pass → green lamp, then attack
  state.status = '② 綠燈！出招'
  lightPromptTarget('secondary')
  updateVoiceHud()
  await wait(STAGE_OK_HOLD_MS)
  if (state.screen !== 'fight' || !state.prompt) return
  void resolveSuccess()
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

function playHeroAttackFx() {
  const hero = document.querySelector('#hero')
  const mon = document.querySelector('#monster')
  const fx = document.querySelector('#fx-slash')
  hero?.classList.add('attack-lunge')
  mon?.classList.add('hit')
  fx?.classList.add('active')
  if (lottieAnim && lottieReady) {
    lottieAnim.goToAndPlay(0, true)
  }
  spawnFloat('mon-dmg', `-${state.prompt?.damage ?? 0}`)
  setTimeout(() => {
    hero?.classList.remove('attack-lunge')
    mon?.classList.remove('hit')
    fx?.classList.remove('active')
  }, 450)
}

function playMonsterAttackFx() {
  const hero = document.querySelector('#hero')
  const mon = document.querySelector('#monster')
  mon?.classList.add('attack-lunge')
  hero?.classList.add('hit')
  spawnFloat('hero-dmg', `-${MONSTER_DMG}`)
  setTimeout(() => {
    mon?.classList.remove('attack-lunge')
    hero?.classList.remove('hit')
  }, 450)
}

function spawnFloat(cls: string, text: string) {
  const stage = document.querySelector('#stage')
  if (!stage) return
  const el = document.createElement('div')
  el.className = `damage-float ${cls}`
  el.textContent = text
  stage.appendChild(el)
  setTimeout(() => el.remove(), 800)
}

async function startFight(mode: GameMode) {
  const ok = await voice.ensurePermission()
  state.mode = mode
  state.screen = 'fight'
  state.heroHp = MAX_HP
  state.monsterHp = MAX_HP
  state.round = 0
  state.deck = createPromptDeck(mode)
  state.deckIndex = 0
  state.result = null
  state.heard = ''
  state.status = ok
    ? mode === 'zhuyin'
      ? '注音語音模式開始！'
      : '英文語音模式開始！'
    : '請點「啟用麥克風」允許權限'
  voice.setLang(speechLang(mode))
  render()
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
  // Keep mic running across rounds
  if (state.micStatus !== 'listening' && state.micStatus !== 'unsupported') {
    voice.setLang(speechLang(state.mode!))
    voice.start()
  }
}

async function resolveSuccess() {
  if (!state.prompt) return
  // May already be 'resolving' after stage-2 green hold
  if (state.phase !== 'input' && state.phase !== 'resolving') return
  state.phase = 'resolving'
  state.status = '雙階段通過！命中！'
  updateVoiceHud()
  const dmg = state.prompt.damage
  state.monsterHp = clamp(state.monsterHp - dmg, 0, MAX_HP)
  playHeroAttackFx()
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
  state.status = reason
  updateVoiceHud()
  state.heroHp = clamp(state.heroHp - MONSTER_DMG, 0, MAX_HP)
  playMonsterAttackFx()
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
  if (heroLabel) heroLabel.textContent = `勇者 ${Math.ceil(state.heroHp)}`
  if (monLabel) monLabel.textContent = `魔物 ${Math.ceil(state.monsterHp)}`
  const status = document.querySelector('#status')
  if (status) status.textContent = state.status
}

function endFight() {
  stopLoop()
  voice.stop()
  state.phase = 'idle'
  state.result = state.monsterHp <= 0 ? 'win' : 'lose'
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
