'use client';

import { useEffect, useState } from 'react';
import { getStopwatchElapsedMs, useStopwatchStore } from '@/store/useStopwatchStore';

const formatElapsed = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function Stopwatch() {
  const state = useStopwatchStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.startedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [state.startedAt]);

  const elapsedMs = getStopwatchElapsedMs(state, now);

  return (
    <section aria-label="Standalone stopwatch" className="flex flex-col items-center gap-3">
      <time className="font-mono text-3xl tabular-nums" dateTime={`PT${Math.floor(elapsedMs / 1000)}S`}>
        {formatElapsed(elapsedMs)}
      </time>
      <div className="flex gap-2">
        {state.startedAt === null ? (
          <button type="button" onClick={state.accumulatedMs === 0 ? state.start : state.resume}>Start</button>
        ) : (
          <button type="button" onClick={state.pause}>Pause</button>
        )}
        <button type="button" onClick={state.reset}>Reset</button>
      </div>
    </section>
  );
}
