import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Button from "./Button";
import { registerConfirmDialogHandler, type ConfirmOptions } from "../../utils/notifications";

type PendingDialog = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

const FALLBACK_ICON = "fa-solid fa-circle-question";

export default function ConfirmDialogHost() {
  const [queue, setQueue] = useState<PendingDialog[]>([]);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeDialog = queue[0] ?? null;
  const isAlert = activeDialog ? activeDialog.cancelLabel === "" : false;

  useEffect(() => {
    registerConfirmDialogHandler((options) => {
      return new Promise<boolean>((resolve) => {
        setQueue((current) => [
          ...current,
          {
            resolve,
            ...options,
          },
        ]);
      });
    });

    return () => {
      registerConfirmDialogHandler(null);
    };
  }, []);

  useEffect(() => {
    if (!activeDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }

      if (event.key === "Enter") {
        const activeElement = document.activeElement;
        if (activeElement && activeElement instanceof HTMLElement) {
          if (activeElement.dataset.confirmDialogAction === "cancel") {
            event.preventDefault();
            close(false);
            return;
          }

          if (activeElement.dataset.confirmDialogAction === "confirm") {
            event.preventDefault();
            close(true);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog]);

  useEffect(() => {
    if (!activeDialog) return;

    const target = isAlert ? confirmButtonRef.current : cancelButtonRef.current;
    target?.focus();
  }, [activeDialog, isAlert]);

  const iconClassName = useMemo(
    () => activeDialog?.icon || FALLBACK_ICON,
    [activeDialog],
  );

  function close(result: boolean) {
    setQueue((current) => {
      const [first, ...rest] = current;
      if (first) {
        first.resolve(result);
      }
      return rest;
    });
  }

  if (!activeDialog) return null;

  const dialog = (
    <AnimatePresence mode="wait">
      {activeDialog ? (
        <motion.div
          key="confirm-overlay"
          className="fixed inset-0 z-[99998] grid place-items-center bg-black/45 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close(false);
            }
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <motion.div
            className="w-full max-w-[520px] rounded-[26px] border border-[var(--color-border-default)] bg-white p-5 shadow-[0_25px_55px_rgba(15,23,42,0.22)]"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{
              duration: 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
              <i className={iconClassName} aria-hidden="true" />
            </div>

            <h3 id="confirm-dialog-title" className="m-0 text-[20px] font-extrabold tracking-[-0.02em] text-[var(--color-text-strong)]">
              {activeDialog.title || "¿Estás seguro?"}
            </h3>

            <p className="mt-3 whitespace-pre-line text-[14px] leading-6 text-[var(--color-text-muted)]">
              {activeDialog.message || ""}
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {!isAlert ? (
                <Button
                  ref={cancelButtonRef}
                  type="button"
                  variant="secondary"
                  data-confirm-dialog-action="cancel"
                  onClick={() => close(false)}
                >
                  {activeDialog.cancelLabel || "Cancelar"}
                </Button>
              ) : null}

              <Button
                ref={confirmButtonRef}
                type="button"
                variant={activeDialog.variant === "danger" ? "danger" : "primary"}
                data-confirm-dialog-action="confirm"
                onClick={() => close(true)}
              >
                {activeDialog.confirmLabel || "Confirmar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(dialog, document.body) : dialog;
}