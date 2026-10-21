import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStopwatchStore } from '@/store/useStopwatchStore';
import { useTimerStore } from '@/store/useTimerStore';

describe('useStopwatchStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    localStorage.removeItem('stopwatch-storage');
    useStopwatchStore.persist.clearStorage();
    useStopwatchStore.setState({ startedAt: null, accumulatedMs: 0 });
  });

  it('accumulates start, pause, resume intervals and resets independently', () => {
    const timerBefore = useTimerStore.getState();
    const stopwatch = useStopwatchStore.getState();

    stopwatch.start();
    expect(useStopwatchStore.getState().startedAt).toBe(Date.now());
    vi.advanceTimersByTime(2500);
    stopwatch.pause();
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 2500 });

    useStopwatchStore.getState().resume();
    vi.advanceTimersByTime(1500);
    useStopwatchStore.getState().pause();
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 4000 });

    useStopwatchStore.getState().reset();
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 0 });
    expect(useTimerStore.getState()).toEqual(timerBefore);
  });
});
