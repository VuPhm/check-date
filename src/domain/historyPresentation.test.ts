import { describe, expect, it } from 'vitest';
import { formatRemainingText } from './historyPresentation';

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
});
