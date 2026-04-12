const ALL_TABS = [
  { key: 'Tasks',       label: '任務' },
  { key: 'HuntMission', label: '討伐任務', huntOnly: true },
  { key: 'Hunt',        label: '討伐' },
  { key: 'Stages',      label: '階段設置',  editOnly: true },
  { key: 'Leveling',    label: '升級設定',  editOnly: true },
  { key: 'Other',       label: '其他',      editOnly: true },
  { key: 'Skills',      label: 'Skills' },
  { key: 'Inbox',       label: '收集箱' },
]

export default function TabNav({ activeTab, onTabChange, isEditMode, hasActiveHunt }) {
  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.editOnly && !isEditMode) return false
    if (t.huntOnly && !hasActiveHunt) return false
    return true
  })

  return (
    <nav className="flex gap-6 border-b-2 border-gray-200 overflow-x-auto">
      {visibleTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`pb-3 uppercase text-sm font-semibold cursor-pointer relative bg-transparent border-none transition-colors whitespace-nowrap flex items-center gap-1.5
            ${activeTab === tab.key
              ? tab.key === 'HuntMission' ? 'text-red-500' : 'text-black'
              : 'text-gray-400 hover:text-gray-600'
            }`}
          style={activeTab === tab.key ? {
            borderBottom: `3px solid ${tab.key === 'HuntMission' ? '#ef4444' : 'black'}`,
            marginBottom: '-2px',
          } : undefined}
        >
          {tab.key === 'HuntMission' && hasActiveHunt && (
            <span
              className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0"
              style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
            />
          )}
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
