export const FALLBACK_EXP_PER_LEVEL = 1

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
