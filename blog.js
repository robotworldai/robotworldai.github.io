'use strict';
// Blog figures are drawn from the homepage data.json so numbers never drift from the results table.
(() => {
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  const MODELS = ['Astra', 'Opus', 'K3', 'DPSK', 'Gemini'];
  const DOMAINS = [
    ['manipulation', 'Manipulation', '桌面与灵巧操作', '#0f8b7d'],
    ['mobile', 'Mobile manipulation', '家居移动操作', '#3f6fb5'],
    ['locomotion', 'Locomotion', '足式与轮足运动', '#e0742b'],
    ['driving', 'Driving', '车辆驾驶', '#8c6bb1'],
    ['aerial', 'Aerial', '无人机飞行', '#c99a2e'],
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
  const body = id => document.querySelector(`#${id} .chart-body`);

  // One row per model: 84 cells, filled = 1, outlined = 0, dashed = unscored.
  function models(R) {
    for (const m of MODELS) {
      const rs = R.filter(r => r.model === m);
      const hit = rs.filter(r => r.score === 1).length, scored = rs.filter(r => r.score !== null).length;
      const strip = el('div', {class: 'strip'});
      [...rs].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).forEach(r =>
        strip.append(RWPlayer.bind(el('span', {class: 'c ' + (r.score === 1 ? 'one' : r.score === 0 ? 'zero' : 'none'), title: `${zh ? r.title : r.title_en} · ${r.score ?? t('unscored', '未计分')}`}), r)));
      body('chart-models').append(el('div', {class: 'mrow'},
        el('div', {class: 'mname'}, el('b', {}, m)),
        strip,
        el('div', {class: 'mval'}, el('b', {}, (100 * hit / rs.length).toFixed(1)), el('span', {}, '%'))));
    }
  }

  function domains(R) {
    const head = el('div', {class: 'drow dhead'}, el('span'), MODELS.map(m => el('span', {}, m)));
    body('chart-domains').append(head);
    for (const [k, en, cn, c] of DOMAINS) {
      const n = R.filter(r => r.model === 'Astra' && r.domain === k).length;
      body('chart-domains').append(el('div', {class: 'drow', style: `--c:${c}`},
        el('span', {class: 'dname'}, el('i'), `${t(en, cn)} (${n})`),
        MODELS.map(m => {
          const rs = R.filter(r => r.model === m && r.domain === k);
          const hit = rs.filter(r => r.score === 1).length, sc = rs.filter(r => r.score !== null).length;
          return el('span', {class: 'dcell'}, el('span', {class: 'dbar'}, el('i', {style: `width:${100 * hit / n}%`})),
            el('b', {}, `${hit}/${n}`));
        })));
    }
  }

  function overlap(R) {
    const key = r => r.bench + '/' + r.task;
    const A = Object.fromEntries(R.filter(r => r.model === 'Astra').map(r => [key(r), r]));
    const O = Object.fromEntries(R.filter(r => r.model === 'Opus').map(r => [key(r), r]));
    const ks = Object.keys(A);
    const groups = [
      [t('Both', '两者都解出'), ks.filter(k => A[k].score === 1 && O[k].score === 1), 'both'],
      [t('Astra only', '仅 Astra'), ks.filter(k => A[k].score === 1 && O[k].score !== 1), 'a'],
      [t('Opus only', '仅 Opus'), ks.filter(k => O[k].score === 1 && A[k].score !== 1), 'o'],
    ];
    const neither = ks.length - groups.reduce((s, g) => s + g[1].length, 0);
    const wrap = el('div', {class: 'overlap'});
    for (const [label, list, cls] of groups) {
      wrap.append(el('div', {class: 'ogroup ' + cls},
        el('div', {class: 'ohead'}, el('b', {}, list.length), el('span', {}, label)),
        el('ul', {}, list.map(k => el('li', {}, RWPlayer.bind(el('span', {class: 'olink'}, zh ? A[k].title : A[k].title_en), cls === 'o' ? O[k] : A[k]))))));
    }
    body('chart-overlap').append(wrap, el('p', {class: 'ofoot'}, t(`${neither} tasks solved by neither.`, `另有 ${neither} 题两者都未解出。`)));
  }

  function clips(R) {
    const byId = Object.fromEntries(R.map(r => [r.id, r]));
    document.querySelectorAll('.clips').forEach(box => {
      for (const id of box.dataset.clips.split(',')) {
        const r = byId[id];
        if (!r) continue;
        const score = r.score === 1 ? t('Score 1', '得分 1') : r.score === 0 ? t('Score 0', '得分 0') : t('Unscored', '未计分');
        const v = el('video', {muted: true, loop: true, playsinline: true, preload: 'none', poster: r.poster, src: r.video});
        v.muted = true;
        const card = el('figure', {class: 'clip'},
          el('div', {class: 'clip-media'}, v, el('span', {class: 'clip-score ' + (r.score === 1 ? 'one' : 'zero')}, score)),
          el('figcaption', {}, el('b', {}, r.model), el('span', {}, zh ? r.title : r.title_en),
            el('small', {}, `${r.bench_name} · ${r.steps == null ? '—' : r.limit ? Math.min(r.steps, r.limit) : r.steps}/${r.limit} ${t('steps', '步')}`)));
        // Play on hover/focus (desktop) or tap (mobile); keeps the page light.
        const play = () => v.play().catch(() => {});
        const stop = () => v.pause();
        card.addEventListener('mouseenter', play); card.addEventListener('mouseleave', stop);
        v.addEventListener('click', () => v.paused ? play() : stop());
        box.append(card);
      }
    });
  }

  fetch('data.json', {cache: 'no-cache'}).then(r => r.json()).then(data => {
    const R = data.runs;
    models(R); domains(R); overlap(R); clips(R);
    const iso = data.opusk3_generated || data.astra_generated;
    if (iso) document.querySelectorAll('[data-updated]').forEach(n => n.textContent =
      new Date(iso).toLocaleString('sv-SE', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) + t(' (UTC+8)', '（北京时间）'));
  }).catch(e => document.querySelectorAll('.chart-body').forEach(b => b.textContent = 'Failed to load data: ' + e));
})();
