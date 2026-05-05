import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { flushOfflineQueue } from "../../services/apiClient";
import { OFFLINE_QUEUE_EVENT } from "../../services/offlineQueue";
import { showNotification } from "../../utils/notifications";
import { setupRealtimeSync } from "../../lib/realtimeSync";

export default function AppRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanupRealtime = setupRealtimeSync(queryClient);
    void flushOfflineQueue();

    const onOnline = () => {
      void flushOfflineQueue();
    };

    const onOfflineQueueEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; item?: { queuedMessage?: string }; processed?: number; failed?: number }>).detail;

      if (detail.type === "enqueued") {
        showNotification(
          detail.item?.queuedMessage ?? "Sin conexión: la acción queda pendiente de sincronización",
          "warning",
        );
        return;
      }

      if (detail.type === "flushed" && (detail.processed ?? 0) > 0) {
        showNotification(
          `Sincronización completada: ${detail.processed} acción(es) enviadas${detail.failed ? `, ${detail.failed} descartadas` : ""}.`,
          detail.failed ? "warning" : "success",
        );
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, onOfflineQueueEvent as EventListener);

    return () => {
      cleanupRealtime();
      window.removeEventListener("online", onOnline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, onOfflineQueueEvent as EventListener);
    };
  }, [queryClient]);

  return null;
}