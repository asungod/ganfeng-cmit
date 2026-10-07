/** 馆方讲解：浏览器 SpeechSynthesis，无云端、无 Key。默认关闭，避免未手势被拦。 */

export class Guide {
  enabled = false;
  private voice: SpeechSynthesisVoice | null = null;
  private lineEl: HTMLElement | null = null;

  attachLine(el: HTMLElement): void {
    this.lineEl = el;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      window.speechSynthesis?.cancel();
    } else {
      this.warm();
      const t = this.lineEl?.textContent?.trim();
      if (t) this.speak(t);
    }
    return this.enabled;
  }

  stop(): void {
    window.speechSynthesis?.cancel();
    if (this.lineEl) this.lineEl.textContent = "";
  }

  speak(text: string): void {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    if (this.lineEl) this.lineEl.textContent = clean;
    if (!this.enabled) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    this.warm();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "zh-CN";
    u.rate = 0.92;
    u.pitch = 1;
    u.volume = 1;
    if (this.voice) u.voice = this.voice;
    synth.speak(u);
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
  hall: "欢迎来到赣风数字展。三条线：瓷语看景德镇器型与釉色如何互相约束；阁序把滕王阁序的句子钉在画面上；客家围屋可以走进去。请打开讲解，再选一条门。赣鄱千年的建议顺序：先读唐代王勃的滕王阁序；再看景德镇从北宋青白瓷、元代成熟青花到清代粉彩的年代约束；最后走进清嘉庆至道光年间建成的龙南关西新围那样的赣南围屋。每一步的出处都能在审计面板里展开。",
  ciyu: "瓷语展柜。先锁定时代约束，再选器型和釉色。冲突不会生成好看的错，而会改锁并说明理由。眼前是程序复原的梅瓶，不是馆藏原件。",
  lock: (era: string, shape: string, glaze: string, note: string) =>
    note
      ? `风格改锁。${note} 当前展出：${era}，${shape}，${glaze}。`
      : `当前锁定：${era}，${shape}，${glaze}。请看展签与引用条。`,
  cite: (title: string, body: string) => `引用。${title}。${body.slice(0, 80)}`,
  gexu: "阁序。点落霞、孤鹜、秋水，画面与王勃原句绑在一起，不是另写提示词出图。",
  verse: (name: string, verse: string) => `${name}。${verse}`,
  kejia: "客家围屋。时辰与房间互相约束：暮时祖堂合，夜里角楼合。点矩阵或把问句写入时辰、房间。",
  room: (name: string, line: string) => `${name}。${line}`,
};
