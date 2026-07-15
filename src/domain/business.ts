import type { BusinessAlert, ReturnBusinessResult } from './types';
import { formatLocalDate, getCleanToday, MS_PER_DAY, parseLocalDate } from './date';

export function processReturnBusinessLogic(
  nsxStr: string,
  hsdDateStr: string,
  now = new Date(),
): ReturnBusinessResult {
  const nsx = parseLocalDate(nsxStr);
  const hsd = parseLocalDate(hsdDateStr);
  const shelfLifeDays = Math.round((hsd.getTime() - nsx.getTime()) / MS_PER_DAY) + 1;

  if (shelfLifeDays <= 0) {
    throw new Error('Hạn sử dụng không thể nhỏ hơn ngày sản xuất.');
  }

  const today = getCleanToday(now);
  const daysRemainingShelfLife = Math.round((hsd.getTime() - today.getTime()) / MS_PER_DAY) + 1;
  const dayThreshold20 = Math.round(shelfLifeDays * 0.2);
  const returnDate = shelfLifeDays < 10
    ? hsd
    : new Date(hsd.getTime() - dayThreshold20 * MS_PER_DAY);

  if (daysRemainingShelfLife <= 0) {
    return {
      isExpiredProduct: true,
      isShortProduct: shelfLifeDays < 10,
      formattedHsd: formatLocalDate(hsd),
      dateStr: formatLocalDate(returnDate),
      daysRemaining: daysRemainingShelfLife,
      alert: { class: 'state-expired', label: 'Đã hết HSD', weight: 0, type: 'expired' },
    };
  }

  if (shelfLifeDays < 10) {
    return {
      isExpiredProduct: false,
      isShortProduct: true,
      formattedHsd: formatLocalDate(hsd),
      dateStr: formatLocalDate(hsd),
      daysRemaining: daysRemainingShelfLife,
      alert: { class: 'state-safe', label: 'An toàn', weight: 3, type: 'safe' },
    };
  }

  const dayThreshold40 = Math.round(shelfLifeDays * 0.4);
  const daysToReturnDate = Math.round((returnDate.getTime() - today.getTime()) / MS_PER_DAY);
  let alert: BusinessAlert;

  if (daysToReturnDate < 0) {
    alert = { class: 'state-danger', label: 'Đã qua hạn lùi', weight: 1, type: 'danger' };
  } else if (daysToReturnDate === 0) {
    alert = { class: 'state-danger', label: 'Đến hạn lùi hàng', weight: 1, type: 'danger' };
  } else if (daysToReturnDate <= dayThreshold40 - dayThreshold20) {
    alert = { class: 'state-warning', label: 'Sắp tới hạn lùi', weight: 2, type: 'warning' };
  } else {
    alert = { class: 'state-safe', label: 'An toàn', weight: 3, type: 'safe' };
  }

  return {
    isExpiredProduct: false,
    isShortProduct: false,
    formattedHsd: formatLocalDate(hsd),
    dateStr: formatLocalDate(returnDate),
    daysRemaining: daysRemainingShelfLife,
    alert,
  };
}
