import { useState, useCallback, useEffect, useRef } from 'react'
import { getDoc, setDoc } from 'firebase/firestore'
import { wsDoc } from '../utils/workspace'
import { compressImage } from '../utils/compressImage'
import { storeImage, removeStoredImage } from '../utils/imageStorage'

const NOTES_DOC = wsDoc('canvasNotes')
let cachedNotes = null
let cachedTemplates = null

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
export const NOTE_STAMPS = {
  defeated: { label: '已討伐', color: '#dc2626' },
}

function normalizePosition(position) {
  const x = Number(position?.x)
  const y = Number(position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 24, y: 24 }
  const next = { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) }
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
    color: NOTE_COLORS[note.color] ? note.color : 'yellow',
    imageIds: Array.isArray(note.imageIds) ? note.imageIds.filter((id) => typeof id === 'string' && id) : [],
    position: normalizePosition(note.position),
    board: typeof note.board === 'string' && note.board ? note.board : null,
    collapsed: Boolean(note.collapsed),
    stamp: NOTE_STAMPS[note.stamp] ? note.stamp : null,
  }
}

// 常用筆記：只存標題、內文和顏色（圖片不存）
function normalizeNoteTemplate(template = {}) {
  return {
    id: template.id ?? Date.now(),
    title: typeof template.title === 'string' ? template.title : '',
    text: typeof template.text === 'string' ? template.text : '',
    color: NOTE_COLORS[template.color] ? template.color : 'yellow',
  }
}

async function fileToImageId(file) {
  const src = await compressImage(file, 1000, 0.82, true)
  return storeImage(src)
}

export default function useCanvasNotes() {
  const [notes, setNotes] = useState(() => cachedNotes ?? [])
  const [templates, setTemplates] = useState(() => cachedTemplates ?? [])
  const [loaded, setLoaded] = useState(() => cachedNotes !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedNotes !== null) return
    getDoc(NOTES_DOC).then((snap) => {
      cachedNotes = snap.exists() ? (snap.data().items ?? []).map(normalizeNote) : []
      cachedTemplates = snap.exists() ? (snap.data().templates ?? []).map(normalizeNoteTemplate) : []
      setNotes(cachedNotes)
      setTemplates(cachedTemplates)
      setLoaded(true)
    }).catch(() => {
      cachedNotes = cachedNotes ?? []
      cachedTemplates = cachedTemplates ?? []
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
    setDoc(NOTES_DOC, { items: notes.map(normalizeNote), templates: templates.map(normalizeNoteTemplate) }).catch(console.error)
  }, [notes, templates, loaded])

  // content: optional { title, text, color } from a 常用筆記
  const addNote = useCallback(async (position, imageFile = null, board = null, content = {}) => {
    const imageIds = imageFile ? [await fileToImageId(imageFile)] : []
    const note = normalizeNote({ ...content, id: Date.now(), position, imageIds, board })
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

  const removeNote = useCallback((id) => {
    setNotes((prev) => {
      prev.find((note) => note.id === id)?.imageIds.forEach(removeStoredImage)
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

  return { notes, addNote, updateNote, addNoteImage, removeNoteImage, removeNote, noteTemplates: templates, saveNoteTemplate, removeNoteTemplate }
}
