import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDay,
  isMonth,
  today,
  monthOf,
  monthBounds,
  addMonths,
  addDays,
  lastMonths,
  daysInMonth,
} from '../src/lib/dates.js';

describe('isDay', () => {
  test('accepts real calendar days', () => {
    assert.ok(isDay('2026-06-27'));
    assert.ok(isDay('2024-02-29'), 'leap day');
  });

  test('rejects impossible days', () => {
    assert.equal(isDay('2026-02-30'), false);
    assert.equal(isDay('2025-02-29'), false, 'not a leap year');
    assert.equal(isDay('2026-13-01'), false);
    assert.equal(isDay('2026-00-10'), false);
  });

  test('rejects anything that is not a YYYY-MM-DD string', () => {
    for (const bad of ['2026-6-1', '27/06/2026', '', 20260627, null]) {
      assert.equal(isDay(bad), false);
    }
  });
});

describe('isMonth', () => {
  test('accepts YYYY-MM', () => {
    assert.ok(isMonth('2026-06'));
  });

  test('rejects out-of-range months and wrong shapes', () => {
    assert.equal(isMonth('2026-13'), false);
    assert.equal(isMonth('2026-00'), false);
    assert.equal(isMonth('2026-06-01'), false);
  });
});

describe('daysInMonth', () => {
  test('knows month lengths including February', () => {
    assert.equal(daysInMonth(2026, 6), 30);
    assert.equal(daysInMonth(2026, 7), 31);
    assert.equal(daysInMonth(2026, 2), 28);
    assert.equal(daysInMonth(2024, 2), 29);
  });
});

describe('today', () => {
  test('formats the given local date, not a UTC-shifted one', () => {
    // Late evening local time is already tomorrow in UTC; we want the local day.
    assert.equal(today(new Date(2026, 5, 27, 23, 30)), '2026-06-27');
  });
});

describe('monthOf and monthBounds', () => {
  test('extracts the month of a day', () => {
    assert.equal(monthOf('2026-06-27'), '2026-06');
  });

  test('bounds a 30-day month', () => {
    assert.deepEqual(monthBounds('2026-06'), { start: '2026-06-01', end: '2026-06-30' });
  });

  test('bounds February in a leap year', () => {
    assert.deepEqual(monthBounds('2024-02'), { start: '2024-02-01', end: '2024-02-29' });
  });
});

describe('addMonths', () => {
  test('moves forward within a year', () => {
    assert.equal(addMonths('2026-06', 2), '2026-08');
  });

  test('rolls over the year boundary in both directions', () => {
    assert.equal(addMonths('2026-11', 3), '2027-02');
    assert.equal(addMonths('2026-02', -3), '2025-11');
  });

  test('is a no-op for zero', () => {
    assert.equal(addMonths('2026-06', 0), '2026-06');
  });
});

describe('addDays', () => {
  test('crosses a month boundary', () => {
    assert.equal(addDays('2026-06-30', 1), '2026-07-01');
    assert.equal(addDays('2026-07-01', -1), '2026-06-30');
  });

  test('crosses a leap day', () => {
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  });
});

describe('lastMonths', () => {
  test('returns a window ending at the given month, oldest first', () => {
    assert.deepEqual(lastMonths('2026-06', 3), ['2026-04', '2026-05', '2026-06']);
  });

  test('returns just the month itself for a window of one', () => {
    assert.deepEqual(lastMonths('2026-06', 1), ['2026-06']);
  });
});
