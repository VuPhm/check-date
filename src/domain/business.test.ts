import { describe, expect, it } from 'vitest';
import { processReturnBusinessLogic } from './business';

const NOW = new Date(2026, 6, 15, 10, 30);

describe('processReturnBusinessLogic', () => {
  it('giữ nguyên quy tắc hàng ngắn ngày', () => {
    const result = processReturnBusinessLogic('14/07/2026', '20/07/2026', NOW);
    expect(result.isShortProduct).toBe(true);
    expect(result.dateStr).toBe('20/07/2026');
    expect(result.alert.type).toBe('safe');
  });

  it('tính hạn lùi 20% cho hàng dài ngày', () => {
    const result = processReturnBusinessLogic('01/07/2026', '30/07/2026', NOW);
    expect(result.dateStr).toBe('24/07/2026');
    expect(result.alert.type).toBe('safe');
  });

  it('đánh dấu sản phẩm đã hết HSD', () => {
    const result = processReturnBusinessLogic('01/06/2026', '14/07/2026', NOW);
    expect(result.isExpiredProduct).toBe(true);
    expect(result.alert.type).toBe('expired');
  });

  it('từ chối HSD trước NSX', () => {
    expect(() => processReturnBusinessLogic('20/07/2026', '19/07/2026', NOW)).toThrow();
  });
});
