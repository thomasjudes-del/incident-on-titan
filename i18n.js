(() => {
  const LANGUAGE_KEY = 'ioti:language';
  const queryLanguage = new URLSearchParams(location.search).get('lang');
  let language = queryLanguage === 'fr' || queryLanguage === 'en'
    ? queryLanguage
    : localStorage.getItem(LANGUAGE_KEY) || (navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en');

  const text = {
    en: {
      weeklyIncident: 'Weekly incident',
      incidentComplete: 'Incident complete',
      missionBrief: 'Mission brief',
      scoreStage: 'Score',
      sybilleControl: 'Sybille AI control',
      homeTransmission: 'ONE ROLE.\nONE ATTEMPT.\nFIVE DECISIONS.\nSYBILLE AI IS WATCHING.',
      approxTime: '≈ 5 minutes',
      startMission: 'Start mission',
      yourRole: 'Your role',
      openIncident: 'Open incident',
      incoming: 'KHEPRI / INCOMING',
      live: 'KHEPRI / LIVE',
      critical: 'KHEPRI / CRITICAL',
      command: 'Command?',
      scene: 'Scene',
      of: 'of',
      decisionWindow: 'Decision window',
      revealScore: 'Reveal score',
      sameCall: 'Would you have made the same call?',
      scoreAttributed: 'Score attributed by Sybille AI',
      scoreAttributedCaps: 'SCORE ATTRIBUTED BY SYBILLE AI',
      outOf1000: 'out of 1000',
      simulationId: 'Simulation ID',
      health: 'Health',
      energy: 'Energy',
      science: 'Science',
      missionTime: 'Mission time',
      officialRecorded: 'Official attempt recorded',
      missionComplete: 'Mission complete',
      attemptRecorded: 'Your official attempt has been recorded.',
      shareResult: 'Share result',
      backHome: 'Back to home',
      preparingImage: 'Preparing image…',
      decisionPath: 'Decision path',
      playSameIncident: 'Play the same incident',
      imageDownloadedCopied: 'Result image downloaded. Game link copied.',
      imageDownloaded: 'Result image downloaded.',
      imageError: 'The result image could not be generated.',
      languageLabel: 'Language',
      missionTitle: 'The Black Window',
      role: 'Captain',
      briefTransmission: 'METHANE STORM APPROACHING KRAKEN MARE.\nORBITAL RELAY LOST IN 02:00:00.\nROVER K-7 HAS STOPPED OUTSIDE KHEPRI.',
      takeoverPreamble: 'THERMAL SIGNAL AT HABITAT THRESHOLD.\nPOWER RESERVE: 09%.\nDECISION WINDOW OPEN.',
      takeoverCommand: 'COMMAND PATTERN SUFFICIENT.\nHUMAN INPUT NO LONGER REQUIRED.',
      restore: 'Restore habitat heat',
      vent: 'Vent the cooling loop',
      preserve: 'Preserve the thermal signal',
      restoreLine: 'SYBILLE AI RESTORES HABITAT HEAT.',
      ventLine: 'SYBILLE AI VENTS THE COOLING LOOP.',
      preserveLine: 'SYBILLE AI PRESERVES THE THERMAL SIGNAL.'
    },
    fr: {
      weeklyIncident: 'Incident hebdomadaire',
      incidentComplete: 'Incident terminé',
      missionBrief: 'Briefing de mission',
      scoreStage: 'Score',
      sybilleControl: 'Contrôle de Sybille AI',
      homeTransmission: 'UN RÔLE.\nUNE SEULE TENTATIVE.\nCINQ DÉCISIONS.\nSYBILLE AI OBSERVE.',
      approxTime: '≈ 5 minutes',
      startMission: 'Commencer la mission',
      yourRole: 'Votre rôle',
      openIncident: 'Ouvrir l’incident',
      incoming: 'KHEPRI / TRANSMISSION',
      live: 'KHEPRI / DIRECT',
      critical: 'KHEPRI / CRITIQUE',
      command: 'Décision ?',
      scene: 'Scène',
      of: 'sur',
      decisionWindow: 'Fenêtre de décision',
      revealScore: 'Révéler le score',
      sameCall: 'Auriez-vous pris la même décision ?',
      scoreAttributed: 'Score attribué par Sybille AI',
      scoreAttributedCaps: 'SCORE ATTRIBUÉ PAR SYBILLE AI',
      outOf1000: 'sur 1000',
      simulationId: 'Identifiant de simulation',
      health: 'Santé',
      energy: 'Énergie',
      science: 'Science',
      missionTime: 'Durée de mission',
      officialRecorded: 'Tentative officielle enregistrée',
      missionComplete: 'Mission terminée',
      attemptRecorded: 'Votre tentative officielle a été enregistrée.',
      shareResult: 'Partager le résultat',
      backHome: 'Retour à l’accueil',
      preparingImage: 'Création de l’image…',
      decisionPath: 'Trajectoire des décisions',
      playSameIncident: 'Jouer au même incident',
      imageDownloadedCopied: 'Image du résultat téléchargée. Lien du jeu copié.',
      imageDownloaded: 'Image du résultat téléchargée.',
      imageError: 'Impossible de générer l’image du résultat.',
      languageLabel: 'Langue',
      missionTitle: 'La Fenêtre noire',
      role: 'Capitaine',
      briefTransmission: 'TEMPÊTE DE MÉTHANE EN APPROCHE DE KRAKEN MARE.\nRELAIS ORBITAL PERDU DANS 02:00:00.\nLE ROVER K-7 EST IMMOBILISÉ HORS DE KHEPRI.',
      takeoverPreamble: 'SIGNAL THERMIQUE AU SEUIL DE L’HABITAT.\nRÉSERVE D’ÉNERGIE : 09 %.\nFENÊTRE DE DÉCISION OUVERTE.',
      takeoverCommand: 'MODÈLE DE COMMANDE SUFFISANT.\nINTERVENTION HUMAINE DÉSORMAIS INUTILE.',
      restore: 'Rétablir le chauffage de l’habitat',
      vent: 'Purger la boucle de refroidissement',
      preserve: 'Préserver le signal thermique',
      restoreLine: 'SYBILLE AI RÉTABLIT LE CHAUFFAGE DE L’HABITAT.',
      ventLine: 'SYBILLE AI PURGE LA BOUCLE DE REFROIDISSEMENT.',
      preserveLine: 'SYBILLE AI PRÉSERVE LE SIGNAL THERMIQUE.'
    }
  };

  const missionCopy = {
    en: {
      titles: ['Rover K-7 down', 'Return corridor', 'The black window', 'Cooling manifold', 'Habitat threshold'],
      choices: [
        ['Send the rescue crawler', 'Recover the sample pod', 'Remote-start K-7'],
        ['Heat the rescue corridor', 'Power the docking clamps', 'Power the containment cradle'],
        ['Cycle the crew through', 'Seal the auxiliary lock', 'Transfer the sample inside'],
        ['Cut the heated loop', 'Flood it with liquid methane', 'Route the signal to the lab'],
        ['Evacuate the habitat ring', 'Shut down Khepri heat', 'Keep all systems stable']
      ]
    },
    fr: {
      titles: ['Rover K-7 immobilisé', 'Couloir de retour', 'La fenêtre noire', 'Collecteur de refroidissement', 'Seuil de l’habitat'],
      choices: [
        ['Envoyer le véhicule de secours', 'Récupérer le module d’échantillon', 'Redémarrer K-7 à distance'],
        ['Chauffer le couloir de secours', 'Alimenter les pinces d’amarrage', 'Alimenter le berceau de confinement'],
        ['Faire passer l’équipage', 'Condamner le sas auxiliaire', 'Transférer l’échantillon à l’intérieur'],
        ['Couper la boucle chauffée', 'L’inonder de méthane liquide', 'Acheminer le signal vers le laboratoire'],
        ['Évacuer l’anneau d’habitat', 'Couper le chauffage de Khepri', 'Maintenir tous les systèmes stables']
      ]
    }
  };

  function t(key) {
    return text[language]?.[key] ?? text.en[key] ?? key;
  }

  function syncMissionCopy() {
    const localized = missionCopy[language] || missionCopy.en;
    mission.title = t('missionTitle');
    mission.role = t('role');
    mission.scenes.forEach((scene, sceneIndex) => {
      scene.title = localized.titles[sceneIndex];
      scene.choices.forEach((choice, choiceIndex) => {
        choice.label = localized.choices[sceneIndex][choiceIndex];
      });
    });
  }

  function updateLanguageButtons() {
    document.documentElement.lang = language === 'fr' ? 'fr' : 'en-US';
    document.querySelectorAll('[data-lang]').forEach(button => {
      const active = button.dataset.lang === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const switcher = document.querySelector('.lang-switch');
    if (switcher) switcher.setAttribute('aria-label', t('languageLabel'));
  }

  function setLanguage(nextLanguage, rerender = true) {
    if (nextLanguage !== 'en' && nextLanguage !== 'fr') return;
    language = nextLanguage;
    localStorage.setItem(LANGUAGE_KEY, language);
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    syncMissionCopy();
    updateLanguageButtons();
    if (rerender) rerenderStage();
  }

  function rerenderStage() {
    const stage = app.dataset.stage;
    if (stage === 'brief') return window.briefing();
    if (stage === 'scene') return window.renderScene();
    if (stage === 'sybille') return window.renderSybilleTakeover();
    if (stage === 'score') {
      const result = window.result || window.loadStoredResult?.();
      if (result) return window.renderScore(result);
    }
    if (stage === 'completed') {
      const result = window.result || window.loadStoredResult?.();
      if (result) return window.renderCompleted(result);
    }
    return window.home();
  }

  function sceneTransmission(index) {
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

  window.home = function localizedHome() {
    app.classList.remove('sybille-control', 'takeover-hit');
    const stored = window.loadStoredResult?.();
    if (stored) return window.renderCompleted(stored);
    setStage('home', t('weeklyIncident'), 0);
    view(`
      <div class="home-mark">IOTI</div>
      <div class="eyebrow">${t('weeklyIncident')} #${mission.number}</div>
      <h1 class="headline">Incident on Titan</h1>
      <div id="homeTransmission" class="terminal-text compact-terminal"></div>
      <div class="home-meta"><span>${mission.title}</span><span>${t('approxTime')}</span></div>
      <div id="homeAction" class="delayed-ui nav"><button class="primary" onclick="briefing()">${t('startMission')}</button></div>
    `);
    typeTransmission($('#homeTransmission'), t('homeTransmission'), { speed: 45, linePause: 560, finalPause: 520 })
      .then(done => { if (done) reveal('#homeAction'); });
  };

  window.briefing = function localizedBriefing() {
    startedAt = Date.now();
    setStage('brief', t('missionBrief'), 7);
    view(`
      <div class="eyebrow">${t('weeklyIncident')} #${mission.number}</div>
      <h1 class="headline">${mission.title}</h1>
      <div class="role-panel minimal-role"><small>${t('yourRole')}</small><strong>${mission.role}</strong></div>
      <div id="briefTransmission" class="terminal-frame"><div class="terminal-label">${t('incoming')}</div><div class="terminal-text"></div></div>
      <div id="briefAction" class="delayed-ui nav"><button class="primary" onclick="startMission()">${t('openIncident')}</button></div>
    `);
    typeTransmission($('#briefTransmission .terminal-text'), t('briefTransmission'), { speed: 38, linePause: 560, finalPause: 520 })
      .then(done => { if (done) reveal('#briefAction'); });
  };

  window.sceneTransmission = sceneTransmission;

  window.renderScene = function localizedRenderScene() {
    const scene = mission.scenes[sceneIndex];
    setSceneImage(scene.image, scene.title);
    const completion = 16 + Math.round((sceneIndex / mission.scenes.length) * 62);
    setStage('scene', `${t('scene')} ${sceneIndex + 1} / ${mission.scenes.length}`, completion);
    view(`
      <div class="scene-dots">${mission.scenes.map((_, i) => `<i class="${i === sceneIndex ? 'active' : i < sceneIndex ? 'done' : ''}"></i>`).join('')}</div>
      <div class="eyebrow">${t('scene')} ${sceneIndex + 1} ${t('of')} ${mission.scenes.length}</div>
      <h1 class="headline scene-title">${scene.title}</h1>
      <div class="terminal-frame scene-terminal"><div class="terminal-label">${t('live')}</div><div id="sceneTransmission" class="terminal-text"></div></div>
      <div id="sceneChoices" class="delayed-ui">
        <div class="question">${t('command')}</div>
        <div class="choices">${scene.choices.map((choice, index) => `
          <button class="choice" onclick="choose(${index})">
            <span class="choice-icon">${choice.icon}</span>
            <span><b>${choice.label}</b></span>
            <span class="arrow">›</span>
          </button>`).join('')}
        </div>
      </div>
    `);
    typeTransmission($('#sceneTransmission'), sceneTransmission(sceneIndex), { speed: 38, linePause: 560, finalPause: 520 })
      .then(done => { if (done) reveal('#sceneChoices'); });
  };

  window.inferSybilleDecision = function localizedSybilleDecision() {
    const humanFlags = ['crew_first', 'heat_corridor', 'cycle_crew', 'evacuate_ring'];
    const scienceFlags = ['sample_first', 'containment_power', 'transfer_sample', 'route_array'];
    const controlFlags = ['rover_remote', 'docking_power', 'seal_lock', 'cut_loop', 'methane_flush', 'kill_heat', 'hold_heat'];
    const human = humanFlags.filter(flag => flags.has(flag)).length;
    const science = scienceFlags.filter(flag => flags.has(flag)).length;
    const control = controlFlags.filter(flag => flags.has(flag)).length;
    if (human >= science && human >= control) return { id: 'restore', label: t('restore'), effects: { health: 10, energy: -14, science: -4 }, line: t('restoreLine') };
    if (science > human && science >= control) return { id: 'preserve', label: t('preserve'), effects: { health: -8, energy: -5, science: 18 }, line: t('preserveLine') };
    return { id: 'vent', label: t('vent'), effects: { health: -4, energy: -8, science: -20 }, line: t('ventLine') };
  };

  window.renderSybilleTakeover = function localizedSybilleTakeover() {
    const decision = window.inferSybilleDecision();
    window.sybilleDecision = decision;
    setSceneImage('assets/scene-core.svg', t('sybilleControl'));
    setStage('sybille', t('sybilleControl'), 86);
    view(`
      <div class="sybille-seal"><span>△</span></div>
      <div class="eyebrow">${t('decisionWindow')}</div>
      <div class="terminal-frame sybille-terminal">
        <div class="terminal-label">${t('critical')}</div>
        <div id="sybillePreamble" class="terminal-text"></div>
        <div id="sybilleCommand" class="terminal-text sybille-command"></div>
      </div>
      <div id="sybilleOptions" class="delayed-ui decision-options">
        ${[t('restore'), t('vent'), t('preserve')].map(label => `<div class="decision-option" data-decision="${label}"><span>${label}</span><i></i></div>`).join('')}
      </div>
      <div id="sybilleResult" class="delayed-ui sybille-result">
        <strong>${decision.line}</strong>
        <span>${t('sameCall')}</span>
        <div class="nav"><button class="primary" onclick="revealJudgment()">${t('revealScore')}</button></div>
      </div>
    `);
    typeTransmission($('#sybillePreamble'), t('takeoverPreamble'), { speed: 42, linePause: 620, finalPause: 700 })
      .then(async done => {
        if (!done) return;
        activateSybilleControl();
        await sleep(330);
        const commandDone = await typeTransmission($('#sybilleCommand'), t('takeoverCommand'), { speed: 52, linePause: 760, finalPause: 650 });
        if (!commandDone) return;
        reveal('#sybilleOptions');
        await sleep(950);
        const selected = [...document.querySelectorAll('.decision-option')].find(option => option.dataset.decision === decision.label);
        if (selected) selected.classList.add('selected');
        applySybilleDecision(decision);
        await sleep(1100);
        reveal('#sybilleResult');
      });
  };

  window.renderScore = function localizedRenderScore(result) {
    app.classList.remove('sybille-control', 'takeover-hit');
    window.result = result;
    setStage('score', t('scoreStage'), 100);
    view(`
      <div class="judgment-label">${t('scoreAttributed')}</div>
      <div class="score-number">${result.score}</div>
      <div class="score-max">${t('outOf1000')}</div>
      <div class="status-card compact-status">
        ${statusRow('♥', t('health'), result.state.health)}
        ${statusRow('⚡', t('energy'), result.state.energy)}
        ${statusRow('⚗', t('science'), result.state.science)}
      </div>
      <div class="simulation">${t('simulationId')}<br><strong>${result.simulation}</strong></div>
      <div class="share-preview">
        <small>${t('weeklyIncident')} ${mission.number} · ${mission.role}</small>
        <strong>${t('scoreStage')} ${result.score}</strong>
        <span>♥ ${result.state.health} · ⚡ ${result.state.energy} · ⚗ ${result.state.science}</span>
        <em>${pathGlyphs(result.path)}</em>
      </div>
      <div class="mission-time">${t('missionTime')} ${result.elapsed}s · ${t('officialRecorded')}</div>
      <div class="nav stacked"><button class="primary" data-action="share-result" onclick="shareResult()">${t('shareResult')}</button><button class="ghost" onclick="home()">${t('backHome')}</button></div>
    `);
  };

  window.renderCompleted = function localizedRenderCompleted(result) {
    app.classList.remove('sybille-control', 'takeover-hit');
    window.result = result;
    setStage('completed', t('incidentComplete'), 100);
    view(`
      <div class="eyebrow">${t('weeklyIncident')} #${mission.number}</div>
      <h1 class="headline">${t('missionComplete')}</h1>
      <div class="completed-score"><small>${t('scoreAttributed')}</small><strong>${result.score}</strong><span>${result.simulation}</span></div>
      <p class="copy completed-copy">${t('attemptRecorded')}</p>
      <div class="share-preview">
        <small>${mission.title} · ${mission.role}</small>
        <strong>${t('scoreStage')} ${result.score}</strong>
        <span>♥ ${result.state.health} · ⚡ ${result.state.energy} · ⚗ ${result.state.science}</span>
        <em>${pathGlyphs(result.path)}</em>
      </div>
      <div class="nav"><button class="primary" data-action="share-result" onclick="shareResult()">${t('shareResult')}</button></div>
    `);
  };

  window.IOTI_I18N = {
    t,
    setLanguage,
    get language() { return language; }
  };

  syncMissionCopy();
  updateLanguageButtons();
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
})();
