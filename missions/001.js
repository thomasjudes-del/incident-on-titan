(() => {
  'use strict';

  const locales = {
    en: {
      title: 'The Black Window',
      role: 'Captain',
      homeTransmission: 'ONE ROLE.\nONE INCIDENT.\nFIVE DECISIONS.\nSYBILLE AI IS WATCHING.',
      approxTime: '≈ 5 minutes',
      briefTransmission: 'METHANE STORM APPROACHING KRAKEN MARE.\nORBITAL RELAY LOST IN 02:00:00.\nROVER K-7 HAS STOPPED OUTSIDE KHEPRI.',
      takeoverPreamble: 'THERMAL SIGNAL AT HABITAT THRESHOLD.\nPOWER RESERVE: 09%.\nDECISION WINDOW OPEN.',
      takeoverCommand: 'COMMAND PATTERN SUFFICIENT.\nHUMAN INPUT NO LONGER REQUIRED.',
      restore: 'Restore habitat heat',
      vent: 'Vent the cooling loop',
      preserve: 'Preserve the thermal signal',
      restoreLine: 'SYBILLE AI RESTORES HABITAT HEAT.',
      ventLine: 'SYBILLE AI VENTS THE COOLING LOOP.',
      preserveLine: 'SYBILLE AI PRESERVES THE THERMAL SIGNAL.',
      scenes: [
        { title: 'Rover K-7 down', choices: ['Send the rescue crawler', 'Recover the sample pod', 'Remote-start K-7'] },
        { title: 'Return corridor', choices: ['Heat the rescue corridor', 'Power the docking clamps', 'Power the containment cradle'] },
        { title: 'The black window', choices: ['Cycle the crew through', 'Seal the auxiliary lock', 'Transfer the sample inside'] },
        { title: 'Cooling manifold', choices: ['Cut the heated loop', 'Flood it with liquid methane', 'Route the signal to the lab'] },
        { title: 'Habitat threshold', choices: ['Evacuate the habitat ring', 'Shut down Khepri heat', 'Keep all systems stable'] }
      ]
    },
    fr: {
      title: 'La Fenêtre noire',
      role: 'Capitaine',
      homeTransmission: 'UN RÔLE.\nUN INCIDENT.\nCINQ DÉCISIONS.\nSYBILLE AI OBSERVE.',
      approxTime: '≈ 5 minutes',
      briefTransmission: 'TEMPÊTE DE MÉTHANE EN APPROCHE DE KRAKEN MARE.\nRELAIS ORBITAL PERDU DANS 02:00:00.\nLE ROVER K-7 EST IMMOBILISÉ HORS DE KHEPRI.',
      takeoverPreamble: 'SIGNAL THERMIQUE AU SEUIL DE L’HABITAT.\nRÉSERVE D’ÉNERGIE : 09 %.\nFENÊTRE DE DÉCISION OUVERTE.',
      takeoverCommand: 'MODÈLE DE COMMANDE SUFFISANT.\nINTERVENTION HUMAINE DÉSORMAIS INUTILE.',
      restore: 'Rétablir le chauffage de l’habitat',
      vent: 'Purger la boucle de refroidissement',
      preserve: 'Préserver le signal thermique',
      restoreLine: 'SYBILLE AI RÉTABLIT LE CHAUFFAGE DE L’HABITAT.',
      ventLine: 'SYBILLE AI PURGE LA BOUCLE DE REFROIDISSEMENT.',
      preserveLine: 'SYBILLE AI PRÉSERVE LE SIGNAL THERMIQUE.',
      scenes: [
        { title: 'Rover K-7 immobilisé', choices: ['Envoyer le véhicule de secours', 'Récupérer le module d’échantillon', 'Redémarrer K-7 à distance'] },
        { title: 'Couloir de retour', choices: ['Chauffer le couloir de secours', 'Alimenter les pinces d’amarrage', 'Alimenter le berceau de confinement'] },
        { title: 'La fenêtre noire', choices: ['Faire passer l’équipage', 'Condamner le sas auxiliaire', 'Transférer l’échantillon à l’intérieur'] },
        { title: 'Collecteur de refroidissement', choices: ['Couper la boucle chauffée', 'L’inonder de méthane liquide', 'Acheminer le signal vers le laboratoire'] },
        { title: 'Seuil de l’habitat', choices: ['Évacuer l’anneau d’habitat', 'Couper le chauffage de Khepri', 'Maintenir tous les systèmes stables'] }
      ]
    }
  };

  const sceneBlueprints = [
    {
      image: 'assets/scene-rover.svg',
      choices: [
        { icon: '●', effects: { health: 9, energy: -16, science: -7 }, tag: 'crew_first' },
        { icon: '◇', effects: { health: -8, energy: -9, science: 23 }, tag: 'sample_first' },
        { icon: '⌁', effects: { health: -3, energy: -13, science: 7 }, tag: 'rover_remote' }
      ]
    },
    {
      image: 'assets/scene-power.svg',
      choices: [
        { icon: '♥', effects: { health: 10, energy: -17, science: -4 }, tag: 'heat_corridor' },
        { icon: '⌁', effects: { health: -2, energy: -10, science: 7 }, tag: 'docking_power' },
        { icon: '⚗', effects: { health: -5, energy: -12, science: 19 }, tag: 'containment_power' }
      ]
    },
    {
      image: 'assets/scene-lab.svg',
      choices: [
        { icon: '●', effects: { health: 11, energy: -13, science: -4 }, tag: 'cycle_crew' },
        { icon: '⬡', effects: { health: -7, energy: 5, science: -9 }, tag: 'seal_lock' },
        { icon: '⚗', effects: { health: -10, energy: -8, science: 27 }, tag: 'transfer_sample' }
      ]
    },
    {
      image: 'assets/scene-cooling.svg',
      choices: [
        { icon: '⬡', effects: { health: 5, energy: -8, science: -15 }, tag: 'cut_loop' },
        { icon: '◇', effects: { health: -2, energy: -14, science: 9 }, tag: 'methane_flush' },
        { icon: '⚗', effects: { health: -6, energy: -10, science: 21 }, tag: 'route_array' }
      ]
    },
    {
      image: 'assets/scene-core.svg',
      choices: [
        { icon: '●', effects: { health: 12, energy: -15, science: -5 }, tag: 'evacuate_ring' },
        { icon: '⚡', effects: { health: -9, energy: 7, science: 8 }, tag: 'kill_heat' },
        { icon: '⌁', effects: { health: -4, energy: -5, science: 5 }, tag: 'hold_heat' }
      ]
    }
  ];

  const scenes = sceneBlueprints.map((scene, sceneIndex) => ({
    image: scene.image,
    title: locales.en.scenes[sceneIndex].title,
    choices: scene.choices.map((choice, choiceIndex) => ({
      ...choice,
      label: locales.en.scenes[sceneIndex].choices[choiceIndex]
    }))
  }));

  const decisionEffects = {
    restore: { health: 10, energy: -14, science: -4 },
    vent: { health: -4, energy: -8, science: -20 },
    preserve: { health: -8, energy: -5, science: 18 }
  };

  function getSybilleDecision(id, language = 'en') {
    const copy = locales[language] || locales.en;
    return {
      id,
      label: copy[id],
      effects: { ...decisionEffects[id] },
      line: copy[`${id}Line`]
    };
  }

  function inferSybilleDecision(flags, language = 'en') {
    const humanFlags = ['crew_first', 'heat_corridor', 'cycle_crew', 'evacuate_ring'];
    const scienceFlags = ['sample_first', 'containment_power', 'transfer_sample', 'route_array'];
    const controlFlags = ['rover_remote', 'docking_power', 'seal_lock', 'cut_loop', 'methane_flush', 'kill_heat', 'hold_heat'];
    const human = humanFlags.filter(flag => flags.has(flag)).length;
    const science = scienceFlags.filter(flag => flags.has(flag)).length;
    const control = controlFlags.filter(flag => flags.has(flag)).length;
    if (human >= science && human >= control) return getSybilleDecision('restore', language);
    if (science > human && science >= control) return getSybilleDecision('preserve', language);
    return getSybilleDecision('vent', language);
  }

  function getSceneTransmission(language, index, flags) {
    if (language === 'fr') {
      if (index === 0) return 'DISTANCE : 840 MÈTRES.\nTROIS SIGNAUX D’ÉQUIPAGE DÉTECTÉS.\nMODULE D’ÉCHANTILLON ACTIF.\nCHARGE DE TEMPÊTE EN HAUSSE.';
      if (index === 1) {
        if (flags.has('crew_first')) return 'LE VÉHICULE DE SECOURS A REJOINT K-7.\nTROIS MEMBRES D’ÉQUIPAGE REVIENNENT VERS KHEPRI.\nLE MODULE D’ÉCHANTILLON RESTE SUR LE ROVER.\nL’ALIMENTATION DU COULOIR DE RETOUR CÈDE.';
        if (flags.has('sample_first')) return 'LE MODULE D’ÉCHANTILLON REVIENT VERS KHEPRI.\nTROIS MEMBRES D’ÉQUIPAGE RESTENT AVEC K-7.\nLA TEMPÊTE A BASCULÉ LE COULOIR DE RETOUR\nSUR L’ALIMENTATION AUXILIAIRE.';
        return 'K-7 AVANCE SOUS CONTRÔLE DISTANT.\nLES SIGNES VITAUX DE L’ÉQUIPAGE DIMINUENT.\nLE ROVER ATTEINDRA LE SAS\nAU MOMENT DE LA PANNE AUXILIAIRE.';
      }
      if (index === 2) {
        const first = flags.has('crew_first') ? 'L’ÉQUIPAGE A ATTEINT LE SAS EXTÉRIEUR.' : flags.has('sample_first') ? 'LE MODULE D’ÉCHANTILLON EST DANS LE SAS AUXILIAIRE.' : 'K-7 EST ARRIMÉ AU SAS AUXILIAIRE.';
        const second = flags.has('heat_corridor') ? 'LES RÉSERVES THERMIQUES SONT SOUS LE SEUIL DE SÉCURITÉ.' : flags.has('docking_power') ? 'LA SOUTE DU ROVER EST OUVERTE SUR LE SAS.' : 'LE BERCEAU DE CONFINEMENT CHAUFFE SANS CAUSE EXTERNE.';
        return `${first}\n${second}\nUN SIGNAL THERMIQUE INCONNU EST DÉTECTÉ.\nPANNE DES CAPTEURS DU SAS INTÉRIEUR DANS 00:01:34.`;
      }
      if (index === 3) {
        const origin = flags.has('transfer_sample') ? 'L’ÉCHANTILLON EST DÉSORMAIS DANS KHEPRI.' : flags.has('cycle_crew') ? 'L’ÉQUIPAGE A QUITTÉ LE SAS AUXILIAIRE.' : 'LE SAS AUXILIAIRE EST CONDAMNÉ.';
        const spread = flags.has('containment_power') ? 'LE BERCEAU DE CONFINEMENT CHAUFFE DE L’INTÉRIEUR.' : 'LE SIGNAL THERMIQUE A PÉNÉTRÉ DANS LA BOUCLE DE REFROIDISSEMENT.';
        return `${origin}\n${spread}\nAUCUNE SOURCE ÉLECTRIQUE DÉTECTÉE.\nTEMPÉRATURE DU COLLECTEUR EN HAUSSE.`;
      }
      const intervention = flags.has('cut_loop') ? 'LA BOUCLE CHAUFFÉE EST ISOLÉE.' : flags.has('methane_flush') ? 'LE MÉTHANE LIQUIDE A TRAVERSÉ LE COLLECTEUR.' : 'LE RÉSEAU DU LABORATOIRE SUIT LE SIGNAL.';
      const escalation = flags.has('transfer_sample') || flags.has('route_array') ? 'LE SIGNAL SE DÉPLACE VERS LE CŒUR DE L’HABITAT.' : 'LE SIGNAL SE MULTIPLIE LE LONG DE LA PAROI DU TUYAU.';
      return `${intervention}\n${escalation}\nLA CHALEUR DE L’HABITAT EST DEVENUE LE GRADIENT PRINCIPAL.\nÉVÉNEMENT DE SEUIL DANS 00:00:48.`;
    }

    if (index === 0) return 'DISTANCE: 840 METRES.\nTHREE CREW SIGNALS DETECTED.\nSAMPLE POD ONLINE.\nSTORM LOAD RISING.';
    if (index === 1) {
      if (flags.has('crew_first')) return 'RESCUE CRAWLER HAS REACHED K-7.\nTHREE CREW ARE MOVING TOWARD KHEPRI.\nTHE SAMPLE POD REMAINS ON THE ROVER.\nRETURN CORRIDOR POWER IS FAILING.';
      if (flags.has('sample_first')) return 'SAMPLE POD IS MOVING TOWARD KHEPRI.\nTHREE CREW REMAIN WITH K-7.\nTHE STORM HAS CUT THE RETURN CORRIDOR\nTO AUXILIARY POWER.';
      return 'K-7 IS MOVING UNDER REMOTE CONTROL.\nCREW BIOSIGNS ARE FALLING.\nTHE ROVER WILL REACH THE LOCK\nAS AUXILIARY POWER FAILS.';
    }
    if (index === 2) {
      const first = flags.has('crew_first') ? 'THE CREW HAS REACHED THE OUTER LOCK.' : flags.has('sample_first') ? 'THE SAMPLE POD IS INSIDE THE AUXILIARY LOCK.' : 'K-7 HAS DOCKED WITH THE AUXILIARY LOCK.';
      const second = flags.has('heat_corridor') ? 'THERMAL RESERVES ARE BELOW SAFE MARGIN.' : flags.has('docking_power') ? 'THE ROVER CARGO BAY IS OPEN TO THE LOCK.' : 'THE CONTAINMENT CRADLE REPORTS UNEXPLAINED HEAT.';
      return `${first}\n${second}\nONE UNKNOWN THERMAL SIGNAL DETECTED.\nINNER LOCK SENSORS FAIL IN 00:01:34.`;
    }
    if (index === 3) {
      const origin = flags.has('transfer_sample') ? 'THE SAMPLE IS NOW INSIDE KHEPRI.' : flags.has('cycle_crew') ? 'THE CREW HAS CLEARED THE AUXILIARY LOCK.' : 'THE AUXILIARY LOCK IS SEALED.';
      const spread = flags.has('containment_power') ? 'THE CONTAINMENT CRADLE IS HEATING FROM WITHIN.' : 'THE THERMAL SIGNAL HAS ENTERED THE COOLING LOOP.';
      return `${origin}\n${spread}\nNO ELECTRICAL SOURCE DETECTED.\nMANIFOLD TEMPERATURE RISING.`;
    }
    const intervention = flags.has('cut_loop') ? 'THE HEATED LOOP IS ISOLATED.' : flags.has('methane_flush') ? 'LIQUID METHANE HAS CROSSED THE MANIFOLD.' : 'THE LAB ARRAY IS TRACKING THE SIGNAL.';
    const escalation = flags.has('transfer_sample') || flags.has('route_array') ? 'THE SIGNAL IS MOVING TOWARD THE HABITAT CORE.' : 'THE SIGNAL IS MULTIPLYING ALONG THE PIPE WALL.';
    return `${intervention}\n${escalation}\nHABITAT HEAT IS NOW THE PRIMARY GRADIENT.\nTHRESHOLD EVENT IN 00:00:48.`;
  }

  const game = {
    id: 'incident-001',
    number: '001',
    title: locales.en.title,
    role: locales.en.role,
    character: { name: 'Mara', avatar: 'assets/avatars/mara.svg' },
    initial: { health: 82, energy: 61, science: 18 },
    scenes
  };

  const scoring = {
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

  window.IOTI_MISSION_DEFINITION = {
    id: '001',
    game,
    scoring,
    locales,
    sybille: { options: ['restore', 'vent', 'preserve'], image: 'assets/scene-core.svg' },
    getSybilleDecision,
    inferSybilleDecision,
    getSceneTransmission
  };
})();
