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

export interface PresentationResult {
  mainLabel: string;
  mainText: string;
  subLines: string[];
}

export function formatPresentationResult(output: ReturnBusinessResult): PresentationResult {
  const mainLabel = output.isExpiredProduct || output.isShortProduct ? 'Hạn sử dụng' : 'Ngày lùi hàng';
  const mainText = `${mainLabel}: <strong>${output.dateStr}</strong>`;
  const subLines = output.isExpiredProduct
    ? [`[${output.alert.label}]`]
    : output.isShortProduct
      ? [`[${output.alert.label}]`, `Sử dụng đến hết ngày ${output.dateStr}`]
      : [`[${output.alert.label}]`, `HSD còn ${output.daysRemaining} ngày`];
  return { mainLabel, mainText, subLines };
}

export function getFriendlyErrorMessage(message: string): string {
  if (message.includes('Vui lòng nhập Ngày sản xuất')) {
    return '⚠️ <b>Thiếu Ngày sản xuất:</b> Vui lòng điền ngày in trên bao bì (hoặc bật lịch chọn) trước khi tra cứu.';
  }
  if (message.includes('Ngày sản xuất không đúng định dạng')) {
    return '⚠️ <b>Sai Ngày sản xuất:</b> Định dạng chuẩn là Ngày/Tháng/Năm (Ví dụ: 10/06/2026).';
  }
  if (message.includes('Vui lòng nhập Hạn sử dụng')) {
    return '⚠️ <b>Thiếu Hạn sử dụng:</b> Hãy nhập 1 trong 3 ô: Chọn Ngày cụ thể, điền Số ngày, hoặc điền Số tháng.';
  }
  if (message.includes('Hạn sử dụng không đúng định dạng')) {
    return '⚠️ <b>Sai định dạng Ngày HSD:</b> Vui lòng kiểm tra lại ô Ngày HSD (Ví dụ: 25/06/2026).';
  }
  if (message.includes('Hạn sử dụng phải lớn hơn')) {
    return '⚠️ <b>Lỗi biên ngày:</b> Hạn sử dụng bắt buộc phải nằm sau Ngày sản xuất. Vui lòng kiểm tra lại năm hoặc tháng.';
  }
  if (message.includes('chưa thể tính ngược')) {
    return '⚠️ <b>Thiếu dữ liệu tra ngược:</b> Hãy nhập Ngày HSD kèm theo Số ngày (hoặc Số tháng) để hệ thống tìm ra Ngày sản xuất.';
  }
  return '⚠️ <b>Không thể tra cứu:</b> Đã xảy ra lỗi không mong muốn. Vui lòng kiểm tra lại dữ liệu nhập.';
}

