import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Routes, Route, Navigate, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import SportsMartialArtsIcon from "@mui/icons-material/SportsMartialArts";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import RedeemOutlinedIcon from "@mui/icons-material/RedeemOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CharacterCard from "./components/Sidebar/CharacterCard";
import HuntSideCard from "./components/Sidebar/HuntSideCard";
import StatsCard from "./components/Sidebar/StatsCard";
import QuestHub from "./components/Main/QuestHub";
import LevelUpEffect from "./components/LevelUpEffect/LevelUpEffect";
import ImageUploadFeedback from "./components/common/ImageUploadFeedback";
import useQuests from "./hooks/useQuests";
import useCharacter from "./hooks/useCharacter";
import useStages, { resolveCurrentStage } from "./hooks/useStages";
import useInbox from "./hooks/useInbox";
import useLevelingRules from "./hooks/useLevelingRules";
import useMonsters from "./hooks/useMonsters";
import useStories from "./hooks/useStories";
import useMaps from "./hooks/useMaps";
import useNpcs from "./hooks/useNpcs";
import useSkills from "./hooks/useSkills";
import useRewardShop from "./hooks/useRewardShop";
import useRewardSettings from "./hooks/useRewardSettings";
import useAuth from "./hooks/useAuth";
import useVocabulary from "./hooks/useVocabulary";
import { resolveImg } from "./utils/imageSrc";
import WorldGallery from "./pages/WorldGallery";
import CharacterSettingsPage from "./pages/CharacterSettingsPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import { getAppTheme, THEME_EVENT } from "./utils/themeSettings";
import { applyFaviconUrl, getCachedFaviconUrl, loadFaviconUrl } from "./utils/faviconSettings";

function GoldDisplay({ gold, className = "" }) {
  return (
    <div className={`rounded-2xl border border-amber-200/70 bg-[linear-gradient(135deg,rgba(120,53,15,0.88),rgba(24,24,27,0.96))] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.24)] ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/14 ring-1 ring-amber-200/20">
            <svg
              width="128"
              height="128"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="coin"
              className="h-7 w-7 object-contain"
            >
              <circle cx="64" cy="64" r="52" fill="#F4BF1A" />
              <circle cx="64" cy="64" r="43" fill="#F8D94A" />
              <circle
                cx="64"
                cy="64"
                r="38"
                stroke="#F6E27A"
                strokeWidth="3"
                opacity="0.9"
              />
              <path
                d="M64 41V49"
                stroke="#ED9B1C"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M64 79V87"
                stroke="#ED9B1C"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M74 49.5C71.4 46.8 67.9 45.3 63.8 45.3C57.7 45.3 53.3 48.7 53.3 53.4C53.3 58 57 60.3 63.8 61.9C70.6 63.5 74.7 66 74.7 71.1C74.7 76.5 69.8 80.4 63.2 80.4C58.3 80.4 54.3 78.4 51.4 75"
                stroke="#ED9B1C"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="m-0 text-[0.65rem] font-black uppercase tracking-[0.24em] text-amber-200/70">
              Gold
            </p>
            <p className="m-0 text-2xl font-extrabold leading-none text-amber-50">
              {gold.toLocaleString()}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-200/15 bg-black/20 px-2.5 py-1 text-[0.65rem] font-bold text-amber-100/80">
          持有金幣
        </span>
      </div>
    </div>
  );
}

function normalizeQuestRewardTier(expValue) {
  if (expValue === 2) return 3;
  if (expValue === 1 || expValue === 3 || expValue === 5 || expValue === 10)
    return expValue;
  return 1;
}

function parseRewardCost(cost) {
  const matched = String(cost ?? "").match(/\d+/);
  return matched ? Math.max(0, parseInt(matched[0], 10) || 0) : 0;
}

function MainApp() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    quests,
    addQuest,
    toggleQuest,
    updateQuest,
    removeQuest,
    togglePin,
    toggleCoreTask,
    setQuestPriority,
    updateQuestExp,
    reorderQuests,
    clearCompleted,
    addSubTask,
    toggleSubTask,
    removeSubTask,
    updateSubTask,
    lifetimeCompletions,
    resetLifetimeCompletions,
    coreTaskCompleted,
    setQuestCompleted,
    bindQuestToHuntTask,
    unbindQuestFromHuntTask,
    loaded: questsLoaded,
  } = useQuests();
  const { rules: levelingRules, updateExpPerLevel } = useLevelingRules();
  const {
    imagePosition,
    updateImagePosition,
    gold,
    adjustGold,
    resetGold,
    level,
    expProgress,
    coreTaskProgress,
    stats,
  } = useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules);
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
    updateStageBossName,
    updateStageBossAvatar,
    startStageBossHunt,
    stopStageBossHunt,
    resetStageBossHunts,
    completeStageBossHunt,
    addStageBossHuntTask,
    toggleStageBossHuntTask,
    removeStageBossHuntTask,
    updateStageBossHuntTask,
    updateStageAvatarPosition,
  } = useStages();
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
    loaded: inboxLoaded,
  } = useInbox();
  const {
    items: vocabularyItems,
    loaded: vocabularyLoaded,
    rememberPhrase,
    rememberPhrases,
  } = useVocabulary();
  const {
    monsters,
    addMonster,
    updateMonster,
    removeMonster,
    updateMonsterAvatar,
    startHunt,
    stopHunt,
    addHuntTask,
    toggleHuntTask,
    removeHuntTask,
    updateHuntTask,
    resetMonsterHunts,
  } = useMonsters();
  const {
    stories,
    addStory,
    updateStory,
    removeStory,
    updateStoryCover,
    toggleStoryPin,
    reorderStories,
  } = useStories();
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
  } = useRewardShop();
  const { rewardSettings } = useRewardSettings();
  const {
    skills,
    addSkill,
    updateSkill,
    removeSkill,
    updateSkillCover,
    toggleSkillPin,
    reorderSkills,
  } = useSkills();
  const {
    maps,
    addMap,
    updateMap,
    removeMap,
    updateMapCover,
    reorderMaps,
  } = useMaps();
  const {
    npcs,
    addNpc,
    updateNpc,
    removeNpc,
    updateNpcCover,
    reorderNpcs,
  } = useNpcs();

  const vocabularySeededRef = useRef(false);

  useEffect(() => {
    if (!vocabularyLoaded || !questsLoaded || !inboxLoaded || vocabularySeededRef.current) return;

    const taskTexts = [
      ...quests.map((quest) => quest.text),
      ...inboxItems.map((item) => item.text),
    ];
    const subTaskTexts = [
      ...quests.flatMap((quest) => quest.subTasks ?? []).map((sub) => sub.text),
      ...inboxItems.flatMap((item) => item.subTasks ?? []).map((sub) => sub.text),
    ];

    rememberPhrases(taskTexts, "task");
    rememberPhrases(subTaskTexts, "subtask");
    vocabularySeededRef.current = true;
  }, [inboxItems, inboxLoaded, quests, questsLoaded, rememberPhrases, vocabularyLoaded]);

  const getVocabularySuggestions = useCallback(
    (query, preferredKinds = []) => {
      const trimmed = String(query ?? "").trim();
      const normalized = trimmed.toLocaleLowerCase();
      if (!normalized) return [];

      const preference = new Map(preferredKinds.map((kind, index) => [kind, index]));

      return vocabularyItems
        .filter((item) => {
          const text = item.text ?? "";
          return text.toLocaleLowerCase().includes(normalized) && text !== trimmed;
        })
        .sort((a, b) => {
          const aText = a.text.toLocaleLowerCase();
          const bText = b.text.toLocaleLowerCase();
          const aPreferred = preference.has(a.kind) ? preference.get(a.kind) : 99;
          const bPreferred = preference.has(b.kind) ? preference.get(b.kind) : 99;
          const aStarts = aText.startsWith(normalized) ? 0 : 1;
          const bStarts = bText.startsWith(normalized) ? 0 : 1;

          return (
            aPreferred - bPreferred ||
            aStarts - bStarts ||
            (b.count ?? 0) - (a.count ?? 0) ||
            (b.lastUsed ?? 0) - (a.lastUsed ?? 0)
          );
        })
        .map((item) => item.text)
        .slice(0, 8);
    },
    [vocabularyItems],
  );

  const rewardGoldMap = useMemo(
    () =>
      new Map(
        rewardSettings.map((item) => [
          normalizeQuestRewardTier(item.expValue),
          Math.max(0, Number(item.gold) || 0),
        ]),
      ),
    [rewardSettings],
  );

  const setQuestCompletedWithReward = useCallback(
    (questId, completed) => {
      const target = quests.find((quest) => quest.id === questId);
      if (!target || target.completed === completed) return;

      setQuestCompleted(questId, completed);

      const rewardGold =
        rewardGoldMap.get(normalizeQuestRewardTier(target.expValue)) ?? 0;
      if (rewardGold > 0) {
        adjustGold(completed ? rewardGold : -rewardGold);
      }
    },
    [adjustGold, quests, rewardGoldMap, setQuestCompleted],
  );

  const handleRewardPurchase = useCallback(
    (rewardId) => {
      const reward = rewards.find((item) => item.id === rewardId);
      if (!reward) return;
      if (reward.status === "redeemed" || reward.status === "archived") return;

      const cost = parseRewardCost(reward.cost);
      if (gold < cost) return;

      adjustGold(-cost);
      updateReward(rewardId, {
        status: "redeemed",
        redeemedAt: Date.now(),
      });
    },
    [adjustGold, gold, rewards, updateReward],
  );

  const handleRewardArchive = useCallback(
    (rewardId, isArchived) => {
      updateReward(rewardId, {
        status: isArchived ? "available" : "archived",
      });
    },
    [updateReward],
  );

  const handleRewardUse = useCallback(
    (rewardId) => {
      const reward = rewards.find((item) => item.id === rewardId);
      if (!reward) return;
      if (reward.status !== "redeemed") return;

      updateReward(rewardId, {
        status: "used",
        usedAt: Date.now(),
      });
    },
    [rewards, updateReward],
  );

  const handleAddQuest = useCallback(
    (text) => {
      rememberPhrase(text, "task");
      addQuest(text);
    },
    [addQuest, rememberPhrase],
  );

  const handleUpdateQuest = useCallback(
    (id, text) => {
      rememberPhrase(text, "task");
      updateQuest(id, text);
    },
    [rememberPhrase, updateQuest],
  );

  const handleAddSubTask = useCallback(
    (questId, text) => {
      rememberPhrase(text, "subtask");
      addSubTask(questId, text);
    },
    [addSubTask, rememberPhrase],
  );

  const handleUpdateSubTask = useCallback(
    (questId, subTaskId, text) => {
      rememberPhrase(text, "subtask");
      updateSubTask(questId, subTaskId, text);
    },
    [rememberPhrase, updateSubTask],
  );

  const handleAddInboxItem = useCallback(
    (text, subTasks = []) => {
      rememberPhrase(text, "inbox");
      addInboxItem(text, subTasks);
    },
    [addInboxItem, rememberPhrase],
  );

  const handleUpdateInboxItem = useCallback(
    (id, text) => {
      rememberPhrase(text, "inbox");
      updateInboxItem(id, text);
    },
    [rememberPhrase, updateInboxItem],
  );

  const handleAddInboxSubTask = useCallback(
    (itemId, text) => {
      rememberPhrase(text, "subtask");
      addInboxSubTask(itemId, text);
    },
    [addInboxSubTask, rememberPhrase],
  );

  const handleUpdateInboxSubTask = useCallback(
    (itemId, subId, text) => {
      rememberPhrase(text, "subtask");
      updateInboxSubTask(itemId, subId, text);
    },
    [rememberPhrase, updateInboxSubTask],
  );

  const handlePromoteToQuest = useCallback(
    (id, text) => {
      rememberPhrase(text, "task");
      addQuest(text);
      removeInboxItem(id);
    },
    [addQuest, rememberPhrase, removeInboxItem],
  );

  const handleDemoteToInbox = useCallback(
    (id) => {
      const quest = quests.find((q) => q.id === id);
      if (!quest) return;
      rememberPhrase(quest.text, "inbox");
      addInboxItem(quest.text, quest.subTasks ?? []);
      removeQuest(id);
    },
    [quests, addInboxItem, rememberPhrase, removeQuest],
  );

  const activeTab = searchParams.get("tab") || "Tasks";

  const handleTabChange = useCallback(
    (tab) => {
      if (tab === activeTab) return;
      setSearchParams(tab === "Tasks" ? {} : { tab });
    },
    [activeTab, setSearchParams],
  );

  const handleResetLevel = useCallback(
    (completions) => {
      resetLifetimeCompletions(completions);
      resetStageBossHunts();
      resetMonsterHunts();
      resetGold();
    },
    [resetLifetimeCompletions, resetStageBossHunts, resetMonsterHunts, resetGold],
  );

  // Stage progression lock: only advance if previous boss is defeated
  const currentStage = resolveCurrentStage(stages, level);

  const activeStageBoss =
    stages.find((s) => s.bossHuntStatus === "hunting") ?? null;
  const activeMonster =
    monsters.find((m) => m.huntStatus === "hunting") ?? null;

  const activeHuntTarget = activeStageBoss
    ? {
        _type: "stageBoss",
        id: activeStageBoss.id,
        name: activeStageBoss.bossName,
        avatar: activeStageBoss.bossAvatar,
        avatarSrc: resolveImg(activeStageBoss.bossAvatar),
        recommendedLevel: activeStageBoss.maxLevel,
        huntTasks: activeStageBoss.bossHuntTasks,
        stageRange: {
          min: activeStageBoss.minLevel,
          max: activeStageBoss.maxLevel,
        },
        type: "boss",
      }
    : activeMonster
      ? {
          _type: "monster",
          id: activeMonster.id,
          name: activeMonster.name,
          avatar: activeMonster.avatar,
          avatarSrc: resolveImg(activeMonster.avatar),
          recommendedLevel: activeMonster.recommendedLevel,
          huntTasks: activeMonster.huntTasks,
          stageRange: null,
          type: activeMonster.type,
        }
      : null;

  const hasActiveHunt = activeHuntTarget !== null;
  const isOnHuntMission = activeTab === "HuntMission" && hasActiveHunt;

  const resolveHuntTaskCompleted = useCallback(
    (binding) => {
      if (!binding) return null;
      if (binding.targetType === "monster") {
        const m = monsters.find((x) => x.id === binding.targetId);
        const t = m?.huntTasks?.find((x) => x.id === binding.taskId) ?? null;
        return t?.completed ?? null;
      }
      if (binding.targetType === "stageBoss") {
        const s = stages.find((x) => x.id === binding.targetId);
        const t =
          s?.bossHuntTasks?.find((x) => x.id === binding.taskId) ?? null;
        return t?.completed ?? null;
      }
      return null;
    },
    [monsters, stages],
  );

  const setHuntTaskCompleted = useCallback(
    (binding, completed) => {
      if (!binding) return;
      const cur = resolveHuntTaskCompleted(binding);
      if (cur === null || cur === completed) return;
      if (binding.targetType === "monster")
        toggleHuntTask(binding.targetId, binding.taskId);
      else if (binding.targetType === "stageBoss")
        toggleStageBossHuntTask(binding.targetId, binding.taskId);
    },
    [resolveHuntTaskCompleted, toggleHuntTask, toggleStageBossHuntTask],
  );

  const syncQuestsForHuntTask = useCallback(
    (bindingLike, completed) => {
      if (!bindingLike) return;
      const { targetType, targetId, taskId } = bindingLike;
      quests.forEach((q) => {
        const b = q.huntBinding;
        if (!b) return;
        if (
          b.targetType === targetType &&
          b.targetId === targetId &&
          b.taskId === taskId
        ) {
          setQuestCompletedWithReward(q.id, completed);
        }
      });
    },
    [quests, setQuestCompletedWithReward],
  );

  const toggleQuestSynced = useCallback(
    (questId) => {
      const q = quests.find((x) => x.id === questId);
      if (!q) return;
      const next = !q.completed;
      setQuestCompletedWithReward(questId, next);
      if (q.huntBinding) setHuntTaskCompleted(q.huntBinding, next);
    },
    [quests, setQuestCompletedWithReward, setHuntTaskCompleted],
  );

  const handleBindQuestToActiveHuntTask = useCallback(
    (questId, huntTaskId) => {
      if (!activeHuntTarget) return;
      const binding = {
        targetType: activeHuntTarget._type,
        targetId: activeHuntTarget.id,
        taskId: huntTaskId,
      };
      bindQuestToHuntTask(questId, binding);
      const cur = resolveHuntTaskCompleted(binding);
      if (cur !== null) setQuestCompletedWithReward(questId, cur);
    },
    [
      activeHuntTarget,
      bindQuestToHuntTask,
      resolveHuntTaskCompleted,
      setQuestCompletedWithReward,
    ],
  );

  const handleUnbindQuest = useCallback(
    (questId) => {
      unbindQuestFromHuntTask(questId);
    },
    [unbindQuestFromHuntTask],
  );

  const handleCreateAndBindQuestToActiveHunt = useCallback(
    (questId) => {
      const q = quests.find((x) => x.id === questId);
      if (!q || !activeHuntTarget) return;
      const taskId = Date.now();
      if (activeHuntTarget._type === "stageBoss")
        addStageBossHuntTask(activeHuntTarget.id, q.text, taskId);
      else addHuntTask(activeHuntTarget.id, q.text, taskId);
      bindQuestToHuntTask(questId, {
        targetType: activeHuntTarget._type,
        targetId: activeHuntTarget.id,
        taskId,
      });
      setQuestCompletedWithReward(questId, false);
    },
    [
      quests,
      activeHuntTarget,
      addStageBossHuntTask,
      addHuntTask,
      bindQuestToHuntTask,
      setQuestCompletedWithReward,
    ],
  );

  const huntTaskHandlers =
    activeHuntTarget?._type === "stageBoss"
      ? {
          onAddHuntTask: (_, text) =>
            addStageBossHuntTask(activeHuntTarget.id, text),
          onToggleHuntTask: (_, taskId) => {
            const cur =
              activeHuntTarget.huntTasks.find((t) => t.id === taskId)
                ?.completed ?? null;
            toggleStageBossHuntTask(activeHuntTarget.id, taskId);
            if (cur !== null)
              syncQuestsForHuntTask(
                {
                  targetType: "stageBoss",
                  targetId: activeHuntTarget.id,
                  taskId,
                },
                !cur,
              );
          },
          onRemoveHuntTask: (_, taskId) => {
            removeStageBossHuntTask(activeHuntTarget.id, taskId);
            quests.forEach((q) => {
              const b = q.huntBinding;
              if (
                b?.targetType === "stageBoss" &&
                b.targetId === activeHuntTarget.id &&
                b.taskId === taskId
              )
                unbindQuestFromHuntTask(q.id);
            });
          },
          onUpdateHuntTask: (_, taskId, text) =>
            updateStageBossHuntTask(activeHuntTarget.id, taskId, text),
          onStopHunt: () => stopStageBossHunt(activeHuntTarget.id),
          onCompleteHunt: () => completeStageBossHunt(activeHuntTarget.id),
        }
      : {
          onAddHuntTask: addHuntTask,
          onToggleHuntTask: (monsterId, taskId) => {
            const m = monsters.find((x) => x.id === monsterId);
            const cur =
              m?.huntTasks?.find((t) => t.id === taskId)?.completed ?? null;
            toggleHuntTask(monsterId, taskId);
            if (cur !== null)
              syncQuestsForHuntTask(
                { targetType: "monster", targetId: monsterId, taskId },
                !cur,
              );
          },
          onRemoveHuntTask: (monsterId, taskId) => {
            removeHuntTask(monsterId, taskId);
            quests.forEach((q) => {
              const b = q.huntBinding;
              if (
                b?.targetType === "monster" &&
                b.targetId === monsterId &&
                b.taskId === taskId
              )
                unbindQuestFromHuntTask(q.id);
            });
          },
          onUpdateHuntTask: updateHuntTask,
          onStopHunt: (id) => stopHunt(id),
          onCompleteHunt: null,
        };

  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('_lastSeenLevel');
    if (stored === null) {
      localStorage.setItem('_lastSeenLevel', String(level));
      return;
    }
    const lastSeen = parseInt(stored, 10);
    if (level > lastSeen) {
      setShowLevelUp(true);
      localStorage.setItem('_lastSeenLevel', String(level));
    }
  }, [level]);

  const handleLevelUpComplete = useCallback(() => setShowLevelUp(false), []);

  return (
    <>
      <div className="mobile-page-surface flex justify-center items-start bg-stone-50 md:bg-transparent p-5 md:p-10 pb-6 md:pb-10 min-h-screen md:min-h-0">
        <div className="w-full max-w-[1200px] flex flex-col gap-8">
          <div className="w-full flex flex-col md:flex-row gap-6 md:gap-10">
            {/* Sidebar */}
            <aside
              className="hidden md:flex w-full md:w-[380px] md:shrink-0 flex-col gap-6 md:gap-8"
            >
              {isOnHuntMission ? (
                <HuntSideCard target={activeHuntTarget} />
              ) : (
                <>
                  <CharacterCard
                    level={level}
                    avatar={currentStage.avatarSrc}
                    avatars={currentStage.avatarSrcs}
                    onAvatarChange={(file) =>
                      updateStageAvatar(currentStage.id, file)
                    }
                    imagePosition={imagePosition}
                    onImagePositionChange={updateImagePosition}
                  />
                  <GoldDisplay gold={gold} />
                </>
              )}
            </aside>

            {/* Quest Hub */}
            <div className="w-full flex-1">
              <QuestHub
                quests={quests}
                onAdd={handleAddQuest}
                onToggle={toggleQuestSynced}
                onUpdate={handleUpdateQuest}
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
                onStageAvatarReplace={replaceStageAvatar}
                onStageAvatarRemove={removeStageAvatar}
                onStageLevel={updateStageLevel}
                onAddStage={addStage}
                onRemoveStage={removeStage}
                onReorderStages={reorderStages}
                inboxItems={inboxItems}
                levelingRules={levelingRules}
                onUpdateExpPerLevel={updateExpPerLevel}
                atk={stats.atk.value}
                onAddSubTask={handleAddSubTask}
                onToggleSubTask={toggleSubTask}
                onRemoveSubTask={removeSubTask}
                onUpdateSubTask={handleUpdateSubTask}
                currentLevel={level}
                onResetLevel={handleResetLevel}
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
                onStageAvatarPosition={updateStageAvatarPosition}
                activeHuntTarget={activeHuntTarget}
                huntTaskHandlers={huntTaskHandlers}
                onBindQuestToActiveHuntTask={handleBindQuestToActiveHuntTask}
                onUnbindQuestFromHuntTask={handleUnbindQuest}
                onCreateAndBindQuestToActiveHunt={
                  handleCreateAndBindQuestToActiveHunt
                }
                onInboxAdd={handleAddInboxItem}
                onInboxRemove={removeInboxItem}
                onInboxUpdate={handleUpdateInboxItem}
                onReorderInbox={reorderInboxItems}
                onInboxAddSubTask={handleAddInboxSubTask}
                onInboxToggleSubTask={toggleInboxSubTask}
                onInboxRemoveSubTask={removeInboxSubTask}
                onInboxUpdateSubTask={handleUpdateInboxSubTask}
                onPromoteToQuest={handlePromoteToQuest}
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
                getVocabularySuggestions={getVocabularySuggestions}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            </div>
          </div>
          <WorkBottomProgress expProgress={expProgress} />
        </div>
      </div>

      <LevelUpEffect visible={showLevelUp} onComplete={handleLevelUpComplete} />
    </>
  );
}

function useDatabaseFavicon(user) {
  useEffect(() => {
    applyFaviconUrl(getCachedFaviconUrl());
  }, []);

  useEffect(() => {
    if (!user) return;
    loadFaviconUrl().catch(() => {});
  }, [user]);
}

function WorkBottomProgress({ expProgress }) {
  return (
    <div className="work-bottom-exp-hud hidden md:block w-full">
      <div className="w-full rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-lg">
        <div className="flex items-center justify-between text-sm font-extrabold text-gray-400">
          <span>EXP</span>
          <span>{Math.round(expProgress)}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-btn transition-all"
            style={{ width: `${Math.min(100, Math.max(0, expProgress))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CharacterPage() {
  const {
    lifetimeCompletions,
    coreTaskCompleted,
  } = useQuests();
  const { rules: levelingRules } = useLevelingRules();
  const {
    imagePosition,
    updateImagePosition,
    gold,
    level,
    expProgress,
    coreTaskProgress,
    stats,
  } = useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules);
  const { stages, updateStageAvatar } = useStages();
  const currentStage = resolveCurrentStage(stages, level);

  return (
    <main className="mobile-page-surface flex justify-center bg-stone-50 md:bg-transparent p-5 md:p-10 min-h-screen md:min-h-0">
      <div className="w-full max-w-[900px] flex flex-col md:flex-row md:items-start md:justify-center gap-6 md:gap-10">
        <div className="w-full md:w-auto flex flex-col gap-4">
          <CharacterCard
            level={level}
            avatar={currentStage.avatarSrc}
            avatars={currentStage.avatarSrcs}
            onAvatarChange={(file) => updateStageAvatar(currentStage.id, file)}
            imagePosition={imagePosition}
            onImagePositionChange={updateImagePosition}
          />
          <GoldDisplay gold={gold} className="md:max-w-[380px]" />
        </div>
        <div className="w-full md:w-[430px] md:pt-10">
          <StatsCard
            expProgress={expProgress}
            coreTaskProgress={coreTaskProgress}
            stats={stats}
            level={level}
            currentStage={currentStage}
          />
        </div>
      </div>
    </main>
  );
}

// ── Shared layout with header ─────────────────────────────────
const navLinkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
    isActive
      ? 'text-purple-600 bg-purple-50'
      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
  }`

const mobileNavLinkClass = ({ isActive }) =>
  `mobile-bottom-nav-item flex-1 min-w-0 py-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors ${
    isActive ? 'is-active text-purple-btn bg-purple-50' : 'text-gray-500'
  }`

const mobileNavItemClass = (isActive) =>
  `mobile-bottom-nav-item flex-1 min-w-0 py-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors ${
    isActive ? 'is-active text-purple-btn bg-purple-50' : 'text-gray-500'
  }`

const WORK_TABS = [
  { tab: "Tasks", label: "任務", icon: <TaskAltIcon sx={{ fontSize: 18 }} /> },
  { tab: "Hunt", label: "討伐", icon: <SportsMartialArtsIcon sx={{ fontSize: 18 }} /> },
  { tab: "RewardShop", label: "獎勵商店", icon: <RedeemOutlinedIcon sx={{ fontSize: 18 }} /> },
  { tab: "Story", label: "故事", icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 18 }} /> },
  { tab: "Npc", label: "NPC", icon: <PersonOutlineIcon sx={{ fontSize: 18 }} /> },
  { tab: "Map", label: "地圖", icon: <MapOutlinedIcon sx={{ fontSize: 18 }} /> },
  { tab: "Skills", label: "SKILL", icon: <StarBorderIcon sx={{ fontSize: 18 }} /> },
  { tab: "Inbox", label: "收集箱", icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} /> },
]
const WORK_MORE_TABS = WORK_TABS.filter((item) => item.tab !== "Tasks")

function UserAvatar({ user }) {
  return user.photoURL ? (
    <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
      {user.displayName?.[0] ?? "U"}
    </div>
  )
}

function UserMenu({ user, signIn, logOut, onClose, mobile = false }) {
  return (
    <div
      className={`mobile-user-menu rounded-xl shadow-lg py-2 min-w-[180px] z-50 ${
        mobile
          ? 'fixed right-5 bottom-24 bg-white border border-gray-100'
          : 'absolute right-0 top-10 bg-white border border-gray-100'
      }`}
    >
      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold truncate text-gray-800">{user.displayName}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>
      <button
        onClick={() => {
          onClose()
          signIn({ selectAccount: true })
        }}
        className="w-full text-left px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-purple-50 hover:text-purple-600"
      >
        登入其他 Google 帳號
      </button>
      <button
        onClick={() => {
          onClose()
          logOut()
        }}
        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
      >
        登出
      </button>
    </div>
  )
}

function Layout({ user, signIn, logOut }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [appTheme, setAppThemeState] = useState(getAppTheme)
  const location = useLocation()
  const activeWorkTab = new URLSearchParams(location.search).get("tab") || "Tasks"
  const tasksActive = location.pathname === "/work" && activeWorkTab === "Tasks"
  const moreMenuActive =
    location.pathname === "/system-settings" ||
    (location.pathname === "/work" && WORK_MORE_TABS.some((item) => item.tab === activeWorkTab))

  const closeMenus = () => {
    setShowUserMenu(false)
    setShowMoreMenu(false)
  }

  useEffect(() => {
    document.documentElement.dataset.appTheme = appTheme
  }, [appTheme])

  useEffect(() => {
    const handleThemeChange = (event) => setAppThemeState(event.detail || getAppTheme())
    window.addEventListener(THEME_EVENT, handleThemeChange)
    window.addEventListener('storage', handleThemeChange)
    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange)
      window.removeEventListener('storage', handleThemeChange)
    }
  }, [])

  return (
    <div className="app-shell min-h-screen bg-stone-50 relative overflow-x-hidden pb-24 md:pb-0">
      <header className="hidden md:block sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 h-14 flex items-center justify-between gap-8">
          <div className="app-brand flex items-center gap-3 shrink-0">
            <div className="app-brand-mark flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 text-lg font-black">
              米
            </div>
            <div className="leading-tight">
              <p className="app-brand-title m-0 text-xs font-bold tracking-[0.22em] text-gray-800">
                ADVENTURER LOG
              </p>
              <p className="app-brand-subtitle m-0 text-xs font-bold text-black">
                角色管理面板
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/character" className={navLinkClass}>角色</NavLink>
            <NavLink to="/work" className={navLinkClass}>工作</NavLink>
            <NavLink to="/gallery" className={navLinkClass}>世界圖庫</NavLink>
            <NavLink to="/character-settings" className={navLinkClass}>角色設定</NavLink>
            <NavLink to="/system-settings" className={navLinkClass}>系統設置</NavLink>
          </nav>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-colors"
            >
              <UserAvatar user={user} />
            </button>
            {showUserMenu && (
              <UserMenu
                user={user}
                signIn={signIn}
                logOut={logOut}
                onClose={() => setShowUserMenu(false)}
              />
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <nav className="mobile-bottom-nav fixed bottom-4 left-5 right-5 z-50 md:hidden bg-white/95 border border-gray-200 shadow-[0_12px_32px_rgba(15,23,42,0.14)] flex h-16 rounded-full p-1.5 backdrop-blur">
        <NavLink to="/work" className={() => mobileNavItemClass(tasksActive)} onClick={closeMenus}>
          <TaskAltIcon sx={{ fontSize: 20 }} />
          <span className="text-[0.65rem] font-semibold">任務</span>
        </NavLink>
        <NavLink to="/character" className={mobileNavLinkClass} onClick={closeMenus}>
          <PersonIcon sx={{ fontSize: 20 }} />
          <span className="text-[0.65rem] font-semibold">角色</span>
        </NavLink>
        <NavLink to="/gallery" className={mobileNavLinkClass} onClick={closeMenus}>
          <PublicIcon sx={{ fontSize: 20 }} />
          <span className="text-[0.65rem] font-semibold">圖庫</span>
        </NavLink>
        <NavLink to="/character-settings" className={mobileNavLinkClass} onClick={closeMenus}>
          <TuneIcon sx={{ fontSize: 20 }} />
          <span className="text-[0.65rem] font-semibold">設置</span>
        </NavLink>
        <button
          type="button"
          onClick={() => {
            setShowUserMenu(false)
            setShowMoreMenu((v) => !v)
          }}
          className={`mobile-bottom-nav-item flex-1 min-w-0 py-2 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors bg-transparent border-none ${
            showMoreMenu || moreMenuActive ? 'is-active text-purple-btn bg-purple-50' : 'text-gray-500'
          }`}
        >
          <MoreHorizIcon sx={{ fontSize: 24 }} />
          <span className="text-[0.65rem] font-semibold">更多</span>
        </button>
      </nav>
      {showMoreMenu && (
        <div className="mobile-more-menu fixed right-5 bottom-24 z-50 md:hidden bg-white border border-gray-100 rounded-3xl shadow-lg p-2 min-w-[190px]">
          {WORK_MORE_TABS.map((item) => (
            <NavLink
              key={item.tab}
              to={`/work?tab=${item.tab}`}
              onClick={closeMenus}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname === "/work" && activeWorkTab === item.tab
                  ? "text-purple-btn bg-purple-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/system-settings"
            onClick={closeMenus}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              location.pathname === "/system-settings"
                ? "text-purple-btn bg-purple-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <SettingsIcon sx={{ fontSize: 18 }} />
            系統
          </NavLink>
          <div className="my-2 border-t border-gray-100" />
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-800 truncate">{user.displayName}</p>
            <p className="text-[0.7rem] text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              closeMenus()
              logOut()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors bg-transparent border-none"
          >
            <LogoutIcon sx={{ fontSize: 18 }} />
            登出
          </button>
        </div>
      )}
      {showUserMenu && (
        <div className="md:hidden">
          <UserMenu
            user={user}
            signIn={signIn}
            logOut={logOut}
            onClose={() => setShowUserMenu(false)}
            mobile
          />
        </div>
      )}
      <ImageUploadFeedback />
    </div>
  )
}

export default function App() {
  const { user, loading, signIn, logOut, authError } = useAuth();
  useDatabaseFavicon(user);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-bold text-gray-800">Vanguard Hub</h1>
        <p className="text-gray-500 text-sm">請登入以繼續</p>
        {authError && (
          <p className="max-w-xs text-center text-sm font-medium text-red-500">
            {authError}
          </p>
        )}
        <button
          onClick={() => signIn()}
          className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-gray-700"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          使用 Google 帳號登入
        </button>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout user={user} signIn={signIn} logOut={logOut} />}>
        <Route path="/character" element={<CharacterPage />} />
        <Route path="/work" element={<MainApp />} />
        <Route path="/gallery" element={<WorldGallery />} />
        <Route path="/character-settings" element={<CharacterSettingsPage />} />
        <Route path="/system-settings" element={<SystemSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/work" replace />} />
    </Routes>
  );
}
