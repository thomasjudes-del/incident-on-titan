(() => {
  'use strict';

  const app = document.querySelector('#app');
  if (!app) return;

  const NORMAL_VOLUME = 0.55;
  const DARK_VOLUME = 0.72;
  const INTERFERENCE_VOLUME = 0.95;
  const CROSSFADE_MS = 650;

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

  const normal = createAudio('assets/audio/ioti-titan-pulse-v1.mp3?v=39', {
    loop: true,
    volume: NORMAL_VOLUME
  });
  const dark = createAudio('assets/audio/ioti-titan-pulse-v1-dark.mp3?v=39', {
    loop: true,
    volume: 0
  });
  const interference = createAudio('assets/audio/sybille-takeover-interference.mp3?v=39', {
    volume: INTERFERENCE_VOLUME
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

  function primeInterference() {
    interference.volume = 0;
    const playback = interference.play();
    if (playback && typeof playback.then === 'function') {
      playback
        .then(() => {
          interference.pause();
          interference.currentTime = 0;
          interference.volume = INTERFERENCE_VOLUME;
        })
        .catch(error => console.error('Sybille interference could not be primed.', error));
    } else {
      interference.pause();
      interference.currentTime = 0;
      interference.volume = INTERFERENCE_VOLUME;
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
    primeInterference();
    started = true;
  }

  function crossfadeToDark() {
    if (!started || takeover) return;
    takeover = true;

    if (Number.isFinite(normal.currentTime) && Number.isFinite(dark.duration) && dark.duration > 0) {
      dark.currentTime = normal.currentTime % dark.duration;
    }

    safePlay(dark, 'Titan Pulse dark loop');

    interference.pause();
    interference.currentTime = 0;
    interference.volume = INTERFERENCE_VOLUME;
    safePlay(interference, 'Sybille takeover interference');

    cancelAnimationFrame(fadeFrame);
    const startedAt = performance.now();
    const normalStart = normal.volume;

    const fade = now => {
      const progress = Math.min(1, (now - startedAt) / CROSSFADE_MS);
      const angle = progress * Math.PI * 0.5;

      normal.volume = normalStart * Math.cos(angle);
      dark.volume = DARK_VOLUME * Math.sin(angle);

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
      interference.pause();
      return;
    }

    if (takeover) {
      normal.pause();
      normal.volume = 0;
      dark.volume = DARK_VOLUME;
      safePlay(dark, 'Titan Pulse dark loop');
    } else {
      normal.volume = NORMAL_VOLUME;
      dark.volume = 0;
      safePlay(normal, 'Titan Pulse');
      safePlay(dark, 'Titan Pulse dark loop');
    }
  });

  window.IOTI_AUDIO = {
    play: startMusic,
    enterTakeover: crossfadeToDark
  };
})();
