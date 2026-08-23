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
