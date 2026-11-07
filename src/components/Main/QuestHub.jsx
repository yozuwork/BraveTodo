import { useState, useEffect, useRef, useCallback } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import CloseIcon from '@mui/icons-material/Close'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import QuestItem from './QuestItem'
import QuestDetailDrawer from './QuestDetailDrawer'
import InboxItem from './InboxItem'
import HuntTab from './HuntTab'
import HuntMission from './HuntMission'
import StoryTab from './StoryTab'
import SkillTab from './SkillTab'
import MapTab from './MapTab'
import NpcTab from './NpcTab'
import RewardShopTab from './RewardShopTab'
import CharacterSettings from './CharacterSettings'
import VocabularyInput from '../common/VocabularyInput'
import QuestCanvasView from './QuestCanvasView'
import { resolveCurrentStage } from '../../hooks/useStages'
import useWorkspaces from '../../hooks/useWorkspaces'
import useWorkFeatureVisibility from '../../hooks/useWorkFeatureVisibility'

const LEGACY_AVATAR_SIZE_KEY = 'brave-todo:work-avatar-size'
const DESKTOP_AVATAR_SIZE_KEY = 'brave-todo:work-avatar-size:desktop'
const MOBILE_AVATAR_SIZE_KEY = 'brave-todo:work-avatar-size:mobile'
const QUEST_VIEW_KEY = 'brave-todo:quest-view'
const AVATAR_FIT_KEY = 'brave-todo:work-avatar-fit'

function ComicExperienceBar({ level, progress, currentExp, expToNextLevel }) {
  const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0))

  return (
    <div className="comic-exp" aria-label={`等級 ${level} 經驗值 ${currentExp} / ${expToNextLevel}`}>
      <div className="comic-exp__meta">
        <span className="comic-exp__title">經驗值 <b>EXP</b></span>
      </div>
      <div
        className="comic-exp__track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={expToNextLevel}
        aria-valuenow={currentExp}
      >
        <div className="comic-exp__fill" style={{ width: `${safeProgress}%` }}>
          <span className="comic-exp__speed-lines" />
        </div>
        <span className="comic-exp__value">{currentExp} / {expToNextLevel}</span>
      </div>
    </div>
  )
}

function ResizableWorkAvatar({ avatar, imagePosition, onAvatarChange, onImagePositionChange }) {
  const readSavedSize = (key, fallback, legacyKey = null) => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : 'null') || 'null')
      if (stored?.width && stored?.height) return stored
    } catch {
      // Use the default size if the saved value is malformed.
    }
    return fallback
  }
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [desktopSize, setDesktopSize] = useState(() => readSavedSize(DESKTOP_AVATAR_SIZE_KEY, { width: 168, height: 168 }, LEGACY_AVATAR_SIZE_KEY))
  const [mobileSize, setMobileSize] = useState(() => readSavedSize(MOBILE_AVATAR_SIZE_KEY, { width: 168, height: 168 }))
  const size = isMobileViewport ? mobileSize : desktopSize
  const resizeRef = useRef(null)
  const editorPreviewRef = useRef(null)
  const editorDragRef = useRef(null)
  const fileInputRef = useRef(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [imageFit, setImageFit] = useState(() => localStorage.getItem(AVATAR_FIT_KEY) === 'contain' ? 'contain' : 'cover')
  const toggleImageFit = () => {
    const next = imageFit === 'contain' ? 'cover' : 'contain'
    setImageFit(next)
    localStorage.setItem(AVATAR_FIT_KEY, next)
  }
  const fitClass = imageFit === 'contain' ? 'object-contain' : 'object-cover'

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const syncViewport = (event) => setIsMobileViewport(event.matches)
    setIsMobileViewport(media.matches)
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  const startImageDrag = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    editorDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      positionX: imagePosition?.x ?? 50,
      positionY: imagePosition?.y ?? 50,
    }
  }

  const dragImage = (event) => {
    if (!editorDragRef.current || !editorPreviewRef.current) return
    const rect = editorPreviewRef.current.getBoundingClientRect()
    const nextX = Math.min(100, Math.max(0, editorDragRef.current.positionX - ((event.clientX - editorDragRef.current.startX) / rect.width) * 100))
    const nextY = Math.min(100, Math.max(0, editorDragRef.current.positionY - ((event.clientY - editorDragRef.current.startY) / rect.height) * 100))
    onImagePositionChange?.({ x: nextX, y: nextY })
  }

  const stopImageDrag = () => {
    editorDragRef.current = null
  }

  const downloadAvatar = () => {
    if (!avatar) return
    const link = document.createElement('a')
    link.href = avatar
    link.download = 'character-avatar.jpg'
    link.rel = 'noopener'
    link.click()
  }

  const startResize = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      width: size.width,
      height: size.height,
      mode: isMobileViewport ? 'mobile' : 'desktop',
    }
  }

  const resize = (event) => {
    if (!resizeRef.current) return
    const viewportMaxWidth = Math.max(150, Math.min(520, window.innerWidth - 48))
    const next = {
      width: Math.min(viewportMaxWidth, Math.max(130, resizeRef.current.width + event.clientX - resizeRef.current.startX)),
      height: Math.min(520, Math.max(110, resizeRef.current.height + event.clientY - resizeRef.current.startY)),
    }
    resizeRef.current.next = next
    if (resizeRef.current.mode === 'mobile') {
      setMobileSize(next)
    } else {
      setDesktopSize(next)
    }
  }

  const finishResize = () => {
    if (!resizeRef.current) return
    const finalSize = resizeRef.current.next ?? size
    const storageKey = resizeRef.current.mode === 'mobile' ? MOBILE_AVATAR_SIZE_KEY : DESKTOP_AVATAR_SIZE_KEY
    resizeRef.current = null
    localStorage.setItem(storageKey, JSON.stringify(finalSize))
  }

  return (
    <div
      className={`work-character-avatar group/avatar relative shrink-0 overflow-hidden rounded-xl md:rounded-none ${imageFit === 'contain' ? 'bg-black' : 'bg-purple-50'}`}
      style={{ width: isMobileViewport ? size.width : '100%', height: size.height }}
      onPointerMove={resize}
      onPointerUp={finishResize}
      onPointerCancel={finishResize}
    >
      {avatar && (
        <img
          src={avatar}
          alt="米莉亞"
          className={`h-full w-full cursor-pointer ${fitClass}`}
          style={{ objectPosition: `${imagePosition?.x ?? 50}% ${imagePosition?.y ?? 50}%` }}
          onClick={() => setEditorOpen(true)}
          title="點擊編輯大頭貼"
          draggable={false}
        />
      )}
      {avatar && (
        <button
          type="button"
          onClick={toggleImageFit}
          className={`absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-white transition-opacity ${
            imageFit === 'contain' ? 'bg-black/70 opacity-100' : 'bg-black/55 opacity-0 group-hover/avatar:opacity-100 max-md:opacity-100'
          }`}
          title={imageFit === 'contain' ? '改回填滿' : '完整顯示圖片（比例不夠會有黑邊）'}
          aria-label={imageFit === 'contain' ? '改回填滿' : '完整顯示圖片'}
          aria-pressed={imageFit === 'contain'}
        >
          <FitScreenOutlinedIcon sx={{ fontSize: 14 }} />
          {imageFit === 'contain' ? '填滿' : '完整'}
        </button>
      )}
      <button
        type="button"
        onPointerDown={startResize}
        className="work-avatar-resize-handle absolute bottom-0 right-0 z-20 flex h-9 w-9 touch-none cursor-nwse-resize items-end justify-end bg-black/70 p-1.5 text-white"
        onClick={(event) => event.stopPropagation()}
        title="拖曳調整頭像寬高"
        aria-label="調整頭像寬高"
      >
        <span className="block h-2.5 w-2.5 border-b-2 border-r-2 border-white" />
      </button>

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="xs">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onAvatarChange?.(file)
            event.target.value = ''
          }}
        />
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="m-0 text-base font-extrabold text-slate-900">編輯大頭貼</p>
            <p className="m-0 mt-1 text-xs text-slate-400">拖曳圖片調整顯示位置，或直接 Ctrl+V 貼上圖片更換</p>
          </div>
          <button type="button" onClick={() => setEditorOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-slate-600" aria-label="關閉大頭貼編輯">
            <CloseIcon sx={{ fontSize: 19 }} />
          </button>
        </div>
        <div className="p-5">
          <div
            ref={editorPreviewRef}
            className={`relative aspect-square w-full touch-none overflow-hidden rounded-xl border-2 border-slate-900 cursor-grab active:cursor-grabbing ${imageFit === 'contain' ? 'bg-black' : 'bg-slate-100'}`}
            onPointerDown={startImageDrag}
            onPointerMove={dragImage}
            onPointerUp={stopImageDrag}
            onPointerCancel={stopImageDrag}
          >
            {avatar && (
              <img
                src={avatar}
                alt="大頭貼預覽"
                className={`pointer-events-none h-full w-full select-none ${fitClass}`}
                style={{ objectPosition: `${imagePosition?.x ?? 50}% ${imagePosition?.y ?? 50}%` }}
                draggable={false}
              />
            )}
          </div>

          <button
            type="button"
            onClick={toggleImageFit}
            className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors ${
              imageFit === 'contain' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-300 text-slate-700 hover:bg-gray-50'
            }`}
            aria-pressed={imageFit === 'contain'}
          >
            <FitScreenOutlinedIcon sx={{ fontSize: 17 }} />
            {imageFit === 'contain' ? '完整顯示中（點擊改回填滿）' : '完整顯示全部圖片'}
          </button>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-1 rounded-xl border border-gray-300 px-2 py-2.5 text-xs font-bold text-slate-700 hover:bg-gray-50">
              <UploadFileOutlinedIcon sx={{ fontSize: 17 }} />更換
            </button>
            <button type="button" onClick={() => avatar && window.open(avatar, '_blank', 'noopener,noreferrer')} disabled={!avatar} className="flex items-center justify-center gap-1 rounded-xl border border-gray-300 px-2 py-2.5 text-xs font-bold text-slate-700 hover:bg-gray-50 disabled:opacity-40">
              <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />查看
            </button>
            <button type="button" onClick={downloadAvatar} disabled={!avatar} className="flex items-center justify-center gap-1 rounded-xl border border-gray-300 px-2 py-2.5 text-xs font-bold text-slate-700 hover:bg-gray-50 disabled:opacity-40">
              <DownloadOutlinedIcon sx={{ fontSize: 17 }} />下載
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function getQuestTierLabel(template) {
  if ((template.rewardMode ?? 'tier') === 'custom') {
    const customExp = Math.max(1, Number(template.customExp) || Number(template.expValue) || 1)
    const customGold = Math.max(0, Number(template.customGold) || 0)
    return `自訂 EXP ${customExp} / ${customGold} 金`
  }
  if (template.expValue === 20) return '特殊任務 +20'
  if (template.expValue === 10) return '特級 +10'
  if (template.expValue === 5) return '上等 +5'
  if (template.expValue === 3) return '中等 +3'
  return '一般 +1'
}

export default function QuestHub({
  quests, showCompletedInAll, globalCardCoverRatio, onAllCardCoverRatioChange, questTemplates, onAdd, onAddFromTemplate, onSaveQuestTemplate, onRemoveQuestTemplate, onToggle, onUpdate, onQuestCoverChange, onQuestCardMediaChange, onRemove, onTogglePin, onToggleCore, onSetPriority, onSetStatus, onSetExp, onUpdateRewardConfig, onReorderQuests, onClearCompleted,
  onDemoteToInbox,
  onInboxAddSubTask, onInboxToggleSubTask, onInboxRemoveSubTask, onInboxUpdateSubTask,
  stages, onStageName, onStageInfo, onStageAvatar, onStageAvatarReplace, onStageAvatarRemove, onStageLevel, onStageExpPerLevel, onAddStage, onRemoveStage, onReorderStages, onStageAvatarPosition,
  inboxItems, onInboxAdd, onInboxRemove, onInboxUpdate, onPromoteToQuest,
  levelingRules,
  rewardSettings, onUpdateRewardGold, onUpdateRewardColor,
  autoExpSettings, onAutoExpEnabled, onUpdateAutoExpThreshold,
  tierUnlockSettings, onTierUnlockEnabled, onUpdateTierUnlockLevel, lockedExpLevels = {},
  atk,
  onAddSubTask, onToggleSubTask, onSetSubTaskExp, onSetSchedule, onDuplicateQuest, onMoveQuestToBoard, onSetQuestCollapsed, onRemoveSubTask, onUpdateSubTask, onAddSubTaskImage, onQuestCanvasPositionChange, onAddCanvasQuest,
  currentLevel, expProgress, currentExp, expToNextLevel, avatar, imagePosition, onAvatarChange, onImagePositionChange, onResetLevel,
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
  activeTab, onTabChange, collectionTabs = [], onCollectionTabSeen,
}) {
  const [inputValue, setInputValue] = useState('')
  const [inboxInput, setInboxInput] = useState('')
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false)
  const [mobileActionMenuOpen, setMobileActionMenuOpen] = useState(false)
  const [questTemplateDialogOpen, setQuestTemplateDialogOpen] = useState(false)
  const [questTemplateSavedNotice, setQuestTemplateSavedNotice] = useState(false)
  const [taskFilter, setTaskFilter] = useState('all')
  const { isVisible: isWorkFeatureVisible } = useWorkFeatureVisibility()
  const [questView, setQuestView] = useState(() => localStorage.getItem(QUEST_VIEW_KEY) === 'canvas' ? 'canvas' : 'list')
  const [selectedQuestId, setSelectedQuestId] = useState(null)
  // 畫布剪下的卡片（Ctrl+X），切換到另一個畫布分頁後 Ctrl+V 貼上
  const [canvasClipboard, setCanvasClipboard] = useState(null)
  const mobileInputRef = useRef(null)
  const desktopInputRef = useRef(null)

  // ── Drag-and-drop state ──
  const questDragId = useRef(null)
  const [questDragOverId, setQuestDragOverId] = useState(null)
  const [questInsertBefore, setQuestInsertBefore] = useState(true)

  const inboxDragId = useRef(null)
  const [inboxDragOverId, setInboxDragOverId] = useState(null)
  const [inboxInsertBefore, setInboxInsertBefore] = useState(true)

  const handleQuestDragStart = useCallback((e, id) => {
    if (e.target.closest('button, input, textarea, select, label, a')) {
      e.preventDefault()
      return
    }
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
    if (activeTab === 'Stages' || activeTab === 'Leveling' || activeTab === 'Other') {
      onTabChange('Tasks')
    }
    if (taskFilter === 'hunt' && !isWorkFeatureVisible('Hunt')) setTaskFilter('all')
    // 討伐 now lives as a tab inside 任務
    if (activeTab === 'Hunt') {
      setTaskFilter('hunt')
      onTabChange('Tasks')
    }
  }, [hasActiveHunt, activeTab, onTabChange, taskFilter, isWorkFeatureVisible])

  const isCollectionTab = collectionTabs.some((item) => item.tab === activeTab)
  useEffect(() => {
    if (isCollectionTab) onCollectionTabSeen?.(activeTab)
  }, [isCollectionTab, activeTab, onCollectionTabSeen])

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

  const currentStage = resolveCurrentStage(stages, currentLevel)
  const { activeWorkspace } = useWorkspaces()
  const characterName = activeWorkspace.characterName
  // 怪物分頁的卡片是獨立畫布，不出現在任務清單與狀態篩選
  const taskQuests = quests.filter((quest) => !quest.board)
  const monsterBoardQuests = quests.filter((quest) => quest.board === 'monster')
  const hasCompleted = taskQuests.some((q) => q.completed)
  const activeQuestCount = taskQuests.filter((quest) => !quest.completed).length
  const visibleQuests = taskQuests.filter((quest) => {
    if (taskFilter === 'completed') return quest.completed
    if (taskFilter === 'progress') return !quest.completed && quest.status === 'progress'
    if (taskFilter === 'pending') return !quest.completed && quest.status !== 'progress'
    return showCompletedInAll || !quest.completed
  })
  const taskSuggestions = getVocabularySuggestions?.(inputValue, ['task', 'inbox']) ?? []
  const inboxSuggestions = getVocabularySuggestions?.(inboxInput, ['inbox', 'task']) ?? []
  const selectedQuest = quests.find((quest) => quest.id === selectedQuestId) ?? null
  const rewardColorMap = new Map(rewardSettings.map((item) => [Number(item.expValue), item.color]))

  const handleSaveQuestTemplate = useCallback((quest) => {
    const templateId = onSaveQuestTemplate?.(quest)
    if (templateId) {
      setQuestTemplateSavedNotice(true)
    }
  }, [onSaveQuestTemplate])

  const handleOpenQuestComposer = () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      desktopInputRef.current?.focus()
      desktopInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setMobileComposerOpen(true)
  }

  const changeQuestView = (view) => {
    setQuestView(view)
    localStorage.setItem(QUEST_VIEW_KEY, view)
  }

  const characterSettingsPanel = (
    <CharacterSettings
      stages={stages}
      onStageName={onStageName}
      onStageInfo={onStageInfo}
      onStageAvatar={onStageAvatar}
      onStageAvatarReplace={onStageAvatarReplace}
      onStageAvatarRemove={onStageAvatarRemove}
      onStageLevel={onStageLevel}
      onStageExpPerLevel={onStageExpPerLevel}
      onAddStage={onAddStage}
      onRemoveStage={onRemoveStage}
      onReorderStages={onReorderStages}
      onStageAvatarPosition={onStageAvatarPosition}
      levelingRules={levelingRules}
      rewardSettings={rewardSettings}
      onUpdateRewardGold={onUpdateRewardGold}
      onUpdateRewardColor={onUpdateRewardColor}
      autoExpSettings={autoExpSettings}
      onAutoExpEnabled={onAutoExpEnabled}
      onUpdateAutoExpThreshold={onUpdateAutoExpThreshold}
      tierUnlockSettings={tierUnlockSettings}
      onTierUnlockEnabled={onTierUnlockEnabled}
      onUpdateTierUnlockLevel={onUpdateTierUnlockLevel}
      currentLevel={currentLevel}
      onResetLevel={onResetLevel}
    />
  )

  const huntPanel = (
    <HuntTab
      monsters={monsters}
      onAdd={onAddMonster}
      onUpdate={onUpdateMonster}
      onRemove={onRemoveMonster}
      onAvatarChange={onMonsterAvatarChange}
      currentLevel={currentLevel}
      onStartHunt={(id) => {
        onStartHunt(id)
        onTabChange('HuntMission')
      }}
      onStopHunt={onStopHunt}
      stages={stages}
      onStartStageBossHunt={(id) => {
        onStartStageBossHunt(id)
        onTabChange('HuntMission')
      }}
      onStopStageBossHunt={onStopStageBossHunt}
      onCompleteStageBossHunt={onCompleteStageBossHunt}
      onStageBossNameChange={onStageBossNameChange}
      onStageBossAvatarChange={onStageBossAvatarChange}
      onStageLevelChange={onStageLevel}
      onAddStage={onAddStage}
      onRemoveStage={onRemoveStage}
      onReorderStages={onReorderStages}
    />
  )

  return (
    <div className="mobile-work-hub flex-1 flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
      {activeTab !== 'HuntMission' && activeTab !== 'CharacterSettings' && (
      <section className={`work-character-summary flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.05)] md:sticky md:top-[96px] md:w-[300px] md:shrink-0 ${activeTab === 'Character' ? 'flex' : 'hidden md:flex'}`}>
        <div className="flex min-w-0 flex-col gap-4 p-3 md:gap-0 md:p-0">
          <ResizableWorkAvatar avatar={avatar} imagePosition={imagePosition} onAvatarChange={onAvatarChange} onImagePositionChange={onImagePositionChange} />
          <div className="flex min-w-0 flex-col md:gap-4 md:p-5">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="min-w-0 py-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h1 className="m-0 min-w-0 truncate text-2xl font-extrabold tracking-wide text-slate-900 md:text-3xl">{characterName}</h1>
                  <span className="shrink-0 text-xl font-extrabold tracking-wide text-purple-600 md:text-2xl">
                    LV{currentLevel}
                  </span>
                </div>
                <p className="m-0 mt-2 text-sm font-medium text-slate-500 md:text-base">
                  {currentStage?.className || '初心者'}
                </p>
              </div>
              <div className="w-full rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="m-0 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">角色資訊</p>
                <p className={`m-0 mt-1 whitespace-pre-wrap break-words text-sm leading-6 ${currentStage?.characterInfo?.trim() ? 'text-slate-600' : 'text-slate-400'}`}>
                  {currentStage?.characterInfo?.trim() || '尚未填寫目前階段的角色資訊。'}
                </p>
              </div>
            </div>
            <ComicExperienceBar
              level={currentLevel}
              progress={expProgress}
              currentExp={currentExp}
              expToNextLevel={expToNextLevel}
            />
          </div>
        </div>
        {hasActiveHunt && (
          <div className="hidden border-t border-slate-100 p-5 md:block">
            <button
              type="button"
              onClick={() => onTabChange('HuntMission')}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600"
            >
              討伐進行中・前往任務
            </button>
          </div>
        )}
        {activeTab === 'Tasks' && (
          <div className="hidden flex-col gap-2 border-t border-slate-100 p-5 md:flex">
            <button
              type="button"
              onClick={handleOpenQuestComposer}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-purple-300 bg-white px-4 py-2.5 text-sm font-bold text-purple-600 transition-colors hover:bg-purple-50"
            >
              <AddIcon sx={{ fontSize: 19 }} />
              新增任務
            </button>
            <button
              type="button"
              onClick={() => setQuestTemplateDialogOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-purple-300 bg-white px-4 py-2.5 text-sm font-bold text-purple-600 transition-colors hover:bg-purple-50"
            >
              <LibraryBooksOutlinedIcon sx={{ fontSize: 18 }} />
              模板任務
            </button>
          </div>
        )}
      </section>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-5">
      {isCollectionTab && (
        <nav className="flex flex-wrap gap-2" aria-label="冒險手冊分類">
          {collectionTabs.map((item) => {
            const active = item.tab === activeTab
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onTabChange(item.tab)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>
      )}

      {activeTab === 'Tasks' && (
        <div className="fixed bottom-[94px] right-4 z-40 flex flex-col items-end gap-2 md:hidden">
          {mobileActionMenuOpen && (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileActionMenuOpen(false)
                  handleOpenQuestComposer()
                }}
                className="mobile-quest-fab-action flex h-12 items-center overflow-hidden rounded-full border border-slate-300 bg-white pl-5 text-sm font-extrabold text-slate-900 shadow-lg"
              >
                <span>新增任務</span>
                <span className="ml-4 flex h-12 w-12 items-center justify-center rounded-full border-l border-slate-300 bg-white">
                  <AddIcon sx={{ fontSize: 24 }} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileActionMenuOpen(false)
                  setQuestTemplateDialogOpen(true)
                }}
                className="mobile-quest-fab-action flex h-12 items-center overflow-hidden rounded-full border border-slate-300 bg-white pl-5 text-sm font-extrabold text-slate-900 shadow-lg"
              >
                <span>模板任務</span>
                <span className="ml-4 flex h-12 w-12 items-center justify-center rounded-full border-l border-slate-300 bg-white">
                  <LibraryBooksOutlinedIcon sx={{ fontSize: 21 }} />
                </span>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileActionMenuOpen((value) => !value)}
            className={`mobile-fab flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition-transform ${mobileActionMenuOpen ? 'rotate-45' : ''}`}
            aria-expanded={mobileActionMenuOpen}
            aria-label={mobileActionMenuOpen ? '關閉任務選單' : '開啟任務選單'}
          >
            <AddIcon sx={{ fontSize: 36 }} />
          </button>
        </div>
      )}

      {activeTab === 'Tasks' && (
        <div className="flex flex-col gap-4">
          <nav className="work-status-tabs flex border-b border-slate-200">
            {[
              ['all', '全部'],
              ['pending', '待處理'],
              ['progress', '進行中'],
              ['completed', '已完成'],
              ['stages', '角色階段'],
              ...(isWorkFeatureVisible('Hunt') ? [['hunt', '討伐']] : []),
              ['monster', '怪物'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTaskFilter(key)}
                className={`relative flex-1 bg-transparent px-2 py-3 text-sm font-semibold transition-colors md:flex-none md:px-5 ${
                  taskFilter === key ? 'text-purple-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
                {taskFilter === key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-purple-500" />}
              </button>
            ))}
            {!['stages', 'hunt', 'monster'].includes(taskFilter) && (
            <div className="ml-auto flex shrink-0 items-stretch">
              <button
                type="button"
                onClick={() => changeQuestView('list')}
                className={`quest-toolbar-option flex w-10 items-center justify-center transition-colors ${questView === 'list' ? 'is-active' : ''}`}
                title="列表檢視"
                aria-label="列表檢視"
                aria-pressed={questView === 'list'}
              >
                <ViewListOutlinedIcon sx={{ fontSize: 20 }} />
              </button>
              <button
                type="button"
                onClick={() => changeQuestView('canvas')}
                className={`quest-toolbar-option flex w-10 items-center justify-center transition-colors ${questView === 'canvas' ? 'is-active' : ''}`}
                title="白板檢視（卡片可自由拖動）"
                aria-label="白板檢視"
                aria-pressed={questView === 'canvas'}
              >
                <DashboardOutlinedIcon sx={{ fontSize: 19 }} />
              </button>
              {hasCompleted && (
                <button
                  type="button"
                  onClick={onClearCompleted}
                  className="flex w-10 items-center justify-center bg-transparent text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="清除已完成任務"
                  aria-label="清除已完成任務"
                >
                  <DeleteSweepOutlinedIcon sx={{ fontSize: 20 }} />
                </button>
              )}
            </div>
            )}
          </nav>

          {taskFilter === 'stages' ? characterSettingsPanel : taskFilter === 'hunt' ? huntPanel : taskFilter === 'monster' ? (
            <QuestCanvasView
              key="monster"
              board="monster"
              quests={monsterBoardQuests}
              onPositionChange={onQuestCanvasPositionChange}
              onOpenDetails={setSelectedQuestId}
              onToggleSubTask={onToggleSubTask}
              onRemoveSubTask={onRemoveSubTask}
              onAddSubTask={onAddSubTask}
              onAddSubTaskImage={onAddSubTaskImage}
              onUpdateQuest={onUpdate}
              onSetExp={onSetExp}
              lockedExpLevels={lockedExpLevels}
              onSetSubTaskExp={onSetSubTaskExp}
              onSetSchedule={onSetSchedule}
              onDuplicateQuest={onDuplicateQuest}
              questTemplates={questTemplates}
              onAddFromTemplate={onAddFromTemplate}
              onSaveQuestTemplate={onSaveQuestTemplate}
              onRemoveQuestTemplate={onRemoveQuestTemplate}
              onMoveQuestToBoard={onMoveQuestToBoard}
              onSetQuestCollapsed={onSetQuestCollapsed}
              clipboard={canvasClipboard}
              onClipboardChange={setCanvasClipboard}
              onAddCanvasQuest={onAddCanvasQuest}
              onRemoveQuest={onRemove}
            />
          ) : (
          <>
          <div className="relative">
            <VocabularyInput
              ref={desktopInputRef}
              type="text"
              wrapperClassName="relative"
              className="w-full bg-white text-black border border-slate-200 rounded-xl py-4 pl-5 pr-20 text-sm focus:outline-none focus:border-purple-400 transition-colors placeholder:text-slate-400"
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
          {questView === 'canvas' ? (
            <QuestCanvasView
              quests={visibleQuests}
              huntTarget={activeHuntTarget}
              huntTaskHandlers={huntTaskHandlers}
              onOpenHunt={() => onTabChange('HuntMission')}
              onPositionChange={onQuestCanvasPositionChange}
              onOpenDetails={setSelectedQuestId}
              onToggleSubTask={onToggleSubTask}
              onRemoveSubTask={onRemoveSubTask}
              onAddSubTask={onAddSubTask}
              onAddSubTaskImage={onAddSubTaskImage}
              onUpdateQuest={onUpdate}
              onSetExp={onSetExp}
              lockedExpLevels={lockedExpLevels}
              onSetSubTaskExp={onSetSubTaskExp}
              onSetSchedule={onSetSchedule}
              onDuplicateQuest={onDuplicateQuest}
              questTemplates={questTemplates}
              onAddFromTemplate={onAddFromTemplate}
              onSaveQuestTemplate={onSaveQuestTemplate}
              onRemoveQuestTemplate={onRemoveQuestTemplate}
              onMoveQuestToBoard={onMoveQuestToBoard}
              onSetQuestCollapsed={onSetQuestCollapsed}
              clipboard={canvasClipboard}
              onClipboardChange={setCanvasClipboard}
              onAddCanvasQuest={onAddCanvasQuest}
              onRemoveQuest={onRemove}
            />
          ) : (
          <div className="mobile-task-list-panel flex flex-col gap-3">
            {visibleQuests.length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <p className="text-lg font-semibold">這個分類還沒有任務</p>
                <p className="text-sm mt-1">從上方輸入一個新任務吧！</p>
              </div>
            ) : (
              [...visibleQuests]
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
                      onDragOver={(e) => (!quest.completed) && handleQuestDragOver(e, quest.id)}
                      onDrop={(e) => handleQuestDrop(e, quest.id)}
                      onDragEnd={handleQuestDragEnd}
                      className={`relative group/drag ${!quest.completed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      style={{ opacity: questDragId.current === quest.id ? 0.4 : 1 }}
                    >
                      {isOver && questInsertBefore && (
                        <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-purple-400 rounded-full z-10 pointer-events-none" />
                      )}
                      <div className={`absolute left-0 top-0 bottom-0 items-center pl-1 opacity-0 group-hover/drag:opacity-100 transition-opacity z-10 pointer-events-none flex`}>
                        {!quest.completed && <DragIndicatorIcon sx={{ fontSize: 16, color: '#d1d5db' }} />}
                      </div>
                        <QuestItem
                        quest={quest}
                        expColor={rewardColorMap.get(quest.expValue === 2 ? 3 : quest.expValue)}
                        onSaveTemplate={handleSaveQuestTemplate}
                        onToggle={onToggle}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                        onTogglePin={onTogglePin}
                        onToggleCore={onToggleCore}
                        onSetPriority={onSetPriority}
                        onSetStatus={onSetStatus}
                        onSetExp={onSetExp}
              lockedExpLevels={lockedExpLevels}
                        onUpdateRewardConfig={onUpdateRewardConfig}
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
          )}
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
          </>
          )}
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
                  className="quest-template-card w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 transition-colors hover:border-purple-200 hover:bg-purple-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onAddFromTemplate(template.id)
                        setQuestTemplateDialogOpen(false)
                      }}
                      className="quest-template-apply min-w-0 flex-1 text-left"
                    >
                      <p className="m-0 text-sm font-bold text-black">{template.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                          {template.priority === 'high' ? '優先' : template.priority === 'low' ? '最後' : '次要'}
                        </span>
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-500">
                          {getQuestTierLabel(template)}
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
                      <span className="quest-template-use-label shrink-0 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700">
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
          heroAvatar={avatar}
          heroImagePosition={imagePosition}
          heroName={characterName}
          heroClassName={currentStage?.className}
          heroLevel={currentLevel}
          activeQuestCount={activeQuestCount}
          onAddHuntTask={huntTaskHandlers.onAddHuntTask}
          onToggleHuntTask={huntTaskHandlers.onToggleHuntTask}
          onRemoveHuntTask={huntTaskHandlers.onRemoveHuntTask}
          onUpdateHuntTask={huntTaskHandlers.onUpdateHuntTask}
          onStopHunt={huntTaskHandlers.onStopHunt}
          onCompleteHunt={huntTaskHandlers.onCompleteHunt}
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

      {activeTab === 'CharacterSettings' && characterSettingsPanel}

      <QuestDetailDrawer
        open={Boolean(selectedQuest)}
        quest={selectedQuest}
        defaultCover={avatar}
        onClose={() => setSelectedQuestId(null)}
        onUpdate={onUpdate}
        onCoverChange={onQuestCoverChange}
        onCardMediaChange={onQuestCardMediaChange}
        globalCoverRatio={globalCardCoverRatio}
        onAllCoverRatioChange={onAllCardCoverRatioChange}
        onToggle={onToggle}
        onRemove={onRemove}
        onTogglePin={onTogglePin}
        onToggleCore={onToggleCore}
        onSaveTemplate={handleSaveQuestTemplate}
        onSetPriority={onSetPriority}
        onSetStatus={onSetStatus}
        onSetExp={onSetExp}
              lockedExpLevels={lockedExpLevels}
        onAddSubTask={onAddSubTask}
        onToggleSubTask={onToggleSubTask}
        onRemoveSubTask={onRemoveSubTask}
        onUpdateSubTask={onUpdateSubTask}
      />
      </div>
    </div>
  )
}
