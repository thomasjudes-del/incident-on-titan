(() => {
  'use strict';

  const STORAGE_KEY = 'ioti:music-muted';
  const DEFAULT_VOLUME = 0.22;
  const AUDIO_CHUNKS = [
    'assets/audio/titan-pulse-v1-game-00.txt',
    'assets/audio/titan-pulse-v1-game-01.txt'
  ];

  const app = document.querySelector('#app');
  const toggle = document.querySelector('#musicToggle');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!app || !toggle || !AudioContextClass) return;

  let context = null;
  let gain = null;
  let source = null;
  let decodedBuffer = null;
  let loading = false;
  let started = false;
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
    AUDIO_CHUNKS.map(async path => {
      const response = await fetch(`${path}?v=27`, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Audio chunk unavailable: ${path}`);
      return response.text();
    })
  ).then(parts => base64ToArrayBuffer(parts.join('')));

  function ensureContext() {
    if (!context) {
      context = new AudioContextClass();
      gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
    }
    return context;
  }

  function fadeTo(value, seconds = 0.8) {
    if (!gain || !context) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + seconds);
  }

  async function getDecodedBuffer() {
    if (decodedBuffer) return decodedBuffer;
    const audioContext = ensureContext();
    const encoded = await encodedAudioPromise;
    decodedBuffer = await audioContext.decodeAudioData(encoded.slice(0));
    return decodedBuffer;
  }

  async function startMusic() {
    if (loading || muted) return;
    loading = true;
    updateToggle();

    try {
      const audioContext = ensureContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      const buffer = await getDecodedBuffer();

      if (!source) {
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        source.start(0);
      }

      started = true;
      fadeTo(DEFAULT_VOLUME, 1.15);
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
    fadeTo(0, 0.45);
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
    fadeTo(DEFAULT_VOLUME, 0.65);
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

  document.addEventListener('visibilitychange', () => {
    if (!context || muted || !started) return;
    if (document.hidden) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  });

  encodedAudioPromise.catch(error => {
    console.error('Titan Pulse MP3 preload failed.', error);
  });

  updateToggle();
})();
