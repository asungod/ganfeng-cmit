import { agent, type AgentStatus } from "./agent";
import { t } from "./i18n";

export type SysBits = {
  line: string;
  lock: string;
  retrieve: string;
  compute: string;
  state: string;
};

export type SysHandle = {
  root: HTMLElement;
  set: (bits: Partial<SysBits>) => void;
  dispose: () => void;
};

function retrieveOf(s: AgentStatus): string {
  if (s === "ready") return "BGE q8";
  if (s === "fallback") return t("sys.retrieve.lex");
  if (s === "loading") return t("sys.retrieve.loading");
  return t("sys.retrieve.idle");
}

export function mountSys(parent: HTMLElement): SysHandle {
  const root = document.createElement("div");
  root.className = "sysbar";
  root.innerHTML = `
    <span data-sys-line></span>
    <span data-sys-lock></span>
    <span data-sys-retrieve></span>
    <span class="bge-chip" data-sys-bge>BGE · idle</span>
    <span data-sys-compute></span>
    <span data-sys-state></span>
    <span data-sys-slot hidden></span>
    <span class="cpu-meter" data-cpu-meter title="16–40ms">—</span>
    <span class="sys-slot-cap" data-sys-slot-cap hidden></span>
  `;
  parent.appendChild(root);
  const lineEl = root.querySelector("[data-sys-line]") as HTMLElement;
  const lockEl = root.querySelector("[data-sys-lock]") as HTMLElement;
  const retrieveEl = root.querySelector("[data-sys-retrieve]") as HTMLElement;
  const computeEl = root.querySelector("[data-sys-compute]") as HTMLElement;
  const stateEl = root.querySelector("[data-sys-state]") as HTMLElement;

  const bits: SysBits = {
    line: "",
    lock: "—",
    retrieve: retrieveOf(agent.status),
    compute: t("sys.compute"),
    state: t("sys.stateOk"),
  };

  function paint(): void {
    lineEl.textContent = bits.line ? `[${bits.line}]` : "";
    lockEl.textContent = `[${bits.lock}]`;
    retrieveEl.textContent = `[${t("sys.retrievePrefix")}:${bits.retrieve}]`;
    computeEl.textContent = `[${t("sys.computePrefix")}:${bits.compute}]`;
    stateEl.textContent = `[${t("sys.statePrefix")}:${bits.state}]`;
    stateEl.classList.toggle("is-rewrite", bits.state === t("sys.stateRewrite") || bits.state === "已改锁");
  }

  function set(next: Partial<SysBits>): void {
    Object.assign(bits, next);
    paint();
  }

  const bgeEl = root.querySelector("[data-sys-bge]") as HTMLElement;
  const unsub = agent.onStatus((s) => {
    set({ retrieve: retrieveOf(s) });
    const load = agent.loadMs > 0 ? ` · ${agent.loadMs}ms` : "";
    bgeEl.textContent = `BGE · ${s === "idle" ? "idle" : s}${s === "ready" || s === "fallback" ? load : ""}`;
    bgeEl.dataset.state = s;
  });
  const meter = root.querySelector("[data-cpu-meter]") as HTMLElement;
  let lastT = performance.now();
  let lastPaint = 0;
  let frameMs = 16;
  let raf = 0;
  const tick = (now: number): void => {
    frameMs = now - lastT;
    lastT = now;
    if (now - lastPaint >= 500) {
      lastPaint = now;
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      const heap = mem ? ` · heap ${Math.round(mem.usedJSHeapSize / 1048576)}MB` : "";
      meter.textContent = `${t("sys.frame")} ${Math.round(frameMs)}ms${heap}`;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  paint();
  return {
    root,
    set,
    dispose() {
      cancelAnimationFrame(raf);
      unsub();
    },
  };
}
