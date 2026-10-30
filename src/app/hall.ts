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
        <p class="eyebrow">全国大学生数字媒体科技作品及创意竞赛</p>
        <p class="eyebrow-sub">2026 指定命题 · 科技+创意，讲好中国故事</p>
      </header>
      <div class="hall-title">
        <h1 class="hall-brand" aria-label="赣风"><span>赣</span><span>风</span></h1>
        <p class="hall-sub">${L("可对话的数字展", "A Conversational Digital Exhibition")}</p>
        <ol class="hall-steps" data-no-tr>
          <li><b>${L("是什么", "What it is")}</b><span>${L("江西三条文化线的夜间数字展：景德镇瓷、滕王阁序、赣南围屋。", "A night exhibition on three Jiangxi cultural threads: Jingdezhen porcelain, Wang Bo's Tengwang Pavilion Preface, and Hakka walled houses of southern Jiangxi.")}</span></li>
          <li><b>${L("新在哪", "What's new")}</b><span>${L("自由组合时代、意象或时辰；不合史实的组合会被当场改锁，并展开规则与出处。", "Combine era, motif or hour freely. Combinations that break historical rules are rewritten in place—with the rule and its source opened for audit.")}</span></li>
          <li><b>${L("怎么试", "Try it in 5 min")}</b><span>${L("进「瓷语」，选宋代 + 粉彩，看冲突如何改锁并说明理由。", "Open Porcelain Whispers, choose Song + famille rose, and watch the conflict resolve with a cited reason.")}</span></li>
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
          <span class="door-desc">${L("选时代、器型与釉色，在约束下“烧”一只瓶。", "Choose era, vessel shape and glaze—then fire a vase under those rules.")}</span>
        </button>
        <button type="button" class="door" data-go="gexu">
          <span class="door-head">
            <span class="door-index">02</span>
            <span class="door-en">${L("Tengwang", "Tengwang Preface")}</span>
          </span>
          <span data-no-tr class="door-v" aria-label="Tengwang Preface / 阁序" title="Tengwang Pavilion Preface"><span>阁</span><span>序</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">${L("点落霞、孤鹜、秋水，画面钉回王勃原句。", "Tap sunset clouds, the lone duck, autumn water; each view pins back to Wang Bo's line.")}</span>
        </button>
        <button type="button" class="door" data-go="kejia">
          <span class="door-head">
            <span class="door-index">03</span>
            <span class="door-en">${L("Gannan", "Hakka Walled House")}</span>
          </span>
          <span data-no-tr class="door-v" aria-label="Hakka Weiwu / 客家" title="Hakka Walled Residences"><span>客</span><span>家</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">${L("按时辰走进围屋的每一个房间。", "Walk room by room through a Hakka walled house, hour by hour.")}</span>
        </button>
        <button type="button" class="door door-demo" data-go="wanshou">
          <span class="door-head">
            <span class="door-index">04</span>
            <span class="door-en">${L("Wanshou", "Wanshou Fair")}</span>
          </span>
          <span data-no-tr class="door-v" aria-label="${routeName("wanshou")}"><span>万</span><span>寿</span><span>宫</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">${L("扩展线：庙会活动与时段约束。", "Extension route: temple-fair activities constrained by time of day.")}</span>
        </button>
      </nav>
      <div class="hall-ask" data-ask></div>
      <footer class="hall-foot">
        <p class="hall-foot-hint">${L("全部离线运行 · 无付费 API · 无需 GPU", "Runs fully offline · no paid API · no GPU required")}</p>
        <div class="hall-foot-btns">
          <button type="button" class="text-btn" data-calib>${L("阈值标定", "Threshold calibration")}</button>
          <button type="button" class="text-btn" data-about>${L("关于本作品", "About this exhibit")}</button>
        </div>
      </footer>
      <dialog class="about" data-dialog>
        <div class="about-inner">
          <h2 data-no-tr>${L("约束可审计 · 出处可核对", "Auditable constraints · checkable sources")}</h2>
          <ul data-no-tr>
            <li><b>${L("核心交互", "Core interaction")}</b>${L("：冲突组合会触发约束表规则；规则可展开审计；改锁在矩阵上可回放（冲格× → 规则 → 改锁格）。点「宋 + 粉彩」即可复现；若把该格改为「合」，粉彩可留在宋。", ": a conflicting combination fires a constraint-table rule; the rule opens for audit; the rewrite replays on the matrix (conflict cell × → rule → resolved cell). Try Song + famille rose; set that cell to Compatible and famille rose can stay on Song.")}</li>
            <li>${L("工程支撑（非卖点）：本地 BGE-small 语义匹配 + table.ts 确定性路由（ONNX q8 ", "Supporting engineering (not the headline): local BGE-small matching + deterministic table.ts routing (ONNX q8 ")}${BGE_ONNX_LABEL}${L("）；三线共用同一查找接口。讲解员只检索内容包。程序材质 · CPU/WASM · 无 GPU、无付费 API。不上 Qwen-1.8B（仅作公开量级对照）。", "); one lookup for three routes. The guide searches only the content pack. Procedural materials · CPU/WASM · no GPU, no paid API. No Qwen-1.8B (public size comparison only).")}</li>
            <li>${L("瓷语：点格可改规则；阁序：意象钉回原句；客家：时辰×空间约束动线。LatheGeometry 实时生成（segs 160），支持瞬时/慢放。", "Porcelain: edit rules by clicking cells. Preface: motifs pin back to the original line. Hakka: an hour × room matrix constrains the walk. LatheGeometry generated live (160 segments), instant or slow-motion.")}</li>
            <li>${L("独立出处卡片，含引用标记。三线内容、约束矩阵、引用条与动线为原创。", "Separate source cards with citation marks. Route content, matrices, citation strips and walk paths are original.")}</li>
          </ul>
          <h3 class="about-credits-h">${L("素材致谢（CC0）", "Asset credits (CC0)")}</h3>
          <ul class="about-credits" data-credits></ul>
          <p class="about-lic" data-no-tr>${L("资料为示例，非馆方官方。代码许可见仓库说明。", "Materials are examples, not official museum text. See the repository for code licences.")}</p>
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
