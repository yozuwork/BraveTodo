import { useState, useEffect, useRef } from 'react'
import AddIcon from '@mui/icons-material/Add'
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
  quests, onAdd, onToggle, onUpdate, onRemove, onToggleCore, onClearCompleted,
  isEditMode, stages, onStageName, onStageAvatar,
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
  // lifted tab state
  activeTab, onTabChange,
}) {
  const [inputValue, setInputValue] = useState('')
  const [inboxInput, setInboxInput] = useState('')
  const isComposingRef = useRef(false)
  const isInboxComposingRef = useRef(false)

  const hasActiveHunt = activeHuntTarget !== null

  useEffect(() => {
    if (!isEditMode && (activeTab === 'Stages' || activeTab === 'Leveling' || activeTab === 'Other')) {
      onTabChange('Tasks')
    }
  }, [isEditMode, activeTab, onTabChange])

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
          isEditMode={isEditMode}
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
              [...quests].sort((a, b) => a.completed - b.completed).map((quest) => (
                <QuestItem
                  key={quest.id}
                  quest={quest}
                  onToggle={onToggle}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onToggleCore={onToggleCore}
                  atk={atk}
                  onAddSubTask={onAddSubTask}
                  onToggleSubTask={onToggleSubTask}
                  onRemoveSubTask={onRemoveSubTask}
                  onUpdateSubTask={onUpdateSubTask}
                />
              ))
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
          isEditMode={isEditMode}
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
              inboxItems.map((item) => (
                <InboxItem
                  key={item.id}
                  item={item}
                  onUpdate={onInboxUpdate}
                  onRemove={onInboxRemove}
                  onPromoteToQuest={onPromoteToQuest}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
