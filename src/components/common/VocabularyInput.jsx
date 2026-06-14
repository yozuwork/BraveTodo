import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'

const VocabularyInput = forwardRef(function VocabularyInput({
  value,
  onChange,
  suggestions = [],
  onEnter,
  onEscape,
  onBlur,
  onSelectSuggestion,
  className,
  wrapperClassName = 'relative',
  dropdownClassName = '',
  placeholder,
  type = 'text',
  maxSuggestions = 6,
  ...inputProps
}, forwardedRef) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const composingRef = useRef(false)

  const matches = useMemo(() => {
    const query = value.trim().toLocaleLowerCase()
    if (!query) return []
    return suggestions
      .filter((item) => item && item.toLocaleLowerCase().includes(query) && item !== value.trim())
      .slice(0, maxSuggestions)
  }, [maxSuggestions, suggestions, value])

  useEffect(() => {
    setActiveIndex(0)
    setOpen(matches.length > 0)
  }, [matches.length, value])

  const setRef = (node) => {
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const selectSuggestion = (text) => {
    onChange(text)
    setOpen(false)
    onSelectSuggestion?.(text)
  }

  return (
    <div className={wrapperClassName}>
      <input
        {...inputProps}
        ref={setRef}
        type={type}
        className={className}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(matches.length > 0)}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={() => { composingRef.current = false }}
        onBlur={(e) => {
          setOpen(false)
          onBlur?.(e)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && matches.length > 0) {
            e.preventDefault()
            setOpen(true)
            setActiveIndex((index) => (index + 1) % matches.length)
            return
          }
          if (e.key === 'ArrowUp' && matches.length > 0) {
            e.preventDefault()
            setOpen(true)
            setActiveIndex((index) => (index - 1 + matches.length) % matches.length)
            return
          }
          if (e.key === 'Enter' && !composingRef.current) {
            if (open && matches[activeIndex]) {
              e.preventDefault()
              selectSuggestion(matches[activeIndex])
              return
            }
            onEnter?.(e)
            return
          }
          if (e.key === 'Escape') {
            setOpen(false)
            onEscape?.(e)
          }
        }}
      />
      {open && matches.length > 0 && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+6px)] z-[120] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.12)] ${dropdownClassName}`}
        >
          {matches.map((item, index) => (
            <button
              key={item}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(item)}
              className={`block w-full border-none px-3 py-2 text-left text-sm transition-colors ${
                index === activeIndex
                  ? 'bg-purple-50 text-purple-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default VocabularyInput
