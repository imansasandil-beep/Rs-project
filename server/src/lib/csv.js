/**
 * A small RFC 4180 reader and writer. Spreadsheet exports are the main way
 * people get years of history into a new tool, and they are full of commas,
 * quotes and newlines inside fields — a `split(',')` loses data silently.
 */

/** Quotes a field only when it needs it, doubling any embedded quotes. */
function escapeField(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * @param {string[]} columns  header row
 * @param {object[]} rows     objects keyed by column name
 */
export function toCsv(columns, rows) {
  const lines = [columns.map(escapeField).join(',')];
  for (const row of rows) lines.push(columns.map((column) => escapeField(row[column])).join(','));
  // CRLF is what the spec says and what Excel expects.
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Parses CSV text into an array of objects keyed by the header row.
 * Handles quoted fields containing commas, newlines and doubled quotes.
 *
 * @param {string} text
 * @returns {object[]}
 */
export function parseCsv(text) {
  const rows = parseRows(text.replace(/^﻿/, '')); // strip Excel's BOM
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });
}

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let touched = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      touched = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
      touched = true;
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      if (touched || field !== '') {
        row.push(field);
        rows.push(row);
      }
      row = [];
      field = '';
      touched = false;
    } else {
      field += char;
    }
  }

  // A file that does not end in a newline still has a final row.
  if (touched || field !== '') {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
