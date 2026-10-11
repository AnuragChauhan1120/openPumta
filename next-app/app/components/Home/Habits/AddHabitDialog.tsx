import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useCreateHabit, HabitDifficulty } from '@/hooks/useHabits';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { toast } from 'sonner';
import { DIFFICULTY_OPTIONS } from './constants';

interface AddHabitDialogProps {
  subjects?: { id: number; name: string; color?: string; deleted?: boolean }[];
  habitsCount: number;
}

export function AddHabitDialog({ subjects, habitsCount }: AddHabitDialogProps) {
  const { user } = useAuthStore();
  const createHabit = useCreateHabit();
  const { hasSeenOnboarding, onboardingChoice, hasSeenConfetti } = useOnboardingStore();

  const showNudge = habitsCount === 0 && onboardingChoice !== null && !hasSeenConfetti;

  const [isOpen, setIsOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDifficulty, setAddDifficulty] = useState<HabitDifficulty>('MID');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [addAutoCompleteMins, setAddAutoCompleteMins] = useState<string>('2');
  const [addBadDayPlan, setAddBadDayPlan] = useState('');

  const activeSubjects = useMemo(() => subjects?.filter((s) => !s.deleted) ?? [], [subjects]);

  const resetAddForm = () => {
    setAddName('');
    setAddDifficulty('MID');
    setSelectedSubjectIds([]);
    setAddAutoCompleteMins('2');
    setAddBadDayPlan('');
  };

  const handleOpenChange = (open: boolean) => {
    if (open && !hasSeenOnboarding) return;
    setIsOpen(open);
    if (!open) resetAddForm();
  };

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !addName.trim()) return;

    if (habitsCount >= 6) {
      toast.error('You can only track up to 6 habits at a time.');
      return;
    }

    createHabit.mutate(
      {
        name: addName.trim(),
        difficulty: addDifficulty,
        subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
        badDayPlan: addBadDayPlan.trim() || undefined,
        autoCompleteTime:
          selectedSubjectIds.length > 0 && addAutoCompleteMins
            ? Math.max(1, parseInt(addAutoCompleteMins)) * 60
            : null,
      },
      {
        onSuccess: () => {
          resetAddForm();
          setIsOpen(false);
          toast.success('Habit added');
        },
        onError: (err: unknown) => {
          toast.error(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to add habit',
          );
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={habitsCount >= 6}
          className={showNudge && habitsCount < 6 ? 'nudge-strobe' : ''}
          data-tour-highlight="add-habit-btn"
        >
          Add Habit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add New Habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddHabit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Habit Name
            </Label>
            <Input
              placeholder="e.g. Read 30 minutes"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Difficulty
            </Label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAddDifficulty(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    addDifficulty === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className={addDifficulty === opt.value ? '' : opt.color}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Linked Subjects
              <span className="ml-1 normal-case font-normal text-muted-foreground/60">
                (optional)
              </span>
            </Label>
            {activeSubjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active subjects available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto">
                {activeSubjects.map((s) => {
                  const isChecked = selectedSubjectIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                        isChecked
                          ? 'border-primary bg-primary/10'
                          : 'bg-muted/10 hover:bg-muted/30 border-muted-foreground/10',
                      )}
                    >
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleSubject(s.id)} />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: s.color || '#f97316' }}
                        />
                        <span className="text-sm font-medium leading-none truncate">{s.name}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {selectedSubjectIds.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Auto-Complete Time (mins)
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 2 (fallback to subject goal if empty)"
                value={addAutoCompleteMins}
                onChange={(e) => setAddAutoCompleteMins(e.target.value)}
              />
            </div>
          )}

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary/90 mt-2 leading-relaxed">
            <strong>Pro Tip:</strong>
            {` On days when you have zero energy, complete a minimum baseline (e.g., "Do 1 pushup") to keep your streak alive. The goal is to never throw up a zero.`}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bad Day Plan <span className="normal-case opacity-70">(Optional)</span>
            </Label>
            <Input
              placeholder="e.g. Do 1 pushup"
              value={addBadDayPlan}
              onChange={(e) => setAddBadDayPlan(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-1">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createHabit.isPending || !addName.trim()}>
              {createHabit.isPending ? 'Adding...' : 'Add Habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
