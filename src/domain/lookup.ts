import { formatLocalDate, MS_PER_DAY, parseLocalDate } from './date';

export type LookupMode = 'forward' | 'backward';
export type LookupSyncSource = 'date' | 'days' | 'months';

export interface LookupDateFields {
  nsx: string;
  hsdDate: string;
  hsdDays: string;
  hsdMonths: string;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const parsed = parseLocalDate(value);
  return !Number.isNaN(parsed.getTime()) && formatLocalDate(parsed) === value;
}

function positiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function addCalendarMonthsClamped(date: Date, months: number): Date {
  const targetMonthStart = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastTargetDay = new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth() + 1, 0).getDate();
  return new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth(), Math.min(date.getDate(), lastTargetDay));
}

export function syncLookupDates(
  fields: LookupDateFields,
  mode: LookupMode,
  source: LookupSyncSource,
): LookupDateFields {
  const next = { ...fields };

  if (source === 'date') {
    next.hsdMonths = '';
    if (isValidDateString(next.nsx) && isValidDateString(next.hsdDate)) {
      const days = Math.round((parseLocalDate(next.hsdDate).getTime() - parseLocalDate(next.nsx).getTime()) / MS_PER_DAY) + 1;
      next.hsdDays = days > 0 ? String(days) : '';
    } else {
      next.hsdDays = '';
    }
    return next;
  }

  if (source === 'days') {
    next.hsdMonths = '';
    const days = positiveInteger(next.hsdDays);
    if (mode === 'forward') {
      next.hsdDate = days && isValidDateString(next.nsx)
        ? formatLocalDate(new Date(parseLocalDate(next.nsx).getTime() + (days - 1) * MS_PER_DAY))
        : '';
    } else {
      next.nsx = days && isValidDateString(next.hsdDate)
        ? formatLocalDate(new Date(parseLocalDate(next.hsdDate).getTime() - (days - 1) * MS_PER_DAY))
        : '';
    }
    return next;
  }

  const months = positiveInteger(next.hsdMonths);
  if (mode === 'forward') {
    if (!months || !isValidDateString(next.nsx)) return { ...next, hsdDate: '', hsdDays: '' };
    const nsx = parseLocalDate(next.nsx);
    const hsd = addCalendarMonthsClamped(nsx, months);
    next.hsdDate = formatLocalDate(hsd);
    next.hsdDays = String(Math.round((hsd.getTime() - nsx.getTime()) / MS_PER_DAY) + 1);
  } else {
    if (!months || !isValidDateString(next.hsdDate)) return { ...next, nsx: '', hsdDays: '' };
    const hsd = parseLocalDate(next.hsdDate);
    const nsx = addCalendarMonthsClamped(hsd, -months);
    next.nsx = formatLocalDate(nsx);
    next.hsdDays = String(Math.round((hsd.getTime() - nsx.getTime()) / MS_PER_DAY) + 1);
  }
  return next;
}
