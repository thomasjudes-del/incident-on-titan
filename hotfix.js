(() => {
  const screen = document.querySelector('#screen');
  if (!screen) return;

  function patchAcceptAssignment() {
    const buttons = [...screen.querySelectorAll('button')];
    const target = buttons.find(button => button.textContent.trim() === 'Accept assignment');
    if (!target || target.dataset.patched === 'true') return;

    target.dataset.patched = 'true';
    target.removeAttribute('onclick');
    target.addEventListener('click', event => {
      event.preventDefault();
      if (typeof window.role === 'function') {
        window.role();
      } else {
        console.error('Role screen function is unavailable.');
      }
    });
  }

  new MutationObserver(patchAcceptAssignment).observe(screen, {
    childList: true,
    subtree: true
  });

  patchAcceptAssignment();
})();
