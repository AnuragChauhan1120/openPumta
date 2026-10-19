import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStopwatchStore } from '@/store/useStopwatchStore';
import { usePomodoroStore } from '@/store/usePomodoroStore';

describe('useStopwatchStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    useStopwatchStore.getState().reset();
    usePomodoroStore.getState().reset();
  });

  it('accumulates elapsed time across pause and resume', () => {
    const stopwatch = useStopwatchStore.getState();
    stopwatch.start();
    vi.advanceTimersByTime(1500);
    stopwatch.pause();
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 1500 });

    stopwatch.resume();
    vi.advanceTimersByTime(2300);
    stopwatch.pause();
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 3800 });
  });

  it('reset clears the stopwatch state', () => {
    const stopwatch = useStopwatchStore.getState();
    stopwatch.start();
    vi.advanceTimersByTime(1000);
    stopwatch.reset();
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 0 });
  });

  it('does not modify Pomodoro timer state', () => {
    const pomodoroBefore = usePomodoroStore.getState();
    const stopwatch = useStopwatchStore.getState();
    stopwatch.start();
    vi.advanceTimersByTime(500);
    stopwatch.pause();
    stopwatch.resume();
    stopwatch.reset();
    expect(usePomodoroStore.getState()).toMatchObject({
      mode: pomodoroBefore.mode,
      status: pomodoroBefore.status,
      phase: pomodoroBefore.phase,
      completedPomodoros: pomodoroBefore.completedPomodoros,
      startTimestamp: pomodoroBefore.startTimestamp,
      accumulatedMs: pomodoroBefore.accumulatedMs,
    });
  });
});
