'use strict';
(() => {
  const key = 'robotworld-theme';
  let theme = 'paper';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch {}
  document.documentElement.dataset.theme = theme;
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.topnav');
    const group = document.createElement('div');
    group.className = 'theme-switch';
    group.setAttribute('role', 'group');
    const zh = document.documentElement.lang.startsWith('zh');
    group.setAttribute('aria-label', zh ? '背景主题' : 'Color theme');
    const buttons = [];
    const update = value => {
      document.documentElement.dataset.theme = value;
      for (const [button, name] of buttons) button.setAttribute('aria-pressed', String(name === value));
    };
    for (const [value, label] of [['paper', zh ? '浅色' : 'Light'], ['dark', zh ? '深色' : 'Dark']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      buttons.push([button, value]);
      button.addEventListener('click', () => {
        update(value);
        try { localStorage.setItem(key, value); } catch {}
      });
      group.append(button);
    }
    update(theme);
    nav.append(group);
  });
})();
