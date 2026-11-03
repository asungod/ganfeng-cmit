import { go } from "./router";
import { guide } from "./guide";
import { mountAsk } from "./labels";
import { mountSys } from "./sysbar";
import { guideQA, guideCitations } from "../data/guideQA";
import { archPanelHtml, bindArchProbe, fillThreshTable } from "./archPanel";
import { getLang, routeName, t } from "./i18n";
import { LobbyScene } from "../render/lobby";
const L = (zh: string, en: string): string => (getLang() === "en" ? en : zh);

/** Real ONNX quantized size under public/models (du -b). */
const BGE_ONNX_BYTES = 24010842;
const BGE_ONNX_LABEL = `${(BGE_ONNX_BYTES / (1024 * 1024)).toFixed(1)} MiB`;

export function mountHall(root: HTMLElement): () => void {
  const showArch = /[?&#]arch\b/.test(location.hash) || /[?&#]thresh\b/.test(location.hash) || /[?&#]calib\b/.test(location.hash);
  root.innerHTML = `
    <div class="hall${showArch ? " hall-arch" : ""}">
      <canvas class="hall-bg" aria-hidden="true"></canvas>
      <div class="hall-veil" aria-hidden="true"></div>
      <div class="grain" aria-hidden="true"></div>
      <div class="hall-frame" aria-hidden="true"></div>
      <div class="hall-frame hall-frame-inner" aria-hidden="true"></div>
      <header class="hall-top">
        <p class="eyebrow" data-no-tr>${L("全国大学生数字媒体科技作品及创意竞赛", "China Collegiate Computing Competition — Digital Media Track (CMIT)")}</p>
        <p class="eyebrow-sub" data-no-tr>${L("2026 指定命题 · 科技+创意，讲好中国故事", "2026 theme · Technology + Creativity: telling China's stories well")}</p>
      </header>
      <div class="hall-title">
        <h1 class="hall-brand" aria-label="赣风"><span>赣</span><span>风</span></h1>
        <p class="hall-sub">${L("可对话的数字展", "A Conversational Digital Exhibition")}</p>
        <ol class="hall-steps" data-no-tr>
          <li><b>${L("是什么", "What it is")}</b><span>${L("江西三条文化线的夜间数字展：景德镇瓷、滕王阁序、赣南围屋。", "A night exhibition of three Jiangxi threads: Jingdezhen porcelain, Wang Bo's Preface, and Hakka walled houses.")}</span></li>
          <li><b>${L("新在哪", "What's new")}</b><span>${L("自由组合时代、意象或时辰；不合史实的组合会被当场改锁，并展开规则与出处。", "Combine era, motif, or hour. Historically impossible picks are resolved on the spot—with the rule and source opened.")}</span></li>
          <li><b>${L("怎么试", "Try in 5 min")}</b><span>${L("进「瓷语」，选宋代 + 粉彩，看冲突如何改锁并说明理由。", "Open Porcelain Whispers → Song + famille rose → watch the conflict resolve with a cited reason.")}</span></li>
        </ol>
      </div>
      ${showArch ? archPanelHtml() : ""}
      <nav class="doors" aria-label="三条参观线" ${showArch ? 'hidden' : ''}>
        <button type="button" class="door" data-go="ciyu">
          <span class="door-head">
            <span class="door-index">01</span>
            <span class="door-en">${L("Jingdezhen", "Porcelain · Jingdezhen")}</span>
          </span>
          <span data-no-tr class="door-v" aria-label="${routeName("ciyu")}"><span>瓷</span><span>语</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">${L("选时代、器型与釉色，在约束下“烧”一只瓶。", "Choose era, shape, and glaze—then fire a vase within those rules.")}</span>
        </button>
        <button type="button" class="door" data-go="gexu">
          <span class="door-head">
            <span class="door-index">02</span>
            <span class="door-en">${L("Tengwang", "Tengwang Preface")}</span>
          </span>
          <span data-no-tr class="door-v" aria-label="${routeName("gexu")}" title="Tengwang Pavilion Preface"><span>阁</span><span>序</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">${L("点落霞、孤鹜、秋水，画面钉回王勃原句。", "Tap sunset clouds, the lone wild duck, autumn water; each view pins to Wang Bo's line.")}</span>
        </button>
        <button type="button" class="door" data-go="kejia">
          <span class="door-head">
            <span class="door-index">03</span>
            <span class="door-en">${L("Gannan", "Hakka Weiwu")}</span>
          </span>
          <span data-no-tr class="door-v" aria-label="${routeName("kejia")}" title="Hakka Walled Residences"><span>客</span><span>家</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">${L("按时辰走进围屋的每一个房间。", "Walk room by room through a weiwu (walled house), hour by hour.")}</span>
        </button>
        <button type="button" class="door door-demo" data-go="wanshou">
          <span class="door-head">
            <span class="door-index">04</span>
            <span class="door-en">${L("Wanshou", "Wanshou Palace · Demo")}</span>
          </span>
          <span data-no-tr class="door-v" aria-label="${routeName("wanshou")}"><span>万</span><span>寿</span><span>宫</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">${L("扩展线：庙会活动与时段约束。", "Extension: temple-fair activities under time-of-day rules.")}</span>
        </button>
      </nav>
      <div class="hall-ask" data-ask></div>
      <footer class="hall-foot">
        <p class="hall-foot-hint">${L("全部离线运行 · 无付费 API · 无需 GPU", "Fully offline · no paid API · no GPU")}</p>
        <div class="hall-foot-btns">
          <button type="button" class="text-btn" data-calib>${L("阈值标定", "Threshold calibration")}</button>
          <button type="button" class="text-btn" data-about>${L("关于本作品", "About this exhibit")}</button>
        </div>
      </footer>
      <dialog class="about" data-dialog>
        <div class="about-inner">
          <h2 data-no-tr>${L("约束可审计 · 出处可核对", "Auditable constraints · checkable sources")}</h2>
          <ul data-no-tr>
            <li><b>${L("核心交互", "Core interaction")}</b>${L(" — 冲突组合触发约束表规则；规则可展开审计；改锁在矩阵上回放（冲格 → 规则 → 改锁格）。点「宋 + 粉彩」即可复现。", " — Conflicting picks fire a table rule; you can open the rule, then watch the rewrite replay on the matrix (conflict cell → rule → resolved cell). Try Song + famille rose.")}</li>
            <li><b>${L("本机支撑", "On-device stack")}</b>${L("（非卖点）— BGE-small + table.ts 路由（ONNX q8 ", " (not the claim) — BGE-small + table.ts routing (ONNX q8 ")}${BGE_ONNX_LABEL}${L("）。讲解员只检索内容包。程序材质 · CPU/WASM · 无 GPU · 无付费 API。", "). Guide searches the content pack only. Procedural materials · CPU/WASM · no GPU · no paid API.")}</li>
            <li><b>${L("三条矩阵", "Three matrices")}</b>${L(" — 瓷语：点格改规则；阁序：意象钉回原句；客家：时辰×房间约束动线。LatheGeometry 实时生成（segs 160）。", " — Porcelain: edit cells. Preface: motifs pin to Wang Bo's lines. Hakka: hour × room walks. Live LatheGeometry (160 segs).")}</li>
            <li><b>${L("出处", "Sources")}</b>${L(" — 独立出处卡片。三线内容、矩阵、引用条与动线为原创。", " — Separate citation cards. Route content, matrices, citation strips, and walks are original.")}</li>
          </ul>
          <h3 class="about-credits-h">${L("素材致谢", "Asset credits")}</h3>
          <ul class="about-credits" data-credits></ul>
          <p class="about-audio" data-no-tr>${L("戏曲场面锣鼓（京剧戏台录音片段，CC-BY）· 非某部赣剧唱段 — beijing-opera-7 / beijing-opera-2 by xserra · Freesound · CC-BY 4.0 · 万寿宫戏台声景。", "Stage opera percussion (Beijing-opera theatre fragment, CC-BY) — not a 赣剧 aria — beijing-opera-7 / beijing-opera-2 by xserra · Freesound · CC-BY 4.0 · Wanshou stage bed.")}</p>
          <p class="about-lic" data-no-tr>${L("资料为示例，非馆方官方释文。代码许可见仓库说明。", "Sample materials, not official museum text. See the repository for licences.")}</p>
          <button type="button" class="text-btn" data-close data-no-tr>${L("关闭", "Close")}</button>
        </div>
      </dialog>
    </div>
  `;

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    const goBtn = t.closest("[data-go]") as HTMLElement | null;
    if (goBtn?.dataset.go === "ciyu" || goBtn?.dataset.go === "gexu" || goBtn?.dataset.go === "kejia" || goBtn?.dataset.go === "wanshou") {
      go(goBtn.dataset.go);
      return;
    }
    if (t.closest("[data-calib]")) {
      location.hash = "#/?calib";
      return;
    }
    if (t.closest("[data-about]")) {
      root.querySelector<HTMLDialogElement>("[data-dialog]")?.showModal();
      const ul = root.querySelector<HTMLElement>("[data-credits]");
      if (ul && !ul.childElementCount)
        void fetch("./assets3d/credits.json")
          .then((r) => r.json())
          .then((list: { name: string; type: string; authors: string[]; url: string }[]) => {
            ul.innerHTML = list
              .map((c) => `<li>${c.name} · ${c.type} · ${c.authors.join(", ")} · <a href="${c.url}" target="_blank" rel="noopener">Poly Haven</a> · CC0</li>`)
              .join("");
          })
          .catch(() => undefined);
    }
    if (t.closest("[data-close]")) {
      root.querySelector<HTMLDialogElement>("[data-dialog]")?.close();
    }
  };
  mountAsk(root.querySelector("[data-ask]") as HTMLElement, guideQA, guideCitations, "hall");
  const sys = mountSys(root.querySelector("[data-ask]") as HTMLElement);
  sys.set({ line: routeName("hall"), lock: t("sys.lockNone"), state: t("sys.stateOk") });
  root.addEventListener("click", onClick);
  let bg: LobbyScene | null = null;
  try {
    bg = new LobbyScene(root.querySelector("canvas.hall-bg") as HTMLCanvasElement);
  } catch (err) {
    console.warn("lobby bg: WebGL unavailable", err);
  }
  const onResize = () => bg?.resize();
  window.addEventListener("resize", onResize);
  // Lobby: no floating guide bubble over .hall-ask (welcome lives in tagline / innov).
  guide.stop();
  if (showArch) {
    bindArchProbe(root);
    void fillThreshTable(root);
  }
  return () => {
    root.removeEventListener("click", onClick);
    window.removeEventListener("resize", onResize);
    bg?.dispose();
    sys.dispose();
    guide.stop();
  };
}
