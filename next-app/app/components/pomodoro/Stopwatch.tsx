'use client';

import { useEffect, useState } from 'react';
import { useStopwatchStore } from '@/store/useStopwatchStore';

const formatElapsed = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function Stopwatch() {
  const { startedAt, accumulatedMs, start, pause, resume, reset } = useStopwatchStore();
  const [now, setNow] = useState(() => Date.now());
  const running = startedAt !== null;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [running]);

  const elapsedMs = accumulatedMs + (startedAt === null ? 0 : Math.max(0, now - startedAt));

  return (
    <section aria-label="Stopwatch" className="flex flex-col items-center gap-2">
      <div className="text-2xl font-semibold tabular-nums">{formatElapsed(elapsedMs)}</div>
      <div className="flex gap-2">
        {!running ? (
          <button type="button" onClick={elapsedMs > 0 ? resume : start}>
            {elapsedMs > 0 ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button type="button" onClick={pause}>Pause</button>
        )}
        <button type="button" onClick={reset}>Reset</button>
      </div>
    </section>
  );
}
