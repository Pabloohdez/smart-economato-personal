export type ScaleWeight = {
  /** Peso en kg */
  kg: number;
  /** Línea original recibida por serie (debug) */
  rawLine: string;
  /** Timestamp ms */
  at: number;
};

export type ScaleSerialOptions = {
  baudRate?: number;
  /**
   * Regex opcional para extraer el peso. Si no se indica, se replica `SCPuerto.py`:
   * buscar números en la trama y usar el último.
   */
  pattern?: RegExp;
  /**
   * Si true, replica el framing del script: STX..ETX o hasta \n/\r.
   * Recomendado si la báscula envía tramas con bytes de control.
   */
  useFrames?: boolean;
  /**
   * Si true, solo emite cuando cambie el peso (igual que el script).
   */
  emitOnlyOnChange?: boolean;
};

type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
};

function defaultPattern() {
  // `SCPuerto.py`: encontrar todos los números y usar el último
  return /[-+]?\d+(?:[.,]\d+)?/g;
}

function parseWeightKg(line: string, pattern: RegExp): number | null {
  // Si el patrón es global, usamos matchAll y cogemos el último (modo Python).
  if (pattern.global) {
    const matches = Array.from(line.matchAll(pattern), (m) => String(m[0] ?? ""));
    if (matches.length === 0) return null;
    const numRaw = matches[matches.length - 1]!.replace(",", ".").trim();
    const v = Number(numRaw);
    return Number.isFinite(v) ? v : null;
  }

  const m = line.match(pattern);
  if (!m) return null;
  const numRaw = String(m[1] ?? m[0] ?? "").replace(",", ".").trim();
  const v = Number(numRaw);
  return Number.isFinite(v) ? v : null;
}

export class ScaleSerial {
  private port: SerialPortLike | null = null;
  private readerAbort: AbortController | null = null;
  private lastWeight: ScaleWeight | null = null;
  private lastEmitted: number | null = null;
  private onWeight?: (w: ScaleWeight) => void;
  private readonly options: Required<Pick<ScaleSerialOptions, "baudRate" | "pattern" | "useFrames" | "emitOnlyOnChange">>;

  constructor(options: ScaleSerialOptions = {}) {
    this.options = {
      baudRate: options.baudRate ?? 9600,
      pattern: options.pattern ?? defaultPattern(),
      useFrames: options.useFrames ?? true,
      emitOnlyOnChange: options.emitOnlyOnChange ?? true,
    };
  }

  static isSupported() {
    return typeof navigator !== "undefined" && Boolean((navigator as any).serial);
  }

  getLastWeight() {
    return this.lastWeight;
  }

  subscribe(handler: (w: ScaleWeight) => void) {
    this.onWeight = handler;
    return () => {
      if (this.onWeight === handler) this.onWeight = undefined;
    };
  }

  async connect() {
    if (!ScaleSerial.isSupported()) {
      throw new Error("Web Serial no está soportado en este navegador. Usa Chrome/Edge.");
    }
    if (this.port) return;

    const serial = (navigator as any).serial as { requestPort(): Promise<SerialPortLike> };
    this.port = await serial.requestPort();
    await this.port.open({ baudRate: this.options.baudRate });
    this.startReadLoop();
  }

  async disconnect() {
    try {
      this.readerAbort?.abort();
    } finally {
      this.readerAbort = null;
    }

    const p = this.port;
    this.port = null;
    if (p) {
      try {
        await p.close();
      } catch {
        // ignore
      }
    }
  }

  private startReadLoop() {
    const port = this.port;
    if (!port?.readable) return;

    this.readerAbort?.abort();
    const abort = new AbortController();
    this.readerAbort = abort;

    const STX = 0x02;
    const ETX = 0x03;

    // Nota: no hay TextDecoder "ignore" real; usamos decode con reemplazo.
    const textDecoder = new TextDecoder("ascii");
    let byteBuf = new Uint8Array(0);
    const pushBytes = (chunk: Uint8Array) => {
      const merged = new Uint8Array(byteBuf.length + chunk.length);
      merged.set(byteBuf, 0);
      merged.set(chunk, byteBuf.length);
      byteBuf = merged;
    };

    const indexOfByte = (buf: Uint8Array, b: number) => {
      for (let i = 0; i < buf.length; i += 1) if (buf[i] === b) return i;
      return -1;
    };

    const sliceBytes = (buf: Uint8Array, start: number, end: number) => buf.slice(start, end);

    const extractFrames = () => {
      const frames: Uint8Array[] = [];
      // Replica lógica `extraer_tramas` del script
      while (true) {
        const i = indexOfByte(byteBuf, STX);
        if (i !== -1) {
          // buf = buf[i+1:]
          byteBuf = byteBuf.slice(i + 1);
          const j = indexOfByte(byteBuf, ETX);
          if (j === -1) {
            // return tramas, STX + buf (reponer STX)
            const restored = new Uint8Array(1 + byteBuf.length);
            restored[0] = STX;
            restored.set(byteBuf, 1);
            byteBuf = restored;
            return frames;
          }
          frames.push(sliceBytes(byteBuf, 0, j));
          byteBuf = byteBuf.slice(j + 1);
          continue;
        }

        // Sin STX: buscar \n
        const nl = indexOfByte(byteBuf, 0x0a);
        if (nl !== -1) {
          frames.push(sliceBytes(byteBuf, 0, nl));
          byteBuf = byteBuf.slice(nl + 1);
          continue;
        }

        // También \r
        const cr = indexOfByte(byteBuf, 0x0d);
        if (cr !== -1) {
          frames.push(sliceBytes(byteBuf, 0, cr));
          byteBuf = byteBuf.slice(cr + 1);
          continue;
        }

        return frames;
      }
    };

    const pump = async () => {
      const reader = port.readable!.getReader();
      try {
        while (!abort.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          if (this.options.useFrames) {
            pushBytes(value);
            const frames = extractFrames();
            for (const f of frames) {
              const line = textDecoder.decode(f).trim();
              if (!line) continue;
              const kg = parseWeightKg(line, this.options.pattern);
              if (kg == null) continue;
              if (this.options.emitOnlyOnChange && this.lastEmitted === kg) continue;
              this.lastEmitted = kg;
              const w: ScaleWeight = { kg, rawLine: line, at: Date.now() };
              this.lastWeight = w;
              this.onWeight?.(w);
            }
          } else {
            // Fallback: por líneas
            const line = textDecoder.decode(value).trim();
            if (!line) continue;
            const kg = parseWeightKg(line, this.options.pattern);
            if (kg == null) continue;
            if (this.options.emitOnlyOnChange && this.lastEmitted === kg) continue;
            this.lastEmitted = kg;
            const w: ScaleWeight = { kg, rawLine: line, at: Date.now() };
            this.lastWeight = w;
            this.onWeight?.(w);
          }
        }
      } finally {
        reader.releaseLock();
      }
    };

    // Fire-and-forget
    void pump();
  }
}

