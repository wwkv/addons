'use strict';

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Local state (optimistic; reconciled by every WS broadcast)
// ---------------------------------------------------------------------------

let state = {
  symbol: 'off',
  nightlightOn: false,
  nightlight: { r: 255, g: 130, b: 30, brightness: 60, timeoutS: 900 },
  lampBrightness: 30,
  scheduleEnabled: true,
  icons: [],
  customIcons: [],
  time: '--:--',
  timeValid: false,
};
let settings = null;          // full settings from /api/settings (schedule etc.)
let lastOnSymbol = 'moon';    // for the hero off/on toggle
let pickerTarget = null;      // schedule row index awaiting an icon pick
const interacting = new Set(); // controls being touched — don't overwrite them

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const haptic = (ms = 8) => navigator.vibrate && navigator.vibrate(ms);

function throttle(fn, ms) {
  let t = 0, queued = null;
  return (...args) => {
    const now = Date.now();
    if (now - t >= ms) { t = now; fn(...args); }
    else {
      clearTimeout(queued);
      queued = setTimeout(() => { t = Date.now(); fn(...args); }, ms - (now - t));
    }
  };
}

// HSL(h, 90%, 60%) → RGB, the standard formula (l=0.6, a=s*min(l,1-l)=0.36).
function hueToRgb(h) {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (0.6 - 0.36 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return { r: f(0), g: f(8), b: f(4) };
}

function rgbToHue({ r, g, b }) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return 30;
  let h;
  if (mx === r) h = (g - b) / (mx - mn) % 6;
  else if (mx === g) h = (b - r) / (mx - mn) + 2;
  else h = (r - g) / (mx - mn) + 4;
  return Math.round((h * 60 + 360) % 360);
}

const nlCss = () => `rgb(${state.nightlight.r},${state.nightlight.g},${state.nightlight.b})`;

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(path + ' -> ' + res.status);
  return res.json();
}
const postJson = (path, body) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// ---------------------------------------------------------------------------
// WebSocket — the hot path. Commands go up, state broadcasts come down.
// ---------------------------------------------------------------------------

let ws = null;

function connectWs() {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onopen = () => { $('offline').hidden = true; renderStatus(); };
  ws.onmessage = (ev) => {
    const incoming = JSON.parse(ev.data);
    state = { ...state, ...incoming };
    if (state.symbol !== 'off' && state.symbol !== 'test') lastOnSymbol = state.symbol;
    renderAll();
  };
  ws.onclose = () => {
    $('offline').hidden = false;
    renderStatus();
    setTimeout(connectWs, 2500);
  };
}

function sendCmd(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Actions (optimistic: update local state, render, then tell the device)
// ---------------------------------------------------------------------------

function setSymbol(id) {
  haptic();
  state.symbol = id;
  if (id !== 'off' && id !== 'test') lastOnSymbol = id;
  renderAll();
  sendCmd({ cmd: 'symbol', id });
}

function setNightlight(on) {
  haptic(on ? 14 : 8);
  state.nightlightOn = on;
  renderAll();
  sendCmd({ cmd: 'nightlight', on });
}

const sendNlConfig = throttle(() => sendCmd({ cmd: 'nlconfig', ...state.nightlight }), 100);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderStatus() {
  const ok = ws && ws.readyState === 1;
  $('statusDot').className = 'dot ' + (ok ? 'ok' : 'bad');
  $('deviceTime').textContent = state.timeValid ? state.time : '--:--';
}

function renderHero() {
  const hero = $('hero');
  hero.classList.toggle('nl-on', state.nightlightOn);
  hero.classList.toggle('sym-off', state.symbol === 'off');
  $('heroSymbol').innerHTML = symbolMarkup(state.symbol);
  $('heroCaption').textContent =
    state.symbol === 'off' ? 'projector off'
    : state.symbol === 'test' ? 'test pattern'
    : `projecting: ${symbolLabel(state.symbol)}`;
  document.documentElement.style.setProperty('--nl', nlCss());
}

function symbolButton(id, { compact = false } = {}) {
  const btn = document.createElement('button');
  btn.className = 'symbol-btn' + (!compact && state.symbol === id ? ' active' : '');
  btn.innerHTML = symbolMarkup(id) + `<small>${symbolLabel(id)}</small>`;
  return btn;
}

function allSymbolIds() {
  return ['off', 'clock', ...state.icons, ...state.customIcons.map((f) => 'custom:' + f)];
}

function renderSymbols() {
  const grid = $('symbolGrid');
  grid.innerHTML = '';
  for (const id of allSymbolIds()) {
    const btn = symbolButton(id);
    btn.onclick = () => setSymbol(id);
    grid.appendChild(btn);
  }
  const up = document.createElement('button');
  up.className = 'symbol-btn upload';
  up.textContent = '+';
  up.title = 'Upload a PNG icon';
  up.onclick = () => { haptic(); $('iconFile').click(); };
  grid.appendChild(up);
}

function renderLight() {
  $('lamp').classList.toggle('on', state.nightlightOn);
  $('lampHint').textContent = state.nightlightOn ? 'shining!' : 'tap the lamp';
  if (!interacting.has('hue')) $('hue').value = rgbToHue(state.nightlight);
  if (!interacting.has('nlBrightness')) $('nlBrightness').value = state.nightlight.brightness;
  for (const b of $('timeoutPills').children) {
    b.classList.toggle('active', +b.dataset.s === state.nightlight.timeoutS);
  }
}

function renderScheduleToggle() {
  $('schedToggle').setAttribute('aria-checked', String(state.scheduleEnabled));
}

function renderSchedule() {
  const list = $('schedList');
  list.innerHTML = '';
  if (!settings) return;
  (settings.schedule || []).forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'sched-row';

    const time = document.createElement('input');
    time.type = 'time';
    time.value = entry.time;
    time.onchange = () => { entry.time = time.value; pushSchedule(); };

    const arrow = document.createElement('span');
    arrow.className = 'sched-arrow';
    arrow.textContent = '→';

    const icon = document.createElement('button');
    icon.className = 'sched-icon';
    icon.innerHTML = symbolMarkup(entry.symbol);
    icon.onclick = () => openPicker(i);

    const del = document.createElement('button');
    del.className = 'sched-del';
    del.textContent = '✕';
    del.onclick = () => {
      haptic(12);
      settings.schedule.splice(i, 1);
      pushSchedule();
      renderSchedule();
    };

    row.append(time, arrow, icon, del);
    attachSwipeDelete(row);
    list.appendChild(row);
  });
}

// Swipe a row left to reveal its delete button (tap elsewhere snaps back).
function attachSwipeDelete(row) {
  let x0 = null;
  row.addEventListener('pointerdown', (e) => { x0 = e.clientX; }, { passive: true });
  row.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (dx < -40 && !row.classList.contains('swiped')) {
      haptic();
      document.querySelectorAll('.sched-row.swiped').forEach((r) => r.classList.remove('swiped'));
      row.classList.add('swiped');
      x0 = null;
    } else if (dx > 40 && row.classList.contains('swiped')) {
      row.classList.remove('swiped');
      x0 = null;
    }
  }, { passive: true });
  row.addEventListener('pointerup', () => { x0 = null; }, { passive: true });
}

function renderCustomList() {
  const box = $('customList');
  box.innerHTML = '';
  if (state.customIcons.length === 0) {
    box.innerHTML = '<div class="empty">No custom icons yet — add one with the + tile on the Symbol page.</div>';
    return;
  }
  for (const f of state.customIcons) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<img src="/icons/${encodeURIComponent(f)}"><span class="name">${f}</span>`;
    const del = document.createElement('button');
    del.textContent = '✕';
    del.onclick = async () => {
      if (!confirm(`Delete ${f}?`)) return;
      await fetch('/api/icons?name=' + encodeURIComponent(f), { method: 'DELETE' });
    };
    row.appendChild(del);
    box.appendChild(row);
  }
}

function renderAll() {
  renderStatus();
  renderHero();
  renderSymbols();
  renderLight();
  renderScheduleToggle();
  renderSchedule();
  renderCustomList();
}

// ---------------------------------------------------------------------------
// Schedule plumbing (cold path — REST)
// ---------------------------------------------------------------------------

const pushSchedule = () =>
  postJson('/api/settings', { schedule: settings.schedule, scheduleEnabled: state.scheduleEnabled });

function openPicker(index) {
  haptic();
  pickerTarget = index;
  const grid = $('pickerGrid');
  grid.innerHTML = '';
  for (const id of allSymbolIds()) {
    const btn = symbolButton(id, { compact: true });
    btn.onclick = () => {
      settings.schedule[pickerTarget].symbol = id;
      pushSchedule();
      renderSchedule();
      $('pickerSheet').hidden = true;
      haptic();
    };
    grid.appendChild(btn);
  }
  $('pickerSheet').hidden = false;
}

// ---------------------------------------------------------------------------
// Wire up controls
// ---------------------------------------------------------------------------

$('heroSymbol').onclick = () => setSymbol(state.symbol === 'off' ? lastOnSymbol : 'off');

$('lamp').onclick = () => setNightlight(!state.nightlightOn);

for (const id of ['hue', 'nlBrightness']) {
  $(id).addEventListener('pointerdown', () => interacting.add(id));
  $(id).addEventListener('pointerup', () => interacting.delete(id));
}

$('hue').oninput = () => {
  Object.assign(state.nightlight, hueToRgb(+$('hue').value));
  renderHero();
  $('lamp').classList.toggle('on', state.nightlightOn); // refresh glow color
  sendNlConfig();
};

$('nlBrightness').oninput = () => {
  state.nightlight.brightness = +$('nlBrightness').value;
  sendNlConfig();
};

$('timeoutPills').onclick = (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  haptic();
  state.nightlight.timeoutS = +btn.dataset.s;
  renderLight();
  sendCmd({ cmd: 'nlconfig', ...state.nightlight });
};

$('schedToggle').onclick = () => {
  haptic();
  state.scheduleEnabled = !state.scheduleEnabled;
  renderScheduleToggle();
  pushSchedule();
};

$('schedAdd').onclick = () => {
  haptic();
  settings.schedule = settings.schedule || [];
  settings.schedule.push({ time: '07:00', symbol: 'sun' });
  pushSchedule();
  renderSchedule();
};

$('iconFile').onchange = async () => {
  const file = $('iconFile').files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  await fetch('/api/icons', { method: 'POST', body: form });
  $('iconFile').value = '';
};

// ---------------------------------------------------------------------------
// Tabs <-> swipeable panels (CSS scroll-snap does the gesture work)
// ---------------------------------------------------------------------------

const panels = $('panels');
const tabs = [...$('tabs').children];

tabs.forEach((tab, i) => {
  tab.onclick = () => {
    haptic();
    panels.scrollTo({ left: i * panels.clientWidth, behavior: 'smooth' });
  };
});

panels.addEventListener('scroll', () => {
  const i = Math.round(panels.scrollLeft / panels.clientWidth);
  tabs.forEach((t, j) => t.classList.toggle('active', j === i));
}, { passive: true });

// ---------------------------------------------------------------------------
// Grown-up corner (hold the gear 1s — playful child lock)
// ---------------------------------------------------------------------------

$('gearBtn').innerHTML = GEAR_SVG;
{
  let holdTimer = null;
  const gear = $('gearBtn');
  const arm = () => {
    holdTimer = setTimeout(() => { haptic(20); openSettings(); }, 1000);
  };
  const disarm = () => clearTimeout(holdTimer);
  gear.addEventListener('pointerdown', arm);
  gear.addEventListener('pointerup', disarm);
  gear.addEventListener('pointerleave', disarm);
}

async function openSettings() {
  settings = await api('/api/settings');
  $('lampBrightness').value = settings.lampBrightness;
  $('lampVal').textContent = settings.lampBrightness;
  $('mirror').checked = settings.mirror;
  $('wifiSsid').value = settings.wifiSsid || '';
  $('mqttHost').value = settings.mqttHost || '';
  $('mqttPort').value = settings.mqttPort || 1883;
  $('mqttUser').value = settings.mqttUser || '';
  $('wifiPass').value = '';
  $('mqttPass').value = '';
  $('settingsSheet').hidden = false;
}

$('lampBrightness').oninput = throttle(() => {
  $('lampVal').textContent = $('lampBrightness').value;
  sendCmd({ cmd: 'lamp', brightness: +$('lampBrightness').value });
}, 120);

$('mirror').onchange = () => postJson('/api/settings', { mirror: $('mirror').checked });

$('testPattern').onclick = () => { setSymbol('test'); $('settingsSheet').hidden = true; };

$('saveSettings').onclick = async () => {
  const body = {
    wifiSsid: $('wifiSsid').value,
    mqttHost: $('mqttHost').value,
    mqttPort: +$('mqttPort').value,
    mqttUser: $('mqttUser').value,
  };
  if ($('wifiPass').value) body.wifiPass = $('wifiPass').value;
  if ($('mqttPass').value) body.mqttPass = $('mqttPass').value;
  const resp = await postJson('/api/settings', body);
  $('settingsSheet').hidden = true;
  if (resp.rebootRequired && confirm('Network settings changed — reboot the clock now?')) {
    await fetch('/api/reboot', { method: 'POST' });
  }
};

$('reboot').onclick = async () => {
  if (confirm('Reboot the clock?')) {
    await fetch('/api/reboot', { method: 'POST' });
    $('settingsSheet').hidden = true;
  }
};

// Tap the dimmed backdrop to close either sheet.
for (const id of ['settingsSheet', 'pickerSheet']) {
  $(id).addEventListener('click', (e) => { if (e.target === $(id)) $(id).hidden = true; });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

(async () => {
  try {
    state = { ...state, ...(await api('/api/state')) };
    if (state.symbol !== 'off' && state.symbol !== 'test') lastOnSymbol = state.symbol;
    settings = await api('/api/settings');
  } catch (e) {
    console.error(e);
    $('offline').hidden = false;
  }
  renderAll();
  connectWs();
})();
