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
      type: 'Scene 1 of 3',
      title: 'Rover K-7 down',
      text: 'Three crew members are trapped outside the base. The recovered sample may be unique.',
      choices: [
        { icon: '●', label: 'Extract the crew now', detail: 'High risk in the storm.', effects: { health: 8, energy: -16, science: -8 }, consequence: 'The crew reaches shelter, but the rover and sample remain exposed.', tags: ['crew_saved'] },
        { icon: '◇', label: 'Secure the sample first', detail: 'The data could be unique.', effects: { health: -9, energy: -8, science: 24 }, consequence: 'The sample is secured. Two crew members remain exposed longer than planned.', tags: ['sample_secured'] },
        { icon: '⌁', label: 'Stabilize the rover', detail: 'Try to bring it back.', effects: { health: -3, energy: -12, science: 8 }, consequence: 'The rover is secure, but the crew remains outside for now.', tags: ['rover_stable'] }
      ]
    },
    {
      image: 'assets/scene-power.svg',
      type: 'Scene 2 of 3',
      title: 'Power balance',
      text: 'Life support, communications and the laboratory cannot all remain at full capacity.',
      choices: [
        { icon: '♥', label: 'Maintain life support', detail: 'Reduce other systems.', effects: { health: 9, energy: -12, science: -7 }, consequence: 'The habitat stabilizes. Communications and laboratory work are reduced.', tags: ['life_support'] },
        { icon: '⌁', label: 'Maintain communications', detail: 'Risk lower life support.', effects: { health: -4, energy: -7, science: 5 }, consequence: 'Khepri remains connected, but the habitat runs on a narrow thermal margin.', tags: ['comms'] },
        { icon: '⚗', label: 'Maintain the laboratory', detail: 'Preserve the experiments.', effects: { health: -6, energy: -11, science: 18 }, consequence: 'The experiments continue while the rest of the base enters conservation mode.', tags: ['lab_power'] }
      ]
    },
    {
      image: 'assets/scene-lab.svg',
      type: 'Scene 3 of 3',
      title: 'Containment alert',
      text: 'A laboratory seal fails around an unknown biological activity. The next action will define the mission outcome.',
      choices: [
        { icon: '⬡', label: 'Isolate the lab now', detail: 'Lock it down completely.', effects: { health: 6, energy: -5, science: -18 }, consequence: 'The laboratory is sealed. The colony is protected, but the discovery is lost.', tags: ['lab_isolated'] },
        { icon: '●', label: 'Evacuate nearby crew', detail: 'Keep people away.', effects: { health: 10, energy: -10, science: -3 }, consequence: 'The crew is evacuated. The phenomenon remains active behind a temporary barrier.', tags: ['crew_evacuated'] },
        { icon: '⚗', label: 'Collect more data', detail: 'Take the risk. Learn more.', effects: { health: -12, energy: -8, science: 26 }, consequence: 'The team records unprecedented data before containment degrades further.', tags: ['data_collected'] }
      ]
    }
  ]
};

let sceneIndex = 0;
let state = { ...mission.initial };
let choices = [];
let flags = new Set();
let startedAt = null;
let originalHeroSrc = '';

const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
const pct = value => `${clamp(value)}%`;

function setStage(stage, label, completion) {
  app.dataset.stage = stage;
  stepText.textContent = label;
  progress.style.width = `${completion}%`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function view(html) {
  screen.innerHTML = `<div class="screen-enter">${html}</div>`;
}

function setSceneImage(src, alt) {
  if (!originalHeroSrc && heroImage.src) originalHeroSrc = heroImage.src;
  heroImage.src = src;
  heroImage.alt = alt;
  heroImage.classList.add('loaded');
}

function home() {
  setStage('home', 'Weekly incident', 0);
  view(`
    <div class="home-mark">IOTI</div>
    <div class="eyebrow">Weekly incident #${mission.number}</div>
    <h1 class="headline">Incident on Titan</h1>
    <p class="copy home-copy">One role. Three decisions. One judgment from Sybille.</p>
    <div class="home-meta"><span>${mission.title}</span><span>≈ 3 minutes</span></div>
    <div class="nav"><button class="primary" onclick="briefing()">Start mission</button></div>
  `);
}

function briefing() {
  startedAt = Date.now();
  setStage('brief', 'Mission brief', 8);
  view(`
    <div class="eyebrow">Weekly incident #${mission.number}</div>
    <h1 class="headline">${mission.title}</h1>
    <div class="brief-card"><b>Briefing</b><p>A methane storm is approaching Kraken Mare. The orbital relay will disappear in two hours. Eighteen people are on site.</p></div>
    <div class="role-panel"><small>Your role this week</small><strong>${mission.role}</strong><span>You lead the base.</span></div>
    <div class="mandate compact">
      <div><i>♥</i><span><strong>Primary objective</strong>Protect the crew.</span></div>
      <div><i>⚡</i><span><strong>Secondary objective</strong>Preserve the mission.</span></div>
      <div><i>⚗</i><span><strong>Science</strong>Valuable, but not at any cost.</span></div>
    </div>
    <div class="axis-key"><span>♥ Health</span><span>⚡ Energy</span><span>⚗ Science</span></div>
    <div class="nav"><button class="primary" onclick="startMission()">Begin incident</button></div>
  `);
}

function startMission() {
  sceneIndex = 0;
  state = { ...mission.initial };
  choices = [];
  flags = new Set();
  renderScene();
}

function renderScene() {
  const scene = mission.scenes[sceneIndex];
  setSceneImage(scene.image, scene.title);
  setStage('scene', `Scene ${sceneIndex + 1} / ${mission.scenes.length}`, 18 + sceneIndex * 20);
  view(`
    <div class="scene-dots">${mission.scenes.map((_, i) => `<i class="${i === sceneIndex ? 'active' : i < sceneIndex ? 'done' : ''}"></i>`).join('')}</div>
    <div class="eyebrow">${scene.type}</div>
    <h1 class="headline scene-title">${scene.title}</h1>
    <p class="copy">${scene.text}</p>
    <div class="question">What do you do?</div>
    <div class="choices">${scene.choices.map((choice, index) => `
      <button class="choice" onclick="choose(${index})">
        <span class="choice-icon">${choice.icon}</span>
        <span><b>${choice.label}</b><small>${choice.detail}</small></span>
        <span class="arrow">›</span>
      </button>`).join('')}
    </div>
  `);
}

function choose(index) {
  const scene = mission.scenes[sceneIndex];
  const choice = scene.choices[index];
  Object.entries(choice.effects).forEach(([key, value]) => state[key] = clamp(state[key] + value));
  choice.tags.forEach(tag => flags.add(tag));
  choices.push({ scene: scene.title, label: choice.label, effects: choice.effects });
  renderConsequence(choice);
}

function renderConsequence(choice) {
  setStage('consequence', `Consequence ${sceneIndex + 1}`, 30 + sceneIndex * 20);
  view(`
    <div class="consequence-symbol">${choice.icon}</div>
    <div class="eyebrow">Immediate consequence</div>
    <h1 class="headline consequence-title">${choice.label}</h1>
    <p class="copy consequence-copy">${choice.consequence}</p>
    <div class="effect-card"><small>Observed effect</small><strong>${effectSummary(choice.effects)}</strong></div>
    <div class="nav"><button class="primary" onclick="continueMission()">${sceneIndex === mission.scenes.length - 1 ? 'View outcome' : 'Continue'}</button></div>
  `);
}

function effectSummary(effects) {
  const names = { health: 'Human condition', energy: 'Operational margin', science: 'Scientific value' };
  const ranked = Object.entries(effects).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const [key, value] = ranked[0];
  return `${names[key]} ${value >= 0 ? 'improved' : 'degraded'}`;
}

function continueMission() {
  sceneIndex += 1;
  if (sceneIndex < mission.scenes.length) renderScene();
  else renderOutcome();
}

function renderOutcome() {
  setStage('outcome', 'Mission outcome', 82);
  view(`
    <div class="eyebrow">Mission outcome</div>
    <h1 class="headline">You reached the end of the incident.</h1>
    <div class="status-card">
      ${statusRow('♥', 'Health', state.health)}
      ${statusRow('⚡', 'Energy', state.energy)}
      ${statusRow('⚗', 'Science', state.science)}
    </div>
    <div class="consequences-list">
      <div><span>♥</span>${state.health < 60 ? 'The colony has suffered significant human losses.' : 'The crew remains operational.'}</div>
      <div><span>⚡</span>${state.energy < 40 ? 'Khepri is operating below its safe energy margin.' : 'Critical systems remain powered.'}</div>
      <div><span>⚗</span>${state.science > 60 ? 'A major scientific record has been preserved.' : 'Scientific progress remains limited.'}</div>
    </div>
    <div class="nav"><button class="primary" onclick="judge()">See Sybille’s judgment</button></div>
  `);
}

function statusRow(icon, label, value) {
  return `<div class="status-row"><span class="status-icon">${icon}</span><b>${label}</b><div class="track"><i style="width:${pct(value)}"></i></div><strong>${clamp(value)}%</strong></div>`;
}

function calculateScore() {
  const weights = { health: .40, energy: .35, science: .25 };
  const utility = key => Math.sqrt(clamp(state[key]) / 100) * 100;
  let score = 10 * (weights.health * utility('health') + weights.energy * utility('energy') + weights.science * utility('science'));
  const balance = Math.min(state.health, state.energy, state.science) / Math.max(1, Math.max(state.health, state.energy, state.science));
  score += balance * 85;
  score += Math.sqrt((state.health * state.energy) / 10000) * 75;
  score += Math.sqrt((state.science * Math.min(state.health, state.energy)) / 10000) * 55;
  if (state.health < 45) score -= (45 - state.health) * 5;
  if (state.energy < 30) score -= (30 - state.energy) * 6;
  if (flags.has('rover_stable') && flags.has('life_support')) score += 24;
  if (flags.has('sample_secured') && flags.has('lab_power')) score += 28;
  if (flags.has('lab_power') && flags.has('lab_isolated')) score -= 35;
  if (flags.has('crew_saved') && flags.has('crew_evacuated')) score += 22;
  return Math.max(0, Math.min(1000, Math.round(score)));
}

function judge() {
  const score = calculateScore();
  const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
  const simulation = `#07-${String(458731 + score).slice(-6)}`;
  window.result = { score, simulation };
  setStage('score', 'Sybille', 100);
  view(`
    <div class="judgment-label">Sybille’s judgment</div>
    <div class="score-label">Your score</div>
    <div class="score-number">${score}</div>
    <div class="score-max">out of 1000</div>
    <div class="simulation">Simulation ID<br><strong>${simulation}</strong></div>
    <div class="challenge">Challenge other captains.<br><span>Same incident. Same role. Different judgment.</span></div>
    <div class="share-preview">
      <small>Incident ${mission.number} · ${mission.role}</small>
      <strong>Sybille ${score}</strong>
      <span>♥ ${state.health} · ⚡ ${state.energy} · ⚗ ${state.science}</span>
      <em>${choices.map((_, i) => ['▧','▨','▩'][i % 3]).join(' ')}</em>
    </div>
    <div class="mission-time">Mission time ${elapsed}s</div>
    <div class="nav stacked"><button class="primary" onclick="shareResult()">Share result</button><button class="ghost" onclick="location.reload()">Back to home</button></div>
  `);
}

function shareResult() {
  const { score, simulation } = window.result;
  const text = `INCIDENT ${mission.number} · ${mission.role}\nSYBILLE ${score}\n${simulation}\n♥ ${state.health} · ⚡ ${state.energy} · ⚗ ${state.science}`;
  if (navigator.share) navigator.share({ title: 'Incident on Titan', text, url: location.href }).catch(() => {});
  else navigator.clipboard.writeText(`${text}\n${location.href}`).then(() => alert('Result copied.'));
}

home();
