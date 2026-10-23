// EN mode: translate rendered exhibit content in place (text nodes + placeholder/title/aria-label).
// Source excerpts and classical lines keep the Chinese original and get an appended
// "EN translation (ours)" line, so judges can compare. Decorative single characters stay Chinese.
import { HAN, SRC, tr } from "./contentEn";

const ATTRS = ["placeholder", "title", "aria-label"];
let obs: MutationObserver | null = null;
let busy = false;

function srcKey(t: string): string | null {
  const k = t.replace(/\s+/g, " ").trim();
  if (SRC[k]) return k;
  const q = k.replace(/^「|」$/g, "");
  if (SRC[q]) return q;
  // Quoted *part* of a source excerpt (answer cards quote shortened excerpts with ……).
  const segs = q.split(/……|…/).map((x) => x.trim()).filter((x) => x.length >= 6);
  if (!segs.length || q.length < 12) return null;
  for (const key of Object.keys(SRC)) if (segs.every((s) => key.includes(s))) return "~" + key;
  return null;
}

function doText(n: Text): void {
  const raw = n.nodeValue ?? "";
  const t = raw.trim();
  if (!t || !HAN.test(t)) return;
  const p = n.parentElement;
  if (!p || p.closest("script,style,.en-tr,[data-no-tr]")) return;
  const sk = srcKey(t);
  if (sk) {
    const next = n.nextSibling as HTMLElement | null;
    if (next && next.nodeType === 1 && next.classList?.contains("en-tr")) return;
    const span = document.createElement("span");
    span.className = "en-tr";
    span.lang = "en";
    const tag = document.createElement("small");
    tag.className = "en-tr-tag";
    tag.textContent = sk.startsWith("~") ? "Gloss · full excerpt, our translation" : "Gloss · our translation";
    span.append(tag, document.createTextNode(sk.startsWith("~") ? SRC[sk.slice(1)] : SRC[sk]));
    n.after(span);
    return;
  }
  const r = tr(t);
  if (r && r !== t) n.nodeValue = raw.replace(t, r);
}

function doEl(el: Element): void {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && HAN.test(v)) {
      const r = tr(v);
      if (r) el.setAttribute(a, r);
    }
  }
}

export function translateTree(root: Node): void {
  if (root.nodeType === 3) return doText(root as Text);
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  const base = root as Element;
  if (base.nodeType === 1) doEl(base);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null;
  const texts: Text[] = [];
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) texts.push(n as Text);
    else doEl(n as Element);
  }
  texts.forEach(doText);
}

export function startEnContent(): void {
  document.documentElement.lang = "en";
  translateTree(document.body);
  if (obs) return;
  obs = new MutationObserver((muts) => {
    if (busy) return;
    busy = true;
    try {
      for (const m of muts) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doEl(m.target as Element);
        else m.addedNodes.forEach((x) => translateTree(x));
      }
    } finally {
      busy = false;
    }
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
