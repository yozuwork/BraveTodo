import { useState, useEffect, useRef, useCallback } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import TabNav from './TabNav'
import QuestItem from './QuestItem'
import InboxItem from './InboxItem'
import HuntTab from './HuntTab'
import HuntMission from './HuntMission'
import StoryTab from './StoryTab'
import SkillTab from './SkillTab'
import MapTab from './MapTab'
import NpcTab from './NpcTab'
import RewardShopTab from './RewardShopTab'
import VocabularyInput from '../common/VocabularyInput'

export default function QuestHub({
  quests, questTemplates, onAdd, onAddFromTemplate, onSaveQuestTemplate, onRemoveQuestTemplate, onToggle, onUpdate, onRemove, onTogglePin, onToggleCore, onSetPriority, onSetExp, onReorderQuests, onClearCompleted,
  onDemoteToInbox,
  onInboxAddSubTask, onInboxToggleSubTask, onInboxRemoveSubTask, onInboxUpdateSubTask,
  stages, onStageName, onStageAvatar, onStageAvatarReplace, onStageAvatarRemove, onStageLevel, onAddStage, onRemoveStage, onReorderStages, onStageAvatarPosition,
  inboxItems, onInboxAdd, onInboxRemove, onInboxUpdate, onPromoteToQuest,
  levelingRules, onUpdateExpPerLevel,
  atk,
  onAddSubTask, onToggleSubTask, onRemoveSubTask, onUpdateSubTask,
  currentLevel, onResetLevel,
  monsters, onAddMonster, onUpdateMonster, onRemoveMonster, onMonsterAvatarChange,
  onStartHunt, onStopHunt,
  onStartStageBossHunt, onStopStageBossHunt, onCompleteStageBossHunt,
  onStageBossNameChange, onStageBossAvatarChange,
  activeHuntTarget, huntTaskHandlers,
  onReorderInbox,
  onBindQuestToActiveHuntTask,
  onUnbindQuestFromHuntTask,
  onCreateAndBindQuestToActiveHunt,
  stories, onStoryAdd, onStoryUpdate, onStoryRemove, onStoryCoverChange, onStoryTogglePin, onReorderStories,
  rewards, rewardTemplates, onRewardAdd, onRewardAddFromTemplate, onRewardUpdate, onRewardRemove, onRewardCoverChange, onRewardTogglePin,
  gold, onRewardPurchase, onRewardArchive, onRewardUse, onReorderRewards,
  onSaveRewardTemplate, onUpdateRewardTemplate, onRemoveRewardTemplate,
  skills, onSkillAdd, onSkillUpdate, onSkillRemove, onSkillCoverChange, onSkillTogglePin, onReorderSkills,
  maps, onMapAdd, onMapUpdate, onMapRemove, onMapCoverChange, onReorderMaps,
  npcs, onNpcAdd, onNpcUpdate, onNpcRemove, onNpcCoverChange, onReorderNpcs,
  getVocabularySuggestions,
  // lifted tab state
  activeTab, onTabChange,
}) {
  const [inputValue, setInputValue] = useState('')
  const [inboxInput, setInboxInput] = useState('')
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false)
  const [questTemplateDialogOpen, setQuestTemplateDialogOpen] = useState(false)
  const [questTemplateSavedNotice, setQuestTemplateSavedNotice] = useState(false)
  const mobileInputRef = useRef(null)

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
    if (mobileComposerOpen) {
      requestAnimationFrame(() => mobileInputRef.current?.focus())
    }
  }, [mobileComposerOpen])

  useEffect(() => {
    if (!questTemplateSavedNotice) return
    const timer = window.setTimeout(() => {
      setQuestTemplateSavedNotice(false)
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [questTemplateSavedNotice])

  useEffect(() => {
    if (!hasActiveHunt && activeTab === 'HuntMission') {
      onTabChange('Tasks')
    }
    if (activeTab === 'Stages' || activeTab === 'Leveling' || activeTab === 'CharacterSettings' || activeTab === 'Other') {
      onTabChange('Tasks')
    }
  }, [hasActiveHunt, activeTab, onTabChange])

  const submitQuestInput = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
      setMobileComposerOpen(false)
    }
  }

  const submitInboxInput = () => {
    if (inboxInput.trim()) {
      onInboxAdd(inboxInput.trim())
      setInboxInput('')
    }
  }

  const commitQuestSuggestion = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setInputValue('')
    setMobileComposerOpen(false)
  }

  const commitInboxSuggestion = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    onInboxAdd(trimmed)
    setInboxInput('')
  }

  const hasCompleted = quests.some((q) => q.completed)
  const activeQuestCount = quests.filter((quest) => !quest.completed).length
  const taskSuggestions = getVocabularySuggestions?.(inputValue, ['task', 'inbox']) ?? []
  const inboxSuggestions = getVocabularySuggestions?.(inboxInput, ['inbox', 'task']) ?? []

  const handleSaveQuestTemplate = useCallback((quest) => {
    const templateId = onSaveQuestTemplate?.(quest)
    if (templateId) {
      setQuestTemplateSavedNotice(true)
    }
  }, [onSaveQuestTemplate])

  return (
    <div className="mobile-work-hub flex-1 flex flex-col gap-5">
      <div className="hidden md:flex flex-col gap-4 mb-5">
        <div className="flex items-end justify-between gap-6">
          <h1 className="text-black text-4xl font-extrabold uppercase m-0 tracking-tight">
            米莉亞
          </h1>
          <p className="quest-log-count text-sm font-bold text-gray-400 m-0">
            <span className="text-purple-btn text-xl">{activeQuestCount}</span> 個進行中任務
          </p>
        </div>
        <div>
          <TabNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            hasActiveHunt={hasActiveHunt}
          />
        </div>
      </div>

      {activeTab === 'Tasks' && (
        <div className="flex flex-col gap-4">
          <div className="hidden md:block relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-btn pointer-events-none">
              <AddIcon fontSize="small" />
            </span>
            <VocabularyInput
              type="text"
              wrapperClassName="relative"
              className="w-full bg-white text-black border border-gray-200 rounded-xl max-md:rounded-2xl py-4 pl-12 pr-20 text-sm max-md:text-base focus:outline-none focus:border-purple-400 transition-colors placeholder:text-gray-400"
              placeholder="輸入任務?"
              value={inputValue}
              onChange={setInputValue}
              suggestions={taskSuggestions}
              onEnter={(e) => {
                e.preventDefault()
                submitQuestInput()
              }}
              onSelectSuggestion={commitQuestSuggestion}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono pointer-events-none">
              ENTER ↵
            </span>
          </div>
          <div className="hidden md:flex justify-end">
            <Button
              variant="outlined"
              size="small"
              startIcon={<LibraryBooksOutlinedIcon />}
              onClick={() => setQuestTemplateDialogOpen(true)}
              sx={{
                borderColor: '#d8b4fe',
                color: '#a855f7',
                bgcolor: '#faf5ff',
                borderRadius: 99,
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.5,
                '&:hover': { borderColor: '#c084fc', bgcolor: '#f3e8ff' },
              }}
            >
              模板任務
            </Button>
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

          <div className="mobile-task-list-panel flex flex-col gap-3 max-md:bg-transparent max-md:border-0 max-md:rounded-none max-md:p-0 max-md:gap-0 max-md:shadow-none">
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
                        onSaveTemplate={handleSaveQuestTemplate}
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
                        getVocabularySuggestions={getVocabularySuggestions}
                      />
                      {isOver && !questInsertBefore && (
                        <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-purple-400 rounded-full z-10 pointer-events-none" />
                      )}
                    </div>
                  )
                })
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileComposerOpen(true)}
            className="mobile-fab fixed right-6 bottom-28 z-40 md:hidden w-16 h-16 rounded-full bg-purple-btn text-white shadow-[0_18px_35px_rgba(168,85,247,0.28)] flex items-center justify-center"
            aria-label="新增任務"
          >
            <AddIcon sx={{ fontSize: 34 }} />
          </button>

          <div
            className={`mobile-composer-backdrop fixed inset-0 z-[60] md:hidden transition-colors ${
              mobileComposerOpen ? 'bg-black/65 pointer-events-auto' : 'bg-black/0 pointer-events-none'
            }`}
            onClick={() => setMobileComposerOpen(false)}
          >
            <div
              className={`mobile-composer-panel absolute left-0 right-0 bottom-0 rounded-t-[32px] bg-white border-t border-gray-100 px-6 pt-8 pb-8 shadow-[0_-20px_60px_rgba(0,0,0,0.16)] transition-transform duration-300 ${
                mobileComposerOpen ? 'translate-y-0' : 'translate-y-full'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-5">
                <VocabularyInput
                  ref={mobileInputRef}
                  type="text"
                  value={inputValue}
                  onChange={setInputValue}
                  suggestions={taskSuggestions}
                  onEnter={(e) => {
                    if (inputValue.trim()) {
                      e.preventDefault()
                      submitQuestInput()
                    }
                  }}
                  onEscape={() => setMobileComposerOpen(false)}
                  onSelectSuggestion={commitQuestSuggestion}
                  wrapperClassName="relative"
                  dropdownClassName="top-auto bottom-[calc(100%+10px)]"
                  className="mobile-composer-input w-full bg-transparent text-black text-2xl font-semibold outline-none placeholder:text-gray-400 border-l-4 border-purple-btn pl-3"
                  placeholder="輸入任務?"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-400">按 Enter 新增</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileComposerOpen(false)}
                      className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={submitQuestInput}
                      disabled={!inputValue.trim()}
                      className="px-5 py-2 rounded-full bg-purple-btn text-white text-sm font-bold disabled:opacity-40"
                    >
                      新增
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={questTemplateDialogOpen}
        onClose={() => setQuestTemplateDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800, pb: 1 }}>
          選擇模板任務
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <div className="flex flex-col gap-3 pb-2">
            <button
              type="button"
              onClick={() => setQuestTemplateDialogOpen(false)}
              className="w-full rounded-2xl border border-dashed border-purple-300 bg-purple-50 px-4 py-4 text-left transition-colors hover:bg-purple-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-purple-600">
                  <AddIcon sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <p className="m-0 text-sm font-bold text-purple-800">空白任務</p>
                  <p className="m-0 mt-1 text-xs text-purple-600">關閉後直接在上方輸入新任務</p>
                </div>
              </div>
            </button>

            {questTemplates.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-stone-50 px-4 py-6 text-center text-gray-400">
                <LibraryBooksOutlinedIcon sx={{ fontSize: 26, color: '#cbd5e1' }} />
                <p className="m-0 mt-2 text-sm font-semibold">還沒有常用任務</p>
                <p className="m-0 mt-1 text-xs">在已新增任務上按收藏，即可加入常用任務。</p>
              </div>
            ) : (
              questTemplates.map((template) => (
                <div
                  key={template.id}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 transition-colors hover:border-purple-200 hover:bg-purple-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onAddFromTemplate(template.id)
                        setQuestTemplateDialogOpen(false)
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="m-0 text-sm font-bold text-black">{template.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                          {template.priority === 'high' ? '優先' : template.priority === 'low' ? '最後' : '次要'}
                        </span>
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-500">
                          {template.expValue === 10 ? '特級 +10' : template.expValue === 5 ? '上等 +5' : template.expValue === 3 ? '中等 +3' : '一般 +1'}
                        </span>
                        {(template.subTasks?.length ?? 0) > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-500">
                            {template.subTasks.length} 個子任務
                          </span>
                        )}
                      </div>
                      <p className="m-0 mt-2 text-xs text-gray-400 line-clamp-2">{template.text}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700">
                        套用
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveQuestTemplate(template.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100"
                        title="刪除模板"
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div
        className={`pointer-events-none fixed right-6 top-24 z-[120] transition-all duration-300 ${
          questTemplateSavedNotice ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
          已加入常用任務
        </div>
      </div>

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
          onCompleteStageBossHunt={onCompleteStageBossHunt}
          onStageBossNameChange={onStageBossNameChange}
          onStageBossAvatarChange={onStageBossAvatarChange}
          onStageLevelChange={onStageLevel}
          onAddStage={onAddStage}
          onRemoveStage={onRemoveStage}
          onReorderStages={onReorderStages}
        />
      )}

      {activeTab === 'Story' && (
        <StoryTab
          stories={stories}
          onAdd={onStoryAdd}
          onUpdate={onStoryUpdate}
          onRemove={onStoryRemove}
          onCoverChange={onStoryCoverChange}
          onTogglePin={onStoryTogglePin}
          onReorder={onReorderStories}
        />
      )}

      {activeTab === 'RewardShop' && (
        <RewardShopTab
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

      {activeTab === 'Skills' && (
        <SkillTab
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
        <MapTab
          maps={maps}
          onAdd={onMapAdd}
          onUpdate={onMapUpdate}
          onRemove={onMapRemove}
          onCoverChange={onMapCoverChange}
          onReorder={onReorderMaps}
        />
      )}

      {activeTab === 'Npc' && (
        <NpcTab
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
          <div className="relative max-md:bg-white max-md:border max-md:border-gray-100 max-md:rounded-[28px] max-md:p-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <AddIcon fontSize="small" />
            </span>
            <VocabularyInput
              type="text"
              wrapperClassName="relative"
              className="w-full bg-white max-md:bg-transparent text-black border border-gray-200 max-md:border-transparent rounded-xl py-4 pl-12 pr-20 text-sm focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-400"
              placeholder="新增到收集箱..."
              value={inboxInput}
              onChange={setInboxInput}
              suggestions={inboxSuggestions}
              onEnter={(e) => {
                e.preventDefault()
                submitInboxInput()
              }}
              onSelectSuggestion={commitInboxSuggestion}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono pointer-events-none">
              ENTER ↵
            </span>
          </div>

          <div className="flex flex-col gap-3 max-md:bg-white max-md:border max-md:border-gray-100 max-md:rounded-[28px] max-md:p-4 max-md:gap-0 max-md:shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
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
                      getVocabularySuggestions={getVocabularySuggestions}
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
