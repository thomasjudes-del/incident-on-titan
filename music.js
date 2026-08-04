(() => {
  'use strict';

  const app = document.querySelector('#app');
  const toggle = document.querySelector('#soundToggle');
  if (!app) return;

  const NORMAL_SRC = 'assets/audio/ioti-titan-pulse-v1.mp3?v=45';
  const SYBILLE_SRC = 'assets/audio/ioti-titan-pulse-v1-dark.mp3?v=45';
  const INTERFERENCE_SRC = 'assets/audio/sybille-takeover-interference.mp3?v=45';
  const SOUND_KEY = 'ioti:sound-muted';
  const SWITCH_DELAY_MS = 180;

  function readMutedPreference() {
    try {
      return localStorage.getItem(SOUND_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function saveMutedPreference(value) {
    try {
      localStorage.setItem(SOUND_KEY, value ? '1' : '0');
    } catch (_) {}
  }

  function createAudio(src, { loop = false, muted = false } = {}) {
    const audio = document.createElement('audio');
    audio.src = src;
    audio.loop = loop;
    audio.preload = 'auto';
    audio.muted = muted;
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.load();
    return audio;
  }

  // One music element only. The human and Sybille tracks can never overlap.
  const music = createAudio(NORMAL_SRC, { loop: true });
  const interference = createAudio(INTERFERENCE_SRC, { muted: true });

  // Preload the Sybille file without starting a second player.
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'audio';
  preload.href = SYBILLE_SRC;
  document.head.appendChild(preload);

  let started = false;
  let takeover = false;
  let interferencePrimed = false;
  let switchTimer = 0;
  let muted = readMutedPreference();

  function isFrench() {
    return document.documentElement.lang.toLowerCase().startsWith('fr');
  }

  function updateToggle() {
    if (!toggle) return;

    const enabled = !muted;
    const state = toggle.querySelector('.sound-state');
    toggle.classList.toggle('is-on', enabled);
    toggle.classList.toggle('is-off', !enabled);
    toggle.setAttribute('aria-pressed', String(enabled));

    if (state) state.textContent = enabled ? 'ON' : 'OFF';

    const label = isFrench()
      ? (enabled ? 'Son activé. Appuyer pour couper le son.' : 'Son coupé. Appuyer pour activer le son.')
      : (enabled ? 'Sound on. Press to mute.' : 'Sound off. Press to enable sound.');

    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  function applyMutedState() {
    music.muted = muted;
    if (interferencePrimed || interference.paused === false) {
      interference.muted = muted;
    }
    updateToggle();
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    saveMutedPreference(muted);
    applyMutedState();
  }

  function safePlay(audio, label) {
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => console.error(`${label} could not start.`, error));
    }
    return playback;
  }

  function primeInterference() {
    if (interferencePrimed) return;
    interference.muted = true;
    interference.currentTime = 0;

    const playback = interference.play();
    if (playback && typeof playback.then === 'function') {
      playback
        .then(() => {
          interference.pause();
          interference.currentTime = 0;
          interferencePrimed = true;
          interference.muted = muted;
        })
        .catch(error => console.error('Sybille interference could not be primed.', error));
    } else {
      interference.pause();
      interference.currentTime = 0;
      interferencePrimed = true;
      interference.muted = muted;
    }
  }

  function startMusic() {
    if (started) return;

    clearTimeout(switchTimer);
    takeover = false;
    music.pause();
    music.src = NORMAL_SRC;
    music.loop = true;
    music.currentTime = 0;
    music.muted = muted;
    music.load();

    safePlay(music, 'Titan Pulse');
    primeInterference();
    started = true;
  }

  function enterTakeover() {
    if (!started || takeover) return;
    takeover = true;

    interference.pause();
    interference.currentTime = 0;
    interference.muted = muted;
    safePlay(interference, 'Sybille takeover interference');

    clearTimeout(switchTimer);
    switchTimer = window.setTimeout(() => {
      music.pause();
      music.src = SYBILLE_SRC;
      music.loop = true;
      music.currentTime = 0;
      music.muted = muted;
      music.load();
      safePlay(music, 'Sybille command loop');
    }, SWITCH_DELAY_MS);
  }

  toggle?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    setMuted(!muted);
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || started) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startMusic();
  }, true);

  const takeoverObserver = new MutationObserver(() => {
    if (app.classList.contains('sybille-control')) enterTakeover();
  });
  takeoverObserver.observe(app, { attributes: true, attributeFilter: ['class'] });

  const languageObserver = new MutationObserver(updateToggle);
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  document.addEventListener('visibilitychange', () => {
    if (!started) return;

    if (document.hidden) {
      music.pause();
      interference.pause();
      return;
    }

    safePlay(music, takeover ? 'Sybille command loop' : 'Titan Pulse');
  });

  applyMutedState();

  window.IOTI_AUDIO = {
    play: startMusic,
    enterTakeover,
    setMuted,
    get muted() { return muted; }
  };
})();
