import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toMinorUnits, toMajorUnits, sumMinorUnits, splitMinorUnits } from '../src/lib/money.js';

describe('toMinorUnits', () => {
  test('converts whole rupees', () => {
    assert.equal(toMinorUnits('1250'), 125000);
    assert.equal(toMinorUnits(0), 0);
  });

  test('converts two-decimal amounts', () => {
    assert.equal(toMinorUnits('1250.50'), 125050);
    assert.equal(toMinorUnits('0.07'), 7);
  });

  test('pads a single decimal place', () => {
    assert.equal(toMinorUnits('12.5'), 1250);
  });

  test('keeps the sign', () => {
    assert.equal(toMinorUnits('-3.25'), -325);
  });

  test('accepts numbers as well as strings', () => {
    assert.equal(toMinorUnits(19.99), 1999);
  });

  test('does not lose a cent to binary floating point', () => {
    // 0.1 + 0.2 famously is not 0.3; going through strings avoids the issue.
    assert.equal(toMinorUnits('0.1') + toMinorUnits('0.2'), toMinorUnits('0.3'));
  });

  test('rejects more than two decimal places', () => {
    assert.throws(() => toMinorUnits('1.005'), RangeError);
  });

  test('rejects non-numeric input', () => {
    for (const bad of ['', '  ', 'abc', '1,250', '1.2.3', null, undefined]) {
      assert.throws(() => toMinorUnits(bad), RangeError, `expected ${JSON.stringify(bad)} to throw`);
    }
  });
});

describe('toMajorUnits', () => {
  test('renders cents as a two-decimal string', () => {
    assert.equal(toMajorUnits(125050), '1250.50');
    assert.equal(toMajorUnits(7), '0.07');
    assert.equal(toMajorUnits(0), '0.00');
    assert.equal(toMajorUnits(-325), '-3.25');
  });

  test('round-trips through toMinorUnits', () => {
    for (const value of ['0.00', '0.01', '9.99', '1250.50', '-3.25']) {
      assert.equal(toMajorUnits(toMinorUnits(value)), value);
    }
  });
});

describe('sumMinorUnits', () => {
  test('adds an empty list to zero', () => {
    assert.equal(sumMinorUnits([]), 0);
  });

  test('adds mixed signs', () => {
    assert.equal(sumMinorUnits([1000, -250, 33]), 783);
  });
});

describe('splitMinorUnits', () => {
  test('splits evenly when it can', () => {
    assert.deepEqual(splitMinorUnits(900, 3), [300, 300, 300]);
  });

  test('gives the remainder to the earliest shares', () => {
    assert.deepEqual(splitMinorUnits(1000, 3), [334, 333, 333]);
  });

  test('always adds back up to the original', () => {
    for (const parts of [1, 2, 3, 7, 11]) {
      assert.equal(sumMinorUnits(splitMinorUnits(1000, parts)), 1000);
    }
  });

  test('rejects a non-positive part count', () => {
    assert.throws(() => splitMinorUnits(100, 0), RangeError);
  });
});
