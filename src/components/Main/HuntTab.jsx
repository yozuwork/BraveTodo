import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import StageBossCard from './StageBossCard'

export default function HuntTab({
  currentLevel,
  stages, onStartStageBossHunt, onStopStageBossHunt,
  onStageBossNameChange, onStageBossAvatarChange,
  onStageLevelChange, onAddStage, onRemoveStage,
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
          <h2 className="text-base font-bold text-black m-0">階段晉級Boss</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">通關各階段Boss即可晉升職業・等級接近時解鎖討伐</p>
          </div>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddStage}
            sx={{
              borderColor: '#a855f7',
              color: '#a855f7',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              flexShrink: 0,
              '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
            }}
          >
            新增
          </Button>
        </div>
        <div className="flex flex-wrap gap-4">
          {stages.map((stage, index) => (
            <StageBossCard
              key={stage.id}
              stage={stage}
              stageIndex={index}
              currentLevel={currentLevel}
              onStartHunt={onStartStageBossHunt}
              onStopHunt={onStopStageBossHunt}
              onBossNameChange={onStageBossNameChange}
              onBossAvatarChange={onStageBossAvatarChange}
              onStageLevelChange={onStageLevelChange}
              onRemove={onRemoveStage}
              canDelete={stages.length > 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
