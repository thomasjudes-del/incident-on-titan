(() => {
  'use strict';

  const definition = window.IOTI_MISSION_DEFINITION;
  if (!definition?.game || !definition?.scoring) {
    throw new Error('IOTI mission definition is unavailable.');
  }

  Object.keys(mission).forEach(key => delete mission[key]);
  Object.assign(mission, definition.game);

  sceneIndex = 0;
  state = { ...mission.initial };
  choices = [];
  flags = new Set();
  startedAt = null;

  window.IOTI_MISSION_CONFIG = definition.scoring;
})();
