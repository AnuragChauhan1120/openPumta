'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStopwatchStore } from '@/store/useStopwatchStore';

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function Stopwatch() {
  const { startedAt, accumulatedMs, start, pause, resume, reset } = useStopwatchStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  const elapsedMs = accumulatedMs + (startedAt === null ? 0 : Math.max(0, now - startedAt));

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-4xl font-bold tabular-nums tracking-tight leading-none transition-colors duration-500">
        {formatTime(elapsedMs)}
      </div>
      <div className="flex items-center gap-2">
        {startedAt === null ? (
          <Button onClick={accumulatedMs === 0 ? start : resume}>
            {accumulatedMs === 0 ? 'Start' : 'Resume'}
          </Button>
        ) : (
          <Button onClick={pause}>Pause</Button>
        )}
        <Button variant="outline" onClick={reset}>Reset</Button>
      </div>
    </div>
  );
}
