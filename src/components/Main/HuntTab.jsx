import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import MonsterCard from './MonsterCard'
import StageBossCard from './StageBossCard'

export default function HuntTab({
  monsters, isEditMode, onAdd, onUpdate, onRemove, onAvatarChange,
  currentLevel, onStartHunt, onStopHunt,
  stages, onStartStageBossHunt, onStopStageBossHunt,
  onStageBossNameChange, onStageBossAvatarChange,
}) {
  return (
    <div className="flex flex-col gap-8">

      {/* ── Stage Bosses section ── */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-black m-0">階段晉級Boss</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">通關各階段Boss即可晉升職業・等級接近時解鎖討伐</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {stages.map((stage) => (
            <StageBossCard
              key={stage.id}
              stage={stage}
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

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* ── Field Monsters section ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-black m-0">討伐目標</h2>
            <p className="text-xs text-gray-400 mt-0.5 m-0">點擊種類標籤切換・雙擊文字編輯・點擊頭像上傳圖片</p>
          </div>
          {isEditMode && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAdd}
              size="small"
              sx={{
                borderColor: '#a855f7',
                color: '#a855f7',
                borderRadius: 99,
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
              }}
            >
              新增討伐目標
            </Button>
          )}
        </div>

        {monsters.length === 0 ? (
          <div className="text-center py-10 text-gray-300">
            <p className="text-lg font-semibold">尚無討伐目標</p>
            <p className="text-sm mt-1">開啟編輯模式新增你的討伐目標！</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {monsters.map((m) => (
              <MonsterCard
                key={m.id}
                monster={m}
                isEditMode={isEditMode}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onAvatarChange={onAvatarChange}
                currentLevel={currentLevel}
                onStartHunt={onStartHunt}
                onStopHunt={onStopHunt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
