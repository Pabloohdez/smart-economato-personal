import { useEffect, useMemo, useRef, useState } from "react";
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
    let rafId: number | null = null;
    const pendingRef = { current: null as ScaleWeight | null };
    const lastAppliedRef = { current: { kg: null as number | null, rawLine: null as string | null } };

    const unsub = scale.subscribe((w: ScaleWeight) => {
      pendingRef.current = w;
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const next = pendingRef.current;
        if (!next) return;
        pendingRef.current = null;

        // Evita renders si no cambia nada.
        if (lastAppliedRef.current.kg === next.kg && lastAppliedRef.current.rawLine === next.rawLine) {
          return;
        }
        lastAppliedRef.current = { kg: next.kg, rawLine: next.rawLine };

        setState((prev) => {
          if (prev.weightKg === next.kg && prev.rawLine === next.rawLine) return prev;
          return { ...prev, weightKg: next.kg, rawLine: next.rawLine };
        });
      });
    });
    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      unsub();
    };
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

