(() => {
  'use strict';

  window.IOTI_MISSION_CONFIG = {
    id: 'incident-001',
    number: '001',
    role: {
      id: 'captain',
      character: 'Mara',
      weights: { crew: 0.40, energy: 0.35, science: 0.25 }
    },
    initial: { crew: 500, energy: 200, science: 100 },
    missionPriorities: { crew: 1.15, energy: 1.00, science: 1.20 },
    sybillePriorities: { crew: 1.00, energy: 1.00, science: 1.15 },
    critical: { crew: 100, energy: 40 },
    scoring: {
      strategyWeight: 0.95,
      speedWeight: 0.05,
      crewLossScale: 3,
      energyFloor: 80,
      energyTarget: 150,
      scienceBaseline: 100,
      scienceTarget: 150,
      fastDecisionSeconds: 2,
      slowDecisionSeconds: 12
    },
    choiceEffects: {
      crew_first:        { crew:  0, energy: -20, science:  -4 },
      sample_first:      { crew:  0, energy: -12, science:  18 },
      rover_remote:      { crew:  0, energy: -15, science:   6 },
      heat_corridor:     { crew:  0, energy: -24, science:  -2 },
      docking_power:     { crew:  0, energy: -12, science:   5 },
      containment_power: { crew:  0, energy: -16, science:  15 },
      cycle_crew:        { crew:  0, energy: -14, science:  -2 },
      seal_lock:         { crew: -3, energy:  -4, science:  -8 },
      transfer_sample:   { crew: -1, energy: -10, science:  22 },
      cut_loop:          { crew:  0, energy:  -6, science: -12 },
      methane_flush:     { crew:  0, energy: -12, science:   6 },
      route_array:       { crew:  0, energy:  -8, science:  18 },
      evacuate_ring:     { crew:  0, energy: -18, science:  -3 },
      kill_heat:         { crew: -1, energy:  10, science:   8 },
      hold_heat:         { crew:  0, energy:  -5, science:   4 }
    },
    sybilleEffects: {
      restore:  { crew:  0, energy: -12, science:  -4 },
      vent:     { crew:  0, energy:  -8, science: -15 },
      preserve: { crew: -1, energy:  -6, science:  15 }
    }
  };
})();
