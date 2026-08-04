(() => {
  'use strict';

  const definition = window.IOTI_MISSION_DEFINITION;
  const i18n = window.IOTI_I18N;
  if (!definition || !i18n) return;

  const originalT = i18n.t.bind(i18n);
  const language = () => i18n.language === 'fr' ? 'fr' : 'en';
  const locale = () => definition.locales?.[language()] || definition.locales?.en || {};

  i18n.t = key => locale()[key] ?? originalT(key);
  const t = (key, fallback) => i18n.t(key) || fallback;

  function applyMissionLocale() {
    const copy = locale();
    mission.title = copy.title || definition.game.title;
    mission.role = copy.role || definition.game.role;
    mission.character = { ...definition.game.character };

    if (Array.isArray(copy.scenes)) {
      mission.scenes.forEach((scene, sceneIndex) => {
        const sceneCopy = copy.scenes[sceneIndex];
        if (!sceneCopy) return;
        scene.title = sceneCopy.title || scene.title;
        scene.choices.forEach((choice, choiceIndex) => {
          choice.label = sceneCopy.choices?.[choiceIndex] || choice.label;
        });
      });
    }
  }

  window.sceneTransmission = index => definition.getSceneTransmission?.(language(), index, flags) || '';
  window.inferSybilleDecision = () => definition.inferSybilleDecision(flags, language());

  window.home = function missionHome() {
    applyMissionLocale();
    app.classList.remove('sybille-control', 'takeover-hit');
    setStage('home', t('weeklyIncident', 'Weekly incident'), 0);
    view(`
      <div class="home-mark">IOTI</div>
      <div class="eyebrow">${t('weeklyIncident', 'Weekly incident')} #${mission.number}</div>
      <h1 class="headline">Incident on Titan</h1>
      <div id="homeTransmission" class="terminal-text compact-terminal"></div>
      <div class="home-meta"><span>${mission.title}</span><span>${t('approxTime', '≈ 5 minutes')}</span></div>
      <div id="homeAction" class="delayed-ui nav"><button class="primary" onclick="briefing()">${t('startMission', 'Start mission')}</button></div>
    `);
    typeTransmission($('#homeTransmission'), t('homeTransmission', ''), {
      speed: 45,
      linePause: 560,
      finalPause: 520
    }).then(done => { if (done) reveal('#homeAction'); });
  };

  window.briefing = function missionBriefing() {
    applyMissionLocale();
    startedAt = Date.now();
    setStage('brief', t('missionBrief', 'Mission brief'), 7);

    const initial = definition.scoring.initial;
    const labels = language() === 'fr'
      ? { title: 'État initial', crew: 'Équipage', energy: 'Énergie', science: 'Science' }
      : { title: 'Initial state', crew: 'Crew', energy: 'Energy', science: 'Science' };

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

    typeTransmission($('#briefTransmission .terminal-text'), t('briefTransmission', ''), {
      speed: 38,
      linePause: 560,
      finalPause: 520
    }).then(done => { if (done) reveal('#briefAction'); });
  };

  window.renderSybilleTakeover = function missionSybilleTakeover() {
    applyMissionLocale();
    const decision = window.inferSybilleDecision();
    window.sybilleDecision = decision;
    const optionIds = definition.sybille?.options || ['restore', 'vent', 'preserve'];

    setSceneImage(definition.sybille?.image || 'assets/scene-core.svg', t('sybilleControl', 'Sybille AI control'));
    setStage('sybille', t('sybilleControl', 'Sybille AI control'), 86);
    view(`
      <div class="sybille-seal"><span>△</span></div>
      <div class="eyebrow">${t('decisionWindow', 'Decision window')}</div>
      <div class="terminal-frame sybille-terminal">
        <div class="terminal-label">${t('critical', 'KHEPRI / CRITICAL')}</div>
        <div id="sybillePreamble" class="terminal-text"></div>
        <div id="sybilleCommand" class="terminal-text sybille-command"></div>
      </div>
      <div id="sybilleOptions" class="delayed-ui decision-options">
        ${optionIds.map(id => {
          const option = definition.getSybilleDecision(id, language());
          return `<div class="decision-option" data-decision="${option.label}"><span>${option.label}</span><i></i></div>`;
        }).join('')}
      </div>
      <div id="sybilleResult" class="delayed-ui sybille-result">
        <strong>${decision.line}</strong>
        <span>${t('sameCall', 'Would you have made the same call?')}</span>
        <div class="nav"><button class="primary" onclick="revealJudgment()">${t('revealScore', 'Reveal score')}</button></div>
      </div>
    `);

    typeTransmission($('#sybillePreamble'), t('takeoverPreamble', ''), {
      speed: 42,
      linePause: 620,
      finalPause: 700
    }).then(async done => {
      if (!done) return;
      activateSybilleControl();
      await sleep(330);
      const commandDone = await typeTransmission($('#sybilleCommand'), t('takeoverCommand', ''), {
        speed: 52,
        linePause: 760,
        finalPause: 650
      });
      if (!commandDone) return;
      reveal('#sybilleOptions');
      await sleep(950);
      const selected = [...document.querySelectorAll('.decision-option')]
        .find(option => option.dataset.decision === decision.label);
      if (selected) selected.classList.add('selected');
      applySybilleDecision(decision);
      await sleep(1100);
      reveal('#sybilleResult');
    });
  };

  applyMissionLocale();
  window.IOTI_APPLY_MISSION_LOCALE = applyMissionLocale;

  document.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => {
      applyMissionLocale();
      const stage = app.dataset.stage;
      if (stage === 'brief') return window.briefing();
      if (stage === 'scene') return window.renderScene();
      if (stage === 'sybille') return window.renderSybilleTakeover();
      if (stage === 'score' && window.result) return window.renderScore(window.result);
      return window.home();
    });
  });
})();
