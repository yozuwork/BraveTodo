/* eslint-disable react/prop-types */
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import MapCard from './MapCard'

export default function MapTab({
  maps,
  onAdd,
  onUpdate,
  onRemove,
  onCoverChange,
}) {
  const sortedMaps = [...maps].sort((a, b) => (
    (b.createdAt ?? b.id ?? 0) - (a.createdAt ?? a.id ?? 0)
  ))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-black m-0">地圖</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">用卡片收藏世界地圖、區域與探索備註</p>
        </div>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{
            borderColor: '#047857',
            color: '#047857',
            borderRadius: 99,
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'none',
            px: 1.5,
            flexShrink: 0,
            '&:hover': { borderColor: '#065f46', bgcolor: '#ecfdf5' },
          }}
        >
          新增
        </Button>
      </div>

      {sortedMaps.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-lg font-semibold">還沒有地圖</p>
          <p className="text-sm mt-1">新增第一張地圖卡片，開始整理你的世界。</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          {sortedMaps.map((map) => (
            <MapCard
              key={map.id}
              map={map}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onCoverChange={onCoverChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
