type Kind = "museum" | "river" | "earth" | "off";

const MASTER_GAIN = 0.07;

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private kind: Kind = "off";
  muted = true;

  async unlock(): Promise<void> {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(this.ctx.destination);
    }
  }

  async set(kind: Kind): Promise<void> {
    this.kind = kind;
    this.clear();
    if (this.muted || kind === "off") {
      // Keep silence reliable even if a hall calls set() while muted.
      if (this.master) this.master.gain.value = 0;
      if (this.muted && this.ctx?.state === "running") void this.ctx.suspend();
      return;
    }
    await this.unlock();
    const ctx = this.ctx!;
    const master = this.master!;
    master.gain.value = MASTER_GAIN;
    if (kind === "museum") {
      this.hum(ctx, master, 92, 0.4);
    } else if (kind === "river") {
      this.noise(ctx, master, 900, 0.35);
      this.hum(ctx, master, 64, 0.25);
    } else if (kind === "earth") {
      this.noise(ctx, master, 400, 0.28);
      this.hum(ctx, master, 48, 0.3);
    }
  }

  async toggleMute(): Promise<boolean> {
    this.muted = !this.muted;
    if (this.muted) {
      this.clear();
      if (this.master) this.master.gain.value = 0;
      if (this.ctx?.state === "running") void this.ctx.suspend();
    } else {
      await this.set(this.kind);
    }
    return this.muted;
  }

  stop(): void {
    this.clear();
    this.kind = "off";
    if (this.master) this.master.gain.value = 0;
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
}

export const ambience = new Ambience();
