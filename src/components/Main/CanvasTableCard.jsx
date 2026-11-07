import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS, TABLE_WIDTH, pasteCanvasTable } from '../../utils/canvasTable'

function Cell({ value, label, onCommit, onPaste, header = false }) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)
  useEffect(() => setDraft(value), [value])
  useLayoutEffect(() => {
    const input = inputRef.current
    const fit = () => {
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight}px`
    }
    fit()
    let width = input.clientWidth
    const observer = new ResizeObserver(() => {
      if (input.clientWidth !== width) {
        width = input.clientWidth
        fit()
      }
    })
    observer.observe(input)
    return () => observer.disconnect()
  }, [draft])
  return (
    <textarea
      ref={inputRef}
      rows={1}
      className={`canvas-table-cell${header ? ' canvas-table-cell--heading' : ''}`}
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => { if (draft !== value) onCommit(draft) }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') setDraft(value)
      }}
      onPaste={(event) => {
        const text = event.clipboardData.getData('text/plain')
        if (onPaste && /[\t\n\r]/.test(text)) {
          event.preventDefault()
          onPaste(text)
        }
      }}
    />
  )
}

export default function CanvasTableCard({ note, position, zIndex, selected, dragging, onDragStart, onResizeStart, onToggleCollapsed, onUpdate }) {
  const { columns, rows } = note.table
  const save = (table) => onUpdate(note.id, { table })
  const removeColumn = (index) => {
    if (rows.some((row) => row.cells[index]) && !window.confirm(`刪除「${columns[index]}」及此欄的所有內容？`)) return
    save({ columns: columns.filter((_, at) => at !== index), rows: rows.map((row) => ({ cells: row.cells.filter((_, at) => at !== index) })) })
  }
  const removeRow = (index) => {
    if (rows[index].cells.some(Boolean) && !window.confirm(`刪除第 ${index + 1} 列及其內容？`)) return
    save({ columns, rows: rows.filter((_, at) => at !== index) })
  }
  return (
    <section
      data-canvas-card
      className={`canvas-table-card group/resize absolute ${selected ? 'is-selected' : ''} ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ left: position.x, top: position.y, width: position.w ?? TABLE_WIDTH, minWidth: 36 + columns.length * 132, minHeight: note.collapsed ? undefined : position.h, zIndex }}
      onPointerDown={onDragStart}
      aria-label={`表格：${note.title || '未命名表格'}`}
    >
      <div className="canvas-table-card__header">
        <button type="button" className="canvas-table-card__toggle" aria-label={note.collapsed ? '展開表格' : '收合表格'} aria-expanded={!note.collapsed} onClick={onToggleCollapsed}>
          <TableChartOutlinedIcon sx={{ fontSize: 20 }} />
        </button>
        <Cell value={note.title} label="表格名稱" onCommit={(title) => onUpdate(note.id, { title })} header />
        {note.pinned && <span title="已置頂" className="text-xs text-amber-600">●</span>}
        <span className="canvas-table-card__count">{rows.length} × {columns.length}</span>
      </div>
      {!note.collapsed && (
        <>
          <div className="canvas-table-card__body" onPointerDown={(event) => { if (!event.target.closest('textarea,button')) event.stopPropagation() }}>
            <table className="canvas-table" aria-label={note.title || '未命名表格'}>
              <colgroup><col style={{ width: 36 }} />{columns.map((_, index) => <col key={index} />)}</colgroup>
              <thead>
                <tr>
                  <th className="canvas-table__index" scope="col"><span className="sr-only">列號</span></th>
                  {columns.map((column, index) => (
                    <th key={index} scope="col">
                      <div className="canvas-table__heading">
                        <Cell value={column} label={`第 ${index + 1} 欄名稱`} header onCommit={(value) => save({ columns: columns.map((name, at) => at === index ? value : name), rows })} />
                        <button type="button" className="canvas-table__remove" aria-label={`刪除第 ${index + 1} 欄`} title="刪除此欄" disabled={columns.length === 1} onClick={() => removeColumn(index)}><CloseIcon sx={{ fontSize: 14 }} /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th scope="row" className="canvas-table__index">
                      <span>{rowIndex + 1}</span>
                      <button type="button" className="canvas-table__remove" aria-label={`刪除第 ${rowIndex + 1} 列`} title="刪除此列" disabled={rows.length === 1} onClick={() => removeRow(rowIndex)}><CloseIcon sx={{ fontSize: 14 }} /></button>
                    </th>
                    {columns.map((_, columnIndex) => (
                      <td key={columnIndex}>
                        <Cell value={row.cells[columnIndex]} label={`第 ${rowIndex + 1} 列，第 ${columnIndex + 1} 欄`} onCommit={(value) => save({ columns, rows: rows.map((item, at) => at === rowIndex ? { cells: item.cells.map((cell, col) => col === columnIndex ? value : cell) } : item) })} onPaste={(text) => save(pasteCanvasTable(note.table, rowIndex, columnIndex, text))} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="canvas-table-card__footer">
            <button type="button" disabled={rows.length >= MAX_TABLE_ROWS} onClick={() => save({ columns, rows: [...rows, { cells: columns.map(() => '') }] })}><AddIcon sx={{ fontSize: 15 }} />新增列</button>
            <button type="button" disabled={columns.length >= MAX_TABLE_COLUMNS} onClick={() => save({ columns: [...columns, `欄位 ${columns.length + 1}`], rows: rows.map((row) => ({ cells: [...row.cells, ''] })) })}><AddIcon sx={{ fontSize: 15 }} />新增欄</button>
            <span title={`最多 ${MAX_TABLE_ROWS} 列、${MAX_TABLE_COLUMNS} 欄`}>可貼上多格資料</span>
          </footer>
          <div className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize p-1" onPointerDown={onResizeStart} title="拖曳調整表格大小"><span className="block h-2.5 w-2.5 border-b-2 border-r-2 border-slate-400" /></div>
        </>
      )}
    </section>
  )
}
