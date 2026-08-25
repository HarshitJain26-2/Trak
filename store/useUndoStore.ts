import { create } from 'zustand';
import { triggerHaptic } from '@/utils/haptics';

export interface UndoToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onUndo: () => void | Promise<void>;
  durationMs?: number;
}

interface UndoStoreState {
  activeUndo: UndoToastItem | null;
  showUndoToast: (item: Omit<UndoToastItem, 'id'>) => void;
  hideUndoToast: () => void;
  triggerUndo: () => Promise<void>;
}

export const useUndoStore = create<UndoStoreState>((set, get) => ({
  activeUndo: null,

  showUndoToast: (item) => {
    triggerHaptic(15);
    const id = `undo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    set({
      activeUndo: {
        ...item,
        id,
        actionLabel: item.actionLabel || 'UNDO',
        durationMs: item.durationMs || 5000,
      },
    });
  },

  hideUndoToast: () => {
    set({ activeUndo: null });
  },

  triggerUndo: async () => {
    const active = get().activeUndo;
    if (active) {
      triggerHaptic([0, 30, 40, 30]);
      set({ activeUndo: null });
      try {
        await active.onUndo();
      } catch (err) {
        console.error('[UndoStore] Failed to execute onUndo handler:', err);
      }
    }
  },
}));
