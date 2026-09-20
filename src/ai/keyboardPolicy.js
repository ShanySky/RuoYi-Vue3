const AI_OVERLAY_SELECTORS = [
  '.ai-model-picker-popper',
  '.el-select-dropdown',
  '.ai-remote-model-dialog',
  '.el-message-box'
]

export function shouldSubmitComposer(event, sendShortcut = 'enter') {
  if (event?.key !== 'Enter' || event?.isComposing || event?.shiftKey) return false
  if (sendShortcut === 'ctrl-enter') return !!(event.ctrlKey || event.metaKey)
  return !event.ctrlKey && !event.metaKey
}

export function isVisibleAiElement(element, getStyle = globalThis.getComputedStyle) {
  if (!element || typeof getStyle !== 'function') return false
  const style = getStyle(element)
  const rect = element.getBoundingClientRect()
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
}

export function hasVisibleAiOverlay(documentRef = globalThis.document, getStyle = globalThis.getComputedStyle) {
  if (!documentRef?.querySelectorAll) return false
  return AI_OVERLAY_SELECTORS.some(selector =>
    [...documentRef.querySelectorAll(selector)].some(element => isVisibleAiElement(element, getStyle))
  )
}

export function isAiFocusActive(panelElement, documentRef = globalThis.document) {
  const active = documentRef?.activeElement
  if (!active) return false
  if (panelElement?.contains?.(active)) return true
  if (typeof Element === 'undefined' || !(active instanceof Element)) return false
  return !!active.closest(AI_OVERLAY_SELECTORS.join(', '))
}

export function createAiKeyboardController({
  getBusy,
  getDoubleEscEnabled,
  isFocusActive,
  hasVisibleOverlay,
  closeModelPicker,
  onSend,
  onStop,
  onArmedChange = () => {},
  now = () => Date.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = timer => clearTimeout(timer)
}) {
  let armed = false
  let armedAt = 0
  let timer = null

  function publishArmed(value) {
    armed = value
    onArmedChange(value)
  }

  function resetEscSequence() {
    publishArmed(false)
    armedAt = 0
    if (timer) {
      clearTimer(timer)
      timer = null
    }
  }

  function handleComposerKeydown(event, sendShortcut) {
    if (!shouldSubmitComposer(event, sendShortcut)) return false
    event.preventDefault?.()
    onSend?.()
    return true
  }

  function handleGlobalKeydown(event) {
    if (event?.key !== 'Escape' || event?.isComposing || !getBusy?.() || !getDoubleEscEnabled?.()) return false
    if (!isFocusActive?.()) return false

    if (closeModelPicker?.()) {
      event.preventDefault?.()
      event.stopPropagation?.()
      resetEscSequence()
      return true
    }

    if (hasVisibleOverlay?.()) {
      resetEscSequence()
      return false
    }

    const current = now()
    if (armed && current - armedAt <= 700) {
      event.preventDefault?.()
      resetEscSequence()
      onStop?.('DOUBLE_ESC')
      return true
    }

    publishArmed(true)
    armedAt = current
    if (timer) clearTimer(timer)
    timer = setTimer(resetEscSequence, 720)
    return true
  }

  return {
    handleComposerKeydown,
    handleGlobalKeydown,
    resetEscSequence,
    isEscArmed: () => armed
  }
}
