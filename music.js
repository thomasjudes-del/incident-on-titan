(() => {
  'use strict';

  const STORAGE_KEY = 'ioti:music-muted:v4';
  const DEFAULT_VOLUME = 0.28;
  const AUDIO_CHUNKS = [
    'assets/audio/titan-pulse-v1-00.txt',
    'assets/audio/titan-pulse-v1-01.txt'
  ];

  const app = document.querySelector('#app');
  const toggle = document.querySelector('#musicToggle');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!app || !toggle || !AudioContextClass) return;

  let context = null;
  let masterGain = null;
  let mediaElement = null;
  let mediaNode = null;
  let normalGain = null;
  let takeoverGain = null;
  let windRig = null;
  let sourcePromise = null;
  let sourceUrl = null;
  let started = false;
  let muted = localStorage.getItem(STORAGE_KEY) === 'true';
  let takeoverActive = false;

  function language() {
    return document.documentElement.lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  function updateToggle() {
    const playing = started && !muted && mediaElement && !mediaElement.paused;
    const label = language() === 'fr'
      ? (playing ? 'Couper le son' : 'Activer le son')
      : (playing ? 'Mute sound' : 'Play sound');

    toggle.classList.toggle('is-on', Boolean(playing));
    toggle.classList.toggle('is-off', !playing);
    toggle.setAttribute('aria-pressed', String(Boolean(playing)));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  function base64ToBytes(base64) {
    const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function prepareSource() {
    if (sourcePromise) return sourcePromise;

    sourcePromise = Promise.all(
      AUDIO_CHUNKS.map(async path => {
        const response = await fetch(`${path}?v=32`, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Audio unavailable: ${path}`);
        return response.text();
      })
    )
      .then(parts => {
        const bytes = base64ToBytes(parts.join(''));
        if (bytes.byteLength < 100000) throw new Error('Incomplete Titan Pulse soundtrack.');

        sourceUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        mediaElement = new Audio(sourceUrl);
        mediaElement.loop = true;
        mediaElement.preload = 'auto';
        mediaElement.playsInline = true;
        mediaElement.setAttribute('playsinline', '');

        return new Promise((resolve, reject) => {
          let settled = false;

          const cleanup = () => {
            mediaElement.removeEventListener('canplay', ready);
            mediaElement.removeEventListener('canplaythrough', ready);
            mediaElement.removeEventListener('error', fail);
          };
          const ready = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(mediaElement);
          };
          const fail = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error('Browser could not decode Titan Pulse.'));
          };

          mediaElement.addEventListener('canplay', ready, { once: true });
          mediaElement.addEventListener('canplaythrough', ready, { once: true });
          mediaElement.addEventListener('error', fail, { once: true });
          mediaElement.load();

          setTimeout(() => {
            if (mediaElement.readyState >= 2) ready();
          }, 1500);
        });
      })
      .catch(error => {
        sourcePromise = null;
        console.error('Titan Pulse preload failed.', error);
        throw error;
      });

    return sourcePromise;
  }

  function ensureContext() {
    if (context) return context;

    context = new AudioContextClass();
    masterGain = context.createGain();
    masterGain.gain.value = 0;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.35;

    masterGain.connect(compressor);
    compressor.connect(context.destination);
    return context;
  }

  function ramp(param, value, seconds = 0.7) {
    if (!context || !param) return;
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function distortionCurve(amount = 10) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    for (let index = 0; index < samples; index += 1) {
      const x = index * 2 / samples - 1;
      curve[index] = ((3 + amount) * x * 20 * Math.PI / 180) /
        (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  function connectMediaGraph() {
    if (mediaNode) return;

    mediaNode = context.createMediaElementSource(mediaElement);
    normalGain = context.createGain();
    normalGain.gain.value = 1;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1500;
    lowpass.Q.value = 0.8;

    const resonance = context.createBiquadFilter();
    resonance.type = 'peaking';
    resonance.frequency.value = 300;
    resonance.Q.value = 0.9;
    resonance.gain.value = 7;

    const shaper = context.createWaveShaper();
    shaper.curve = distortionCurve();
    shaper.oversample = '2x';

    takeoverGain = context.createGain();
    takeoverGain.gain.value = 0;

    mediaNode.connect(normalGain);
    normalGain.connect(masterGain);

    mediaNode.connect(lowpass);
    lowpass.connect(resonance);
    resonance.connect(shaper);
    shaper.connect(takeoverGain);
    takeoverGain.connect(masterGain);
  }

  function seededNoise(seed = 2194) {
    let value = seed >>> 0;
    return () => {
      value = Math.imul(value ^ value >>> 15, 1 | value);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296 * 2 - 1;
    };
  }

  function makeNoiseBuffer(duration = 9) {
    const length = Math.round(duration * context.sampleRate);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    const random = seededNoise();
    let slow = 0;

    for (let index = 0; index < length; index += 1) {
      slow += 0.018 * (random() - slow);
      data[index] = random() * 0.56 + slow * 0.44;
    }
    return buffer;
  }

  function createWind() {
    if (windRig) return windRig;

    const source = context.createBufferSource();
    source.buffer = makeNoiseBuffer();
    source.loop = true;

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 45;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1250;
    lowpass.Q.value = 0.45;

    const panner = context.createStereoPanner();
    const gain = context.createGain();
    gain.gain.value = 0.075;

    const movement = context.createOscillator();
    movement.type = 'sine';
    movement.frequency.value = 0.043;
    const movementDepth = context.createGain();
    movementDepth.gain.value = 0.78;
    movement.connect(movementDepth);
    movementDepth.connect(panner.pan);

    const gustA = context.createOscillator();
    gustA.type = 'sine';
    gustA.frequency.value = 0.071;
    const gustAGain = context.createGain();
    gustAGain.gain.value = 0.029;
    gustA.connect(gustAGain);
    gustAGain.connect(gain.gain);

    const gustB = context.createOscillator();
    gustB.type = 'triangle';
    gustB.frequency.value = 0.113;
    const gustBGain = context.createGain();
    gustBGain.gain.value = 0.016;
    gustB.connect(gustBGain);
    gustBGain.connect(gain.gain);

    const rumble = context.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 38;
    const rumbleGain = context.createGain();
    rumbleGain.gain.value = 0.026;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(gain);
    gain.connect(masterGain);

    rumble.connect(rumbleGain);
    rumbleGain.connect(masterGain);

    source.start();
    movement.start();
    gustA.start();
    gustB.start();
    rumble.start();

    windRig = { gain, rumbleGain };
    return windRig;
  }

  function playWhoosh() {
    if (!context || muted || !started) return;

    const duration = 1.55;
    const source = context.createBufferSource();
    source.buffer = makeNoiseBuffer(duration);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(180, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4200, context.currentTime + 1.05);
    filter.frequency.exponentialRampToValueAtTime(850, context.currentTime + duration);

    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(-0.95, context.currentTime);
    panner.pan.linearRampToValueAtTime(0.95, context.currentTime + 1.18);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.34, context.currentTime + 0.94);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(masterGain);
    source.start();
    source.stop(context.currentTime + duration + 0.05);
  }

  function enterTakeover() {
    if (takeoverActive || !started || muted || !normalGain || !takeoverGain) return;
    takeoverActive = true;
    playWhoosh();
    ramp(normalGain.gain, 0.08, 1.05);
    ramp(takeoverGain.gain, 0.78, 1.25);
    if (windRig) {
      ramp(windRig.gain.gain, 0.13, 1.0);
      ramp(windRig.rumbleGain.gain, 0.05, 1.0);
    }
  }

  function leaveTakeover() {
    if (!takeoverActive) return;
    takeoverActive = false;
    if (normalGain) ramp(normalGain.gain, 1, 1.1);
    if (takeoverGain) ramp(takeoverGain.gain, 0, 0.9);
    if (windRig) {
      ramp(windRig.gain.gain, 0.075, 0.9);
      ramp(windRig.rumbleGain.gain, 0.026, 0.9);
    }
  }

  async function startSound() {
    muted = false;
    localStorage.setItem(STORAGE_KEY, 'false');

    try {
      const audioContext = ensureContext();
      const resumePromise = audioContext.state === 'suspended'
        ? audioContext.resume()
        : Promise.resolve();
      const audio = await prepareSource();
      await resumePromise;

      connectMediaGraph();
      createWind();
      await audio.play();

      started = true;
      ramp(masterGain.gain, DEFAULT_VOLUME, 0.8);
      if (app.classList.contains('sybille-control')) enterTakeover();
    } catch (error) {
      started = false;
      console.error('Titan Pulse could not start.', error);
    }

    updateToggle();
  }

  function stopSound() {
    muted = true;
    localStorage.setItem(STORAGE_KEY, 'true');
    if (masterGain) ramp(masterGain.gain, 0, 0.3);
    if (mediaElement && !mediaElement.paused) mediaElement.pause();
    updateToggle();
  }

  toggle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    const playing = started && !muted && mediaElement && !mediaElement.paused;
    if (playing) stopSound();
    else startSound();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || muted || started) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startSound();
  }, true);

  document.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => setTimeout(updateToggle, 0));
  });

  const takeoverObserver = new MutationObserver(() => {
    if (app.classList.contains('sybille-control')) enterTakeover();
    else leaveTakeover();
  });
  takeoverObserver.observe(app, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (!context || muted || !started || !mediaElement) return;
    if (document.hidden) {
      mediaElement.pause();
      context.suspend().catch(() => {});
    } else {
      context.resume()
        .then(() => mediaElement.play())
        .then(updateToggle)
        .catch(() => {});
    }
  });

  window.addEventListener('beforeunload', () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  });

  window.IOTI_AUDIO = {
    play: startSound,
    mute: stopSound,
    enterTakeover,
    leaveTakeover,
    playWhoosh
  };

  prepareSource().catch(() => {});
  updateToggle();
})();