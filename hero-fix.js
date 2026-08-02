(() => {
  const hero = document.querySelector('#heroImage');
  if (!hero) return;

  async function loadStoryboardHero() {
    try {
      const urls = [0, 1, 2, 3].map(i => new URL(`assets/start-${i}.txt?v=2`, document.baseURI));
      const responses = await Promise.all(urls.map(url => fetch(url, { cache: 'no-store' })));

      responses.forEach((response, index) => {
        if (!response.ok) throw new Error(`Hero chunk ${index} returned ${response.status}`);
      });

      const parts = await Promise.all(responses.map(response => response.text()));
      const base64 = parts.join('').replace(/\s+/g, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
      hero.onload = () => {
        hero.classList.add('loaded');
        URL.revokeObjectURL(objectUrl);
      };
      hero.onerror = error => console.error('Hero image decoding failed', error);
      hero.src = objectUrl;
    } catch (error) {
      console.error('Could not load the Titan storyboard hero', error);
    }
  }

  loadStoryboardHero();
})();
