'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StopwatchState {
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
      start: () => {
        if (get().startedAt === null) set({ startedAt: Date.now() });
      },
      pause: () => {
        const { startedAt, accumulatedMs } = get();
        if (startedAt === null) return;
        set({
          startedAt: null,
          accumulatedMs: accumulatedMs + Math.max(0, Date.now() - startedAt),
        });
      },
      resume: () => {
        if (get().startedAt === null) set({ startedAt: Date.now() });
      },
      reset: () => set({ startedAt: null, accumulatedMs: 0 }),
    }),
    { name: 'stopwatch-storage' },
  ),
);

export const getStopwatchElapsedMs = (state: Pick<StopwatchState, 'startedAt' | 'accumulatedMs'>, now = Date.now()) =>
  state.accumulatedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
