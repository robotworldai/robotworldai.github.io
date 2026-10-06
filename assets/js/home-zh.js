'use strict';
const DOMAINS = {
  manipulation: {name: '桌面与灵巧操作', en: 'Manipulation', c: '#0f8b7d'},
  mobile: {name: '家居移动操作', en: 'Mobile manipulation', c: '#3f6fb5'},
  locomotion: {name: '足式与轮足运动', en: 'Locomotion', c: '#e0742b'},
  driving: {name: '车辆驾驶', en: 'Driving', c: '#8c6bb1'},
  aerial: {name: '无人机飞行', en: 'Aerial', c: '#c99a2e'},
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
const scoreBadge = s => s === 1 ? el('span', {class: 's1'}, '得分 1') : s === 0 ? el('span', {class: 's0'}, '得分 0') : el('span', {class: 'sn'}, '未计分');
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
  [[data.registered, '每模型题数'], [8, '类机器人形态'], [Object.keys(DOMAINS).length, '任务领域']]
    .forEach(([b, s]) => box.append(el('div', {}, el('b', {}, b), el('span', {}, s))));
}

function coverage(data, astra) {
  document.getElementById('coverage-intro').textContent = '机器人形态采用论文中的暂定分组，每题归入一类。条形长度表示题数。';
  document.getElementById('benches').remove();
}

// 得分统一以 84 题为分母；已评分进度单独用进度条显示。
const FULL = {Astra: 'GPT-6 Astra', Opus: 'Opus 5.5', K3: 'Kimi K3', DPSK: 'DeepSeek V4.1 Flash', Gemini: 'Gemini 3.8 Flash'};
const meter = (a, b, cls) => el('span', {class: 'meter ' + (cls || '')}, el('i', {style: `width:${b ? 100 * a / b : 0}%`}));
function board(data, runs, usage) {
  const U = usage || {};
  const tok = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : Math.round(v / 1e6) + 'M';
  const t = document.getElementById('board');
  t.append(el('tr', {}, ['模型', '得分', 'Tokens', '费用'].map((h, i) => el('th', {class: i >= 1 ? 'n' : null}, h))));
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
  document.getElementById('paired-note').textContent = `· ${keys.length} 题。每格：得分 · 实际执行控制步 / 步数上限（条形 = 预算使用比例）。未计分的题暂无步数。点击格子播放录像。`;
  const t = document.getElementById('paired');
  t.append(el('tr', {}, el('th', {}, '任务'), MODELS.map(m => el('th', {}, m))));
  for (const k of keys) {
    const a = astra[k];
    t.append(el('tr', {}, el('td', {}, a.title),
      MODELS.map(m => {
        const r = m === 'Astra' ? a : others.find(x => x.model === m && key(x) === k);
        if (!r) return el('td', {class: 'muted'}, '未测');
        return el('td', {}, RWPlayer.bind(el('span', {class: 'cell-link'}, scoreBadge(r.score)), r), stepCell(r));
      })));
  }
}

// 实际执行控制步 / 步数上限；仅对已评分的尝试显示。
function stepCell(r) {
  if (r.score === null || typeof r.steps !== 'number' || !r.limit) return null;
  const n = Math.min(r.steps, r.limit); // 显示时按预算封顶
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
    scoreBadge(r.score), r.views > 1 ? el('span', {class: 'views'}, `${r.views} 视角`) : null);
  const a = el('div', {class: 'card', style: `animation-delay:${Math.min(i, 24) * 25}ms`},
    thumb,
    el('div', {class: 'meta'},
      el('div', {class: 'src'}, `${r.bench_name} · #${r.id}`),
      el('h4', {}, r.title),
      el('div', {class: 'row'}, el('span', {}, r.model), el('span', {}, r.video ? '播放录像 ▶' : '暂无录像'))));
  RWPlayer.bind(a, r);
  if (r.video) {
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
  document.getElementById('gallery-count').textContent = `${rs.length} 条 · ${state.model}`;
  const more = document.getElementById('more-cards');
  more.hidden = rs.length <= state.shown;
  more.textContent = `显示更多（还有 ${rs.length - Math.min(rs.length, state.shown)} 条）`;
}
state.shown = 12;
function setupMore() {
  const more = el('button', {type: 'button', id: 'more-cards', class: 'more-btn', onclick: () => { state.shown += 24; render(); }});
  document.getElementById('cards').after(more);
  document.getElementById('filters').addEventListener('click', e => { if (e.target.closest('button')) state.shown = 12; }, true);
}
const bjt = iso => iso ? new Date(iso).toLocaleString('sv-SE', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) + '（北京时间）' : '—';

fetch('/data/data.json', {cache: 'no-cache'}).then(r => r.json()).then(data => {
  ALL = data.runs;
  const astra = ALL.filter(r => r.model === 'Astra');
  hero(ALL); stats(data, astra); coverage(data, astra); fetch('/data/usage.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(u => board(data, ALL, u)); paired(ALL);
  seg('f-model', MODELS.map(m => [m, FULL[m]]), 'model');
  seg('f-domain', [['all', '全部领域'], ...Object.entries(DOMAINS).map(([k, d]) => [k, d.name])], 'domain');
  seg('f-score', [['all', '全部'], ['1', '得分 1'], ['0', '得分 0'], ['none', '未计分']], 'score');
  setupMore();
  render();
  document.getElementById('foot').textContent = `数据更新于 ${bjt(data.opusk3_generated || data.astra_generated)} · 每模型 ${data.registered} 题`;
}).catch(e => { document.getElementById('cards').textContent = '数据加载失败：' + e; });
