export const FALLBACK_EXP_PER_LEVEL = 1

// Pre-merge defaults from the old standalone 升級設定 page; only used to migrate stages without expPerLevel
export const DEFAULT_RULES = [
  { id: 1, minLevel: 1,   maxLevel: 10,  expPerLevel: 3 },
  { id: 2, minLevel: 10,  maxLevel: 30,  expPerLevel: 3 },
  { id: 3, minLevel: 30,  maxLevel: 70,  expPerLevel: 3 },
  { id: 4, minLevel: 70,  maxLevel: 120, expPerLevel: 3 },
  { id: 5, minLevel: 120, maxLevel: 180, expPerLevel: 3 },
  { id: 6, minLevel: 180, maxLevel: 250, expPerLevel: 3 },
]

export function normalizeLegacyRules(items) {
  if (!Array.isArray(items)) return DEFAULT_RULES
  return normalizeLevelingRules(
    items.map((item) => {
      const defaultRule = DEFAULT_RULES.find((rule) => rule.id === item?.id)
      return defaultRule ? { ...defaultRule, ...item } : item
    })
  )
}

// Exp per level for a stage that predates per-stage exp: take it from the legacy rule covering the stage's start level
export function resolveStageExpPerLevel(stage, legacyRules = DEFAULT_RULES) {
  const own = Number(stage?.expPerLevel)
  if (Number.isFinite(own) && own >= 1) return own
  const minLevel = Number(stage?.minLevel) || 1
  const rule = normalizeLevelingRules(legacyRules).find(
    (r) => r.minLevel <= minLevel && minLevel < r.maxLevel
  )
  return rule?.expPerLevel ?? FALLBACK_EXP_PER_LEVEL
}

export function stagesToLevelingRules(stages, legacyRules) {
  if (!Array.isArray(stages)) return []
  return normalizeLevelingRules(
    stages.map((stage) => ({
      id: stage.id,
      minLevel: stage.minLevel,
      maxLevel: stage.maxLevel,
      expPerLevel: resolveStageExpPerLevel(stage, legacyRules),
    }))
  )
}

export function normalizeLevelingRules(rules) {
  if (!Array.isArray(rules)) return []

  return rules
    .map((rule, index) => {
      const id = rule?.id ?? index + 1
      const minLevel = Number(rule?.minLevel)
      const maxLevel = Number(rule?.maxLevel)
      const expPerLevel = Number(rule?.expPerLevel)
      const safeMin = Number.isFinite(minLevel) ? Math.max(1, minLevel) : 1
      const safeMax = Number.isFinite(maxLevel) ? Math.max(safeMin, maxLevel) : safeMin

      return {
        id,
        minLevel: safeMin,
        maxLevel: safeMax,
        expPerLevel: Number.isFinite(expPerLevel) ? Math.max(1, expPerLevel) : FALLBACK_EXP_PER_LEVEL,
      }
    })
    .sort((a, b) => a.minLevel - b.minLevel || a.maxLevel - b.maxLevel)
}

function consumeLevels({ remaining, level, endLevel, expPerLevel }) {
  const levelsInRange = Math.max(0, endLevel - level)
  const expForRange = levelsInRange * expPerLevel

  if (remaining < expForRange) {
    const levelsGained = Math.floor(remaining / expPerLevel)
    return {
      done: true,
      remaining: 0,
      level: level + levelsGained,
      expProgress: ((remaining % expPerLevel) / expPerLevel) * 100,
    }
  }

  return {
    done: false,
    remaining: remaining - expForRange,
    level: endLevel,
    expProgress: 0,
  }
}

export function calcLevelInfo(lifetimeCompletions, rules) {
  let remaining = Math.max(0, Number(lifetimeCompletions) || 0)
  let level = 1

  for (const rule of normalizeLevelingRules(rules)) {
    if (rule.maxLevel <= level) continue

    if (level < rule.minLevel) {
      const gapResult = consumeLevels({
        remaining,
        level,
        endLevel: rule.minLevel,
        expPerLevel: FALLBACK_EXP_PER_LEVEL,
      })
      if (gapResult.done) return { level: gapResult.level, expProgress: gapResult.expProgress }
      remaining = gapResult.remaining
      level = gapResult.level
    }

    const ruleStart = Math.max(level, rule.minLevel)
    const ruleResult = consumeLevels({
      remaining,
      level: ruleStart,
      endLevel: rule.maxLevel,
      expPerLevel: rule.expPerLevel,
    })
    if (ruleResult.done) return { level: ruleResult.level, expProgress: ruleResult.expProgress }
    remaining = ruleResult.remaining
    level = ruleResult.level
  }

  return {
    level: level + remaining,
    expProgress: 0,
  }
}

export function calcCompletionsForLevel(targetLevel, rules) {
  const target = Math.max(1, Number(targetLevel) || 1)
  let total = 0
  let level = 1

  for (const rule of normalizeLevelingRules(rules)) {
    if (level >= target) return total
    if (rule.maxLevel <= level) continue

    if (level < rule.minLevel) {
      const gapEnd = Math.min(target, rule.minLevel)
      total += Math.max(0, gapEnd - level) * FALLBACK_EXP_PER_LEVEL
      level = gapEnd
      if (level >= target) return total
    }

    const ruleStart = Math.max(level, rule.minLevel)
    const ruleEnd = Math.min(target, rule.maxLevel)
    total += Math.max(0, ruleEnd - ruleStart) * rule.expPerLevel
    level = ruleEnd
  }

  if (level < target) {
    total += (target - level) * FALLBACK_EXP_PER_LEVEL
  }

  return total
}

export function getHighestConfiguredLevel(rules, fallback = 250) {
  const normalized = normalizeLevelingRules(rules)
  if (normalized.length === 0) return fallback

  return normalized.reduce((max, rule) => Math.max(max, rule.maxLevel), 1)
}
