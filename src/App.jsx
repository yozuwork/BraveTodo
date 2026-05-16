import { useState, useEffect, useRef, useCallback } from 'react'
import PersonIcon from '@mui/icons-material/Person'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import CharacterCard from './components/Sidebar/CharacterCard'
import HuntSideCard from './components/Sidebar/HuntSideCard'
import StatsCard from './components/Sidebar/StatsCard'
import QuestHub from './components/Main/QuestHub'
import LevelUpEffect from './components/LevelUpEffect/LevelUpEffect'
import useQuests from './hooks/useQuests'
import useCharacter from './hooks/useCharacter'
import useStages, { resolveCurrentStage } from './hooks/useStages'
import useInbox from './hooks/useInbox'
import useLevelingRules from './hooks/useLevelingRules'
import useMonsters from './hooks/useMonsters'
import { resolveImg } from './utils/imageSrc'

export default function App() {
  const {
    quests, addQuest, toggleQuest, updateQuest, removeQuest, togglePin, toggleCoreTask, setQuestPriority, updateQuestExp, reorderQuests, clearCompleted,
    addSubTask, toggleSubTask, removeSubTask, updateSubTask,
    lifetimeCompletions, resetLifetimeCompletions, coreTaskCompleted,
    setQuestCompleted, bindQuestToHuntTask, unbindQuestFromHuntTask,
  } = useQuests()
  const { rules: levelingRules, updateExpPerLevel } = useLevelingRules()
  const { imagePosition, updateImagePosition, level, expProgress, coreTaskProgress, stats } =
    useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules)
  const {
    stages, updateStageName, updateStageAvatar, removeStageAvatar, updateStageLevel, addStage, removeStage, reorderStages,
    updateStageBossName, updateStageBossAvatar,
    startStageBossHunt, stopStageBossHunt, completeStageBossHunt,
    addStageBossHuntTask, toggleStageBossHuntTask, removeStageBossHuntTask, updateStageBossHuntTask,
  } = useStages()
  const {
    inboxItems, addInboxItem, removeInboxItem, updateInboxItem, reorderInboxItems,
    addInboxSubTask, toggleInboxSubTask, removeInboxSubTask, updateInboxSubTask,
  } = useInbox()
  const {
    monsters, addMonster, updateMonster, removeMonster, updateMonsterAvatar,
    startHunt, stopHunt, addHuntTask, toggleHuntTask, removeHuntTask, updateHuntTask,
  } = useMonsters()

  const handlePromoteToQuest = useCallback((id, text) => {
    addQuest(text)
    removeInboxItem(id)
  }, [addQuest, removeInboxItem])

  const handleDemoteToInbox = useCallback((id) => {
    const quest = quests.find((q) => q.id === id)
    if (!quest) return
    addInboxItem(quest.text, quest.subTasks ?? [])
    removeQuest(id)
  }, [quests, addInboxItem, removeQuest])

  const [mobileTab, setMobileTab] = useState('character')
  const [activeTab, setActiveTab] = useState('Tasks')

  // Stage progression lock: only advance if previous boss is defeated
  const currentStage = resolveCurrentStage(stages, level)

  // Unified active hunt target
  const activeStageBoss = stages.find((s) => s.bossHuntStatus === 'hunting') ?? null
  const activeMonster   = monsters.find((m) => m.huntStatus === 'hunting') ?? null

  const activeHuntTarget = activeStageBoss
    ? {
        _type: 'stageBoss',
        id:    activeStageBoss.id,
        name:  activeStageBoss.bossName,
        avatar:    activeStageBoss.bossAvatar,
        avatarSrc: resolveImg(activeStageBoss.bossAvatar),
        recommendedLevel: activeStageBoss.maxLevel,
        huntTasks:  activeStageBoss.bossHuntTasks,
        stageRange: { min: activeStageBoss.minLevel, max: activeStageBoss.maxLevel },
        type: 'boss',
      }
    : activeMonster
    ? {
        _type: 'monster',
        id:    activeMonster.id,
        name:  activeMonster.name,
        avatar:    activeMonster.avatar,
        avatarSrc: resolveImg(activeMonster.avatar),
        recommendedLevel: activeMonster.recommendedLevel,
        huntTasks:  activeMonster.huntTasks,
        stageRange: null,
        type: activeMonster.type,
      }
    : null

  const hasActiveHunt  = activeHuntTarget !== null
  const isOnHuntMission = activeTab === 'HuntMission' && hasActiveHunt

  const resolveHuntTaskCompleted = useCallback((binding) => {
    if (!binding) return null
    if (binding.targetType === 'monster') {
      const m = monsters.find((x) => x.id === binding.targetId)
      const t = m?.huntTasks?.find((x) => x.id === binding.taskId) ?? null
      return t?.completed ?? null
    }
    if (binding.targetType === 'stageBoss') {
      const s = stages.find((x) => x.id === binding.targetId)
      const t = s?.bossHuntTasks?.find((x) => x.id === binding.taskId) ?? null
      return t?.completed ?? null
    }
    return null
  }, [monsters, stages])

  const setHuntTaskCompleted = useCallback((binding, completed) => {
    if (!binding) return
    const cur = resolveHuntTaskCompleted(binding)
    if (cur === null || cur === completed) return
    if (binding.targetType === 'monster') toggleHuntTask(binding.targetId, binding.taskId)
    else if (binding.targetType === 'stageBoss') toggleStageBossHuntTask(binding.targetId, binding.taskId)
  }, [resolveHuntTaskCompleted, toggleHuntTask, toggleStageBossHuntTask])

  const syncQuestsForHuntTask = useCallback((bindingLike, completed) => {
    if (!bindingLike) return
    const { targetType, targetId, taskId } = bindingLike
    quests.forEach((q) => {
      const b = q.huntBinding
      if (!b) return
      if (b.targetType === targetType && b.targetId === targetId && b.taskId === taskId) {
        setQuestCompleted(q.id, completed)
      }
    })
  }, [quests, setQuestCompleted])

  const toggleQuestSynced = useCallback((questId) => {
    const q = quests.find((x) => x.id === questId)
    if (!q) return
    const next = !q.completed
    setQuestCompleted(questId, next)
    if (q.huntBinding) setHuntTaskCompleted(q.huntBinding, next)
  }, [quests, setQuestCompleted, setHuntTaskCompleted])

  const handleBindQuestToActiveHuntTask = useCallback((questId, huntTaskId) => {
    if (!activeHuntTarget) return
    const binding = { targetType: activeHuntTarget._type, targetId: activeHuntTarget.id, taskId: huntTaskId }
    bindQuestToHuntTask(questId, binding)
    const cur = resolveHuntTaskCompleted(binding)
    if (cur !== null) setQuestCompleted(questId, cur)
  }, [activeHuntTarget, bindQuestToHuntTask, resolveHuntTaskCompleted, setQuestCompleted])

  const handleUnbindQuest = useCallback((questId) => {
    unbindQuestFromHuntTask(questId)
  }, [unbindQuestFromHuntTask])

  const handleCreateAndBindQuestToActiveHunt = useCallback((questId) => {
    const q = quests.find((x) => x.id === questId)
    if (!q || !activeHuntTarget) return
    const taskId = Date.now()
    if (activeHuntTarget._type === 'stageBoss') addStageBossHuntTask(activeHuntTarget.id, q.text, taskId)
    else addHuntTask(activeHuntTarget.id, q.text, taskId)
    bindQuestToHuntTask(questId, { targetType: activeHuntTarget._type, targetId: activeHuntTarget.id, taskId })
    setQuestCompleted(questId, false)
  }, [quests, activeHuntTarget, addStageBossHuntTask, addHuntTask, bindQuestToHuntTask, setQuestCompleted])

  // Hunt task handlers — routed to the right hook
  const huntTaskHandlers = activeHuntTarget?._type === 'stageBoss'
    ? {
        onAddHuntTask:    (_, text)         => addStageBossHuntTask(activeHuntTarget.id, text),
        onToggleHuntTask: (_, taskId)       => {
          const cur = activeHuntTarget.huntTasks.find((t) => t.id === taskId)?.completed ?? null
          toggleStageBossHuntTask(activeHuntTarget.id, taskId)
          if (cur !== null) syncQuestsForHuntTask({ targetType: 'stageBoss', targetId: activeHuntTarget.id, taskId }, !cur)
        },
        onRemoveHuntTask: (_, taskId)       => {
          removeStageBossHuntTask(activeHuntTarget.id, taskId)
          quests.forEach((q) => {
            const b = q.huntBinding
            if (b?.targetType === 'stageBoss' && b.targetId === activeHuntTarget.id && b.taskId === taskId) unbindQuestFromHuntTask(q.id)
          })
        },
        onUpdateHuntTask: (_, taskId, text) => updateStageBossHuntTask(activeHuntTarget.id, taskId, text),
        onStopHunt:       ()                => stopStageBossHunt(activeHuntTarget.id),
        onCompleteHunt:   ()                => completeStageBossHunt(activeHuntTarget.id),
      }
    : {
        onAddHuntTask:    addHuntTask,
        onToggleHuntTask: (monsterId, taskId) => {
          const m = monsters.find((x) => x.id === monsterId)
          const cur = m?.huntTasks?.find((t) => t.id === taskId)?.completed ?? null
          toggleHuntTask(monsterId, taskId)
          if (cur !== null) syncQuestsForHuntTask({ targetType: 'monster', targetId: monsterId, taskId }, !cur)
        },
        onRemoveHuntTask: (monsterId, taskId) => {
          removeHuntTask(monsterId, taskId)
          quests.forEach((q) => {
            const b = q.huntBinding
            if (b?.targetType === 'monster' && b.targetId === monsterId && b.taskId === taskId) unbindQuestFromHuntTask(q.id)
          })
        },
        onUpdateHuntTask: updateHuntTask,
        onStopHunt:       (id) => stopHunt(id),
        onCompleteHunt:   null,
      }

  // Level-up effect
  const [showLevelUp, setShowLevelUp] = useState(false)
  const prevLevelRef = useRef(null)

  useEffect(() => {
    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      setShowLevelUp(true)
    }
    prevLevelRef.current = level
  }, [level])

  const handleLevelUpComplete = useCallback(() => setShowLevelUp(false), [])

  return (
    <div className="min-h-screen bg-stone-50 relative overflow-x-hidden">
      <div className="flex justify-center items-start p-4 md:p-10 pb-20 md:pb-10">
        <div className="w-full max-w-[1200px] flex flex-col md:flex-row gap-6 md:gap-10">

          {/* Sidebar */}
          <aside className={`w-full md:w-[380px] md:shrink-0 flex flex-col gap-6 md:gap-8 ${mobileTab === 'quests' ? 'hidden md:flex' : 'flex'}`}>
            {isOnHuntMission ? (
              <HuntSideCard target={activeHuntTarget} />
            ) : (
              <CharacterCard
                level={level}
                avatar={currentStage.avatarSrc}
                avatars={currentStage.avatarSrcs}
                onAvatarChange={(file) => updateStageAvatar(currentStage.id, file)}
                imagePosition={imagePosition}
                onImagePositionChange={updateImagePosition}
              />
            )}
            <StatsCard expProgress={expProgress} coreTaskProgress={coreTaskProgress} stats={stats} level={level} currentStage={currentStage} />
          </aside>

          {/* Quest Hub */}
          <div className={`w-full flex-1 ${mobileTab === 'character' ? 'hidden md:block' : 'block'}`}>
            <QuestHub
              quests={quests}
              onAdd={addQuest}
              onToggle={toggleQuestSynced}
              onUpdate={updateQuest}
              onRemove={removeQuest}
              onTogglePin={togglePin}
              onToggleCore={toggleCoreTask}
              onSetPriority={setQuestPriority}
              onSetExp={updateQuestExp}
              onReorderQuests={reorderQuests}
              onClearCompleted={clearCompleted}
              onDemoteToInbox={handleDemoteToInbox}
              stages={stages}
              onStageName={updateStageName}
              onStageAvatar={updateStageAvatar}
              onStageAvatarRemove={removeStageAvatar}
              onStageLevel={updateStageLevel}
              onAddStage={addStage}
              onRemoveStage={removeStage}
              onReorderStages={reorderStages}
              inboxItems={inboxItems}
              levelingRules={levelingRules}
              onUpdateExpPerLevel={updateExpPerLevel}
              atk={stats.atk.value}
              onAddSubTask={addSubTask}
              onToggleSubTask={toggleSubTask}
              onRemoveSubTask={removeSubTask}
              onUpdateSubTask={updateSubTask}
              currentLevel={level}
              onResetLevel={resetLifetimeCompletions}
              monsters={monsters}
              onAddMonster={addMonster}
              onUpdateMonster={updateMonster}
              onRemoveMonster={removeMonster}
              onMonsterAvatarChange={updateMonsterAvatar}
              onStartHunt={startHunt}
              onStopHunt={stopHunt}
              onStartStageBossHunt={startStageBossHunt}
              onStopStageBossHunt={stopStageBossHunt}
              onStageBossNameChange={updateStageBossName}
              onStageBossAvatarChange={updateStageBossAvatar}
              activeHuntTarget={activeHuntTarget}
              huntTaskHandlers={huntTaskHandlers}
              onBindQuestToActiveHuntTask={handleBindQuestToActiveHuntTask}
              onUnbindQuestFromHuntTask={handleUnbindQuest}
              onCreateAndBindQuestToActiveHunt={handleCreateAndBindQuestToActiveHunt}
              onInboxAdd={addInboxItem}
              onInboxRemove={removeInboxItem}
              onInboxUpdate={updateInboxItem}
              onReorderInbox={reorderInboxItems}
              onInboxAddSubTask={addInboxSubTask}
              onInboxToggleSubTask={toggleInboxSubTask}
              onInboxRemoveSubTask={removeInboxSubTask}
              onInboxUpdateSubTask={updateInboxSubTask}
              onPromoteToQuest={handlePromoteToQuest}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 flex z-40">
        <button
          onClick={() => setMobileTab('character')}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors cursor-pointer border-none bg-transparent ${
            mobileTab === 'character' ? 'text-purple-500' : 'text-gray-400'
          }`}
        >
          <PersonIcon fontSize="small" />
          <span className="text-[0.65rem] font-semibold">角色</span>
        </button>
        <button
          onClick={() => setMobileTab('quests')}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors cursor-pointer border-none bg-transparent ${
            mobileTab === 'quests' ? 'text-purple-500' : 'text-gray-400'
          }`}
        >
          <FormatListBulletedIcon fontSize="small" />
          <span className="text-[0.65rem] font-semibold">任務</span>
        </button>
        <button
          onClick={() => setMobileTab('quests')}
          className="hidden"
        >
          <FormatListBulletedIcon fontSize="small" />
          <span className="text-[0.65rem] font-semibold">編輯</span>
        </button>
      </nav>

      <LevelUpEffect visible={showLevelUp} onComplete={handleLevelUpComplete} />
    </div>
  )
}
