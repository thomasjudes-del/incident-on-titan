(() => {
  'use strict';

  const CREW_INITIAL = 3;
  let answerOrders = [];
  let choiceShownAt = 0;
  let responseTimes = [];

  mission.id = 'incident-001';
  mission.number = '001';

  const originalChoose = typeof window.choose === 'function' ? window.choose : choose;
  const originalCalculateScore = typeof window.calculateScore === 'function'
    ? window.calculateScore
    : calculateScore;

  function isFrench() {
    return document.documentElement.lang.toLowerCase().startsWith('fr');
  }

  function t(key, fallback) {
    return window.IOTI_I18N?.t(key) || fallback;
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
    return mission.scenes.map((_, sceneIndex) => rotate(base, (sceneIndex * direction) % 3));
  }

  function resetDecisionTiming() {
    choiceShownAt = 0;
    responseTimes = [];
  }

  answerOrders = buildAnswerOrders();

  window.startMission = function shuffledStartMission() {
    sceneIndex = 0;
    state = { ...mission.initial };
    choices = [];
    flags = new Set();
    answerOrders = buildAnswerOrders();
    resetDecisionTiming();
    window.renderScene();
  };

  window.renderScene = function shuffledRenderScene() {
    const scene = mission.scenes[sceneIndex];
    const order = answerOrders[sceneIndex] || [0, 1, 2];
    const markers = ['A', 'B', 'C'];

    choiceShownAt = 0;
    setSceneImage(scene.image, scene.title);
    const completion = 16 + Math.round((sceneIndex / mission.scenes.length) * 62);
    setStage('scene', `${t('scene', 'Scene')} ${sceneIndex + 1} / ${mission.scenes.length}`, completion);

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
    }).then(done => {
      if (!done) return;
      reveal('#sceneChoices');
      choiceShownAt = performance.now();
    });
  };

  window.choose = function timedChoose(originalIndex) {
    const responseMs = choiceShownAt > 0
      ? Math.max(0, performance.now() - choiceShownAt)
      : null;

    choiceShownAt = 0;
    if (responseMs !== null) responseTimes.push(responseMs);

    originalChoose(originalIndex);

    const recorded = choices[choices.length - 1];
    if (recorded && responseMs !== null) recorded.responseMs = Math.round(responseMs);
  };

  function speedComponent() {
    if (!responseTimes.length) return { averageSeconds: 0, adjustment: 0 };

    const averageSeconds = responseTimes.reduce((sum, value) => sum + value, 0)
      / responseTimes.length
      / 1000;

    const adjustment = Math.max(-60, Math.min(80, Math.round((10 - averageSeconds) * 10)));
    return {
      averageSeconds: Math.round(averageSeconds * 10) / 10,
      adjustment
    };
  }

  window.revealJudgment = function revealTimedJudgment() {
    const speed = speedComponent();
    const score = Math.max(0, Math.min(1000, originalCalculateScore() + speed.adjustment));
    const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
    const simulation = `#${mission.number}-${hashPath()}`;
    const result = {
      mission: mission.id,
      score,
      simulation,
      elapsed,
      state: { ...state },
      decision: window.sybilleDecision,
      path: choices.map(choice => choice.index),
      speed
    };
    window.renderScore(result);
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
          science: 'Science',
          tempo: 'Temps moyen de décision'
        }
      : {
          outcome: 'Operational outcome',
          initial: 'Initial',
          final: 'Final',
          change: 'Change',
          crew: 'Crew',
          energy: 'Energy',
          science: 'Science',
          tempo: 'Average decision time'
        };
  }

  function clampMetric(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function calculateCrew(finalHealth) {
    const health = clampMetric(finalHealth);
    const lost = health >= 60 ? 0 : health >= 40 ? 1 : health >= 20 ? 2 : 3;
    return {
      initial: CREW_INITIAL,
      final: Math.max(0, CREW_INITIAL - lost)
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
    const crew = calculateCrew(finalState.health);
    const enrichedResult = {
      ...result,
      initial: { ...initial },
      state: { ...finalState },
      crew
    };

    app.classList.remove('sybille-control', 'takeover-hit');
    window.result = enrichedResult;
    setStage('score', t('scoreStage', 'Score'), 100);

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

      <div class="decision-tempo">${labels.tempo} : <strong>${enrichedResult.speed?.averageSeconds || 0}s</strong> <span>${enrichedResult.speed?.adjustment >= 0 ? '+' : ''}${enrichedResult.speed?.adjustment || 0}</span></div>
      <div class="simulation">${t('simulationId', 'Simulation ID')}<br><strong>${enrichedResult.simulation}</strong></div>
      <div class="share-preview">
        <small>INCIDENT ${mission.number} · ${mission.role}</small>
        <strong>${t('scoreStage', 'Score')} ${enrichedResult.score}</strong>
        <span>${labels.crew} ${crew.final}/${crew.initial} · ${labels.energy} ${finalState.energy} · ${labels.science} ${finalState.science}</span>
        <em>${pathGlyphs(enrichedResult.path)}</em>
      </div>
      <div class="mission-time">${t('missionTime', 'Mission time')} ${enrichedResult.elapsed}s</div>
      <div class="nav stacked">
        <button class="primary" data-action="share-result" onclick="shareResult()">${t('shareResult', 'Share result')}</button>
        <button class="ghost" onclick="restartGame()">${t('playAgain', 'Play again')}</button>
      </div>
    `);
  };

  queueMicrotask(() => {
    if (app.dataset.stage === 'home') window.home();
  });
})();