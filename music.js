(() => {
  'use strict';

  const STORAGE_KEY = 'ioti:music-muted';
  const DURATION = 51.2;
  const SAMPLE_RATE = 22050;
  const DEFAULT_VOLUME = 0.22;
  const app = document.querySelector('#app');
  const toggle = document.querySelector('#musicToggle');

  if (!app || !toggle || (!window.AudioContext && !window.webkitAudioContext)) return;

  let context = null;
  let source = null;
  let gain = null;
  let buffer = null;
  let loading = false;
  let started = false;
  let muted = localStorage.getItem(STORAGE_KEY) === 'true';

  const clamp = value => Math.max(-1, Math.min(1, value));

  function language() {
    return document.documentElement.lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  function copy() {
    return language() === 'fr'
      ? {
          on: 'Couper la musique',
          off: 'Activer la musique',
          loading: 'Chargement de la musique'
        }
      : {
          on: 'Mute music',
          off: 'Play music',
          loading: 'Loading music'
        };
  }

  function updateToggle() {
    const labels = copy();
    const playing = started && !muted;
    toggle.classList.toggle('is-playing', playing);
    toggle.classList.toggle('is-loading', loading);
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', loading ? labels.loading : playing ? labels.on : labels.off);
    toggle.title = loading ? labels.loading : playing ? labels.on : labels.off;
  }

  function seededNoise(seed = 2194) {
    let value = seed >>> 0;
    return () => {
      value = Math.imul(value ^ value >>> 15, 1 | value);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296 * 2 - 1;
    };
  }

  function addTone(left, right, start, duration, frequency, amplitude, pan = 0, attack = 0.02, release = 0.5) {
    const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
    const last = Math.min(left.length, Math.floor((start + duration) * SAMPLE_RATE));
    const leftGain = Math.sqrt((1 - pan) * 0.5);
    const rightGain = Math.sqrt((1 + pan) * 0.5);

    for (let i = first; i < last; i += 1) {
      const age = (i - first) / SAMPLE_RATE;
      const remaining = (last - i) / SAMPLE_RATE;
      const envelope = Math.min(1, age / attack, remaining / release);
      const shimmer = 1 + 0.12 * Math.sin(2 * Math.PI * 0.41 * age);
      const sample = Math.sin(2 * Math.PI * frequency * age) * amplitude * envelope * shimmer;
      left[i] += sample * leftGain;
      right[i] += sample * rightGain;
    }
  }

  function addTick(left, right, time, strong, pan) {
    const random = seededNoise(Math.round(time * 1000) + (strong ? 7001 : 3011));
    const length = Math.floor((strong ? 0.14 : 0.09) * SAMPLE_RATE);
    const first = Math.floor(time * SAMPLE_RATE);
    const leftGain = Math.sqrt((1 - pan) * 0.5);
    const rightGain = Math.sqrt((1 + pan) * 0.5);

    for (let n = 0; n < length && first + n < left.length; n += 1) {
      const age = n / SAMPLE_RATE;
      const envelope = Math.exp(-age * (strong ? 27 : 43));
      const metallic = Math.sin(2 * Math.PI * (strong ? 940 : 1370) * age)
        + 0.45 * Math.sin(2 * Math.PI * (strong ? 1880 : 2740) * age);
      const sample = (metallic * 0.045 + random() * 0.026) * envelope * (strong ? 1.45 : 1);
      left[first + n] += sample * leftGain;
      right[first + n] += sample * rightGain;
    }
  }

  function addCrack(left, right, time, pan, seed) {
    const random = seededNoise(seed);
    const length = Math.floor(0.75 * SAMPLE_RATE);
    const first = Math.floor(time * SAMPLE_RATE);
    const leftGain = Math.sqrt((1 - pan) * 0.5);
    const rightGain = Math.sqrt((1 + pan) * 0.5);
    let filtered = 0;

    for (let n = 0; n < length && first + n < left.length; n += 1) {
      const age = n / SAMPLE_RATE;
      const burst = Math.exp(-age * 18) + 0.38 * Math.exp(-Math.max(0, age - 0.12) * 12) * (age > 0.12 ? 1 : 0);
      filtered += 0.22 * (random() - filtered);
      const resonance = Math.sin(2 * Math.PI * 112 * age) * Math.exp(-age * 5.2);
      const sample = filtered * 0.13 * burst + resonance * 0.035;
      left[first + n] += sample * leftGain;
      right[first + n] += sample * rightGain;
    }
  }

  function buildBuffer() {
    const length = Math.floor(DURATION * SAMPLE_RATE);
    const audioBuffer = new AudioBuffer({ length, numberOfChannels: 2, sampleRate: SAMPLE_RATE });
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const random = seededNoise(2194);
    let windA = 0;
    let windB = 0;
    const baseFrequencies = [73.42, 110, 146.83, 174.61];

    for (let i = 0; i < length; i += 1) {
      const t = i / SAMPLE_RATE;
      const edge = Math.min(1, t / 1.4, (DURATION - t) / 1.4);
      const breath = 0.74 + 0.26 * Math.sin(2 * Math.PI * t / 12.8 - 0.7);
      let pad = 0;

      for (let f = 0; f < baseFrequencies.length; f += 1) {
        const frequency = Math.round(baseFrequencies[f] * DURATION) / DURATION;
        pad += Math.sin(2 * Math.PI * frequency * t + f * 0.83) / (f + 1.5);
      }

      windA += 0.007 * (random() - windA);
      windB += 0.0021 * (windA - windB);
      const windPan = Math.sin(2 * Math.PI * t / 18.2857);
      const windLeft = Math.sqrt((1 - windPan) * 0.5);
      const windRight = Math.sqrt((1 + windPan) * 0.5);
      const distantPulse = Math.sin(2 * Math.PI * 36.71875 * t)
        * (0.012 + 0.008 * Math.pow(Math.sin(Math.PI * t / 6.4), 8));

      left[i] = pad * 0.042 * breath + windB * 0.11 * edge * windLeft + distantPulse;
      right[i] = pad * 0.042 * breath + windB * 0.11 * edge * windRight + distantPulse;
    }

    const beat = 60 / 75;
    for (let beatIndex = 0; beatIndex < 64; beatIndex += 1) {
      const time = 0.28 + beatIndex * beat;
      if (time >= DURATION - 0.2) break;
      const strong = beatIndex % 4 === 0;
      const pan = strong ? 0 : (beatIndex % 2 === 0 ? -0.38 : 0.38);
      addTick(left, right, time, strong, pan);
    }

    const motif = [146.83, 220, 261.63, 349.23, 329.63];
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const cycleStart = 2.1 + cycle * 12.8;
      motif.forEach((frequency, noteIndex) => {
        const start = cycleStart + [0, 1.6, 3.2, 5.6, 7.2][noteIndex];
        if (start < DURATION - 1.5) {
          const pan = Math.sin((cycle * motif.length + noteIndex) * 1.7) * 0.45;
          addTone(left, right, start, 2.5, frequency, noteIndex === 0 ? 0.078 : 0.058, pan, 0.07, 1.15);
          addTone(left, right, start, 1.9, frequency * 2, 0.018, -pan * 0.7, 0.03, 0.8);
        }
      });
    }

    addCrack(left, right, 10.7, -0.72, 7107);
    addCrack(left, right, 24.9, 0.68, 24901);
    addCrack(left, right, 37.6, -0.28, 37601);
    addCrack(left, right, 46.2, 0.82, 46201);

    let peak = 0;
    for (let i = 0; i < length; i += 1) {
      peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    }
    const normalization = peak > 0 ? 0.72 / peak : 1;
    for (let i = 0; i < length; i += 1) {
      left[i] = clamp(left[i] * normalization);
      right[i] = clamp(right[i] * normalization);
    }

    return audioBuffer;
  }

  function ensureContext() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context = new AudioContextClass();
      gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
    }
    return context;
  }

  async function fadeTo(value, seconds = 0.8) {
    if (!gain || !context) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + seconds);
  }

  async function startMusic() {
    if (loading || muted) return;
    loading = true;
    updateToggle();

    try {
      const audioContext = ensureContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      if (!buffer) buffer = buildBuffer();

      if (!source) {
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = DURATION;
        source.connect(gain);
        source.start();
      }

      started = true;
      await fadeTo(DEFAULT_VOLUME, 1.15);
    } catch (error) {
      console.warn('Titan Pulse could not start.', error);
    } finally {
      loading = false;
      updateToggle();
    }
  }

  async function stopMusic() {
    muted = true;
    localStorage.setItem(STORAGE_KEY, 'true');
    await fadeTo(0, 0.45);
    updateToggle();
  }

  async function enableMusic() {
    muted = false;
    localStorage.setItem(STORAGE_KEY, 'false');
    if (!started) await startMusic();
    else {
      if (context?.state === 'suspended') await context.resume();
      await fadeTo(DEFAULT_VOLUME, 0.65);
      updateToggle();
    }
  }

  toggle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (started && !muted) stopMusic();
    else enableMusic();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || muted || started) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startMusic();
  }, true);

  document.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => setTimeout(updateToggle, 0));
  });

  document.addEventListener('visibilitychange', () => {
    if (!context || muted || !started) return;
    if (document.hidden) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  });

  updateToggle();
})();
