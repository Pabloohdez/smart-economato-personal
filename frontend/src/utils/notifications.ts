// frontend/src/utils/notifications.ts
import { toast } from "sonner";

export type NotificationType = "success" | "error" | "warning" | "info";
type ConfirmDialogHandler = (options: ConfirmOptions) => Promise<boolean>;

let confirmDialogHandler: ConfirmDialogHandler | null = null;

/* ================================================================
   TOAST — showNotification
   ================================================================ */
function ensureUiOverlayStyles() {
  // Fallback defensivo: si por cualquier motivo el CSS global no cargó,
  // inyectamos estilos mínimos para que confirm/toast sigan siendo modales reales.
  if (document.getElementById("ui-overlay-styles")) return;
  const style = document.createElement("style");
  style.id = "ui-overlay-styles";
  style.textContent = `
    #ui-toast-container{position:fixed;right:18px;top:18px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none}
    .ui-toast{pointer-events:auto;display:grid;grid-template-columns:18px 1fr 28px;gap:10px;align-items:center;padding:12px;border-radius:14px;border:1px solid rgba(229,231,235,.9);background:#fff;box-shadow:0 18px 40px rgba(17,24,39,.14);min-width:260px;max-width:min(420px,calc(100vw - 24px));overflow:hidden}
    .ui-toast__close{border:0;background:transparent;cursor:pointer;font-size:18px;line-height:1;color:#9ca3af}
    .ui-confirm-overlay{position:fixed;inset:0;z-index:99998;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.42);backdrop-filter:blur(2px);opacity:0;transition:opacity 200ms ease}
    .ui-confirm-overlay.ui-confirm--visible{opacity:1}
    .ui-confirm-box{width:min(520px,100%);border-radius:20px;background:#fff;border:1px solid rgba(229,231,235,.95);box-shadow:0 25px 50px rgba(0,0,0,.25);padding:18px;transform:translateY(10px) scale(.98);transition:transform 220ms cubic-bezier(.22,1,.36,1)}
    .ui-confirm-overlay.ui-confirm--visible .ui-confirm-box{transform:translateY(0) scale(1)}
    .ui-confirm-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
    .ui-confirm-btn-cancel,.ui-confirm-btn-ok{min-height:42px;padding:10px 14px;border-radius:12px;font-weight:800;font-size:13px;cursor:pointer}
    .ui-confirm-btn-cancel{background:#fff;color:#64748b;border:2px solid #e2e8f0}
    .ui-confirm-btn-ok{border:0;color:#fff;background:linear-gradient(135deg,#b33131,#8f2323)}
    .ui-confirm-btn-ok--danger{background:linear-gradient(135deg,#ef4444,#dc2626)}
  `;
  document.head.appendChild(style);
}

export function showNotification(message: string, type: NotificationType = "info") {
  const notify =
    type === "success"
      ? toast.success
      : type === "error"
        ? toast.error
        : type === "warning"
          ? toast.warning
          : toast.info;

  notify(message, {
    duration: 4500,
  });
}

export function registerConfirmDialogHandler(handler: ConfirmDialogHandler | null) {
  confirmDialogHandler = handler;
}

/* ================================================================
   CONFIRM DIALOG — showConfirm
   ================================================================ */
export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  icon?: string;
};

export function showConfirm(
  messageOrOptions: string | ConfirmOptions
): Promise<boolean> {
  const opts: ConfirmOptions =
    typeof messageOrOptions === "string"
      ? { message: messageOrOptions }
      : messageOrOptions;

  if (confirmDialogHandler) {
    return confirmDialogHandler(opts);
  }

  ensureUiOverlayStyles();

  const {
    title        = "¿Estás seguro?",
    message,
    confirmLabel = "Confirmar",
    cancelLabel  = "Cancelar",
    variant      = "default",
    icon         = "fa-solid fa-circle-question",
  } = opts;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ui-confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ui-confirm-title");

    const okClass =
      variant === "danger"
        ? "ui-confirm-btn-ok ui-confirm-btn-ok--danger"
        : "ui-confirm-btn-ok";

    overlay.innerHTML = `
      <div class="ui-confirm-box">
        <div class="ui-confirm-icon">
          <i class="${icon}" aria-hidden="true"></i>
        </div>
        <h3 id="ui-confirm-title" class="ui-confirm-title">${title}</h3>
        <p class="ui-confirm-msg">${message.replace(/\n/g, "<br>")}</p>
        <div class="ui-confirm-actions">
          <button class="ui-confirm-btn-cancel">${cancelLabel}</button>
          <button class="${okClass}">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("ui-confirm--visible"));

    const btnCancel = overlay.querySelector(".ui-confirm-btn-cancel") as HTMLButtonElement;
    const btnOk     = overlay.querySelector(".ui-confirm-btn-ok")     as HTMLButtonElement;
    btnCancel?.focus();

    const close = (result: boolean) => {
      overlay.classList.remove("ui-confirm--visible");
      document.removeEventListener("keydown", handleKey);
      setTimeout(
        () => document.body.contains(overlay) && document.body.removeChild(overlay),
        250
      );
      resolve(result);
    };

    btnCancel.addEventListener("click", () => close(false));
    btnOk.addEventListener("click",     () => close(true));
    overlay.addEventListener("click",   (e) => { if (e.target === overlay) close(false); });

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter")  {
        // Evita cierres instantáneos si el Enter viene de un submit previo fuera del modal
        const active = document.activeElement;
        if (active && overlay.contains(active)) {
          e.preventDefault();
          close(true);
        }
      }
    }
    document.addEventListener("keydown", handleKey);
  });
}

/* ================================================================
   ALERT DIALOG — showAlert (reemplaza window.alert)
   ================================================================ */
export function showAlert(
  message: string,
  type: NotificationType = "info",
  title?: string
): Promise<void> {
  const icons: Record<NotificationType, string> = {
    success: "fa-solid fa-circle-check",
    error:   "fa-solid fa-circle-xmark",
    warning: "fa-solid fa-triangle-exclamation",
    info:    "fa-solid fa-circle-info",
  };
  return showConfirm({
    title:        title ?? (type === "error" ? "Error" : type === "success" ? "Éxito" : "Aviso"),
    message,
    icon:         icons[type],
    confirmLabel: "Entendido",
    cancelLabel:  "",
  }).then(() => undefined);
}
