import { useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import TuneIcon from '@mui/icons-material/Tune'
import useHeroQuests from '../hooks/useHeroQuests'
import useHeroCharacter from '../hooks/useHeroCharacter'
import useHeroLevelingRules from '../hooks/useHeroLevelingRules'
import useHeroStages from '../hooks/useHeroStages'
import useHeroMonsters from '../hooks/useHeroMonsters'
import useHeroInbox from '../hooks/useHeroInbox'
import useHeroStories from '../hooks/useHeroStories'
import useHeroNpcs from '../hooks/useHeroNpcs'
import useHeroMaps from '../hooks/useHeroMaps'
import useHeroSkills from '../hooks/useHeroSkills'
import useHeroRewardShop from '../hooks/useHeroRewardShop'
import useHeroRewardSettings from '../hooks/useHeroRewardSettings'
import HeroCharacterCard from '../components/Hero/HeroCharacterCard'
import HeroStatsCard from '../components/Hero/HeroStatsCard'
import HeroQuestHub from '../components/Hero/HeroQuestHub'

function normalizeHeroQuestRewardTier(expValue) {
  if (expValue === 2) return 3
  if (expValue === 1 || expValue === 3 || expValue === 5 || expValue === 10 || expValue === 20) return expValue
  return 1
}

export default function HeroQuestPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    items: quests,
    addQuest,
    toggleQuest,
    updateQuest,
    removeQuest,
    setQuestPriority,
    togglePin,
    updateQuestExp,
    clearCompleted,
    lifetimeCompletions,
    resetLifetimeCompletions,
    setQuestCompleted,
    bindQuestToHuntTask,
    unbindQuestFromHuntTask,
    addSubTask,
    toggleSubTask,
    removeSubTask,
    updateSubTask,
    reorderQuests,
  } = useHeroQuests()

  const { rules: levelingRules } = useHeroLevelingRules()

  const {
    avatar,
    updateAvatar,
    imagePosition,
    gold,
    adjustGold,
    resetGold,
    level,
    expProgress,
  } = useHeroCharacter(lifetimeCompletions, levelingRules)

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
    startStageBossHunt,
    stopStageBossHunt,
    resetStageBossHunts,
    completeStageBossHunt,
    updateStageBossName,
    updateStageBossAvatar,
    addStageBossHuntTask,
    toggleStageBossHuntTask,
    removeStageBossHuntTask,
    updateStageBossHuntTask,
  } = useHeroStages()

  const {
    monsters,
    addMonster,
    updateMonster,
    removeMonster,
    updateMonsterAvatar,
    startHunt,
    stopHunt,
    resetMonsterHunts,
    addHuntTask,
    toggleHuntTask,
    removeHuntTask,
    updateHuntTask,
  } = useHeroMonsters()

  const {
    inboxItems,
    addInboxItem,
    removeInboxItem,
    updateInboxItem,
    reorderInboxItems,
    addInboxSubTask,
    toggleInboxSubTask,
    removeInboxSubTask,
    updateInboxSubTask,
  } = useHeroInbox()

  const {
    stories,
    addStory,
    updateStory,
    removeStory,
    updateStoryCover,
    toggleStoryPin,
    reorderStories,
  } = useHeroStories()

  const {
    npcs,
    addNpc,
    updateNpc,
    removeNpc,
    updateNpcCover,
    reorderNpcs,
  } = useHeroNpcs()

  const {
    maps,
    addMap,
    updateMap,
    removeMap,
    updateMapCover,
    reorderMaps,
  } = useHeroMaps()

  const {
    skills,
    addSkill,
    updateSkill,
    removeSkill,
    updateSkillCover,
    toggleSkillPin,
    reorderSkills,
  } = useHeroSkills()

  const {
    rewards,
    rewardTemplates,
    addReward,
    addRewardFromTemplate,
    updateReward,
    removeReward,
    updateRewardCover,
    toggleRewardPin,
    reorderRewards,
    saveRewardTemplate,
    updateRewardTemplate,
    removeRewardTemplate,
  } = useHeroRewardShop()

  const { rewardSettings } = useHeroRewardSettings()

  const rewardGoldMap = useMemo(
    () => new Map(rewardSettings.map((item) => [normalizeHeroQuestRewardTier(item.expValue), Math.max(0, Number(item.gold) || 0)])),
    [rewardSettings],
  )

  const getQuestRewardGold = useCallback(
    (quest) => rewardGoldMap.get(normalizeHeroQuestRewardTier(quest?.expValue)) ?? 0,
    [rewardGoldMap],
  )

  const setQuestCompletedWithReward = useCallback(
    (questId, completed) => {
      const target = quests.find((quest) => quest.id === questId)
      if (!target || target.completed === completed) return
      setQuestCompleted(questId, completed)
      const rewardGold = getQuestRewardGold(target)
      if (rewardGold > 0) adjustGold(completed ? rewardGold : -rewardGold)
    },
    [adjustGold, getQuestRewardGold, quests, setQuestCompleted],
  )

  const handleQuestExpChange = useCallback(
    (questId, expValue) => {
      const target = quests.find((quest) => quest.id === questId)
      if (!target) return
      const previousGold = target.completed ? getQuestRewardGold(target) : 0
      const nextGold = target.completed ? getQuestRewardGold({ ...target, expValue }) : 0
      updateQuestExp(questId, expValue)
      const goldDelta = nextGold - previousGold
      if (goldDelta !== 0) adjustGold(goldDelta)
    },
    [adjustGold, getQuestRewardGold, quests, updateQuestExp],
  )

  const handleRewardPurchase = useCallback(
    (rewardId) => {
      const reward = rewards.find((item) => item.id === rewardId)
      if (!reward || reward.status === 'archived') return
      const matched = String(reward.cost ?? '').match(/\d+/)
      const cost = matched ? Math.max(0, parseInt(matched[0], 10) || 0) : 0
      if (gold < cost) return
      adjustGold(-cost)
      updateReward(rewardId, { ownedCount: (reward.ownedCount ?? 0) + 1, status: 'redeemed', redeemedAt: Date.now() })
    },
    [adjustGold, gold, rewards, updateReward],
  )

  const handleRewardArchive = useCallback(
    (rewardId, isArchived) => updateReward(rewardId, { status: isArchived ? 'available' : 'archived' }),
    [updateReward],
  )

  const handleRewardUse = useCallback(
    (rewardId) => {
      const reward = rewards.find((item) => item.id === rewardId)
      if (!reward) return
      const ownedCount = Math.max(0, reward.ownedCount ?? 0)
      if (ownedCount <= 0) return
      updateReward(rewardId, { ownedCount: ownedCount - 1, status: ownedCount - 1 > 0 ? 'redeemed' : 'available', usedAt: Date.now() })
    },
    [rewards, updateReward],
  )

  const handlePromoteToQuest = useCallback(
    (id, text) => {
      addQuest(text)
      removeInboxItem(id)
    },
    [addQuest, removeInboxItem],
  )

  const activeTab = searchParams.get('tab') || 'Tasks'
  const handleTabChange = useCallback(
    (tab) => setSearchParams(tab === 'Tasks' ? {} : { tab }),
    [setSearchParams],
  )

  const activeStageBoss = stages.find((s) => s.bossHuntStatus === 'hunting') ?? null
  const activeMonster = monsters.find((m) => m.huntStatus === 'hunting') ?? null

  const activeHuntTarget = activeStageBoss
    ? {
        _type: 'stageBoss',
        id: activeStageBoss.id,
        name: activeStageBoss.bossName,
        avatarSrc: activeStageBoss.bossAvatar,
        recommendedLevel: activeStageBoss.maxLevel,
        huntTasks: activeStageBoss.bossHuntTasks,
        stageRange: { min: activeStageBoss.minLevel, max: activeStageBoss.maxLevel },
        type: 'boss',
      }
    : activeMonster
      ? {
          _type: 'monster',
          id: activeMonster.id,
          name: activeMonster.name,
          avatarSrc: activeMonster.avatar,
          recommendedLevel: activeMonster.recommendedLevel,
          huntTasks: activeMonster.huntTasks,
          stageRange: null,
          type: activeMonster.type,
        }
      : null

  const resolveHuntTaskCompleted = useCallback(
    (binding) => {
      if (!binding) return null
      if (binding.targetType === 'monster') {
        const m = monsters.find((x) => x.id === binding.targetId)
        return m?.huntTasks?.find((x) => x.id === binding.taskId)?.completed ?? null
      }
      if (binding.targetType === 'stageBoss') {
        const s = stages.find((x) => x.id === binding.targetId)
        return s?.bossHuntTasks?.find((x) => x.id === binding.taskId)?.completed ?? null
      }
      return null
    },
    [monsters, stages],
  )

  const syncQuestsForHuntTask = useCallback(
    (bindingLike, completed) => {
      if (!bindingLike) return
      const { targetType, targetId, taskId } = bindingLike
      quests.forEach((q) => {
        const b = q.huntBinding
        if (b && b.targetType === targetType && b.targetId === targetId && b.taskId === taskId) {
          setQuestCompletedWithReward(q.id, completed)
        }
      })
    },
    [quests, setQuestCompletedWithReward],
  )

  const toggleQuestSynced = useCallback(
    (questId) => {
      const q = quests.find((x) => x.id === questId)
      if (!q) return
      const next = !q.completed
      setQuestCompletedWithReward(questId, next)
    },
    [quests, setQuestCompletedWithReward],
  )

  const handleBindQuestToActiveHuntTask = useCallback(
    (questId, huntTaskId) => {
      if (!activeHuntTarget) return
      const binding = { targetType: activeHuntTarget._type, targetId: activeHuntTarget.id, taskId: huntTaskId }
      bindQuestToHuntTask(questId, binding)
      const cur = resolveHuntTaskCompleted(binding)
      if (cur !== null) setQuestCompletedWithReward(questId, cur)
    },
    [activeHuntTarget, bindQuestToHuntTask, resolveHuntTaskCompleted, setQuestCompletedWithReward],
  )

  const handleCreateAndBindQuestToActiveHunt = useCallback(
    (questId) => {
      const q = quests.find((x) => x.id === questId)
      if (!q || !activeHuntTarget) return
      const taskId = Date.now()
      if (activeHuntTarget._type === 'stageBoss') addStageBossHuntTask(activeHuntTarget.id, q.text, taskId)
      else addHuntTask(activeHuntTarget.id, q.text, taskId)
      bindQuestToHuntTask(questId, { targetType: activeHuntTarget._type, targetId: activeHuntTarget.id, taskId })
      setQuestCompletedWithReward(questId, false)
    },
    [quests, activeHuntTarget, addStageBossHuntTask, addHuntTask, bindQuestToHuntTask, setQuestCompletedWithReward],
  )

  const huntTaskHandlers = activeHuntTarget?._type === 'stageBoss'
    ? {
        onAddHuntTask: (_, text) => addStageBossHuntTask(activeHuntTarget.id, text),
        onToggleHuntTask: (_, taskId) => {
          const cur = activeHuntTarget.huntTasks.find((t) => t.id === taskId)?.completed ?? null
          toggleStageBossHuntTask(activeHuntTarget.id, taskId)
          if (cur !== null) syncQuestsForHuntTask({ targetType: 'stageBoss', targetId: activeHuntTarget.id, taskId }, !cur)
        },
        onRemoveHuntTask: (_, taskId) => {
          removeStageBossHuntTask(activeHuntTarget.id, taskId)
          quests.forEach((q) => {
            const b = q.huntBinding
            if (b?.targetType === 'stageBoss' && b.targetId === activeHuntTarget.id && b.taskId === taskId) unbindQuestFromHuntTask(q.id)
          })
        },
        onUpdateHuntTask: (_, taskId, text) => updateStageBossHuntTask(activeHuntTarget.id, taskId, text),
        onStopHunt: () => stopStageBossHunt(activeHuntTarget.id),
        onCompleteHunt: () => completeStageBossHunt(activeHuntTarget.id),
      }
    : {
        onAddHuntTask: addHuntTask,
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
        onStopHunt: (id) => stopHunt(id),
        onCompleteHunt: null,
      }

  return (
    <main className="max-w-[1200px] mx-auto px-4 md:px-10 py-6 md:py-10">
      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        <aside className="w-full md:w-[320px] shrink-0 flex flex-col gap-5">
          <HeroCharacterCard
            level={level}
            avatar={avatar}
            onAvatarChange={updateAvatar}
            imagePosition={imagePosition}
          />
          <HeroStatsCard level={level} expProgress={expProgress} />
          <Link
            to="/hero-character-settings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-600 transition-colors hover:bg-purple-100"
          >
            <TuneIcon sx={{ fontSize: 18 }} />
            英雄角色設定
          </Link>
        </aside>
        <HeroQuestHub
          quests={quests}
          onAdd={addQuest}
          onToggle={toggleQuestSynced}
          onUpdate={updateQuest}
          onRemove={removeQuest}
          onTogglePin={togglePin}
          onSetPriority={setQuestPriority}
          onSetExp={handleQuestExpChange}
          onClearCompleted={clearCompleted}
          onAddSubTask={addSubTask}
          onToggleSubTask={toggleSubTask}
          onRemoveSubTask={removeSubTask}
          onUpdateSubTask={updateSubTask}
          onReorderQuests={reorderQuests}
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
          monsters={monsters}
          onAddMonster={addMonster}
          onUpdateMonster={updateMonster}
          onRemoveMonster={removeMonster}
          onMonsterAvatarChange={updateMonsterAvatar}
          onStartHunt={startHunt}
          onStopHunt={stopHunt}
          onStartStageBossHunt={startStageBossHunt}
          onStopStageBossHunt={stopStageBossHunt}
          onCompleteStageBossHunt={completeStageBossHunt}
          onStageBossNameChange={updateStageBossName}
          onStageBossAvatarChange={updateStageBossAvatar}
          activeHuntTarget={activeHuntTarget}
          huntTaskHandlers={huntTaskHandlers}
          onBindQuestToActiveHuntTask={handleBindQuestToActiveHuntTask}
          onUnbindQuestFromHuntTask={unbindQuestFromHuntTask}
          onCreateAndBindQuestToActiveHunt={handleCreateAndBindQuestToActiveHunt}
          currentLevel={level}
          inboxItems={inboxItems}
          onInboxAdd={addInboxItem}
          onInboxRemove={removeInboxItem}
          onInboxUpdate={updateInboxItem}
          onReorderInbox={reorderInboxItems}
          onPromoteToQuest={handlePromoteToQuest}
          onInboxAddSubTask={addInboxSubTask}
          onInboxToggleSubTask={toggleInboxSubTask}
          onInboxRemoveSubTask={removeInboxSubTask}
          onInboxUpdateSubTask={updateInboxSubTask}
          stories={stories}
          onStoryAdd={addStory}
          onStoryUpdate={updateStory}
          onStoryRemove={removeStory}
          onStoryCoverChange={updateStoryCover}
          onStoryTogglePin={toggleStoryPin}
          onReorderStories={reorderStories}
          rewards={rewards}
          rewardTemplates={rewardTemplates}
          gold={gold}
          onRewardAdd={addReward}
          onRewardAddFromTemplate={addRewardFromTemplate}
          onRewardUpdate={updateReward}
          onRewardRemove={removeReward}
          onRewardCoverChange={updateRewardCover}
          onRewardTogglePin={toggleRewardPin}
          onRewardPurchase={handleRewardPurchase}
          onRewardArchive={handleRewardArchive}
          onRewardUse={handleRewardUse}
          onReorderRewards={reorderRewards}
          onSaveRewardTemplate={saveRewardTemplate}
          onUpdateRewardTemplate={updateRewardTemplate}
          onRemoveRewardTemplate={removeRewardTemplate}
          skills={skills}
          onSkillAdd={addSkill}
          onSkillUpdate={updateSkill}
          onSkillRemove={removeSkill}
          onSkillCoverChange={updateSkillCover}
          onSkillTogglePin={toggleSkillPin}
          onReorderSkills={reorderSkills}
          maps={maps}
          onMapAdd={addMap}
          onMapUpdate={updateMap}
          onMapRemove={removeMap}
          onMapCoverChange={updateMapCover}
          onReorderMaps={reorderMaps}
          npcs={npcs}
          onNpcAdd={addNpc}
          onNpcUpdate={updateNpc}
          onNpcRemove={removeNpc}
          onNpcCoverChange={updateNpcCover}
          onReorderNpcs={reorderNpcs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </main>
  )
}
