'use strict';
(() => {
  const key = 'robotworld-theme';
  let theme = 'paper';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch {}
  document.documentElement.dataset.theme = theme;
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.topnav');
    if (!nav) return;
    const group = document.createElement('div');
    group.className = 'theme-switch';
    group.setAttribute('role', 'group');
    const zh = document.documentElement.lang.startsWith('zh');
    group.setAttribute('aria-label', zh ? '背景主题' : 'Color theme');
    const button = document.createElement('button');
    button.type = 'button';
    const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
    const moon = '<path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z"/>';
    const update = value => {
      document.documentElement.dataset.theme = value;
      const label = value === 'dark' ? (zh ? '切换为浅色' : 'Switch to light theme') : (zh ? '切换为深色' : 'Switch to dark theme');
      button.setAttribute('aria-label', label);
      button.title = label;
      button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' + (value === 'dark' ? sun : moon) + '</svg>';
    };
    button.addEventListener('click', () => {
      const value = document.documentElement.dataset.theme === 'dark' ? 'paper' : 'dark';
      update(value);
      try { localStorage.setItem(key, value); } catch {}
    });
    group.append(button);
    update(theme);
    nav.append(group);

    const issues = 'https://github.com/robotworldai/robotworldai.github.io/issues';
    const links = document.createElement('div');
    links.className = 'community-nav';
    const contribute = document.createElement('a');
    contribute.href = '#contribute';
    contribute.className = 'contribute-link';
    contribute.innerHTML = '<span>RobotWorld 2.0</span><small>' + (zh ? '征集贡献' : 'Call for contributions') + '</small>';
    const contact = document.createElement('a');
    contact.href = issues;
    contact.textContent = zh ? '联系 / Contact' : 'Contact';
    contact.title = zh ? '通过 GitHub Issues 联系项目' : 'Contact the project through GitHub Issues';
    links.append(contribute, contact);
    nav.insertBefore(links, group);

    const section = document.createElement('section');
    section.id = 'contribute';
    section.className = 'community-section';
    const content = document.createElement('div');
    content.className = 'community-content';
    const kicker = document.createElement('p');
    kicker.className = 'community-kicker';
    kicker.textContent = 'ROBOTWORLD 2.0 · ' + (zh ? '征集贡献' : 'CALL FOR CONTRIBUTIONS');
    const title = document.createElement('h2');
    title.textContent = zh ? '一起构建下一版 RobotWorld' : 'Help build the next RobotWorld';
    const intro = document.createElement('p');
    intro.textContent = zh ? '欢迎提出机器人任务、环境与评分器建议，或分享评测反馈。提交建议不代表自动纳入基准，任务设计与评测规则仍需审查。' : 'Propose robot tasks, environments and evaluators, or share evaluation feedback. Proposals are reviewed for task design and evaluation validity before inclusion.';
    const list = document.createElement('ul');
    const items = zh ? ['任务建议：目标、机器人形态与代表性的失败模式。', '环境与评分器：可复现设置、依赖、成功标准及资源要求。', '评测反馈：复现步骤、预期行为及相关记录；请勿公开凭据或敏感数据。'] : ['Task ideas: goals, embodiments and representative failure modes.', 'Environments and evaluators: reproducible setup, dependencies, success criteria and resource requirements.', 'Evaluation feedback: reproduction steps, expected behavior and relevant evidence; do not post credentials or sensitive data.'];
    for (const text of items) { const li = document.createElement('li'); li.textContent = text; list.append(li); }
    const action = document.createElement('a');
    action.className = 'btn solid';
    action.href = issues + '/new?title=' + encodeURIComponent('[RobotWorld 2.0] Task proposal') + '&body=' + encodeURIComponent('Task goal:\n\nEmbodiment and environment:\n\nSuccess criteria:\n\nReproduction and resource requirements:\n\nLinks and licensing:\n');
    action.textContent = zh ? '通过 GitHub 提交建议' : 'Propose a contribution on GitHub';
    content.append(kicker, title, intro, list, action);
    section.append(content);
    const footer = document.querySelector('footer');
    if (footer) footer.before(section); else document.body.append(section);
  });
})();
