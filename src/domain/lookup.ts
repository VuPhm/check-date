import { formatLocalDate, MS_PER_DAY, parseLocalDate } from './date';
import type { AlertType, ReturnBusinessResult } from './types';

export type LookupMode = 'forward' | 'backward';
export type LookupSyncSource = 'date' | 'days' | 'months';

export interface LookupDateFields {
  nsx: string;
  hsdDate: string;
  hsdDays: string;
  hsdMonths: string;
}

export interface LookupCalculationInput extends LookupDateFields {
  mode: LookupMode;
}

export interface LookupHistoryIdentity {
  nsx: string;
  rawHsdDate: string;
  rawHsdDays: string | number;
  formattedHsd: string;
  barcode?: string;
  tenHang?: string;
}

export interface LookupHistoryPayload extends LookupHistoryIdentity {
  result: string;
  daysRemaining: number;
  alertClass: string;
  alertLabel: string;
  alertType: AlertType | 'other';
  alertWeight: number;
  isShortProduct: boolean;
  isExpiredProduct: boolean;
  tenHang: string;
  quantity: number | '';
  dvt: string;
  checkedAt: string;
}

export interface LookupHistoryPayloadInput {
  nsx: string;
  hsdDate: string;
  hsdDays: string;
  barcode: string;
  tenHang: string;
  quantity: number | '';
  dvt: string;
}

export function buildLookupHistoryPayload(
  input: LookupHistoryPayloadInput,
  result: ReturnBusinessResult,
  checkedAt = new Date().toISOString(),
): LookupHistoryPayload {
  return {
    nsx: input.nsx,
    rawHsdDate: input.hsdDate,
    rawHsdDays: input.hsdDays || Math.round((parseLocalDate(input.hsdDate).getTime() - parseLocalDate(input.nsx).getTime()) / MS_PER_DAY) + 1,
    formattedHsd: result.formattedHsd,
    result: result.dateStr,
    daysRemaining: result.daysRemaining,
    alertClass: result.alert.class,
    alertLabel: result.alert.label,
    alertType: result.isShortProduct ? 'other' : result.alert.type,
    alertWeight: result.alert.weight,
    isShortProduct: result.isShortProduct,
    isExpiredProduct: result.isExpiredProduct,
    barcode: input.barcode,
    tenHang: input.tenHang,
    quantity: input.quantity,
    dvt: input.dvt,
    checkedAt,
  };
}

/**
 * A lookup saved before product identification is supplied is only a temporary
 * placeholder. Once that same date lookup is saved with a barcode, discard the
 * anonymous placeholder while retaining every barcode-specific lookup.
 */
export function isAnonymousLookupSupersededByBarcode(
  candidate: LookupHistoryIdentity,
  identifiedLookup: LookupHistoryIdentity,
): boolean {
  return Boolean(identifiedLookup.barcode?.trim())
    && !candidate.barcode?.trim()
    && !candidate.tenHang?.trim()
    && candidate.nsx === identifiedLookup.nsx
    && candidate.rawHsdDate === identifiedLookup.rawHsdDate
    && String(candidate.rawHsdDays) === String(identifiedLookup.rawHsdDays)
    && candidate.formattedHsd === identifiedLookup.formattedHsd;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const parsed = parseLocalDate(value);
  return !Number.isNaN(parsed.getTime()) && formatLocalDate(parsed) === value;
}

export function validateLookupCalculation(input: LookupCalculationInput): void {
  const { mode, nsx, hsdDate, hsdDays, hsdMonths } = input;
  if (mode === 'forward') {
    if (!nsx) throw new Error('Vui lòng nhập Ngày sản xuất (NSX).');
    if (!isValidDateString(nsx)) throw new Error('Ngày sản xuất không đúng định dạng (dd/mm/yyyy).');
    if (!hsdDate && !hsdDays && !hsdMonths) throw new Error('Vui lòng nhập Hạn sử dụng (chọn Ngày, điền Số ngày hoặc Số tháng).');
    if (hsdDate && !isValidDateString(hsdDate)) throw new Error('Hạn sử dụng không đúng định dạng ngày (dd/mm/yyyy).');
  } else {
    if (!hsdDate && !hsdDays && !hsdMonths) throw new Error('Vui lòng nhập dữ liệu Hạn sử dụng để tra ngược về NSX.');
    if (hsdDate && !isValidDateString(hsdDate)) throw new Error('Hạn sử dụng đã nhập không đúng định dạng ngày (dd/mm/yyyy).');
    if (!nsx) throw new Error('Hệ thống chưa thể tính ngược ra Ngày sản xuất. Vui lòng kiểm tra lại số liệu.');
  }

  if (isValidDateString(nsx) && isValidDateString(hsdDate) && parseLocalDate(hsdDate) <= parseLocalDate(nsx)) {
    throw new Error('Hạn sử dụng phải lớn hơn Ngày sản xuất ít nhất 1 ngày.');
  }
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
