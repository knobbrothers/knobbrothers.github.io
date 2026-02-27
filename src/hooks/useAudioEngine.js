import { useEffect, useRef, useCallback } from 'react'
import { Mp3Encoder } from '@breezystack/lamejs'

const LOOKAHEAD = 0.1   // seconds ahead to schedule
const INTERVAL  = 25    // ms between scheduler ticks

// Vite resolves these at build time — lazy URL loaders keyed by relative path
const sampleUrls = import.meta.glob('../assets/samples/*.wav', {
  query: '?url',
  import: 'default',
})

// ─── Pure helpers (no closures on refs) ────────────────────────────────────

function scheduleNote(ctx, buffers, channel, step, time) {
  const buffer = buffers[channel.sample]
  if (!buffer) return

  const src      = ctx.createBufferSource()
  src.buffer     = buffer

  const velGain  = ctx.createGain()
  velGain.gain.value = channel.velocity[step] / 127  // 1–127 → 0.008–1.0

  const volGain  = ctx.createGain()
  volGain.gain.value = channel.volume

  const panner   = ctx.createStereoPanner()
  panner.pan.value = channel.pan

  src.connect(velGain)
  velGain.connect(volGain)
  volGain.connect(panner)
  panner.connect(ctx.destination)

  src.start(time)
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAudioEngine({ state, setCurrentStep, customSamples = [] }) {
  const ctxRef          = useRef(null)
  const buffersRef      = useRef({})        // filename → AudioBuffer
  const loadingRef      = useRef(new Set()) // filenames currently being fetched
  const stateRef        = useRef(state)     // always-current snapshot
  const nextNoteTimeRef = useRef(0)
  const currentStepRef  = useRef(0)
  const notesInQueueRef = useRef([])        // { step, time } for visual tracking
  const schedulerRef    = useRef(null)
  const rafRef          = useRef(null)

  // Keep stateRef in sync on every render without restarting the scheduler
  useEffect(() => { stateRef.current = state }, [state])

  // ── AudioContext creation (deferred until user gesture) ─────────────────
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  // ── Sample loading ───────────────────────────────────────────────────────
  const loadSample = useCallback(async (filename) => {
    if (buffersRef.current[filename] || loadingRef.current.has(filename)) return
    loadingRef.current.add(filename)

    const ctx = getCtx()
    const custom = customSamples.find(s => s.name === filename)
    const url = custom
      ? custom.objectUrl
      : await sampleUrls[`../assets/samples/${filename}`]?.()

    if (!url) {
      console.warn('[audio] sample not found:', filename)
      loadingRef.current.delete(filename)
      return
    }

    try {
      const response    = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      buffersRef.current[filename] = await ctx.decodeAudioData(arrayBuffer)
    } catch (err) {
      console.error('[audio] failed to load sample:', filename, err)
    } finally {
      loadingRef.current.delete(filename)
    }
  }, [getCtx, customSamples])

  // Evict buffer cache for custom samples so they always reload from blob URL
  useEffect(() => {
    customSamples.forEach(s => {
      delete buffersRef.current[s.name]
    })
  }, [customSamples])

  // Reload whenever channels change (new sample names appear)
  useEffect(() => {
    const names = [...new Set(state.channels.map(ch => ch.sample))]
    names.forEach(loadSample)
  }, [state.channels, loadSample])

  // ── Play / Stop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.playing) {
      clearInterval(schedulerRef.current)
      cancelAnimationFrame(rafRef.current)
      setCurrentStep(-1)
      return
    }

    const ctx = getCtx()
    currentStepRef.current  = 0
    nextNoteTimeRef.current = ctx.currentTime + 0.05  // small startup buffer
    notesInQueueRef.current = []

    // ── Scheduler tick ───────────────────────────────────────────────────
    function tick() {
      const { bpm, swing: globalSwing, stepCount, channels } = stateRef.current
      const stepDuration = 60 / bpm / 4  // one sixteenth note in seconds

      while (nextNoteTimeRef.current < ctx.currentTime + LOOKAHEAD) {
        const step     = currentStepRef.current
        const baseTime = nextNoteTimeRef.current

        const hasSolo = channels.some(ch => ch.solo)
        channels.forEach(ch => {
          if (!ch.steps[step]) return
          const silenced = hasSolo ? !ch.solo : ch.muted
          if (silenced) return

          // Per-channel swing overrides global when non-zero
          const effectiveSwing = ch.swing > 0 ? ch.swing : globalSwing
          // Odd-indexed steps (the "ands") get pushed forward
          const swingOffset = step % 2 === 1
            ? effectiveSwing * stepDuration * 0.5
            : 0

          scheduleNote(ctx, buffersRef.current, ch, step, baseTime + swingOffset)
        })

        // Queue entry uses base time so the visual doesn't jitter with swing
        notesInQueueRef.current.push({ step, time: baseTime })

        nextNoteTimeRef.current += stepDuration
        currentStepRef.current = (step + 1) % stepCount
      }
    }

    schedulerRef.current = setInterval(tick, INTERVAL)

    // ── Visual rAF loop ──────────────────────────────────────────────────
    // Drains the notesInQueue to find the most recently fired step
    let lastVisualStep = -1
    function draw() {
      const queue = notesInQueueRef.current
      while (queue.length && queue[0].time <= ctx.currentTime) {
        lastVisualStep = queue[0].step
        queue.shift()
      }
      setCurrentStep(lastVisualStep)
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      clearInterval(schedulerRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [state.playing, getCtx, setCurrentStep])

  // ── MP3 export ───────────────────────────────────────────────────────────
  //
  // Renders N bars silently via OfflineAudioContext, then encodes to MP3
  // with lamejs. Calls onProgress(0–1) at each bar boundary using
  // OfflineAudioContext.suspend() so the progress bar stays responsive.
  //
  const exportMp3 = useCallback(async ({ numBars, bitrate, onProgress }) => {
    const { bpm, swing: globalSwing, stepCount, channels } = stateRef.current
    const SAMPLE_RATE  = 44100
    const stepDuration = 60 / bpm / 4
    const barDuration  = stepCount * stepDuration
    const totalSeconds = numBars * barDuration
    const totalSamples = Math.ceil(totalSeconds * SAMPLE_RATE)

    // Ensure all required samples are loaded in the live context first,
    // then copy their AudioBuffer data into the offline context
    const liveCtx = getCtx()
    const allSamples = [...new Set(channels.map(ch => ch.sample))]
    await Promise.all(allSamples.map(async (name) => {
      if (!buffersRef.current[name]) await loadSample(name)
    }))

    const offlineCtx = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE)

    // Re-decode buffers in the offline context (can't share between contexts)
    const offlineBuffers = {}
    await Promise.all(
      allSamples.map(async (name) => {
        const src = buffersRef.current[name]
        if (!src) return
        const custom = customSamples.find(s => s.name === name)
        const url = custom
          ? custom.objectUrl
          : await sampleUrls[`../assets/samples/${name}`]?.()
        if (!url) return
        const response    = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        offlineBuffers[name] = await offlineCtx.decodeAudioData(arrayBuffer)
      })
    )

    // Schedule all notes for numBars repetitions
    for (let bar = 0; bar < numBars; bar++) {
      const barStart = bar * barDuration
      for (let step = 0; step < stepCount; step++) {
        const baseTime = barStart + step * stepDuration
        const hasSolo = channels.some(ch => ch.solo)
        channels.forEach(ch => {
          const silenced = hasSolo ? !ch.solo : ch.muted
          if (!ch.steps[step] || silenced) return
          const effectiveSwing = ch.swing > 0 ? ch.swing : globalSwing
          const swingOffset    = step % 2 === 1 ? effectiveSwing * stepDuration * 0.5 : 0
          scheduleNote(offlineCtx, offlineBuffers, ch, step, baseTime + swingOffset)
        })
      }
    }

    // Suspend at each bar boundary to fire progress callbacks
    for (let bar = 1; bar < numBars; bar++) {
      const suspendAt = bar * barDuration
      offlineCtx.suspend(suspendAt).then(() => {
        onProgress(bar / numBars)
        offlineCtx.resume()
      })
    }

    onProgress(0)
    const audioBuffer = await offlineCtx.startRendering()
    onProgress(1)

    // ── lamejs MP3 encode ────────────────────────────────────────────────
    const leftF32  = audioBuffer.getChannelData(0)
    const rightF32 = audioBuffer.getChannelData(1)

    function f32ToInt16(f32) {
      const out = new Int16Array(f32.length)
      for (let i = 0; i < f32.length; i++) {
        const s = Math.max(-1, Math.min(1, f32[i]))
        out[i]  = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      return out
    }

    const encoder   = new Mp3Encoder(2, SAMPLE_RATE, bitrate)
    const BLOCK     = 1152
    const mp3Chunks = []

    for (let i = 0; i < leftF32.length; i += BLOCK) {
      const leftBlock  = f32ToInt16(leftF32.subarray(i, i + BLOCK))
      const rightBlock = f32ToInt16(rightF32.subarray(i, i + BLOCK))
      const encoded    = encoder.encodeBuffer(leftBlock, rightBlock)
      if (encoded.length > 0) mp3Chunks.push(encoded)
    }
    const flushed = encoder.flush()
    if (flushed.length > 0) mp3Chunks.push(flushed)

    // ── Trigger download ─────────────────────────────────────────────────
    const blob = new Blob(mp3Chunks, { type: 'audio/mpeg' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `beat-sequencer-${Date.now()}.mp3`
    a.click()
    URL.revokeObjectURL(url)
  }, [getCtx, loadSample, customSamples])

  return { initAudio: getCtx, exportMp3 }
}
