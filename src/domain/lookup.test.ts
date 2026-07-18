import { describe, expect, it } from 'vitest';
import { buildLookupHistoryPayload, isAnonymousLookupSupersededByBarcode, syncLookupDates, validateLookupCalculation } from './lookup';
import { processReturnBusinessLogic } from './business';

const empty = { nsx: '', hsdDate: '', hsdDays: '', hsdMonths: '' };

describe('syncLookupDates', () => {
  it('tính HSD từ NSX và số ngày theo quy tắc tính cả hai đầu ngày', () => {
    expect(syncLookupDates({ ...empty, nsx: '01/07/2026', hsdDays: '10' }, 'forward', 'days')).toEqual({
      ...empty, nsx: '01/07/2026', hsdDate: '10/07/2026', hsdDays: '10',
    });
  });

  it('suy ngược NSX từ HSD và số ngày', () => {
    expect(syncLookupDates({ ...empty, hsdDate: '10/07/2026', hsdDays: '10' }, 'backward', 'days').nsx).toBe('01/07/2026');
  });

  it('chặn ngày cuối tháng khi cộng tháng lịch', () => {
    const result = syncLookupDates({ ...empty, nsx: '31/01/2026', hsdMonths: '1' }, 'forward', 'months');
    expect(result.hsdDate).toBe('28/02/2026');
    expect(result.hsdDays).toBe('29');
  });

  it('xử lý năm nhuận và tra ngược khi cộng/trừ tháng lịch', () => {
    const forward = syncLookupDates({ ...empty, nsx: '31/01/2024', hsdMonths: '1' }, 'forward', 'months');
    const backward = syncLookupDates({ ...empty, hsdDate: '31/03/2024', hsdMonths: '1' }, 'backward', 'months');

    expect(forward).toMatchObject({ hsdDate: '29/02/2024', hsdDays: '30' });
    expect(backward).toMatchObject({ nsx: '29/02/2024', hsdDays: '32' });
  });

  it('giữ quy tắc một nguồn HSD: nhập ngày hoặc số ngày sẽ xóa số tháng', () => {
    expect(syncLookupDates({ ...empty, nsx: '01/07/2026', hsdDate: '10/07/2026', hsdMonths: '2' }, 'forward', 'date'))
      .toMatchObject({ hsdDays: '10', hsdMonths: '' });
    expect(syncLookupDates({ ...empty, nsx: '01/07/2026', hsdDays: '10', hsdMonths: '2' }, 'forward', 'days'))
      .toMatchObject({ hsdDate: '10/07/2026', hsdMonths: '' });
  });

  it('xóa ngày phụ thuộc khi số ngày hoặc số tháng không hợp lệ', () => {
    expect(syncLookupDates({ ...empty, nsx: '01/07/2026', hsdDate: '31/07/2026', hsdDays: '0' }, 'forward', 'days').hsdDate).toBe('');
    expect(syncLookupDates({ ...empty, hsdDate: '31/07/2026', nsx: '01/07/2026', hsdMonths: '0' }, 'backward', 'months'))
      .toMatchObject({ nsx: '', hsdDays: '' });
  });

  it('không đồng bộ ngày không tồn tại', () => {
    expect(syncLookupDates({ ...empty, nsx: '31/02/2026', hsdDate: '10/03/2026' }, 'forward', 'date').hsdDays).toBe('');
  });

  it('chặn tra cứu xuôi khi NSX không hợp lệ', () => {
    expect(() => validateLookupCalculation({ mode: 'forward', nsx: '31/02/2026', hsdDate: '05/03/2026', hsdDays: '', hsdMonths: '' }))
      .toThrow('Ngày sản xuất không đúng định dạng');
  });

  it('bảo toàn validation tra xuôi/tra ngược ở các biên quan trọng', () => {
    expect(() => validateLookupCalculation({ mode: 'forward', ...empty, nsx: '01/07/2026' }))
      .toThrow('Vui lòng nhập Hạn sử dụng');
    expect(() => validateLookupCalculation({ mode: 'forward', ...empty, nsx: '01/07/2026', hsdDate: '01/07/2026' }))
      .toThrow('Hạn sử dụng phải lớn hơn');
    expect(() => validateLookupCalculation({ mode: 'backward', ...empty, hsdDate: '10/07/2026', hsdDays: '10' }))
      .toThrow('chưa thể tính ngược');
    expect(() => validateLookupCalculation({ mode: 'backward', ...empty, nsx: '01/07/2026', hsdDate: '31/02/2026' }))
      .toThrow('Hạn sử dụng đã nhập không đúng định dạng');
  });

  it('thay bản ghi tra cứu không mã bằng bản ghi cùng ngày đã có barcode', () => {
    const anonymous = { nsx: '01/07/2026', rawHsdDate: '31/07/2026', rawHsdDays: 31, formattedHsd: '31/07/2026', barcode: '', tenHang: '' };
    const identified = { ...anonymous, barcode: '8931234567890' };

    expect(isAnonymousLookupSupersededByBarcode(anonymous, identified)).toBe(true);
    expect(isAnonymousLookupSupersededByBarcode(identified, { ...identified, barcode: '8930000000000' })).toBe(false);
    expect(isAnonymousLookupSupersededByBarcode({ ...anonymous, tenHang: 'Sản phẩm A' }, identified)).toBe(false);
  });

  it('tạo cùng payload lịch sử cho Vue và fallback legacy', () => {
    const payload = buildLookupHistoryPayload(
      { nsx: '01/07/2026', hsdDate: '30/07/2026', hsdDays: '', barcode: '893123', tenHang: 'Sản phẩm A', quantity: 2, dvt: 'EA' },
      processReturnBusinessLogic('01/07/2026', '30/07/2026', new Date(2026, 6, 15)),
      '2026-07-15T00:00:00.000Z',
    );

    expect(payload).toMatchObject({
      rawHsdDays: 30,
      result: '24/07/2026',
      alertType: 'safe',
      barcode: '893123',
      quantity: 2,
      checkedAt: '2026-07-15T00:00:00.000Z',
    });
  });
});
