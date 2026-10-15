import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function ConvertSecsToTimer({
  workSecs,
  goalWorkSecs,
}: {
  workSecs: number;
  goalWorkSecs?: number;
}) {
  const hours = Math.floor(workSecs / 3600);
  const minutes = Math.floor((workSecs % 3600) / 60);
  const seconds = Math.floor(workSecs % 60);
  let percent = 0;
  if (goalWorkSecs && goalWorkSecs > 0) {
    percent = Math.round((workSecs / goalWorkSecs) * 100);
  }
  return { hours, minutes, seconds, percent };
}
export function ConvertTimerToSecs({ hr, min, sec }: { hr: number; min: number; sec: number }) {
  return hr * 3600 + min * 60 + sec;
}
export const pad = (n: number) => String(n).padStart(2, '0');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Parse "YYYY-MM-DD" as local midnight. new Date('YYYY-MM-DD') is UTC midnight,
// which is the previous day for anyone west of UTC.
export function parseLocalIsoDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getLocalIsoDate(date: Date | string | number = new Date()): string {
  if (typeof date === 'string' && DATE_ONLY.test(date)) return date;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}
