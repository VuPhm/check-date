import { formatLocalDate, parseLocalDate } from './date';
import type { ApprovalStatus, KphLog } from './types';

export type KphType = 'TPCN' | 'TPTS';
export type KphSortField = 'ngayPhatHien' | 'trangThaiDuyet' | 'skuTenHang' | 'ncc' | 'soLuong' | 'tinhTrang' | 'ngayXuLy' | 'imageCount';
export type KphSortDirection = 'asc' | 'desc';

export interface KphListFilters {
  type: KphType;
  fromDate?: string;
  toDate?: string;
  pendingOnly?: boolean;
}

export interface KphListSort {
  field: KphSortField | null;
  direction: KphSortDirection;
}

function isValidLocalDate(value: string | undefined): value is string {
  if (!value || !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const parsed = parseLocalDate(value);
  return !Number.isNaN(parsed.getTime()) && formatLocalDate(parsed) === value;
}

function value(log: KphLog, key: string): string {
  const candidate = log[key];
  return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : '';
}

export function kphApprovalStatus(log: KphLog): ApprovalStatus {
  return log.trangThaiDuyet || 'cho_duyet';
}

export function kphImageCount(log: KphLog): number {
  if (Array.isArray(log.images) && log.images.length > 0) return Math.min(log.images.length, 3);
  return log.image ? 1 : 0;
}

export function filterKphLogs(logs: readonly KphLog[], filters: KphListFilters): KphLog[] {
  const fromDate = isValidLocalDate(filters.fromDate) ? parseLocalDate(filters.fromDate) : null;
  const toDate = isValidLocalDate(filters.toDate) ? parseLocalDate(filters.toDate) : null;

  return logs.filter((log) => {
    if ((log.loaiKph || 'TPCN') !== filters.type) return false;

    const detectedDate = parseLocalDate(value(log, 'ngayPhatHien'));
    if (fromDate && detectedDate < fromDate) return false;
    if (toDate && detectedDate > toDate) return false;
    return !filters.pendingOnly || kphApprovalStatus(log) === 'cho_duyet';
  });
}

export function sortKphLogs(logs: readonly KphLog[], sort: KphListSort): KphLog[] {
  const field = sort.field;
  if (!field) return [...logs];

  return [...logs].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (field === 'ngayPhatHien' || field === 'ngayXuLy') {
      const aDate = value(a, field);
      const bDate = value(b, field);
      if (!aDate) return 1;
      if (!bDate) return -1;
      aValue = parseLocalDate(aDate).getTime();
      bValue = parseLocalDate(bDate).getTime();
    } else if (field === 'soLuong') {
      aValue = Number.parseFloat(value(a, 'soLuong')) || 0;
      bValue = Number.parseFloat(value(b, 'soLuong')) || 0;
    } else if (field === 'trangThaiDuyet') {
      aValue = kphApprovalStatus(a);
      bValue = kphApprovalStatus(b);
    } else if (field === 'skuTenHang') {
      aValue = `${value(a, 'sku')}\u0000${value(a, 'tenHang')}`.toLocaleLowerCase('vi-VN');
      bValue = `${value(b, 'sku')}\u0000${value(b, 'tenHang')}`.toLocaleLowerCase('vi-VN');
    } else if (field === 'imageCount') {
      aValue = kphImageCount(a);
      bValue = kphImageCount(b);
    } else {
      aValue = value(a, field);
      bValue = value(b, field);
    }

    if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}
