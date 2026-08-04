(() => {
  'use strict';

  const AUDIO_CHUNKS = [
    'assets/audio/titan-pulse-v1-game-00.txt',
    'assets/audio/titan-pulse-v1-game-01.txt'
  ];
  const app = document.querySelector('#app');

  if (!app) return;

  let music = null;
  let sourceUrl = null;
  let sourcePromise = null;
  let started = false;
  let starting = false;

  function decodeChunk(encoded) {
    const clean = encoded.replace(/[^A-Za-z0-9+/=]/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function prepareMusic() {
    if (sourcePromise) return sourcePromise;

    sourcePromise = Promise.all(
      AUDIO_CHUNKS.map(async path => {
        const response = await fetch(`${path}?v=36`, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Audio unavailable: ${path}`);
        return response.text();
      })
    ).then(parts => {
      const chunks = parts.map(decodeChunk);
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;

      chunks.forEach(chunk => {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      });

      if (merged.byteLength < 100000) {
        throw new Error('Titan Pulse audio is incomplete.');
      }

      sourceUrl = URL.createObjectURL(new Blob([merged], { type: 'audio/mpeg' }));
      music = new Audio(sourceUrl);
      music.loop = true;
      music.preload = 'auto';
      music.volume = 0.28;
      music.playsInline = true;
      music.setAttribute('playsinline', '');
      music.load();
      return music;
    }).catch(error => {
      sourcePromise = null;
      console.error('Titan Pulse could not be prepared.', error);
      throw error;
    });

    return sourcePromise;
  }

  async function startMusic() {
    if (started || starting) return;
    starting = true;

    try {
      const audio = music || await prepareMusic();
      await audio.play();
      started = true;
    } catch (error) {
      console.error('Titan Pulse could not start.', error);
    } finally {
      starting = false;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button.primary');
    if (!button || started || starting) return;
    const stage = app.dataset.stage;
    if (stage === 'home' || stage === 'brief') startMusic();
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (!music || !started) return;
    if (document.hidden) music.pause();
    else music.play().catch(() => {});
  });

  window.addEventListener('beforeunload', () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  });

  window.IOTI_AUDIO = { play: startMusic };

  // Prepare the exact audio object before the first interaction. Playback itself
  // still begins only from the user's click on the mission button.
  prepareMusic().catch(() => {});
})();