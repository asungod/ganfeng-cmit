import { t } from "./i18n";
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
    if (btn instanceof HTMLElement) btn.textContent = on ? t("demo.on") : t("demo.off");
  }
  for (const fold of document.querySelectorAll<HTMLDetailsElement>("[data-pipeline-fold]")) {
    fold.open = on;
  }
  for (const fold of document.querySelectorAll<HTMLDetailsElement>("[data-matrix-fold]")) {
    fold.open = on;
  }
  for (const judge of document.querySelectorAll<HTMLDetailsElement>("[data-ask-judge]")) {
    judge.open = on;
  }
  for (const hint of document.querySelectorAll<HTMLDetailsElement>("[data-wall-hint]")) {
    hint.open = on;
  }
  for (const more of document.querySelectorAll<HTMLDetailsElement>("[data-lock-more]")) {
    more.open = on;
  }
  for (const dia of document.querySelectorAll<HTMLDetailsElement>("[data-dialect-fold]")) {
    dia.open = on;
  }
}

/** Bind a「演示细节」chip on an exhibit root; returns whether detail mode is on. */
export function bindDemoDetailToggle(root: HTMLElement): boolean {
  const on = wantsDemoDetail();
  setDemoDetail(on);
  root.addEventListener("click", (e) => {
    const el = e.target as HTMLElement;
    if (!el.closest("[data-demo-detail]")) return;
    setDemoDetail(!document.body.classList.contains("is-demo-detail"));
  });
  return on;
}
