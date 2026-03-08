import { create } from "zustand";

export const MAX_RETRIES = 3;

export interface QueuedOperation {
  id: string;
  label: string;
  action: () => Promise<unknown>;
  retryCount: number;
  /** Set when retryCount reaches MAX_RETRIES and the last attempt failed */
  permanentlyFailed: boolean;
}

interface OfflineQueueState {
  queue: QueuedOperation[];
  isProcessing: boolean;

  /**
   * Add a new operation to the write queue.
   * @param label  Human-readable description shown in the UI
   * @param action Function that executes the server action
   */
  enqueue: (label: string, action: () => Promise<unknown>) => void;

  /**
   * Run every queued operation sequentially.
   * Successes are removed; failures increment retryCount.
   * Operations that hit MAX_RETRIES are marked permanentlyFailed.
   */
  processQueue: () => Promise<void>;

  /** Remove all operations regardless of state. */
  clearQueue: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useOfflineQueue = create<OfflineQueueState>((set, get) => ({
  queue: [],
  isProcessing: false,

  enqueue(label, action) {
    const op: QueuedOperation = {
      id: generateId(),
      label,
      action,
      retryCount: 0,
      permanentlyFailed: false,
    };
    set((state) => ({ queue: [...state.queue, op] }));
  },

  async processQueue() {
    if (get().isProcessing) return;
    set({ isProcessing: true });

    const { queue } = get();
    // Process a snapshot — new items enqueued during processing stay for
    // the next run.
    const snapshot = queue.filter((op) => !op.permanentlyFailed);

    for (const op of snapshot) {
      try {
        await op.action();
        // Success — remove from queue
        set((state) => ({
          queue: state.queue.filter((o) => o.id !== op.id),
        }));
      } catch {
        const nextRetryCount = op.retryCount + 1;
        const permanentlyFailed = nextRetryCount >= MAX_RETRIES;
        set((state) => ({
          queue: state.queue.map((o) =>
            o.id === op.id
              ? { ...o, retryCount: nextRetryCount, permanentlyFailed }
              : o
          ),
        }));
      }
    }

    set({ isProcessing: false });
  },

  clearQueue() {
    set({ queue: [], isProcessing: false });
  },
}));
