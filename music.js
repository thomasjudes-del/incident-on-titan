(() => {
  'use strict';

  const STORAGE_KEY = 'ioti:music-muted';
  const DEFAULT_VOLUME = 0.27;
  const MAIN_CHUNKS = [
    'assets/audio/titan-pulse-v1-game-00.txt',
    'assets/audio/titan-pulse-v1-game-01.txt'
  ];

  const app = document.querySelector('#app');
  const toggle = document.querySelector('#musicToggle');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!app || !toggle || !AudioContextClass) return;

  let context = null;
  let masterGain = null;
  let compressor = null;
  let mainSource = null;
  let mainGain = null;
  let mainStartedAt = 0;
  let decodedBuffer = null;
  let windRig = null;
  let takeoverRig = null;
  let loading = false;
  let started = false;
  let takeoverActive = false;
  let muted = localStorage.getItem(STORAGE_KEY) === 'true';

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

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  }

  const encodedAudioPromise = Promise.all(
    MAIN_CHUNKS.map(async path => {
      const response = await fetch(`${path}?v=28`, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Audio chunk unavailable: ${path}`);
      return response.text();
    })
  ).then(parts => base64ToArrayBuffer(parts.join('')));

  function ensureContext() {
    if (context) return context;

    context = new AudioContextClass();
    masterGain = context.createGain();
    masterGain.gain.value = 0;

    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.35;

    masterGain.connect(compressor);
    compressor.connect(context.destination);
    return context;
  }

  function ramp(param, value, seconds = 0.8) {
    if (!context || !param) return;
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  async function getDecodedBuffer() {
    if (decodedBuffer) return decodedBuffer;
    const audioContext = ensureContext();
    const encoded = await encodedAudioPromise;
    decodedBuffer = await audioContext.decodeAudioData(encoded.slice(0));
    return decodedBuffer;
  }

  function makeNoiseBuffer(duration = 8) {
    const length = Math.max(1, Math.round(duration * context.sampleRate));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 2194;

    for (let index = 0; index < length; index += 1) {
      seed = Math.imul(seed ^ seed >>> 15, 1 | seed);
      seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed);
      data[index] = (((seed ^ seed >>> 14) >>> 0) / 4294967296) * 2 - 1;
    }

    return buffer;
  }

  function connectLfo(target, frequency, depth, phaseDelay = 0) {
    const oscillator = context.createOscillator();
    const amount = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    amount.gain.value = depth;
    oscillator.connect(amount);
    amount.connect(target);
    oscillator.start(context.currentTime + phaseDelay);
    return { oscillator, amount };
  }

  function createWindLayer() {
    const source = context.createBufferSource();
    source.buffer = makeNoiseBuffer(9.7);
    source.loop = true;

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 48;
    highpass.Q.value = 0.42;

    const body = context.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 360;
    body.Q.value = 0.48;
    body.gain.value = 8;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4100;
    lowpass.Q.value = 0.36;

    const panner = context.createStereoPanner();
    panner.pan.value = 0;

    const gain = context.createGain();
    gain.gain.value = 0.066;

    source.connect(highpass);
    highpass.connect(body);
    body.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(gain);
    gain.connect(masterGain);

    const panLfos = [
      connectLfo(panner.pan, 0.031, 0.48),
      connectLfo(panner.pan, 0.071, 0.21, 0.17)
    ];
    const gustLfos = [
      connectLfo(gain.gain, 0.043, 0.024),
      connectLfo(gain.gain, 0.097, 0.014, 0.23),
      connectLfo(gain.gain, 0.013, 0.018, 0.41)
    ];

    const rumbleSource = context.createBufferSource();
    rumbleSource.buffer = makeNoiseBuffer(11.3);
    rumbleSource.loop = true;

    const rumbleFilter = context.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 145;
    rumbleFilter.Q.value = 0.72;

    const rumbleGain = context.createGain();
    rumbleGain.gain.value = 0.025;
    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    const rumbleLfos = [
      connectLfo(rumbleGain.gain, 0.027, 0.010),
      connectLfo(rumbleGain.gain, 0.083, 0.006, 0.11)
    ];

    source.start();
    rumbleSource.start();

    return {
      source,
      gain,
      rumbleSource,
      rumbleGain,
      allLfos: [...panLfos, ...gustLfos, ...rumbleLfos]
    };
  }

  function distortionCurve(amount = 16) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    for (let index = 0; index < samples; index += 1) {
      const x = index * 2 / samples - 1;
      curve[index] = ((3 + amount) * x * 18 * Math.PI / 180) /
        (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  function currentMainOffset() {
    if (!decodedBuffer || !context || !mainStartedAt) return 0;
    return Math.max(0, (context.currentTime - mainStartedAt) % decodedBuffer.duration);
  }

  function createTakeoverPulse() {
    const duration = 12.8;
    const length = Math.round(duration * context.sampleRate);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 742;
    const beat = 60 / 75;

    for (let index = 0; index < length; index += 1) {
      seed = Math.imul(seed ^ seed >>> 15, 1 | seed);
      seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed);
      const noise = (((seed ^ seed >>> 14) >>> 0) / 4294967296) * 2 - 1;
      const time = index / context.sampleRate;
      const phase = (time - 0.16) % beat;
      const age = phase < 0 ? phase + beat : phase;
      const envelope = age < 0.44
        ? Math.exp(-age * 8.2) * Math.min(1, age * 72)
        : 0;
      data[index] = noise * envelope;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 74;
    filter.Q.value = 1.25;

    const gain = context.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();

    return { source, filter, gain };
  }

  function createTakeoverRig() {
    if (takeoverRig || !decodedBuffer) return takeoverRig;

    const source = context.createBufferSource();
    source.buffer = decodedBuffer;
    source.loop = true;
    source.playbackRate.value = 0.90;
    if ('detune' in source) source.detune.value = -260;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1750;
    lowpass.Q.value = 0.76;

    const resonance = context.createBiquadFilter();
    resonance.type = 'peaking';
    resonance.frequency.value = 310;
    resonance.Q.value = 0.82;
    resonance.gain.value = 7.5;

    const shaper = context.createWaveShaper();
    shaper.curve = distortionCurve(11);
    shaper.oversample = '2x';

    const gain = context.createGain();
    gain.gain.value = 0;

    source.connect(lowpass);
    lowpass.connect(resonance);
    resonance.connect(shaper);
    shaper.connect(gain);
    gain.connect(masterGain);
    source.start(0, currentMainOffset());

    const pulse = createTakeoverPulse();
    takeoverRig = { source, lowpass, resonance, shaper, gain, pulse };
    return takeoverRig;
  }

  function playWhoosh() {
    if (!context || muted || !started) return;

    const duration = 1.65;
    const length = Math.round(duration * context.sampleRate);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 1001;

    for (let index = 0; index < length; index += 1) {
      seed = Math.imul(seed ^ seed >>> 15, 1 | seed);
      seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed);
      const noise = (((seed ^ seed >>> 14) >>> 0) / 4294967296) * 2 - 1;
      const time = index / context.sampleRate;
      const rise = Math.pow(Math.min(1, time / 1.08), 1.65);
      const tail = Math.exp(-Math.max(0, time - 1.08) * 7.4);
      data[index] = noise * rise * tail;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.62;
    filter.frequency.setValueAtTime(210, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4300, context.currentTime + 1.16);
    filter.frequency.exponentialRampToValueAtTime(900, context.currentTime + duration);

    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(-0.94, context.currentTime);
    panner.pan.linearRampToValueAtTime(0.94, context.currentTime + 1.28);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.34, context.currentTime + 1.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(masterGain);
    source.start();
    source.stop(context.currentTime + duration + 0.05);

    const sub = context.createOscillator();
    const subGain = context.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(96, context.currentTime + 0.68);
    sub.frequency.exponentialRampToValueAtTime(38, context.currentTime + 1.58);
    subGain.gain.setValueAtTime(0.0001, context.currentTime);
    subGain.gain.setValueAtTime(0.0001, context.currentTime + 0.64);
    subGain.gain.exponentialRampToValueAtTime(0.19, context.currentTime + 0.90);
    subGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.62);
    sub.connect(subGain);
    subGain.connect(masterGain);
    sub.start(context.currentTime + 0.64);
    sub.stop(context.currentTime + 1.68);
  }

  function enterTakeover() {
    if (takeoverActive || !started || muted) return;
    takeoverActive = true;
    const rig = createTakeoverRig();
    if (!rig) return;

    playWhoosh();
    ramp(mainGain.gain, 0.045, 1.15);
    ramp(rig.gain.gain, 0.25, 1.35);
    ramp(rig.pulse.gain.gain, 0.19, 1.05);
    if (windRig) {
      ramp(windRig.gain.gain, 0.115, 1.15);
      ramp(windRig.rumbleGain.gain, 0.052, 1.15);
    }
  }

  function leaveTakeover() {
    if (!takeoverActive) return;
    takeoverActive = false;
    if (mainGain) ramp(mainGain.gain, 1, 1.25);
    if (takeoverRig) {
      ramp(takeoverRig.gain.gain, 0, 0.95);
      ramp(takeoverRig.pulse.gain.gain, 0, 0.75);
    }
    if (windRig) {
      ramp(windRig.gain.gain, 0.066, 1.1);
      ramp(windRig.rumbleGain.gain, 0.025, 1.1);
    }
  }

  async function startMusic() {
    if (loading || muted) return;
    loading = true;
    updateToggle();

    try {
      const audioContext = ensureContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      const buffer = await getDecodedBuffer();

      if (!mainSource) {
        mainSource = audioContext.createBufferSource();
        mainSource.buffer = buffer;
        mainSource.loop = true;
        mainGain = audioContext.createGain();
        mainGain.gain.value = 1;
        mainSource.connect(mainGain);
        mainGain.connect(masterGain);
        mainSource.start(0);
        mainStartedAt = audioContext.currentTime;
        windRig = createWindLayer();
      }

      started = true;
      ramp(masterGain.gain, DEFAULT_VOLUME, 1.15);
      if (app.classList.contains('sybille-control')) enterTakeover();
    } catch (error) {
      console.error('The validated Titan Pulse MP3 could not start.', error);
    } finally {
      loading = false;
      updateToggle();
    }
  }

  function stopMusic() {
    muted = true;
    localStorage.setItem(STORAGE_KEY, 'true');
    ramp(masterGain?.gain, 0, 0.45);
    updateToggle();
  }

  async function enableMusic() {
    muted = false;
    localStorage.setItem(STORAGE_KEY, 'false');

    if (!started) {
      await startMusic();
      return;
    }

    if (context?.state === 'suspended') await context.resume();
    ramp(masterGain.gain, DEFAULT_VOLUME, 0.65);
    if (app.classList.contains('sybille-control')) enterTakeover();
    updateToggle();
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

  const takeoverObserver = new MutationObserver(() => {
    const red = app.classList.contains('sybille-control');
    if (red) enterTakeover();
    else leaveTakeover();
  });
  takeoverObserver.observe(app, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (!context || muted || !started) return;
    if (document.hidden) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  });

  encodedAudioPromise.catch(error => {
    console.error('Titan Pulse MP3 preload failed.', error);
  });

  window.IOTI_AUDIO = {
    enterTakeover,
    leaveTakeover,
    playWhoosh
  };

  updateToggle();
})();
