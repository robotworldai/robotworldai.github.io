'use strict';
const DOMAINS = {
  manipulation: {name: 'Manipulation', en: 'Arms and dexterous hands', c: '#0f8b7d'},
  mobile: {name: 'Mobile manipulation', en: 'Household mobile robots', c: '#3f6fb5'},
  locomotion: {name: 'Locomotion', en: 'Legged and wheel-legged', c: '#e0742b'},
  driving: {name: 'Driving', en: 'Wheeled vehicles', c: '#8c6bb1'},
  aerial: {name: 'Aerial', en: 'Drones', c: '#c99a2e'},
};
const MODELS = ['Astra', 'Opus', 'K3', 'DPSK', 'Gemini'];
const HERO_IDS = ['20', '62', '70', '10', '05', '37', '09', '82'];
const state = {domain: 'all', model: 'Astra', score: 'all'};
const requestedModel = new URLSearchParams(location.search).get('model');
if (MODELS.includes(requestedModel)) state.model = requestedModel;

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k instanceof Node ? k : String(k));
  return n;
}
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '—';
const scoreBadge = s => s === 1 ? el('span', {class: 's1'}, 'Score 1') : s === 0 ? el('span', {class: 's0'}, 'Score 0') : el('span', {class: 'sn'}, 'Unscored');
const stopClass = r => r.stop === 'reached step budget' ? 'stop horizon' : 'stop';

function summarize(runs) {
  const scored = runs.filter(r => r.score !== null);
  return {n: runs.length, scored: scored.length, hit: scored.filter(r => r.score === 1).length};
}

function hero(runs) {
  const grid = document.getElementById('hero-videos');
  const byId = Object.fromEntries(runs.filter(r => r.model === 'Astra').map(r => [r.id.replace(/^astra-/, ''), r]));
  HERO_IDS.map(i => byId[i]).filter(r => r && r.video).forEach((r, i) => {
    const v = el('video', {muted: true, loop: true, playsinline: true, autoplay: true, preload: 'metadata', poster: r.poster, src: r.video, style: `animation-delay:${i * .12}s`});
    v.muted = true;
    grid.append(v);
  });
}

function stats(data, astra) {
  const box = document.getElementById('hero-stats');
  [[data.registered, 'tasks per model'], [8, 'embodiment types'], [Object.keys(DOMAINS).length, 'task domains']]
    .forEach(([b, s]) => box.append(el('div', {}, el('b', {}, b), el('span', {}, s))));
}

function coverage(data, astra) {
  document.getElementById('coverage-intro').textContent = "Embodiment types follow the paper's provisional grouping; one task belongs to one type. Bar length = number of tasks.";
  document.getElementById('benches').remove();
}

// Score is always shown over all 84 tasks; scored coverage is a separate progress bar.
const FULL = {Astra: 'GPT-6 Astra', Opus: 'Opus 5.5', K3: 'Kimi K3', DPSK: 'DeepSeek V4.1 Flash', Gemini: 'Gemini 3.8 Flash'};
const meter = (a, b, cls) => el('span', {class: 'meter ' + (cls || '')}, el('i', {style: `width:${b ? 100 * a / b : 0}%`}));
function board(data, runs, usage) {
  const U = usage || {};
  const tok = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : Math.round(v / 1e6) + 'M';
  const t = document.getElementById('board');
  t.append(el('tr', {}, ['Model', 'Score', 'Tokens', 'Cost'].map((h, i) => el('th', {class: i >= 1 ? 'n' : null}, h))));
  for (const m of MODELS) {
    const rs = runs.filter(r => r.model === m), s = summarize(rs);
    t.append(el('tr', {},
      el('td', {}, el('b', {}, FULL[m])),
      el('td', {class: 'n'}, el('b', {}, pct(s.hit, data.registered)), meter(s.hit, data.registered)),
      (() => { // per-task mean over scored runs with recorded usage, scaled to all tasks
        const us = rs.filter(r => r.score !== null && U[r.id] && !U[r.id].zero).map(r => U[r.id]);
        const k = us.length ? data.registered / us.length : 0;
        const priced = us.filter(u => u.cost != null);
        return [el('td', {class: 'n'}, us.length ? tok(k * us.reduce((a, u) => a + u.totalTokens, 0)) : '\u2014'),
          el('td', {class: 'n'}, priced.length ? '$' + Math.round(data.registered / priced.length * priced.reduce((a, u) => a + u.cost, 0)).toLocaleString('en-US') : '\u2014')]; })()));
  }
}

function paired(runs) {
  const key = r => r.bench + '/' + r.task;
  const astra = Object.fromEntries(runs.filter(r => r.model === 'Astra').map(r => [key(r), r]));
  const others = runs.filter(r => r.model !== 'Astra');
  const keys = [...new Set(others.map(key))].filter(k => astra[k]);
  document.getElementById('paired-note').textContent = `· ${keys.length} tasks. Each cell: score · control steps executed / step budget (bar = share of budget used). Unscored tasks have no step count yet. Click a cell to play its recording.`;
  const t = document.getElementById('paired');
  t.append(el('tr', {}, el('th', {}, 'Task'), MODELS.map(m => el('th', {}, RWPlayer.fullName(m)))));
  for (const k of keys) {
    const a = astra[k];
    t.append(el('tr', {}, el('td', {}, a.title_en),
      MODELS.map(m => {
        const r = m === 'Astra' ? a : others.find(x => x.model === m && key(x) === k);
        if (!r) return el('td', {class: 'muted'}, 'not run');
        return el('td', {}, RWPlayer.bind(el('span', {class: 'cell-link'}, scoreBadge(r.score)), r), stepCell(r, 'en'));
      })));
  }
}

// Control steps actually executed vs the task budget; only shown when the attempt has a score.
function stepCell(r, lang) {
  if (r.score === null || typeof r.steps !== 'number' || !r.limit) return null;
  const n = Math.min(r.steps, r.limit); // capped at the budget for display
  return el('span', {class: 'pstep'},
    el('span', {class: 'pstep-n'}, `${n}/${r.limit}`),
    el('span', {class: 'pstep-bar'}, el('i', {style: `width:${Math.min(100, 100 * r.steps / r.limit)}%`})));
}

function seg(id, opts, field) {
  const box = document.getElementById(id);
  opts.forEach(([v, label]) => box.append(el('button', {type: 'button', 'data-v': v, class: state[field] === v ? 'on' : null,
    onclick: () => { state[field] = v; [...box.children].forEach(b => b.classList.toggle('on', b.dataset.v === v)); render(); }}, label)));
}

let ALL = [];
function card(r, i) {
  const thumb = el('div', {class: 'thumb'},
    r.poster ? el('img', {src: r.poster, alt: '', loading: 'lazy'}) : null,
    scoreBadge(r.score), r.views > 1 ? el('span', {class: 'views'}, `${r.views} views`) : null);
  const a = el('div', {class: 'card', style: `animation-delay:${Math.min(i, 24) * 25}ms`},
    thumb,
    el('div', {class: 'meta'},
      el('div', {class: 'src'}, `${r.bench_name} · #${r.id}`),
      el('h4', {}, r.title_en),
      el('div', {class: 'row'}, el('span', {}, RWPlayer.fullName(r.model)), el('span', {}, RWPlayer.mediaLabel(r)))));
  RWPlayer.bind(a, r);
  if (RWPlayer.canPlay(r)) {
    let v = null;
    a.addEventListener('mouseenter', () => {
      v = el('video', {src: r.video, muted: true, loop: true, playsinline: true, autoplay: true});
      v.muted = true; thumb.append(v);
    });
    a.addEventListener('mouseleave', () => { if (v) { v.remove(); v = null; } });
  }
  return a;
}
function render() {
  const rs = ALL.filter(r => r.model === state.model)
    .filter(r => state.domain === 'all' || r.domain === state.domain)
    .filter(r => state.score === 'all' || String(r.score) === state.score || (state.score === 'none' && r.score === null));
  const box = document.getElementById('cards');
  box.replaceChildren(...rs.slice(0, state.shown).map(card));
  document.getElementById('gallery-count').textContent = `${rs.length} runs · ${state.model}`;
  const more = document.getElementById('more-cards');
  more.hidden = rs.length <= state.shown;
  more.textContent = `Show more (${rs.length - Math.min(rs.length, state.shown)} left)`;
}
state.shown = 12;
function setupMore() {
  const more = el('button', {type: 'button', id: 'more-cards', class: 'more-btn', onclick: () => { state.shown += 24; render(); }});
  document.getElementById('cards').after(more);
  document.getElementById('filters').addEventListener('click', e => { if (e.target.closest('button')) state.shown = 12; }, true);
}
const bjt = iso => iso ? new Date(iso).toLocaleString('sv-SE', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) + ' (UTC+8)' : '—';

fetch('/data/data.json', {cache: 'no-cache'}).then(r => r.json()).then(data => {
  ALL = data.runs;
  const astra = ALL.filter(r => r.model === 'Astra');
  hero(ALL); stats(data, astra); coverage(data, astra); fetch('/data/usage.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(u => board(data, ALL, u)); paired(ALL);
  seg('f-model', MODELS.map(m => [m, FULL[m]]), 'model');
  seg('f-domain', [['all', 'All domains'], ...Object.entries(DOMAINS).map(([k, d]) => [k, d.name])], 'domain');
  seg('f-score', [['all', 'All'], ['1', 'Score 1'], ['0', 'Score 0'], ['none', 'Unscored']], 'score');
  setupMore();
  render();
  document.getElementById('foot').textContent = `Data updated ${bjt(data.opusk3_generated || data.astra_generated)} · ${data.registered} tasks per model`;
}).catch(e => { document.getElementById('cards').textContent = 'Failed to load data: ' + e; });
