// Generates minimal WAV drum samples for the sequencer
// Run once: node generate-samples.mjs

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_RATE = 44100;
const NUM_CHANNELS = 1;
const BITS = 16;

function writeWav(filename, samples) {
  const dataLength = samples.length * 2; // 16-bit = 2 bytes
  const buffer = Buffer.alloc(44 + dataLength);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // chunk size
  buffer.writeUInt16LE(1, 20);           // PCM
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS / 8, 28); // byte rate
  buffer.writeUInt16LE(NUM_CHANNELS * BITS / 8, 32); // block align
  buffer.writeUInt16LE(BITS, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  writeFileSync(join(__dirname, 'src/assets/samples', filename), buffer);
  console.log(`Written: ${filename} (${samples.length} samples)`);
}

function rng() {
  // Simple LCG for deterministic noise
  let s = 0xdeadbeef;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff * 2 - 1;
  };
}

// ----- KICK -----
function makeKick() {
  const duration = 0.4;
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = rng();
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 14);
    // Pitch sweeps from 180Hz → 40Hz
    const freq = 40 + 140 * Math.exp(-t * 25);
    const tone = Math.sin(2 * Math.PI * freq * t);
    const click = noise() * Math.exp(-t * 120) * 0.3;
    samples[i] = (tone * 0.9 + click) * env;
  }
  return samples;
}

// ----- SNARE -----
function makeSnare() {
  const duration = 0.25;
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = rng();
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const noiseEnv = Math.exp(-t * 18);
    const toneEnv = Math.exp(-t * 30);
    const toneFreq = 200;
    const tone = Math.sin(2 * Math.PI * toneFreq * t) * toneEnv * 0.3;
    const snNoise = noise() * noiseEnv * 0.8;
    samples[i] = (tone + snNoise) * 0.9;
  }
  return samples;
}

// ----- CLOSED HI-HAT -----
function makeHihatClosed() {
  const duration = 0.08;
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = rng();
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 80);
    // Band-limited noise: mix of high harmonics
    const base = noise();
    const hpf = base - Math.sin(2 * Math.PI * 3000 * t) * 0.1; // approximate HP
    samples[i] = hpf * env * 0.7;
  }
  return samples;
}

// ----- OPEN HI-HAT -----
function makeHihatOpen() {
  const duration = 0.35;
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = rng();
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 9);
    samples[i] = noise() * env * 0.65;
  }
  return samples;
}

// ----- CLAP -----
function makeClap() {
  const duration = 0.2;
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = rng();
  const samples = new Float32Array(n);
  // Multiple short bursts to emulate hand clap
  const bursts = [0, 0.005, 0.012, 0.020];
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    for (const offset of bursts) {
      const bt = t - offset;
      if (bt >= 0) val += noise() * Math.exp(-bt * 120) * 0.4;
    }
    const tail = noise() * Math.exp(-t * 25) * 0.2;
    samples[i] = (val + tail) * 0.9;
  }
  return samples;
}

// ----- TOM (low) -----
function makeTom() {
  const duration = 0.35;
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = rng();
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 12);
    const freq = 90 + 60 * Math.exp(-t * 20);
    const tone = Math.sin(2 * Math.PI * freq * t);
    const click = noise() * Math.exp(-t * 80) * 0.15;
    samples[i] = (tone * 0.85 + click) * env;
  }
  return samples;
}

// ----- RIM -----
function makeRim() {
  const duration = 0.08;
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = rng();
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 70);
    const tone = Math.sin(2 * Math.PI * 1800 * t) * 0.5;
    const click = noise() * 0.4;
    samples[i] = (tone + click) * env * 0.85;
  }
  return samples;
}

// ----- COWBELL -----
function makeCowbell() {
  const duration = 0.6;
  const n = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 7);
    const f1 = Math.sin(2 * Math.PI * 562 * t);
    const f2 = Math.sin(2 * Math.PI * 845 * t);
    samples[i] = (f1 * 0.6 + f2 * 0.4) * env * 0.8;
  }
  return samples;
}

writeWav('kick.wav', makeKick());
writeWav('snare.wav', makeSnare());
writeWav('hihat-closed.wav', makeHihatClosed());
writeWav('hihat-open.wav', makeHihatOpen());
writeWav('clap.wav', makeClap());
writeWav('tom.wav', makeTom());
writeWav('rim.wav', makeRim());
writeWav('cowbell.wav', makeCowbell());

console.log('\nAll samples generated in src/assets/samples/');
