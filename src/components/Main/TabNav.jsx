const ALL_TABS = [
  { key: 'Tasks', label: '任務' },
  { key: 'Stages', label: '階段設置', editOnly: true },
  { key: 'Skills', label: 'Skills' },
]

export default function TabNav({ activeTab, onTabChange, isEditMode }) {
  const visibleTabs = isEditMode
    ? ALL_TABS
    : ALL_TABS.filter((t) => !t.editOnly)

  return (
    <nav className="flex gap-8 border-b-2 border-gray-200">
      {visibleTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`pb-3 uppercase text-sm font-semibold cursor-pointer relative bg-transparent border-none transition-colors
            ${activeTab === tab.key
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
            }`}
          style={activeTab === tab.key ? {
            borderBottom: '3px solid black',
            marginBottom: '-2px',
          } : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
