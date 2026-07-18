import { describe, expect, it } from 'vitest';
import { countHistoryByType, formatRemainingText, getVisibleHistory } from './historyPresentation';

describe('formatRemainingText', () => {
  it('hiển thị số ngày còn lại', () => {
    expect(formatRemainingText(12)).toBe('HSD còn 12 ngày');
  });

  it('hiển thị hạn hôm nay', () => {
    expect(formatRemainingText(0)).toBe('Hết hạn hôm nay');
  });

  it('hiển thị số ngày đã trễ', () => {
    expect(formatRemainingText(-3)).toBe('Đã trễ 3 ngày');
  });

  it('lọc, sắp xếp và đếm lịch sử theo trạng thái đang hiển thị', () => {
    const items = [
      { id: 'safe', alertType: 'safe' as const, alertWeight: 4 },
      { id: 'danger', alertType: 'danger' as const, alertWeight: 1 },
      { id: 'other', alertType: 'other' as const, alertWeight: 3 },
    ];

    expect(getVisibleHistory(items, new Set(['safe', 'danger']), true).map((item) => item.id)).toEqual(['danger', 'safe']);
    expect(countHistoryByType(items)).toMatchObject({ all: 3, safe: 1, danger: 1, other: 1, expired: 0 });
  });
});
