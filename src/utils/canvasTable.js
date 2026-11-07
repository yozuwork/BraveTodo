export const TABLE_WIDTH = 480
export const MAX_TABLE_ROWS = 100
export const MAX_TABLE_COLUMNS = 20

export function normalizeCanvasTable(table = {}) {
  table = table && typeof table === 'object' ? table : {}
  const columns = Array.isArray(table.columns) && table.columns.length
    ? table.columns.slice(0, MAX_TABLE_COLUMNS).map((value) => String(value ?? ''))
    : ['欄位 1', '欄位 2', '欄位 3']
  const source = Array.isArray(table.rows) && table.rows.length ? table.rows : Array.from({ length: 3 }, () => ({}))
  // Firestore does not support nested arrays; each row is an object with cells.
  const rows = source.slice(0, MAX_TABLE_ROWS).map((row) => ({
    cells: columns.map((_, index) => String(row?.cells?.[index] ?? '')),
  }))
  return { columns, rows }
}

export function pasteCanvasTable(table, rowIndex, columnIndex, text) {
  const next = normalizeCanvasTable(table)
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n')
    .slice(0, MAX_TABLE_ROWS - rowIndex).map((line) => line.split('\t').slice(0, MAX_TABLE_COLUMNS - columnIndex))
  const width = Math.min(MAX_TABLE_COLUMNS, Math.max(next.columns.length, columnIndex + Math.max(...lines.map((line) => line.length))))
  while (next.columns.length < width) next.columns.push(`欄位 ${next.columns.length + 1}`)
  while (next.rows.length < rowIndex + lines.length) next.rows.push({ cells: [] })
  next.rows = next.rows.map((row) => ({ cells: next.columns.map((_, index) => row.cells[index] ?? '') }))
  lines.forEach((line, offset) => line.forEach((value, index) => {
    next.rows[rowIndex + offset].cells[columnIndex + index] = value
  }))
  return next
}
