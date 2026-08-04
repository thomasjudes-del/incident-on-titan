(() => {
  'use strict';

  const context = window.IOTI_MISSION_CONTEXT;
  if (!context) return;

  const currentEntry = context.registry.missions.find(item => item.id === context.currentMissionId);
  const archivedEntries = context.registry.missions.filter(item => item.id !== context.currentMissionId);
  const originalView = window.view;

  const copy = () => document.documentElement.lang.toLowerCase().startsWith('fr')
    ? {
        archived: 'Incident archivé',
        latest: `Mission actuelle : ${currentEntry?.number || context.currentMissionId}`,
        playLatest: 'Jouer au dernier incident',
        previous: 'Incidents précédents',
        close: 'Fermer'
      }
    : {
        archived: 'Archived incident',
        latest: `Latest incident: ${currentEntry?.number || context.currentMissionId}`,
        playLatest: 'Play latest incident',
        previous: 'Previous incidents',
        close: 'Close'
      };

  function missionUrl(id) {
    const url = new URL(location.href);
    url.searchParams.set('incident', id);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  window.IOTI_PLAY_LATEST = function playLatestIncident() {
    const url = new URL(location.href);
    url.searchParams.delete('incident');
    location.assign(`${url.pathname}${url.search}${url.hash}`);
  };

  window.IOTI_OPEN_MISSION = id => location.assign(missionUrl(id));

  function decorate() {
    const root = document.querySelector('#screen .screen-enter');
    if (!root) return;
    const labels = copy();

    if (context.isArchived) {
      const banner = document.createElement('div');
      banner.className = 'archive-banner';
      banner.innerHTML = `
        <span><strong>${labels.archived}</strong><small>${labels.latest}</small></span>
        <button type="button" onclick="IOTI_PLAY_LATEST()">${labels.playLatest}</button>
      `;
      root.prepend(banner);
    }

    if (app.dataset.stage === 'home' && archivedEntries.length) {
      const homeAction = root.querySelector('#homeAction');
      if (homeAction) {
        const history = document.createElement('div');
        history.className = 'incident-history';
        history.innerHTML = `
          <button class="history-toggle" type="button" aria-expanded="false">${labels.previous}</button>
          <div class="history-panel" hidden>
            ${archivedEntries.map(item => `
              <button type="button" onclick="IOTI_OPEN_MISSION('${item.id}')">
                <span>${item.number}</span><strong>${item.title}</strong>
              </button>
            `).join('')}
          </div>
        `;
        homeAction.insertAdjacentElement('afterend', history);
        const toggle = history.querySelector('.history-toggle');
        const panel = history.querySelector('.history-panel');
        toggle.addEventListener('click', () => {
          const expanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!expanded));
          panel.hidden = expanded;
          toggle.textContent = expanded ? labels.previous : labels.close;
        });
      }
    }

    if (context.isArchived && app.dataset.stage === 'score') {
      const nav = root.querySelector('.nav.stacked');
      if (nav && !nav.querySelector('[data-latest-incident]')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ghost';
        button.dataset.latestIncident = 'true';
        button.textContent = labels.playLatest;
        button.addEventListener('click', window.IOTI_PLAY_LATEST);
        nav.appendChild(button);
      }
    }
  }

  window.view = function missionAwareView(html) {
    const token = originalView(html);
    decorate();
    return token;
  };
})();
