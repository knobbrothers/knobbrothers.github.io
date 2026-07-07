import { useEffect, useRef, useCallback } from 'react'
import { Mp3Encoder } from '@breezystack/lamejs'
import { useClock } from './useClock'

// Vite resolves these at build time — lazy URL loaders keyed by relative path
const sampleUrls = import.meta.glob('../assets/samples/*.wav', {
  query: '?url',
  import: 'default',
})

// Glob keys are case-sensitive, but saved projects may reference samples with
// different casing (e.g. 'Kick.wav' from before the assets were normalized).
function resolveSampleUrl(filename) {
  const exact = sampleUrls[`../assets/samples/${filename}`]
  if (exact) return exact()
  const lower = `../assets/samples/${filename}`.toLowerCase()
  const key   = Object.keys(sampleUrls).find(k => k.toLowerCase() === lower)
  return key ? sampleUrls[key]() : undefined
}

// ─── Pure helpers (no closures on refs) ────────────────────────────────────

function scheduleNote(ctx, buffers, channel, step, time, masterGain) {
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

  const dest = masterGain ?? ctx.destination

  src.connect(velGain)
  velGain.connect(volGain)
  volGain.connect(panner)
  panner.connect(dest)

  src.start(time)
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAudioEngine({ state, setCurrentStep, customSamples = [], onLoopEnd }) {
  const buffersRef    = useRef({})        // filename → AudioBuffer
  const loadingRef    = useRef(new Set()) // filenames currently being fetched
  const stateRef      = useRef(state)     // always-current snapshot
  const masterGainRef = useRef(null)      // master gain node

  // Keep stateRef in sync on every render without restarting the clock
  useEffect(() => { stateRef.current = state }, [state])

  // Sync master gain value when masterVolume changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = state.masterVolume ?? 1.0
    }
  }, [state.masterVolume])

  // Stable refs for bpm/stepCount — passed to useClock so it never needs to
  // restart when only tempo or length changes
  const bpmRef       = useRef(state.bpm)
  const stepCountRef = useRef(state.stepCount)
  useEffect(() => {
    const pat = state.patterns?.[state.playingPatternIdx]
    bpmRef.current = pat?.bpm ?? state.bpm
  }, [state.bpm, state.playingPatternIdx, state.patterns])

  useEffect(() => {
    const pat = state.patterns?.[state.playingPatternIdx]
    stepCountRef.current = pat?.stepCount ?? state.stepCount
  }, [state.stepCount, state.playingPatternIdx, state.patterns])

  // Ensure masterGainNode is created and connected when ctx is available.
  // Uses a ref-based approach so onStep can call it without a dependency.
  const ensureMasterGainFn = useCallback((ctx) => {
    if (!masterGainRef.current || masterGainRef.current.context !== ctx) {
      const gain = ctx.createGain()
      gain.gain.value = stateRef.current.masterVolume ?? 1.0
      gain.connect(ctx.destination)
      masterGainRef.current = gain
    }
    return masterGainRef.current
  }, [])
  const ensureMasterGainRef = useRef(ensureMasterGainFn)
  useEffect(() => { ensureMasterGainRef.current = ensureMasterGainFn }, [ensureMasterGainFn])

  // ── onStep callback — called by useClock for every scheduled step ────────
  // Reads channels/swing from stateRef (always current) and schedules audio.
  const onStep = useCallback((ctx, step, baseTime, stepDuration) => {
    const masterGain   = ensureMasterGainRef.current(ctx)
    const currentState = stateRef.current
    const pat      = currentState.patterns?.[currentState.playingPatternIdx]
    const channels = pat?.channels ?? currentState.channels
    const globalSwing = pat?.swing ?? currentState.swing
    const hasSolo = channels.some(ch => ch.solo)

    channels.forEach(ch => {
      if (!ch.steps[step]) return
      const silenced = hasSolo ? !ch.solo : ch.muted
      if (silenced) return

      // Step probability check
      const prob = ch.probability?.[step] ?? 100
      if (prob < 100 && Math.random() * 100 >= prob) return

      const effectiveSwing = ch.swing > 0 ? ch.swing : globalSwing
      const swingOffset    = step % 2 === 1 ? effectiveSwing * stepDuration * 0.5 : 0

      // Roll: retrigger within the step slot
      const rollCount = ch.roll?.[step] ?? 1
      for (let i = 0; i < rollCount; i++) {
        scheduleNote(ctx, buffersRef.current, ch, step,
          baseTime + swingOffset + i * (stepDuration / rollCount), masterGain)
      }
    })
  }, []) // stable — always reads from stateRef.current / ensureMasterGainRef.current

  // ── Central clock ────────────────────────────────────────────────────────
  const { getCtx, nextBarTime } = useClock({
    playing: state.playing,
    bpmRef,
    stepCountRef,
    onStep,
    setCurrentStep,
    onLoopEnd,
  })

  // ── Sample loading ───────────────────────────────────────────────────────
  const loadSample = useCallback(async (filename) => {
    if (buffersRef.current[filename] || loadingRef.current.has(filename)) return
    loadingRef.current.add(filename)

    const ctx    = getCtx()
    const custom = customSamples.find(s => s.name === filename)
    const url    = custom
      ? custom.objectUrl
      : await resolveSampleUrl(filename)

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

  // ── MP3 export ───────────────────────────────────────────────────────────
  //
  // mode === 'current' (default): render current pattern N times
  // mode === 'song': render arrangement in order, concatenate AudioBuffers
  //
  const exportMp3 = useCallback(async ({ numBars, bitrate, onProgress, mode = 'current', patterns }) => {
    const SAMPLE_RATE = 44100

    // Helper: render one pattern's channels into an AudioBuffer
    async function renderPattern(channels, patSwing, patBpm, patStepCount, bars, progressFrom, progressTo) {
      const stepDuration = 60 / patBpm / 4
      const barDuration  = patStepCount * stepDuration
      const totalSeconds = bars * barDuration
      const totalSamples = Math.ceil(totalSeconds * SAMPLE_RATE)

      // Ensure every sample is decoded (loadSample caches into buffersRef).
      const allSamples = [...new Set(channels.map(ch => ch.sample))]
      await Promise.all(allSamples.map(name => loadSample(name)))

      const offlineCtx = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE)
      // AudioBuffers are not bound to a context, so reuse the already-decoded
      // live buffers rather than re-fetching and re-decoding for every export.
      const offlineBuffers = buffersRef.current

      // Schedule notes
      for (let bar = 0; bar < bars; bar++) {
        const barStart = bar * barDuration
        for (let step = 0; step < patStepCount; step++) {
          const baseTime = barStart + step * stepDuration
          const hasSolo  = channels.some(ch => ch.solo)
          channels.forEach(ch => {
            const silenced = hasSolo ? !ch.solo : ch.muted
            if (!ch.steps[step] || silenced) return
            // Step probability — match live playback so export sounds the same.
            const prob = ch.probability?.[step] ?? 100
            if (prob < 100 && Math.random() * 100 >= prob) return
            const effectiveSwing = ch.swing > 0 ? ch.swing : patSwing
            const swingOffset    = step % 2 === 1 ? effectiveSwing * stepDuration * 0.5 : 0
            const rollCount      = ch.roll?.[step] ?? 1
            for (let ri = 0; ri < rollCount; ri++) {
              scheduleNote(offlineCtx, offlineBuffers, ch, step,
                baseTime + swingOffset + ri * (stepDuration / rollCount))
            }
          })
        }
      }

      // Progress callbacks at each bar boundary
      for (let bar = 1; bar < bars; bar++) {
        const suspendAt = bar * barDuration
        offlineCtx.suspend(suspendAt).then(() => {
          onProgress(progressFrom + (progressTo - progressFrom) * (bar / bars))
          offlineCtx.resume()
        })
      }

      return offlineCtx.startRendering()
    }

    // ── Song mode ─────────────────────────────────────────────────────────
    if (mode === 'song' && patterns?.length) {
      onProgress(0)

      // Render each pattern in tab order
      const audioBuffers = []
      for (let ai = 0; ai < patterns.length; ai++) {
        const pat          = patterns[ai]
        const progressFrom = ai / patterns.length
        const progressTo   = (ai + 1) / patterns.length
        const buf = await renderPattern(
          pat.channels, pat.swing, pat.bpm, pat.stepCount,
          numBars, progressFrom, progressTo
        )
        audioBuffers.push(buf)
      }

      // Concatenate AudioBuffers
      const totalLength = audioBuffers.reduce((sum, b) => sum + b.length, 0)
      const combinedCtx = new OfflineAudioContext(2, totalLength, SAMPLE_RATE)
      let offset = 0
      for (const buf of audioBuffers) {
        const src = combinedCtx.createBufferSource()
        src.buffer = buf
        src.connect(combinedCtx.destination)
        src.start(offset / SAMPLE_RATE)
        offset += buf.length
      }
      onProgress(0.95)
      const finalBuffer = await combinedCtx.startRendering()
      onProgress(1)
      encodeAndDownload(finalBuffer, SAMPLE_RATE, bitrate)
      return
    }

    // ── Current pattern mode (default) ────────────────────────────────────
    const { bpm, swing: globalSwing, stepCount, channels } = stateRef.current
    onProgress(0)
    const audioBuffer = await renderPattern(channels, globalSwing, bpm, stepCount, numBars, 0, 1)
    onProgress(1)
    encodeAndDownload(audioBuffer, SAMPLE_RATE, bitrate)
  }, [loadSample])

  const initAudio = useCallback(() => {
    const ctx = getCtx()
    ensureMasterGainRef.current(ctx)
    return ctx
  }, [getCtx])

  return { initAudio, exportMp3, nextBarTime }
}

// ─── MP3 encode + download ──────────────────────────────────────────────────

function encodeAndDownload(audioBuffer, sampleRate, bitrate) {
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

  const encoder   = new Mp3Encoder(2, sampleRate, bitrate)
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

  const blob = new Blob(mp3Chunks, { type: 'audio/mpeg' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `beat-sequencer-${Date.now()}.mp3`
  a.click()
  URL.revokeObjectURL(url)
}
