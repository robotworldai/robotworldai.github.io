'use strict';
// Results views (TABLE / PARETO / WAFFLE) read the same homepage snapshot; no extra scoring here.
const isZh = document.documentElement.lang.startsWith('zh');
const T = (en, cn) => isZh ? cn : en;
const RV_MODELS = ['Astra', 'Opus', 'K3', 'DPSK', 'Gemini'];
const RV_FULL = {Astra: 'GPT-6 Astra', Opus: 'Opus 5.5', K3: 'Kimi K3', DPSK: 'DeepSeek V4.1 Flash', Gemini: 'Gemini 3.8 Flash'};
const resultSection = document.querySelector('#leaderboard .wrap');
const tablePanel = document.createElement('div');
tablePanel.id = 'results-table';
const firstTable = resultSection.querySelector('.table-scroll');
while (firstTable.nextSibling) tablePanel.append(firstTable.nextSibling);
tablePanel.prepend(firstTable);
const paretoPanel = Object.assign(document.createElement('div'), {id: 'results-pareto', hidden: true});
const gridPanel = Object.assign(document.createElement('div'), {id: 'results-waffle', hidden: true});
const panels = [tablePanel, paretoPanel, gridPanel];
const toolbar = document.createElement('div');
toolbar.className = 'result-view-tabs';
toolbar.setAttribute('role', 'group');
toolbar.setAttribute('aria-label', T('Result view', '结果视图'));
for (const [label, target] of [['TABLE', tablePanel], ['PARETO', paretoPanel], ['WAFFLE', gridPanel]]) {
  const button = document.createElement('button');
  button.textContent = label;
  button.type = 'button';
  button.setAttribute('aria-controls', target.id);
  button.setAttribute('aria-pressed', String(target === tablePanel));
  button.addEventListener('click', () => {
    for (const p of panels) p.hidden = p !== target;
    for (const b of toolbar.children) b.setAttribute('aria-pressed', String(b === button));
  });
  toolbar.append(button);
}
resultSection.querySelector('.rc-fig').before(toolbar, ...panels);

const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, text) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};
const fmtTok = v => v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? Math.round(v / 1e6) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(v);

// Score vs resource use. Only points no other model beats on both axes are drawn dark (Pareto front).
function pareto(data, usage) {
  const axes = {
    tokens: [T('Total tokens', '总 tokens'), r => usage[r.id] ? usage[r.id].totalTokens : null, fmtTok],
    cost: [T('Cost (USD, list price)', '费用（美元，标价）'), r => usage[r.id] ? usage[r.id].cost : null, v => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0))],
    hours: [T('Wall-clock hours', '运行时长（小时）'), r => r.minutes != null ? r.minutes / 60 : null, v => v.toFixed(0) + 'h'],
  };
  const head = document.createElement('div');
  head.className = 'pareto-head';
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', T('X axis', '横轴'));
  for (const [k, [label]] of Object.entries(axes)) sel.append(new Option(label.toUpperCase(), k));
  head.append(Object.assign(document.createElement('span'), {textContent: T('SCORE VS', '得分 VS')}), sel);
  const box = document.createElement('div');
  box.className = 'pareto-box';
  const cap = document.createElement('p');
  cap.className = 'pareto-cap';
  paretoPanel.append(head, box, cap);

  function draw() {
    const [label, get, fmt] = axes[sel.value];
    const pts = RV_MODELS.map(m => {
      const rs = data.runs.filter(r => r.model === m);
      // Per-task mean over scored runs with a valid value, scaled to all tasks.
      const ok = rs.filter(r => r.score !== null && get(r) != null && (sel.value === 'hours' || !usage[r.id].zero));
      const vals = ok.map(get);
      const partial = ok.length < rs.length;
      return {m, x: ok.length ? vals.reduce((a, b) => a + b, 0) / ok.length * rs.length : null, y: 100 * rs.filter(r => r.score === 1).length / rs.length, partial};
    }).filter(p => p.x !== null);
    for (const p of pts) p.front = !pts.some(q => q !== p && q.x <= p.x && q.y >= p.y && (q.x < p.x || q.y > p.y));
    const W = 960, H = 440, L = 70, R = 30, TP = 24, B = 60;
    const xmax = Math.max(...pts.map(p => p.x)) * 1.15, ymax = Math.max(25, Math.ceil(Math.max(...pts.map(p => p.y)) / 5) * 5 + 5);
    const X = v => L + (W - L - R) * v / xmax, Y = v => H - B - (H - TP - B) * v / ymax;
    const s = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, class: 'pareto-svg', role: 'img', 'aria-label': `${T('Score versus', '得分对比')} ${label}`});
    for (let g = 0; g <= ymax; g += 5) {
      s.append(svgEl('line', {x1: L, x2: W - R, y1: Y(g), y2: Y(g), class: 'pg'}));
      s.append(svgEl('text', {x: L - 10, y: Y(g) + 4, 'text-anchor': 'end', class: 'pt'}, g + '%'));
    }
    for (let i = 0; i <= 4; i++) {
      const v = xmax * i / 4;
      s.append(svgEl('line', {x1: X(v), x2: X(v), y1: TP, y2: H - B, class: 'pg'}));
      s.append(svgEl('text', {x: X(v), y: H - B + 20, 'text-anchor': 'middle', class: 'pt'}, i ? fmt(v) : '0'));
    }
    s.append(svgEl('text', {x: (L + W - R) / 2, y: H - 12, 'text-anchor': 'middle', class: 'pt pl'}, label));
    s.append(svgEl('text', {x: 16, y: (TP + H - B) / 2, transform: `rotate(-90 16 ${(TP + H - B) / 2})`, 'text-anchor': 'middle', class: 'pt pl'}, T('Score', '得分')));
    // Shaded staircase under the front, as on tbench.
    const front = pts.filter(p => p.front).sort((a, b) => a.x - b.x);
    let d = `M ${X(0)} ${Y(0)}`, yprev = 0;
    for (const p of front) { d += ` L ${X(p.x)} ${Y(yprev)} L ${X(p.x)} ${Y(p.y)}`; yprev = p.y; }
    d += ` L ${X(xmax)} ${Y(yprev)} L ${X(xmax)} ${Y(0)} Z`;
    s.append(svgEl('path', {d, class: 'pfront'}));
    for (const p of pts) {
      const g = svgEl('g', {class: 'pp' + (p.front ? ' on' : '')});
      g.append(svgEl('rect', {x: X(p.x) - 6, y: Y(p.y) - 6, width: 12, height: 12}));
      const right = X(p.x) < W - 260;
      g.append(svgEl('text', {x: X(p.x) + (right ? 14 : -14), y: Y(p.y) + 5, 'text-anchor': right ? 'start' : 'end'},
        `${RV_FULL[p.m]} · ${p.y.toFixed(1)}%`));
      g.append(svgEl('title', {}, `${RV_FULL[p.m]} · ${p.y.toFixed(1)}% · ${fmt(p.x)}`));
      s.append(g);
    }
    box.replaceChildren(s);
    cap.textContent = sel.value === 'cost'
      ? T('Score against cost (per-task mean × 84) at OpenRouter list prices (2026-10-05), computed per request with cache read/write and long-context tiers. An estimate, not an invoice.',
          '得分对比费用（每题平均 × 84），按 OpenRouter 官方标价（2026-10-05）逐请求折算，含缓存读写与长上下文档位；为估算，非实际账单。')
      : sel.value === 'tokens'
      ? T('Score against tokens (per-task mean × 84; input incl. cache + output).',
          '得分对比 tokens（每题平均 × 84；输入含缓存 + 输出）。')
      : T('Score against wall-clock hours (per-task mean × 84); includes simulation and API latency, so it reflects the setup as much as the model.',
          '得分对比运行时长（每题平均 × 84）；包含仿真与 API 延迟，受部署条件影响，不只反映模型本身。');
  }
  sel.addEventListener('change', draw);
  draw();
}

// Original waffle: per model, one row of squares per source group.
function waffle(data) {
  const note = document.createElement('p');
  note.className = 'waffle-legend';
  note.textContent = T('1 = Score 1 · 0 = Score 0 · ? = Unscored. Click a square to play its recording.', '1 = 得分 1 · 0 = 得分 0 · ? = 未计分。点击方格播放录像。');
  gridPanel.append(note);
  for (const model of RV_MODELS) {
    const section = document.createElement('section');
    section.className = 'waffle-model';
    const title = document.createElement('h3');
    title.textContent = RV_FULL[model];
    section.append(title);
    const runs = data.runs.filter(r => r.model === model);
    for (const bench of [...new Set(runs.map(r => r.bench))].sort()) {
      const group = document.createElement('div');
      group.className = 'waffle-group';
      const label = document.createElement('h4');
      label.textContent = runs.find(r => r.bench === bench).bench_name;
      const squares = document.createElement('div');
      squares.className = 'waffle-squares';
      for (const run of runs.filter(r => r.bench === bench)) {
        const cell = document.createElement('span');
        cell.className = 'waffle-cell ' + (run.score === 1 ? 'one' : run.score === 0 ? 'zero' : 'unscored');
        cell.textContent = run.score === null ? '?' : String(run.score);
        RWPlayer.bind(cell, run);
        cell.title = `${RV_FULL[model]} · ${run.bench_name} · ${isZh ? run.title : run.title_en} · ${run.score === null ? T('Unscored', '未计分') : T('Score ', '得分 ') + run.score}`;
        cell.setAttribute('aria-label', cell.title);
        squares.append(cell);
      }
      group.append(label, squares);
      section.append(group);
    }
    gridPanel.append(section);
  }
}

Promise.all([
  fetch('data.json', {cache: 'no-cache'}).then(r => {if (!r.ok) throw Error(r.status); return r.json();}),
  fetch('usage.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})),
]).then(([data, usage]) => { pareto(data, usage); waffle(data); })
  .catch(e => {gridPanel.textContent = paretoPanel.textContent = 'Failed to load results: ' + e.message;});
