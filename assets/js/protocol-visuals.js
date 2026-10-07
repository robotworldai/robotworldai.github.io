'use strict';
// Protocol explainers: each card gets a concrete, step-by-step example instead of abstract symbols.
(() => {
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  const node = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const cards = document.querySelectorAll('#protocol .rules article');
  const figure = (index, caption) => {
    const f = node('figure', '', 'pv');
    f.append(node('figcaption', caption));
    cards[index].querySelector('h3').after(f);
    return f;
  };
  // A numbered vertical story: [what happens, optional side note, optional tone].
  const story = (f, steps) => {
    const ol = node('ol', '', 'pv-story');
    for (const [what, note, tone] of steps) {
      const li = node('li', '', tone ? 'pv-' + tone : '');
      li.append(node('span', what, 'pv-what'));
      if (note) li.append(node('span', note, 'pv-note'));
      ol.append(li);
    }
    f.append(ol);
  };
  const takeaway = (f, text) => f.append(node('p', text, 'pv-take'));
  const bar = (f, label, used, text, tone) => {
    const wrap = node('div', '', 'pv-bar-row');
    const b = node('div', '', 'pv-bar');
    const u = node('span', '', 'pv-bar-used pv-' + tone);
    u.style.width = used + '%';
    b.append(u);
    wrap.append(node('span', label, 'pv-bar-label'), b, node('span', text, 'pv-bar-text'));
    f.append(wrap);
  };

  const steps = figure(0, t('Example: the robot moves its arm', '例子：机器人挪一下手臂'));
  story(steps, [
    [t('Model looks at the camera image', '模型看一眼摄像头画面'), t('log #1 · robot moved 0 steps', '日志第 1 条 · 机器人动了 0 步')],
    [t('Model sends "move arm" 10 times', '模型发出 10 次“移动手臂”'), t('log #2 · robot moved 10 steps', '日志第 2 条 · 机器人动了 10 步'), 'ok'],
    [t('Simulator replies "done"', '仿真器回复“已执行”'), t('log #3 · still 10 steps', '日志第 3 条 · 仍是 10 步')],
  ]);
  takeaway(steps, t('3 log entries, but the robot really moved 10 steps. The budget counts the 10.', '日志记了 3 条，机器人实际动了 10 步。预算算的是这 10 步。'));

  const budget = figure(1, t('Example: a task that allows up to 1000 steps', '例子：一道最多允许 1000 步的题'));
  bar(budget, t('Finished early', '提前完成'), 30, t('used 300 of 1000 → stop and score', '用了 300 / 1000 步 → 结束并判分'), 'ok');
  bar(budget, t('Used everything', '用满额度'), 100, t('used 1000 of 1000 → stop and score', '用满 1000 / 1000 步 → 结束并判分'), 'warn');
  takeaway(budget, t('Like a phone data plan: 1000 is the maximum, not a target. Finishing sooner is fine.', '像手机流量套餐：1000 是最多能用多少，不是必须用完。早完成就早结束。'));

  const endings = figure(2, t('Two ways an attempt can stop', '一次尝试停下来的两种情况'));
  story(endings, [
    [t('Task ends normally (goal reached or steps used up)', '任务正常结束（达成目标或步数用完）'), t('→ check the scene → 1 or 0', '→ 检查现场 → 记 1 分或 0 分'), 'ok'],
    [t('Our servers or network break mid-run', '中途我们的服务器或网络出故障'), t('→ not the model\'s fault → unscored (not 0)', '→ 不怪模型 → 不计分（不是 0 分）'), 'warn'],
  ]);
  takeaway(endings, t('Unscored attempts are left out of totals instead of being counted as failures.', '未计分的题不算进总分，也不当作失败。'));

  const nonaction = figure(3, t('Example: the model keeps looking but never moves', '例子：模型一直在看，却迟迟不动手'));
  story(nonaction, [
    [t('Look, look, look...', '看图、看图、看图……'), t('"no-move" count 1, 2, 3...', '“没动”计数 1、2、3……')],
    [t('Model finally moves the robot', '模型终于让机器人动了一下'), t('streak resets to 0; running total keeps counting', '连续计数清零；累计计数继续累加'), 'ok'],
    [t('15 no-moves in a row, or the task\'s total limit (30 / 60 / 120)', '连续 15 次没动，或累计达到该题上限（30／60／120 次）'), t('→ stop, score 0', '→ 停止，记 0 分'), 'warn'],
  ]);
  takeaway(nonaction, t('Whichever limit is hit first ends the attempt. Earlier runs may use other limits.', '两个上限哪个先到就停。早期结果可能用其他上限，以每次尝试的记录为准。'));
  cards[3].querySelector('p:not(.pv-take)').textContent = t(
    'Current rule: 15 consecutive OR a per-task cumulative limit of 30 / 60 / 120 non-action interactions. Executed control steps reset only the consecutive counter. Some earlier runs used other limits or none; check the recorded protocol for each attempt.',
    '现行规则：连续 15 次，或累计达到每题上限 30／60／120 次非动作交互。实际执行控制步只清零连续计数，不清零累计计数。部分早期结果使用其他上限或没有上限，以每次尝试记录的协议为准。');

  const recovery = figure(4, t('Example: the connection drops mid-task', '例子：做到一半网络断了'));
  story(recovery, [
    [t('Request to the model fails', '向模型发的请求失败'), t('robot paused in place, scene not reset', '机器人原地暂停，现场不重置'), 'warn'],
    [t('Wait 10 s, try again → still fails', '等 10 秒再试 → 还是失败'), '', 'warn'],
    [t('Wait 20 s, try again → works', '等 20 秒再试 → 成功'), '', 'ok'],
    [t('Continue from the exact same spot', '从刚才的位置接着做'), t('earlier moves are not repeated', '之前的动作不会再做一遍'), 'ok'],
  ]);
  takeaway(recovery, t('At most 3 retries (10 / 20 / 40 s). Still failing → unscored.', '最多重试 3 次（10／20／40 秒）。仍失败 → 不计分。'));

  // Coverage donut: task count per domain, read from the same data.json the page uses.
  const coverage = figure(5, t('Tasks by domain', '各领域题目数'));
  const DOMAINS = [
    ['manipulation', 'Manipulation', '桌面与灵巧操作', '#0f8b7d'],
    ['mobile', 'Mobile manipulation', '移动操作', '#3f6fb5'],
    ['locomotion', 'Locomotion', '足式与轮足运动', '#e0742b'],
    ['driving', 'Driving', '车辆驾驶', '#8c6bb1'],
    ['aerial', 'Aerial', '无人机飞行', '#c99a2e'],
  ];
  fetch('/data/data.json').then(r => r.json()).then(data => {
    const runs = data.runs.filter(r => r.model === 'Astra');
    const total = runs.length;
    const benches = new Set(runs.map(r => r.bench)).size;
    const counts = DOMAINS.map(([k]) => runs.filter(r => r.domain === k).length);
    let acc = 0;
    const stops = DOMAINS.map(([, , , c], i) => {
      const a = acc / total * 100;
      acc += counts[i];
      return `${c} ${a}% calc(${acc / total * 100}% - 0.6%), transparent 0 ${acc / total * 100}%`;
    });
    const wrap = node('div', '', 'pv-donut-wrap');
    const donut = node('div', '', 'pv-donut');
    donut.style.background = `conic-gradient(${stops.join(',')})`;
    const center = node('div', '', 'pv-donut-center');
    center.append(node('strong', String(total)), node('span', t('tasks / model', '题／每个模型')));
    donut.append(center);
    const list = node('ul', '', 'pv-legend');
    DOMAINS.forEach(([, en, cn, c], i) => {
      const li = node('li');
      const dot = node('i');
      dot.style.background = c;
      li.append(dot, node('span', t(en, cn)), node('b', String(counts[i])));
      list.append(li);
    });
    wrap.append(donut, list);
    coverage.append(wrap);
    takeaway(coverage, t(`${total} tasks. Every model gets the same list; this shows task counts, not scores.`,
      `共 ${total} 题。所有模型做同一份题单；这里只表示题目数量，不代表得分。`));
  });
})();
