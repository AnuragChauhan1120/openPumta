import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddSubjectDialog } from '../app/components/Home/Subjects/AddSubjectDialog';
import { AddHabitDialog } from '../app/components/Home/Habits/AddHabitDialog';
import { useOnboardingStore } from '../store/useOnboardingStore';

vi.mock('@/hooks/useSubjects', () => ({
  useCreateSubject: () => ({ mutate: vi.fn(), isPending: false }),
  useArchivedSubjects: () => ({ data: [] }),
  useRestoreSubject: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useHabits', () => ({
  useCreateHabit: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 1, name: 'Test' } }),
}));

describe('AddSubjectDialog and AddHabitDialog strobe nudge behavior', () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      hasSeenOnboarding: true,
      onboardingChoice: 'fresh',
      hasSeenConfetti: false,
    });
  });

  it('does NOT apply nudge-strobe when subjects exist (empty=false)', () => {
    const { getByRole } = render(<AddSubjectDialog habits={[]} empty={false} />);
    const button = getByRole('button', { name: /\+ Add Subject/i });
    expect(button.className).not.toContain('nudge-strobe');
  });

  it('applies nudge-strobe when no subjects exist (empty=true)', () => {
    const { getByRole } = render(<AddSubjectDialog habits={[]} empty={true} />);
    const button = getByRole('button', { name: /\+ Add Subject/i });
    expect(button.className).toContain('nudge-strobe');
  });

  it('does NOT apply nudge-strobe to AddHabit button when user already has habits', () => {
    const { getByRole } = render(<AddHabitDialog habitsCount={2} subjects={[]} />);
    const button = getByRole('button', { name: /Add Habit/i });
    expect(button.className).not.toContain('nudge-strobe');
  });
});
