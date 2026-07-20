import { describe, expect, it } from 'vitest';
import { excelSafeCell } from './excelSafety';

describe('excelSafeCell', () => {
  it('neutralizes formula prefixes, including leading whitespace', () => {
    for (const value of ['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1)', '  =HYPERLINK("https://bad")']) {
      expect(excelSafeCell(value)).toBe(`'${value}`);
    }
  });

  it('preserves ordinary text and numeric report values', () => {
    expect(excelSafeCell('Sữa tươi')).toBe('Sữa tươi');
    expect(excelSafeCell(12)).toBe(12);
  });
});
