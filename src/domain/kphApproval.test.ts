import { describe, expect, it } from 'vitest';
import { buildKphApprovalUpdate } from './kphApproval';

const APPROVED_AT = '15/07/2026 16:30:00';
const current = { id: 'kph-1', trangThaiDuyet: 'cho_duyet' as const, sku: '8930001' };

describe('buildKphApprovalUpdate', () => {
  it('ghi thời điểm khi chuyển sang đã duyệt', () => {
    const result = buildKphApprovalUpdate(current, {
      status: 'da_duyet', resolution: 'HỦY', approver: 'Cửa hàng trưởng',
    }, APPROVED_AT);
    expect(result.thoiGianDuyet).toBe(APPROVED_AT);
    expect(result.nguoiDuyet).toBe('Cửa hàng trưởng');
    expect(result.version).toBe(1);
    expect(Date.parse(result.updatedAt as string)).not.toBeNaN();
  });

  it('xóa thời điểm khi trả phiếu về chờ duyệt', () => {
    const result = buildKphApprovalUpdate({ ...current, trangThaiDuyet: 'da_duyet', thoiGianDuyet: 'cũ' }, {
      status: 'cho_duyet', resolution: 'HỦY',
    }, APPROVED_AT);
    expect(result.thoiGianDuyet).toBe('');
  });

  it('giữ thời điểm cũ khi chỉ cập nhật nội dung', () => {
    const result = buildKphApprovalUpdate({ ...current, trangThaiDuyet: 'da_duyet', thoiGianDuyet: '14/07/2026 10:00:00' }, {
      status: 'da_duyet', resolution: 'KHÁC', resolutionText: 'Chuyển công năng',
    }, APPROVED_AT);
    expect(result.thoiGianDuyet).toBe('14/07/2026 10:00:00');
    expect(result.bienPhapText).toBe('Chuyển công năng');
  });

  it('chuẩn hóa nội dung KHÁC bị bỏ trống', () => {
    const result = buildKphApprovalUpdate(current, {
      status: 'khong_duyet', resolution: 'KHÁC', resolutionText: '   ',
    }, APPROVED_AT);
    expect(result.bienPhapText).toBe('KHÁC');
  });
});
