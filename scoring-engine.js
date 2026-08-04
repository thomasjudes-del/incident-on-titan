(() => {
  'use strict';

  const DIMENSIONS = ['crew', 'energy', 'science'];
  const clamp01 = value => Math.max(0, Math.min(1, value));

  function addDelta(state, delta, initial) {
    DIMENSIONS.forEach(key => {
      const next = state[key] + Number(delta?.[key] || 0);
      state[key] = Math.max(0, Math.round(next));
    });
    state.crew = Math.min(initial.crew, state.crew);
  }

  function effectiveWeights(config) {
    const raw = {};
    let total = 0;

    DIMENSIONS.forEach(key => {
      raw[key] = Number(config.role.weights[key] || 0)
        * Number(config.missionPriorities[key] || 1)
        * Number(config.sybillePriorities[key] || 1);
      total += raw[key];
    });

    if (total <= 0) return { crew: 1 / 3, energy: 1 / 3, science: 1 / 3 };
    return Object.fromEntries(DIMENSIONS.map(key => [key, raw[key] / total]));
  }

  function simulate(config, choiceTags, sybilleDecisionId) {
    const initial = { ...config.initial };
    const final = { ...initial };

    choiceTags.forEach(tag => addDelta(final, config.choiceEffects[tag], initial));
    addDelta(final, config.sybilleEffects[sybilleDecisionId], initial);

    return {
      initial,
      final,
      delta: Object.fromEntries(DIMENSIONS.map(key => [key, final[key] - initial[key]]))
    };
  }

  function speedQuality(responseTimes, scoring) {
    if (!responseTimes.length) return { quality: 0, averageSeconds: 0, perDecision: [] };

    const fast = Number(scoring.fastDecisionSeconds);
    const slow = Math.max(fast + 0.1, Number(scoring.slowDecisionSeconds));
    const perDecision = responseTimes.map(milliseconds => {
      const seconds = Math.max(0, Number(milliseconds) / 1000);
      return {
        seconds: Math.round(seconds * 10) / 10,
        quality: clamp01((slow - seconds) / (slow - fast))
      };
    });
    const quality = perDecision.reduce((sum, item) => sum + item.quality, 0) / perDecision.length;
    const averageSeconds = perDecision.reduce((sum, item) => sum + item.seconds, 0) / perDecision.length;

    return {
      quality,
      averageSeconds: Math.round(averageSeconds * 10) / 10,
      perDecision
    };
  }

  function evaluate({ config, choiceTags, sybilleDecisionId, responseTimes = [] }) {
    const outcome = simulate(config, choiceTags, sybilleDecisionId);
    const weights = effectiveWeights(config);
    const { initial, final } = outcome;
    const scoring = config.scoring;

    const crewFloor = initial.crew - Math.max(1, Number(scoring.crewLossScale));
    const crewPerformance = clamp01((final.crew - crewFloor) / Math.max(1, initial.crew - crewFloor));
    const energyPerformance = clamp01(
      (final.energy - scoring.energyFloor) / Math.max(1, scoring.energyTarget - scoring.energyFloor)
    );
    const sciencePerformance = clamp01(
      (final.science - scoring.scienceBaseline) / Math.max(1, scoring.scienceTarget - scoring.scienceBaseline)
    );

    const crewViability = clamp01(
      (final.crew - config.critical.crew) / Math.max(1, initial.crew - config.critical.crew)
    );
    const energyViability = clamp01(
      (final.energy - config.critical.energy) / Math.max(1, scoring.energyTarget - config.critical.energy)
    );
    const viability = Math.min(crewViability, energyViability);
    const usefulScience = sciencePerformance * viability;

    const strategicQuality =
      weights.crew * crewPerformance +
      weights.energy * energyPerformance +
      weights.science * usefulScience;

    const speed = speedQuality(responseTimes, scoring);
    const totalQuality =
      scoring.strategyWeight * strategicQuality +
      scoring.speedWeight * speed.quality * viability;

    return {
      score: Math.max(0, Math.min(1000, Math.round(totalQuality * 1000))),
      outcome,
      speed,
      details: {
        weights,
        performance: {
          crew: crewPerformance,
          energy: energyPerformance,
          science: sciencePerformance,
          usefulScience
        },
        viability: { crew: crewViability, energy: energyViability, global: viability },
        strategicQuality,
        totalQuality
      }
    };
  }

  window.IOTI_SCORING_ENGINE = { evaluate, simulate, effectiveWeights };
})();
