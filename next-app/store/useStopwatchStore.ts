'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StopwatchState {
  startedAt: number | null;
  accumulatedMs: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export const useStopwatchStore = create<StopwatchState>()(
  persist(
    (set, get) => ({
      startedAt: null,
      accumulatedMs: 0,
      start: () => set({ startedAt: Date.now() }),
      pause: () => {
        const { startedAt, accumulatedMs } = get();
        if (startedAt === null) return;
        set({
          startedAt: null,
          accumulatedMs: accumulatedMs + Math.max(0, Date.now() - startedAt),
        });
      },
      resume: () => {
        const { startedAt } = get();
        if (startedAt === null) set({ startedAt: Date.now() });
      },
      reset: () => set({ startedAt: null, accumulatedMs: 0 }),
    }),
    { name: 'stopwatch-storage' },
  ),
);
