(() => {
  'use strict';

  const config = window.IOTI_MISSION_CONFIG;

  mission.character = {
    name: config?.role?.character || 'Mara',
    avatar: 'assets/avatars/mara.svg'
  };

  const t = (key, fallback) => window.IOTI_I18N?.t(key) || fallback;
  const isFrench = () => document.documentElement.lang.toLowerCase().startsWith('fr');

  function initialStateCopy() {
    return isFrench()
      ? { title: 'État initial', crew: 'Équipage', energy: 'Énergie', science: 'Science' }
      : { title: 'Initial state', crew: 'Crew', energy: 'Energy', science: 'Science' };
  }

  window.briefing = function characterBriefing() {
    startedAt = Date.now();
    setStage('brief', t('missionBrief', 'Mission brief'), 7);

    const labels = initialStateCopy();
    const initial = config?.initial || { crew: 500, energy: 200, science: 100 };

    view(`
      <div class="eyebrow">${t('weeklyIncident', 'Weekly incident')} #${mission.number}</div>
      <h1 class="headline">${mission.title}</h1>
      <div class="role-panel role-identity">
        <div class="role-avatar"><img src="${mission.character.avatar}" alt="${mission.character.name} — ${mission.role}"></div>
        <div class="role-copy">
          <small>${t('yourRole', 'Your role')}</small>
          <strong>${mission.character.name}</strong>
          <span>${mission.role}</span>
        </div>
        <div class="initial-state" aria-label="${labels.title}">
          <small>${labels.title}</small>
          <div class="initial-state-grid">
            <span><b>${labels.crew}</b><strong>${initial.crew}</strong></span>
            <span><b>${labels.energy}</b><strong>${initial.energy}</strong></span>
            <span><b>${labels.science}</b><strong>${initial.science}</strong></span>
          </div>
        </div>
      </div>
      <div id="briefTransmission" class="terminal-frame"><div class="terminal-label">${t('incoming', 'KHEPRI / INCOMING')}</div><div class="terminal-text"></div></div>
      <div id="briefAction" class="delayed-ui nav"><button class="primary" onclick="startMission()">${t('openIncident', 'Open incident')}</button></div>
    `);

    typeTransmission(
      $('#briefTransmission .terminal-text'),
      t('briefTransmission', 'METHANE STORM APPROACHING KRAKEN MARE.\nORBITAL RELAY LOST IN 02:00:00.\nROVER K-7 HAS STOPPED OUTSIDE KHEPRI.'),
      { speed: 38, linePause: 560, finalPause: 520 }
    ).then(done => { if (done) reveal('#briefAction'); });
  };
})();
