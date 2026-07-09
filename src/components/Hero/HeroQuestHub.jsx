import { useState, useEffect, useRef, useCallback } from 'react'
import AddIcon from '@mui/icons-material/Add'
import Button from '@mui/material/Button'
import HeroTabNav from './HeroTabNav'
import HeroQuestItem from './HeroQuestItem'
import HeroInboxItem from './HeroInboxItem'
import HeroHuntTab from './HeroHuntTab'
import HeroHuntMission from './HeroHuntMission'
import HeroStoryTab from './HeroStoryTab'
import HeroSkillTab from './HeroSkillTab'
import HeroMapTab from './HeroMapTab'
import HeroNpcTab from './HeroNpcTab'
import HeroRewardShopTab from './HeroRewardShopTab'

export default function HeroQuestHub({
  quests, onAdd, onToggle, onUpdate, onRemove, onTogglePin, onSetPriority, onSetExp, onClearCompleted,
  onAddSubTask, onToggleSubTask, onRemoveSubTask, onUpdateSubTask, onReorderQuests,
  stages, onStageName, onStageAvatar, onStageAvatarReplace, onStageAvatarRemove, onStageLevel,
  onAddStage, onRemoveStage, onReorderStages, onStageAvatarPosition,
  monsters, onAddMonster, onUpdateMonster, onRemoveMonster, onMonsterAvatarChange,
  onStartHunt, onStopHunt,
  onStartStageBossHunt, onStopStageBossHunt, onCompleteStageBossHunt,
  onStageBossNameChange, onStageBossAvatarChange,
  activeHuntTarget, huntTaskHandlers,
  onBindQuestToActiveHuntTask, onUnbindQuestFromHuntTask, onCreateAndBindQuestToActiveHunt,
  currentLevel,
  inboxItems, onInboxAdd, onInboxRemove, onInboxUpdate, onReorderInbox, onPromoteToQuest,
  onInboxAddSubTask, onInboxToggleSubTask, onInboxRemoveSubTask, onInboxUpdateSubTask,
  stories, onStoryAdd, onStoryUpdate, onStoryRemove, onStoryCoverChange, onStoryTogglePin, onReorderStories,
  rewards, rewardTemplates, gold, onRewardAdd, onRewardAddFromTemplate, onRewardUpdate, onRewardRemove,
  onRewardCoverChange, onRewardTogglePin, onRewardPurchase, onRewardArchive, onRewardUse, onReorderRewards,
  onSaveRewardTemplate, onUpdateRewardTemplate, onRemoveRewardTemplate,
  skills, onSkillAdd, onSkillUpdate, onSkillRemove, onSkillCoverChange, onSkillTogglePin, onReorderSkills,
  maps, onMapAdd, onMapUpdate, onMapRemove, onMapCoverChange, onReorderMaps,
  npcs, onNpcAdd, onNpcUpdate, onNpcRemove, onNpcCoverChange, onReorderNpcs,
  activeTab, onTabChange,
}) {
  const [inputValue, setInputValue] = useState('')
  const [inboxInput, setInboxInput] = useState('')

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

  const submitInput = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const submitInboxInput = () => {
    if (inboxInput.trim()) {
      onInboxAdd(inboxInput.trim())
      setInboxInput('')
    }
  }

  const hasCompleted = quests.some((q) => q.completed)
  const activeQuestCount = quests.filter((quest) => !quest.completed).length

  return (
    <div className="flex-1 flex flex-col gap-5">
      <div className="flex flex-col gap-4 mb-2">
        <div className="flex items-end justify-between gap-6">
          <h1 className="text-black text-3xl font-extrabold uppercase m-0 tracking-tight">
            英雄任務
          </h1>
          <p className="text-sm font-bold text-gray-400 m-0">
            <span className="text-purple-btn text-xl">{activeQuestCount}</span> 個進行中任務
          </p>
        </div>
        <div>
          <HeroTabNav activeTab={activeTab} onTabChange={onTabChange} hasActiveHunt={hasActiveHunt} />
        </div>
      </div>

      {activeTab === 'Tasks' && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-btn pointer-events-none">
              <AddIcon fontSize="small" />
            </span>
            <input
              type="text"
              className="w-full bg-white text-black border border-gray-200 rounded-xl py-4 pl-12 pr-20 text-sm focus:outline-none focus:border-purple-400 transition-colors placeholder:text-gray-400"
              placeholder="輸入英雄任務?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitInput()
                }
              }}
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
                sx={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#fee2e2' } }}
              >
                清除已完成任務
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {quests.length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <p className="text-lg font-semibold">尚無英雄任務</p>
                <p className="text-sm mt-1">在上方新增第一個任務，開始你的英雄旅程！</p>
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
                      <HeroQuestItem
                        quest={quest}
                        onToggle={onToggle}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                        onTogglePin={onTogglePin}
                        onSetPriority={onSetPriority}
                        onSetExp={onSetExp}
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
        <HeroHuntMission
          target={activeHuntTarget}
          onAddHuntTask={huntTaskHandlers.onAddHuntTask}
          onToggleHuntTask={huntTaskHandlers.onToggleHuntTask}
          onRemoveHuntTask={huntTaskHandlers.onRemoveHuntTask}
          onUpdateHuntTask={huntTaskHandlers.onUpdateHuntTask}
          onStopHunt={huntTaskHandlers.onStopHunt}
          onCompleteHunt={huntTaskHandlers.onCompleteHunt}
        />
      )}

      {activeTab === 'Hunt' && (
        <HeroHuntTab
          monsters={monsters}
          currentLevel={currentLevel}
          onStartHunt={onStartHunt}
          onStopHunt={onStopHunt}
          stages={stages}
          onStartStageBossHunt={onStartStageBossHunt}
          onStopStageBossHunt={onStopStageBossHunt}
          onCompleteStageBossHunt={onCompleteStageBossHunt}
          onStageBossNameChange={onStageBossNameChange}
          onStageBossAvatarChange={onStageBossAvatarChange}
          onStageLevelChange={onStageLevel}
          onAddStage={onAddStage}
          onRemoveStage={onRemoveStage}
          onReorderStages={onReorderStages}
        />
      )}

      {activeTab === 'RewardShop' && (
        <HeroRewardShopTab
          rewards={rewards}
          rewardTemplates={rewardTemplates}
          gold={gold}
          onAdd={onRewardAdd}
          onAddFromTemplate={onRewardAddFromTemplate}
          onUpdate={onRewardUpdate}
          onRemove={onRewardRemove}
          onCoverChange={onRewardCoverChange}
          onTogglePin={onRewardTogglePin}
          onPurchase={onRewardPurchase}
          onArchive={onRewardArchive}
          onUse={onRewardUse}
          onReorder={onReorderRewards}
          onSaveTemplate={onSaveRewardTemplate}
          onUpdateTemplate={onUpdateRewardTemplate}
          onRemoveTemplate={onRemoveRewardTemplate}
        />
      )}

      {activeTab === 'Story' && (
        <HeroStoryTab
          stories={stories}
          onAdd={onStoryAdd}
          onUpdate={onStoryUpdate}
          onRemove={onStoryRemove}
          onCoverChange={onStoryCoverChange}
          onTogglePin={onStoryTogglePin}
          onReorder={onReorderStories}
        />
      )}

      {activeTab === 'Skills' && (
        <HeroSkillTab
          skills={skills}
          stages={stages}
          currentLevel={currentLevel}
          onAdd={onSkillAdd}
          onUpdate={onSkillUpdate}
          onRemove={onSkillRemove}
          onCoverChange={onSkillCoverChange}
          onTogglePin={onSkillTogglePin}
          onReorder={onReorderSkills}
        />
      )}

      {activeTab === 'Map' && (
        <HeroMapTab
          maps={maps}
          onAdd={onMapAdd}
          onUpdate={onMapUpdate}
          onRemove={onMapRemove}
          onCoverChange={onMapCoverChange}
          onReorder={onReorderMaps}
        />
      )}

      {activeTab === 'Npc' && (
        <HeroNpcTab
          npcs={npcs}
          onAdd={onNpcAdd}
          onUpdate={onNpcUpdate}
          onRemove={onNpcRemove}
          onCoverChange={onNpcCoverChange}
          onReorder={onReorderNpcs}
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
              className="w-full bg-white text-black border border-gray-200 rounded-xl py-4 pl-12 pr-20 text-sm focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-400"
              placeholder="新增到收集箱..."
              value={inboxInput}
              onChange={(e) => setInboxInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitInboxInput()
                }
              }}
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
                    <HeroInboxItem
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
