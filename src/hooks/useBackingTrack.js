import { useEffect, useRef } from 'react'

// ─── Backing track loop scheduler ──────────────────────────────────────────
//
// Decodes WAV blobs and loops them in sync with bar boundaries.
// Each track gets its own GainNode for volume control.

export function useBackingTrack({ backingTracks, playing, nextBarTime, getCtx }) {
  // Map<id, AudioBuffer> — decoded buffers keyed by track id
  const buffersRef  = useRef(new Map())
  // Map<id, AudioBufferSourceNode[]> — active sources per track
  const sourcesRef  = useRef(new Map())
  // Map<id, GainNode> — gain nodes per track
  const gainsRef    = useRef(new Map())
  const playingRef  = useRef(playing)
  // Always-current track list so scheduling / onended read live state
  // instead of a stale closure snapshot.
  const tracksRef   = useRef(backingTracks)
  useEffect(() => { tracksRef.current = backingTracks })

  function getTrack(id) {
    return tracksRef.current.find(t => t.id === id)
  }

  function stopTrack(id) {
    const sources = sourcesRef.current.get(id) ?? []
    sources.forEach(src => {
      try { src.onended = null; src.stop() } catch { /* already stopped */ }
    })
    sourcesRef.current.delete(id)
  }

  function scheduleTrackLoop(id, ctx, startAt) {
    const buffer = buffersRef.current.get(id)
    if (!buffer) return
    const track = getTrack(id)
    if (!track) return

    // Ensure gain node exists
    let gain = gainsRef.current.get(id)
    if (!gain) {
      gain = ctx.createGain()
      gain.connect(ctx.destination)
      gainsRef.current.set(id, gain)
    }
    gain.gain.value = track.active ? track.volume : 0

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(gain)
    src.start(startAt ?? nextBarTime(0))

    if (!sourcesRef.current.has(id)) sourcesRef.current.set(id, [])
    sourcesRef.current.get(id).push(src)

    // On ended: reschedule the next loop, reading CURRENT track state.
    src.onended = () => {
      const arr = sourcesRef.current.get(id)
      if (arr) {
        const i = arr.indexOf(src)
        if (i !== -1) arr.splice(i, 1)
      }
      if (!playingRef.current) return
      const latest = getTrack(id)
      if (!latest || !latest.active) return   // stopped or deactivated → don't reschedule
      scheduleTrackLoop(id, ctx, nextBarTime(1))
    }
  }

  // Decode new tracks when added; schedule immediately if already playing.
  useEffect(() => {
    backingTracks.forEach(async (track) => {
      if (buffersRef.current.has(track.id)) return
      try {
        const ctx      = getCtx()
        const response = await fetch(track.objectUrl)
        const ab       = await response.arrayBuffer()
        buffersRef.current.set(track.id, await ctx.decodeAudioData(ab))
        if (playingRef.current && getTrack(track.id)?.active) {
          scheduleTrackLoop(track.id, ctx)
        }
      } catch (err) {
        console.error('[backing] failed to decode:', track.name, err)
      }
    })
  }, [backingTracks, getCtx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop sources for removed tracks and clean up their nodes.
  useEffect(() => {
    const ids = new Set(backingTracks.map(t => t.id))
    for (const [id] of buffersRef.current) {
      if (!ids.has(id)) {
        stopTrack(id)
        buffersRef.current.delete(id)
        const gain = gainsRef.current.get(id)
        if (gain) { try { gain.disconnect() } catch { /* already gone */ } }
        gainsRef.current.delete(id)
      }
    }
  }, [backingTracks])

  // React to volume/active changes during playback: sync gain, and
  // start or stop loops so toggling active mid-playback takes effect.
  useEffect(() => {
    const ctx = playingRef.current ? getCtx() : null
    backingTracks.forEach(track => {
      const gain = gainsRef.current.get(track.id)
      if (gain) gain.gain.value = track.active ? track.volume : 0

      if (!playingRef.current) return
      const hasSource = (sourcesRef.current.get(track.id) ?? []).length > 0
      if (track.active && !hasSource && buffersRef.current.has(track.id)) {
        scheduleTrackLoop(track.id, ctx)   // activated mid-playback → start now
      } else if (!track.active && hasSource) {
        stopTrack(track.id)                // deactivated mid-playback → stop
      }
    })
  }, [backingTracks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle play/stop.
  useEffect(() => {
    playingRef.current = playing
    if (!playing) {
      for (const [id] of sourcesRef.current) stopTrack(id)
      return
    }
    const ctx       = getCtx()
    const startTime = nextBarTime(0)
    backingTracks.forEach(track => {
      if (!track.active || !buffersRef.current.has(track.id)) return
      scheduleTrackLoop(track.id, ctx, startTime)
    })
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps
}
