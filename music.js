(() => {
  'use strict';

  const AUDIO_CHUNKS = [
    'assets/audio/titan-pulse-v1-00.txt',
    'assets/audio/titan-pulse-v1-01.txt'
  ];
  const DEFAULT_VOLUME = 0.28;
  const app = document.querySelector('#app');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!app || !AudioContextClass) return;

  let context = null;
  let gain = null;
  let source = null;
  let decodedBuffer = null;
  let decodePromise = null;
  let starting = false;
  let started = false;

  function decodeBase64Chunk(encoded) {
    const clean = encoded.replace(/[^A-Za-z0-9+/=]/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const encodedAudioPromise = Promise.all(
    AUDIO_CHUNKS.map(async path => {
      const response = await fetch(`${path}?v=34`, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Audio unavailable: ${path}`);
      return response.text();
    })
  ).then(parts => {
    // Each stored fragment is decoded independently, then the original MP3
    // bytes are joined. Joining the Base64 text itself caused the regressions.
    const chunks = parts.map(decodeBase64Chunk);
    const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;

    chunks.forEach(chunk => {
      merged.set(chunk, offset);
      offset += chunk.length;
    });

    if (merged.byteLength < 500000) {
      throw new Error('Titan Pulse MP3 is incomplete.');
    }
    return merged.buffer;
  });

  function ensureContext() {
    if (context) return context;

    context = new AudioContextClass();
    gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);
    return context;
  }

  function fadeTo(value, seconds = 1) {
    if (!context || !gain) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + seconds);
  }

  function decodeAudio(audioContext, arrayBuffer) {
    return new Promise((resolve, reject) => {
      const result = audioContext.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
      if (result && typeof result.then === 'function') {
        result.then(resolve, reject);
      }
    });
  }

  function getDecodedBuffer(audioContext) {
    if (decodedBuffer) return Promise.resolve(decodedBuffer);
    if (!decodePromise) {
      decodePromise = encodedAudioPromise
        .then(arrayBuffer => decodeAudio(audioContext, arrayBuffer))
        .then(buffer => {
          decodedBuffer = buffer;
          return buffer;
        })
        .catch(error => {
          decodePromise = null;
          throw error;
        });
    }
    return decodePromise;
  }

  async function startMusic() {
    if (starting || started) return;
    starting = true;

    try {
      const audioContext = ensureContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      const buffer = await getDecodedBuffer(audioContext);

      source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
      source.connect(gain);
      source.start(0);

      started = true;
      fadeTo(DEFAULT_VOLUME, 1.15);
    } catch (error) {
      console.error('The validated Titan Pulse MP3 could not start.', error);
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
    if (!context || !started) return;
    if (document.hidden) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  });

  encodedAudioPromise.catch(error => {
    console.error('Titan Pulse MP3 preload failed.', error);
  });

  window.IOTI_AUDIO = { play: startMusic };
})();
