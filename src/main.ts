import './style.css'
import lottie, { type AnimationItem } from 'lottie-web'
import {
  type GameMode,
  type PromptItem,
  createPromptDeck,
  charsNeeded,
} from './prompts'
import { ZHUYIN_ROWS } from './zhuyin'

const MAX_HP = 100
const MONSTER_DMG = 14

type Screen = 'title' | 'fight' | 'result'

interface State {
  screen: Screen
  mode: GameMode | null
  heroHp: number
  monsterHp: number
  round: number
  deck: PromptItem[]
  deckIndex: number
  prompt: PromptItem | null
  typed: string
  phase: 'idle' | 'input' | 'resolving'
  timeLeft: number
  timeMax: number
  result: 'win' | 'lose' | null
  status: string
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
  typed: '',
  phase: 'idle',
  timeLeft: 0,
  timeMax: 1,
  result: null,
  status: '',
}

const app = document.querySelector<HTMLDivElement>('#app')!
let rafId = 0
let lastTs = 0
let lottieAnim: AnimationItem | null = null
let lottieReady = false

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function render() {
  if (state.screen === 'title') {
    app.innerHTML = `
      <div class="screen title-screen active">
        <div class="title-badge">TYPE FIGHTER</div>
        <h1 class="game-title">勇者拼音快打</h1>
        <p class="subtitle">正確輸入招式口令，勇者出劍；打錯或太慢，魔物反擊！</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-mode="zhuyin" type="button">注音版</button>
          <button class="btn btn-english" data-mode="english" type="button">英文版</button>
        </div>
        <div class="howto">
          <strong>怎麼玩</strong><br/>
          · 畫面中央出現提示字 → 在時限內正確輸入<br/>
          · <strong>注音版</strong>：實體注音鍵盤或螢幕鍵盤點選（手機友善）<br/>
          · <strong>英文版</strong>：實體鍵盤或點螢幕字母<br/>
          · 打滿血條對方即勝；錯字／逾時會扣自己血
        </div>
      </div>
    `
    app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as GameMode
        startFight(mode)
      })
    })
    return
  }

  if (state.screen === 'result') {
    const win = state.result === 'win'
    app.innerHTML = `
      <div class="screen result-screen active ${win ? 'win' : 'lose'}">
        <h2>${win ? '勝利！' : '敗北…'}</h2>
        <p class="result-msg">
          ${win
            ? '魔物倒下了！你的指速拯救了村莊。'
            : '勇者力竭倒下。再練練拼音／打字吧！'}
        </p>
        <p class="result-msg">回合 ${state.round} · 模式：${state.mode === 'zhuyin' ? '注音' : '英文'}</p>
        <div class="mode-row">
          <button class="btn btn-zhuyin" data-again type="button">再來一局</button>
          <button class="btn btn-ghost" data-title type="button">回標題</button>
        </div>
      </div>
    `
    app.querySelector('[data-again]')!.addEventListener('click', () => {
      if (state.mode) startFight(state.mode)
    })
    app.querySelector('[data-title]')!.addEventListener('click', () => {
      state.screen = 'title'
      stopLoop()
      render()
    })
    return
  }

  // Fight
  const p = state.prompt
  const needed = p ? charsNeeded(p.text) : new Set<string>()
  const nextChar = p && state.typed.length < p.text.length ? p.text[state.typed.length] : ''

  const promptChars = p
    ? [...p.text]
        .map((ch, i) => {
          let cls = 'prompt-char'
          if (i < state.typed.length) cls += ' done'
          else if (i === state.typed.length && state.phase === 'input') cls += ' current'
          return `<span class="${cls}" data-i="${i}">${escapeHtml(ch)}</span>`
        })
        .join('')
    : ''

  const timerPct = state.timeMax > 0 ? clamp((state.timeLeft / state.timeMax) * 100, 0, 100) : 0

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

      <div class="prompt-panel">
        <div class="timer-bar"><div class="timer-fill" id="timer-fill" style="transform:scaleX(${timerPct / 100})"></div></div>
        <div class="prompt-row" id="prompt-row">${promptChars}</div>
        <div class="prompt-hint">${p?.hint ? `提示：${escapeHtml(p.hint)}` : state.mode === 'english' ? '請輸入上方英文' : '請輸入上方注音（可點鍵盤）'}</div>
        <div class="typed-line">${escapeHtml(state.typed) || '　'}</div>
        <div class="status-toast" id="status">${escapeHtml(state.status)}</div>
      </div>

      <div class="keypad" id="keypad">${buildKeypad(needed, nextChar)}</div>
      <input class="hidden-input" id="capture" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
    </div>
  `

  mountLottie()
  wireFightControls()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildKeypad(needed: Set<string>, nextChar: string): string {
  if (state.mode === 'english') {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    const rows = [letters.slice(0, 10), letters.slice(10, 19), letters.slice(19)]
    return (
      rows
        .map(
          (row) =>
            `<div class="key-row english-hints">${row
              .map((ch) => {
                let cls = 'key'
                if (needed.has(ch)) cls += ' needed'
                if (ch === nextChar) cls += ' next'
                return `<button type="button" class="${cls}" data-key="${ch}">${ch}</button>`
              })
              .join('')}</div>`,
        )
        .join('') +
      `<div class="key-row"><button type="button" class="key wide" data-key="Backspace">⌫ 刪除</button></div>`
    )
  }

  // Zhuyin: show full layout, highlight needed / next
  return (
    ZHUYIN_ROWS.map(
      (row) =>
        `<div class="key-row">${row
          .map((ch) => {
            let cls = 'key'
            if (needed.has(ch)) cls += ' needed'
            if (ch === nextChar) cls += ' next'
            return `<button type="button" class="${cls}" data-key="${escapeHtml(ch)}">${escapeHtml(ch)}</button>`
          })
          .join('')}</div>`,
    ).join('') +
    `<div class="key-row"><button type="button" class="key wide" data-key="Backspace">⌫ 刪除</button></div>`
  )
}

function wireFightControls() {
  const capture = document.querySelector<HTMLInputElement>('#capture')
  capture?.focus()

  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      const k = btn.dataset.key!
      if (k === 'Backspace') onBackspace()
      else onChar(k)
      capture?.focus()
    })
  })

  // Physical keyboard
  window.onkeydown = (e) => {
    if (state.screen !== 'fight' || state.phase !== 'input') return
    if (e.key === 'Backspace') {
      e.preventDefault()
      onBackspace()
      return
    }
    if (e.key === 'Escape') {
      state.screen = 'title'
      stopLoop()
      render()
      return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      let ch = e.key
      if (state.mode === 'english') ch = ch.toUpperCase()
      onChar(ch)
    }
  }

  // Soft focus for mobile when tapping stage/prompt
  app.addEventListener(
    'pointerdown',
    () => {
      if (state.screen === 'fight') capture?.focus()
    },
    { once: true },
  )
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

function startFight(mode: GameMode) {
  state.mode = mode
  state.screen = 'fight'
  state.heroHp = MAX_HP
  state.monsterHp = MAX_HP
  state.round = 0
  state.deck = createPromptDeck(mode)
  state.deckIndex = 0
  state.result = null
  state.status = mode === 'zhuyin' ? '注音模式開始！' : '英文模式開始！'
  render()
  nextRound()
  startLoop()
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
  state.typed = ''
  state.phase = 'input'
  state.timeMax = state.prompt.timeMs
  state.timeLeft = state.prompt.timeMs
  state.status = '輸入招式！'
  updateFightDomPartial()
}

/** Avoid full re-render every frame; refresh prompt/keypad when round changes */
function updateFightDomPartial() {
  // Full render on round change to refresh keypad highlights
  const keepPhase = state.phase
  render()
  state.phase = keepPhase
}

function onChar(ch: string) {
  if (state.phase !== 'input' || !state.prompt) return
  const expected = state.prompt.text[state.typed.length]
  if (ch === expected) {
    state.typed += ch
    refreshPromptChars()
    if (state.typed === state.prompt.text) {
      void resolveSuccess()
    }
  } else {
    flashWrong()
    void resolveFail('打錯了！')
  }
}

function onBackspace() {
  if (state.phase !== 'input' || !state.prompt) return
  if (state.typed.length === 0) return
  state.typed = state.typed.slice(0, -1)
  refreshPromptChars()
}

function refreshPromptChars() {
  const row = document.querySelector('#prompt-row')
  const typedLine = document.querySelector('.typed-line')
  if (!row || !state.prompt) return
  row.innerHTML = [...state.prompt.text]
    .map((ch, i) => {
      let cls = 'prompt-char'
      if (i < state.typed.length) cls += ' done'
      else if (i === state.typed.length && state.phase === 'input') cls += ' current'
      return `<span class="${cls}">${escapeHtml(ch)}</span>`
    })
    .join('')
  if (typedLine) typedLine.textContent = state.typed || '　'

  // Update next-key highlight without full keypad rebuild
  const next = state.prompt.text[state.typed.length] ?? ''
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((btn) => {
    const k = btn.dataset.key!
    btn.classList.toggle('next', k === next)
  })
}

function flashWrong() {
  const cur = document.querySelector('.prompt-char.current')
  cur?.classList.add('wrong-flash')
}

async function resolveSuccess() {
  if (state.phase !== 'input' || !state.prompt) return
  state.phase = 'resolving'
  state.status = '命中！'
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
        void resolveFail('太慢了！')
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
