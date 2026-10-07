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

// All three resource views share model IDs and the same score scale.
function pareto(data, usage) {
  const axes = {
    tokens: [T('Total tokens', '总 tokens'), r => usage[r.id] ? usage[r.id].totalTokens : null, fmtTok],
    cost: [T('Cost (USD, list price)', '费用（美元，标价）'), r => usage[r.id] ? usage[r.id].cost : null, v => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0))],
    hours: [T('Wall-clock hours', '运行时长（小时）'), r => r.minutes != null ? r.minutes / 60 : null, v => v.toFixed(0) + 'h'],
  };
  const legend = document.createElement('ul');
  legend.className = 'pareto-legend';
  legend.setAttribute('aria-label', T('Model key', '模型图例'));
  RV_MODELS.forEach((m, i) => {
    const item = document.createElement('li');
    item.append(Object.assign(document.createElement('b'), {textContent: i + 1}), document.createTextNode(RV_FULL[m]));
    legend.append(item);
  });
  const plots = document.createElement('div');
  plots.className = 'pareto-plots';
  const cap = document.createElement('p');
  cap.className = 'pareto-cap';
  cap.textContent = T('Same success-rate scale; lower resource use and higher success rate are better. Dashed line: Pareto frontier. Resources = valid per-task mean × task count; missing usage is estimated, not zero. Tokens include cached input + output. Cost uses list-price estimates, not invoices. Time includes simulation and API waits, not just model speed.',
    '三个子图使用相同成功率刻度；资源越少、成功率越高越好。虚线为 Pareto 前沿。资源用量 = 有效任务均值 × 任务数；缺失用量按均值估算，不计为零。Tokens 含缓存输入与输出；费用为标价估算，非账单；时长含仿真与 API 等待，不代表纯模型速度。');
  paretoPanel.append(legend, plots, cap);

  const ymax = Math.max(25, ...RV_MODELS.map(m => {
    const rs = data.runs.filter(r => r.model === m);
    return rs.length ? Math.ceil(100 * rs.filter(r => r.score === 1).length / rs.length / 5) * 5 + 5 : 25;
  }));
  for (const [axis, [label, get, fmt]] of Object.entries(axes)) {
    const box = document.createElement('section');
    box.className = 'pareto-box';
    const heading = document.createElement('h3');
    heading.id = 'pareto-' + axis;
    heading.textContent = label;
    box.setAttribute('aria-labelledby', heading.id);
    const detail = document.createElement('p');
    detail.className = 'pareto-detail';
    detail.setAttribute('aria-live', 'polite');
    detail.textContent = T('Hover, focus or tap a numbered marker for values.', '悬停、聚焦或点击编号查看数值。');
    const pts = RV_MODELS.map(m => {
      const rs = data.runs.filter(r => r.model === m);
      // Per-task mean over scored runs with a valid value, scaled to all tasks.
      const ok = rs.filter(r => r.score !== null && get(r) != null && (axis === 'hours' || !usage[r.id].zero));
      const vals = ok.map(get);
      const partial = ok.length < rs.length;
      return {m, x: ok.length ? vals.reduce((a, b) => a + b, 0) / ok.length * rs.length : null, y: 100 * rs.filter(r => r.score === 1).length / rs.length, partial};
    }).filter(p => p.x !== null);
    for (const p of pts) p.front = !pts.some(q => q !== p && q.x <= p.x && q.y >= p.y && (q.x < p.x || q.y > p.y));
    const W = 360, H = 310, L = 44, R = 28, TP = 28, B = 44;
    const xmax = (Math.max(0, ...pts.map(p => p.x)) || 1) * 1.15;
    const X = v => L + (W - L - R) * v / xmax, Y = v => H - B - (H - TP - B) * v / ymax;
    const s = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, class: 'pareto-svg', role: 'group', 'aria-label': `${T('Success rate versus', '成功率对比')} ${label}`});
    for (let g = 0; g <= ymax; g += 5) {
      s.append(svgEl('line', {x1: L, x2: W - R, y1: Y(g), y2: Y(g), class: 'pg'}));
      s.append(svgEl('text', {x: L - 10, y: Y(g) + 4, 'text-anchor': 'end', class: 'pt'}, g + '%'));
    }
    for (let i = 0; i <= 4; i++) {
      const v = xmax * i / 4;
      s.append(svgEl('line', {x1: X(v), x2: X(v), y1: TP, y2: H - B, class: 'pg'}));
      s.append(svgEl('text', {x: X(v), y: H - B + 20, 'text-anchor': 'middle', class: 'pt'}, i ? fmt(v) : '0'));
    }
    s.append(svgEl('text', {x: L, y: 14, class: 'pt'}, T('Success rate ↑', '成功率 ↑')));
    const front = pts.filter(p => p.front).sort((a, b) => a.x - b.x);
    if (front.length) {
      let d = `M ${X(front[0].x)} ${Y(front[0].y)}`;
      for (const p of front.slice(1)) d += ` H ${X(p.x)} V ${Y(p.y)}`;
      s.append(svgEl('path', {d, class: 'pfront'}));
    }
    const badges = [];
    for (const p of pts) {
      const value = axis === 'tokens' ? Math.round(p.x).toLocaleString(isZh ? 'zh-CN' : 'en-US') : (axis === 'cost' ? '$' : '') + p.x.toFixed(2) + (axis === 'hours' ? 'h' : '');
      const description = `${RV_FULL[p.m]} · ${p.y.toFixed(1)}% · ${value}` + (p.partial ? T(' (estimated from available runs)', '（按可用任务估算）') : '');
      const g = svgEl('g', {class: 'pp' + (p.front ? ' on' : ''), tabindex: '0', role: 'button', 'aria-label': description});
      const x = X(p.x), y = Y(p.y);
      // Move only the numbered labels; data coordinates remain unchanged.
      const bx = Math.min(W - R - 12, x + 14);
      let by = y - 18;
      while (badges.some(b => Math.abs(b.x - bx) < 28 && Math.abs(b.y - by) < 28)) by -= 28;
      badges.push({x: bx, y: by});
      g.append(svgEl('line', {x1: x, y1: y, x2: bx, y2: by, class: 'pleader'}));
      g.append(svgEl('circle', {cx: x, cy: y, r: 4, class: 'pdot'}));
      g.append(svgEl('circle', {cx: bx, cy: by, r: 14, class: 'pbadge'}));
      g.append(svgEl('text', {x: bx, y: by + 4, 'text-anchor': 'middle'}, RV_MODELS.indexOf(p.m) + 1));
      g.append(svgEl('title', {}, description));
      const show = () => {
        detail.textContent = description;
        for (const point of s.querySelectorAll('.pp')) point.classList.toggle('selected', point === g);
      };
      for (const event of ['mouseenter', 'focus', 'click']) g.addEventListener(event, show);
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); }
      });
      s.append(g);
    }
    if (!pts.length) detail.textContent = T('No resource data available.', '暂无资源用量数据。');
    box.append(heading, s, detail);
    plots.append(box);
  }
}

// Per model, one group of squares per task domain.
function waffle(data) {
  const note = document.createElement('p');
  note.className = 'waffle-legend';
  note.textContent = T('✓ = Success · × = Failure · ? = Unscored. Click a square to play its recording.', '✓ = 成功 · × = 失败 · ? = 未评分。点击方格播放录像。');
  gridPanel.append(note);
  for (const model of RV_MODELS) {
    const section = document.createElement('section');
    section.className = 'waffle-model';
    const title = document.createElement('h3');
    title.textContent = RV_FULL[model];
    section.append(title);
    const runs = data.runs.filter(r => r.model === model);
    for (const [domain, info] of Object.entries(DOMAINS)) {
      const group = document.createElement('div');
      group.className = 'waffle-group';
      const label = document.createElement('h4');
      label.textContent = info.name;
      const squares = document.createElement('div');
      squares.className = 'waffle-squares';
      for (const run of runs.filter(r => r.domain === domain)) {
        const cell = document.createElement('span');
        cell.className = 'waffle-cell ' + (run.score === 1 ? 'one' : run.score === 0 ? 'zero' : 'unscored');
        cell.textContent = run.score === null ? '?' : run.score === 1 ? '✓' : '×';
        RWPlayer.bind(cell, run);
        cell.title = `${RV_FULL[model]} · ${isZh ? run.title : run.title_en} · ${run.score === null ? T('Unscored', '未评分') : run.score === 1 ? T('Success', '成功') : T('Failure', '失败')}`;
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
  fetch('/data/data.json', {cache: 'no-cache'}).then(r => {if (!r.ok) throw Error(r.status); return r.json();}),
  fetch('/data/usage.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})),
]).then(([data, usage]) => { pareto(data, usage); waffle(data); })
  .catch(e => {gridPanel.textContent = paretoPanel.textContent = 'Failed to load results: ' + e.message;});
