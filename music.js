(() => {
  'use strict';

  const app = document.querySelector('#app');
  if (!app) return;

  const NORMAL_SRC = 'assets/audio/ioti-titan-pulse-v1.mp3?v=42';
  const SYBILLE_SRC = 'assets/audio/ioti-titan-pulse-v1-dark.mp3?v=42';
  const INTERFERENCE_SRC = 'assets/audio/sybille-takeover-interference.mp3?v=42';
  const SWITCH_DELAY_MS = 180;

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
          interference.muted = false;
          interferencePrimed = true;
        })
        .catch(error => console.error('Sybille interference could not be primed.', error));
    } else {
      interference.pause();
      interference.currentTime = 0;
      interference.muted = false;
      interferencePrimed = true;
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
    interference.muted = false;
    safePlay(interference, 'Sybille takeover interference');

    clearTimeout(switchTimer);
    switchTimer = window.setTimeout(() => {
      music.pause();
      music.src = SYBILLE_SRC;
      music.loop = true;
      music.currentTime = 0;
      music.load();
      safePlay(music, 'Sybille command loop');
    }, SWITCH_DELAY_MS);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || started) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startMusic();
  }, true);

  const observer = new MutationObserver(() => {
    if (app.classList.contains('sybille-control')) enterTakeover();
  });
  observer.observe(app, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (!started) return;

    if (document.hidden) {
      music.pause();
      interference.pause();
      return;
    }

    safePlay(music, takeover ? 'Sybille command loop' : 'Titan Pulse');
  });

  window.IOTI_AUDIO = {
    play: startMusic,
    enterTakeover
  };
})();
