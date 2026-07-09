import { useCallback } from 'react'
import HeroCharacterSettings from '../components/Hero/HeroCharacterSettings'
import useHeroStages from '../hooks/useHeroStages'
import useHeroLevelingRules from '../hooks/useHeroLevelingRules'
import useHeroRewardSettings from '../hooks/useHeroRewardSettings'
import useHeroQuests from '../hooks/useHeroQuests'
import useHeroCharacter from '../hooks/useHeroCharacter'
import useHeroMonsters from '../hooks/useHeroMonsters'
import useQuests from '../hooks/useQuests'
import useCharacter from '../hooks/useCharacter'
import useLevelingRules from '../hooks/useLevelingRules'
import useStages from '../hooks/useStages'
import useMonsters from '../hooks/useMonsters'

export default function HeroCharacterSettingsPage() {
  const {
    rules: levelingRules,
    updateExpPerLevel,
    updateLevelRange,
    addLevelingRule,
    removeLevelingRule,
  } = useHeroLevelingRules()
  const {
    stages,
    updateStageName,
    updateStageAvatar,
    replaceStageAvatar,
    removeStageAvatar,
    updateStageLevel,
    addStage,
    removeStage,
    reorderStages,
    updateStageAvatarPosition,
    resetStageBossHunts,
  } = useHeroStages()
  const {
    rewardSettings,
    updateRewardGold,
  } = useHeroRewardSettings()
  const {
    lifetimeCompletions,
    resetLifetimeCompletions,
  } = useHeroQuests()
  const { resetGold, level } = useHeroCharacter(lifetimeCompletions, levelingRules)
  const { resetMonsterHunts } = useHeroMonsters()

  const handleResetLevel = useCallback(
    (completions) => {
      resetLifetimeCompletions(completions)
      resetStageBossHunts()
      resetMonsterHunts()
      resetGold()
    },
    [resetLifetimeCompletions, resetStageBossHunts, resetMonsterHunts, resetGold],
  )

  const {
    lifetimeCompletions: lifeLifetimeCompletions,
    coreTaskCompleted: lifeCoreTaskCompleted,
    resetLifetimeCompletions: resetLifeLifetimeCompletions,
  } = useQuests()
  const { rules: lifeLevelingRules } = useLevelingRules()
  const { level: lifeLevel, resetGold: resetLifeGold } = useCharacter(
    lifeLifetimeCompletions,
    lifeCoreTaskCompleted,
    lifeLevelingRules,
  )
  const { resetStageBossHunts: resetLifeStageBossHunts } = useStages()
  const { resetMonsterHunts: resetLifeMonsterHunts } = useMonsters()

  const handleResetLifeLevel = useCallback(
    (completions) => {
      resetLifeLifetimeCompletions(completions)
      resetLifeStageBossHunts()
      resetLifeMonsterHunts()
      resetLifeGold()
    },
    [resetLifeLifetimeCompletions, resetLifeStageBossHunts, resetLifeMonsterHunts, resetLifeGold],
  )

  return (
    <main className="flex justify-center p-4 md:p-10">
      <div className="w-full max-w-[900px]">
        <HeroCharacterSettings
          stages={stages}
          onStageName={updateStageName}
          onStageAvatar={updateStageAvatar}
          onStageAvatarReplace={replaceStageAvatar}
          onStageAvatarRemove={removeStageAvatar}
          onStageLevel={updateStageLevel}
          onAddStage={addStage}
          onRemoveStage={removeStage}
          onReorderStages={reorderStages}
          onStageAvatarPosition={updateStageAvatarPosition}
          levelingRules={levelingRules}
          onUpdateExpPerLevel={updateExpPerLevel}
          onUpdateLevelRange={updateLevelRange}
          onAddLevelingRule={addLevelingRule}
          onRemoveLevelingRule={removeLevelingRule}
          rewardSettings={rewardSettings}
          onUpdateRewardGold={updateRewardGold}
          currentLevel={level}
          onResetLevel={handleResetLevel}
          lifeCurrentLevel={lifeLevel}
          lifeLevelingRules={lifeLevelingRules}
          onResetLifeLevel={handleResetLifeLevel}
        />
      </div>
    </main>
  )
}
