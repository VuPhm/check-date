export function formatRemainingText(days: number): string {
  if (days < 0) return `Đã trễ ${Math.abs(days)} ngày`;
  if (days === 0) return 'Hết hạn hôm nay';
  return `HSD còn ${days} ngày`;
}
