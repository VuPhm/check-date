import { describe, expect, it } from 'vitest';
import { buildKphLog } from './kphEntry';

const baseInput = {
  id: 'kph-1',
  type: 'TPCN' as const,
  detectedDate: '15/07/2026',
  detectedBy: 'Nhân viên A',
  sku: '8930001',
  productName: '',
  unit: 'EA' as const,
  quantity: 2,
  condition: 'Cận date',
  resolution: 'HỦY' as const,
  images: [new Blob(['evidence'], { type: 'image/jpeg' })],
};

describe('buildKphLog', () => {
  it('tạo phiếu mới ở trạng thái chờ duyệt', () => {
    const result = buildKphLog(baseInput);
    expect(result.trangThaiDuyet).toBe('cho_duyet');
    expect(result.loaiKph).toBe('TPCN');
    expect(result.images).toHaveLength(1);
  });

  it('chấp nhận tên hàng khi không có SKU', () => {
    const result = buildKphLog({ ...baseInput, sku: '', productName: 'Sữa tươi' });
    expect(result.tenHang).toBe('Sữa tươi');
  });

  it('từ chối khi thiếu cả SKU và tên hàng', () => {
    expect(() => buildKphLog({ ...baseInput, sku: '', productName: '' })).toThrow();
  });

  it('từ chối phiếu không có ảnh hoặc số lượng không hợp lệ', () => {
    expect(() => buildKphLog({ ...baseInput, images: [] })).toThrow();
    expect(() => buildKphLog({ ...baseInput, quantity: 0 })).toThrow();
  });
});
