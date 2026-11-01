/** 馆方讲解：浏览器 SpeechSynthesis，无云端、无 Key。默认开启；顶栏可关。未手势时先入队，afterUserGesture 补播。 */

export class Guide {
  enabled = true;
  private voice: SpeechSynthesisVoice | null = null;
  private lineEl: HTMLElement | null = null;
  /** Text waiting for a user gesture when autoplay policy blocks speak(). */
  private queued: string | null = null;
  private gestureReady = false;

  attachLine(el: HTMLElement): void {
    this.lineEl = el;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.hardCancel();
      this.queued = null;
      if (this.lineEl) this.lineEl.textContent = "";
    } else {
      this.warm();
      const t = this.lineEl?.textContent?.trim();
      if (t) this.speak(t);
    }
    return this.enabled;
  }

  stop(): void {
    this.hardCancel();
    this.queued = null;
    if (this.lineEl) this.lineEl.textContent = "";
  }

  speak(text: string): void {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    // Visitor default: no floating bubble over the 3D stage unless 讲解 is on.
    if (!this.enabled) {
      if (this.lineEl) this.lineEl.textContent = "";
      this.queued = null;
      return;
    }
    if (this.lineEl) this.lineEl.textContent = clean;
    this.queued = clean;
    if (!this.gestureReady) return;
    this.speakNow(clean);
  }

  /** Call after a user gesture so autoplay-blocked SpeechSynthesis can start / flush queue. */
  afterUserGesture(): void {
    this.gestureReady = true;
    this.warm();
    if (!this.enabled || !this.queued) return;
    const synth = window.speechSynthesis;
    // Already playing / queued in the engine — don't hardCancel-restart on every click.
    if (synth && (synth.speaking || synth.pending)) return;
    this.speakNow(this.queued);
  }

  private speakNow(clean: string): void {
    const synth = window.speechSynthesis;
    if (!synth) return;
    this.hardCancel();
    this.warm();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "zh-CN";
    u.rate = 0.92;
    u.pitch = 1;
    u.volume = 1;
    if (this.voice) u.voice = this.voice;
    u.onstart = () => {
      if (this.queued === clean) this.queued = null;
    };
    synth.speak(u);
  }

  /** Chromium/WebKit often keep speaking after a single cancel; pause+double-cancel clears the queue. */
  private hardCancel(): void {
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
    try {
      if (synth.speaking || synth.pending) {
        synth.pause();
        synth.cancel();
      }
    } catch {
      /* ignore */
    }
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  }

  private warm(): void {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const pick = () => {
      const list = synth.getVoices();
      this.voice =
        list.find((v) => /zh-CN|zh_CN/.test(v.lang) && /female|Xiaoxiao|Xiaoyi|Tingting|Huihui|Yaoyao|Chinese/.test(v.name)) ??
        list.find((v) => v.lang.startsWith("zh")) ??
        null;
    };
    pick();
    synth.onvoiceschanged = pick;
  }
}

export const guide = new Guide();

export const lines = {
  hall: "欢迎来到赣风。三条线：瓷语（景德镇器型与釉色的时代约束）、阁序（《滕王阁序》原句钉在夜阁上）、客家（可走进的赣南围屋）。讲解默认开启，可在顶栏关闭。建议顺序：阁序 → 瓷语 → 客家。每一步出处均可在审计面板展开。",
  ciyu: "瓷语展柜。先锁定时代，再选器型与釉色。冲突不会生成「好看的错」，而会改锁并说明理由。眼前是程序复原的梅瓶，不是馆藏原件。",
  lock: (era: string, shape: string, glaze: string, note: string) =>
    note
      ? `风格改锁。${note} 当前展出：${era}，${shape}，${glaze}。`
      : `当前锁定：${era}，${shape}，${glaze}。请看展签与引用条。`,
  cite: (title: string, body: string) => `引用。${title}。${body.slice(0, 80)}`,
  gexu: "阁序。点落霞、孤鹜、秋水，画面钉回王勃原句——不是另写提示词出图。",
  verse: (name: string, verse: string) => `${name}。${verse}`,
  kejia: "客家围屋。时辰与房间互相约束：暮时祖堂合，夜里角楼合。可点矩阵，或用问句写入时辰与房间。",
  room: (name: string, line: string) => `${name}。${line}`,
};
