import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { compressImage } from '../utils/compressImage'
import { reorderItems } from '../utils/reorderItems'
import { storeImage, fetchImageSrcs, removeStoredImage } from '../utils/imageStorage'

const REWARD_SHOP_DOC = doc(db, 'meta', 'rewardShop')
const DEFAULT_COVER_POSITION = { x: 50, y: 50 }

let cachedRewards = null
let cachedRewardTemplates = null
let cachedRewardImageSrcs = {}

export const REWARD_TYPES = {
  own_once: '消費一次擁有',
  pay_per_use: '每次使用都需花費',
}

function normalizeOwnedCount(value, fallback = 0) {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed)
  return fallback
}

function sanitize(value) {
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map((item) => sanitize(item === undefined ? null : item))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]))
  }
  return value
}

function normalizeCoverPosition(position) {
  return {
    x: Number(position?.x ?? DEFAULT_COVER_POSITION.x),
    y: Number(position?.y ?? DEFAULT_COVER_POSITION.y),
  }
}

function normalizeCoverRef(cover) {
  return typeof cover === 'string' && cover.trim() ? cover : null
}

function resolveStoredCover(ref, imageSrcs) {
  if (!ref) return null
  if (typeof ref === 'string' && ref.startsWith('img_')) {
    return imageSrcs[ref] ?? null
  }
  return ref
}

const createReward = (seed = {}) => {
  const now = Date.now()
  const legacyOwnedCount = seed.status === 'redeemed' ? 1 : 0
  return {
    id: now,
    title: '新的獎勵',
    cost: '100 金幣',
    excerpt: '',
    notes: '',
    cover: null,
    coverSrc: null,
    coverPosition: { ...DEFAULT_COVER_POSITION },
    pinned: false,
    rewardType: 'own_once',
    ownedCount: 0,
    status: 'available',
    createdAt: now,
    updatedAt: now,
    redeemedAt: null,
    usedAt: null,
    ...seed,
    id: seed.id ?? now,
    cover: normalizeCoverRef(seed.cover ?? null),
    coverPosition: normalizeCoverPosition(seed.coverPosition),
    pinned: Boolean(seed.pinned ?? false),
    ownedCount: normalizeOwnedCount(seed.ownedCount, legacyOwnedCount),
    status: seed.status ?? 'available',
    createdAt: seed.createdAt ?? now,
    updatedAt: seed.updatedAt ?? now,
    redeemedAt: seed.redeemedAt ?? null,
    usedAt: seed.usedAt ?? null,
  }
}

const normalizeTemplate = (template = {}) => ({
  id: template.id ?? Date.now(),
  name: template.name ?? template.title ?? '未命名模板',
  title: template.title ?? '新的獎勵',
  cost: template.cost ?? '100 金幣',
  excerpt: template.excerpt ?? '',
  notes: template.notes ?? '',
  cover: normalizeCoverRef(template.cover),
  coverPosition: normalizeCoverPosition(template.coverPosition),
  rewardType: template.rewardType ?? 'own_once',
  createdAt: template.createdAt ?? Date.now(),
  updatedAt: template.updatedAt ?? Date.now(),
})

const normalizeReward = (reward = {}) => ({
  id: reward.id ?? Date.now(),
  title: reward.title ?? '新的獎勵',
  cost: reward.cost ?? '100 金幣',
  excerpt: reward.excerpt ?? '',
  notes: reward.notes ?? '',
  cover: normalizeCoverRef(reward.cover),
  coverPosition: normalizeCoverPosition(reward.coverPosition),
  pinned: Boolean(reward.pinned),
  rewardType: reward.rewardType ?? 'own_once',
  ownedCount: normalizeOwnedCount(reward.ownedCount, reward.status === 'redeemed' ? 1 : 0),
  status: reward.status ?? 'available',
  createdAt: reward.createdAt ?? Date.now(),
  updatedAt: reward.updatedAt ?? Date.now(),
  redeemedAt: reward.redeemedAt ?? null,
  usedAt: reward.usedAt ?? null,
})

function decorateReward(reward, imageSrcs) {
  const normalized = normalizeReward(reward)
  return {
    ...normalized,
    coverSrc: resolveStoredCover(normalized.cover, imageSrcs),
  }
}

function decorateTemplate(template, imageSrcs) {
  const normalized = normalizeTemplate(template)
  return {
    ...normalized,
    coverSrc: resolveStoredCover(normalized.cover, imageSrcs),
  }
}

export default function useRewardShop() {
  const [rewards, setRewards] = useState(() => cachedRewards ?? [])
  const [rewardTemplates, setRewardTemplates] = useState(() => cachedRewardTemplates ?? [])
  const [imageSrcs, setImageSrcs] = useState(() => cachedRewardImageSrcs)
  const [loaded, setLoaded] = useState(() => cachedRewards !== null)
  const skipWriteRef = useRef(true)

  const resolveCoverSrc = useCallback((ref) => resolveStoredCover(ref, imageSrcs), [imageSrcs])

  useEffect(() => {
    cachedRewardImageSrcs = imageSrcs
  }, [imageSrcs])

  useEffect(() => {
    if (cachedRewards !== null) {
      setLoaded(true)
      return
    }

    let cancelled = false

    getDoc(REWARD_SHOP_DOC).then(async (snap) => {
      let nextRewards = []
      let nextTemplates = []
      const nextImageSrcs = { ...cachedRewardImageSrcs }

      if (snap.exists()) {
        const data = snap.data()
        const rawRewards = (data.items ?? []).map(normalizeReward)
        const rawTemplates = (data.templates ?? []).map(normalizeTemplate)
        const imageIds = [
          ...rawRewards.map((reward) => reward.cover),
          ...rawTemplates.map((template) => template.cover),
        ].filter((ref) => typeof ref === 'string' && ref.startsWith('img_'))

        if (imageIds.length > 0) {
          Object.assign(nextImageSrcs, await fetchImageSrcs(imageIds))
        }

        nextRewards = rawRewards.map((reward) => decorateReward(reward, nextImageSrcs))
        nextTemplates = rawTemplates.map((template) => decorateTemplate(template, nextImageSrcs))
      }

      cachedRewards = nextRewards
      cachedRewardTemplates = nextTemplates
      cachedRewardImageSrcs = nextImageSrcs

      if (cancelled) return

      setRewards(nextRewards)
      setRewardTemplates(nextTemplates)
      setImageSrcs(nextImageSrcs)
      setLoaded(true)
    }).catch(() => {
      if (cancelled) return
      cachedRewards = cachedRewards ?? []
      cachedRewardTemplates = cachedRewardTemplates ?? []
      cachedRewardImageSrcs = cachedRewardImageSrcs ?? {}
      setRewards(cachedRewards)
      setRewardTemplates(cachedRewardTemplates)
      setImageSrcs(cachedRewardImageSrcs)
      setLoaded(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }

    cachedRewards = rewards
    cachedRewardTemplates = rewardTemplates

    setDoc(REWARD_SHOP_DOC, {
      items: rewards.map((reward) => sanitize(normalizeReward(reward))),
      templates: rewardTemplates.map((template) => sanitize(normalizeTemplate(template))),
    }).catch(console.error)
  }, [loaded, rewardTemplates, rewards])

  const addReward = useCallback(() => {
    const reward = createReward()
    setRewards((prev) => [reward, ...prev])
    return reward.id
  }, [])

  const addRewardFromTemplate = useCallback((templateId) => {
    const source = (cachedRewardTemplates ?? rewardTemplates).find((item) => item.id === templateId)
    const reward = createReward(source ? {
      title: source.title,
      cost: source.cost,
      excerpt: source.excerpt,
      notes: source.notes,
      cover: source.cover,
      coverSrc: source.coverSrc ?? resolveCoverSrc(source.cover),
      coverPosition: source.coverPosition,
      rewardType: source.rewardType,
    } : {})
    setRewards((prev) => [reward, ...prev])
    return reward.id
  }, [resolveCoverSrc, rewardTemplates])

  const updateReward = useCallback((id, changes) => {
    setRewards((prev) => prev.map((reward) => {
      if (reward.id !== id) return reward

      const next = {
        ...reward,
        ...changes,
        cover: Object.prototype.hasOwnProperty.call(changes, 'cover')
          ? normalizeCoverRef(changes.cover)
          : reward.cover,
        coverPosition: Object.prototype.hasOwnProperty.call(changes, 'coverPosition')
          ? normalizeCoverPosition(changes.coverPosition)
          : normalizeCoverPosition(reward.coverPosition),
        updatedAt: Date.now(),
      }

      if (Object.prototype.hasOwnProperty.call(changes, 'coverSrc')) {
        next.coverSrc = changes.coverSrc ?? resolveCoverSrc(next.cover)
      } else if (Object.prototype.hasOwnProperty.call(changes, 'cover')) {
        next.coverSrc = resolveCoverSrc(next.cover)
      } else {
        next.coverSrc = reward.coverSrc ?? resolveCoverSrc(next.cover)
      }

      return next
    }))
  }, [resolveCoverSrc])

  const removeReward = useCallback((id) => {
    setRewards((prev) => {
      const current = prev.find((reward) => reward.id === id)
      if (current?.cover?.startsWith?.('img_')) {
        setImageSrcs((prevImageSrcs) => {
          if (!prevImageSrcs[current.cover]) return prevImageSrcs
          const next = { ...prevImageSrcs }
          delete next[current.cover]
          cachedRewardImageSrcs = next
          return next
        })
        removeStoredImage(current.cover)
      }
      return prev.filter((reward) => reward.id !== id)
    })
  }, [])

  const updateRewardCover = useCallback((id, file) => {
    if (!file) return

    if (typeof file === 'string') {
      updateReward(id, { cover: file, coverSrc: resolveCoverSrc(file) })
      return
    }

    compressImage(file, 1000, 0.85, true).then(async (dataUrl) => {
      const imageId = await storeImage(dataUrl)

      setImageSrcs((prev) => {
        const next = { ...prev, [imageId]: dataUrl }
        cachedRewardImageSrcs = next
        return next
      })

      setRewards((prev) => prev.map((reward) => {
        if (reward.id !== id) return reward

        if (reward.cover?.startsWith?.('img_')) {
          setImageSrcs((prevImageSrcs) => {
            if (!prevImageSrcs[reward.cover]) return prevImageSrcs
            const next = { ...prevImageSrcs }
            delete next[reward.cover]
            cachedRewardImageSrcs = next
            return next
          })
          removeStoredImage(reward.cover)
        }

        return {
          ...reward,
          cover: imageId,
          coverSrc: dataUrl,
          updatedAt: Date.now(),
        }
      }))
    }).catch(console.error)
  }, [resolveCoverSrc, updateReward])

  const toggleRewardPin = useCallback((id) => {
    setRewards((prev) => prev.map((reward) => (
      reward.id === id ? { ...reward, pinned: !reward.pinned, updatedAt: Date.now() } : reward
    )))
  }, [])

  const reorderRewards = useCallback((fromId, toId, insertBefore) => {
    setRewards((prev) => reorderItems(prev, fromId, toId, insertBefore))
  }, [])

  const saveRewardTemplate = useCallback((rewardLike) => {
    const now = Date.now()
    const template = decorateTemplate({
      id: now,
      name: rewardLike.title?.trim() || '未命名模板',
      title: rewardLike.title?.trim() || '新的獎勵',
      cost: rewardLike.cost?.trim() || '100 金幣',
      excerpt: rewardLike.excerpt?.trim() || '',
      notes: rewardLike.notes ?? '',
      cover: rewardLike.cover ?? null,
      coverPosition: rewardLike.coverPosition ?? DEFAULT_COVER_POSITION,
      rewardType: rewardLike.rewardType ?? 'own_once',
      createdAt: now,
      updatedAt: now,
    }, imageSrcs)

    setRewardTemplates((prev) => [template, ...prev])
    return template.id
  }, [imageSrcs])

  const updateRewardTemplate = useCallback((templateId, changes) => {
    setRewardTemplates((prev) => prev.map((template) => {
      if (template.id !== templateId) return template

      return decorateTemplate({
        ...template,
        ...changes,
        cover: Object.prototype.hasOwnProperty.call(changes, 'cover')
          ? normalizeCoverRef(changes.cover)
          : template.cover,
        coverPosition: Object.prototype.hasOwnProperty.call(changes, 'coverPosition')
          ? normalizeCoverPosition(changes.coverPosition)
          : normalizeCoverPosition(template.coverPosition),
        updatedAt: Date.now(),
      }, imageSrcs)
    }))
  }, [imageSrcs])

  const removeRewardTemplate = useCallback((templateId) => {
    setRewardTemplates((prev) => prev.filter((template) => template.id !== templateId))
  }, [])

  return {
    rewards,
    rewardTemplates,
    addReward,
    addRewardFromTemplate,
    updateReward,
    removeReward,
    updateRewardCover,
    toggleRewardPin,
    reorderRewards,
    saveRewardTemplate,
    updateRewardTemplate,
    removeRewardTemplate,
    loaded,
  }
}
