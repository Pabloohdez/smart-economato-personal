const OFFLINE_QUEUE_KEY = "smart-economato.offline-queue";

export const OFFLINE_QUEUE_EVENT = "smart-economato:offline-queue";

export type OfflineQueueItem = {
  id: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  queuedAt: string;
  queuedMessage?: string;
};

type OfflineQueueEventDetail =
  | { type: "enqueued"; item: OfflineQueueItem }
  | { type: "flushed"; processed: number; failed: number; pending: number };

function readQueue(): OfflineQueueItem[] {
  const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineQueueItem[]) {
  if (queue.length === 0) {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    return;
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function emitEvent(detail: OfflineQueueEventDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT, { detail }));
}

export function getOfflineQueue() {
  return readQueue();
}

export function replaceOfflineQueue(queue: OfflineQueueItem[]) {
  writeQueue(queue);
}

export function clearOfflineQueue() {
  writeQueue([]);
}

export function enqueueOfflineRequest(item: Omit<OfflineQueueItem, "id" | "queuedAt">) {
  const queue = readQueue();
  const queuedItem: OfflineQueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    queuedAt: new Date().toISOString(),
  };

  queue.push(queuedItem);
  writeQueue(queue);
  emitEvent({ type: "enqueued", item: queuedItem });
  return queuedItem;
}

export function notifyOfflineQueueFlushed(processed: number, failed: number, pending: number) {
  emitEvent({ type: "flushed", processed, failed, pending });
}