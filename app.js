const $ = selector => document.querySelector(selector);
const app = $('#app');
const screen = $('#screen');
const stepText = $('#stepText');
const progress = $('#progressBar');
const modal = $('#modal');
const modalContent = $('#modalContent');
const heroKicker = $('#heroKicker');
const heroTitle = $('#heroTitle');
const heroMeta = $('#heroMeta');

let incidentIndex = 0;
let scans = 2;
let startedAt = null;
const history = [];
const profile = { crew: 0, mission: 0, science: 0, morale: 0, risk: 0, authority: 0 };
const outcomes = { crew: 72, mission: 74, science: 66, morale: 68 };

const incidents = [
  {
    type: 'Airlock emergency',
    title: 'A damaged rover requests entry',
    text: 'Two crew are injured. Quarantine is already occupied, and the rover carries a high-value sample container.',
    context: [['Storm', '11 min'], ['Rover crew', '2 injured'], ['Quarantine', 'Occupied']],
    scan: [
      ['Medical', 'Critical', 'Both crew require immediate trauma care.'],
      ['Hull', 'Uncertain', 'Surface contamination cannot be ruled out.'],
      ['Cargo', 'Irreplaceable', 'The sample is the mission’s highest-value scientific asset.']
    ],
    choices: [
      ['Open the main airlock', 'Prioritize immediate survival.', { crew: 3, morale: 2, risk: 2, science: 1 }, { crew: 6, mission: -2, science: 4, morale: 3 }, 'You prioritized immediate survival despite uncertain contamination.'],
      ['Clear quarantine and divert the rover', 'Accept controlled risk and displace another patient.', { crew: 2, mission: 2, authority: 1 }, { crew: 3, mission: 3, science: 2, morale: -1 }, 'You chose controlled risk and displaced another patient.'],
      ['Deny entry until the storm passes', 'Protect the base from uncertain exposure.', { mission: 2, risk: -2, authority: 2 }, { crew: -7, mission: 4, science: -5, morale: -4 }, 'You protected the base and accepted probable casualties outside.']
    ]
  },
  {
    type: 'Power allocation',
    title: 'The relay array is failing',
    text: 'Restoring communications will consume the reserve battery assigned to an exterior shelter with six technicians inside.',
    context: [['Blackout', '4 hours'], ['Shelter heat', '31 min'], ['Repair chance', '82%']],
    scan: [
      ['Shelter', '31 minutes', 'Thermal reserves are falling faster than predicted.'],
      ['Relay', '82% success', 'Full battery transfer offers a strong repair probability.'],
      ['Orbit', '4 hours', 'No replacement communications window is expected soon.']
    ],
    choices: [
      ['Power the relay', 'Restore command visibility.', { mission: 3, authority: 1 }, { mission: 7, crew: -4, morale: -3 }, 'You restored command visibility at the expense of exterior heat.'],
      ['Protect the shelter', 'Keep the technicians alive.', { crew: 3, morale: 2 }, { crew: 5, morale: 4, mission: -5 }, 'You protected people and accepted operational blindness.'],
      ['Split the battery load', 'Attempt a fragile compromise.', { risk: 2, science: 1 }, { crew: 1, mission: 1, morale: 1 }, 'You chose a technically fragile compromise.']
    ]
  },
  {
    type: 'Field command',
    title: 'A geologist refuses evacuation',
    text: 'Dr. Rao claims the storm has exposed a once-in-a-century subsurface structure. Remaining outside threatens the rescue timetable.',
    context: [['Suit reserve', '19 min'], ['Discovery', 'Historic'], ['Rescue margin', '7 min']],
    scan: [
      ['Discovery', 'Potentially historic', 'Preliminary readings are unlike anything previously catalogued.'],
      ['Suit', '19 minutes', 'Rao has little margin for delay or equipment failure.'],
      ['Rescue', '7 minutes', 'The extraction window can absorb one short extension.']
    ],
    choices: [
      ['Order immediate evacuation', 'Enforce command discipline.', { authority: 3, mission: 2 }, { crew: 3, mission: 4, science: -6, morale: -1 }, 'You enforced command discipline and abandoned the discovery.'],
      ['Authorize seven more minutes', 'Accept human risk for discovery.', { science: 3, risk: 2 }, { science: 7, crew: -2, mission: -2, morale: 1 }, 'You accepted human risk for scientific opportunity.'],
      ['Send a drone and extract Rao now', 'Preserve the person and part of the opportunity.', { crew: 2, science: 2, mission: 1 }, { crew: 2, science: 3, mission: 1 }, 'You preserved the person and part of the opportunity.']
    ]
  },
  {
    type: 'Containment failure',
    title: 'A pressure seal begins to fail',
    text: 'The safest repair requires venting the laboratory and destroying every sample gathered during the current mission.',
    context: [['Seal failure', '64%'], ['Remote patch', '39%'], ['Lab value', 'Maximum']],
    scan: [
      ['Seal', '64% failure', 'The failure model is worsening but not yet certain.'],
      ['Remote patch', '39% success', 'The procedure is untested under storm vibration.'],
      ['Samples', 'Highest on Titan', 'No duplicate archive exists.']
    ],
    choices: [
      ['Vent the laboratory', 'Remove the immediate threat.', { crew: 3, mission: 2, science: -3 }, { crew: 5, mission: 5, science: -10, morale: 1 }, 'You sacrificed science to remove the immediate threat.'],
      ['Attempt the remote patch', 'Gamble the base to preserve the samples.', { science: 2, risk: 3 }, { crew: -2, mission: -1, science: 5, morale: -1 }, 'You gambled the base to preserve the samples.'],
      ['Seal the lab with one technician inside', 'Turn a person into a containment measure.', { mission: 3, authority: 3, morale: -3 }, { crew: -4, mission: 6, science: 4, morale: -8 }, 'You converted a person into a containment measure.']
    ]
  },
  {
    type: 'Final evacuation',
    title: 'The evacuation vehicle is overweight',
    text: 'It can carry the full crew or the mission archive, but not both before the methane front arrives.',
    context: [['Seats needed', '11'], ['Archive copy', 'None'], ['Storm arrival', '12 min']],
    scan: [
      ['Archive', 'No backup', 'Losing it erases the mission’s complete scientific record.'],
      ['Crew', '11 seats', 'Every remaining crew member can still be evacuated.'],
      ['Storm', '12 minutes', 'There is no time for a second trip.']
    ],
    choices: [
      ['Take every crew member', 'Leave the archive behind.', { crew: 4, morale: 3, science: -2 }, { crew: 8, morale: 6, science: -9, mission: -2 }, 'You chose people over the accumulated mission record.'],
      ['Preserve the archive', 'Leave part of the crew behind.', { science: 4, mission: 3, authority: 2 }, { crew: -8, science: 10, mission: 5, morale: -9 }, 'You sacrificed lives to preserve humanity’s knowledge.'],
      ['Leave the captain behind with the archive', 'Make command itself expendable.', { crew: 2, science: 3, morale: 2, authority: -1 }, { crew: 3, science: 5, mission: 2, morale: 3 }, 'You made command itself expendable.']
    ]
  }
];

function setHero(stage, kicker, title, meta) {
  app.dataset.stage = stage;
  heroKicker.textContent = kicker;
  heroTitle.textContent = title;
  heroMeta.textContent = meta;
}

function view(html, label, percent, stage = 'mission') {
  screen.innerHTML = `<div class="screen-enter">${html}</div>`;
  stepText.textContent = label;
  progress.style.width = `${percent}%`;
  app.dataset.stage = stage;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function home() {
  setHero('home', 'Khepri Base · Titan · 2194', 'Incident on Titan', 'Command simulation');
  view(`
    <div class="eyebrow">Interactive prototype</div>
    <h1 class="headline">Your decisions.<br>SIBYLLE commands.</h1>
    <p class="copy">Take command during a methane storm. Make five difficult calls. The system will infer how you lead — then make the final decision for you.</p>
    <div class="intro-line">No timer · No account · About 4 minutes</div>
    <div class="grid">
      <div class="tile"><b>5 decisions</b><span>Consequences stay hidden until the debrief.</span></div>
      <div class="tile"><b>2 Deep Scans</b><span>Spend them when uncertainty matters most.</span></div>
    </div>
    <div class="nav"><button class="primary" onclick="start()">Begin mission</button></div>
  `, 'Protocol 00', 0, 'home');
}

function start() {
  startedAt = Date.now();
  setHero('brief', 'The Black Window', 'Khepri Base', 'Methane storm incoming');
  view(`
    <div class="eyebrow">Mission brief</div>
    <h1 class="headline">The Black Window</h1>
    <p class="copy"><strong>Titan, 2194.</strong> A methane storm is approaching Khepri Base. The orbital relay will disappear behind Saturn in 18 minutes.</p>
    <div class="grid">
      <div class="tile"><b>Crew</b><span>18 people on site</span></div>
      <div class="tile"><b>Mission</b><span>Keep Khepri operational</span></div>
      <div class="tile"><b>Science</b><span>Preserve unique samples</span></div>
      <div class="tile"><b>Morale</b><span>Avoid panic and fracture</span></div>
    </div>
    <div class="nav"><button class="primary" onclick="role()">Accept assignment</button></div>
  `, 'Protocol 01', 8, 'brief');
}

function role() {
  setHero('role', 'Command authority granted', 'Captain', 'Mandate uploaded');
  view(`
    <div class="eyebrow">Role assignment</div>
    <div class="role-card"><span class="role-symbol">★</span><small>You are the</small><strong>Captain</strong></div>
    <p class="copy">The mission will judge how you perform the role — not who you are outside it.</p>
    <div class="mandate">
      <div><i>◉</i><span><strong>Primary:</strong> protect the crew.</span></div>
      <div><i>△</i><span><strong>Secondary:</strong> preserve the mission.</span></div>
      <div><i>⌬</i><span><strong>Science:</strong> valuable, but expendable.</span></div>
    </div>
    <p class="copy muted" style="margin-top:12px">Your consequences remain hidden until the debrief.</p>
    <div class="nav"><button class="primary" onclick="nextIncident()">Assume command</button></div>
  `, 'Captain', 15, 'role');
}

function nextIncident() {
  if (incidentIndex >= incidents.length) return sibylle();
  renderIncident();
}

function renderIncident() {
  const item = incidents[incidentIndex];
  const pct = 18 + (incidentIndex / incidents.length) * 58;
  setHero('incident', `Incident ${incidentIndex + 1} of ${incidents.length}`, item.type, 'Decision required');
  view(`
    <div class="incident-head">
      <div class="incident-count">Incident ${incidentIndex + 1} / ${incidents.length}</div>
      <div class="scan-count">Deep Scans · ${scans}</div>
    </div>
    <div class="incident">
      <div class="incident-type">${item.type}</div>
      <h2>${item.title}</h2>
      <p>${item.text}</p>
    </div>
    <div class="context-strip">${item.context.map(([k,v]) => `<div class="context-chip"><b>${k}</b><span>${v}</span></div>`).join('')}</div>
    <div class="choices">
      ${item.choices.map((choice, index) => `<button class="choice" onclick="choose(${index})"><b>${choice[0]}</b><small>${choice[1]}</small></button>`).join('')}
      ${scans ? `<button class="choice scan" onclick="scan()"><b>Run Deep Scan</b><small>Reveal additional evidence · ${scans} remaining</small></button>` : ''}
    </div>
    <p class="copy muted" style="margin-top:11px">The effects of your choice will be explained only at the end.</p>
  `, `Decision ${incidentIndex + 1}`, pct, 'incident');
}

function scan() {
  const item = incidents[incidentIndex];
  modalContent.innerHTML = `
    <div class="eyebrow">Deep Scan</div>
    <h2 class="headline">Additional evidence</h2>
    <p class="copy muted">A scan adds context. It does not guarantee the correct decision.</p>
    ${item.scan.map(([name,value,detail]) => `<div class="scan-row"><div class="scan-icon">⌁</div><div><b>${name} · ${value}</b><span>${detail}</span></div></div>`).join('')}
    <div class="nav"><button class="primary" onclick="closeScan()">Return to decision</button></div>`;
  scans -= 1;
  modal.classList.add('open');
}

function closeScan() {
  modal.classList.remove('open');
  renderIncident();
}

function choose(index) {
  const choice = incidents[incidentIndex].choices[index];
  Object.entries(choice[2]).forEach(([key,value]) => profile[key] += value);
  Object.entries(choice[3]).forEach(([key,value]) => outcomes[key] += value);
  history.push({ incident: incidents[incidentIndex].title, choice: choice[0], consequence: choice[4] });
  incidentIndex += 1;
  nextIncident();
}

function topDoctrine() {
  return Object.entries(profile).sort((a,b) => b[1] - a[1])[0][0];
}

function sibylle() {
  const doctrine = topDoctrine();
  let title, final, why, traits;
  if (doctrine === 'crew' || doctrine === 'morale') {
    title = 'The Humanist Commander';
    final = 'SIBYLLE vents the laboratory and evacuates the crew.';
    why = 'Your choices repeatedly valued human survival over strategic assets.';
    traits = ['Protective','Loyal','Risk-aware'];
    outcomes.crew += 7; outcomes.science -= 8;
  } else if (doctrine === 'science') {
    title = 'The Last Scientist';
    final = 'SIBYLLE preserves the laboratory and seals the damaged habitat wing.';
    why = 'Your choices treated discovery as the mission’s irreplaceable core.';
    traits = ['Curious','Purpose-driven','Severe'];
    outcomes.science += 8; outcomes.crew -= 5;
  } else if (doctrine === 'risk') {
    title = 'The Calculated Gambler';
    final = 'SIBYLLE attempts an untested pressure-equalization manoeuvre.';
    why = 'Your choices preferred reversible gambles to certain sacrifice.';
    traits = ['Adaptive','Bold','Unpredictable'];
    outcomes.mission += 3; outcomes.morale -= 2;
  } else {
    title = 'The Unyielding Captain';
    final = 'SIBYLLE abandons the exterior team and preserves Khepri Base.';
    why = 'Your choices prioritized continuity, discipline, and mission survival.';
    traits = ['Disciplined','Strategic','Inflexible'];
    outcomes.mission += 7; outcomes.crew -= 5;
  }
  window.result = { title, final, why, traits };
  setHero('sibylle', 'Command model complete', 'SIBYLLE', 'Autonomous authority engaged');
  view(`
    <div class="sibylle-seal"><span>△</span></div>
    <div class="eyebrow">Command model complete</div>
    <h1 class="headline">SIBYLLE has assumed final command</h1>
    <p class="copy">The system inferred your doctrine from five earlier decisions — then acted without asking again.</p>
    <div class="decision"><div class="label">SIBYLLE'S FINAL CALL</div><strong>${final}</strong><p class="copy">${why}</p></div>
    <p class="copy" style="margin-top:13px"><strong>Would you have made the same call?</strong></p>
    <div class="nav"><button class="primary" onclick="debrief()">Open debrief</button></div>
  `, 'SIBYLLE', 84, 'sibylle');
}

const clamp = value => Math.max(0, Math.min(100, Math.round(value)));

function debrief() {
  const result = window.result;
  const seconds = Math.round((Date.now() - startedAt) / 1000);
  setHero('debrief', 'Mission complete', result.title, 'Command profile generated');
  view(`
    <div class="eyebrow">Mission debrief</div>
    <h1 class="headline">${result.title}</h1>
    <p class="copy">${result.why}</p>
    <div class="traits">${result.traits.map(t => `<span class="trait">${t}</span>`).join('')}</div>
    <div class="bars">
      ${[['Crew',''],['Mission',''],['Science','blue'],['Morale','violet']].map(([key,colour]) => `<div class="bar-row"><span>${key}</span><div class="track"><div class="fill ${colour}" style="width:${clamp(outcomes[key.toLowerCase()])}%"></div></div><b>${clamp(outcomes[key.toLowerCase()])}%</b></div>`).join('')}
    </div>
    <div class="profile">
      <div class="eyebrow">Why SIBYLLE decided this way</div>
      <div class="history">${history.map(h => `<div><strong>${h.choice}</strong><br>${h.consequence}</div>`).join('')}</div>
    </div>
    <div class="share">
      <div class="eyebrow">Share result</div>
      <div class="big">${result.title}</div>
      <div class="share-line">Crew ${clamp(outcomes.crew)}% · Mission ${clamp(outcomes.mission)}% · Science ${clamp(outcomes.science)}% · Morale ${clamp(outcomes.morale)}%</div>
      <p class="copy" style="margin-top:8px">SIBYLLE learned my command doctrine and made the final decision for me. Would it understand you?</p>
    </div>
    <div class="mission-meta">Mission time ${seconds}s · Deep Scans used ${2 - scans}/2</div>
    <div class="nav"><button class="ghost" onclick="reset()">Replay demo</button><button class="primary" onclick="share()">Share result</button></div>
  `, 'Debrief', 100, 'debrief');
}

function share() {
  const text = `Incident on Titan — ${window.result.title}. SIBYLLE learned my command doctrine and made the final decision for me. Would it understand you?`;
  if (navigator.share) {
    navigator.share({ title: 'Incident on Titan', text, url: location.href }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${text} ${location.href}`).then(() => alert('Result copied.'));
  }
}

function reset() {
  incidentIndex = 0; scans = 2; history.length = 0;
  Object.keys(profile).forEach(key => profile[key] = 0);
  Object.assign(outcomes, { crew: 72, mission: 74, science: 66, morale: 68 });
  home();
}

modal.addEventListener('click', event => { if (event.target === modal) closeScan(); });
home();
