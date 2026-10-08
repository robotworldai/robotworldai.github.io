(() => {
  "use strict";
  const root = document.getElementById("embodiment-atlas");
  if (!root) return;
  const zh = document.documentElement.lang.startsWith("zh");
  const lang = zh ? "zh" : "en";
  const text = (en, cn) => zh ? cn : en;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const domains = [
    ["manipulation", "Manipulation", "操作"],
    ["mobile", "Mobile manip.", "移动操作"],
    ["locomotion", "Locomotion", "运动"],
    ["driving", "Driving", "驾驶"],
    ["aerial", "Aerial", "飞行"]
  ];
  const domainName = id => { const d = domains.find(d => d[0] === id); return d[zh ? 2 : 1]; };
  const fetchJSON = async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(path + ": " + response.status);
    return response.json();
  };
  Promise.all([fetchJSON("/data/embodiments.json"), fetchJSON("/data/data.json")]).then(([catalog, data]) => {
    const configurations = catalog.robots;
    const robots = catalog.embodiments.map(body => ({
      ...configurations.find(r => r.id === body.configurationIds[0]), ...body,
      configurations: body.configurationIds.map(id => configurations.find(r => r.id === id))
    }));
    const components = catalog.unifiedActionSpace.components;
    const channels = (robot, component) => robot.parts.reduce((n, part) => n + (component.keys.includes(part.key) ? part.n : 0), 0);
    const maxima = scope => components.map(c => Math.max(0, ...scope.map(r => channels(r,c))));
    const runs = data.runs.filter(run => run.model === "Astra");
    const tasksFor = robot => robot.configurations ? robot.configurations.flatMap(tasksFor) : runs.filter(run => robot.benches.includes(run.bench) &&
      (robot.id === "f1tenth" ? run.task === "f1tenth-drift" : robot.id === "mushr" ? run.task !== "f1tenth-drift" : true));
    const dimensionLabel = robot => {
      const dims = robot.configurations.map(r => r.dim), min = Math.min(...dims), max = Math.max(...dims);
      return min === max ? `${min}D` : `${min}–${max}D`;
    };
    const button = (robot, photo) => `<button type="button" class="${photo ? "ea-robot " : ""}ea-scope-${robot.domain}" data-robot="${robot.id}" aria-pressed="false" aria-controls="ea-unified ea-detail" aria-label="${esc(robot.name)}, ${dimensionLabel(robot)}, ${esc(domainName(robot.domain))}, ${tasksFor(robot).length} ${text("tasks", "个任务")}">
      ${photo ? `<span class="ea-robot-dim" aria-hidden="true">${dimensionLabel(robot)}</span><img src="/assets/images/embodiments/${robot.image}" alt="${esc(robot.imageCaption ? robot.imageCaption[lang] : robot.name)}" loading="lazy" decoding="async" width="160" height="144"><span class="ea-robot-name">${esc(robot.name)}${robot.configurations.length > 1 ? `<small>${robot.configurations.length} ${text("control profiles", "种控制配置")}</small>` : robot.imageCaption ? `<small>${esc(robot.imageCaption[lang])}</small>` : ""}</span><span class="ea-robot-domain" aria-hidden="true"></span>` : `${esc(robot.name)} <span aria-hidden="true">↗</span>`}
    </button>`;
    root.innerHTML = `<div class="ea-domainbar" role="group" aria-label="${text("Filter embodiments by task domain", "按任务领域筛选本体")}">${domains.map(([id,en,cn]) => `<button type="button" class="ea-domain ea-scope-${id}" data-domain="${id}" aria-pressed="false"><span>${zh ? cn : en}</span><small>${runs.filter(r => r.domain === id).length} ${text("tasks", "任务")} · ${robots.filter(r => r.domain === id).length} ${text("embodiments", "本体")}</small></button>`).join("")}</div>
      <div class="ea-toolbar"><button type="button" class="ea-all" aria-pressed="true">${text("All embodiments", "全部本体")} ↗</button><span>${text("Hover, focus or tap a domain or robot", "悬停 / 点击任务分类或机器人 · 支持键盘")}</span></div>
          <section class="ea-unified" id="ea-unified" aria-labelledby="ea-unified-title" aria-describedby="ea-space-note">
            <div class="ea-space-heading"><div><h3 id="ea-unified-title">Unified Action Space</h3><p class="ea-space-selection" id="ea-space-title"></p></div><div class="ea-space-actions"><button type="button" class="ea-jump" hidden></button><button type="button" class="ea-reset">${text("Show overview", "查看总览")}</button></div></div>
            <dl class="ea-space-components">${components.map(c => `<div class="ea-space-component ea-component-${c.id}" data-component="${c.id}" title="${esc(c.description[lang])}"><dt>${esc(c.label[lang])}</dt><dd><span class="ea-space-value"></span><small class="ea-space-unit"></small></dd></div>`).join("")}</dl>
            <div class="ea-space-footer"><span class="ea-native-mode"></span><p id="ea-space-note" class="ea-space-note"></p></div>
          </section>
      <div class="ea-board">
          <div class="ea-collection">
          <div class="ea-gallery" role="group" aria-label="${text("Robot product and project images", "机器人产品及项目图片")}">${robots.filter(r => r.image).map(r => button(r,true)).join("")}</div>
          <div class="ea-research"><p>${text("Research configurations · hardware photos pending", "研究构型 · 对应真机图片待补充")}</p><div class="ea-research-list">${robots.filter(r => !r.image).map(r => button(r,false)).join("")}</div></div>
          </div>
        <aside class="ea-detail" id="ea-detail" aria-label="${text("Selected robot: action space and tasks", "选定机器人的动作空间与任务")}"></aside>
      </div>
      <p class="ea-footnote">${text("D counts controller input scalars, not hardware DOF. 18 embodiments and 20 evaluated control profiles cover 84 published tasks. Panda appears once, with three selectable profiles; G1 is shared across two integrations. Images identify hardware platforms; task attachments may differ. All evaluations run in simulation.", "D 表示控制器输入标量数，并非硬件自由度。18 个本体、20 个评测控制配置覆盖 84 个已发布任务。Panda 仅展示一次，可切换三种配置；G1 合并两个集成。配图用于识别平台，任务附件可能不同；所有评测均在仿真中进行。")} <a href="/data/embodiment-sources.json">${text("Image credits & provenance", "图片来源与说明")} ↗</a></p>
      <span class="sr-only" id="ea-announcement" role="status" aria-live="polite"></span>`;
    const detail = root.querySelector("#ea-detail");
    let selected = null;
    let selectedBody = null;
    let activeDomain = null;
    let domainMode = null;
    let inputMode = "keyboard";
    let selectionMode = null;
    let overviewTimer = null;
    const interactionSelector = "[data-domain], [data-robot], #ea-detail, .ea-space-actions";
    const desktopHover = e => e.pointerType === "mouse" && window.matchMedia("(min-width: 781px) and (hover: hover)").matches;
    const isHoverPreview = () => (selectionMode || domainMode) === "hover";
    function exitPreview(announce = false) {
      if (domainMode === "hover" || domainMode === "keyboard") filter(null, null, announce);
      else overview(announce);
    }
    function cancelOverview() {
      window.clearTimeout(overviewTimer);
      overviewTimer = null;
    }
    function scheduleOverview() {
      cancelOverview();
      if (!isHoverPreview()) return;
      // Allow the pointer to cross the gutter into the interactive detail panel.
      overviewTimer = window.setTimeout(() => {
        if (isHoverPreview() && !root.querySelector("[data-domain]:hover, [data-robot]:hover, #ea-detail:hover, .ea-space-actions:hover")) exitPreview();
      }, 220);
    }
    function renderSpace(robot, body) {
      const scope = configurations.filter(r => !activeDomain || r.domain === activeDomain);
      const values = robot ? components.map(c => channels(robot,c)) : maxima(scope);
      const activeTasks = runs.filter(r => !activeDomain || r.domain === activeDomain).length;
      root.querySelector("#ea-space-title").textContent = robot
        ? `${body.name} · ${robot.dim}D`
        : `${activeDomain ? domainName(activeDomain) : text("All embodiments", "全部本体")} · ${activeTasks} ${text("tasks", "个任务")}`;
      root.querySelector(".ea-reset").hidden = !robot && !activeDomain;
      const jump = root.querySelector(".ea-jump");
      jump.hidden = !robot;
      jump.textContent = robot ? `${tasksFor(robot).length} ${text("tasks", "个任务")} ↓` : "";
      root.querySelector(".ea-native-mode").textContent = robot ? robot.control[lang] : text("Hover a robot to see its active channels", "悬停机器人查看其动作分量");
      components.forEach((c,i) => {
        const tile = root.querySelector(`[data-component="${c.id}"]`);
        tile.classList.toggle("is-inactive", !values[i]);
        tile.querySelector(".ea-space-value").textContent = values[i] ? `${values[i]}D` : "—";
        tile.querySelector(".ea-space-unit").textContent = values[i] ? (robot ? text("active", "已使用") : text("max", "最大")) : text("unused", "未使用");
      });
      root.querySelector("#ea-space-note").textContent = robot
        ? text("Active native channels · — not controlled", "高亮原生动作分量 · — 未控制")
        : text("Component maxima, not one summed action vector", "各分量最大维度，并非相加后的统一向量");
    }
    function overview(announce = false) {
      cancelOverview();
      selectionMode = null;
      selected = null;
      selectedBody = null;
      detail.className = "ea-detail ea-overview-detail";
      const domainSummary = activeDomain ? `${runs.filter(r => r.domain === activeDomain).length} ${text("tasks", "个任务")} · ${robots.filter(r => r.domain === activeDomain).length} ${text("embodiments", "个本体")}` : "";
      detail.innerHTML = `<p class="ea-eyebrow">${activeDomain ? text("Task domain", "任务领域") : text("Embodiment explorer", "本体图谱")}</p><h3>${activeDomain ? esc(domainName(activeDomain)) : text("Select a robot", "选择一个机器人")}</h3><p class="ea-overview-prompt">${activeDomain ? `${domainSummary}<br>${text("Explore a highlighted robot to see its action channels and tasks.", "查看高亮机器人，了解它的动作维度与任务。")}` : text("Explore its action channels, controller profiles and tasks in RobotWorld.", "查看它在 RobotWorld 中的动作维度、控制配置与评测任务。")}</p><p class="ea-note">${text("The shared vocabulary above maps each native controller onto the same component categories. Hover, focus or tap an embodiment to highlight its channels.", "上方以相同的分量类别展示不同本体的原生控制器。悬停、聚焦或点击本体，即可高亮其动作通道。")}</p>`;
      root.querySelector(".ea-gallery").classList.remove("has-selection");
      root.querySelectorAll("[data-robot]").forEach(b => b.setAttribute("aria-pressed","false"));
      renderSpace(null);
      if (announce) root.querySelector("#ea-announcement").textContent = root.querySelector("#ea-space-title").textContent;
    }
    function select(body, announce = false, profileId) {
      if (activeDomain && body.domain !== activeDomain) {
        const mode = selectionMode;
        filter(null);
        selectionMode = mode;
      }
      if (selectedBody === body.id && !profileId) return;
      const robot = body.configurations.find(r => r.id === profileId) || body.configurations[0];
      if (selected === robot.id && selectedBody === body.id) return;
      selected = robot.id;
      selectedBody = body.id;
      const focusedProfile = document.activeElement?.dataset.profile;
      renderSpace(robot, body);
      detail.hidden = false;
      root.querySelector(".ea-gallery").classList.add("has-selection");
      root.querySelectorAll("[data-robot]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.robot === body.id)));
      detail.className = "ea-detail ea-scope-" + robot.domain;
      const tasks = tasksFor(robot);
      detail.innerHTML = `<div class="ea-detail-identity"><p class="ea-eyebrow">${esc(domainName(robot.domain))} / ${text("embodiment", "机器人本体")}</p>
        <h3>${esc(body.name)}</h3><p class="ea-control">${esc(robot.control[lang])}</p>
          ${body.configurations.length > 1 ? `<div class="ea-profiles" role="group" aria-label="${text("Control profiles for this embodiment", "当前本体的控制配置")}">${body.configurations.map(c => `<button type="button" data-profile="${c.id}" aria-pressed="${c.id === robot.id}">${esc(c.profileLabel[lang])}</button>`).join("")}</div>` : ""}
          <div class="ea-total"><strong>${robot.dim}<span>D</span></strong><span>${text("action channels", "动作通道")}</span></div>
          <div class="ea-meter" aria-hidden="true">${robot.parts.map(p => `<span class="ea-component-${components.find(c => c.keys.includes(p.key)).id}" data-size="${p.n}"></span>`).join("")}</div>
          <dl class="ea-parts">${robot.parts.map(p => `<div class="ea-component-${components.find(c => c.keys.includes(p.key)).id}"><dt>${esc(p.label[lang])}</dt><dd>${p.n}D</dd></div>`).join("")}</dl>
        </div><div class="ea-detail-tasks"><h4 class="ea-tasks-title"><span>${text("Tasks in RobotWorld", "RobotWorld 中的任务")}</span><span>${tasks.length.toString().padStart(2,"0")}</span></h4>
          <ul class="ea-tasks">${tasks.map((t,i) => `<li><button type="button" class="ea-task" data-task="${i}" ${window.RWPlayer?.canPlay(t) ? "" : "disabled"}><span>${esc(zh ? t.title : t.title_en || t.title)}</span><span aria-hidden="true">↗</span></button></li>`).join("")}</ul>
        </div><div class="ea-detail-notes">
        <p class="ea-note">${esc(robot.note[lang])}</p>
        <div class="ea-detail-links">${robot.contract.map((url,i) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${esc(robot.benches[i])} ↗</a>`).join("")}${robot.imageSource ? `<a href="${esc(robot.imageSource)}" target="_blank" rel="noopener noreferrer">${text("Photo source", "图片来源")} ↗</a>` : ""}</div></div>`;
      detail.querySelectorAll("[data-size]").forEach(segment => segment.style.setProperty("--ea-size", segment.dataset.size));
      if (focusedProfile) detail.querySelector(`[data-profile="${focusedProfile}"]`)?.focus({preventScroll:true});
      detail.querySelectorAll("[data-task]").forEach(b => b.addEventListener("click", () => window.RWPlayer?.open(tasks[Number(b.dataset.task)])));
      if (announce) root.querySelector("#ea-announcement").textContent = `${robot.name}, ${robot.dim}D, ${tasks.length} ${text("tasks","个任务")}`;
    }
    document.addEventListener("pointerdown", e => {
      inputMode = e.pointerType === "mouse" ? "mouse" : "touch";
      if ((selected || activeDomain) && root.contains(e.target) && e.target.closest(interactionSelector)) {
        if (selected) selectionMode = inputMode === "mouse" ? "hover" : "touch";
        cancelOverview();
      }
    }, true);
    document.addEventListener("keydown", () => { inputMode = "keyboard"; }, true);
    root.addEventListener("keydown", e => {
      if ((selected || activeDomain) && e.target.closest(interactionSelector)) {
        if (selected) selectionMode = "keyboard";
        else domainMode = "keyboard";
        cancelOverview();
      }
    });
    root.addEventListener("focusout", () => {
      // Profile switches rebuild the focused button; check after it is restored.
      queueMicrotask(() => {
        if ((selectionMode || domainMode) === "keyboard" && !document.activeElement?.closest(interactionSelector) && !document.querySelector("dialog[open]")) exitPreview(true);
      });
    });
    root.querySelectorAll("[data-robot]").forEach(b => {
      const robot = robots.find(r => r.id === b.dataset.robot);
      b.addEventListener("pointerenter", e => {
        if (desktopHover(e)) {
          inputMode = "mouse";
          selectionMode = "hover";
          cancelOverview();
          select(robot);
        }
      });
      b.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") scheduleOverview(); });
      b.addEventListener("focus", () => {
        selectionMode = inputMode === "mouse" ? "hover" : inputMode;
        cancelOverview();
        select(robot,true);
      });
      b.addEventListener("click", e => {
        selectionMode = e.detail === 0 ? "keyboard" : inputMode === "mouse" ? "hover" : "touch";
        cancelOverview();
        select(robot,true);
        if (window.matchMedia("(max-width: 780px)").matches) {
          detail.scrollIntoView({block:"start", behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
        }
      });
    });
    [detail, root.querySelector(".ea-space-actions")].forEach(panel => {
      panel.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") cancelOverview(); });
      panel.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") scheduleOverview(); });
    });
    function filter(domain, mode = null, announce = false) {
      activeDomain = domain;
      domainMode = domain ? mode : null;
      root.querySelectorAll("[data-domain]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.domain === domain)));
      root.querySelector(".ea-all").setAttribute("aria-pressed",String(!domain));
      root.querySelectorAll("[data-robot]").forEach(b => {
        const outside = Boolean(domain && robots.find(r => r.id === b.dataset.robot).domain !== domain);
        // Hover highlights in place; tap/focus may narrow the gallery explicitly.
        b.hidden = outside && mode !== "hover";
        b.classList.toggle("is-outside-domain", outside && mode === "hover");
      });
      root.querySelector(".ea-research").hidden = !robots.some(r => !r.image && (mode === "hover" || !domain || r.domain === domain));
      overview(announce);
    }
    root.querySelectorAll("[data-domain]").forEach(b => {
      b.addEventListener("pointerenter", e => {
        if (desktopHover(e)) {
          inputMode = "mouse";
          filter(b.dataset.domain, "hover");
        }
      });
      b.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") scheduleOverview(); });
      b.addEventListener("focus", () => {
        if (inputMode === "keyboard") filter(b.dataset.domain, "keyboard", true);
      });
      b.addEventListener("click", e => {
        const mode = e.detail === 0 ? "keyboard" : inputMode === "mouse" ? "hover" : "touch";
        const toggleOff = mode === "touch" && domainMode === "touch" && activeDomain === b.dataset.domain;
        filter(toggleOff ? null : b.dataset.domain, mode, true);
      });
    });
    root.querySelector(".ea-all").addEventListener("click", () => filter(null, null, true));
    root.querySelector(".ea-reset").addEventListener("click", () => filter(null, null, true));
    root.querySelector(".ea-jump").addEventListener("click", () => detail.scrollIntoView({block:"start", behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"}));
    detail.addEventListener("click", e => {
      const button = e.target.closest("[data-profile]");
      if (button) select(robots.find(r => r.id === selectedBody), true, button.dataset.profile);
    });
    overview();
  }).catch(error => {
    console.error("Embodiment atlas:", error);
    root.innerHTML = `<p>${text("The embodiment atlas could not load. Please reload the page, or inspect the catalog below.", "本体图谱暂时无法加载，请刷新页面，或查看下方数据目录。")} <a href="/data/embodiments.json">${text("Open catalog", "查看目录")}</a></p>`;
  });
})();
