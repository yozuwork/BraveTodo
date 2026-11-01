import { useEffect } from 'react'

const IMAGE_INPUT_SELECTOR = 'input[type="file"][accept^="image"]'
const OPEN_MODAL_SELECTOR = '.MuiModal-root:not(.MuiModal-hidden), [data-paste-scope]'

// Ctrl+V 貼上圖片時，找出離滑鼠（或焦點）最近的圖片上傳 input，
// 把圖片塞進去並觸發 change，沿用各元件原本的上傳流程。
export default function useImagePaste() {
  useEffect(() => {
    let pointer = null
    const trackPointer = (event) => {
      pointer = { x: event.clientX, y: event.clientY }
    }

    const findTargetInput = (scope) => {
      const pointed = pointer ? document.elementFromPoint(pointer.x, pointer.y) : null
      const focused = document.activeElement !== document.body ? document.activeElement : null
      const start = [pointed, focused].find((el) => el && scope.contains(el)) ?? scope
      for (let el = start; el; el = el.parentElement) {
        const inputs = el.matches(IMAGE_INPUT_SELECTOR) ? [el] : el.querySelectorAll(IMAGE_INPUT_SELECTOR)
        if (inputs.length === 1) return inputs[0]
        if (inputs.length > 1) return null
        if (el === scope) break
      }
      return null
    }

    const handlePaste = (event) => {
      if (event.defaultPrevented) return
      const items = Array.from(event.clipboardData?.items ?? [])
      const file = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
      if (!file) return

      // 在文字欄位裡貼上同時帶文字的內容（例如從試算表複製）時，維持原本的文字貼上
      const target = event.target
      const isEditable = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))
      if (isEditable && items.some((item) => item.type === 'text/plain')) return

      const modals = document.querySelectorAll(OPEN_MODAL_SELECTOR)
      const scope = modals.length > 0 ? modals[modals.length - 1] : document.body
      const input = findTargetInput(scope)
      if (!input || input.disabled) return

      event.preventDefault()
      const transfer = new DataTransfer()
      transfer.items.add(new File([file], file.name || `pasted-${Date.now()}.png`, { type: file.type }))
      input.files = transfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }

    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('pointerdown', trackPointer, { passive: true })
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('pointermove', trackPointer)
      window.removeEventListener('pointerdown', trackPointer)
      window.removeEventListener('paste', handlePaste)
    }
  }, [])
}
