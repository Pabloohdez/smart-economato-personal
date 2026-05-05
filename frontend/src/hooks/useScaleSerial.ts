import { useEffect, useMemo, useState } from "react";
import { ScaleSerial, type ScaleWeight } from "../lib/scale/scaleSerial";

type UseScaleSerialState = {
  supported: boolean;
  connected: boolean;
  weightKg: number | null;
  rawLine: string | null;
  error: string | null;
};

export function useScaleSerial(options?: { baudRate?: number }) {
  const scale = useMemo(
    () =>
      new ScaleSerial({
        baudRate: options?.baudRate,
        useFrames: true,
        emitOnlyOnChange: true,
      }),
    [options?.baudRate],
  );

  const [state, setState] = useState<UseScaleSerialState>({
    supported: ScaleSerial.isSupported(),
    connected: false,
    weightKg: null,
    rawLine: null,
    error: null,
  });

  useEffect(() => {
    const unsub = scale.subscribe((w: ScaleWeight) => {
      setState((prev) => ({
        ...prev,
        weightKg: w.kg,
        rawLine: w.rawLine,
      }));
    });
    return () => unsub();
  }, [scale]);

  async function connect() {
    try {
      await scale.connect();
      setState((prev) => ({ ...prev, connected: true, error: null }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: e instanceof Error ? e.message : "Error conectando con la báscula",
      }));
    }
  }

  async function disconnect() {
    await scale.disconnect();
    setState((prev) => ({ ...prev, connected: false }));
  }

  function captureKg() {
    return scale.getLastWeight()?.kg ?? null;
  }

  return { ...state, connect, disconnect, captureKg };
}

