'use client';

import { useEffect, useState } from 'react';
import { useStopwatchStore } from '@/store/useStopwatchStore';

const format = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  return `${String(Math.floor(totalSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

export default function Stopwatch() {
  const { startedAt, accumulatedMs, start, pause, resume, reset } = useStopwatchStore();
  const [now, setNow] = useState(() => Date.now());
  const running = startedAt !== null;
  const elapsed = accumulatedMs + (running ? Math.max(0, now - startedAt) : 0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => setNow(Date.now()), [startedAt, accumulatedMs]);

  return (
    <div className="flex flex-col items-center gap-2" aria-label="Stopwatch">
      <span className="font-mono text-lg tabular-nums">{format(elapsed)}</span>
      <div className="flex gap-2">
        <button type="button" onClick={running ? pause : (accumulatedMs ? resume : start)}>
          {running ? 'Pause' : accumulatedMs ? 'Resume' : 'Start'}
        </button>
        <button type="button" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
