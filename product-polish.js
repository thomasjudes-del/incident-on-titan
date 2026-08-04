(() => {
  'use strict';

  const neutralMarkers = ['A', 'B', 'C'];

  if (typeof mission !== 'undefined' && Array.isArray(mission.scenes)) {
    mission.scenes.forEach(scene => {
      scene.choices.forEach((choice, index) => {
        choice.icon = neutralMarkers[index] || String(index + 1);
      });
    });
  }

  function isFrench() {
    return document.documentElement.lang.toLowerCase().startsWith('fr');
  }

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

  window.renderScore = function polishedRenderScore(result) {
    const labels = copy();
    const initial = result.initial || mission.initial;
    const finalState = result.state;
    const enrichedResult = {
      ...result,
      initial: { ...initial },
      state: { ...finalState }
    };

    app.classList.remove('sybille-control', 'takeover-hit');
    window.result = enrichedResult;
    setStage('score', window.IOTI_I18N?.t('scoreStage') || 'Score', 100);

    const t = key => window.IOTI_I18N?.t(key) || key;
    const crewDelta = clampMetric(finalState.health) - clampMetric(initial.health);
    const energyDelta = clampMetric(finalState.energy) - clampMetric(initial.energy);
    const scienceDelta = clampMetric(finalState.science) - clampMetric(initial.science);
    const signed = value => value > 0 ? `+${value}` : String(value);

    view(`
      <div class="judgment-label">${t('scoreAttributed')}</div>
      <div class="score-number">${enrichedResult.score}</div>
      <div class="score-max">${t('outOf1000')}</div>

      <div class="outcome-card">
        <div class="outcome-title">${labels.outcome}</div>
        <div class="outcome-head">
          <span></span><b>${labels.initial}</b><b>${labels.final}</b><b>${labels.change}</b>
        </div>
        ${outcomeRow(labels.crew, initial.health, finalState.health)}
        ${outcomeRow(labels.energy, initial.energy, finalState.energy)}
        ${outcomeRow(labels.science, initial.science, finalState.science)}
      </div>

      <div class="simulation">${t('simulationId')}<br><strong>${enrichedResult.simulation}</strong></div>
      <div class="share-preview">
        <small>${t('weeklyIncident')} ${mission.number} · ${mission.role}</small>
        <strong>${t('scoreStage')} ${enrichedResult.score}</strong>
        <span>${labels.crew} ${finalState.health} (${signed(crewDelta)}) · ${labels.energy} ${finalState.energy} (${signed(energyDelta)}) · ${labels.science} ${finalState.science} (${signed(scienceDelta)})</span>
        <em>${pathGlyphs(enrichedResult.path)}</em>
      </div>
      <div class="mission-time">${t('missionTime')} ${enrichedResult.elapsed}s</div>
      <div class="nav stacked">
        <button class="primary" data-action="share-result" onclick="shareResult()">${t('shareResult')}</button>
        <button class="ghost" onclick="restartGame()">${t('playAgain')}</button>
      </div>
    `);
  };
})();