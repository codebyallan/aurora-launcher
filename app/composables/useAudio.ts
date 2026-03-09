let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    ctx.onstatechange = () => {
      if (ctx && ctx.state === 'suspended') ctx.resume()
    }
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function envelope(gain: GainNode, now: number, attack: number, sustain: number, decay: number) {
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(sustain, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay)
}

function tone(
  freq: number,
  duration: number,
  volume = 0.18,
  type: OscillatorType = 'sine',
  startDelay = 0
) {
  const ac = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ac.destination)
  const now = ac.currentTime + startDelay
  envelope(gain, now, 0.005, volume, duration)
  osc.start(now)
  osc.stop(now + duration + 0.05)
}

function noise(duration: number, volume = 0.08, startDelay = 0) {
  const ac = getCtx()
  const bufferSize = ac.sampleRate * duration
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ac.createBufferSource()
  source.buffer = buffer
  const gain = ac.createGain()
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1200
  filter.Q.value = 0.8
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  const now = ac.currentTime + startDelay
  envelope(gain, now, 0.002, volume, duration)
  source.start(now)
}

export const SFX = {
  navigate() {
    tone(520, 0.06, 0.10, 'sine')
    noise(0.04, 0.04)
  },

  play() {
    tone(440, 0.10, 0.14, 'sine')
    tone(660, 0.14, 0.16, 'sine', 0.08)
    tone(880, 0.18, 0.18, 'sine', 0.18)
  },

  stop() {
    tone(660, 0.10, 0.14, 'sine')
    tone(440, 0.14, 0.14, 'sine', 0.09)
    tone(330, 0.20, 0.12, 'sine', 0.20)
  },

  delete() {
    tone(180, 0.05, 0.14, 'sawtooth')
    tone(120, 0.18, 0.16, 'sawtooth', 0.04)
    noise(0.12, 0.06)
  },

  save() {
    tone(660, 0.08, 0.14, 'sine')
    tone(880, 0.10, 0.16, 'sine', 0.07)
    tone(1100, 0.14, 0.14, 'sine', 0.15)
  },

  add() {
    tone(550, 0.08, 0.14, 'sine')
    tone(770, 0.10, 0.16, 'sine', 0.07)
    tone(1100, 0.16, 0.18, 'sine', 0.16)
    tone(1320, 0.20, 0.14, 'sine', 0.26)
  }
}
