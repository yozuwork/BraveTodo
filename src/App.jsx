import { useState, useEffect, useCallback } from "react";
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
import LogoutIcon from "@mui/icons-material/Logout";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
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
import useAuth from "./hooks/useAuth";
import { resolveImg } from "./utils/imageSrc";
import WorldGallery from "./pages/WorldGallery";
import CharacterSettingsPage from "./pages/CharacterSettingsPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import { getAppTheme, THEME_EVENT } from "./utils/themeSettings";

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
  } = useQuests();
  const { rules: levelingRules, updateExpPerLevel } = useLevelingRules();
  const {
    imagePosition,
    updateImagePosition,
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
  } = useInbox();
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
  } = useStories();
  const {
    maps,
    addMap,
    updateMap,
    removeMap,
    updateMapCover,
  } = useMaps();

  const handlePromoteToQuest = useCallback(
    (id, text) => {
      addQuest(text);
      removeInboxItem(id);
    },
    [addQuest, removeInboxItem],
  );

  const handleDemoteToInbox = useCallback(
    (id) => {
      const quest = quests.find((q) => q.id === id);
      if (!quest) return;
      addInboxItem(quest.text, quest.subTasks ?? []);
      removeQuest(id);
    },
    [quests, addInboxItem, removeQuest],
  );

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "Tasks");

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
    if (!tabFromUrl && activeTab !== "Tasks") setActiveTab("Tasks");
  }, [tabFromUrl, activeTab]);

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      setSearchParams(tab === "Tasks" ? {} : { tab });
    },
    [setSearchParams],
  );

  const handleResetLevel = useCallback(
    (completions) => {
      resetLifetimeCompletions(completions);
      resetStageBossHunts();
      resetMonsterHunts();
    },
    [resetLifetimeCompletions, resetStageBossHunts, resetMonsterHunts],
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
          setQuestCompleted(q.id, completed);
        }
      });
    },
    [quests, setQuestCompleted],
  );

  const toggleQuestSynced = useCallback(
    (questId) => {
      const q = quests.find((x) => x.id === questId);
      if (!q) return;
      const next = !q.completed;
      setQuestCompleted(questId, next);
      if (q.huntBinding) setHuntTaskCompleted(q.huntBinding, next);
    },
    [quests, setQuestCompleted, setHuntTaskCompleted],
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
      if (cur !== null) setQuestCompleted(questId, cur);
    },
    [
      activeHuntTarget,
      bindQuestToHuntTask,
      resolveHuntTaskCompleted,
      setQuestCompleted,
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
      setQuestCompleted(questId, false);
    },
    [
      quests,
      activeHuntTarget,
      addStageBossHuntTask,
      addHuntTask,
      bindQuestToHuntTask,
      setQuestCompleted,
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
        <div className="w-full max-w-[1200px] flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Sidebar */}
          <aside
            className="hidden md:flex w-full md:w-[380px] md:shrink-0 flex-col gap-6 md:gap-8"
          >
            {isOnHuntMission ? (
              <HuntSideCard target={activeHuntTarget} />
            ) : (
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
            )}
            <StatsCard
              expProgress={expProgress}
              coreTaskProgress={coreTaskProgress}
              stats={stats}
              level={level}
              currentStage={currentStage}
            />
          </aside>

          {/* Quest Hub */}
          <div className="w-full flex-1">
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
              onAddSubTask={addSubTask}
              onToggleSubTask={toggleSubTask}
              onRemoveSubTask={removeSubTask}
              onUpdateSubTask={updateSubTask}
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
              onInboxAdd={addInboxItem}
              onInboxRemove={removeInboxItem}
              onInboxUpdate={updateInboxItem}
              onReorderInbox={reorderInboxItems}
              onInboxAddSubTask={addInboxSubTask}
              onInboxToggleSubTask={toggleInboxSubTask}
              onInboxRemoveSubTask={removeInboxSubTask}
              onInboxUpdateSubTask={updateInboxSubTask}
              onPromoteToQuest={handlePromoteToQuest}
              stories={stories}
              onStoryAdd={addStory}
              onStoryUpdate={updateStory}
              onStoryRemove={removeStory}
              onStoryCoverChange={updateStoryCover}
              onStoryTogglePin={toggleStoryPin}
              maps={maps}
              onMapAdd={addMap}
              onMapUpdate={updateMap}
              onMapRemove={removeMap}
              onMapCoverChange={updateMapCover}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        </div>
      </div>

      <LevelUpEffect visible={showLevelUp} onComplete={handleLevelUpComplete} />
    </>
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
    level,
    expProgress,
    coreTaskProgress,
    stats,
  } = useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules);
  const { stages, updateStageAvatar } = useStages();
  const currentStage = resolveCurrentStage(stages, level);

  return (
    <main className="mobile-page-surface flex justify-center bg-stone-50 md:bg-transparent p-5 md:p-10 min-h-screen md:min-h-0">
      <div className="w-full max-w-[430px] flex flex-col gap-6 md:gap-8">
        <CharacterCard
          level={level}
          avatar={currentStage.avatarSrc}
          avatars={currentStage.avatarSrcs}
          onAvatarChange={(file) => updateStageAvatar(currentStage.id, file)}
          imagePosition={imagePosition}
          onImagePositionChange={updateImagePosition}
        />
        <StatsCard
          expProgress={expProgress}
          coreTaskProgress={coreTaskProgress}
          stats={stats}
          level={level}
          currentStage={currentStage}
        />
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
  { tab: "Story", label: "故事", icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 18 }} /> },
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
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 h-12 flex items-center justify-between">
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
