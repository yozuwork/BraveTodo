import { useState } from 'react'

const TABS = ['Tasks', 'Stages', 'Skills']

export default function TabNav() {
  const [active, setActive] = useState('Tasks')

  return (
    <nav className="flex gap-8 border-b-2 border-gray-200">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActive(tab)}
          className={`pb-3 uppercase text-sm font-semibold cursor-pointer relative bg-transparent border-none transition-colors
            ${active === tab
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
            }`}
          style={active === tab ? {
            borderBottom: '3px solid black',
            marginBottom: '-2px',
          } : undefined}
        >
          {tab}
        </button>
      ))}
    </nav>
  )
}
