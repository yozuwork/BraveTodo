export function reorderItems(items, fromId, toId, insertBefore = true) {
  const fromIdx = items.findIndex((item) => item.id === fromId)
  const toIdx = items.findIndex((item) => item.id === toId)
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return items

  const next = [...items]
  const [moved] = next.splice(fromIdx, 1)
  const targetIdx = next.findIndex((item) => item.id === toId)
  next.splice(insertBefore ? targetIdx : targetIdx + 1, 0, moved)
  return next
}
