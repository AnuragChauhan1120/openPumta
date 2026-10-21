import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStopwatchStore } from '@/store/useStopwatchStore';
import { usePomodoroStore } from '@/store/usePomodoroStore';

describe('useStopwatchStore', () => {
  beforeEach(() => {
    vi.setSystemTime(0);
    useStopwatchStore.getState().reset();
  });

  it('accumulates separate start/pause/resume periods', () => {
    useStopwatchStore.getState().start();
    vi.setSystemTime(5_000);
    useStopwatchStore.getState().pause();
    expect(useStopwatchStore.getState()).toMatchObject({ accumulatedMs: 5_000, startedAt: null });

    vi.setSystemTime(10_000);
    useStopwatchStore.getState().resume();
    vi.setSystemTime(13_000);
    useStopwatchStore.getState().pause();
    expect(useStopwatchStore.getState()).toMatchObject({ accumulatedMs: 8_000, startedAt: null });
  });

  it('reset clears the stopwatch', () => {
    useStopwatchStore.getState().start();
    vi.setSystemTime(2_000);
    useStopwatchStore.getState().pause();
    useStopwatchStore.getState().reset();
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 0 });
  });

  it('does not change Pomodoro state', () => {
    const before = usePomodoroStore.getState();
    useStopwatchStore.getState().start();
    useStopwatchStore.getState().pause();
    useStopwatchStore.getState().resume();
    useStopwatchStore.getState().reset();
    expect(usePomodoroStore.getState()).toEqual(before);
  });
});
