import CharacterSettings from '../components/Main/CharacterSettings'
import useStages from '../hooks/useStages'
import useLevelingRules from '../hooks/useLevelingRules'

export default function CharacterSettingsPage() {
  const { rules: levelingRules, updateExpPerLevel } = useLevelingRules()
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
        />
      </div>
    </main>
  )
}
