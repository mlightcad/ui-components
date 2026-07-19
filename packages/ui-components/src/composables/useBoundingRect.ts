import { computed, onMounted, onUnmounted, Ref, ref, watch } from 'vue'

import { DockSide, WIDTH_OF_TITLE_BAR } from './types'
import { useAutoOpen } from './useAutoOpen'
import { DragOptions } from './useDrag'
import { useDragEx } from './useDragEx'
import { useLastPosAndSize } from './useLastPosAndSize'
import { useLeftPosAndWidth } from './useLeftPosAndWidth'
import { HorizontalDockEdge, useResize } from './useResize'
import { useTransition } from './useTransition'

interface SizeSnapshot {
  width: number
  height: number
}

interface RectSnapshot {
  left: number | null | undefined
  top: number | null | undefined
  width: number
  height: number
}

/**
 * Get the bounding rect of the tool palette.
 * - If it is the first time to show the tool palette, return the initial size and position from CSS
 * - Otherwise, return the size and postion after resized
 * @param toolPaletteRef Input the tool palette element to get its bounding rect
 * @param titleBarRef Input the title bar element of the tool palette
 * @param collapsed Input flag to indicate whether the tool palette is collapsed
 * @param dragOptions Input dragging options
 * @returns Return the following data.
 * - rect: the bounding rect of the tool palette
 * - orientation: the orientation of the tool palette
 * - reversed: flag whether to reverse cllapse icon
 * - dockSide: current dock side including float
 * - setDockSide: programmatically change dock side and apply layout
 */
export function useBoundingRect(
  toolPaletteRef: Ref<HTMLElement | null>,
  titleBarRef: Ref<HTMLElement | null>,
  collapsed: Ref<boolean>,
  dragOptions: Ref<DragOptions>
) {
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)

  // Filled in after useResize; useDrag consults this to avoid move-vs-resize conflict.
  let isOnResizeEdge: (event: MouseEvent) => boolean = () => false

  const dragOptionsWithResizeGuard = computed<DragOptions>(() => ({
    offset: dragOptions.value.offset,
    canStartDrag: (event: MouseEvent) => {
      if (isOnResizeEdge(event)) return false
      return dragOptions.value.canStartDrag?.(event) !== false
    }
  }))
  const {
    docked,
    orientation,
    dockSide,
    setDockSide: setDockSideInternal,
    movement,
    position,
    isDragging
  } = useDragEx(toolPaletteRef, titleBarRef, dragOptionsWithResizeGuard)
  // Flag to reverse cllapse icon (right-docked only)
  const reversed = computed(() => {
    return orientation.value === 'right'
  })
  const horizontalDock = computed<HorizontalDockEdge>(() => {
    if (!docked.value) return null
    if (orientation.value === 'top' || orientation.value === 'bottom') {
      return orientation.value
    }
    return null
  })
  const isHorizontalDocked = computed(() => horizontalDock.value != null)

  /**
   * Size (and optional float position) captured when entering a dock from
   * floating. Restored on undock so left/right/top/bottom all remember
   * pre-dock width/height.
   */
  const preDockSnapshot = ref<RectSnapshot | null>(null)

  const { rect, isResizing, isOnResizeEdge: checkResizeEdge } = useResize(
    toolPaletteRef,
    collapsed,
    reversed,
    dragOptions.value.offset,
    { width: 20, height: 40 },
    horizontalDock,
    {
      onResizeEnd: ({ height }) => {
        // Persist height chosen while top/bottom docked for later undock / side switch.
        if (
          preDockSnapshot.value &&
          (orientation.value === 'top' || orientation.value === 'bottom')
        ) {
          preDockSnapshot.value = {
            ...preDockSnapshot.value,
            height
          }
        }
      }
    }
  )
  isOnResizeEdge = checkResizeEdge
  const { width: toolPaletteWidth, left: toolPaletteLeft } = useLeftPosAndWidth(
    rect,
    isResizing,
    position,
    isDragging
  )
  const { lastTop, lastHeight } = useLastPosAndSize(
    computed(() => rect.value.left),
    computed(() => rect.value.top),
    computed(() => rect.value.width),
    computed(() => rect.value.height)
  )

  // Skip watch(docked) when layout is applied by setDockSide (menu).
  let applyDockLayoutFromMenu = false

  const { autoOpened } = useAutoOpen(toolPaletteRef, titleBarRef, collapsed)
  useTransition(
    toolPaletteRef,
    reversed,
    collapsed,
    autoOpened,
    isHorizontalDocked
  )

  const availableWidth = () => {
    const offset = dragOptions.value.offset.value
    return window.innerWidth - offset.left - offset.right
  }

  const availableHeight = () => {
    const offset = dragOptions.value.offset.value
    return window.innerHeight - offset.top - offset.bottom
  }

  /** Read the current palette size before docking stretches it. */
  const measureCurrentSize = (): SizeSnapshot => {
    const dom = toolPaletteRef.value?.getBoundingClientRect()
    const width =
      rect.value.width ??
      toolPaletteWidth.value ??
      (dom && dom.width > 0 ? dom.width : null) ??
      300
    const height =
      rect.value.height ??
      (dom && dom.height > 0 ? dom.height : null) ??
      lastHeight.value ??
      300
    return { width, height }
  }

  const STRETCH_EPS_PX = 2

  /** True when size matches a docked stretch (full width and/or full height). */
  const looksLikeDockedSize = (size: SizeSnapshot) => {
    const fullWidth = Math.abs(size.width - availableWidth()) <= STRETCH_EPS_PX
    const fullHeight = Math.abs(size.height - availableHeight()) <= STRETCH_EPS_PX
    return fullWidth || fullHeight
  }

  /**
   * Natural (floating) size used when applying any dock layout.
   * Always prefer the pre-dock snapshot so top↔bottom / left↔right switches
   * never adopt a stretched width/height.
   */
  const floatingSize = (): SizeSnapshot => {
    const snap = preDockSnapshot.value
    if (snap) {
      return { width: snap.width, height: snap.height }
    }
    return measureCurrentSize()
  }

  /**
   * Capture floating geometry when leaving float. Ignore measurements that
   * already look docked-stretched so a top→bottom (or redock) switch cannot
   * overwrite the snapshot with full available width/height.
   */
  const capturePreDockSnapshot = () => {
    const size = measureCurrentSize()
    if (preDockSnapshot.value && looksLikeDockedSize(size)) {
      return
    }
    preDockSnapshot.value = {
      left: rect.value.left,
      top: rect.value.top,
      width: size.width,
      height: size.height
    }
  }

  /**
   * Restore width/height from the pre-dock snapshot.
   * When `restorePosition` is true (menu undock), also restore left/top.
   * When false (drag away from edge), keep the current drag position.
   */
  const restorePreDockSize = (restorePosition: boolean) => {
    const snap = preDockSnapshot.value
    if (snap) {
      rect.value.width = snap.width
      rect.value.height = snap.height
      if (restorePosition) {
        if (snap.left != null) rect.value.left = snap.left
        if (snap.top != null) rect.value.top = snap.top
      }
      return
    }
    // Fallback for legacy drag-dock path without a snapshot.
    if (lastHeight.value != null) rect.value.height = lastHeight.value
    if (lastTop.value != null && restorePosition) {
      rect.value.top = lastTop.value
    }
  }

  /**
   * Apply top/bottom dock geometry after drag-to-dock (full width, keep height).
   */
  const applyHorizontalDockFromDrag = () => {
    const offset = dragOptions.value.offset.value
    const { height: floatHeight } = floatingSize()
    const height = Math.min(floatHeight, availableHeight())
    rect.value.height = height
    rect.value.left = offset.left
    rect.value.width = availableWidth()
    rect.value.top =
      orientation.value === 'top'
        ? offset.top
        : window.innerHeight - height - offset.bottom
  }

  /**
   * Drag-to-dock layout:
   * - left/right → full available height
   * - top/bottom → full available width (keep panel height)
   * Undock restores pre-dock width/height at the current drag position.
   */
  const applyDragDockLayout = () => {
    const offset = dragOptions.value.offset.value
    if (!docked.value) {
      restorePreDockSize(false)
      return
    }
    if (orientation.value === 'top' || orientation.value === 'bottom') {
      applyHorizontalDockFromDrag()
      return
    }
    // Keep floating width while stretching height.
    const { width: floatWidth } = floatingSize()
    rect.value.width = floatWidth
    rect.value.top = offset.top
    rect.value.height = availableHeight()
  }

  /**
   * Full layout used by the Dock side menu (float / left / right / top / bottom).
   */
  const applyDockLayout = () => {
    const offset = dragOptions.value.offset.value
    if (!docked.value) {
      restorePreDockSize(true)
      return
    }

    const { width: floatWidth, height: floatHeight } = floatingSize()

    if (orientation.value === 'top' || orientation.value === 'bottom') {
      const height = Math.min(floatHeight, availableHeight())
      rect.value.height = height
      rect.value.left = offset.left
      rect.value.width = availableWidth()
      rect.value.top =
        orientation.value === 'top'
          ? offset.top
          : window.innerHeight - height - offset.bottom
      return
    }

    // left / right side dock from menu: snap to edge + full height
    rect.value.top = offset.top
    rect.value.height = availableHeight()
    rect.value.width = floatWidth
    if (orientation.value === 'right') {
      rect.value.left = window.innerWidth - floatWidth - offset.right
    } else {
      rect.value.left = offset.left
    }
  }

  const isSideDock = (side: DockSide) => side === 'left' || side === 'right'
  const isHorizontalDockSide = (side: DockSide) =>
    side === 'top' || side === 'bottom'

  const setDockSide = (side: DockSide) => {
    const prevSide = dockSide.value
    const wasFloating = !docked.value

    // Remember floating geometry only when leaving float for a dock side.
    if (side !== 'float' && wasFloating) {
      capturePreDockSnapshot()
    }

    const { width: floatWidth, height: floatHeight } = floatingSize()

    // Entering a horizontal dock (including top↔bottom): always use float height.
    if (isHorizontalDockSide(side)) {
      rect.value.height = floatHeight
    }
    // Entering a side dock (including from top/bottom): always use float width.
    if (isSideDock(side)) {
      rect.value.width = floatWidth
    }

    // Keep intermediate rect sane when switching orientation families.
    if (isHorizontalDockSide(side) && isSideDock(prevSide)) {
      rect.value.height = floatHeight
    }
    if (isSideDock(side) && isHorizontalDockSide(prevSide)) {
      rect.value.width = floatWidth
    }

    applyDockLayoutFromMenu = true
    setDockSideInternal(side)
    applyDockLayout()
    applyDockLayoutFromMenu = false
  }

  // Modify the position of this tool palette according to current orientation
  const setTargetPos = (xDelta: number) => {
    if (!toolPaletteRef.value) return
    const temp = toolPaletteRef.value.getBoundingClientRect()
    const offset = dragOptions.value.offset.value

    if (docked.value && orientation.value === 'bottom') {
      rect.value.left = offset.left
      rect.value.width = availableWidth()
      const height = rect.value.height ?? temp.height
      rect.value.top = window.innerHeight - height - offset.bottom
      return
    }

    if (docked.value && orientation.value === 'top') {
      rect.value.left = offset.left
      rect.value.width = availableWidth()
      rect.value.top = offset.top
      return
    }

    const tempLeft = temp.left + xDelta
    if (reversed.value) {
      rect.value.left = tempLeft

      const rightOffset = window.innerWidth - temp.width - temp.left
      if (temp.left <= 0 && rightOffset >= 0 && xDelta < 0) {
        rect.value.left = Math.max(0, tempLeft)
      }

      if (window.innerWidth - temp.width <= 0) {
        rect.value.left = window.innerWidth - temp.width
      }
    } else {
      if (temp.left + temp.width >= window.innerWidth && xDelta < 0) {
        rect.value.left = Math.max(0, tempLeft)
      }
    }

    if (
      docked.value &&
      (orientation.value === 'left' || orientation.value === 'right')
    ) {
      rect.value.top = offset.top
      rect.value.height = availableHeight()
    }
  }

  const updateWindowSize = () => {
    const xDelta = window.innerWidth - windowWidth.value
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
    setTargetPos(xDelta)
  }

  onMounted(() => {
    window.addEventListener('resize', updateWindowSize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWindowSize)
  })

  const setCollapsedSize = (shrink: boolean) => {
    const offset = dragOptions.value.offset.value

    if (docked.value && orientation.value === 'bottom') {
      if (shrink) {
        const currentHeight = rect.value.height ?? lastHeight.value ?? 300
        if (currentHeight > WIDTH_OF_TITLE_BAR) {
          rect.value.height = WIDTH_OF_TITLE_BAR
          rect.value.top =
            window.innerHeight - WIDTH_OF_TITLE_BAR - offset.bottom
        }
      } else {
        const height =
          preDockSnapshot.value?.height ?? lastHeight.value ?? 300
        rect.value.height = height
        rect.value.top = window.innerHeight - height - offset.bottom
      }
      return
    }

    if (docked.value && orientation.value === 'top') {
      if (shrink) {
        const currentHeight = rect.value.height ?? lastHeight.value ?? 300
        if (currentHeight > WIDTH_OF_TITLE_BAR) {
          rect.value.height = WIDTH_OF_TITLE_BAR
          rect.value.top = offset.top
        }
      } else {
        const height =
          preDockSnapshot.value?.height ?? lastHeight.value ?? 300
        rect.value.height = height
        rect.value.top = offset.top
      }
      return
    }

    if (shrink) {
      rect.value.width = WIDTH_OF_TITLE_BAR
      if (reversed.value && toolPaletteLeft.value && toolPaletteWidth.value) {
        rect.value.left =
          toolPaletteLeft.value + toolPaletteWidth.value - WIDTH_OF_TITLE_BAR
      }
    } else {
      rect.value.width = toolPaletteWidth.value
      if (reversed.value && toolPaletteLeft.value && toolPaletteWidth.value) {
        rect.value.left = toolPaletteLeft.value
      }
    }
  }

  watch(docked, (isDocked, wasDocked) => {
    if (applyDockLayoutFromMenu) return

    // Drag-to-dock: snapshot size before stretching (any edge).
    if (isDocked && !wasDocked) {
      capturePreDockSnapshot()
    }
    applyDragDockLayout()
  })

  // When drag re-snaps between edges after undock, orientation may change
  // while already docked (left↔right). Top/bottom use dedicated undock path.
  watch(orientation, (side, prev) => {
    if (applyDockLayoutFromMenu || !docked.value || side === prev) return
    if (side === 'left' || side === 'right') {
      applyDragDockLayout()
    }
  })

  // Watch collapsed state. If it is collapsed, store the old width in order to reuse it when expanding the tool palette
  watch(collapsed, newVal => {
    setCollapsedSize(newVal)
  })

  watch(autoOpened, newVal => {
    // `autoOpened` takes effect only if `collapsed` is true.
    if (collapsed.value && !isDragging.value) {
      setCollapsedSize(!newVal)
    }
  })

  watch(movement, newVal => {
    if (!newVal || !toolPaletteRef.value) return

    // Top/bottom dock layout owns left/top/width — don't clobber from drag.
    if (
      docked.value &&
      (orientation.value === 'top' || orientation.value === 'bottom')
    ) {
      return
    }

    const element = toolPaletteRef.value as HTMLElement
    const temp = element.getBoundingClientRect()
    rect.value.left = temp.left
    // Side-docked: keep top from applyDragDockLayout; only follow left.
    if (
      !(
        docked.value &&
        (orientation.value === 'left' || orientation.value === 'right')
      )
    ) {
      rect.value.top = temp.top
    }
  })

  return { rect, orientation, reversed, dockSide, setDockSide }
}
