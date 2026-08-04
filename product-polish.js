(() => {
  'use strict';

  const MISSION_SEQUENCE = '01';
  const CREW_INITIAL = 3;
  const GAMEPLAY_STAGES = new Set(['scene', 'sybille', 'score']);
  let answerOrders = [];

  mission.sequence = MISSION_SEQUENCE;

  function isFrench() {
    return document.documentElement.lang.toLowerCase().startsWith('fr');
  }

  function t(key, fallback) {
    return window.IOTI_I18N?.t(key) || fallback;
  }

  function missionCode() {
    return `M${mission.sequence}`;
  }

  function randomInt(max) {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffle(values) {
    const output = [...values];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const other = randomInt(index + 1);
      [output[index], output[other]] = [output[other], output[index]];
    }
    return output;
  }

  function rotate(values, offset) {
    return values.map((_, index) => values[(index + offset) % values.length]);
  }

  function buildAnswerOrders() {
    const base = shuffle([0, 1, 2]);
    const direction = randomInt(2) === 0 ? 1 : 2;
    return mission.scenes.map((_, scene) => rotate(base, (scene * direction) % 3));
  }

  function syncAppFrame() {
    document.body.classList.toggle('gameplay-locked', GAMEPLAY_STAGES.has(app.dataset.stage));
  }

  function syncMissionIdentity() {
    const stage = app.dataset.stage;
    const eyebrow = screen.querySelector('.eyebrow');
    if ((stage === 'home' || stage === 'brief') && eyebrow) {
      eyebrow.textContent = `MISSION ${mission.sequence} · INCIDENT ${mission.number}`;
    }
  }

  const originalSetStage = window.setStage;
  if (typeof originalSetStage === 'function') {
    window.setStage = function numberedStage(stage, label, completion) {
      const cleanLabel = String(label).replace(/^M\d+\s*·\s*/i, '');
      const result = originalSetStage(stage, `${missionCode()} · ${cleanLabel}`, completion);
      syncAppFrame();
      return result;
    };
  }

  if (stepText && !stepText.textContent.startsWith(missionCode())) {
    stepText.textContent = `${missionCode()} · ${stepText.textContent}`;
  }

  const stageObserver = new MutationObserver(() => {
    syncAppFrame();
    syncMissionIdentity();
  });
  stageObserver.observe(app, { attributes: true, attributeFilter: ['data-stage'] });

  const screenObserver = new MutationObserver(syncMissionIdentity);
  screenObserver.observe(screen, { childList: true, subtree: true });

  syncAppFrame();
  syncMissionIdentity();

  answerOrders = buildAnswerOrders();

  window.startMission = function shuffledStartMission() {
    sceneIndex = 0;
    state = { ...mission.initial };
    choices = [];
    flags = new Set();
    answerOrders = buildAnswerOrders();
    window.renderScene();
  };

  const originalChoose = window.choose;
  if (typeof originalChoose === 'function') {
    window.choose = function chooseDisplayedAnswer(originalIndex) {
      const displayOrder = answerOrders[sceneIndex] || [0, 1, 2];
      const displayIndex = Math.max(0, displayOrder.indexOf(originalIndex));
      originalChoose(originalIndex);
      const recorded = choices[choices.length - 1];
      if (recorded) {
        recorded.originalIndex = originalIndex;
        recorded.index = displayIndex;
      }
    };
  }

  window.renderScene = function shuffledRenderScene() {
    const scene = mission.scenes[sceneIndex];
    const order = answerOrders[sceneIndex] || [0, 1, 2];
    const markers = ['A', 'B', 'C'];

    setSceneImage(scene.image, scene.title);
    const completion = 16 + Math.round((sceneIndex / mission.scenes.length) * 62);
    window.setStage('scene', `${t('scene', 'Scene')} ${sceneIndex + 1} / ${mission.scenes.length}`, completion);

    view(`
      <div class="scene-dots">${mission.scenes.map((_, index) => `<i class="${index === sceneIndex ? 'active' : index < sceneIndex ? 'done' : ''}"></i>`).join('')}</div>
      <div class="eyebrow">${t('scene', 'Scene')} ${sceneIndex + 1} ${t('of', 'of')} ${mission.scenes.length}</div>
      <h1 class="headline scene-title">${scene.title}</h1>
      <div class="terminal-frame scene-terminal"><div class="terminal-label">${t('live', 'KHEPRI / LIVE')}</div><div id="sceneTransmission" class="terminal-text"></div></div>
      <div id="sceneChoices" class="delayed-ui">
        <div class="question">${t('command', 'Command?')}</div>
        <div class="choices">${order.map((originalIndex, displayIndex) => {
          const choice = scene.choices[originalIndex];
          return `
            <button class="choice" onclick="choose(${originalIndex})">
              <span class="choice-icon">${markers[displayIndex]}</span>
              <span><b>${choice.label}</b></span>
              <span class="arrow">›</span>
            </button>`;
        }).join('')}</div>
      </div>
    `);

    typeTransmission($('#sceneTransmission'), window.sceneTransmission(sceneIndex), {
      speed: 38,
      linePause: 560,
      finalPause: 520
    }).then(done => { if (done) reveal('#sceneChoices'); });
  };

  function copy() {
    return isFrench()
      ? {
          outcome: 'Bilan opérationnel',
          initial: 'Entrée',
          final: 'Sortie',
          change: 'Écart',
          crew: 'Équipage',
          energy: 'Énergie',
          science: 'Science'
        }
      : {
          outcome: 'Operational outcome',
          initial: 'Initial',
          final: 'Final',
          change: 'Change',
          crew: 'Crew',
          energy: 'Energy',
          science: 'Science'
        };
  }

  function clampMetric(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function calculateCrew(finalState) {
    const explicitLosses = Number.isFinite(Number(finalState.crewLosses))
      ? Math.round(Number(finalState.crewLosses))
      : 0;
    const lost = Math.max(0, Math.min(CREW_INITIAL, explicitLosses));
    return {
      initial: CREW_INITIAL,
      final: CREW_INITIAL - lost,
      lost
    };
  }

  function outcomeRow(label, initialValue, finalValue) {
    const initial = clampMetric(initialValue);
    const final = clampMetric(finalValue);
    const delta = final - initial;
    const deltaText = delta > 0 ? `+${delta}` : String(delta);
    const deltaClass = delta > 0 ? 'gain' : delta < 0 ? 'loss' : 'neutral';

    return `
      <div class="outcome-row">
        <strong>${label}</strong>
        <span>${initial}</span>
        <span>${final}</span>
        <em class="${deltaClass}">${deltaText}</em>
      </div>`;
  }

  function crewOutcomeRow(label, crew) {
    const delta = crew.final - crew.initial;
    const deltaClass = delta < 0 ? 'loss' : 'neutral';
    return `
      <div class="outcome-row">
        <strong>${label}</strong>
        <span>${crew.initial}</span>
        <span>${crew.final}</span>
        <em class="${deltaClass}">${delta}</em>
      </div>`;
  }

  window.renderScore = function polishedRenderScore(result) {
    const labels = copy();
    const initial = result.initial || mission.initial;
    const finalState = result.state;
    const crew = calculateCrew(finalState);
    const enrichedResult = {
      ...result,
      initial: { ...initial },
      state: { ...finalState },
      crew,
      missionSequence: mission.sequence
    };

    app.classList.remove('sybille-control', 'takeover-hit');
    window.result = enrichedResult;
    window.setStage('score', t('scoreStage', 'Score'), 100);

    const energyDelta = clampMetric(finalState.energy) - clampMetric(initial.energy);
    const scienceDelta = clampMetric(finalState.science) - clampMetric(initial.science);
    const signed = value => value > 0 ? `+${value}` : String(value);

    view(`
      <div class="judgment-label">${t('scoreAttributed', 'Score attributed by Sybille AI')}</div>
      <div class="score-number">${enrichedResult.score}</div>
      <div class="score-max">${t('outOf1000', 'out of 1000')}</div>

      <div class="outcome-card">
        <div class="outcome-title">${labels.outcome}</div>
        <div class="outcome-head">
          <span></span><b>${labels.initial}</b><b>${labels.final}</b><b>${labels.change}</b>
        </div>
        ${crewOutcomeRow(labels.crew, crew)}
        ${outcomeRow(labels.energy, initial.energy, finalState.energy)}
        ${outcomeRow(labels.science, initial.science, finalState.science)}
      </div>

      <div class="simulation">${t('simulationId', 'Simulation ID')}<br><strong>${enrichedResult.simulation}</strong></div>
      <div class="share-preview">
        <small>MISSION ${mission.sequence} · INCIDENT ${mission.number} · ${mission.role}</small>
        <strong>${t('scoreStage', 'Score')} ${enrichedResult.score}</strong>
        <span>${labels.crew} ${crew.final}/${crew.initial} (${crew.final - crew.initial}) · ${labels.energy} ${finalState.energy} (${signed(energyDelta)}) · ${labels.science} ${finalState.science} (${signed(scienceDelta)})</span>
        <em>${pathGlyphs(enrichedResult.path)}</em>
      </div>
      <div class="mission-time">${t('missionTime', 'Mission time')} ${enrichedResult.elapsed}s</div>
      <div class="nav stacked">
        <button class="primary" data-action="share-result" onclick="shareResult()">${t('shareResult', 'Share result')}</button>
        <button class="ghost" onclick="restartGame()">${t('playAgain', 'Play again')}</button>
      </div>
    `);
  };
})();