(() => {
  'use strict';

  const STORAGE_KEY = 'ioti:music-muted:v2';
  const DEFAULT_VOLUME = 0.28;
  const AUDIO_CHUNK = 'assets/audio/titan-pulse-v1-game-00.txt';

  const app = document.querySelector('#app');
  const toggle = document.querySelector('#musicToggle');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!app || !toggle || !AudioContextClass) return;

  let context = null;
  let masterGain = null;
  let compressor = null;
  let mediaElement = null;
  let mediaNode = null;
  let normalGain = null;
  let takeoverGain = null;
  let takeoverFilter = null;
  let takeoverShaper = null;
  let windRig = null;
  let sourceReadyPromise = null;
  let sourceUrl = null;
  let loading = false;
  let started = false;
  let failed = false;
  let takeoverActive = false;
  let muted = localStorage.getItem(STORAGE_KEY) === 'true';

  function language() {
    return document.documentElement.lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  function labels() {
    return language() === 'fr'
      ? {
          play: 'Activer la musique',
          mute: 'Couper la musique',
          loading: 'Chargement de la musique',
          retry: 'Relancer la musique'
        }
      : {
          play: 'Play music',
          mute: 'Mute music',
          loading: 'Loading music',
          retry: 'Retry music'
        };
  }

  function updateToggle() {
    const text = labels();
    const playing = started && !muted && !failed;

    toggle.classList.toggle('is-playing', playing);
    toggle.classList.toggle('is-muted', muted);
    toggle.classList.toggle('is-loading', loading);
    toggle.classList.toggle('is-error', failed);
    toggle.dataset.soundState = failed ? 'error' : loading ? 'loading' : muted ? 'muted' : playing ? 'playing' : 'ready';
    toggle.setAttribute('aria-pressed', String(playing));

    const label = failed ? text.retry : loading ? text.loading : playing ? text.mute : text.play;
    toggle.setAttribute('aria-label', label);
    toggle.title = label;

    const glyph = toggle.querySelector('span');
    if (glyph) glyph.textContent = failed ? '!' : '♪';
  }

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

  function ramp(param, value, seconds = 0.7) {
    if (!context || !param) return;
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
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
    if (sourceReadyPromise) return sourceReadyPromise;

    sourceReadyPromise = fetch(`${AUDIO_CHUNK}?v=29`, { cache: 'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`Audio unavailable: ${response.status}`);
        return response.text();
      })
      .then(encoded => {
        const bytes = base64ToBytes(encoded);
        if (bytes.byteLength < 10000) throw new Error('Audio payload is incomplete.');

        sourceUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        mediaElement = new Audio(sourceUrl);
        mediaElement.loop = true;
        mediaElement.preload = 'auto';
        mediaElement.playsInline = true;

        return new Promise((resolve, reject) => {
          const ready = () => {
            cleanup();
            resolve(mediaElement);
          };
          const error = () => {
            cleanup();
            reject(new Error('Browser could not decode Titan Pulse.'));
          };
          const cleanup = () => {
            mediaElement.removeEventListener('canplaythrough', ready);
            mediaElement.removeEventListener('canplay', ready);
            mediaElement.removeEventListener('error', error);
          };

          mediaElement.addEventListener('canplaythrough', ready, { once: true });
          mediaElement.addEventListener('canplay', ready, { once: true });
          mediaElement.addEventListener('error', error, { once: true });
          mediaElement.load();

          setTimeout(() => {
            if (mediaElement.readyState >= 2) ready();
          }, 1800);
        });
      })
      .catch(error => {
        sourceReadyPromise = null;
        throw error;
      });

    return sourceReadyPromise;
  }

  function distortionCurve(amount = 8) {
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

    takeoverFilter = context.createBiquadFilter();
    takeoverFilter.type = 'lowpass';
    takeoverFilter.frequency.value = 1500;
    takeoverFilter.Q.value = 0.8;

    const resonance = context.createBiquadFilter();
    resonance.type = 'peaking';
    resonance.frequency.value = 300;
    resonance.Q.value = 0.9;
    resonance.gain.value = 7;

    takeoverShaper = context.createWaveShaper();
    takeoverShaper.curve = distortionCurve(10);
    takeoverShaper.oversample = '2x';

    takeoverGain = context.createGain();
    takeoverGain.gain.value = 0;

    mediaNode.connect(normalGain);
    normalGain.connect(masterGain);

    mediaNode.connect(takeoverFilter);
    takeoverFilter.connect(resonance);
    resonance.connect(takeoverShaper);
    takeoverShaper.connect(takeoverGain);
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

  function createWindLayer() {
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

    windRig = { source, panner, gain, rumbleGain, movement, gustA, gustB, rumble };
    return windRig;
  }

  function playWhoosh() {
    if (!context || muted || !started) return;

    const duration = 1.55;
    const buffer = makeNoiseBuffer(duration);
    const source = context.createBufferSource();
    source.buffer = buffer;

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

    const impact = context.createOscillator();
    impact.type = 'sine';
    impact.frequency.setValueAtTime(92, context.currentTime + 0.62);
    impact.frequency.exponentialRampToValueAtTime(36, context.currentTime + 1.48);
    const impactGain = context.createGain();
    impactGain.gain.setValueAtTime(0.0001, context.currentTime);
    impactGain.gain.setValueAtTime(0.0001, context.currentTime + 0.58);
    impactGain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.82);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.5);
    impact.connect(impactGain);
    impactGain.connect(masterGain);
    impact.start(context.currentTime + 0.58);
    impact.stop(context.currentTime + 1.55);
  }

  function enterTakeover() {
    if (takeoverActive || !started || muted || !normalGain || !takeoverGain) return;
    takeoverActive = true;
    playWhoosh();
    ramp(normalGain.gain, 0.08, 1.05);
    ramp(takeoverGain.gain, 0.78, 1.25);
    if (windRig) {
      ramp(windRig.gain.gain, 0.13, 1.05);
      ramp(windRig.rumbleGain.gain, 0.055, 1.05);
    }
  }

  function leaveTakeover() {
    if (!takeoverActive) return;
    takeoverActive = false;
    if (normalGain) ramp(normalGain.gain, 1, 1.1);
    if (takeoverGain) ramp(takeoverGain.gain, 0, 0.9);
    if (windRig) {
      ramp(windRig.gain.gain, 0.075, 1.05);
      ramp(windRig.rumbleGain.gain, 0.026, 1.05);
    }
  }

  async function startMusic() {
    if (loading) return;

    loading = true;
    failed = false;
    muted = false;
    localStorage.setItem(STORAGE_KEY, 'false');
    updateToggle();

    try {
      const audioContext = ensureContext();
      const resumePromise = audioContext.state === 'suspended' ? audioContext.resume() : Promise.resolve();
      const audio = await prepareSource();
      await resumePromise;
      connectMediaGraph();
      createWindLayer();

      await audio.play();
      started = true;
      failed = false;
      ramp(masterGain.gain, DEFAULT_VOLUME, 1.05);

      if (app.classList.contains('sybille-control')) enterTakeover();
    } catch (error) {
      console.error('Titan Pulse could not start.', error);
      failed = true;
      started = false;
    } finally {
      loading = false;
      updateToggle();
    }
  }

  function muteMusic() {
    muted = true;
    localStorage.setItem(STORAGE_KEY, 'true');
    if (masterGain) ramp(masterGain.gain, 0, 0.35);
    if (mediaElement && !mediaElement.paused) mediaElement.pause();
    updateToggle();
  }

  async function unmuteMusic() {
    muted = false;
    failed = false;
    localStorage.setItem(STORAGE_KEY, 'false');

    if (!started || !mediaElement) {
      await startMusic();
      return;
    }

    try {
      const audioContext = ensureContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      await mediaElement.play();
      ramp(masterGain.gain, DEFAULT_VOLUME, 0.55);
      if (app.classList.contains('sybille-control')) enterTakeover();
    } catch (error) {
      console.error('Titan Pulse could not resume.', error);
      failed = true;
    }
    updateToggle();
  }

  toggle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    const playing = started && !muted && !failed;
    if (playing) muteMusic();
    else unmuteMusic();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || muted || started || loading) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startMusic();
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
        .catch(() => {});
    }
  });

  window.addEventListener('beforeunload', () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  });

  window.IOTI_AUDIO = {
    play: unmuteMusic,
    mute: muteMusic,
    enterTakeover,
    leaveTakeover,
    playWhoosh
  };

  prepareSource().catch(() => {
    failed = true;
    updateToggle();
  });
  updateToggle();
})();