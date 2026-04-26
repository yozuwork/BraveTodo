import StageBossCard from './StageBossCard'

export default function HuntTab({
  isEditMode, currentLevel,
  stages, onStartStageBossHunt, onStopStageBossHunt,
  onStageBossNameChange, onStageBossAvatarChange,
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-black m-0">階段晉級Boss</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">通關各階段Boss即可晉升職業・等級接近時解鎖討伐</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {stages.map((stage, index) => (
            <StageBossCard
              key={stage.id}
              stage={stage}
              stageIndex={index}
              currentLevel={currentLevel}
              isEditMode={isEditMode}
              onStartHunt={onStartStageBossHunt}
              onStopHunt={onStopStageBossHunt}
              onBossNameChange={onStageBossNameChange}
              onBossAvatarChange={onStageBossAvatarChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
