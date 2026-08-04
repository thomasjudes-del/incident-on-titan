(() => {
  'use strict';

  const config = window.IOTI_MISSION_CONFIG;
  const scoringEngine = window.IOTI_SCORING_ENGINE;
  let answerOrders = [];
  let choiceShownAt = 0;
  let responseTimes = [];

  if (!config || !scoringEngine) {
    console.error('IOTI scoring configuration is unavailable.');
    return;
  }

  mission.id = config.id;
  mission.number = config.number;

  const originalChoose = typeof window.choose === 'function' ? window.choose : choose;

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

  function compatibilityState(outcome) {
    const initial = outcome.initial;
    const final = outcome.final;
    const clampPercent = value => Math.max(0, Math.min(100, Math.round(value)));

    return {
      crew: final.crew,
      health: clampPercent((final.crew / Math.max(1, initial.crew)) * 100),
      energy: clampPercent((final.energy / Math.max(1, initial.energy)) * 100),
      science: clampPercent((final.science / Math.max(1, config.scoring.scienceTarget)) * 100)
    };
  }

  window.revealJudgment = function revealScoredJudgment() {
    const evaluation = scoringEngine.evaluate({
      config,
      choiceTags: choices.map(choice => choice.tag),
      sybilleDecisionId: window.sybilleDecision?.id,
      responseTimes
    });
    const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
    const simulation = `#${mission.number}-${hashPath()}`;
    const result = {
      mission: config.id,
      score: evaluation.score,
      simulation,
      elapsed,
      state: compatibilityState(evaluation.outcome),
      canonical: evaluation.outcome,
      decision: window.sybilleDecision,
      path: choices.map(choice => choice.index),
      speed: evaluation.speed,
      scoring: evaluation.details
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

  function formatDelta(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function outcomeRow(label, initialValue, finalValue) {
    const delta = finalValue - initialValue;
    const deltaClass = delta > 0 ? 'gain' : delta < 0 ? 'loss' : 'neutral';

    return `
      <div class="outcome-row">
        <strong>${label}</strong>
        <span>${initialValue}</span>
        <span>${finalValue}</span>
        <em class="${deltaClass}">${formatDelta(delta)}</em>
      </div>`;
  }

  window.renderScore = function canonicalRenderScore(result) {
    const labels = copy();
    const canonical = result.canonical || {
      initial: { ...config.initial },
      final: { ...config.initial },
      delta: { crew: 0, energy: 0, science: 0 }
    };
    const enrichedResult = { ...result, canonical };

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
        ${outcomeRow(labels.crew, canonical.initial.crew, canonical.final.crew)}
        ${outcomeRow(labels.energy, canonical.initial.energy, canonical.final.energy)}
        ${outcomeRow(labels.science, canonical.initial.science, canonical.final.science)}
      </div>

      <div class="decision-tempo">${labels.tempo} : <strong>${enrichedResult.speed?.averageSeconds || 0}s</strong></div>
      <div class="simulation">${t('simulationId', 'Simulation ID')}<br><strong>${enrichedResult.simulation}</strong></div>
      <div class="share-preview">
        <small>INCIDENT ${mission.number} · ${mission.role}</small>
        <strong>${t('scoreStage', 'Score')} ${enrichedResult.score}</strong>
        <span>${labels.crew} ${canonical.final.crew} (${formatDelta(canonical.delta.crew)}) · ${labels.energy} ${canonical.final.energy} (${formatDelta(canonical.delta.energy)}) · ${labels.science} ${canonical.final.science} (${formatDelta(canonical.delta.science)})</span>
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
