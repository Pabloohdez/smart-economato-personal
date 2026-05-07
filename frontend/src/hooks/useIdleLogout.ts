import { useEffect, useRef } from "react";
import { clearSession, DEFAULT_IDLE_TIMEOUT_MS, getLastActivityAt, hasActiveSession, touchActivity } from "../services/sessionService";

type Options = {
  idleTimeoutMs?: number;
};

function safeNow() {
  return Date.now();
}

export function useIdleLogout(options: Options = {}) {
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const tickingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const maybeLogout = () => {
      if (!hasActiveSession()) return;
      const last = getLastActivityAt();
      const lastAt = last ?? safeNow();
      if (safeNow() - lastAt >= idleTimeoutMs) {
        fetch(`${(import.meta.env.VITE_API_URL as string) || "/api"}/login/logout`, {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        }).catch(() => {});
        clearSession();
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    };

    const onActivity = () => {
      if (!hasActiveSession()) return;
      touchActivity();
    };

    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onActivity();
        maybeLogout();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Primer toque para que el contador exista.
    if (hasActiveSession() && getLastActivityAt() == null) {
      touchActivity();
    }

    // Intervalo ligero; evita spamear timers por re-renders.
    if (!tickingRef.current) {
      tickingRef.current = true;
    }
    const intervalId = window.setInterval(maybeLogout, 15_000);

    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
      tickingRef.current = false;
    };
  }, [idleTimeoutMs]);
}

