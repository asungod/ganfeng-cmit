import { go } from "../app/router";
import { mountPipeline } from "../app/pipeline";
import { bindCiteToggles, mountAsk, renderCitations, showTalkToast } from "../app/labels";
import { parseHakkaIntent } from "../app/intent";
import { fallbackRow } from "../app/table";
import { formatLookupLine, pushLookupLog, reportLookupMs } from "../app/engineHud";
import {
  citationsForRoom,
  fallbackHour,
  hakkaCitations,
  hakkaQA,
  hourCompat,
  hourLockMessage,
  hourSounds,
  hourWhy,
  hours,
  isMatrixRoom,
  matrixRooms,
  rooms,
  walkOrder,
  type Compat,
  type HourId,
  type MatrixRoomId,
  type RoomId,
} from "../data/hakka";
import { ambience } from "../render/ambience";
import { guide, lines } from "../app/guide";
import { bindDemoDetailToggle } from "../app/demoDetail";
import { WeiwuScene } from "../render/weiwu";
import { preloadGltfKit } from "../render/gltfKit";
import { markTry, renderEvidence } from "../app/evidence";
import { hakkaRule } from "../data/evidenceRules";
import { routeName, t } from "../app/i18n";

export function mountHakka(root: HTMLElement): () => void {
  let room: RoomId = "menlou";
  let hour: HourId = "dusk";
  let walking = false;
  let firstVisit = true;
  let view: WeiwuScene | null = null;
  let firstView = !/#\/?kejia\/./.test(location.hash);
  let lockNote = "";
  let rejected: HourId | null = null;
  let pickRoom: RoomId = room;
  let pickHour: HourId = hour;
  let fromTalk = false;

  root.innerHTML = `
    <div class="exhibit kejia is-immersive">
      <div class="grain" aria-hidden="true"></div>
      <header class="ex-bar">
        <button type="button" class="text-btn" data-hall>← ${routeName("hall")}</button>
        <div class="ex-crumb">
          <b>${routeName("kejia")}</b>
          <span>赣南围屋 · 可走的宗族与防御</span>
        </div>
        <span class="stamp">示意平面 · 非某一文保测绘</span>
              <button type="button" class="chip demo-detail-btn" data-demo-detail aria-pressed="false">${t("demo.off")}</button>
      </header>
      <div class="kejia-grid immersive">
        <section class="plan-wrap">
          <p class="kicker">围屋平面 · 点房间即走入</p>
          <svg class="plan" viewBox="0 0 100 100" role="img" aria-label="赣南围屋示意平面">
            <rect class="plan-wall" x="6" y="6" width="88" height="88" rx="1" />
            <rect class="plan-inner" x="18" y="18" width="64" height="58" />
            <g data-rooms></g>
            <circle class="walker" data-walker cx="50" cy="90" r="2.2" />
          </svg>
          <div class="walk-btns">
            <button type="button" class="chip" data-overview>俯瞰全貌</button>
            <button type="button" class="chip" data-prev>上一段</button>
            <button type="button" class="chip is-on" data-next>沿动线走下一步</button>
          </div>
          <p class="restore-mark">程序示意复原 · 非文保测绘</p>
        </section>
        <section class="room-view-wrap">
          <canvas class="room-view" aria-label="当前房间示意室内"></canvas>
          <div class="rewrite-toast" data-toast hidden></div>
          <div class="talk-toast" data-talk-toast hidden></div>
          <p class="vitrine-cap">动线可走 · 示意室内，非测绘</p>
          <p class="walk-path" data-path></p>
          <p class="restore-mark">程序示意复原 · 非文保测绘</p>
        </section>
        <aside class="room-panel">
          <div class="field lock-dock">
            <span class="field-l">时辰锁定</span>
            <div class="chips" data-hours></div>
          </div>
          <section class="matrix" data-matrix>
            <details class="matrix-fold" data-matrix-fold>
              <summary class="matrix-sum">约束表</summary>
              <p class="engine-chip demo-only">约束表引擎 · table.ts lookup</p>
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th></th>
                    <th data-hour-col="dawn">晨</th>
                    <th data-hour-col="noon">午</th>
                    <th data-hour-col="dusk">暮</th>
                    <th data-hour-col="night">夜</th>
                  </tr>
                </thead>
                <tbody data-matrix-body></tbody>
              </table>
              <div class="matrix-rule" data-matrix-rule></div>
              <details class="audit-panel" data-audit>
                <summary class="audit-sum">约束表审计 · 规则条目（可展开）</summary>
                <div class="audit-body" data-audit-body>
                  <p class="audit-empty">冲突格触发后展开规则原文。</p>
                </div>
              </details>
            </details>
          </section>
          <article class="room-card" data-room></article>
          <div class="cites" data-cites></div>
        </aside>
      </div>
      <div class="gexu-ask" data-ask></div>
      <footer class="ex-pipe" data-pipe></footer>
    </div>
  `;

  const roomsG = root.querySelector("[data-rooms]") as SVGGElement;
  const walker = root.querySelector("[data-walker]") as SVGCircleElement;
  const hoursEl = root.querySelector("[data-hours]") as HTMLElement;
  const roomEl = root.querySelector("[data-room]") as HTMLElement;
  const citesEl = root.querySelector("[data-cites]") as HTMLElement;
  const pipe = mountPipeline(root.querySelector("[data-pipe]") as HTMLElement, routeName("kejia"));
  bindDemoDetailToggle(root);
  mountAsk(
    root.querySelector("[data-ask]") as HTMLElement,
    hakkaQA,
    hakkaCitations,
    "kejia",
    (q) => {
      const intent = parseHakkaIntent(q);
      if (!intent) return;
      fromTalk = true;
      if (intent.hour) hour = intent.hour;
      if (intent.room) room = intent.room;
      pickHour = hour;
      pickRoom = room;
      void enter(room, Boolean(intent.room));
    },
  );
  bindCiteToggles(root);

  roomsG.innerHTML = rooms
    .map((r) => {
      return `<g class="plan-room" data-room-id="${r.id}">
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" />
        <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 1.2}" text-anchor="middle">${r.name}</text>
      </g>`;
    })
    .join("");

  function pathEl(): void {
    const el = root.querySelector("[data-path]") as HTMLElement | null;
    if (!el) return;
    const i = walkOrder.indexOf(room);
    el.textContent = walkOrder
      .map((id, k) => {
        const n = rooms.find((r) => r.id === id)!.name;
        return k === i ? `【${n}】` : n;
      })
      .join(" → ");
    el.textContent += " · 平面为示意，术语见出处";
  }

  function paintHours(): void {
    hoursEl.innerHTML = hours
      .map(
        (h) =>
          `<button type="button" class="chip ${h.id === hour ? "is-on" : ""}" data-hour="${h.id}">${h.name}</button>`,
      )
      .join("");
  }

  function compatMark(c: Compat): string {
    return c === "ok" ? "合" : c === "stretch" ? "勉" : "冲";
  }

  function compatWord(c: Compat): string {
    return c === "ok" ? "合" : c === "stretch" ? "勉强" : "冲突";
  }

  function paintMatrix(): void {
    const body = root.querySelector("[data-matrix-body]") as HTMLElement;
    const ruleEl = root.querySelector("[data-matrix-rule]") as HTMLElement;
    body.innerHTML = matrixRooms
      .map((r) => {
        const rowOn = r.id === room ? " is-row" : "";
        const cells = hours
          .map((h) => {
            const c = hourCompat(r.id, h.id);
            const colOn = h.id === hour ? " is-col" : "";
            const pick = r.id === pickRoom && h.id === pickHour ? " is-pick" : "";
            const rej = rejected === h.id && r.id === room ? " is-rejected is-from" : "";
            const toCell = rejected && h.id === hour && r.id === room ? " is-to" : "";
            const mark = rejected === h.id && r.id === room ? `<span class="mx-x" aria-hidden="true">×</span>${compatMark(c)}` : compatMark(c);
            return `<td class="${colOn.trim()}"><button type="button" class="matrix-cell compat-${c}${pick}${rej}${toCell}" data-mx-hour="${h.id}" data-mx-room="${r.id}">${mark}</button></td>`;
          })
          .join("");
        return `<tr class="${rowOn.trim()}"><th class="matrix-row-l">${r.name}</th>${cells}</tr>`;
      })
      .join("");
    for (const th of root.querySelectorAll("[data-hour-col]")) {
      th.classList.toggle("is-col", th.getAttribute("data-hour-col") === hour);
    }
    const showRoom: MatrixRoomId = isMatrixRoom(pickRoom) ? pickRoom : isMatrixRoom(room) ? room : "zutang";
    const showHour = pickHour;
    const rName = matrixRooms.find((x) => x.id === showRoom)!.name;
    const hName = hours.find((x) => x.id === showHour)!.name;
    const c = hourCompat(showRoom, showHour);
    const why = hourWhy(showRoom, showHour);
    ruleEl.innerHTML = `<p>${rName} × ${hName} = ${compatWord(c)}。点下方审计面板展开规则原文。</p>
      <div class="matrix-rule-btns">${rejected ? '<button type="button" class="chip" data-replay-rewrite>重放改锁</button>' : ""}</div>`;
    const panel = root.querySelector("[data-audit]") as HTMLDetailsElement | null;
    const auditBody = root.querySelector("[data-audit-body]") as HTMLElement | null;
    if (panel && auditBody) {
      const fromH = rejected ? hours.find((x) => x.id === rejected)?.name ?? rejected : hName;
      const toH = rejected ? hours.find((x) => x.id === hour)?.name ?? hour : hName;
      auditBody.innerHTML = `
        <p class="audit-path"><b>可追溯回放</b> ${
          rejected || c === "conflict"
            ? `冲格「${rName}×${fromH}」× → 规则条目 → 改锁格「${rName}×${toH}」`
            : `当前格「${rName}×${hName}」= ${compatWord(c)}`
        }</p>
        <p class="audit-rule"><b>规则原文</b> ${why.why}</p>
        <pre class="audit-raw">{ room: "${showRoom}", hour: "${rejected ?? showHour}", status: "${c}", fallback: "${rejected ? hour : ""}" }</pre>
        ${renderEvidence(
          "kejia",
          hakkaRule(showRoom, (rejected ?? showHour) as HourId),
          (a, b) => hourCompat(a as RoomId, b as HourId),
          (a, b) => hourCompat(a as RoomId, b as HourId),
          (a, b) => `${matrixRooms.find((x) => x.id === a)?.name ?? a} × ${hours.find((x) => x.id === b)?.name ?? b}`,
        )}
      `;
      if (rejected || c === "conflict") {
        panel.classList.add("is-live");
        if (document.body.classList.contains("is-demo-detail")) {
          panel.open = true;
          const fold = root.querySelector("[data-matrix-fold]") as HTMLDetailsElement | null;
          if (fold) fold.open = true;
        }
      } else {
        panel.classList.remove("is-live");
      }
    }
  }

  let solveGen = 0;

  function paintSolveLine(): void {
    const section = root.querySelector("[data-matrix]") as HTMLElement | null;
    if (!section) return;
    section.querySelector("svg.matrix-solve")?.remove();
    const gen = ++solveGen;
    if (!rejected || !isMatrixRoom(room)) return;
    const fromRoom = room;
    const fromHour = rejected;
    const toHour = hour;
    const draw = (): void => {
      if (gen !== solveGen) return;
      const from = section.querySelector(`[data-mx-room="${fromRoom}"][data-mx-hour="${fromHour}"]`) as HTMLElement | null;
      const to = section.querySelector(`[data-mx-room="${fromRoom}"][data-mx-hour="${toHour}"]`) as HTMLElement | null;
      if (!from || !to) return;
      from.classList.add("is-from", "is-walk", "is-flash");
      const box = section.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      if (box.width < 4 || box.height < 4) return;
      section.querySelector("svg.matrix-solve")?.remove();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "matrix-solve");
      svg.setAttribute("width", String(box.width));
      svg.setAttribute("height", String(box.height));
      svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", `hk-arrow-${gen}`);
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "9");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "9");
      marker.setAttribute("markerHeight", "9");
      marker.setAttribute("orient", "auto-start-reverse");
      const tip = document.createElementNS("http://www.w3.org/2000/svg", "path");
      tip.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      tip.setAttribute("fill", "#a33b32");
      marker.appendChild(tip);
      defs.appendChild(marker);
      svg.appendChild(defs);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(a.left - box.left + a.width / 2));
      line.setAttribute("y1", String(a.top - box.top + a.height / 2));
      line.setAttribute("x2", String(b.left - box.left + b.width / 2));
      line.setAttribute("y2", String(b.top - box.top + b.height / 2));
      line.setAttribute("pathLength", "1");
      line.setAttribute("marker-end", `url(#hk-arrow-${gen})`);
      svg.appendChild(line);
      section.appendChild(svg);
      to.classList.add("is-to");
      window.setTimeout(() => {
        if (gen !== solveGen) return;
        from.classList.remove("is-walk");
      }, 700);
      window.setTimeout(() => {
        if (gen === solveGen) {
          svg.classList.add("is-remnant");
          from.classList.remove("is-flash");
        }
      }, 1400);
    };
    draw();
    requestAnimationFrame(() => requestAnimationFrame(draw));
  }

  function moveWalker(id: RoomId, animate: boolean): void {
    const r = rooms.find((x) => x.id === id)!;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (animate) {
      walker.style.transition = "cx 0.7s ease, cy 0.7s ease";
    }
    walker.setAttribute("cx", String(cx));
    walker.setAttribute("cy", String(cy));
  }

  async function enter(id: RoomId, viaWalk: boolean): Promise<void> {
    room = id;
    lockNote = "";
    rejected = null;
    const t0 = performance.now();
    if (isMatrixRoom(room) && hourCompat(room, hour) === "conflict") {
      const next = fallbackRow(fallbackHour, room);
      lockNote = hourLockMessage(room, hour, next);
      rejected = hour;
      hour = next;
      pushLookupLog(
        formatLookupLine({
          tag: "客",
          grid: "hourByRoom",
          col: room,
          row: rejected,
          result: "conflict",
          fallback: next,
        }),
      );
    } else if (isMatrixRoom(room)) {
      pushLookupLog(
        formatLookupLine({
          tag: "客",
          grid: "hourByRoom",
          col: room,
          row: hour,
          result: hourCompat(room, hour),
        }),
      );
    }
    reportLookupMs(Math.max(0, Math.round(performance.now() - t0)));
    const r = rooms.find((x) => x.id === id)!;
    const h = hours.find((x) => x.id === hour)!;
    for (const g of roomsG.querySelectorAll(".plan-room")) {
      g.classList.toggle("is-on", g.getAttribute("data-room-id") === id);
    }
    paintHours();
    paintMatrix();
    paintSolveLine();
    moveWalker(id, viaWalk);
    roomEl.innerHTML = `
      <p class="lock-k">${lockNote ? "冲突改锁" : "当前锁定"}</p>
      <p class="lock-main">${h.name} · ${r.name}</p>
      <h3>${r.name}</h3>
      <p class="lock-b">${r.role}</p>
      <details class="lock-more" data-lock-more>
        <summary>怎么选</summary>
        <p class="walk-line">${r.walk}</p>
        <p class="sound-line">声景：${hourSounds[hour]} ${r.sound}</p>
      </details>
      ${lockNote ? `<p class="lock-warn">${lockNote}</p>` : ""}
      <details class="dialect-fold" data-dialect-fold>
        <summary class="dialect-k">本地称谓 · 建筑术语（出处已核）</summary>
        <div class="dialect">
          <span class="dialect-term">${r.dialect.term}</span>
          <span class="dialect-gloss">${r.dialect.gloss}</span>
          <p>${r.dialect.hint}</p>
        </div>
      </details>
    `;
    root.querySelector(".exhibit")?.setAttribute("data-hour", hour);
    renderCitations(citesEl, citationsForRoom(id), citationsForRoom(id)[0]?.id);
    if (view) {
      pathEl();
      view.setHour(hour);
      if (firstView) firstView = false;
      else view.setRoom(id);
    }
    pipe.sys.set({
      lock: `${h.name}·${r.name}`,
      state: lockNote ? t("sys.stateRewrite") : t("sys.stateOk"),
    });
    const toast = root.querySelector("[data-toast]") as HTMLElement | null;
    if (toast) {
      toast.hidden = !lockNote;
      toast.textContent = lockNote;
    }
    if (fromTalk) {
      showTalkToast(root, `对话写入展陈：${h.name} · ${r.name}`);
      fromTalk = false;
    } else {
      showTalkToast(root, "");
    }
    const note = viaWalk
      ? `脚步从上一处走到「${r.name}」，词条钉在房间上。`
      : `时辰锁为「${h.name}」，重写声景：${h.blurb}`;
    if (firstVisit) {
      firstVisit = false;
      guide.speak(lines.kejia);
    } else {
      guide.speak(lines.room(r.name, r.walk));
    }
    await pipe.run(note);
  }

  function step(dir: 1 | -1): void {
    if (walking) return;
    const i = walkOrder.indexOf(room);
    const n = (i + dir + walkOrder.length) % walkOrder.length;
    pickRoom = walkOrder[n];
    pickHour = hour;
    walking = true;
    void enter(walkOrder[n], true).finally(() => {
      walking = false;
    });
  }

  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-hall]")) {
      go("hall");
      return;
    }
    if (t.closest("[data-replay-rewrite]")) {
      paintSolveLine();
      return;
    }
    if (t.closest("[data-next]")) {
      step(1);
      return;
    }
    if (t.closest("[data-overview]")) {
      view?.setRoom("overview");
      return;
    }
    if (t.closest("[data-prev]")) {
      step(-1);
      return;
    }
    const tryBtn = t.closest("[data-try-a]") as HTMLElement | null;
    if (tryBtn?.dataset.tryA && tryBtn.dataset.tryB) {
      hour = tryBtn.dataset.tryB as HourId;
      pickHour = hour;
      pickRoom = tryBtn.dataset.tryA as RoomId;
      markTry("kejia", pickRoom, hour);
      walking = true;
      void enter(pickRoom, true).finally(() => {
        walking = false;
      });
      return;
    }
    const cell = t.closest("[data-mx-hour]") as HTMLElement | null;
    if (cell?.dataset.mxHour && cell.dataset.mxRoom) {
      hour = cell.dataset.mxHour as HourId;
      pickHour = hour;
      pickRoom = cell.dataset.mxRoom as RoomId;
      walking = true;
      void enter(pickRoom, true).finally(() => {
        walking = false;
      });
      return;
    }
    const hr = t.closest("button[data-hour]") as HTMLElement | null;
    if (hr?.dataset.hour) {
      hour = hr.dataset.hour as HourId;
      pickHour = hour;
      pickRoom = room;
      void enter(room, false);
      return;
    }
    const rg = t.closest("[data-room-id]") as SVGElement | null;
    if (rg?.getAttribute("data-room-id")) {
      const next = rg.getAttribute("data-room-id") as RoomId;
      pickRoom = next;
      pickHour = hour;
      walking = true;
      void enter(next, true).finally(() => {
        walking = false;
      });
    }
  });

  const roomCanvas = root.querySelector("canvas.room-view") as HTMLCanvasElement;
  const onResize = () => view?.resize();
  window.addEventListener("resize", onResize);
  void (async () => {
    try {
      await preloadGltfKit();
      view = new WeiwuScene(roomCanvas);
      view.setHour(hour);
      view.setRoom(room);
      firstView = false; // v29: initial pose already applied — next plan click must fly the camera
      onResize();
    } catch (err) {
      console.warn("kejia weiwu: WebGL unavailable", err);
      view = null;
    }
  })();
  void ambience.set("earth");
  paintHours();
  const hashRoom = location.hash.replace(/^#\/?kejia\/?/, "").split("?")[0] as RoomId;
  let start = rooms.some((r) => r.id === hashRoom) ? hashRoom : "menlou";
  if (/conflict/.test(location.hash)) {
    start = "heping";
    hour = "night";
  }
  pickRoom = start;
  pickHour = hour;
  void enter(start, false);
  if (/matrix/.test(location.hash)) {
    root.querySelector(".exhibit")?.classList.add("matrix-compact");
    window.setTimeout(() => {
      root.querySelector("[data-matrix],.matrix")?.scrollIntoView({ block: "nearest" });
    }, 120);
  }

  return () => {
    window.removeEventListener("resize", onResize);
    view?.dispose();
    pipe.dispose();
    ambience.stop();
    guide.stop();
  };
}
