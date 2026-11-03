type Kind = "museum" | "river" | "earth" | "opera" | "off";

const MASTER_GAIN = 0.07;
/** Relative gain for decoded opera loops into master (procedural beds use ~0.25–0.4). */
const OPERA_GAIN = 0.55;
const OPERA_URL = "./audio/opera/stage-luogu.mp3";

/** v56: 切换/停止时的极短淡出（ms），避免波形硬切产生咔哒声。 */
const FADE_MS = 45;
/** v56: 淡出结束后再停节点，留一点余量让 ramp 真正走完。 */
const CLEAR_DELAY_MS = 60;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private kind: Kind = "off";
  private operaBuf: AudioBuffer | null = null;
  private operaLoad: Promise<AudioBuffer> | null = null;
  /**
   * v56: 状态代际。每次 set / stop / toggleMute / 页面隐藏都自增；
   * 所有 await 之后只要代际不符，旧任务就必须放弃，不能再建节点或拉增益。
   */
  private gen = 0;
  /** v56: 因页面隐藏或 iOS 手势限制而“欠一次恢复”，等可见/下一次手势再兑现。 */
  private pendingResume = false;
  muted = false;

  constructor() {
    // v56: 在类内部注册，不依赖 main.ts；页面隐藏/回前台时自行挂起与恢复。
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibility);
    }
    // v56: iOS/Safari 从后台回来后，resume 仍可能需要一次手势；这里兜底重试。
    if (typeof window !== "undefined") {
      const opts = { capture: true } as const;
      window.addEventListener("pointerdown", this.onUserGesture, opts);
      window.addEventListener("keydown", this.onUserGesture, opts);
      window.addEventListener("touchstart", this.onUserGesture, opts);
    }
  }

  async unlock(): Promise<void> {
    if (!this.ctx) this.ctx = new AudioContext();
    const ctx = this.ctx;
    // v56: Safari 可能是 "interrupted" 而不是 "suspended"，统一用 !== "running" 判断；
    // 只在页面可见且未静音时恢复，避免后台/静音状态下被 set 顺手拉响。
    if (ctx.state !== "running" && !this.muted && document.visibilityState !== "hidden") {
      try {
        await ctx.resume();
      } catch {
        /* v56: iOS 非手势路径可能拒绝 resume，留给 pendingResume + 下一次手势 */
      }
    }
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(ctx.destination);
    }
    if (ctx.state !== "running" && !this.muted && this.kind !== "off") this.pendingResume = true;
  }

  async set(kind: Kind): Promise<void> {
    // v56: 进入新代际；任何在途的旧 set / playOpera 都会在下一个 await 后失效。
    const g = ++this.gen;
    this.kind = kind;
    const switching = this.nodes.length > 0 && this.master !== null;
    if (switching) {
      // v56: 切景前先 45ms 淡出旧声景，再清节点，避免硬切咔哒。
      this.fadeMaster(0, FADE_MS);
      await delay(FADE_MS);
      if (g !== this.gen || this.muted || kind !== this.kind) return;
    }
    this.clear();
    if (this.muted || kind === "off") {
      // Keep silence reliable even if a hall calls set() while muted.
      this.setMasterNow(0);
      // v56: 静音时挂起上下文；恢复统一走 unlock()（可见 + 未静音才 resume）。
      if (this.muted && this.ctx?.state === "running") void this.ctx.suspend().catch(() => {});
      return;
    }
    await this.unlock();
    // v56: unlock 内可能 await resume；期间被静音/切景/stop 则本次 set 直接作废。
    if (g !== this.gen || this.muted || kind !== this.kind) return;
    const ctx = this.ctx!;
    const master = this.master!;
    this.setMasterNow(MASTER_GAIN);
    if (kind === "museum") {
      this.hum(ctx, master, 92, 0.4);
    } else if (kind === "river") {
      this.noise(ctx, master, 900, 0.35);
      this.hum(ctx, master, 64, 0.25);
    } else if (kind === "earth") {
      this.noise(ctx, master, 400, 0.28);
      this.hum(ctx, master, 48, 0.3);
    } else if (kind === "opera") {
      await this.playOpera(ctx, master, g);
    }
  }

  async toggleMute(): Promise<boolean> {
    // v56: 先推进代际，让静音前挂起的 set 在 await 后自行放弃，杜绝“静音了还在响”。
    const g = ++this.gen;
    this.muted = !this.muted;
    this.pendingResume = false;
    if (this.muted) {
      if (this.nodes.length > 0 && this.master) {
        // v56: 短淡出后再停节点，静音时不产生咔哒。
        this.fadeMaster(0, FADE_MS);
        await delay(FADE_MS);
        // 期间若被再次切换（快速连点/切景），最终状态交给更新的代际。
        if (g !== this.gen) return this.muted;
      }
      this.clear();
      this.setMasterNow(0);
      if (this.ctx?.state === "running") void this.ctx.suspend().catch(() => {});
    } else {
      // v56: set() 会按可见性/静音态决定是否真正恢复当前声景。
      await this.set(this.kind);
    }
    return this.muted;
  }

  /** Call once after a user gesture so autoplay-blocked AudioContext can start. */
  async afterUserGesture(): Promise<void> {
    await this.unlock();
    // v56: 手势恢复后重建当前声景；后台时留给 visibilitychange 再恢复。
    // 不清 pendingResume：若 unlock 在 iOS 上仍被拒，标记要留给下一次手势。
    if (!this.muted && this.kind !== "off" && document.visibilityState !== "hidden") {
      await this.set(this.kind);
    }
  }

  stop(): void {
    // v56: 作废在途的 set，并短淡出后再清节点，避免离开展厅/切路由时的咔哒。
    const g = ++this.gen;
    this.kind = "off";
    this.pendingResume = false;
    if (this.nodes.length > 0 && this.master) {
      this.fadeMaster(0, FADE_MS);
      window.setTimeout(() => {
        // v56: 期间已有新的 set/stop 则交给新代际，别把新声景清掉。
        if (g !== this.gen) return;
        this.clear();
        this.setMasterNow(0);
      }, CLEAR_DELAY_MS);
    } else {
      this.clear();
      this.setMasterNow(0);
    }
    // v56: 这里只做 ramp、不 suspend：iOS 上非手势 resume 可能失败，
    // 保持 running 便于下一次 set 直接出声；后台省电统一由 visibilitychange 处理。
  }

  /** v56: 页面隐藏时挂起，可见且未静音时 resume 并重建当前声景（lobby 为 off，无需恢复）。 */
  private readonly onVisibility = (): void => {
    const ctx = this.ctx;
    if (!ctx) return;
    if (document.visibilityState === "hidden") {
      // v56: 让隐藏前挂起的 set 失效，防止回前台前偷偷建节点。
      this.gen++;
      this.pendingResume = !this.muted && this.kind !== "off";
      if (ctx.state === "running") void ctx.suspend().catch(() => {});
      return;
    }
    if (!this.muted && this.kind !== "off") void this.revive();
  };

  /** v56: iOS 从后台返回时若 resume 仍被拒，保留待恢复标记，等下一次手势。 */
  private readonly onUserGesture = (): void => {
    if (!this.pendingResume || this.muted || this.kind === "off") return;
    this.pendingResume = false; // revive 失败会重新置位
    void this.revive();
  };

  /** v56: 统一判断“此刻允许出声”，放在方法内读取，避免 await 前后的类型收窄干扰。 */
  private canSound(): boolean {
    return !this.muted && this.kind !== "off" && document.visibilityState !== "hidden";
  }

  private async revive(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.canSound()) return;
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        /* v56: iOS 非手势 resume 可能被拒 */
      }
    }
    // v56: await 之后重新校验，期间可能被静音/stop/再次隐藏。
    if (!this.canSound()) return;
    if (ctx.state !== "running") {
      this.pendingResume = true;
      return;
    }
    this.pendingResume = false;
    await this.set(this.kind);
  }

  /** Stop oscillators / BufferSources, then disconnect. disconnect alone leaves them running. */
  private clear(): void {
    for (const n of this.nodes) {
      try {
        const maybe = n as AudioScheduledSourceNode;
        if (typeof maybe.stop === "function") {
          try {
            maybe.stop();
          } catch {
            /* already stopped */
          }
        }
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.nodes = [];
  }

  /** v56: master 从当前值线性过渡到 to，避免硬切产生咔哒。 */
  private fadeMaster(to: number, ms: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const p = master.gain;
    try {
      // 优先按住当前值再开始 ramp；老 Safari 缺失时退回 cancel + setValueAtTime。
      p.cancelAndHoldAtTime(now);
    } catch {
      try {
        const v = p.value;
        p.cancelScheduledValues(now);
        p.setValueAtTime(v, now);
      } catch {
        p.value = to;
        return;
      }
    }
    try {
      p.linearRampToValueAtTime(to, now + ms / 1000);
    } catch {
      p.value = to;
    }
  }

  /** v56: 立即把 master 设到目标值，并清掉可能残留的 ramp。 */
  private setMasterNow(value: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    try {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(value, now);
    } catch {
      master.gain.value = value;
    }
  }

  private hum(ctx: AudioContext, dest: GainNode, freq: number, gain: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(dest);
    osc.start();
    this.nodes.push(osc, g);
  }

  private noise(ctx: AudioContext, dest: GainNode, freq: number, gain: number): void {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start();
    this.nodes.push(src, filter, g);
  }

  private async loadOpera(ctx: AudioContext): Promise<AudioBuffer> {
    if (this.operaBuf) return this.operaBuf;
    if (!this.operaLoad) {
      this.operaLoad = (async () => {
        const res = await fetch(OPERA_URL);
        if (!res.ok) throw new Error(`opera audio HTTP ${res.status}`);
        const raw = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(raw.slice(0));
        this.operaBuf = buf;
        return buf;
      })().catch((err) => {
        this.operaLoad = null;
        throw err;
      });
    }
    return this.operaLoad;
  }

  private async playOpera(ctx: AudioContext, dest: GainNode, g: number): Promise<void> {
    try {
      const buf = await this.loadOpera(ctx);
      // v56: 解码是异步的；期间静音/切景/再次 set 都让本次作废，
      // 避免同一时刻起两个 BufferSource 叠成双声景。
      if (g !== this.gen || this.muted || this.kind !== "opera") return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = OPERA_GAIN;
      src.connect(gain);
      gain.connect(dest);
      src.start();
      this.nodes.push(src, gain);
    } catch (err) {
      console.warn("ambience opera: load failed, falling back to soft hum", err);
      // v56: 失败回退前同样校验代际，防止静音/切景后又被回退音拉响。
      if (g !== this.gen || this.muted || this.kind !== "opera") return;
      this.hum(ctx, dest, 110, 0.22);
      this.noise(ctx, dest, 1200, 0.12);
    }
  }
}

export const ambience = new Ambience();
