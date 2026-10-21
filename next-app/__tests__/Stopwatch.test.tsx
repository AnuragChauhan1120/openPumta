import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stopwatch from '@/app/components/pomodoro/Stopwatch';
import { useStopwatchStore } from '@/store/useStopwatchStore';
import { useTimerStore } from '@/store/useTimerStore';

describe('standalone stopwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useStopwatchStore.getState().reset();
    vi.setSystemTime(0);
  });

  it('accumulates across pause and resume', () => {
    act(() => useStopwatchStore.getState().start());
    act(() => vi.advanceTimersByTime(1250));
    act(() => useStopwatchStore.getState().pause());
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 1250 });

    act(() => useStopwatchStore.getState().resume());
    act(() => vi.advanceTimersByTime(750));
    act(() => useStopwatchStore.getState().pause());
    expect(useStopwatchStore.getState().accumulatedMs).toBe(2000);
  });

  it('reset clears stopwatch state', () => {
    act(() => useStopwatchStore.getState().start());
    act(() => vi.advanceTimersByTime(500));
    act(() => useStopwatchStore.getState().pause());
    act(() => useStopwatchStore.getState().reset());
    expect(useStopwatchStore.getState()).toMatchObject({ startedAt: null, accumulatedMs: 0 });
  });

  it('does not mutate the Pomodoro timer store', () => {
    const before = useTimerStore.getState();
    act(() => {
      useStopwatchStore.getState().start();
      useStopwatchStore.getState().pause();
      useStopwatchStore.getState().resume();
      useStopwatchStore.getState().reset();
    });
    const after = useTimerStore.getState();
    expect(after.phase).toBe(before.phase);
    expect(after.running).toBe(before.running);
    expect(after.mode).toBe(before.mode);
    expect(after.durationMs).toBe(before.durationMs);
  });

  it('renders the persisted elapsed state after remount', () => {
    act(() => useStopwatchStore.setState({ startedAt: null, accumulatedMs: 3210 }));
    render(<Stopwatch />);
    expect(screen.getByText('00:00:03')).toBeInTheDocument();
  });
});
