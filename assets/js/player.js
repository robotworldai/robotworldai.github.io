'use strict';
// In-page recording viewer. The demo never links to the internal trajectory review.
window.RWPlayer = (() => {
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  let dialog = null;
  const fullName = m => ({Astra:'GPT-6 Astra', Opus:'Opus 5.5', K3:'Kimi K3', DPSK:'DeepSeek V4.1 Flash', Gemini:'Gemini 3.8 Flash'})[m] || m;
  const isInitialFrame = r => r.media_status === 'initial';
  const canPlay = r => Boolean(r.video) && (!r.media_status || r.media_status === 'video');
  const mediaLabel = r => isInitialFrame(r)
    ? (r.steps === 0 ? t('Initial frame · No action', '仅初始画面 · 未执行动作') : t('Single frame only', '仅单帧画面'))
    : r.media_status === 'unavailable' ? t('Recording unavailable', '录像不可用')
    : canPlay(r) ? t('Play recording', '播放录像') : t('No recording', '无录像');
  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'rw-player';
    dialog.innerHTML = '<div class="rw-player-box"><button type="button" class="rw-close"></button><div class="rw-media"></div><div class="rw-meta"><b></b><span></span><small></small></div></div>';
    dialog.querySelector('.rw-close').textContent = t('Close', '关闭');
    dialog.querySelector('.rw-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => dialog.querySelector('.rw-media').replaceChildren());
    document.body.append(dialog);
  }
  function open(r) {
    if (!dialog) build();
    const media = dialog.querySelector('.rw-media');
    if (isInitialFrame(r)) {
      const img = document.createElement('img');
      img.src = r.poster;
      img.alt = mediaLabel(r);
      img.style.cssText = 'display:block;width:100%;max-height:70vh;object-fit:contain';
      const note = document.createElement('p');
      note.className = 'rw-empty';
      note.textContent = mediaLabel(r) + (r.steps === 0 && (r.stop || '').includes('nonaction consecutive')
        ? t('. Stopped at the consecutive non-action limit.', '，因达到连续非动作次数上限而结束。') : '');
      media.replaceChildren(img, note);
    } else if (canPlay(r)) {
      const v = document.createElement('video');
      Object.assign(v, {src: r.video, poster: r.poster || '', controls: true, autoplay: true, muted: true, playsInline: true, loop: true});
      media.replaceChildren(v);
    } else {
      media.replaceChildren(Object.assign(document.createElement('p'), {className: 'rw-empty', textContent: mediaLabel(r)}));
    }
    const score = r.score === 1 ? t('Score 1', '得分 1') : r.score === 0 ? t('Score 0', '得分 0') : t('Unscored', '未计分');
    dialog.querySelector('.rw-meta b').textContent = `${({Astra: 'GPT-6 Astra', Opus: 'Opus 5.5', K3: 'Kimi K3', DPSK: 'DeepSeek V4.1 Flash', Gemini: 'Gemini 3.8 Flash'})[r.model] || r.model} · ${score}`;
    dialog.querySelector('.rw-meta span').textContent = zh ? r.title : r.title_en;
    dialog.querySelector('.rw-meta small').textContent = `${r.bench_name}` + (r.score !== null && r.steps != null ? ` · ${Math.min(r.steps, r.limit)}/${r.limit} ${t('control steps', '控制步')}` : '');
    dialog.showModal();
  }
  // Turn any element into a button-like trigger for one run.
  function bind(node, r) {
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.classList.add('rw-trigger');
    node.addEventListener('click', e => { e.preventDefault(); open(r); });
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(r); } });
    return node;
  }
  return {open, bind, isInitialFrame, canPlay, mediaLabel, fullName};
})();
