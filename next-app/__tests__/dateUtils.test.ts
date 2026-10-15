import { describe, it, expect, afterEach, vi } from 'vitest';
import { getDayWindow } from '@/lib/dateUtils';

describe('getDayWindow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a past date at the offset on that local calendar day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 14, 0));

    const { from, to } = getDayWindow('05:00', '2026-10-10');

    expect([from.getFullYear(), from.getMonth(), from.getDate()]).toEqual([2026, 9, 10]);
    expect([from.getHours(), from.getMinutes()]).toEqual([5, 0]);
    expect([to.getMonth(), to.getDate(), to.getHours(), to.getMinutes()]).toEqual([9, 11, 4, 59]);
  });

  it('resolves today to the current logical day after the offset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 14, 0));

    const { from } = getDayWindow('05:00', '2026-10-16');

    expect([from.getDate(), from.getHours()]).toEqual([16, 5]);
  });

  it('keeps today on the previous logical day before the offset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 2, 0));

    const { from, to } = getDayWindow('05:00', '2026-10-16');

    expect([from.getDate(), from.getHours()]).toEqual([15, 5]);
    expect(to.getTime()).toBeGreaterThan(Date.now());
  });
});
