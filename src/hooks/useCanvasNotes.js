import { useState, useCallback, useEffect, useRef } from 'react'
import { getDoc, setDoc } from '../utils/firestore'
import { wsDoc } from '../utils/workspace'
import { compressImage } from '../utils/compressImage'
import { storeImage, removeStoredImage } from '../utils/imageStorage'
import { normalizeCanvasTable } from '../utils/canvasTable'

const NOTES_DOC = wsDoc('canvasNotes')
let cachedNotes = null
let cachedTemplates = null
let cachedColumns = null

// Sticky-note colors (same palette as YoZuMind)
export const NOTE_COLORS = {
  yellow: ['#ffe98f', '黃'],
  orange: ['#ffd0a1', '橘'],
  red: ['#ffb8b8', '紅'],
  pink: ['#ffc7e3', '粉紅'],
  purple: ['#ddd0ff', '紫'],
  blue: ['#c4ddff', '藍'],
  teal: ['#b8ecdf', '青'],
  green: ['#cfeeb3', '綠'],
  gray: ['#e2e5e9', '灰'],
  white: ['#ffffff', '白'],
}

// 筆記印章：蓋上後整張筆記半透明，中央顯示印章文字
// 新筆記的預設顏色
export const DEFAULT_NOTE_COLOR = 'white'

export const NOTE_STAMPS = {
  defeated: { label: '已討伐', color: '#dc2626' },
}

function normalizePosition(position) {
  const x = Number(position?.x)
  const y = Number(position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 24, y: 24 }
  const next = { x: Math.round(x), y: Math.round(y) }
  // Optional card size set by dragging the resize handle on the canvas
  const w = Number(position?.w)
  const h = Number(position?.h)
  if (Number.isFinite(w) && w > 0) next.w = Math.round(w)
  if (Number.isFinite(h) && h > 0) next.h = Math.round(h)
  return next
}

function normalizeNote(note = {}) {
  return {
    id: note.id ?? Date.now(),
    title: typeof note.title === 'string' ? note.title : '',
    text: typeof note.text === 'string' ? note.text : '',
    color: NOTE_COLORS[note.color] ? note.color : DEFAULT_NOTE_COLOR,
    imageIds: Array.isArray(note.imageIds) ? note.imageIds.filter((id) => typeof id === 'string' && id) : [],
    position: normalizePosition(note.position),
    board: typeof note.board === 'string' && note.board ? note.board : null,
    collapsed: Boolean(note.collapsed),
    stamp: NOTE_STAMPS[note.stamp] ? note.stamp : null,
    pinned: Boolean(note.pinned),
    // Board：點進去是獨立畫布，裡面的卡片 board = subBoardKey(這張的 id)
    ...(note.isBoard ? { isBoard: true } : {}),
    ...(note.isTable ? { isTable: true, table: normalizeCanvasTable(note.table) } : {}),
    ...(note.isImage ? { isImage: true } : {}),
  }
}

// 常用筆記：只存標題、內文和顏色（圖片不存）
function normalizeNoteTemplate(template = {}) {
  return {
    id: template.id ?? Date.now(),
    title: typeof template.title === 'string' ? template.title : '',
    text: typeof template.text === 'string' ? template.text : '',
    color: NOTE_COLORS[template.color] ? template.color : DEFAULT_NOTE_COLOR,
  }
}

export const subBoardKey = (noteId) => `sub:${noteId}`

// 欄（版面）：把多張待辦、筆記、圖片卡片直向收成一組，拖欄位整組一起移動
// cardKeys 依序存卡片 key：`q:<questId>`、`n:<noteId>`
export const COLUMN_WIDTH = 300

function normalizeColumn(column = {}) {
  const position = normalizePosition(column.position)
  return {
    id: column.id ?? Date.now(),
    title: typeof column.title === 'string' ? column.title : '',
    collapsed: Boolean(column.collapsed),
    board: typeof column.board === 'string' && column.board ? column.board : null,
    position,
    cardKeys: Array.isArray(column.cardKeys)
      ? [...new Set(column.cardKeys.filter((key) => typeof key === 'string' && /^[qn]:/.test(key)))]
      : [],
  }
}

async function fileToImageId(file) {
  const src = await compressImage(file, 1000, 0.82, true)
  return storeImage(src)
}

export default function useCanvasNotes() {
  const [notes, setNotes] = useState(() => cachedNotes ?? [])
  const [templates, setTemplates] = useState(() => cachedTemplates ?? [])
  const [columns, setColumns] = useState(() => cachedColumns ?? [])
  const [loaded, setLoaded] = useState(() => cachedNotes !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedNotes !== null) return
    getDoc(NOTES_DOC).then((snap) => {
      cachedNotes = snap.exists() ? (snap.data().items ?? []).map(normalizeNote) : []
      cachedTemplates = snap.exists() ? (snap.data().templates ?? []).map(normalizeNoteTemplate) : []
      cachedColumns = snap.exists() ? (snap.data().columns ?? []).map(normalizeColumn) : []
      setNotes(cachedNotes)
      setTemplates(cachedTemplates)
      setColumns(cachedColumns)
      setLoaded(true)
    }).catch(() => {
      cachedNotes = cachedNotes ?? []
      cachedTemplates = cachedTemplates ?? []
      cachedColumns = cachedColumns ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedNotes = notes
    cachedTemplates = templates
    cachedColumns = columns
    setDoc(NOTES_DOC, {
      items: notes.map(normalizeNote),
      templates: templates.map(normalizeNoteTemplate),
      columns: columns.map(normalizeColumn),
    }).catch(console.error)
  }, [notes, templates, columns, loaded])

  // content: optional { title, text, color } from a 常用筆記
  const addNote = useCallback(async (position, imageFile = null, board = null, content = {}) => {
    const imageIds = imageFile ? [await fileToImageId(imageFile)] : []
    const note = normalizeNote({ ...content, id: crypto.randomUUID(), position, imageIds, board })
    setNotes((prev) => [...prev, note])
    return note.id
  }, [])

  const updateNote = useCallback((id, changes) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? normalizeNote({ ...note, ...changes }) : note)))
  }, [])

  const addNoteImage = useCallback(async (id, file) => {
    if (!file) return
    const imageId = await fileToImageId(file)
    setNotes((prev) => prev.map((note) => (
      note.id === id ? { ...note, imageIds: [...note.imageIds, imageId] } : note
    )))
  }, [])

  const removeNoteImage = useCallback((id, imageId) => {
    removeStoredImage(imageId)
    setNotes((prev) => prev.map((note) => (
      note.id === id ? { ...note, imageIds: note.imageIds.filter((item) => item !== imageId) } : note
    )))
  }, [])

  const removeNote = useCallback((id, { keepImages = false } = {}) => {
    setNotes((prev) => {
      if (!keepImages) prev.find((note) => note.id === id)?.imageIds.forEach(removeStoredImage)
      return prev.filter((note) => note.id !== id)
    })
  }, [])

  const saveNoteTemplate = useCallback((note) => {
    const template = normalizeNoteTemplate({ id: Date.now(), title: note.title, text: note.text, color: note.color })
    setTemplates((prev) => [template, ...prev])
    return template.id
  }, [])

  const removeNoteTemplate = useCallback((id) => {
    setTemplates((prev) => prev.filter((template) => template.id !== id))
  }, [])

  const addColumn = useCallback((position, board = null, title = '新欄位') => {
    const column = normalizeColumn({ id: Date.now(), title, position, board })
    setColumns((prev) => [...prev, column])
    return column.id
  }, [])

  const updateColumn = useCallback((id, changes) => {
    setColumns((prev) => prev.map((column) => (column.id === id ? normalizeColumn({ ...column, ...changes }) : column)))
  }, [])

  const removeColumn = useCallback((id) => {
    setColumns((prev) => prev.filter((column) => column.id !== id))
  }, [])

  // 把卡片放進欄位（先從所有欄位移除）；columnId 為 null 就只是移出欄位
  // index：插入位置，省略則放到最後
  const placeCardsInColumn = useCallback((keys, columnId = null, index = null) => {
    setColumns((prev) => prev.map((column) => {
      const rest = column.cardKeys.filter((key) => !keys.includes(key))
      if (column.id !== columnId) return rest.length === column.cardKeys.length ? column : { ...column, cardKeys: rest }
      const at = index == null ? rest.length : Math.min(Math.max(0, index), rest.length)
      return { ...column, cardKeys: [...rest.slice(0, at), ...keys, ...rest.slice(at)] }
    }))
  }, [])

  return {
    notes, addNote, updateNote, addNoteImage, removeNoteImage, removeNote,
    noteTemplates: templates, saveNoteTemplate, removeNoteTemplate,
    columns, addColumn, updateColumn, removeColumn, placeCardsInColumn,
  }
}
