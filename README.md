# Knobbrothers SQ-32

A browser-based step sequencer for building drum patterns and beats — no installation, no account.

## Features

- Up to **12 channels**, each with an independent sample, volume, pan, and swing
- **4 / 8 / 16 / 32 steps** per pattern (switch on the fly)
- **Per-channel colors** — each channel's active steps have a distinct color for quick visual reading
- **Solo & Mute** per channel — solo is radio-style (one at a time); solo wins over mute
- **Global swing** + per-channel swing override
- **Velocity editor** — click-drag per-step velocity (1–127)
- **MP3 export** — renders N bars offline and downloads as an MP3; respects solo/mute
- **Light / Dark mode** — toggle in the top-right corner, persisted across sessions
- **Custom samples** — upload your own WAV files per channel

## How to use

1. **Play / Stop** — click the Play button (or press the on-screen control). Playback loops automatically.
2. **Draw a pattern** — click any step button on a channel row to toggle it on (lit) or off.
3. **BPM** — click the BPM number and type, or use ↑ / ↓ arrow keys.
4. **Swing** — drag the Swing slider. Per-channel swing is in the channel's params panel.
5. **Length** — click 4, 8, 16, or 32 to change the pattern length. Existing steps are preserved.
6. **Mute / Solo** — M button silences a channel; S button solos it (all others go silent).
7. **Channel params** — click "SHOW PARAMS & VELOCITY" to expand volume, pan, swing, and sample controls.
8. **Upload a sample** — open a channel's params and click the sample name to open the sample picker.
9. **Export** — click Export MP3, choose bars and bitrate, and the browser downloads the file.
10. **Add / Remove channels** — use ADD CHANNEL (up to 12); remove a channel from its params panel.

## Limitations

- **Browser audio only** — no MIDI output, no DAW sync, no MIDI input
- **No save / load** — patterns exist only in memory and are lost on page refresh
- **Mono pattern** — one pattern at a time; no song mode or pattern chaining
- **WAV only** for custom samples (MP3/OGG not supported by the sample uploader)
- **Offline context for export** — very long exports (many bars at high BPM) may be slow
- **No undo** — step toggles and channel edits are immediate and irreversible

## Development

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build
```

Stack: React 19 + Vite, plain CSS (no modules), no TypeScript.
