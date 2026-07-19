const TAB_ICON_PATHS = {
  Tasks: 'M12 4v58M12 8h42l-8 12 8 12H12',
  Hunt: 'M12 8h40M12 66h40M19 8c0 22 26 22 26 29S19 44 19 66M45 8c0 22-26 22-26 29s26 7 26 29',
  RewardShop: 'M6 28h52v38H6zM2 28h60M12 18h40M32 18v48',
  Story: 'M10 14h42v52H10zM19 26h24M19 38h24M19 50h18',
  Npc: 'M32 27a13 13 0 1 0 0.001 0zM8 66c4-18 44-18 48 0',
  Map: 'M2 18l20-8 20 8 20-8v50l-20 8-20-8-20 8zM22 10v50M42 18v50',
  Skills: 'M32 8l8 18 20 2-15 14 5 20-18-10-18 10 5-20-15-14 20-2z',
  Inbox: 'M2 25h60v41H2zM10 15h44l8 10H2zM24 39h16',
}

export function TabGlyph({ tab, className = '', ...rest }) {
  const d = TAB_ICON_PATHS[tab]
  if (!d) return null
  return (
    <svg viewBox="0 0 64 76" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d={d} />
    </svg>
  )
}

const STAT_ICON_PATHS = {
  hp: 'M12 21s-8-5.2-8-11.7C4 5.4 7 3 10 3c1.7 0 3.3.9 4 2.3C14.7 3.9 16.3 3 18 3c3 0 6 2.4 6 6.3C24 15.8 12 21 12 21z',
  atk: 'M4 4L20 20M20 4L4 20M15 19L19 15M5 15L9 19',
  def: 'M12 3l8 3v6c0 5-3.4 8.6-8 9.9C7.4 20.6 4 17 4 12V6z',
  spd: 'M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z',
  weapon: 'M5 19L19 5M3 21l3-3M8 18l-3 3M19 5l2-2',
}

export function StatGlyph({ stat, className = '', ...rest }) {
  const d = STAT_ICON_PATHS[stat]
  if (!d) return null
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d={d} />
    </svg>
  )
}
