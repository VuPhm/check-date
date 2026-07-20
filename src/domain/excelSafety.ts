/**
 * Prevent spreadsheet formula injection when user-controlled values are opened
 * in Excel, LibreOffice, or similar clients. Keep numeric values numeric so the
 * existing report contract and formatting remain intact.
 */
export function excelSafeCell(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const firstMeaningful = value.trimStart().charAt(0);
  return ['=', '+', '-', '@'].includes(firstMeaningful) ? `'${value}` : value;
}
