import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'

export default function QuestItem({ quest, onToggle, onRemove, onToggleCore }) {
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
      </div>

      <IconButton
        size="small"
        onClick={() => onToggleCore(quest.id)}
        sx={{
          color: quest.isCore ? '#f59e0b' : '#d1d5db',
          '&:hover': { color: '#f59e0b' },
        }}
      >
        {quest.isCore ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>

      <IconButton
        size="small"
        onClick={() => onRemove(quest.id)}
        sx={{ color: '#d1d5db', '&:hover': { color: '#ef4444' } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </div>
  )
}
