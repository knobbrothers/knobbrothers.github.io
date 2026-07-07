import { useEffect, useRef, useCallback } from 'react'

const LOOKAHEAD = 0.25  // seconds ahead to schedule
const INTERVAL  = 20    // ms between scheduler ticks (used by clockWorker)

// ─── Central clock ─────────────────────────────────────────────────────────
//
// Owns the AudioContext, lookahead scheduler, and visual rAF loop.
// Consumers provide:
//   onStep(ctx, step, baseTime, stepDuration) — called for each scheduled step
//   setCurrentStep(step)                      — called from rAF for visual playhead
//
// Exposes:
//   getCtx()            — initialise / resume AudioContext (call on user gesture)
//   nextBarTime(bars)   — AudioContext time of the next bar boundary (for quantised scheduling)

export function useClock({ playing, bpmRef, stepCountRef, onStep, setCurrentStep, onLoopEnd }) {
  const ctxRef          = useRef(null)
  const nextNoteTimeRef = useRef(0)
  const currentStepRef  = useRef(0)
  const notesInQueueRef = useRef([])
  const schedulerRef    = useRef(null)
  const rafRef          = useRef(null)

  // Always-current callbacks without restarting the scheduler
  const onStepRef    = useRef(onStep)
  const onLoopEndRef = useRef(onLoopEnd)
  useEffect(() => { onStepRef.current    = onStep    }, [onStep])
  useEffect(() => { onLoopEndRef.current = onLoopEnd }, [onLoopEnd])

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext({ latencyHint: 'playback' })
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  useEffect(() => {
    if (!playing) {
      if (schedulerRef.current) {
        schedulerRef.current.postMessage('stop')
        schedulerRef.current.terminate()
        schedulerRef.current = null
      }
      cancelAnimationFrame(rafRef.current)
      setCurrentStep(-1)
      return
    }

    const ctx = getCtx()
    currentStepRef.current  = 0
    nextNoteTimeRef.current = ctx.currentTime + 0.05
    notesInQueueRef.current = []

    function tick() {
      if (ctx.state === 'suspended') { ctx.resume(); return }

      const stepDuration = 60 / bpmRef.current / 4
      const stepCount    = stepCountRef.current

      // Underrun recovery: if we fell >200ms behind (suspended tab, long GC, etc.),
      // skip ahead rather than firing a burst of notes all at once.
      if (nextNoteTimeRef.current < ctx.currentTime - 0.2) {
        const elapsed      = ctx.currentTime - nextNoteTimeRef.current
        const stepsSkipped = Math.ceil(elapsed / stepDuration)
        nextNoteTimeRef.current += stepsSkipped * stepDuration
        currentStepRef.current   = (currentStepRef.current + stepsSkipped) % stepCount
      }

      while (nextNoteTimeRef.current < ctx.currentTime + LOOKAHEAD) {
        const step     = currentStepRef.current
        const baseTime = nextNoteTimeRef.current

        onStepRef.current(ctx, step, baseTime, stepDuration)

        notesInQueueRef.current.push({ step, time: baseTime })
        nextNoteTimeRef.current += stepDuration
        const nextStep = (step + 1) % stepCount
        // Fire loop-end callback when wrapping back to step 0, then break so
        // React can re-render stateRef before we schedule the next pattern's steps.
        if (nextStep === 0 && onLoopEndRef.current) {
          onLoopEndRef.current()
          currentStepRef.current = nextStep
          break
        }
        currentStepRef.current = nextStep
      }
    }

    // Use a Web Worker for the tick interval — workers are not throttled in
    // background tabs, unlike setInterval on the main thread.
    const worker = new Worker(new URL('../workers/clockWorker.js', import.meta.url))
    worker.onmessage = tick
    worker.postMessage('start')
    schedulerRef.current = worker

    // Visual rAF — drains the queue to find the most recently fired step.
    // Only dispatch when the step actually advances: dispatching every frame
    // re-renders the whole app at ~60fps and starves the audio scheduler.
    let lastVisualStep = -1
    let lastDispatchedStep = -1
    function draw() {
      const queue = notesInQueueRef.current
      while (queue.length && queue[0].time <= ctx.currentTime) {
        lastVisualStep = queue[0].step
        queue.shift()
      }
      if (lastVisualStep !== lastDispatchedStep) {
        lastDispatchedStep = lastVisualStep
        setCurrentStep(lastVisualStep)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      schedulerRef.current.postMessage('stop')
      schedulerRef.current.terminate()
      cancelAnimationFrame(rafRef.current)
    }
    // bpmRef/stepCountRef are stable refs — reading them here needs no restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, getCtx, setCurrentStep])

  // Returns the AudioContext time of the start of bar `bars` from now.
  // Used by Backing Track to quantise loop triggers to bar boundaries.
  const nextBarTime = useCallback((bars = 1) => {
    if (!ctxRef.current) return 0
    const stepDuration    = 60 / bpmRef.current / 4
    const barDuration     = stepCountRef.current * stepDuration
    const stepsUntilBarEnd = stepCountRef.current - (currentStepRef.current % stepCountRef.current)
    // nextNoteTimeRef is the time of the *next* step to be scheduled
    return nextNoteTimeRef.current + stepsUntilBarEnd * stepDuration + (bars - 1) * barDuration
  }, [bpmRef, stepCountRef])

  return { getCtx, nextBarTime }
}
