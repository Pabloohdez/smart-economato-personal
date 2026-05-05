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

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    return false;
  }
}

function isRectMostlyInViewport(rect: DOMRect, margin = 16): boolean {
  const topOk = rect.top >= margin;
  const bottomOk = rect.bottom <= window.innerHeight - margin;
  const leftOk = rect.left >= margin;
  const rightOk = rect.right <= window.innerWidth - margin;
  return topOk && bottomOk && leftOk && rightOk;
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
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [tipHeight, setTipHeight] = useState<number>(196);
  const [targetMissing, setTargetMissing] = useState(false);
  const missingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setIdx(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open || !step) return;

    const isActuallyVisible = (el: HTMLElement) => {
      // offsetParent null suele significar display:none (excepto fixed); rect 0,0 también es sospechoso.
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      return true;
    };

    const updateTarget = (el: HTMLElement) => {
      setTargetMissing(false);
      missingSinceRef.current = null;

      // 1) Autoscroll para que se vea el objetivo.
      try {
        const rectNow = el.getBoundingClientRect();
        if (!isRectMostlyInViewport(rectNow, 28)) {
          el.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
        }
      } catch {
        // noop
      }

      // 2) Medir tras el scroll.
      requestAnimationFrame(() => {
        setTargetRect(el.getBoundingClientRect());
      });
    };

    const tryResolve = (): boolean => {
      const el = getEl(step.selector);
      if (!el || !isActuallyVisible(el)) {
        setTargetRect(null);
        setTargetMissing(true);
        if (missingSinceRef.current == null) missingSinceRef.current = Date.now();
        return false;
      }
      updateTarget(el);
      return true;
    };

    // Primer intento inmediato.
    tryResolve();

    // Reintentos cortos: útil cuando la UI renderiza tarde (transiciones/modales/tab/vistas).
    let tries = 0;
    const maxTries = 18;
    const interval = window.setInterval(() => {
      tries += 1;
      const ok = tryResolve();
      if (ok || tries >= maxTries) window.clearInterval(interval);
    }, 120);

    // Observer para reintentar cuando cambia el DOM.
    const obsRoot = (document.querySelector("#main-content") as HTMLElement | null) ?? document.body;
    const mo = new MutationObserver(() => {
      // Si ya lo tenemos, no hace falta.
      if (!targetMissing) return;
      tryResolve();
    });
    try {
      mo.observe(obsRoot, { childList: true, subtree: true, attributes: true });
    } catch {
      // noop
    }

    const onResize = () => {
      const el = getEl(step.selector);
      if (el && isActuallyVisible(el)) updateTarget(el);
      else tryResolve();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.clearInterval(interval);
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, step?.selector]);

  useEffect(() => {
    if (!open) return;

    const measure = () => {
      const h = tipRef.current?.getBoundingClientRect().height;
      if (h && Number.isFinite(h) && h > 0) setTipHeight(h);
    };

    // Medición inicial y tras cambios de paso
    measure();
    const id = window.setTimeout(measure, 0);

    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, [open, idx, step?.id]);

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

  const pad = 12;
  const rect = targetRect;

  const highlight = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: Math.max(0, rect.width + pad * 2),
        height: Math.max(0, rect.height + pad * 2),
      }
    : null;

  const tooltipMaxW = 440;
  const tooltipW = Math.min(tooltipMaxW, Math.max(320, Math.round(window.innerWidth * 0.34)));
  const tooltipH = Math.max(160, tipHeight || 196);

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

  const highlightCenter = rect
    ? {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    : null;

  const tipAnchor = {
    x: clamp(tipLeft + tooltipW / 2, 12, window.innerWidth - 12),
    y: clamp(tipTop + 12, 12, window.innerHeight - 12),
  };

  return (
    <div className="fixed inset-0 z-[99990]" role="dialog" aria-modal="true" aria-label="Tutorial guiado">
      {/* Overlay con "hueco" (spotlight) */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true" onClick={onClose}>
        <defs>
          <mask id="guided-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlight ? (
              <rect
                x={highlight.left}
                y={highlight.top}
                width={highlight.width}
                height={highlight.height}
                rx="18"
                ry="18"
                fill="black"
              />
            ) : null}
          </mask>
          <filter id="guided-tour-soft">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(2,6,23,0.70)" mask="url(#guided-tour-mask)" />
        {/* brillo suave alrededor del hueco */}
        {highlight ? (
          <rect
            x={highlight.left}
            y={highlight.top}
            width={highlight.width}
            height={highlight.height}
            rx="18"
            ry="18"
            fill="rgba(255,255,255,0.10)"
            filter="url(#guided-tour-soft)"
          />
        ) : null}
      </svg>

      {highlight ? (
        <div
          className="absolute rounded-[18px] border-2 border-white/90 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            background: "transparent",
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

      {/* Pulso para que se vea claro el foco */}
      {highlight ? (
        <div
          className="absolute rounded-[18px]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            boxShadow: "0 0 0 0 rgba(255,255,255,0.55)",
            animation: "guidedTourPulse 1.35s ease-out infinite",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      ) : null}

      {/* Flecha (línea) hacia el elemento */}
      {highlightCenter ? (
        <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
          <defs>
            <marker id="guided-tour-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.95)" />
            </marker>
          </defs>
          <line
            x1={tipAnchor.x}
            y1={tipAnchor.y}
            x2={highlightCenter.x}
            y2={highlightCenter.y}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            markerEnd="url(#guided-tour-arrow)"
            opacity="0.9"
          />
        </svg>
      ) : null}

      <div
        className="absolute rounded-[22px] border border-white/18 bg-white text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        style={{
          top: tipTop,
          left: tipLeft,
          width: tooltipW,
          maxHeight: "calc(100dvh - 24px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        ref={tipRef}
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

        <div className="px-5 py-4 text-[13px] font-semibold leading-relaxed text-slate-700 overflow-y-auto">
          {step.body}
          {targetMissing ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] font-bold text-amber-900">
              Este elemento no está visible ahora mismo (puede depender de una vista, filtro o modal). Si quieres, pulsa “Siguiente” para saltar este punto.
            </div>
          ) : null}
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

      {/* keyframes inline (sin tocar CSS global) */}
      <style>{`
        @keyframes guidedTourPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.55); }
          70% { box-shadow: 0 0 0 14px rgba(255,255,255,0.00); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.00); }
        }
      `}</style>
    </div>
  );
}

