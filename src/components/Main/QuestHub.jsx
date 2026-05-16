import { useState, useEffect, useRef, useCallback } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import Button from '@mui/material/Button'
import TabNav from './TabNav'
import QuestItem from './QuestItem'
import InboxItem from './InboxItem'
import StageSettings from './StageSettings'
import LevelingSettings from './LevelingSettings'
import OtherSettings from './OtherSettings'
import HuntTab from './HuntTab'
import HuntMission from './HuntMission'

export default function QuestHub({
  quests, onAdd, onToggle, onUpdate, onRemove, onTogglePin, onToggleCore, onSetPriority, onSetExp, onReorderQuests, onClearCompleted,
  onDemoteToInbox,
  onInboxAddSubTask, onInboxToggleSubTask, onInboxRemoveSubTask, onInboxUpdateSubTask,
  stages, onStageName, onStageAvatar, onStageAvatarRemove, onStageLevel, onAddStage, onRemoveStage, onReorderStages,
  inboxItems, onInboxAdd, onInboxRemove, onInboxUpdate, onPromoteToQuest,
  levelingRules, onUpdateExpPerLevel,
  atk,
  onAddSubTask, onToggleSubTask, onRemoveSubTask, onUpdateSubTask,
  currentLevel, onResetLevel,
  monsters, onAddMonster, onUpdateMonster, onRemoveMonster, onMonsterAvatarChange,
  onStartHunt, onStopHunt,
  onStartStageBossHunt, onStopStageBossHunt,
  onStageBossNameChange, onStageBossAvatarChange,
  activeHuntTarget, huntTaskHandlers,
  onReorderInbox,
  onBindQuestToActiveHuntTask,
  onUnbindQuestFromHuntTask,
  onCreateAndBindQuestToActiveHunt,
  // lifted tab state
  activeTab, onTabChange,
}) {
  const [inputValue, setInputValue] = useState('')
  const [inboxInput, setInboxInput] = useState('')
  const isComposingRef = useRef(false)
  const isInboxComposingRef = useRef(false)

  // ── Drag-and-drop state ──
  const questDragId = useRef(null)
  const [questDragOverId, setQuestDragOverId] = useState(null)
  const [questInsertBefore, setQuestInsertBefore] = useState(true)

  const inboxDragId = useRef(null)
  const [inboxDragOverId, setInboxDragOverId] = useState(null)
  const [inboxInsertBefore, setInboxInsertBefore] = useState(true)

  const handleQuestDragStart = useCallback((e, id) => {
    questDragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleQuestDragOver = useCallback((e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    setQuestDragOverId(id)
    setQuestInsertBefore(e.clientY < rect.top + rect.height / 2)
  }, [])

  const handleQuestDrop = useCallback((e, id) => {
    e.preventDefault()
    if (questDragId.current && questDragId.current !== id) {
      onReorderQuests(questDragId.current, id, questInsertBefore)
    }
    questDragId.current = null
    setQuestDragOverId(null)
  }, [onReorderQuests, questInsertBefore])

  const handleQuestDragEnd = useCallback(() => {
    questDragId.current = null
    setQuestDragOverId(null)
  }, [])

  const handleInboxDragStart = useCallback((e, id) => {
    inboxDragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleInboxDragOver = useCallback((e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    setInboxDragOverId(id)
    setInboxInsertBefore(e.clientY < rect.top + rect.height / 2)
  }, [])

  const handleInboxDrop = useCallback((e, id) => {
    e.preventDefault()
    if (inboxDragId.current && inboxDragId.current !== id) {
      onReorderInbox(inboxDragId.current, id, inboxInsertBefore)
    }
    inboxDragId.current = null
    setInboxDragOverId(null)
  }, [onReorderInbox, inboxInsertBefore])

  const handleInboxDragEnd = useCallback(() => {
    inboxDragId.current = null
    setInboxDragOverId(null)
  }, [])

  const hasActiveHunt = activeHuntTarget !== null

  useEffect(() => {
    if (!hasActiveHunt && activeTab === 'HuntMission') {
      onTabChange('Tasks')
    }
  }, [hasActiveHunt, activeTab, onTabChange])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isComposingRef.current && inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const handleInboxKeyDown = (e) => {
    if (e.key === 'Enter' && !isInboxComposingRef.current && inboxInput.trim()) {
      onInboxAdd(inboxInput.trim())
      setInboxInput('')
    }
  }

  const hasCompleted = quests.some((q) => q.completed)

  return (
    <div className="flex-1 flex flex-col gap-5">
      <div className="flex flex-col gap-4 mb-5">
        <h1 className="text-black text-2xl md:text-4xl font-extrabold uppercase m-0 tracking-tight">
          米莉亞
        </h1>
        <TabNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          hasActiveHunt={hasActiveHunt}
        />
      </div>

      {activeTab === 'Tasks' && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-btn pointer-events-none">
              <AddIcon fontSize="small" />
            </span>
            <input
              type="text"
              className="w-full bg-white text-black border border-gray-200 rounded-xl py-4 pl-12 pr-20 text-sm focus:outline-none focus:border-purple-400 transition-colors"
              placeholder="Add new quest..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onCompositionStart={() => { isComposingRef.current = true }}
              onCompositionEnd={() => { isComposingRef.current = false }}
              onKeyDown={handleKeyDown}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono pointer-events-none">
              ENTER ↵
            </span>
          </div>

          {hasCompleted && (
            <div className="flex justify-end">
              <Button
                size="small"
                onClick={onClearCompleted}
                sx={{
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#fee2e2' },
                }}
              >
                清除已完成任務
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {quests.length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <p className="text-lg font-semibold">No quests yet</p>
                <p className="text-sm mt-1">Add your first quest above to begin your adventure!</p>
              </div>
            ) : (
              [...quests]
                .sort((a, b) => {
                  if (a.completed !== b.completed) return a.completed ? 1 : -1
                  if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
                  return 0
                })
                .map((quest) => {
                  const isOver = questDragOverId === quest.id
                  return (
                    <div
                      key={quest.id}
                      draggable={!quest.completed}
                      onDragStart={(e) => handleQuestDragStart(e, quest.id)}
                      onDragOver={(e) => !quest.completed && handleQuestDragOver(e, quest.id)}
                      onDrop={(e) => handleQuestDrop(e, quest.id)}
                      onDragEnd={handleQuestDragEnd}
                      className={`relative group/drag ${!quest.completed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      style={{ opacity: questDragId.current === quest.id ? 0.4 : 1 }}
                    >
                      {isOver && questInsertBefore && (
                        <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-purple-400 rounded-full z-10 pointer-events-none" />
                      )}
                      <div className="absolute left-0 top-0 bottom-0 flex items-center pl-1 opacity-0 group-hover/drag:opacity-100 transition-opacity z-10 pointer-events-none">
                        {!quest.completed && <DragIndicatorIcon sx={{ fontSize: 16, color: '#d1d5db' }} />}
                      </div>
                      <QuestItem
                        quest={quest}
                        onToggle={onToggle}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                        onTogglePin={onTogglePin}
                        onToggleCore={onToggleCore}
                        onSetPriority={onSetPriority}
                        onSetExp={onSetExp}
                        onDemoteToInbox={onDemoteToInbox}
                        atk={atk}
                        onAddSubTask={onAddSubTask}
                        onToggleSubTask={onToggleSubTask}
                        onRemoveSubTask={onRemoveSubTask}
                        onUpdateSubTask={onUpdateSubTask}
                        activeHuntTarget={activeHuntTarget}
                        monsters={monsters}
                        stages={stages}
                        onBindQuestToActiveHuntTask={onBindQuestToActiveHuntTask}
                        onUnbindQuestFromHuntTask={onUnbindQuestFromHuntTask}
                        onCreateAndBindQuestToActiveHunt={onCreateAndBindQuestToActiveHunt}
                      />
                      {isOver && !questInsertBefore && (
                        <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-purple-400 rounded-full z-10 pointer-events-none" />
                      )}
                    </div>
                  )
                })
            )}
          </div>
        </div>
      )}

      {activeTab === 'HuntMission' && (
        <HuntMission
          target={activeHuntTarget}
          onAddHuntTask={huntTaskHandlers.onAddHuntTask}
          onToggleHuntTask={huntTaskHandlers.onToggleHuntTask}
          onRemoveHuntTask={huntTaskHandlers.onRemoveHuntTask}
          onUpdateHuntTask={huntTaskHandlers.onUpdateHuntTask}
          onStopHunt={huntTaskHandlers.onStopHunt}
          onCompleteHunt={huntTaskHandlers.onCompleteHunt}
        />
      )}

      {activeTab === 'Stages' && (
        <StageSettings
          stages={stages}
          onNameChange={onStageName}
          onAvatarChange={onStageAvatar}
          onRemoveAvatar={onStageAvatarRemove}
          onLevelChange={onStageLevel}
          onAddStage={onAddStage}
          onRemoveStage={onRemoveStage}
          onReorderStages={onReorderStages}
        />
      )}

      {activeTab === 'Leveling' && (
        <LevelingSettings
          rules={levelingRules}
          onUpdateExpPerLevel={onUpdateExpPerLevel}
        />
      )}

      {activeTab === 'Other' && (
        <OtherSettings
          currentLevel={currentLevel}
          levelingRules={levelingRules}
          onResetLevel={onResetLevel}
        />
      )}

      {activeTab === 'Hunt' && (
        <HuntTab
          monsters={monsters}
          onAdd={onAddMonster}
          onUpdate={onUpdateMonster}
          onRemove={onRemoveMonster}
          onAvatarChange={onMonsterAvatarChange}
          currentLevel={currentLevel}
          onStartHunt={onStartHunt}
          onStopHunt={onStopHunt}
          stages={stages}
          onStartStageBossHunt={onStartStageBossHunt}
          onStopStageBossHunt={onStopStageBossHunt}
          onStageBossNameChange={onStageBossNameChange}
          onStageBossAvatarChange={onStageBossAvatarChange}
          onStageLevelChange={onStageLevel}
          onAddStage={onAddStage}
          onRemoveStage={onRemoveStage}
        />
      )}

      {activeTab === 'Inbox' && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <AddIcon fontSize="small" />
            </span>
            <input
              type="text"
              className="w-full bg-white text-black border border-gray-200 rounded-xl py-4 pl-12 pr-20 text-sm focus:outline-none focus:border-gray-400 transition-colors"
              placeholder="新增到收集箱..."
              value={inboxInput}
              onChange={(e) => setInboxInput(e.target.value)}
              onCompositionStart={() => { isInboxComposingRef.current = true }}
              onCompositionEnd={() => { isInboxComposingRef.current = false }}
              onKeyDown={handleInboxKeyDown}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono pointer-events-none">
              ENTER ↵
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {inboxItems.length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <p className="text-lg font-semibold">收集箱是空的</p>
                <p className="text-sm mt-1">把待釐清的事項放這裡，之後再轉成任務！</p>
              </div>
            ) : (
              inboxItems.map((item) => {
                const isOver = inboxDragOverId === item.id
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleInboxDragStart(e, item.id)}
                    onDragOver={(e) => handleInboxDragOver(e, item.id)}
                    onDrop={(e) => handleInboxDrop(e, item.id)}
                    onDragEnd={handleInboxDragEnd}
                    className="relative group/drag cursor-grab active:cursor-grabbing"
                    style={{ opacity: inboxDragId.current === item.id ? 0.4 : 1 }}
                  >
                    {isOver && inboxInsertBefore && (
                      <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 pointer-events-none" />
                    )}
                    <div className="absolute left-0 top-0 bottom-0 flex items-center pl-1 opacity-0 group-hover/drag:opacity-100 transition-opacity z-10 pointer-events-none">
                      <DragIndicatorIcon sx={{ fontSize: 16, color: '#d1d5db' }} />
                    </div>
                    <InboxItem
                      item={item}
                      onUpdate={onInboxUpdate}
                      onRemove={onInboxRemove}
                      onPromoteToQuest={onPromoteToQuest}
                      onAddSubTask={onInboxAddSubTask}
                      onToggleSubTask={onInboxToggleSubTask}
                      onRemoveSubTask={onInboxRemoveSubTask}
                      onUpdateSubTask={onInboxUpdateSubTask}
                    />
                    {isOver && !inboxInsertBefore && (
                      <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-gray-400 rounded-full z-10 pointer-events-none" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
