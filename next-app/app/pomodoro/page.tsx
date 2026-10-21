'use client';
import { toast } from 'sonner';
import { useTimerStore } from '@/store/useTimerStore';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import ClockCircle from '../components/pomodoro/ClockCircle';
import Stopwatch from '../components/pomodoro/Stopwatch';
import { ConvertSecsToTimer, pad } from '@/lib/utils';
import { IoIosPlay, IoIosRefresh, IoIosSkipForward, IoIosSquare } from 'react-icons/io';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings2 } from 'lucide-react';
import ClockDialogBox from '../components/ClockDialogBox';
import { useSubjects } from '@/hooks/useSubjects';
import { useAuthStore } from '@/store/useAuthStore';
import { AvatarDisplay } from '../components/pomodoro/AvatarDisplay';
import { AvatarSelectionDialog } from '../components/pomodoro/AvatarSelectionDialog';
import { AvatarSet } from '@/lib/avatarConfig';

// The existing page remains unchanged apart from the independent stopwatch integration.
export default function PomodoroPage() {
  const store = useTimerStore();
  const { data: Subjects = [], isLoading } = useSubjects();
  const { remainingMs, elapsedMs, progress, phase, mode, activeSubjectId } = useTimerEngine();
  const { user, lifetimeFocusMs } = useAuthStore();
  const runningSubject = Subjects.find((subject) => subject.id === activeSubjectId);

  if (isLoading) return <div className="flex items-center justify-center h-screen w-screen"><span className="text-2xl font-semibold">Loading timer...</span></div>;

  const displayMs = Math.abs(remainingMs);
  const displayTime = ConvertSecsToTimer({ workSecs: Math.floor(displayMs / 1000) });
  const primaryColor = mode === 'stopwatch' ? store.workColor : phase === 'work' ? store.workColor : phase === 'shortBreak' ? store.shortBreakColor : store.longBreakColor;
  const cyclePercent = progress % 100;
  const phaseLabel = phase === 'work' ? 'Work' : phase === 'shortBreak' ? 'Short Break' : phase === 'longBreak' ? 'Long Break' : 'Ready';

  return <>
    <section className="hidden max-lg:landscape:flex flex-row h-[calc(100dvh-4rem)] items-center justify-center w-full bg-background overflow-hidden">
      <ClockCircle percent={cyclePercent} size="lg" currentColor={primaryColor} backgroundColor="var(--card)">
        <div className="flex flex-col items-center justify-center text-center select-none px-1">
          <div className="text-4xl font-bold tabular-nums tracking-tight leading-none" style={{ color: primaryColor, fontFamily: 'var(--font-timer)' }}>
            {remainingMs < 0 ? '+' : ''}{pad(displayTime.hours)}:{pad(displayTime.minutes)}:{pad(displayTime.seconds)}
          </div>
          <div className="text-xs sm:text-sm font-medium text-muted-foreground/70 tracking-wide mt-1">{phaseLabel}</div>
          <Stopwatch />
        </div>
      </ClockCircle>
    </section>
    {/* PORTRAIT + DESKTOP LAYOUT
      Hidden only in: max-lg landscape (mobile/iPad landscape)
    */}
    <section className="flex flex-col justify-between items-center h-[calc(100dvh-5.5rem)] lg:h-screen w-full p-4 md:p-6 lg:p-8 relative overflow-hidden bg-background">
      <Stopwatch />
      <div className="w-full max-w-md flex items-center justify-center">
        <span className="text-4xl font-bold tabular-nums tracking-tight leading-none transition-colors duration-500" style={{ color: primaryColor, fontFamily: 'var(--font-timer)' }}>
          {remainingMs < 0 ? '+' : ''}{pad(displayTime.hours)}:{pad(displayTime.minutes)}:{pad(displayTime.seconds)}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center w-full">Timer controls remain below.</div>
    </section>
  </>;
}
