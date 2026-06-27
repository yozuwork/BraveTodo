import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { compressImage } from '../utils/compressImage'
import { reorderItems } from '../utils/reorderItems'

const SKILLS_DOC = doc(db, 'meta', 'skills')
let cachedSkills = null

const createSkill = () => {
  const now = Date.now()
  return {
    id: now,
    name: '新的技能',
    category: '主動',
    level: 1,
    description: '',
    notes: '',
    stageIds: [],
    cover: null,
    coverPosition: { x: 50, y: 50 },
    pinned: false,
    status: 'learning',
    createdAt: now,
    updatedAt: now,
  }
}

export default function useSkills() {
  const [skills, setSkills] = useState(() => cachedSkills ?? [])
  const [loaded, setLoaded] = useState(() => cachedSkills !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedSkills !== null) return
    getDoc(SKILLS_DOC).then((snap) => {
      let nextSkills = []
      if (snap.exists()) {
        nextSkills = (snap.data().items ?? []).map((skill) => ({
          name: '未命名技能',
          category: '主動',
          level: 1,
          description: '',
          notes: '',
          stageIds: [],
          cover: null,
          coverPosition: { x: 50, y: 50 },
          pinned: false,
          status: 'learning',
          createdAt: skill.id ?? Date.now(),
          updatedAt: skill.id ?? Date.now(),
          ...skill,
        }))
      }
      cachedSkills = nextSkills
      setSkills(nextSkills)
      setLoaded(true)
    }).catch(() => {
      cachedSkills = cachedSkills ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedSkills = skills
    setDoc(SKILLS_DOC, { items: skills }).catch(console.error)
  }, [skills, loaded])

  const addSkill = useCallback(() => {
    const skill = createSkill()
    setSkills((prev) => [skill, ...prev])
    return skill.id
  }, [])

  const updateSkill = useCallback((id, changes) => {
    setSkills((prev) => prev.map((skill) => (
      skill.id === id ? { ...skill, ...changes, updatedAt: Date.now() } : skill
    )))
  }, [])

  const removeSkill = useCallback((id) => {
    setSkills((prev) => prev.filter((skill) => skill.id !== id))
  }, [])

  const updateSkillCover = useCallback((id, file) => {
    if (!file) return
    if (typeof file === 'string') {
      updateSkill(id, { cover: file })
      return
    }
    compressImage(file).then((dataUrl) => updateSkill(id, { cover: dataUrl }))
  }, [updateSkill])

  const toggleSkillPin = useCallback((id) => {
    setSkills((prev) => prev.map((skill) => (
      skill.id === id ? { ...skill, pinned: !skill.pinned, updatedAt: Date.now() } : skill
    )))
  }, [])

  const reorderSkills = useCallback((fromId, toId, insertBefore) => {
    setSkills((prev) => reorderItems(prev, fromId, toId, insertBefore))
  }, [])

  return {
    skills,
    addSkill,
    updateSkill,
    removeSkill,
    updateSkillCover,
    toggleSkillPin,
    reorderSkills,
    loaded,
  }
}
