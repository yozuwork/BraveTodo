import { useState } from 'react'
import StageSettings from './StageSettings'
import LevelingSettings from './LevelingSettings'

const SETTING_TABS = [
  { key: 'stages', label: '階段設置' },
  { key: 'leveling', label: '升級設定' },
]

export default function CharacterSettings({
  stages,
  onStageName,
  onStageAvatar,
  onStageAvatarReplace,
  onStageAvatarRemove,
  onStageLevel,
  onAddStage,
  onRemoveStage,
  onReorderStages,
  onStageAvatarPosition,
  levelingRules,
  onUpdateExpPerLevel,
}) {
  const [activeSetting, setActiveSetting] = useState('stages')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-black m-0">角色設定</h2>
          <p className="text-xs text-gray-400 m-0 mt-1">管理角色階段與升級規則</p>
        </div>

        <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1">
          {SETTING_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSetting(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeSetting === tab.key
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSetting === 'stages' && (
        <StageSettings
          stages={stages}
          onNameChange={onStageName}
          onAvatarChange={onStageAvatar}
          onReplaceAvatar={onStageAvatarReplace}
          onRemoveAvatar={onStageAvatarRemove}
          onLevelChange={onStageLevel}
          onAddStage={onAddStage}
          onRemoveStage={onRemoveStage}
          onReorderStages={onReorderStages}
          onPositionChange={onStageAvatarPosition}
        />
      )}

      {activeSetting === 'leveling' && (
        <LevelingSettings
          rules={levelingRules}
          onUpdateExpPerLevel={onUpdateExpPerLevel}
        />
      )}
    </div>
  )
}
