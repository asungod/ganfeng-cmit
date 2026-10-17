/** Visitor-default declutter: judge/demo overlays stay behind a toggle. */

const KEY = "gf-demo-detail";

export function wantsDemoDetail(): boolean {
  if (typeof location !== "undefined") {
    const h = location.hash;
    if (/[?&#](build|arch|askpipe|audit|demo|log)\b/.test(h)) return true;
  }
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoDetail(on: boolean): void {
  try {
    sessionStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  document.body.classList.toggle("is-demo-detail", on);
  for (const el of document.querySelectorAll(".exhibit")) {
    el.classList.toggle("is-demo-detail", on);
  }
  for (const btn of document.querySelectorAll("[data-demo-detail]")) {
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const label = on ? "演示细节 · 开" : "演示细节";
    if (btn instanceof HTMLElement) btn.textContent = label;
  }
  for (const fold of document.querySelectorAll<HTMLDetailsElement>("[data-pipeline-fold]")) {
    fold.open = on;
  }
}

/** Bind a「演示细节」chip on an exhibit root; returns whether detail mode is on. */
export function bindDemoDetailToggle(root: HTMLElement): boolean {
  const exhibit = root.querySelector(".exhibit") as HTMLElement | null;
  const on = wantsDemoDetail();
  document.body.classList.toggle("is-demo-detail", on);
  exhibit?.classList.toggle("is-demo-detail", on);
  const btn = root.querySelector("[data-demo-detail]") as HTMLButtonElement | null;
  if (btn) {
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "演示细节 · 开" : "演示细节";
  }
  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest("[data-demo-detail]")) return;
    setDemoDetail(!document.body.classList.contains("is-demo-detail"));
  });
  return on;
}
