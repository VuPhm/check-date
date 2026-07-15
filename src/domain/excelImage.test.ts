import { describe, expect, it } from 'vitest';
import { fitImageIntoBounds } from './excelImage';

describe('fitImageIntoBounds', () => {
  it('giữ tỷ lệ ảnh ngang trong khung Excel', () => {
    expect(fitImageIntoBounds({ width: 1600, height: 800 }, { width: 36, height: 74 })).toEqual({ width: 36, height: 18 });
  });

  it('giữ tỷ lệ ảnh dọc trong khung Excel', () => {
    expect(fitImageIntoBounds({ width: 600, height: 1800 }, { width: 36, height: 74 })).toEqual({ width: 25, height: 74 });
  });
});
