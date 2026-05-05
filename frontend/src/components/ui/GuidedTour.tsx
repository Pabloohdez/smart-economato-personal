import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export type GuidedTourStep = {
  id: string;
  selector: string;
  title: string;
  body: string;
  placement?: "auto" | "top" | "bottom" | "left" | "right";
};

type GuidedTourProps = {
  open: boolean;
  steps: GuidedTourStep[];
  initialStepId?: string;
  onClose: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getEl(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  try {
    return document.querySelector(selector) as HTMLElement | null;
  } catch {
    return null;
  }
}

export default function GuidedTour({ open, steps, initialStepId, onClose }: GuidedTourProps) {
  const initialIndex = useMemo(() => {
    if (!initialStepId) return 0;
    const idx = steps.findIndex((s) => s.id === initialStepId);
    return idx >= 0 ? idx : 0;
  }, [initialStepId, steps]);

  const [idx, setIdx] = useState(initialIndex);
  const step = steps[idx] ?? null;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setIdx(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open || !step) return;

    const update = () => {
      const el = getEl(step.selector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      setTargetRect(el.getBoundingClientRect());
      try {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch {
        // noop
      }
    };

    update();

    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, step?.selector]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((v) => clamp(v + 1, 0, Math.max(0, steps.length - 1)));
      if (e.key === "ArrowLeft") setIdx((v) => clamp(v - 1, 0, Math.max(0, steps.length - 1)));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, steps.length]);

  useEffect(() => {
    if (!open) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    // Si el elemento aparece tarde (animaciones), reintenta una vez.
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = getEl(step.selector);
      if (!el) return;
      setTargetRect(el.getBoundingClientRect());
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open, idx, step?.selector]);

  if (!open || !step) return null;

  const pad = 10;
  const rect = targetRect;

  const highlight = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: Math.max(0, rect.width + pad * 2),
        height: Math.max(0, rect.height + pad * 2),
      }
    : null;

  const tooltipMaxW = 420;
  const tooltipW = Math.min(tooltipMaxW, Math.max(320, Math.round(window.innerWidth * 0.34)));
  const tooltipH = 160;

  const defaultTop = 90;
  const defaultLeft = Math.round((window.innerWidth - tooltipW) / 2);

  let tipTop = defaultTop;
  let tipLeft = defaultLeft;

  if (rect) {
    const spaceBottom = window.innerHeight - rect.bottom;
    const placeBottom = spaceBottom >= tooltipH + 24;
    const placeTop = rect.top >= tooltipH + 24;

    if (step.placement === "top" || (!placeBottom && placeTop)) {
      tipTop = rect.top - tooltipH - 18;
      tipLeft = rect.left + rect.width / 2 - tooltipW / 2;
    } else if (step.placement === "bottom" || placeBottom) {
      tipTop = rect.bottom + 18;
      tipLeft = rect.left + rect.width / 2 - tooltipW / 2;
    } else {
      tipTop = defaultTop;
      tipLeft = defaultLeft;
    }

    tipTop = clamp(tipTop, 12, window.innerHeight - tooltipH - 12);
    tipLeft = clamp(tipLeft, 12, window.innerWidth - tooltipW - 12);
  }

  const progressLabel = `${idx + 1} / ${steps.length}`;

  return (
    <div className="fixed inset-0 z-[99990]" role="dialog" aria-modal="true" aria-label="Tutorial guiado">
      <div className="absolute inset-0 bg-[rgba(2,6,23,0.58)]" onClick={onClose} />

      {highlight ? (
        <div
          className="absolute rounded-[18px] border border-white/40 shadow-[0_0_0_9999px_rgba(2,6,23,0.58),0_22px_60px_rgba(0,0,0,0.45)]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(1px)",
          }}
          aria-hidden="true"
        />
      ) : (
        <div
          className="absolute left-1/2 top-[64px] -translate-x-1/2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white"
          aria-hidden="true"
        >
          No encuentro el elemento de este paso. Puedes continuar.
        </div>
      )}

      <div
        className="absolute rounded-[22px] border border-white/18 bg-white text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        style={{ top: tipTop, left: tipLeft, width: tooltipW }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Tutorial · {progressLabel}
            </div>
            <div className="mt-1 text-[16px] font-extrabold tracking-[-0.02em] text-slate-900">
              {step.title}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            onClick={onClose}
            aria-label="Cerrar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 text-[13px] font-semibold leading-relaxed text-slate-700">
          {step.body}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setIdx((v) => clamp(v - 1, 0, steps.length - 1))}
            disabled={idx <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-[13px] font-extrabold text-slate-500 transition hover:bg-slate-100"
              onClick={onClose}
            >
              Saltar
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(179,49,49,0.18)] bg-[rgba(179,49,49,0.10)] px-4 py-2.5 text-[13px] font-extrabold text-[rgba(179,49,49,1)] transition hover:bg-[rgba(179,49,49,0.14)] disabled:opacity-50"
              onClick={() => {
                if (idx >= steps.length - 1) onClose();
                else setIdx((v) => clamp(v + 1, 0, steps.length - 1));
              }}
            >
              {idx >= steps.length - 1 ? "Terminar" : "Siguiente"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

