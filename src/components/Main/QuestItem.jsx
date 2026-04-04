import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Chip from '@mui/material/Chip'

const RARITY_COLORS = {
  common: '#a1a1aa',
  rare: '#60a5fa',
  legendary: '#fb923c',
}

export default function QuestItem({ quest, onToggle, onRemove }) {
  return (
    <div
      className={`bg-white rounded-xl px-5 py-4 flex items-center gap-4 border border-transparent hover:border-gray-200 transition-colors group ${
        quest.completed ? 'opacity-50' : ''
      }`}
    >
      <Checkbox
        checked={quest.completed}
        onChange={() => onToggle(quest.id)}
        sx={{
          color: '#d1d5db',
          '&.Mui-checked': { color: '#a855f7' },
        }}
      />

      <div className="flex-1 flex flex-col gap-1">
        <p
          className={`text-sm font-medium text-black m-0 ${
            quest.completed ? 'line-through text-gray-400' : ''
          }`}
        >
          {quest.text}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
          <span>{quest.exp} EXP</span>
          <Chip
            label={quest.rarity.toUpperCase()}
            size="small"
            sx={{
              bgcolor: RARITY_COLORS[quest.rarity],
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: 700,
              height: 20,
              letterSpacing: '0.05rem',
              textTransform: 'uppercase',
            }}
          />
        </div>
      </div>

      <IconButton
        size="small"
        onClick={() => onRemove(quest.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        sx={{ color: '#d1d5db', '&:hover': { color: '#ef4444' } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </div>
  )
}
