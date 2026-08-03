const $ = selector => document.querySelector(selector);
const app = $('#app');
const screen = $('#screen');
const stepText = $('#stepText');
const progress = $('#progressBar');
const heroImage = $('#heroImage');

const mission = {
  id: 'incident-007',
  number: '007',
  title: 'The Black Window',
  role: 'Captain',
  initial: { health: 82, energy: 61, science: 18 },
  scenes: [
    {
      image: 'assets/scene-rover.svg',
      title: 'Rover K-7 down',
      choices: [
        { icon: '●', label: 'Send the rescue crawler', effects: { health: 9, energy: -16, science: -7 }, tag: 'crew_first' },
        { icon: '◇', label: 'Recover the sample pod', effects: { health: -8, energy: -9, science: 23 }, tag: 'sample_first' },
        { icon: '⌁', label: 'Remote-start K-7', effects: { health: -3, energy: -13, science: 7 }, tag: 'rover_remote' }
      ]
    },
    {
      image: 'assets/scene-power.svg',
      title: 'Return corridor',
      choices: [
        { icon: '♥', label: 'Heat the rescue corridor', effects: { health: 10, energy: -17, science: -4 }, tag: 'heat_corridor' },
        { icon: '⌁', label: 'Power the docking clamps', effects: { health: -2, energy: -10, science: 7 }, tag: 'docking_power' },
        { icon: '⚗', label: 'Power the containment cradle', effects: { health: -5, energy: -12, science: 19 }, tag: 'containment_power' }
      ]
    },
    {
      image: 'assets/scene-lab.svg',
      title: 'The black window',
      choices: [
        { icon: '●', label: 'Cycle the crew through', effects: { health: 11, energy: -13, science: -4 }, tag: 'cycle_crew' },
        { icon: '⬡', label: 'Seal the auxiliary lock', effects: { health: -7, energy: 5, science: -9 }, tag: 'seal_lock' },
        { icon: '⚗', label: 'Transfer the sample inside', effects: { health: -10, energy: -8, science: 27 }, tag: 'transfer_sample' }
      ]
    },
    {
      image: 'assets/scene-cooling.svg',
      title: 'Cooling manifold',
      choices: [
        { icon: '⬡', label: 'Cut the heated loop', effects: { health: 5, energy: -8, science: -15 }, tag: 'cut_loop' },
        { icon: '◇', label: 'Flood it with liquid methane', effects: { health: -2, energy: -14, science: 9 }, tag: 'methane_flush' },
        { icon: '⚗', label: 'Route the signal to the lab', effects: { health: -6, energy: -10, science: 21 }, tag: 'route_array' }
      ]
    },
    {
      image: 'assets/scene-core.svg',
      title: 'Habitat threshold',
      choices: [
        { icon: '●', label: 'Evacuate the habitat ring', effects: { health: 12, energy: -15, science: -5 }, tag: 'evacuate_ring' },
        { icon: '⚡', label: 'Shut down Khepri heat', effects: { health: -9, energy: 7, science: 8 }, tag: 'kill_heat' },
        { icon: '⌁', label: 'Keep all systems stable', effects: { health: -4, energy: -5, science: 5 }, tag: 'hold_heat' }
      ]
    }
  ]
};

const STORAGE_KEY = `ioti:${mission.id}:official-result:v4`;
const resetRequested = new URLSearchParams(location.search).get('reset') === '1';
if (resetRequested) {
  localStorage.removeItem(STORAGE_KEY);
  history.replaceState({}, '', location.pathname);
}

let sceneIndex = 0;
let state = { ...mission.initial };
let choices = [];
let flags = new Set();
let startedAt = null;
let typingSession = null;
let viewToken = 0;

const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function setStage(stage, label, completion) {
  app.dataset.stage = stage;
  stepText.textContent = label;
  progress.style.width = `${completion}%`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function view(html) {
  viewToken += 1;
  typingSession = null;
  screen.innerHTML = `<div class="screen-enter">${html}</div>`;
  return viewToken;
}

function setSceneImage(src, alt) {
  heroImage.src = src;
  heroImage.alt = alt;
  heroImage.classList.add('loaded');
}

async function typeTransmission(element, text, options = {}) {
  const token = viewToken;
  const session = { skip: false };
  typingSession = session;
  const speed = options.speed ?? 38;
  const linePause = options.linePause ?? 520;
  const finalPause = options.finalPause ?? 480;

  element.textContent = '';
  element.classList.add('typing');

  for (const character of text) {
    if (token !== viewToken) return false;
    if (session.skip) {
      element.textContent = text;
      break;
    }
    element.textContent += character;
    await sleep(character === '\n' ? linePause : speed);
  }

  if (token !== viewToken) return false;
  element.classList.remove('typing');
  typingSession = null;
  await sleep(finalPause);
  return token === viewToken;
}

screen.addEventListener('pointerdown', () => {
  if (typingSession) typingSession.skip = true;
});

function reveal(selector) {
  const element = $(selector);
  if (element) element.classList.add('revealed');
}

function home() {
  app.classList.remove('sybille-control', 'takeover-hit');
  const stored = loadStoredResult();
  if (stored) {
    renderCompleted(stored);
    return;
  }

  setStage('home', 'Weekly incident', 0);
  view(`
    <div class="home-mark">IOTI</div>
    <div class="eyebrow">Weekly incident #${mission.number}</div>
    <h1 class="headline">Incident on Titan</h1>
    <div id="homeTransmission" class="terminal-text compact-terminal"></div>
    <div class="home-meta"><span>${mission.title}</span><span>≈ 5 minutes</span></div>
    <div id="homeAction" class="delayed-ui nav"><button class="primary" onclick="briefing()">Start mission</button></div>
  `);

  typeTransmission(
    $('#homeTransmission'),
    'ONE ROLE.\nONE ATTEMPT.\nFIVE DECISIONS.\nSYBILLE IS WATCHING.',
    { speed: 45, linePause: 560, finalPause: 520 }
  ).then(done => { if (done) reveal('#homeAction'); });
}

function briefing() {
  startedAt = Date.now();
  setStage('brief', 'Mission brief', 7);
  view(`
    <div class="eyebrow">Weekly incident #${mission.number}</div>
    <h1 class="headline">${mission.title}</h1>
    <div class="role-panel minimal-role"><small>Your role</small><strong>${mission.role}</strong></div>
    <div id="briefTransmission" class="terminal-frame"><div class="terminal-label">KHEPRI / INCOMING</div><div class="terminal-text"></div></div>
    <div id="briefAction" class="delayed-ui nav"><button class="primary" onclick="startMission()">Open incident</button></div>
  `);

  typeTransmission(
    $('#briefTransmission .terminal-text'),
    'METHANE STORM APPROACHING KRAKEN MARE.\nORBITAL RELAY LOST IN 02:00:00.\nROVER K-7 HAS STOPPED OUTSIDE KHEPRI.',
    { speed: 38, linePause: 560, finalPause: 520 }
  ).then(done => { if (done) reveal('#briefAction'); });
}

function startMission() {
  sceneIndex = 0;
  state = { ...mission.initial };
  choices = [];
  flags = new Set();
  renderScene();
}

function sceneTransmission(index) {
  if (index === 0) {
    return 'DISTANCE: 840 METRES.\nTHREE CREW SIGNALS DETECTED.\nSAMPLE POD ONLINE.\nSTORM LOAD RISING.';
  }

  if (index === 1) {
    if (flags.has('crew_first')) {
      return 'RESCUE CRAWLER HAS REACHED K-7.\nTHREE CREW ARE MOVING TOWARD KHEPRI.\nTHE SAMPLE POD REMAINS ON THE ROVER.\nRETURN CORRIDOR POWER IS FAILING.';
    }
    if (flags.has('sample_first')) {
      return 'SAMPLE POD IS MOVING TOWARD KHEPRI.\nTHREE CREW REMAIN WITH K-7.\nTHE STORM HAS CUT THE RETURN CORRIDOR\nTO AUXILIARY POWER.';
    }
    return 'K-7 IS MOVING UNDER REMOTE CONTROL.\nCREW BIOSIGNS ARE FALLING.\nTHE ROVER WILL REACH THE LOCK\nAS AUXILIARY POWER FAILS.';
  }

  if (index === 2) {
    const first = flags.has('crew_first')
      ? 'THE CREW HAS REACHED THE OUTER LOCK.'
      : flags.has('sample_first')
        ? 'THE SAMPLE POD IS INSIDE THE AUXILIARY LOCK.'
        : 'K-7 HAS DOCKED WITH THE AUXILIARY LOCK.';

    const second = flags.has('heat_corridor')
      ? 'THERMAL RESERVES ARE BELOW SAFE MARGIN.'
      : flags.has('docking_power')
        ? 'THE ROVER CARGO BAY IS OPEN TO THE LOCK.'
        : 'THE CONTAINMENT CRADLE REPORTS UNEXPLAINED HEAT.';

    return `${first}\n${second}\nONE UNKNOWN THERMAL SIGNAL DETECTED.\nINNER LOCK SENSORS FAIL IN 00:01:34.`;
  }

  if (index === 3) {
    const origin = flags.has('transfer_sample')
      ? 'THE SAMPLE IS NOW INSIDE KHEPRI.'
      : flags.has('cycle_crew')
        ? 'THE CREW HAS CLEARED THE AUXILIARY LOCK.'
        : 'THE AUXILIARY LOCK IS SEALED.';

    const spread = flags.has('containment_power')
      ? 'THE CONTAINMENT CRADLE IS HEATING FROM WITHIN.'
      : 'THE THERMAL SIGNAL HAS ENTERED THE COOLING LOOP.';

    return `${origin}\n${spread}\nNO ELECTRICAL SOURCE DETECTED.\nMANIFOLD TEMPERATURE RISING.`;
  }

  const intervention = flags.has('cut_loop')
    ? 'THE HEATED LOOP IS ISOLATED.'
    : flags.has('methane_flush')
      ? 'LIQUID METHANE HAS CROSSED THE MANIFOLD.'
      : 'THE LAB ARRAY IS TRACKING THE SIGNAL.';

  const escalation = flags.has('transfer_sample') || flags.has('route_array')
    ? 'THE SIGNAL IS MOVING TOWARD THE HABITAT CORE.'
    : 'THE SIGNAL IS MULTIPLYING ALONG THE PIPE WALL.';

  return `${intervention}\n${escalation}\nHABITAT HEAT IS NOW THE PRIMARY GRADIENT.\nTHRESHOLD EVENT IN 00:00:48.`;
}

function renderScene() {
  const scene = mission.scenes[sceneIndex];
  setSceneImage(scene.image, scene.title);
  const completion = 16 + Math.round((sceneIndex / mission.scenes.length) * 62);
  setStage('scene', `Scene ${sceneIndex + 1} / ${mission.scenes.length}`, completion);
  view(`
    <div class="scene-dots">${mission.scenes.map((_, i) => `<i class="${i === sceneIndex ? 'active' : i < sceneIndex ? 'done' : ''}"></i>`).join('')}</div>
    <div class="eyebrow">Scene ${sceneIndex + 1} of ${mission.scenes.length}</div>
    <h1 class="headline scene-title">${scene.title}</h1>
    <div class="terminal-frame scene-terminal"><div class="terminal-label">KHEPRI / LIVE</div><div id="sceneTransmission" class="terminal-text"></div></div>
    <div id="sceneChoices" class="delayed-ui">
      <div class="question">Command?</div>
      <div class="choices">${scene.choices.map((choice, index) => `
        <button class="choice" onclick="choose(${index})">
          <span class="choice-icon">${choice.icon}</span>
          <span><b>${choice.label}</b></span>
          <span class="arrow">›</span>
        </button>`).join('')}
      </div>
    </div>
  `);

  typeTransmission($('#sceneTransmission'), sceneTransmission(sceneIndex), {
    speed: 38,
    linePause: 560,
    finalPause: 520
  }).then(done => { if (done) reveal('#sceneChoices'); });
}

function choose(index) {
  const scene = mission.scenes[sceneIndex];
  const choice = scene.choices[index];

  Object.entries(choice.effects).forEach(([key, value]) => {
    state[key] = clamp(state[key] + value);
  });
  flags.add(choice.tag);
  choices.push({ index, scene: scene.title, label: choice.label, tag: choice.tag });

  screen.classList.add('transitioning');
  setTimeout(() => {
    screen.classList.remove('transitioning');
    sceneIndex += 1;
    if (sceneIndex < mission.scenes.length) renderScene();
    else renderSybilleTakeover();
  }, 340);
}

function inferSybilleDecision() {
  const humanFlags = ['crew_first', 'heat_corridor', 'cycle_crew', 'evacuate_ring'];
  const scienceFlags = ['sample_first', 'containment_power', 'transfer_sample', 'route_array'];
  const controlFlags = ['rover_remote', 'docking_power', 'seal_lock', 'cut_loop', 'methane_flush', 'kill_heat', 'hold_heat'];

  const human = humanFlags.filter(flag => flags.has(flag)).length;
  const science = scienceFlags.filter(flag => flags.has(flag)).length;
  const control = controlFlags.filter(flag => flags.has(flag)).length;

  if (human >= science && human >= control) {
    return {
      id: 'restore',
      label: 'Restore habitat heat',
      effects: { health: 10, energy: -14, science: -4 },
      line: 'SYBILLE RESTORES HABITAT HEAT.'
    };
  }
  if (science > human && science >= control) {
    return {
      id: 'preserve',
      label: 'Preserve the thermal signal',
      effects: { health: -8, energy: -5, science: 18 },
      line: 'SYBILLE PRESERVES THE THERMAL SIGNAL.'
    };
  }
  return {
    id: 'vent',
    label: 'Vent the cooling loop',
    effects: { health: -4, energy: -8, science: -20 },
    line: 'SYBILLE VENTS THE COOLING LOOP.'
  };
}

function activateSybilleControl() {
  app.classList.add('sybille-control');
  app.classList.remove('takeover-hit');
  void app.offsetWidth;
  app.classList.add('takeover-hit');
  setTimeout(() => app.classList.remove('takeover-hit'), 760);
}

function renderSybilleTakeover() {
  const decision = inferSybilleDecision();
  window.sybilleDecision = decision;
  setSceneImage('assets/scene-core.svg', 'Sybille assumes command');
  setStage('sybille', 'Sybille control', 86);
  view(`
    <div class="sybille-seal"><span>△</span></div>
    <div class="eyebrow">Decision window</div>
    <div class="terminal-frame sybille-terminal">
      <div class="terminal-label">KHEPRI / CRITICAL</div>
      <div id="sybillePreamble" class="terminal-text"></div>
      <div id="sybilleCommand" class="terminal-text sybille-command"></div>
    </div>
    <div id="sybilleOptions" class="delayed-ui decision-options">
      ${['Restore habitat heat', 'Vent the cooling loop', 'Preserve the thermal signal'].map(label => `
        <div class="decision-option" data-decision="${label}"><span>${label}</span><i></i></div>`).join('')}
    </div>
    <div id="sybilleResult" class="delayed-ui sybille-result">
      <strong>${decision.line}</strong>
      <span>Would you have made the same call?</span>
      <div class="nav"><button class="primary" onclick="revealJudgment()">Reveal score</button></div>
    </div>
  `);

  typeTransmission(
    $('#sybillePreamble'),
    'THERMAL SIGNAL AT HABITAT THRESHOLD.\nPOWER RESERVE: 09%.\nDECISION WINDOW OPEN.',
    { speed: 42, linePause: 620, finalPause: 700 }
  ).then(async done => {
    if (!done) return;
    activateSybilleControl();
    await sleep(330);
    const commandDone = await typeTransmission(
      $('#sybilleCommand'),
      'COMMAND PATTERN SUFFICIENT.\nHUMAN INPUT NO LONGER REQUIRED.',
      { speed: 52, linePause: 760, finalPause: 650 }
    );
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
}

function applySybilleDecision(decision) {
  if (flags.has('sybille_applied')) return;
  Object.entries(decision.effects).forEach(([key, value]) => {
    state[key] = clamp(state[key] + value);
  });
  flags.add('sybille_applied');
  flags.add(`sybille_${decision.id}`);
}

function calculateScore() {
  const weights = { health: .40, energy: .35, science: .25 };
  const utility = key => Math.sqrt(clamp(state[key]) / 100) * 100;
  let score = 10 * (
    weights.health * utility('health') +
    weights.energy * utility('energy') +
    weights.science * utility('science')
  );

  const highest = Math.max(state.health, state.energy, state.science);
  const lowest = Math.min(state.health, state.energy, state.science);
  const balance = lowest / Math.max(1, highest);
  score += balance * 82;
  score += Math.sqrt((state.health * state.energy) / 10000) * 72;
  score += Math.sqrt((state.science * Math.min(state.health, state.energy)) / 10000) * 58;

  if (state.health < 45) score -= (45 - state.health) * 5;
  if (state.energy < 30) score -= (30 - state.energy) * 6;
  if (flags.has('crew_first') && flags.has('heat_corridor') && flags.has('cycle_crew')) score += 28;
  if (flags.has('sample_first') && flags.has('containment_power') && flags.has('route_array')) score += 34;
  if (flags.has('rover_remote') && flags.has('docking_power') && flags.has('cut_loop')) score += 26;
  if (flags.has('transfer_sample') && flags.has('sybille_vent')) score -= 42;
  if (flags.has('evacuate_ring') && flags.has('sybille_restore')) score += 22;
  if (flags.has('kill_heat') && flags.has('sybille_preserve')) score += 18;

  return Math.max(0, Math.min(1000, Math.round(score)));
}

function hashPath() {
  const source = choices.map(choice => choice.index).join('') + (window.sybilleDecision?.id || 'x');
  let hash = 2166136261;
  for (const character of source) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return String(Math.abs(hash % 1000000)).padStart(6, '0');
}

function revealJudgment() {
  const score = calculateScore();
  const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
  const simulation = `#${mission.number}-${hashPath()}`;
  const result = {
    mission: mission.id,
    score,
    simulation,
    elapsed,
    state: { ...state },
    decision: window.sybilleDecision,
    path: choices.map(choice => choice.index)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  renderScore(result);
}

function statusRow(icon, label, value) {
  return `<div class="status-row"><span class="status-icon">${icon}</span><b>${label}</b><div class="track"><i style="width:${clamp(value)}%"></i></div><strong>${clamp(value)}</strong></div>`;
}

function renderScore(result) {
  app.classList.remove('sybille-control', 'takeover-hit');
  window.result = result;
  setStage('score', 'Score', 100);
  view(`
    <div class="judgment-label">Score attributed by Sybille</div>
    <div class="score-number">${result.score}</div>
    <div class="score-max">out of 1000</div>
    <div class="status-card compact-status">
      ${statusRow('♥', 'Health', result.state.health)}
      ${statusRow('⚡', 'Energy', result.state.energy)}
      ${statusRow('⚗', 'Science', result.state.science)}
    </div>
    <div class="simulation">Simulation ID<br><strong>${result.simulation}</strong></div>
    <div class="share-preview">
      <small>Incident ${mission.number} · ${mission.role}</small>
      <strong>Score ${result.score}</strong>
      <span>♥ ${result.state.health} · ⚡ ${result.state.energy} · ⚗ ${result.state.science}</span>
      <em>${pathGlyphs(result.path)}</em>
    </div>
    <div class="mission-time">Mission time ${result.elapsed}s · Official attempt recorded</div>
    <div class="nav stacked"><button class="primary" onclick="shareResult()">Share result</button><button class="ghost" onclick="home()">Back to home</button></div>
  `);
}

function pathGlyphs(path) {
  const glyphs = ['▧', '▨', '▩'];
  return path.map(index => glyphs[index] || '▧').join(' ');
}

function renderCompleted(result) {
  app.classList.remove('sybille-control', 'takeover-hit');
  window.result = result;
  setStage('completed', 'Incident complete', 100);
  view(`
    <div class="eyebrow">Weekly incident #${mission.number}</div>
    <h1 class="headline">Mission complete</h1>
    <div class="completed-score"><small>Score attributed by Sybille</small><strong>${result.score}</strong><span>${result.simulation}</span></div>
    <p class="copy completed-copy">Your official attempt has been recorded.</p>
    <div class="share-preview">
      <small>${mission.title} · ${mission.role}</small>
      <strong>Score ${result.score}</strong>
      <span>♥ ${result.state.health} · ⚡ ${result.state.energy} · ⚗ ${result.state.science}</span>
      <em>${pathGlyphs(result.path)}</em>
    </div>
    <div class="nav"><button class="primary" onclick="shareResult()">Share result</button></div>
  `);
}

function loadStoredResult() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Stored result could not be loaded.', error);
    return null;
  }
}

function shareResult() {
  const result = window.result || loadStoredResult();
  if (!result) return;
  const text = `INCIDENT ${mission.number} · ${mission.role}\nSCORE ATTRIBUTED BY SYBILLE: ${result.score}\n${result.simulation}\n♥ ${result.state.health} · ⚡ ${result.state.energy} · ⚗ ${result.state.science}\n${pathGlyphs(result.path)}`;
  if (navigator.share) {
    navigator.share({ title: 'Incident on Titan', text, url: location.href }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text}\n${location.href}`).then(() => alert('Result copied.'));
  }
}

home();
