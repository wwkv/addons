'use strict';

const $ = (id) => document.getElementById(id);

const EMOJI = { off: '⬛', clock: '🕐', sun: '☀️', moon: '🌙', star: '⭐', smiley: '😊', heart: '❤️' };
const LABEL = { off: 'off', clock: 'clock' };

let state = { symbol: 'off', nightlightOn: false, icons: [], customIcons: [] };
let settings = null;
let ws = null;

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(path + ' -> ' + res.status);
  return res.json();
}

const postJson = (path, body) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function connectWs() {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = (ev) => { state = JSON.parse(ev.data); renderState(); };
  ws.onopen = () => setStatus(true);
  ws.onclose = () => { setStatus(false); setTimeout(connectWs, 3000); };
}

function setStatus(ok) {
  $('statusDot').className = 'dot ' + (ok ? 'ok' : 'bad');
  $('statusText').textContent = ok
    ? (state.timeValid ? state.time : 'connected')
    : 'reconnecting…';
}

// ---------------------------------------------------------------------------
// Symbol grid
// ---------------------------------------------------------------------------

function symbolButton(id, custom) {
  const btn = document.createElement('button');
  btn.className = 'symbol' + (state.symbol === id ? ' active' : '');
  if (custom) {
    const img = document.createElement('img');
    img.src = '/icons/' + custom;
    btn.appendChild(img);
    const del = document.createElement('a');
    del.className = 'del';
    del.textContent = '✕';
    del.href = '#';
    del.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm('Delete icon ' + custom + '?')) return;
      await fetch('/api/icons?name=' + encodeURIComponent(custom), { method: 'DELETE' });
      refreshState();
    };
    btn.appendChild(del);
  } else {
    btn.textContent = EMOJI[id] || '❓';
  }
  const small = document.createElement('small');
  small.textContent = custom ? custom.replace(/\.png$/, '') : (LABEL[id] || id);
  btn.appendChild(small);
  btn.onclick = () => postJson('/api/state', { symbol: id });
  return btn;
}

function renderSymbols() {
  const grid = $('symbolGrid');
  grid.innerHTML = '';
  grid.appendChild(symbolButton('off'));
  grid.appendChild(symbolButton('clock'));
  for (const id of state.icons) grid.appendChild(symbolButton(id));
  for (const f of state.customIcons) grid.appendChild(symbolButton('custom:' + f, f));
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderState() {
  renderSymbols();
  const t = $('nlToggle');
  t.textContent = state.nightlightOn ? 'On' : 'Off';
  t.className = 'big-toggle' + (state.nightlightOn ? ' on' : '');
  setStatus(ws && ws.readyState === 1);
}

function renderSettings() {
  if (!settings) return;
  const nl = settings.nightlight;
  $('nlColor').value = '#' + [nl.r, nl.g, nl.b].map((v) => v.toString(16).padStart(2, '0')).join('');
  $('nlBrightness').value = nl.brightness;
  $('nlTimeout').value = String(nl.timeoutS);
  $('schedEnabled').checked = settings.scheduleEnabled;
  $('lampBrightness').value = settings.lampBrightness;
  $('lampVal').textContent = settings.lampBrightness;
  $('mirror').checked = settings.mirror;
  $('wifiSsid').value = settings.wifiSsid || '';
  $('mqttHost').value = settings.mqttHost || '';
  $('mqttPort').value = settings.mqttPort || 1883;
  $('mqttUser').value = settings.mqttUser || '';
  renderSchedule();
}

function scheduleSymbolOptions(selected) {
  const all = ['off', 'clock', ...state.icons, ...state.customIcons.map((f) => 'custom:' + f)];
  return all
    .map((s) => `<option value="${s}" ${s === selected ? 'selected' : ''}>${EMOJI[s] || ''} ${s.replace('custom:', '').replace(/\.png$/, '')}</option>`)
    .join('');
}

function renderSchedule() {
  const list = $('schedList');
  list.innerHTML = '';
  (settings.schedule || []).forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'sched-entry';
    row.innerHTML = `
      <input type="time" value="${entry.time}">
      <select>${scheduleSymbolOptions(entry.symbol)}</select>
      <button class="rm" title="remove">✕</button>`;
    row.querySelector('input').onchange = (e) => { entry.time = e.target.value; pushSchedule(); };
    row.querySelector('select').onchange = (e) => { entry.symbol = e.target.value; pushSchedule(); };
    row.querySelector('.rm').onclick = () => { settings.schedule.splice(i, 1); pushSchedule(); renderSchedule(); };
    list.appendChild(row);
  });
}

const pushSchedule = () =>
  postJson('/api/settings', { schedule: settings.schedule, scheduleEnabled: settings.scheduleEnabled });

// ---------------------------------------------------------------------------
// Wire up controls
// ---------------------------------------------------------------------------

$('nlToggle').onclick = () => postJson('/api/state', { nightlightOn: !state.nightlightOn });

$('nlColor').oninput = debounce(() => {
  const hex = $('nlColor').value;
  postJson('/api/settings', {
    nightlight: {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    },
  });
}, 250);

$('nlBrightness').oninput = debounce(
  () => postJson('/api/settings', { nightlight: { brightness: +$('nlBrightness').value } }), 250);

$('nlTimeout').onchange = () =>
  postJson('/api/settings', { nightlight: { timeoutS: +$('nlTimeout').value } });

$('schedEnabled').onchange = () => { settings.scheduleEnabled = $('schedEnabled').checked; pushSchedule(); };

$('schedAdd').onclick = () => {
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
  refreshState();
};

$('lampBrightness').oninput = debounce(() => {
  $('lampVal').textContent = $('lampBrightness').value;
  postJson('/api/settings', { lampBrightness: +$('lampBrightness').value });
}, 250);

$('mirror').onchange = () => postJson('/api/settings', { mirror: $('mirror').checked });

$('testPattern').onclick = () => postJson('/api/state', { symbol: 'test' });

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
  if (resp.rebootRequired && confirm('Network settings changed. Reboot now?')) {
    await fetch('/api/reboot', { method: 'POST' });
  }
};

$('reboot').onclick = async () => {
  if (confirm('Reboot the clock?')) await fetch('/api/reboot', { method: 'POST' });
};

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function refreshState() {
  state = await api('/api/state');
  renderState();
}

(async () => {
  try {
    await refreshState();
    settings = await api('/api/settings');
    renderSettings();
  } catch (e) {
    console.error(e);
    setStatus(false);
  }
  connectWs();
})();
