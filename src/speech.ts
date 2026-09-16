/**
 * Web Speech API wrapper (SpeechRecognition / webkitSpeechRecognition)
 */

export type SpeechStatus =
  | 'unsupported'
  | 'need-permission'
  | 'idle'
  | 'listening'
  | 'error'

export interface SpeechCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void
  onStatus: (status: SpeechStatus, detail?: string) => void
  onError?: (error: string) => void
}

type RecCtor = new () => SpeechRecognition

function getRecognitionCtor(): RecCtor | null {
  const w = window as Window & {
    SpeechRecognition?: RecCtor
    webkitSpeechRecognition?: RecCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && !!getRecognitionCtor()
}

export class VoiceRecognizer {
  private rec: SpeechRecognition | null = null
  private lang = 'zh-TW'
  private active = false
  private shouldRun = false
  private callbacks: SpeechCallbacks
  private restartTimer = 0

  constructor(callbacks: SpeechCallbacks) {
    this.callbacks = callbacks
  }

  setLang(lang: string) {
    this.lang = lang
    if (this.rec) this.rec.lang = lang
  }

  async ensurePermission(): Promise<boolean> {
    if (!isSpeechSupported()) {
      this.callbacks.onStatus('unsupported', '此瀏覽器不支援語音辨識')
      return false
    }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
      }
      this.callbacks.onStatus('idle', '麥克風已就緒')
      return true
    } catch {
      this.callbacks.onStatus('need-permission', '請允許麥克風權限')
      return false
    }
  }

  start() {
    if (!isSpeechSupported()) {
      this.callbacks.onStatus('unsupported')
      return
    }
    this.shouldRun = true
    this.ensureRec()
    this.begin()
  }

  stop() {
    this.shouldRun = false
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = 0
    }
    if (this.rec && this.active) {
      try {
        this.rec.onend = null
        this.rec.stop()
      } catch {
        /* ignore */
      }
    }
    this.active = false
    this.callbacks.onStatus('idle')
  }

  private ensureRec() {
    if (this.rec) return
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 3
    rec.lang = this.lang

    rec.onstart = () => {
      this.active = true
      this.callbacks.onStatus('listening')
    }

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = ''
      let finalText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i]!
        const alt = res[0]?.transcript ?? ''
        const alts: string[] = []
        for (let a = 0; a < res.length; a++) {
          const t = res[a]?.transcript
          if (t) alts.push(t)
        }
        const joined = alts.join(' | ')
        if (res.isFinal) finalText += (finalText ? ' ' : '') + (joined || alt)
        else interim += alt
      }
      if (finalText) this.callbacks.onResult(finalText, true)
      else if (interim) this.callbacks.onResult(interim, false)
    }

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      const err = ev.error || 'error'
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        this.shouldRun = false
        this.callbacks.onStatus('need-permission', '麥克風被拒絕')
        this.callbacks.onError?.(err)
        return
      }
      if (err === 'no-speech' || err === 'aborted') return
      this.callbacks.onError?.(err)
      this.callbacks.onStatus('error', err)
    }

    rec.onend = () => {
      this.active = false
      if (this.shouldRun) {
        // Safari / Chrome often end after one utterance — auto-restart
        this.restartTimer = window.setTimeout(() => {
          if (this.shouldRun) this.begin()
        }, 280)
      } else {
        this.callbacks.onStatus('idle')
      }
    }

    this.rec = rec
  }

  private begin() {
    if (!this.rec || !this.shouldRun) return
    try {
      this.rec.lang = this.lang
      this.rec.start()
    } catch {
      // InvalidStateError if already started — ignore
    }
  }
}
