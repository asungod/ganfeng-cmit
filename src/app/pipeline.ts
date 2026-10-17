import type { PipelineStage } from "../data/types";
import { mountSys, type SysHandle } from "./sysbar";

export type PipelineHandle = {
  root: HTMLElement;
  run: (note: string) => Promise<void>;
  setStage: (stage: PipelineStage, note?: string) => void;
  sys: SysHandle;
  dispose: () => void;
};

const labels: Record<PipelineStage, string> = {
  idle: "待约束",
  queued: "交互输入",
  stylize: "约束校验",
  cite: "程序材质",
  ready: "出处绑定",
};
const hints: Record<PipelineStage, string> = {
  idle: "",
  queued: "点选或对话意图",
  stylize: "冲突则改锁",
  cite: "釉面 / 夜阁 / 室内",
  ready: "引用条钉上",
};

export function mountPipeline(parent: HTMLElement, line = ""): PipelineHandle {
  const root = document.createElement("div");
  root.className = "pipeline";
  // Collapsed by default for visitors; open when body has is-demo-detail or hash demo flags.
  const openPipe = typeof document !== "undefined" && document.body.classList.contains("is-demo-detail");
  root.innerHTML = `
    <details class="pipeline-fold" data-pipeline-fold ${openPipe ? "open" : ""}>
      <summary class="pipeline-sum">
        <span class="pipeline-kicker">可见生成管线</span>
        <span class="pipeline-honest">本机演示时序 · 点开查看</span>
      </summary>
      <div class="pipeline-body">
        <ol class="pipeline-steps"></ol>
        <p class="pipeline-note">交互输入：点选或把问句写入约束，不发送到外部模型。</p>
      </div>
    </details>
  `;
  parent.appendChild(root);
  const ol = root.querySelector(".pipeline-steps") as HTMLOListElement;
  const noteEl = root.querySelector(".pipeline-note") as HTMLParagraphElement;
  const order: PipelineStage[] = ["queued", "stylize", "cite", "ready"];
  for (const s of order) {
    const li = document.createElement("li");
    li.dataset.stage = s;
    li.innerHTML = `<i></i><span><b>${labels[s]}</b><em>${hints[s]}</em></span>`;
    ol.appendChild(li);
  }
  const sys = mountSys(root);
  const body = root.querySelector(".pipeline-body");
  if (body) body.prepend(sys.root);
  else root.prepend(sys.root);
  if (line) sys.set({ line });

  let token = 0;

  function setStage(stage: PipelineStage, note?: string): void {
    root.dataset.stage = stage;
    for (const li of ol.querySelectorAll("li")) {
      const st = li.getAttribute("data-stage") as PipelineStage;
      li.classList.toggle("is-done", rank(st) < rank(stage) || stage === "ready");
      li.classList.toggle("is-now", st === stage && stage !== "ready");
      li.classList.toggle("is-ready", stage === "ready" && st === "ready");
    }
    if (note) noteEl.textContent = note;
  }

  function stamp(stage: PipelineStage, ms: number): void {
    const li = ol.querySelector(`[data-stage="${stage}"]`);
    const em = li?.querySelector("em");
    if (em) em.textContent = `${(ms / 1000).toFixed(1)}s`;
  }

  function resetStamps(): void {
    for (const s of order) {
      const li = ol.querySelector(`[data-stage="${s}"]`);
      const em = li?.querySelector("em");
      if (em) em.textContent = hints[s];
    }
  }

  async function run(note: string): Promise<void> {
    const my = ++token;
    resetStamps();
    setStage("queued", "交互输入：点选或把问句写入约束，不发送到外部模型。");
    // demo waits are the published times
    await wait(420);
    if (my !== token) return;
    stamp("queued", 420);
    setStage("stylize", `约束校验：${note}`);
    
    await wait(900);
    if (my !== token) return;
    stamp("stylize", 900);
    setStage("cite", "程序材质：按锁定结果重绘釉面 / 夜阁 / 室内，不是另写提示词。");
    
    await wait(560);
    if (my !== token) return;
    stamp("cite", 560);
    setStage("ready", "出处绑定：引用条钉在当前场景。无出处的句子不会进柜。");
  }

  setStage("idle", "选定器型、釉色、时代或意象、时辰后，管线才会走动。");
  return {
    root,
    run,
    setStage,
    sys,
    dispose() {
      token += 1;
      sys.dispose();
    },
  };
}

function rank(s: PipelineStage): number {
  return { idle: 0, queued: 1, stylize: 2, cite: 3, ready: 4 }[s];
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
