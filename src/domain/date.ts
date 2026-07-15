export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date(Number.NaN);
  const parts = dateString.split('/');
  if (parts.length !== 3) return new Date(Number.NaN);
  const [day, month, year] = parts.map((part) => Number.parseInt(part, 10));
  if ([day, month, year].some(Number.isNaN)) return new Date(Number.NaN);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function formatLocalDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function getCleanToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
