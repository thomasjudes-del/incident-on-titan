(() => {
  'use strict';

  const app = document.querySelector('#app');
  if (!app) return;

  const NORMAL_VOLUME = 0.55;
  const DARK_VOLUME = 0.60;
  const CROSSFADE_MS = 850;

  function createAudio(src, { loop = false, volume = 1 } = {}) {
    const audio = document.createElement('audio');
    audio.src = src;
    audio.loop = loop;
    audio.preload = 'auto';
    audio.volume = volume;
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.load();
    return audio;
  }

  const normal = createAudio('assets/audio/ioti-titan-pulse-v1.mp3?v=38', {
    loop: true,
    volume: NORMAL_VOLUME
  });
  const dark = createAudio('assets/audio/ioti-titan-pulse-v1-dark.mp3?v=38', {
    loop: true,
    volume: 0
  });
  const whoosh = createAudio('assets/audio/sybille-takeover-whoosh.mp3?v=38', {
    volume: 1
  });

  let started = false;
  let takeover = false;
  let fadeFrame = 0;

  function safePlay(audio, label) {
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => console.error(`${label} could not start.`, error));
    }
    return playback;
  }

  function primeWhoosh() {
    whoosh.volume = 0;
    const playback = whoosh.play();
    if (playback && typeof playback.then === 'function') {
      playback
        .then(() => {
          whoosh.pause();
          whoosh.currentTime = 0;
          whoosh.volume = 1;
        })
        .catch(error => console.error('Sybille whoosh could not be primed.', error));
    } else {
      whoosh.pause();
      whoosh.currentTime = 0;
      whoosh.volume = 1;
    }
  }

  function startMusic() {
    if (started) return;

    normal.currentTime = 0;
    dark.currentTime = 0;
    normal.volume = NORMAL_VOLUME;
    dark.volume = 0;

    safePlay(normal, 'Titan Pulse');
    safePlay(dark, 'Titan Pulse dark loop');
    primeWhoosh();
    started = true;
  }

  function crossfadeToDark() {
    if (!started || takeover) return;
    takeover = true;

    if (Number.isFinite(normal.currentTime) && Number.isFinite(dark.duration) && dark.duration > 0) {
      dark.currentTime = normal.currentTime % dark.duration;
    }

    safePlay(dark, 'Titan Pulse dark loop');

    whoosh.pause();
    whoosh.currentTime = 0;
    whoosh.volume = 1;
    safePlay(whoosh, 'Sybille takeover whoosh');

    cancelAnimationFrame(fadeFrame);
    const startedAt = performance.now();
    const normalStart = normal.volume;
    const darkStart = dark.volume;

    const fade = now => {
      const progress = Math.min(1, (now - startedAt) / CROSSFADE_MS);
      const eased = progress * progress * (3 - 2 * progress);
      normal.volume = normalStart * (1 - eased);
      dark.volume = darkStart + (DARK_VOLUME - darkStart) * eased;

      if (progress < 1) {
        fadeFrame = requestAnimationFrame(fade);
      } else {
        normal.volume = 0;
        normal.pause();
        dark.volume = DARK_VOLUME;
      }
    };

    fadeFrame = requestAnimationFrame(fade);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || started) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startMusic();
  }, true);

  const observer = new MutationObserver(() => {
    if (app.classList.contains('sybille-control')) crossfadeToDark();
  });
  observer.observe(app, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (!started) return;

    if (document.hidden) {
      normal.pause();
      dark.pause();
      whoosh.pause();
      return;
    }

    if (takeover) {
      safePlay(dark, 'Titan Pulse dark loop');
    } else {
      safePlay(normal, 'Titan Pulse');
      safePlay(dark, 'Titan Pulse dark loop');
    }
  });

  window.IOTI_AUDIO = {
    play: startMusic,
    enterTakeover: crossfadeToDark
  };
})();
