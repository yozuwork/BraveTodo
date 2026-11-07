export const AUTO_EXP_TIERS = [
  { expValue: 3, label: '中等', defaultSubTaskCount: 2 },
  { expValue: 5, label: '上等', defaultSubTaskCount: 4 },
  { expValue: 10, label: '特級', defaultSubTaskCount: 6 },
  { expValue: 20, label: '特殊任務', defaultSubTaskCount: 10 },
]

export const DEFAULT_AUTO_EXP_SETTINGS = {
  enabled: false,
  thresholds: Object.fromEntries(
    AUTO_EXP_TIERS.map(({ expValue, defaultSubTaskCount }) => [String(expValue), defaultSubTaskCount])
  ),
}

export function normalizeAutoExpSettings(settings) {
  const savedThresholds = settings?.thresholds ?? {}

  return {
    enabled: settings?.enabled === true,
    thresholds: Object.fromEntries(AUTO_EXP_TIERS.map(({ expValue, defaultSubTaskCount }) => {
      const parsed = Number(savedThresholds[String(expValue)])
      const threshold = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : defaultSubTaskCount
      return [String(expValue), threshold]
    })),
  }
}

export function resolveAutoExpValue(subTaskCount, settings) {
  if (!settings?.enabled) return null

  const count = Math.max(0, Number(subTaskCount) || 0)
  return AUTO_EXP_TIERS.reduce((resolved, { expValue }) => {
    const threshold = Math.max(1, Number(settings.thresholds?.[String(expValue)]) || 1)
    return count >= threshold ? Math.max(resolved, expValue) : resolved
  }, 1)
}

// 任務級別解鎖：開啟後，角色等級未達門檻的級別無法選取
export const DEFAULT_TIER_UNLOCK_SETTINGS = {
  enabled: false,
  levels: { '3': 5, '5': 10, '10': 20, '20': 30 },
}

export function normalizeTierUnlockSettings(settings) {
  const savedLevels = settings?.levels ?? {}
  return {
    enabled: settings?.enabled === true,
    levels: Object.fromEntries(AUTO_EXP_TIERS.map(({ expValue }) => {
      const parsed = Number(savedLevels[String(expValue)])
      const fallback = DEFAULT_TIER_UNLOCK_SETTINGS.levels[String(expValue)]
      return [String(expValue), Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback]
    })),
  }
}

// { [expValue]: requiredLevel } for tiers the character has not unlocked yet
export function getLockedExpLevels(settings, level) {
  if (!settings?.enabled) return {}
  return Object.fromEntries(
    Object.entries(settings.levels ?? {})
      .filter(([, required]) => Number(level) < required)
      .map(([expValue, required]) => [Number(expValue), required])
  )
}

// Highest unlocked tier not above the requested one (一般 +1 is always open)
export function clampExpToUnlocked(expValue, lockedExpLevels) {
  if (!lockedExpLevels?.[expValue]) return expValue
  const open = [1, ...AUTO_EXP_TIERS.map((tier) => tier.expValue)]
    .filter((value) => value <= expValue && !lockedExpLevels[value])
  return Math.max(...open)
}
