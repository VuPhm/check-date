import { describe, expect, it } from 'vitest';
import { syncLookupDates } from './lookup';

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

  it('không đồng bộ ngày không tồn tại', () => {
    expect(syncLookupDates({ ...empty, nsx: '31/02/2026', hsdDate: '10/03/2026' }, 'forward', 'date').hsdDays).toBe('');
  });
});
