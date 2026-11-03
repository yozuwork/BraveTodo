import CharacterSettings from '../components/Main/CharacterSettings'
import useStages from '../hooks/useStages'
import useRewardSettings from '../hooks/useRewardSettings'

export default function CharacterSettingsPage() {
  const {
    stages,
    updateStageName,
    updateStageCharacterInfo,
    updateStageAvatar,
    replaceStageAvatar,
    removeStageAvatar,
    updateStageLevel,
    updateStageExpPerLevel,
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
          onStageInfo={updateStageCharacterInfo}
          onStageAvatar={updateStageAvatar}
          onStageAvatarReplace={replaceStageAvatar}
          onStageAvatarRemove={removeStageAvatar}
          onStageLevel={updateStageLevel}
          onStageExpPerLevel={updateStageExpPerLevel}
          onAddStage={addStage}
          onRemoveStage={removeStage}
          onReorderStages={reorderStages}
          onStageAvatarPosition={updateStageAvatarPosition}
          rewardSettings={rewardSettings}
          onUpdateRewardGold={updateRewardGold}
        />
      </div>
    </main>
  )
}
