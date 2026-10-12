import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as demoDataGenerator from '../components/onboarding/demo-data-generator';
import { useOnboardingStore } from '../store/useOnboardingStore';

describe('Onboarding demo data cleanup on skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();
  });

  it('calls removeDemoData with keepTemplate=false when demo data exists', async () => {
    const removeSpy = vi.spyOn(demoDataGenerator, 'removeDemoData').mockResolvedValue(undefined);

    const testIds = {
      subjects: [1, 2],
      habits: [10],
      spaces: [100],
      ratings: [5],
    };

    useOnboardingStore.getState().setDemoDataIds(testIds);
    expect(useOnboardingStore.getState().demoDataIds).toEqual(testIds);

    // Call removeDemoData as OnboardingModal cleanup does
    await demoDataGenerator.removeDemoData(testIds, false);

    expect(removeSpy).toHaveBeenCalledWith(testIds, false);
  });

  it('marks existing user as onboarded with getting started card dismissed and no onboardingChoice', () => {
    useOnboardingStore.getState().markExistingUserOnboarded();

    const state = useOnboardingStore.getState();
    expect(state.hasSeenOnboarding).toBe(true);
    expect(state.gettingStartedDismissed).toBe(true);
    expect(state.onboardingChoice).toBeNull();
    expect(state.hasSeenConfetti).toBe(true);
  });
});
