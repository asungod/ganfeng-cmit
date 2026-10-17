import { go } from "./router";
import { guide } from "./guide";
import { mountAsk } from "./labels";
import { mountSys } from "./sysbar";
import { guideQA, guideCitations } from "../data/guideQA";
import { archPanelHtml, bindArchProbe, fillThreshTable } from "./archPanel";
import { routeName, t } from "./i18n";

/** Real ONNX quantized size under public/models (du -b). */
const BGE_ONNX_BYTES = 24010842;
const BGE_ONNX_LABEL = `${(BGE_ONNX_BYTES / (1024 * 1024)).toFixed(1)} MiB`;

export function mountHall(root: HTMLElement): () => void {
  const showArch = /[?&#]arch\b/.test(location.hash) || /[?&#]thresh\b/.test(location.hash) || /[?&#]calib\b/.test(location.hash);
  root.innerHTML = `
    <div class="hall${showArch ? " hall-arch" : ""}">
      <div class="grain" aria-hidden="true"></div>
      <div class="hall-frame" aria-hidden="true"></div>
      <div class="hall-frame hall-frame-inner" aria-hidden="true"></div>
      <header class="hall-top">
        <p class="eyebrow">全国大学生数字媒体科技作品及创意竞赛</p>
        <p class="eyebrow-sub">2026 指定命题 · 科技+创意，讲好中国故事</p>
      </header>
      <div class="hall-title">
        <h1 class="hall-brand" aria-label="赣风"><span>赣</span><span>风</span></h1>
        <p class="hall-sub">可对话的数字展</p>
        <p class="hall-tagline">点门进入展线 · 约束可审计 · 本地检索</p>
        <details class="hall-innov">
          <summary>创新要点</summary>
          <p class="hall-lede">
            冲突组合触发约束表规则，规则可展开审计，改锁过程在矩阵上可追溯回放（冲格×→规则条目→改锁格）。
          </p>
          <p class="hall-lede-sub">
            工程支撑：本地 BGE-small + table.ts 确定性路由；三线共用同一查找接口是实现，不是卖点。
          </p>
        </details>
      </div>
      ${showArch ? archPanelHtml() : ""}
      <nav class="doors" aria-label="三条参观线" ${showArch ? 'hidden' : ''}>
        <button type="button" class="door" data-go="ciyu">
          <span class="door-head">
            <span class="door-index">01</span>
            <span class="door-en">Jingdezhen</span>
          </span>
          <span class="door-v" aria-label="${routeName("ciyu")}"><span>瓷</span><span>语</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">先锁时代，再选器型与釉色；冲突改锁并写理由。</span>
        </button>
        <button type="button" class="door" data-go="gexu">
          <span class="door-head">
            <span class="door-index">02</span>
            <span class="door-en">Tengwang</span>
          </span>
          <span class="door-v" aria-label="Tengwang Preface / 阁序" title="Tengwang Pavilion Preface"><span>阁</span><span>序</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">点落霞、孤鹜、秋水；画面钉回王勃原句。</span>
        </button>
        <button type="button" class="door" data-go="kejia">
          <span class="door-head">
            <span class="door-index">03</span>
            <span class="door-en">Gannan</span>
          </span>
          <span class="door-v" aria-label="Hakka Weiwu / 客家" title="Hakka Walled Residences"><span>客</span><span>家</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">时辰 × 空间矩阵驱动围屋动线。</span>
        </button>
        <button type="button" class="door door-demo" data-go="wanshou">
          <span class="door-head">
            <span class="door-index">04</span>
            <span class="door-en">Wanshou</span>
          </span>
          <span class="door-v" aria-label="Wanshou Palace / 万寿宫"><span>万</span><span>寿</span></span>
          <span class="door-rule" aria-hidden="true"></span>
          <span class="door-desc">扩展线：庙会活动 × 时段约束。</span>
        </button>
      </nav>
      <div class="hall-ask" data-ask></div>
      <footer class="hall-foot">
        <p class="hall-foot-hint">本地检索 · 无付费 API · 无 GPU</p>
        <div class="hall-foot-btns">
          <button type="button" class="chip" data-calib>阈值标定</button>
          <button type="button" class="text-btn" data-about>开源边界</button>
        </div>
      </footer>
      <dialog class="about" data-dialog>
        <div class="about-inner">
          <h2>智能交互在约束与出处上</h2>
          <ul>
            <li><b>交互创新</b>：冲突组合触发约束表规则，规则本身可展开审计，改锁过程在矩阵上可追溯回放（冲格×→规则条目→改锁格）。点宋 + 粉彩即可复现；格子改成「合」后粉彩可以留在宋。</li>
            <li>工程支撑（非卖点）：本地 BGE-small 语义匹配 + table.ts 确定性路由（ONNX q8 ${BGE_ONNX_LABEL}）；三线共用同一查找接口是实现。via bge-slot / lex-slot；讲解员只在内容包检索。程序材质 · CPU/WASM · 无 GPU 无付费 API。不上 Qwen-1.8B（公开量级对照）。</li>
            <li>瓷语矩阵点格子可改规则；阁序意象矩阵钉回原句；客家时辰×空间矩阵约束动线。LatheGeometry 实时生成（segs 160），支持瞬时/慢放。</li>
            <li>独立出处卡片，含引用标记。三条线内容、约束矩阵、引用条与动线为原创。</li>
          </ul>
          <p class="about-lic">资料为示例，非馆方官方。代码许可见仓库说明。</p>
          <button type="button" class="text-btn" data-close>关闭</button>
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
    }
    if (t.closest("[data-close]")) {
      root.querySelector<HTMLDialogElement>("[data-dialog]")?.close();
    }
  };
  mountAsk(root.querySelector("[data-ask]") as HTMLElement, guideQA, guideCitations, "hall");
  const sys = mountSys(root.querySelector("[data-ask]") as HTMLElement);
  sys.set({ line: routeName("hall"), lock: t("sys.lockNone"), state: t("sys.stateOk") });
  root.addEventListener("click", onClick);
  // Lobby: no floating guide bubble over .hall-ask (welcome lives in tagline / innov).
  guide.stop();
  if (showArch) {
    bindArchProbe(root);
    void fillThreshTable(root);
  }
  return () => {
    root.removeEventListener("click", onClick);
    sys.dispose();
    guide.stop();
  };
}
