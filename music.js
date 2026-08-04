(() => {
  'use strict';

  const STORAGE_KEY = 'ioti:music-muted:v3';
  const MUSIC_VOLUME = 0.32;
  const TAKEOVER_VOLUME = 0.18;
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';
  const AUDIO_CHUNKS = [
    'assets/audio/titan-pulse-v1-00.txt',
    'assets/audio/titan-pulse-v1-01.txt'
  ];

  const app = document.querySelector('#app');
  const toggle = document.querySelector('#musicToggle');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!app || !toggle) return;

  const music = new Audio(SILENT_WAV);
  music.preload = 'auto';
  music.playsInline = true;
  music.setAttribute('playsinline', '');

  let soundtrackUrl = null;
  let soundtrackPromise = null;
  let audioContext = null;
  let effectsGain = null;
  let windRig = null;
  let takeoverRig = null;
  let playing = false;
  let takeoverActive = false;
  let mutedPreference = localStorage.getItem(STORAGE_KEY) === 'true';

  function language() {
    return document.documentElement.lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  function updateToggle() {
    const label = language() === 'fr'
      ? (playing ? 'Couper le son' : 'Activer le son')
      : (playing ? 'Mute sound' : 'Play sound');

    toggle.classList.toggle('is-on', playing);
    toggle.classList.toggle('is-off', !playing);
    toggle.setAttribute('aria-pressed', String(playing));
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

  function prepareSoundtrack() {
    if (soundtrackPromise) return soundtrackPromise;

    soundtrackPromise = Promise.all(
      AUDIO_CHUNKS.map(async path => {
        const response = await fetch(`${path}?v=31`, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Audio unavailable: ${path}`);
        return response.text();
      })
    ).then(parts => {
      const bytes = base64ToBytes(parts.join(''));
      if (bytes.byteLength < 100000) throw new Error('Incomplete Titan Pulse soundtrack.');
      soundtrackUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      return soundtrackUrl;
    }).catch(error => {
      soundtrackPromise = null;
      console.error('Titan Pulse could not be prepared.', error);
      throw error;
    });

    return soundtrackPromise;
  }

  function ensureEffectsContext() {
    if (!AudioContextClass) return null;
    if (audioContext) return audioContext;

    audioContext = new AudioContextClass();
    effectsGain = audioContext.createGain();
    effectsGain.gain.value = 0;
    effectsGain.connect(audioContext.destination);
    return audioContext;
  }

  function ramp(param, value, seconds = 0.6) {
    if (!audioContext || !param) return;
    const now = audioContext.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
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
    const length = Math.round(duration * audioContext.sampleRate);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    const random = seededNoise();
    let slow = 0;

    for (let index = 0; index < length; index += 1) {
      slow += 0.018 * (random() - slow);
      data[index] = random() * 0.54 + slow * 0.46;
    }
    return buffer;
  }

  function createWind() {
    if (!audioContext || windRig) return windRig;

    const source = audioContext.createBufferSource();
    source.buffer = makeNoiseBuffer();
    source.loop = true;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 50;

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1350;
    lowpass.Q.value = 0.45;

    const panner = audioContext.createStereoPanner();
    const gain = audioContext.createGain();
    gain.gain.value = 0.075;

    const panLfo = audioContext.createOscillator();
    const panDepth = audioContext.createGain();
    panLfo.frequency.value = 0.043;
    panDepth.gain.value = 0.82;
    panLfo.connect(panDepth);
    panDepth.connect(panner.pan);

    const gust = audioContext.createOscillator();
    const gustDepth = audioContext.createGain();
    gust.type = 'triangle';
    gust.frequency.value = 0.089;
    gustDepth.gain.value = 0.032;
    gust.connect(gustDepth);
    gustDepth.connect(gain.gain);

    const rumble = audioContext.createOscillator();
    const rumbleGain = audioContext.createGain();
    rumble.frequency.value = 38;
    rumbleGain.gain.value = 0.022;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(gain);
    gain.connect(effectsGain);
    rumble.connect(rumbleGain);
    rumbleGain.connect(effectsGain);

    source.start();
    panLfo.start();
    gust.start();
    rumble.start();

    windRig = { gain, rumbleGain };
    return windRig;
  }

  function playWhoosh() {
    if (!audioContext || !playing) return;

    const duration = 1.55;
    const source = audioContext.createBufferSource();
    source.buffer = makeNoiseBuffer(duration);

    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(180, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4200, audioContext.currentTime + 1.05);
    filter.frequency.exponentialRampToValueAtTime(850, audioContext.currentTime + duration);

    const panner = audioContext.createStereoPanner();
    panner.pan.setValueAtTime(-0.95, audioContext.currentTime);
    panner.pan.linearRampToValueAtTime(0.95, audioContext.currentTime + 1.18);

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.34, audioContext.currentTime + 0.94);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(effectsGain);
    source.start();
    source.stop(audioContext.currentTime + duration + 0.05);
  }

  function createTakeoverDrone() {
    if (!audioContext || takeoverRig) return takeoverRig;

    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 46;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    filter.Q.value = 1.2;

    const gain = audioContext.createGain();
    gain.gain.value = 0;

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(effectsGain);
    oscillator.start();

    takeoverRig = { gain };
    return takeoverRig;
  }

  function enterTakeover() {
    if (takeoverActive || !playing) return;
    takeoverActive = true;
    music.volume = TAKEOVER_VOLUME;
    music.playbackRate = 0.92;
    music.preservesPitch = false;
    music.webkitPreservesPitch = false;

    playWhoosh();
    const drone = createTakeoverDrone();
    if (drone) ramp(drone.gain.gain, 0.09, 1.1);
    if (windRig) {
      ramp(windRig.gain.gain, 0.13, 1.0);
      ramp(windRig.rumbleGain.gain, 0.05, 1.0);
    }
  }

  function leaveTakeover() {
    takeoverActive = false;
    music.volume = MUSIC_VOLUME;
    music.playbackRate = 1;
    if (takeoverRig) ramp(takeoverRig.gain.gain, 0, 0.8);
    if (windRig) {
      ramp(windRig.gain.gain, 0.075, 0.9);
      ramp(windRig.rumbleGain.gain, 0.022, 0.9);
    }
  }

  async function startSound() {
    mutedPreference = false;
    localStorage.setItem(STORAGE_KEY, 'false');

    const context = ensureEffectsContext();
    if (context?.state === 'suspended') context.resume().catch(() => {});

    // Unlock the same audio element immediately inside the user gesture on iPhone.
    if (!soundtrackUrl) {
      music.src = SILENT_WAV;
      music.loop = false;
      music.play().then(() => music.pause()).catch(() => {});
    }

    try {
      const url = soundtrackUrl || await prepareSoundtrack();
      if (music.src !== url) {
        music.src = url;
        music.loop = true;
        music.volume = MUSIC_VOLUME;
        music.playbackRate = 1;
        music.load();
      }

      await music.play();
      playing = true;
      createWind();
      if (effectsGain) ramp(effectsGain.gain, 1, 0.8);
      if (app.classList.contains('sybille-control')) enterTakeover();
    } catch (error) {
      playing = false;
      console.error('Titan Pulse could not start.', error);
    }

    updateToggle();
  }

  function stopSound() {
    mutedPreference = true;
    localStorage.setItem(STORAGE_KEY, 'true');
    music.pause();
    playing = false;
    if (effectsGain) ramp(effectsGain.gain, 0, 0.3);
    updateToggle();
  }

  toggle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (playing) stopSound();
    else startSound();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || mutedPreference || playing) return;
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
    if (!playing) return;
    if (document.hidden) {
      music.pause();
      audioContext?.suspend().catch(() => {});
    } else {
      audioContext?.resume().catch(() => {});
      music.play().catch(() => {});
    }
  });

  window.addEventListener('beforeunload', () => {
    if (soundtrackUrl) URL.revokeObjectURL(soundtrackUrl);
  });

  window.IOTI_AUDIO = {
    play: startSound,
    mute: stopSound,
    enterTakeover,
    leaveTakeover,
    playWhoosh
  };

  prepareSoundtrack().catch(() => {});
  updateToggle();
})();