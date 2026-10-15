export function getStartOfDay(startOfDayOffset: string, date: Date = new Date()): Date {
  const [offsetHours, offsetMinutes] = startOfDayOffset.split(':').map(Number);

  const targetDate = new Date(date);

  // If the current time is before the startOfDayOffset, we belong to the "previous" day logically
  const currentHours = targetDate.getHours();
  const currentMinutes = targetDate.getMinutes();

  if (
    currentHours < offsetHours ||
    (currentHours === offsetHours && currentMinutes < offsetMinutes)
  ) {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  targetDate.setHours(offsetHours, offsetMinutes, 0, 0);
  return targetDate;
}

export function getEndOfDay(startOfDayOffset: string, date: Date = new Date()): Date {
  const startOfDay = getStartOfDay(startOfDayOffset, date);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setMilliseconds(endOfDay.getMilliseconds() - 1);
  return endOfDay;
}

/**
 * Day window for a calendar date picked in the UI ("YYYY-MM-DD", local).
 * The window runs from that date at `startOfDayOffset` to the next day at the same time.
 * Today resolves to the current logical day, which is still yesterday before the offset.
 *
 * Don't use `new Date(dateStr)` for this: date-only strings parse as UTC midnight, which
 * lands on the previous local day west of UTC and before the offset everywhere else.
 */
export function getDayWindow(startOfDayOffset: string, dateStr?: string): { from: Date; to: Date } {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!dateStr || dateStr === todayStr) {
    return { from: getStartOfDay(startOfDayOffset, now), to: getEndOfDay(startOfDayOffset, now) };
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const [offsetHours, offsetMinutes] = startOfDayOffset.split(':').map(Number);
  const from = new Date(year, month - 1, day, offsetHours, offsetMinutes, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  to.setMilliseconds(to.getMilliseconds() - 1);
  return { from, to };
}
