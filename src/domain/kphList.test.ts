import { describe, expect, it } from 'vitest';
import { filterKphLogs, kphImageCount, sortKphLogs } from './kphList';
import type { KphLog } from './types';

const logs: KphLog[] = [
  { id: 'tpcn-pending', loaiKph: 'TPCN', ngayPhatHien: '10/07/2026', trangThaiDuyet: 'cho_duyet', sku: '20', tenHang: 'Bánh', soLuong: 2, images: [new Blob(['1'])] },
  { id: 'tpcn-approved', loaiKph: 'TPCN', ngayPhatHien: '15/07/2026', trangThaiDuyet: 'da_duyet', sku: '10', tenHang: 'Sữa', soLuong: 10, image: new Blob(['2']) },
  { id: 'tpts-pending', loaiKph: 'TPTS', ngayPhatHien: '12/07/2026', sku: '30', tenHang: 'Rau', soLuong: 1, images: [new Blob(['3']), new Blob(['4']), new Blob(['5']), new Blob(['6'])] },
];

describe('KPH list presentation', () => {
  it('lọc theo loại, khoảng ngày và trạng thái chờ duyệt', () => {
    expect(filterKphLogs(logs, { type: 'TPCN' }).map((log) => log.id)).toEqual(['tpcn-pending', 'tpcn-approved']);
    expect(filterKphLogs(logs, { type: 'TPCN', fromDate: '11/07/2026' }).map((log) => log.id)).toEqual(['tpcn-approved']);
    expect(filterKphLogs(logs, { type: 'TPCN', pendingOnly: true }).map((log) => log.id)).toEqual(['tpcn-pending']);
  });

  it('bỏ qua ngày lọc không hợp lệ như hành vi legacy', () => {
    expect(filterKphLogs(logs, { type: 'TPCN', fromDate: '31/02/2026' }).map((log) => log.id)).toEqual(['tpcn-pending', 'tpcn-approved']);
  });

  it('sắp xếp tương thích và giới hạn ảnh hiển thị tối đa ba', () => {
    expect(sortKphLogs(logs, { field: 'soLuong', direction: 'desc' }).map((log) => log.id)).toEqual(['tpcn-approved', 'tpcn-pending', 'tpts-pending']);
    expect(sortKphLogs(logs, { field: 'skuTenHang', direction: 'asc' }).map((log) => log.id)).toEqual(['tpcn-approved', 'tpcn-pending', 'tpts-pending']);
    expect(kphImageCount(logs[2])).toBe(3);
  });
});
