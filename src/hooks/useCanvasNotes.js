import { useState, useCallback, useEffect, useRef } from 'react'
import { getDoc, setDoc } from 'firebase/firestore'
import { wsDoc } from '../utils/workspace'
import { compressImage } from '../utils/compressImage'
import { storeImage, removeStoredImage } from '../utils/imageStorage'

const NOTES_DOC = wsDoc('canvasNotes')
let cachedNotes = null

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

function normalizePosition(position) {
  const x = Number(position?.x)
  const y = Number(position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 24, y: 24 }
  return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) }
}

function normalizeNote(note = {}) {
  return {
    id: note.id ?? Date.now(),
    title: typeof note.title === 'string' ? note.title : '',
    text: typeof note.text === 'string' ? note.text : '',
    color: NOTE_COLORS[note.color] ? note.color : 'yellow',
    imageIds: Array.isArray(note.imageIds) ? note.imageIds.filter((id) => typeof id === 'string' && id) : [],
    position: normalizePosition(note.position),
  }
}

async function fileToImageId(file) {
  const src = await compressImage(file, 1000, 0.82, true)
  return storeImage(src)
}

export default function useCanvasNotes() {
  const [notes, setNotes] = useState(() => cachedNotes ?? [])
  const [loaded, setLoaded] = useState(() => cachedNotes !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedNotes !== null) return
    getDoc(NOTES_DOC).then((snap) => {
      cachedNotes = snap.exists() ? (snap.data().items ?? []).map(normalizeNote) : []
      setNotes(cachedNotes)
      setLoaded(true)
    }).catch(() => {
      cachedNotes = cachedNotes ?? []
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
    setDoc(NOTES_DOC, { items: notes.map(normalizeNote) }).catch(console.error)
  }, [notes, loaded])

  const addNote = useCallback(async (position, imageFile = null) => {
    const imageIds = imageFile ? [await fileToImageId(imageFile)] : []
    const note = normalizeNote({ id: Date.now(), position, imageIds })
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

  return { notes, addNote, updateNote, addNoteImage, removeNoteImage, removeNote }
}
