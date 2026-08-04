(() => {
  'use strict';

  const app = document.querySelector('#app');
  if (!app) return;

  const music = document.createElement('audio');
  music.src = 'assets/audio/ioti-titan-pulse-v1.mp3?v=37';
  music.loop = true;
  music.preload = 'auto';
  music.volume = 0.55;
  music.playsInline = true;
  music.setAttribute('playsinline', '');
  music.load();

  let started = false;

  function startMusic() {
    if (started) return;
    const playback = music.play();
    if (playback && typeof playback.then === 'function') {
      playback
        .then(() => { started = true; })
        .catch(error => console.error('Titan Pulse MP3 could not start.', error));
    } else {
      started = true;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || started) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startMusic();
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (!started) return;
    if (document.hidden) music.pause();
    else music.play().catch(() => {});
  });

  window.IOTI_AUDIO = { play: startMusic };
})();
