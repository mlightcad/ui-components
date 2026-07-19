import { onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue'

import { Offset, Orientation } from './types'
import { useInitialRect } from './useInitialRect'

export type HorizontalDockEdge = Extract<Orientation, 'top' | 'bottom'> | null

export interface ResizeOptions {
  /** Called after a resize gesture ends. */
  onResizeEnd?: (size: { width: number; height: number }) => void
}

/**
 * Resize the specified element when moving mouse to its
 * - right border, bottom border, and right-bottom corner if argument `reverse` is false
 * - or left border, bottom border, and left-bottom corner if argument `reverse` is true
 * - when bottom-docked: top border (keep bottom edge fixed)
 * - when top-docked: bottom border (keep top edge fixed)
 */
export function useResize(
  targetRef: Ref<HTMLElement | null>,
  collapsed: Ref<boolean> = ref(false),
  reverse: Ref<boolean> = ref(false),
  offset: Ref<Offset> = ref({ left: 0, right: 0, top: 0, bottom: 0 }),
  minSize: { width: number; height: number } = { width: 20, height: 40 },
  horizontalDock: Ref<HorizontalDockEdge> = ref(null),
  resizeOptions: ResizeOptions = {}
) {
  const { initialRect: resizedBoundingRect } = useInitialRect(targetRef, offset)
  const isResizing = ref(false)
  let initialLeft = 0
  let initialTop = 0
  let initialWidth = 0
  let initialHeight = 0
  let startX = 0
  let startY = 0
  /** Side / corner hit size. Slightly larger for top/bottom dock title-bar edge. */
  const sideThreshold = 5
  const horizontalDockThreshold = 8
  const resizeDirection = ref<
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'right-bottom-corner'
    | 'left-bottom-corner'
    | null
  >(null)

  const clearCursor = () => {
    if (targetRef.value) {
      targetRef.value.style.cursor = ''
    }
  }

  const setNsResizeCursor = () => {
    if (targetRef.value) {
      targetRef.value.style.cursor = 'ns-resize'
    }
  }

  const updateHoverResizeState = (event: MouseEvent) => {
    if (!targetRef.value || collapsed.value) return

    const rect = targetRef.value.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    const threshold =
      horizontalDock.value != null ? horizontalDockThreshold : sideThreshold

    const nearLeft = Math.abs(offsetX) <= threshold
    const nearRight = Math.abs(rect.width - offsetX) <= threshold
    const nearTop = Math.abs(offsetY) <= threshold
    const nearBottom = Math.abs(rect.height - offsetY) <= threshold

    if (horizontalDock.value === 'bottom') {
      // Bottom-docked: resize from the top edge of the title bar.
      if (nearTop) {
        setNsResizeCursor()
        resizeDirection.value = 'top'
      } else {
        clearCursor()
        resizeDirection.value = null
      }
      return
    }

    if (horizontalDock.value === 'top') {
      // Top-docked: resize from the bottom edge of the palette.
      if (nearBottom) {
        setNsResizeCursor()
        resizeDirection.value = 'bottom'
      } else {
        clearCursor()
        resizeDirection.value = null
      }
      return
    }

    if (nearLeft && nearBottom && reverse.value) {
      targetRef.value.style.cursor = 'nesw-resize'
      resizeDirection.value = 'left-bottom-corner'
    } else if (nearRight && nearBottom && !reverse.value) {
      targetRef.value.style.cursor = 'nwse-resize'
      resizeDirection.value = 'right-bottom-corner'
    } else if (nearLeft && reverse.value) {
      targetRef.value.style.cursor = 'ew-resize'
      resizeDirection.value = 'left'
    } else if (nearRight && !reverse.value) {
      targetRef.value.style.cursor = 'ew-resize'
      resizeDirection.value = 'right'
    } else if (nearBottom) {
      targetRef.value.style.cursor = 'ns-resize'
      resizeDirection.value = 'bottom'
    } else {
      clearCursor()
      resizeDirection.value = null
    }
  }

  const onMouseMove = (event: MouseEvent) => {
    if (!targetRef.value || collapsed.value) return

    if (!isResizing.value) {
      updateHoverResizeState(event)
      return
    }

    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY
    const maxHeight =
      window.innerHeight - offset.value.top - offset.value.bottom

    if (resizeDirection.value === 'top') {
      // Keep bottom edge fixed (bottom-docked height resize).
      let newHeight = initialHeight - deltaY
      newHeight = Math.min(Math.max(newHeight, minSize.height), maxHeight)
      const bottom = initialTop + initialHeight
      resizedBoundingRect.value.height = newHeight
      resizedBoundingRect.value.top = bottom - newHeight
      targetRef.value.style.top = resizedBoundingRect.value.top + 'px'
      targetRef.value.style.height = resizedBoundingRect.value.height + 'px'
      return
    }

    if (
      resizeDirection.value === 'left' ||
      resizeDirection.value === 'left-bottom-corner'
    ) {
      const newWidth = initialWidth - deltaX
      if (newWidth > minSize.width) {
        resizedBoundingRect.value.width = newWidth
        resizedBoundingRect.value.left = initialLeft + deltaX
        targetRef.value.style.left = resizedBoundingRect.value.left + 'px'
        targetRef.value.style.width = resizedBoundingRect.value.width + 'px'
      }
    }
    if (
      resizeDirection.value === 'right' ||
      resizeDirection.value === 'right-bottom-corner'
    ) {
      const newWidth = initialWidth + deltaX
      if (newWidth > minSize.width) {
        resizedBoundingRect.value.width = newWidth
        targetRef.value.style.width = resizedBoundingRect.value.width + 'px'
      }
    }
    if (
      resizeDirection.value === 'bottom' ||
      resizeDirection.value === 'left-bottom-corner' ||
      resizeDirection.value === 'right-bottom-corner'
    ) {
      let newHeight = initialHeight + deltaY
      if (horizontalDock.value === 'top') {
        newHeight = Math.min(Math.max(newHeight, minSize.height), maxHeight)
      }
      if (newHeight > minSize.height) {
        resizedBoundingRect.value.height = newHeight
        targetRef.value.style.height = resizedBoundingRect.value.height + 'px'
      }
    }
  }

  const onMouseDown = (event: MouseEvent) => {
    if (!targetRef.value || collapsed.value) return

    // Refresh hit-test in case mousemove did not run over a child first.
    updateHoverResizeState(event)
    if (!resizeDirection.value) return

    // Win over title-bar drag (useDrag) registered on the same element.
    event.preventDefault()
    event.stopImmediatePropagation()

    const rect = targetRef.value.getBoundingClientRect()
    startX = event.clientX
    startY = event.clientY

    initialWidth = rect.width
    initialHeight = rect.height
    initialLeft = rect.left
    initialTop = rect.top

    resizedBoundingRect.value.width = initialWidth
    resizedBoundingRect.value.height = initialHeight
    resizedBoundingRect.value.left = rect.left
    resizedBoundingRect.value.top = rect.top

    isResizing.value = true

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const onMouseUp = () => {
    if (isResizing.value) {
      const width = resizedBoundingRect.value.width
      const height = resizedBoundingRect.value.height
      if (width != null && height != null) {
        resizeOptions.onResizeEnd?.({ width, height })
      }
    }

    isResizing.value = false
    resizeDirection.value = null
    clearCursor()

    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  const cleanupListeners = () => {
    if (targetRef.value) {
      targetRef.value.removeEventListener('mousedown', onMouseDown, true)
      targetRef.value.removeEventListener('mousemove', onMouseMove)
    }
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  const setupListeners = () => {
    if (targetRef.value) {
      // Capture phase so resize starts before useDrag on the title bar.
      targetRef.value.addEventListener('mousedown', onMouseDown, true)
      targetRef.value.addEventListener('mousemove', onMouseMove)
    }
  }

  onMounted(() => {
    if (targetRef.value) {
      setupListeners()
    }
  })

  onBeforeUnmount(() => {
    cleanupListeners()
  })

  watch(targetRef, newVal => {
    if (newVal) {
      setupListeners()
    } else {
      cleanupListeners()
    }
  })

  /**
   * Whether a pointer event is on the active horizontal-dock resize edge.
   * Used by useDrag to avoid starting a move when the user intends to resize.
   */
  const isOnResizeEdge = (event: MouseEvent) => {
    if (!targetRef.value || collapsed.value || !horizontalDock.value) {
      return false
    }
    const rect = targetRef.value.getBoundingClientRect()
    if (horizontalDock.value === 'bottom') {
      return event.clientY - rect.top <= horizontalDockThreshold
    }
    if (horizontalDock.value === 'top') {
      return rect.bottom - event.clientY <= horizontalDockThreshold
    }
    return false
  }

  return { rect: resizedBoundingRect, isResizing, isOnResizeEdge }
}
