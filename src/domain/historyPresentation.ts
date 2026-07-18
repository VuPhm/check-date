import type { AlertType } from './types';

export type HistoryFilter = AlertType | 'other' | 'all';

export interface HistoryPresentationItem {
  id: string;
  alertType?: HistoryFilter;
  alertWeight?: number;
}

export function formatRemainingText(days: number): string {
  if (days < 0) return `Đã trễ ${Math.abs(days)} ngày`;
  if (days === 0) return 'Hết hạn hôm nay';
  return `HSD còn ${days} ngày`;
}

export function getVisibleHistory<T extends HistoryPresentationItem>(
  items: readonly T[],
  filters: ReadonlySet<HistoryFilter>,
  prioritySort: boolean,
): T[] {
  const visible = filters.has('all')
    ? [...items]
    : items.filter((item) => item.alertType !== undefined && filters.has(item.alertType));
  return prioritySort ? visible.sort((a, b) => (a.alertWeight || 0) - (b.alertWeight || 0)) : visible;
}

export function countHistoryByType(items: readonly HistoryPresentationItem[]): Record<HistoryFilter, number> {
  return {
    all: items.length,
    safe: items.filter((item) => item.alertType === 'safe').length,
    warning: items.filter((item) => item.alertType === 'warning').length,
    danger: items.filter((item) => item.alertType === 'danger').length,
    other: items.filter((item) => item.alertType === 'other').length,
    expired: items.filter((item) => item.alertType === 'expired').length,
  };
}
