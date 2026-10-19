'use client';
import { toast } from 'sonner';
import { useTimerStore } from '@/store/useTimerStore';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import ClockCircle from '../components/pomodoro/ClockCircle';
import Stopwatch from '@/app/components/pomodoro/Stopwatch';
import { convertSecsToTimer, pad } from '@/lib/utils';
import { IoIosPlay, IoIosRefresh, IoIosSkipForward, IoIosSquare } from 'react-icons/io';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings2 } from 'lucide-react';
import ClockDialogBox from '../components/ClockDialogBox';
import { useSubjects } from '@/hooks/useSubjects';
import { useAuthStore } from '@/store/useAuthStore';
import AvatarDisplay from '../components/pomodoro/AvatarDisplay';
import AvatarSelectionDialog from '../components/pomodoro/AvatarSelectionDialog';
import { AvatarSet } from '@/lib/avatarConfig';

function PomodoroPage() {
  const { data: Subjects = [], isLoading } = useSubjects();
  const store = useTimerStore();
  const { remainingMs, elapsedMs, progress, phase, mode, activeSubjectId } = useTimerEngine();
  const { user, lifetimeFocusMs } = useAuthStore();
  const runningSubject = Subjects.find((subject) => subject.id === activeSubjectId);
  const handleMainAction = async () => {
    if (phase === 'work') await store.endWork(true);
    else if (phase === 'idle') {
      if (activeSubjectId) await store.startWork(activeSubjectId);
      else if (Subjects.length > 0) await store.startWork(Subjects[0].id);
      else toast.error('Please create a subject on the dashboard first!');
    }
  };
  const handleSkip = () => { if (phase === 'shortBreak' || phase === 'longBreak') store.skipBreak(); };
  const handleReset = () => { if (confirm('Are you sure you want to reset the entire cycle?')) store.reset(); };
  if (isLoading) return <div className="flex items-center justify-center h-screen w-screen"><span className="text-2xl font-semibold">Loading timer...</span></div>;
  const isOverflow = remainingMs < 0;
  const displayTime = convertSecsToTimer({ workSecs: Math.floor(Math.abs(remainingMs) / 1000) });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const activeWorkSecs = phase === 'work' ? Math.floor(elapsedMs / 1000) : 0;
  const currentFocusMs = lifetimeFocusMs + activeWorkSecs * 1000;
  const activeAvatar = (user?.activeAvatar as AvatarSet) || 'warrior';
  const getSubjectLogSecs = (log: NonNullable<(typeof Subjects)[number]['subjectLogs']>[number]) => log.durationSecs ?? log.duration ?? (log.endedAt ? Math.max(0, Math.floor((new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)) : 0);
  const getTodayWorkedSecs = (subject: (typeof Subjects)[number]) => [...(subject.subjectLogs || [])].filter((log) => new Date(log.startedAt).getTime() >= startOfToday).reduce((acc, log) => acc + getSubjectLogSecs(log), 0);
  const runningSubjectWorkedSecs = runningSubject ? getTodayWorkedSecs(runningSubject) + activeWorkSecs : 0;
  const subjectWorkedSecs = Subjects.reduce((acc, subject) => acc + getTodayWorkedSecs(subject), 0) + activeWorkSecs;
  let goalWorkSecs = 0;
  if (runningSubject) goalWorkSecs = runningSubject.goalWorkSecs || 0;
  const isBreak = phase === 'shortBreak' || phase === 'longBreak';
  const goalProgressPercent = goalWorkSecs ? Math.min(100, (subjectWorkedSecs / goalWorkSecs) * 100) : 0;
  const formatDuration = (secs: number) => `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(Math.floor(secs % 60))}`;
  const getPhaseColor = () => mode === 'stopwatch' ? store.workColor : phase === 'work' ? store.workColor : phase === 'shortBreak' ? store.shortBreakColor : phase === 'longBreak' ? store.longBreakColor : 'var(--muted-foreground)';
  const getPhaseLabel = () => mode === 'stopwatch' ? 'STOPWATCH' : phase === 'work' ? 'WORK, PHASE' : phase === 'shortBreak' ? 'SHORT BREAK' : phase === 'longBreak' ? 'LONG BREAK' : 'READY';
  const primaryColor = getPhaseColor();
  const secondaryColor = `color-mix(in srgb, ${primaryColor} 50%, white)`;
  const loopIndex = Math.floor(progress / 100);
  const cyclePercent = progress % 100;
  const phaseLabel = getPhaseLabel().charAt(0).toUpperCase() + getPhaseLabel().slice(1).toLowerCase();
  return (
    <>
      <section className="hidden max-lg:landscape:flex flex-row h-[calc(100dvh-4rem)] items-center justify-center w-full bg-background overflow-hidden">
        <div className="flex items-center justify-center shrink-0 pl-3 py-2"><ClockCircle percent={cyclePercent} size="lg" currentColor={primaryColor} backgroundColor={secondaryColor}><div className="flex flex-col items-center justify-center text-center select-none px-1"><Stopwatch /><div className="text-xs text-muted-foreground/70 tracking-wide mt-1">{phaseLabel}</div><div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-muted-foreground/70"><div className="min-w-0"><div className="truncate text-[10px] sm:text-xs font-medium text-muted-foreground/50">{runningSubject?.name || 'Subject'}</div><div className="text-xs sm:text-base tabular-nums" style={{ fontFamily: 'var(--font-timer)' }}>{formatDuration(runningSubjectWorkedSecs)}</div></div><div className="min-w-0"><div className="truncate text-[10px] sm:text-xs font-medium text-muted-foreground/50">Total today</div><div className="text-xs sm:text-base tabular-nums" style={{ fontFamily: 'var(--font-timer)' }}>{formatDuration(subjectWorkedSecs)}</div></div></div></div></ClockCircle>{runningSubject && store.showProgressBar && <div className="w-full max-w-xs sm:max-w-md mt-2"><Progress value={goalProgressPercent} className="h-2.5 sm:h-4 transition-all" /></div>}</div><div className="flex flex-col items-center justify-center gap-6 pr-3 shrink-0"><Button onClick={handleReset} variant="outline" className="rounded-full w-9 h-9"><IoIosRefresh size={15}/></Button>{(phase === 'work' || phase === 'idle') ? <Button onClick={handleMainAction} variant="secondary" className="rounded-full w-12 h-12">{phase === 'work' ? <IoIosSquare size={22}/> : <IoIosPlay size={26}/>}</Button> : <div className="w-12 h-12"/>}{isBreak ? <Button onClick={handleSkip} variant="outline" className="rounded-full w-9 h-9"><IoIosSkipForward size={15}/></Button> : <div className="w-9 h-9"/>}</div></section>
      {/* PORTRAIT + DESKTOP LAYOUT — preserved layout with shared stopwatch component */}
      <section className="flex flex-col justify-between items-center h-[calc(100dvh-5.5rem)] lg:h-screen w-full p-4 md:p-6 lg:p-8 relative overflow-hidden bg-background max-lg:landscape:hidden">
        <div className="w-full max-w-md flex items-center justify-center px-4 py-2 shrink-0 relative">{runningSubject && <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-center truncate mx-2 text-foreground px-8">{runningSubject.name}</h1>}<div className="absolute right-4 top-1/2 -translate-y-1/2"><ClockDialogBox child={<Button variant="ghost" size="icon" className="rounded-full text-muted-foreground/60 hover:text-muted-foreground"><Settings2 className="h-5 w-5" /></Button>} /></div></div>
        <div className="flex-1 flex flex-col justify-center items-center w-full px-4 md:px-10 gap-2 overflow-hidden"><ClockCircle percent={cyclePercent} size="lg" currentColor={primaryColor} backgroundColor={secondaryColor}><div className="flex flex-col items-center justify-center p-2 text-center select-none"><Stopwatch /><div className="text-xs sm:text-sm text-muted-foreground/70 tracking-wide mt-1">{phaseLabel}</div><div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-muted-foreground/70"><div className="min-w-0"><div className="truncate text-[10px] sm:text-xs font-medium text-muted-foreground/50">{runningSubject?.name || 'Subject'}</div><div className="text-xs sm:text-base tabular-nums" style={{ fontFamily: 'var(--font-timer)' }}>{formatDuration(runningSubjectWorkedSecs)}</div></div><div className="min-w-0"><div className="truncate text-[10px] sm:text-xs font-medium text-muted-foreground/50">Total today</div><div className="text-xs sm:text-base tabular-nums" style={{ fontFamily: 'var(--font-timer)' }}>{formatDuration(subjectWorkedSecs)}</div></div></div></div></ClockCircle>{runningSubject && store.showProgressBar && <div className="w-full max-w-xs sm:max-w-md mt-2"><Progress value={goalProgressPercent} className="h-2.5 sm:h-4 transition-all" /></div>}</div>
        <div className="flex items-center gap-6 md:gap-8 pb-6 sm:pb-8 shrink-0"><Button onClick={handleReset} variant="outline" className="rounded-full w-12 h-12 sm:w-14 sm:h-14"><IoIosRefresh size={20}/></Button>{(phase === 'work' || phase === 'idle') ? <Button onClick={handleMainAction} variant="secondary" className="rounded-full w-20 h-20 sm:w-24 sm:h-24 shadow-lg hover:scale-105 transition-all flex items-center justify-center">{phase === 'work' ? <IoIosSquare size={32}/> : <IoIosPlay size={40}/>}</Button> : <div className="w-20 h-20 sm:w-24 sm:h-24"/>}{isBreak ? <Button onClick={handleSkip} variant="outline" className="rounded-full w-12 h-12 sm:w-14 sm:h-14"><IoIosSkipForward size={20}/></Button> : <div className="w-12 h-12 sm:w-14 sm:h-14"/>}</div>
      </section>
    </>
  );
}

export default PomodoroPage;
