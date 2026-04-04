import { useState, useCallback, useMemo } from 'react'

const BASE_STATS = { atk: 158, def: 94, spd: 210 }
const BASE_EXP_PER_LEVEL = 1000

export default function useCharacter(totalExp) {
  const [avatar, setAvatar] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev)
  }, [])

  const updateAvatar = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setAvatar(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  const level = useMemo(() => Math.floor(totalExp / BASE_EXP_PER_LEVEL) + 1, [totalExp])
  const expProgress = useMemo(
    () => ((totalExp % BASE_EXP_PER_LEVEL) / BASE_EXP_PER_LEVEL) * 100,
    [totalExp]
  )

  const stats = useMemo(
    () => ({
      atk: { value: BASE_STATS.atk + level * 2, bonus: level * 2 },
      def: { value: BASE_STATS.def + level, bonus: level },
      spd: { value: BASE_STATS.spd + level * 3, bonus: level * 3 },
    }),
    [level]
  )

  return {
    avatar,
    isEditMode,
    toggleEditMode,
    updateAvatar,
    level,
    expProgress,
    stats,
  }
}
