import { computed, Ref, ref, watch } from 'vue'

import { DockSide, Orientation } from './types'
import { DragOptions, useDrag } from './useDrag'

/**
 * Slack so clamp-to-edge still counts as docked when getBoundingClientRect
 * and the drag clamp differ by a sub-pixel / border-box amount. Keep this
 * small so a palette sitting a few px inside an inset does not false-dock.
 */
const DOCK_EDGE_EPSILON_PX = 2

/**
 * One extension to `useDrag` to support docking and orientation
 * @param targetRef Input element to drag
 * @param dragElementRef If it isn't null, `targetRef` can be dragged only if
 * start dragging from this element.
 * @param options Input dragging options to customize dragging behaviors
 * @returns Return thefollowing data
 * - isDragging: flag to indicate whether the element is in dragging state
 * - docked: flag to indicate whether the tool palette is docked on an edge
 * - orientation: The orientation of the element when docked
 * - dockSide: combined dock side including float
 * - setDockSide: programmatically change dock side
 * - movement: movement based on the original position of the element
 * - position: new left and top position of the element after dragged
 */
export function useDragEx(
  targetRef: Ref<HTMLElement | null>,
  dragElementRef: Ref<HTMLElement | null>,
  options: Ref<DragOptions>
) {
  const docked = ref<boolean>(false)
  const orientation = ref<Orientation>('left')
  const { isDragging, movement, position } = useDrag(
    targetRef,
    dragElementRef,
    options
  )

  const dockSide = computed<DockSide>(() =>
    docked.value ? orientation.value : 'float'
  )

  /**
   * Programmatically set dock side without requiring a drag.
   */
  const setDockSide = (side: DockSide) => {
    if (side === 'float') {
      docked.value = false
      return
    }
    orientation.value = side
    docked.value = true
  }

  const isHorizontal = (side: Orientation) =>
    side === 'top' || side === 'bottom'

  const isVertical = (side: Orientation) =>
    side === 'left' || side === 'right'

  /**
   * While top/bottom docked, only allow undock by leaving that edge.
   * Skip left/right checks — a full-width panel is always near both sides.
   */
  const updateHorizontalDockFromDrag = () => {
    if (!targetRef.value) return
    const rect = targetRef.value.getBoundingClientRect()
    const topInset = options.value.offset.value.top
    const bottomInset = options.value.offset.value.bottom
    const top = position.value?.y ?? rect.top
    const height = rect.height
    const minTop = topInset
    const maxTop = window.innerHeight - height - bottomInset

    if (orientation.value === 'top') {
      if (top - minTop > DOCK_EDGE_EPSILON_PX) {
        docked.value = false
      }
      return
    }

    if (orientation.value === 'bottom') {
      if (maxTop - top > DOCK_EDGE_EPSILON_PX) {
        docked.value = false
      }
    }
  }

  /**
   * While left/right docked, only evaluate left/right edges.
   * Skip top/bottom — a full-height panel is always near both.
   */
  const updateVerticalDockFromDrag = () => {
    if (!targetRef.value) return
    const rect = targetRef.value.getBoundingClientRect()
    const leftInset = options.value.offset.value.left
    const rightInset = options.value.offset.value.right
    const left = position.value?.x ?? rect.left
    const width = rect.width
    const minLeft = leftInset
    const maxLeft = window.innerWidth - width - rightInset
    const distLeft = left - minLeft
    const distRight = maxLeft - left
    const nearLeft = distLeft <= DOCK_EDGE_EPSILON_PX
    const nearRight = distRight <= DOCK_EDGE_EPSILON_PX

    if (nearLeft && nearRight) {
      orientation.value =
        Math.abs(distRight) < Math.abs(distLeft) ? 'right' : 'left'
      docked.value = true
    } else if (nearLeft) {
      orientation.value = 'left'
      docked.value = true
    } else if (nearRight) {
      orientation.value = 'right'
      docked.value = true
    } else {
      docked.value = false
    }
  }

  /**
   * While floating, snap to the nearest window edge (left/right/top/bottom).
   *
   * If the panel is already full-width (near left AND right), ignore side
   * edges so an undock-from-top/bottom cannot immediately re-dock left/right
   * and stretch to fill the entire parent. Same for full-height vs top/bottom.
   */
  const updateFloatingDockFromDrag = () => {
    if (!targetRef.value) return
    const rect = targetRef.value.getBoundingClientRect()
    const leftInset = options.value.offset.value.left
    const rightInset = options.value.offset.value.right
    const topInset = options.value.offset.value.top
    const bottomInset = options.value.offset.value.bottom

    const left = position.value?.x ?? rect.left
    const top = position.value?.y ?? rect.top
    const width = rect.width
    const height = rect.height

    const minLeft = leftInset
    const maxLeft = window.innerWidth - width - rightInset
    const minTop = topInset
    const maxTop = window.innerHeight - height - bottomInset

    const distLeft = left - minLeft
    const distRight = maxLeft - left
    const distTop = top - minTop
    const distBottom = maxTop - top

    const nearLeft = distLeft <= DOCK_EDGE_EPSILON_PX
    const nearRight = distRight <= DOCK_EDGE_EPSILON_PX
    const nearTop = distTop <= DOCK_EDGE_EPSILON_PX
    const nearBottom = distBottom <= DOCK_EDGE_EPSILON_PX

    const fullWidth = nearLeft && nearRight
    const fullHeight = nearTop && nearBottom

    const candidates: { side: Orientation; dist: number }[] = []
    if (!fullWidth) {
      if (nearLeft) {
        candidates.push({ side: 'left', dist: Math.abs(distLeft) })
      }
      if (nearRight) {
        candidates.push({ side: 'right', dist: Math.abs(distRight) })
      }
    }
    if (!fullHeight) {
      if (nearTop) {
        candidates.push({ side: 'top', dist: Math.abs(distTop) })
      }
      if (nearBottom) {
        candidates.push({ side: 'bottom', dist: Math.abs(distBottom) })
      }
    }

    if (candidates.length === 0) {
      docked.value = false
      return
    }

    candidates.sort((a, b) => a.dist - b.dist)
    orientation.value = candidates[0].side
    docked.value = true
  }

  watch(movement, newVal => {
    if (!newVal || !targetRef.value) return

    if (docked.value && isHorizontal(orientation.value)) {
      updateHorizontalDockFromDrag()
      return
    }

    if (docked.value && isVertical(orientation.value)) {
      updateVerticalDockFromDrag()
      return
    }

    updateFloatingDockFromDrag()
  })

  return {
    docked,
    orientation,
    dockSide,
    setDockSide,
    isDragging,
    movement,
    position
  }
}
