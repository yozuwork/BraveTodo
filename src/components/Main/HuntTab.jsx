import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import StageBossCard from './StageBossCard'
import { useRef, useState } from 'react'

export default function HuntTab({
  currentLevel,
  stages, onStartStageBossHunt, onStopStageBossHunt, onCompleteStageBossHunt,
  onStageBossNameChange, onStageBossAvatarChange,
  onStageLevelChange, onAddStage, onRemoveStage, onReorderStages,
}) {
  const dragIdRef = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [insertBefore, setInsertBefore] = useState(true)

  const handleDragStart = (e, id) => {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOverId(id)
    setInsertBefore(e.clientX < rect.left + rect.width / 2)
  }

  const handleDrop = (e, id) => {
    e.preventDefault()
    if (dragIdRef.current && dragIdRef.current !== id) {
      onReorderStages(dragIdRef.current, id, insertBefore)
    }
    dragIdRef.current = null
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
    setDragOverId(null)
  }

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
            <div
              key={stage.id}
              draggable
              onDragStart={(e) => handleDragStart(e, stage.id)}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragEnd={handleDragEnd}
              className="relative group/drag"
              style={{ opacity: dragIdRef.current === stage.id ? 0.42 : 1 }}
            >
              {dragOverId === stage.id && insertBefore && (
                <div className="absolute left-0 right-0 -top-2 h-1 rounded-full bg-purple-400 z-20" />
              )}
              <div className="absolute -left-2 top-3 z-20 opacity-0 group-hover/drag:opacity-100 transition-opacity pointer-events-none">
                <DragIndicatorIcon sx={{ fontSize: 18, color: '#a855f7' }} />
              </div>
              <StageBossCard
                stage={stage}
                stageIndex={index}
                currentLevel={currentLevel}
                onStartHunt={onStartStageBossHunt}
                onStopHunt={onStopStageBossHunt}
                onCompleteHunt={onCompleteStageBossHunt}
                onBossNameChange={onStageBossNameChange}
                onBossAvatarChange={onStageBossAvatarChange}
                onStageLevelChange={onStageLevelChange}
                onRemove={onRemoveStage}
                canDelete={stages.length > 1}
              />
              {dragOverId === stage.id && !insertBefore && (
                <div className="absolute left-0 right-0 -bottom-2 h-1 rounded-full bg-purple-400 z-20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
