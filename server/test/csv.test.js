import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, parseCsv } from '../src/lib/csv.js';

describe('toCsv', () => {
  test('writes a header and CRLF line endings', () => {
    assert.equal(toCsv(['a', 'b'], [{ a: '1', b: '2' }]), 'a,b\r\n1,2\r\n');
  });

  test('quotes only fields that need it', () => {
    const csv = toCsv(['note'], [{ note: 'plain' }, { note: 'has,comma' }]);
    assert.equal(csv, 'note\r\nplain\r\n"has,comma"\r\n');
  });

  test('doubles embedded quotes', () => {
    assert.equal(toCsv(['q'], [{ q: 'say "hi"' }]), 'q\r\n"say ""hi"""\r\n');
  });

  test('renders a missing value as empty', () => {
    assert.equal(toCsv(['a', 'b'], [{ a: '1' }]), 'a,b\r\n1,\r\n');
  });
});

describe('parseCsv', () => {
  test('keys rows by the header row', () => {
    assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [{ a: '1', b: '2' }]);
  });

  test('accepts LF-only line endings', () => {
    assert.deepEqual(parseCsv('a,b\n1,2\n'), [{ a: '1', b: '2' }]);
  });

  test('keeps commas inside quoted fields', () => {
    assert.deepEqual(parseCsv('name,note\r\nKeells,"milk, bread"\r\n'), [
      { name: 'Keells', note: 'milk, bread' },
    ]);
  });

  test('keeps newlines inside quoted fields', () => {
    assert.deepEqual(parseCsv('note\r\n"line one\r\nline two"\r\n'), [
      { note: 'line one\r\nline two' },
    ]);
  });

  test('unescapes doubled quotes', () => {
    assert.deepEqual(parseCsv('q\r\n"say ""hi"""\r\n'), [{ q: 'say "hi"' }]);
  });

  test('handles a file with no trailing newline', () => {
    assert.deepEqual(parseCsv('a,b\r\n1,2'), [{ a: '1', b: '2' }]);
  });

  test('strips a leading byte order mark', () => {
    assert.deepEqual(parseCsv('﻿a\r\n1\r\n'), [{ a: '1' }]);
  });

  test('skips blank lines rather than emitting empty rows', () => {
    assert.deepEqual(parseCsv('a\r\n1\r\n\r\n2\r\n'), [{ a: '1' }, { a: '2' }]);
  });

  test('returns nothing for empty input', () => {
    assert.deepEqual(parseCsv(''), []);
  });

  test('round-trips awkward values through toCsv', () => {
    const rows = [{ payee: 'A,B "C"', note: 'multi\r\nline' }, { payee: 'plain', note: '' }];
    assert.deepEqual(parseCsv(toCsv(['payee', 'note'], rows)), rows);
  });
});
