'use strict';
// Shared figures for the homepage and blog. Every number is computed from data.json at load time.
window.RWCharts = (() => {
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  const MODELS = ['Astra', 'Opus', 'K3', 'DPSK', 'Gemini'];
  const MODEL_SUB = {Astra: 'GPT-6 Astra', Opus: 'Opus 5.5', K3: 'Kimi K3', DPSK: 'DeepSeek V4.1 Flash', Gemini: 'Gemini 3.8 Flash'};
  const DOMAINS = [
    ['manipulation', 'Manipulation', '桌面与灵巧操作'],
    ['mobile', 'Mobile manipulation', '家居移动操作'],
    ['locomotion', 'Locomotion', '足式与轮足运动'],
    ['driving', 'Driving', '车辆驾驶'],
    ['aerial', 'Aerial', '无人机飞行'],
  ];
  // Embodiment groups follow the paper's provisional taxonomy (paper.tex, Coverage and Task Selection).
  const EMBODIMENTS = [
    ['arm', 'Fixed-base arms', '固定底座机械臂', 'Single tabletop arms', '单臂桌面机械臂', ['ai_cps', 'reflexbench', 'robolab']],
    ['dex', 'Bimanual & dexterous', '双臂与灵巧手', 'Dual-arm systems and dexterous hands', '双臂系统与灵巧手', ['bench2dex', 'robodojo']],
    ['mobile', 'Mobile manipulators', '移动操作机器人', 'Kitchen and household mobile robots', '厨房与家居移动机器人', ['robocasa', 'behavior_1k']],
    ['humanoid', 'Bipeds & humanoids', '双足与人形', 'Unitree G1, Digit', 'Unitree G1、Digit', ['humanoid_soccer', 'digit', 'steadytray', 'ttrl']],
    ['quadruped', 'Quadrupeds', '四足机器人', 'Go2, ANYmal, A1', 'Go2、ANYmal、A1', ['go2_push', 'omniisaacgymenvs', 'robot_lab']],
    ['vehicle', 'Wheeled vehicles', '轮式车辆', 'MuSHR, F1TENTH race cars', 'MuSHR、F1TENTH 赛车', ['wheeledlab']],
    ['wheelleg', 'Wheel-legged robots', '轮足机器人', 'Flamingo and wheel-legged robots', 'Flamingo 等轮足机器人', ['flamingo', 'wheel_legged', 'wheeled_quadruped']],
    ['aerial', 'Aerial robots', '空中机器人', 'Quadrotor drones', '四旋翼无人机', ['omnidrones', 'volleybots']],
  ];
  const EMB_OF = Object.fromEntries(EMBODIMENTS.flatMap(([k, , , , , bs]) => bs.map(b => [b, k])));
  const embodiment = r => EMB_OF[r.bench] || 'other';
  const ENDINGS = [
    ['solved', 'Score 1', '得分 1'],
    ['env', 'Environment ended, score 0', '环境结束，得分 0'],
    ['budget', 'Step budget used up', '步数用完'],
    ['nonaction', 'Non-action limit', '非动作上限'],
    ['adjudicated', 'Rule-adjudicated 0', '按规则裁定 0 分'],
    ['other', 'Earlier rules / not recorded', '早期规则或未记录'],
  ];
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'style') n.style.cssText = v; else n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k instanceof Node ? k : String(k));
    return n;
  };
  const bind = (node, run) => window.RWPlayer ? RWPlayer.bind(node, run) : node;
  const of = (R, m) => R.filter(r => r.model === m);
  const scored = rs => rs.filter(r => r.score !== null);
  const solved = rs => rs.filter(r => r.score === 1);
  const name = r => zh ? r.title : r.title_en;

  function ending(r) {
    if (r.score === 1) return 'solved';
    const s = r.stop || '';
    if (s.startsWith('adjudicated')) return 'adjudicated';
    if (s.startsWith('nonaction')) return 'nonaction';
    if (s === 'reached step budget') return 'budget';
    if (/native termination|environment end|world-state|world evaluation|goal reached/.test(s)) return 'env';
    return 'other';
  }

  // RLE-style ranking rows: total score, then one segment per domain sized by solved tasks.
  function stacked(box, R) {
    const max = Math.max(...MODELS.map(m => solved(of(R, m)).length), 1);
    const legend = el('div', {class: 'rc-legend'}, DOMAINS.map(([k, en, cn]) => el('span', {}, el('i', {class: 'dom-' + k}), t(en, cn))));
    const head = el('div', {class: 'rc-srow rc-shead'}, el('span', {}, '#'), el('span', {}, t('Model', '模型')),
      el('span', {}, t('Score', '得分')), legend);
    box.append(head);
    [...MODELS].sort((a, b) => solved(of(R, b)).length - solved(of(R, a)).length).forEach((m, i) => {
      const rs = of(R, m), hit = solved(rs);
      const bar = el('div', {class: 'rc-sbar'});
      for (const [k, en, cn] of DOMAINS) {
        const list = hit.filter(r => r.domain === k);
        if (!list.length) continue;
        const seg = el('span', {class: 'rc-seg dom-' + k, style: `flex:0 0 ${100 * list.length / max * 0.92}%`,
          title: `${m} · ${t(en, cn)} · ${list.length}: ${list.map(name).join(', ')}`}, String(list.length));
        bind(seg, list[0]);
        bar.append(seg);
      }
      box.append(el('div', {class: 'rc-srow'},
        el('span', {class: 'rc-rank'}, i + 1),
        el('span', {class: 'rc-model'}, el('b', {}, MODEL_SUB[m])),
        el('span', {class: 'rc-score'}, (100 * hit.length / 84).toFixed(1), el('small', {}, '%')),
        bar));
    });
  }

  // Mecka-style slide: big bars + pooled headline + recording wall.
  function slide(box, R, mosaic) {
    const max = Math.max(...MODELS.map(m => solved(of(R, m)).length), 1);
    const top = Math.ceil((max + 1) / 5) * 5;
    const bars = el('div', {class: 'rc-vbars'});
    for (let g = 0; g <= top; g += 5) bars.append(el('span', {class: 'rc-grid', style: `bottom:${100 * g / top}%`}, `${(100 * g / 84).toFixed(0)}%`));
    for (const m of MODELS) {
      const rs = of(R, m), hit = solved(rs).length;
      bars.append(el('div', {class: 'rc-vcol m-' + m.toLowerCase()},
        el('div', {class: 'rc-vtrack'},
          el('b', {class: 'rc-vval', style: `bottom:${100 * hit / top}%`}, `${(100 * hit / 84).toFixed(1)}%`),
          el('span', {class: 'rc-vbar', style: `height:${100 * hit / top}%`})),
        el('strong', {}, m), el('small', {}, t(`${hit} solved`, `解出 ${hit} 题`))));
    }
    const S = scored(R), hit = solved(R).length;
    const headline = el('div', {class: 'rc-head'},
      el('b', {}, `${(100 * hit / S.length).toFixed(1)}%`),
      el('strong', {}, t('pooled score-1 rate', '整体得分 1 比例')),
      el('span', {}, t(`${hit} of ${S.length} attempts`, `${S.length} 次尝试中 ${hit} 次`)),
      el('span', {}, t('one attempt per task', '每题 1 次尝试')));
    const left = el('div', {class: 'rc-slide-left'},
      el('p', {class: 'rc-kicker'}, t('84 tasks · 8 embodiment types · 5 task domains', '84 题 · 8 类机器人形态 · 5 个任务领域')),
      el('p', {class: 'rc-sub'}, t('SCORE', '得分')), bars);
    const slideBox = el('div', {class: 'rc-slide'}, left, headline);
    box.append(slideBox);
    fetch('/data/wall-tiles.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null)
      .then(live => slideBox.append(wall(R, mosaic, true, live && {...live, src: '/assets/videos/wall-tiles.mp4'})));
  }

  // One sprite tile for a run; returns null when the run has no thumbnail.
  function tile(r, mosaic, idx, label) {
    const i = idx[r.id];
    if (i == null) return null;
    const rows = Math.ceil(mosaic.ids.length / mosaic.cols);
    const x = i % mosaic.cols, y = Math.floor(i / mosaic.cols);
    const cell = el('span', {class: 'rc-tile' + (r.score === 1 ? ' one' : ''), title: label,
      style: `background-position:${100 * x / (mosaic.cols - 1)}% ${rows > 1 ? 100 * y / (rows - 1) : 0}%;background-size:${mosaic.cols * 100}% ${rows * 100}%`});
    return bind(cell, r);
  }

  // Embodiment distribution: one bar per robot type, sized by number of tasks.
  function embodiments(box, R) {
    const runs = of(R, 'Astra');
    const max = Math.max(...EMBODIMENTS.map(([k]) => runs.filter(r => embodiment(r) === k).length));
    for (const [k, en, cn, ex, exCn] of EMBODIMENTS) {
      const n = runs.filter(r => embodiment(r) === k).length;
      box.append(el('div', {class: 'rc-erow'},
        el('span', {class: 'rc-ename'}, el('i', {class: 'emb-' + k}), el('b', {}, t(en, cn)), el('small', {}, t(ex, exCn))),
        el('span', {class: 'rc-ebar'}, el('i', {class: 'emb-' + k, style: `width:${100 * n / max}%`})),
        el('b', {class: 'rc-en'}, n)));
    }
  }

  // Homepage overview: the 84 tasks shown through Astra's recordings, grouped by embodiment.
  function tasks(box, R, mosaic, live) {
    const idx = Object.fromEntries(mosaic.ids.map((id, i) => [id, i]));
    const runs = of(R, 'Astra');
    const canvases = [];
    for (const [k, en, cn] of EMBODIMENTS) {
      const rs = runs.filter(r => embodiment(r) === k).sort((a, b) => a.bench.localeCompare(b.bench));
      const grid = el('div', {class: 'rc-twall'});
      for (const r of rs) {
        const cell = tile(r, mosaic, idx, name(r)) || el('span', {class: 'rc-tile empty'});
        const li = live && live.ids.indexOf(r.id);
        if (live && li >= 0) {
          // Live thumbnail: a canvas painted from the shared sprite video; the static tile stays as poster.
          const cv = el('canvas', {width: live.w, height: live.h, 'aria-hidden': 'true'});
          cv.dataset.i = li;
          cell.append(cv);
          canvases.push(cv);
        }
        grid.append(cell);
      }
      box.append(el('div', {class: 'rc-tgroup'},
        el('h4', {}, el('i', {class: 'emb-' + k}), t(en, cn), el('small', {}, ` ${rs.length}`)), grid));
    }
    box.append(el('p', {class: 'rc-wallnote'}, t('84 tasks · thumbnails from Astra recordings · click to play', '84 题 · 缩略图取自 Astra 录像 · 点击播放')));
    if (live && canvases.length) animate(box, canvases, live);
  }

  // Paint every thumbnail canvas from one looping sprite video, only while the grid is on screen.
  function animate(box, canvases, live) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const v = el('video', {muted: true, loop: true, playsinline: true, preload: 'auto', src: live.src, 'aria-hidden': 'true'});
    v.muted = true;
    v.className = 'rc-sprite';
    box.append(v);
    const ctx = canvases.map(c => c.getContext('2d'));
    let on = false, raf = 0;
    const paint = () => {
      if (v.readyState >= 2) {
        canvases.forEach((c, n) => {
          const i = +c.dataset.i, x = (i % live.cols) * live.w, y = Math.floor(i / live.cols) * live.h;
          ctx[n].drawImage(v, x, y, live.w, live.h, 0, 0, live.w, live.h);
        });
        box.classList.add('is-live');
      }
      if (on) raf = requestAnimationFrame(paint);
    };
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on) { v.play().catch(() => {}); cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }
      else v.pause();
    }, {rootMargin: '120px'}).observe(box);
  }

  // Wall of every recording thumbnail from one sprite image; click to play.
  function wall(R, mosaic, compact, live) {
    const byId = Object.fromEntries(R.map(r => [r.id, r]));
    const w = el('div', {class: 'rc-wall' + (compact ? ' compact' : '')});
    const rows = Math.ceil(mosaic.ids.length / mosaic.cols);
    const liveIdx = live ? Object.fromEntries(live.ids.map((id, i) => [id, i])) : {};
    const canvases = [];
    mosaic.ids.forEach((id, i) => {
      const r = byId[id];
      if (!r) return;
      const x = i % mosaic.cols, y = Math.floor(i / mosaic.cols);
      const cell = el('span', {class: 'rc-tile' + (r.score === 1 ? ' one' : ''), title: `${r.model} · ${name(r)} · ${r.score === 1 ? t('Score 1', '得分 1') : r.score === 0 ? t('Score 0', '得分 0') : t('Unscored', '未计分')}`,
        style: `background-position:${100 * x / (mosaic.cols - 1)}% ${rows > 1 ? 100 * y / (rows - 1) : 0}%;background-size:${mosaic.cols * 100}% ${rows * 100}%`});
      if (liveIdx[id] != null) {
        // Live tile: painted from the shared sprite video; the static poster stays underneath.
        const cv = el('canvas', {width: live.w, height: live.h, 'aria-hidden': 'true'});
        cv.dataset.i = liveIdx[id];
        cell.append(cv);
        canvases.push(cv);
      }
      w.append(bind(cell, r));
    });
    const wb = el('div', {class: 'rc-wallbox' + (live ? ' rc-livewall' : '')}, w,
      el('p', {class: 'rc-wallnote'}, t(`${mosaic.ids.length} recordings · highlighted = score 1 · click to play`, `${mosaic.ids.length} 段录像 · 高亮 = 得分 1 · 点击播放`)));
    if (live && canvases.length) animate(wb, canvases, live);
    return wb;
  }

  // Donuts: how each model's scored attempts ended.
  function endings(box, R) {
    const grid = el('div', {class: 'rc-donuts'});
    for (const m of MODELS) {
      const rs = scored(of(R, m));
      const counts = Object.fromEntries(ENDINGS.map(([k]) => [k, rs.filter(r => ending(r) === k).length]));
      let acc = 0;
      const stops = ENDINGS.filter(([k]) => counts[k]).map(([k]) => {
        const a = acc; acc += 360 * counts[k] / rs.length;
        return `var(--end-${k}) ${a}deg ${acc - 0.8}deg, transparent ${acc - 0.8}deg ${acc}deg`;
      });
      grid.append(el('div', {class: 'rc-donut-row'},
        el('div', {class: 'rc-donut', style: `background:conic-gradient(${stops.join(',')})`},
          el('span', {}, el('b', {}, counts.solved), el('small', {}, t('solved', '解出题数')))),
        el('div', {class: 'rc-donut-list'},
          el('h4', {class: 'm-' + m.toLowerCase()}, m),
          el('ul', {}, ENDINGS.filter(([k]) => counts[k]).map(([k, en, cn]) =>
            el('li', {}, el('i', {class: 'end-' + k}), el('span', {}, t(en, cn)), el('b', {}, counts[k])))))));
    }
    box.append(grid);
  }

  // Dot chart: fraction of the control-step budget each scored attempt used.
  function steps(box, R) {
    const axis = el('div', {class: 'rc-axis'}, ['0%', '25%', '50%', '75%', '100%'].map((s, i) => el('span', {style: `left:${25 * i}%`}, s)));
    box.append(el('div', {class: 'rc-drow rc-dhead'}, el('span'), axis));
    for (const m of MODELS) {
      const rs = scored(of(R, m)).filter(r => r.steps != null && r.limit);
      const lane = el('div', {class: 'rc-lane'});
      rs.forEach((r, i) => {
        const f = Math.min(r.steps / r.limit, 1);
        // Deterministic vertical jitter so overlapping dots stay visible.
        const y = 12 + ((i * 37) % 76);
        const dot = el('span', {class: 'rc-dot ' + (r.score === 1 ? 'one' : ending(r) === 'nonaction' ? 'na' : 'zero'),
          style: `left:${100 * f}%;top:${y}%`, title: `${r.model} · ${name(r)} · ${Math.min(r.steps, r.limit)}/${r.limit} ${t('control steps', '控制步')}`});
        lane.append(bind(dot, r));
      });
      const early = rs.filter(r => r.steps / r.limit < 0.5).length;
      box.append(el('div', {class: 'rc-drow'},
        el('span', {class: 'rc-model'}, el('b', {}, m), el('small', {}, t(`${early} used < 50%`, `${early} 次用了不到一半`))),
        lane));
    }
    box.append(el('div', {class: 'rc-legend rc-dlegend'},
      el('span', {}, el('i', {class: 'dot one'}), t('Score 1', '得分 1')),
      el('span', {}, el('i', {class: 'dot zero'}), t('Score 0', '得分 0')),
      el('span', {}, el('i', {class: 'dot na'}), t('Score 0, non-action limit', '得分 0，触发非动作上限'))));
  }

  function mount(R, mosaic) {
    const map = {stacked, endings, steps, embodiments};
    document.querySelectorAll('[data-rc]').forEach(box => {
      const kind = box.dataset.rc;
      if (kind === 'slide') slide(box, R, mosaic);
      else if (kind === 'wall') box.append(wall(R, mosaic, false));
      else if (kind === 'tasks') fetch('/data/overview-tiles.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null)
        .catch(() => null).then(live => tasks(box, R, mosaic, live && {...live, src: '/assets/videos/overview-tiles.mp4'}));
      else if (map[kind]) map[kind](box, R);
    });
    // Zoom-out overview video: autoplay only while visible.
    document.querySelectorAll('.rc-zoom video').forEach(v => {
      v.muted = true;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      new IntersectionObserver(([e]) => e.isIntersecting ? v.play().catch(() => {}) : v.pause(), {threshold: 0.25}).observe(v);
    });
  }

  Promise.all([
    fetch('/data/data.json', {cache: 'no-cache'}).then(r => r.json()),
    fetch('/data/mosaic.json', {cache: 'no-cache'}).then(r => r.json()),
  ]).then(([data, mosaic]) => mount(data.runs, mosaic))
    .catch(e => document.querySelectorAll('[data-rc]').forEach(b => b.textContent = 'Failed to load chart: ' + e));
  return {ending, embodiment, EMBODIMENTS};
})();
