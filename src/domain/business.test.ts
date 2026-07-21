import { describe, expect, it } from 'vitest';
import { processReturnBusinessLogic, formatPresentationResult, getFriendlyErrorMessage } from './business';

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

  it('dùng hạn lùi từ đúng mốc 10 ngày và cảnh báo theo khoảng 20–40%', () => {
    const result = processReturnBusinessLogic('01/07/2026', '10/07/2026', new Date(2026, 6, 6));
    expect(result.isShortProduct).toBe(false);
    expect(result.dateStr).toBe('08/07/2026');
    expect(result.alert.type).toBe('warning');
  });

  it('đánh dấu danger khi hôm nay đúng hạn lùi', () => {
    const result = processReturnBusinessLogic('01/07/2026', '30/07/2026', new Date(2026, 6, 24));
    expect(result.dateStr).toBe('24/07/2026');
    expect(result.alert).toMatchObject({ type: 'danger', label: 'Đến hạn lùi hàng' });
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

describe('formatPresentationResult', () => {
  it('định dạng sản phẩm an toàn ngắn ngày', () => {
    const res = processReturnBusinessLogic('14/07/2026', '20/07/2026', NOW);
    const pres = formatPresentationResult(res);
    expect(pres.mainLabel).toBe('Hạn sử dụng');
    expect(pres.subLines).toContain('[An toàn]');
    expect(pres.subLines).toContain('Sử dụng đến hết ngày 20/07/2026');
  });

  it('định dạng sản phẩm hết HSD', () => {
    const res = processReturnBusinessLogic('01/06/2026', '14/07/2026', NOW);
    const pres = formatPresentationResult(res);
    expect(pres.mainLabel).toBe('Hạn sử dụng');
    expect(pres.subLines).toEqual(['[Đã hết HSD]']);
  });

  it('định dạng sản phẩm dài ngày', () => {
    const res = processReturnBusinessLogic('01/07/2026', '30/07/2026', NOW);
    const pres = formatPresentationResult(res);
    expect(pres.mainLabel).toBe('Ngày lùi hàng');
    expect(pres.subLines).toContain('[An toàn]');
    expect(pres.subLines).toContain('HSD còn 16 ngày');
  });
});

describe('getFriendlyErrorMessage', () => {
  it('bản đồ thông báo lỗi hợp lý', () => {
    expect(getFriendlyErrorMessage('Vui lòng nhập Ngày sản xuất')).toContain('Thiếu Ngày sản xuất');
    expect(getFriendlyErrorMessage('ngẫu nhiên')).toContain('Không thể tra cứu');
  });
});

