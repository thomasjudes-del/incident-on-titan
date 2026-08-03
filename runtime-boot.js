(() => {
  queueMicrotask(() => {
    const currentApp = document.querySelector('#app');
    if (currentApp?.dataset.stage === 'home' && typeof window.home === 'function') {
      window.home();
    }
  });
})();
