'use strict';
// In-page recording viewer. The demo never links to the internal trajectory review.
window.RWPlayer = (() => {
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  let dialog = null;
  const fullName = m => ({Astra:'GPT-6 Astra', Opus:'Opus 5.5', K3:'Kimi K3', DPSK:'DeepSeek V4.1 Flash', Gemini:'Gemini 3.8 Flash'})[m] || m;
  const isInitialFrame = r => r.media_status === 'initial';
  const canPlay = r => Boolean(r.video) && (!r.media_status || r.media_status === 'video' || isInitialFrame(r));
  const mediaLabel = r => isInitialFrame(r)
    ? (canPlay(r) ? t('Play recording · Single frame', '播放录像 · 单帧') : t('Single frame only', '仅单帧画面'))
    : r.media_status === 'unavailable' ? t('Recording unavailable', '录像不可用')
    : canPlay(r) ? t('Play recording', '播放录像') : t('No recording', '无录像');
  const stopLabel = r => ({
    'nonaction consecutive limit': t('Stopped by: consecutive non-action limit', '停止原因：连续非动作次数达到上限'),
    'nonaction total limit': t('Stopped by: cumulative non-action limit', '停止原因：累计非动作次数达到上限'),
    'reached step budget': t('Stopped by: control-step budget', '停止原因：控制步数预算耗尽'),
    'native termination': t('Stopped by: native environment termination', '停止原因：环境原生终止条件'),
    'world evaluation end': t('Stopped by: world evaluation end', '停止原因：世界状态评估结束'),
    'goal reached': t('Stopped by: goal reached', '停止原因：已达成目标'),
    'environment end': t('Stopped by: environment end', '停止原因：环境结束'),
    'world-state failure': t('Stopped by: world-state failure condition', '停止原因：世界状态失败条件'),
    'world-state terminal': t('Stopped by: world-state terminal condition', '停止原因：世界状态终止条件'),
  })[r.stop] || t('Stop reason not recorded', '停止原因未记录');
  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'rw-player';
    dialog.innerHTML = '<div class="rw-player-box"><button type="button" class="rw-close"></button><div class="rw-media"></div><div class="rw-meta"><b></b><span></span><small class="rw-steps"></small><small class="rw-stop"></small><small class="rw-duration"></small></div></div>';
    dialog.querySelector('.rw-close').textContent = t('Close', '关闭');
    dialog.querySelector('.rw-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => dialog.querySelector('.rw-media').replaceChildren());
    document.body.append(dialog);
  }
  function open(r) {
    if (!dialog) build();
    const media = dialog.querySelector('.rw-media');
    const fallback = () => {
      const nodes = [];
      if (r.poster) {
        const img = document.createElement('img');
        img.src = r.poster;
        img.alt = t('Recorded scene', '录制场景');
        img.style.cssText = 'display:block;width:100%;max-height:70vh;object-fit:contain';
        nodes.push(img);
      }
      const note = document.createElement('p');
      note.className = 'rw-empty';
      note.textContent = r.video ? t('Recording unavailable', '录像不可用') : t('No recording', '无录像');
      media.replaceChildren(...nodes, note);
    };
    if (canPlay(r)) {
      const v = document.createElement('video');
      Object.assign(v, {src: r.video, poster: r.poster || '', controls: true, autoplay: true, muted: true, playsInline: true});
      v.addEventListener('error', () => { if (media.contains(v)) fallback(); }, {once: true});
      media.replaceChildren(v);
    } else {
      fallback();
    }
    const score = r.score === 1 ? t('Score 1', '得分 1') : r.score === 0 ? t('Score 0', '得分 0') : t('Unscored', '未计分');
    dialog.querySelector('.rw-meta b').textContent = `${({Astra: 'GPT-6 Astra', Opus: 'Opus 5.5', K3: 'Kimi K3', DPSK: 'DeepSeek V4.1 Flash', Gemini: 'Gemini 3.8 Flash'})[r.model] || r.model} · ${score}`;
    dialog.querySelector('.rw-meta span').textContent = zh ? r.title : r.title_en;
    dialog.querySelector('.rw-steps').textContent = r.score !== null && r.steps != null ? `${Math.min(r.steps, r.limit)}/${r.limit} ${t('control steps', '控制步')}` : '';
    dialog.querySelector('.rw-stop').textContent = stopLabel(r);
    dialog.querySelector('.rw-duration').textContent = isInitialFrame(r)
      ? t('Single-frame recording', '单帧录像') + (r.video_seconds > 0 ? ` · ${r.video_seconds.toFixed(3)} s` : '') + (r.steps === 0 ? t(' · No control steps executed', ' · 未执行控制步') : '') : '';
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
