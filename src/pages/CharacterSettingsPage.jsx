import CharacterSettings from '../components/Main/CharacterSettings'
import useStages from '../hooks/useStages'
import useLevelingRules from '../hooks/useLevelingRules'
import useRewardSettings from '../hooks/useRewardSettings'

export default function CharacterSettingsPage() {
  const {
    rules: levelingRules,
    updateExpPerLevel,
    updateLevelRange,
    addLevelingRule,
    removeLevelingRule,
  } = useLevelingRules()
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
  } = useStages()
  const {
    rewardSettings,
    updateRewardGold,
  } = useRewardSettings()

  return (
    <main className="flex justify-center p-4 md:p-10">
      <div className="w-full max-w-[900px]">
        <CharacterSettings
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
        />
      </div>
    </main>
  )
}
