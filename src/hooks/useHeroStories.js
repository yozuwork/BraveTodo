import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { compressImage } from '../utils/compressImage'
import { reorderItems } from '../utils/reorderItems'

const HERO_STORIES_DOC = doc(db, 'meta', 'heroStories')
let cachedHeroStories = null

const createStory = () => {
  const now = Date.now()
  return {
    id: now,
    title: '新的故事',
    excerpt: '',
    content: '',
    cover: null,
    coverPosition: { x: 50, y: 50 },
    pinned: false,
    status: 'not_started',
    createdAt: now,
    updatedAt: now,
  }
}

export default function useHeroStories() {
  const [stories, setStories] = useState(() => cachedHeroStories ?? [])
  const [loaded, setLoaded] = useState(() => cachedHeroStories !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedHeroStories !== null) return
    getDoc(HERO_STORIES_DOC).then((snap) => {
      let nextStories = []
      if (snap.exists()) {
        nextStories = (snap.data().items ?? []).map((story) => ({
          excerpt: '',
          content: '',
          cover: null,
          coverPosition: { x: 50, y: 50 },
          pinned: false,
          status: 'not_started',
          createdAt: story.id ?? Date.now(),
          updatedAt: story.id ?? Date.now(),
          ...story,
        }))
      }
      cachedHeroStories = nextStories
      setStories(nextStories)
      setLoaded(true)
    }).catch(() => {
      cachedHeroStories = cachedHeroStories ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedHeroStories = stories
    setDoc(HERO_STORIES_DOC, { items: stories }).catch(console.error)
  }, [stories, loaded])

  const addStory = useCallback(() => {
    const story = createStory()
    setStories((prev) => [story, ...prev])
    return story.id
  }, [])

  const updateStory = useCallback((id, changes) => {
    setStories((prev) => prev.map((story) => (
      story.id === id ? { ...story, ...changes, updatedAt: Date.now() } : story
    )))
  }, [])

  const removeStory = useCallback((id) => {
    setStories((prev) => prev.filter((story) => story.id !== id))
  }, [])

  const updateStoryCover = useCallback((id, file) => {
    if (!file) return
    if (typeof file === 'string') {
      updateStory(id, { cover: file })
      return
    }
    compressImage(file).then((dataUrl) => updateStory(id, { cover: dataUrl }))
  }, [updateStory])

  const toggleStoryPin = useCallback((id) => {
    setStories((prev) => prev.map((story) => (
      story.id === id ? { ...story, pinned: !story.pinned, updatedAt: Date.now() } : story
    )))
  }, [])

  const reorderStories = useCallback((fromId, toId, insertBefore) => {
    setStories((prev) => reorderItems(prev, fromId, toId, insertBefore))
  }, [])

  return {
    stories,
    addStory,
    updateStory,
    removeStory,
    updateStoryCover,
    toggleStoryPin,
    reorderStories,
    loaded,
  }
}
