(() => {
  'use strict';

  mission.character = {
    name: 'Mara',
    avatar: 'assets/avatars/mara.svg'
  };

  const t = (key, fallback) => window.IOTI_I18N?.t(key) || fallback;

  window.briefing = function characterBriefing() {
    startedAt = Date.now();
    setStage('brief', t('missionBrief', 'Mission brief'), 7);

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