<template>
  <!-- Main tool palette container -->
  <div
    ref="toolPaletteElement"
    :style="[resizedStyle]"
    class="ml-tool-palette-dialog"
    v-if="visible"
    :class="{
      'ml-tool-palette-disabled': disabled,
      'is-horizontal-docked': isHorizontalDocked
    }"
  >
    <!-- Bottom edge resize when top-docked (title bar is on top) -->
    <div
      v-if="currentDockSide === 'top'"
      class="ml-tool-palette-edge-resize ml-tool-palette-edge-resize--bottom"
    />
    <!-- Layout container for title bar and content -->
    <div class="ml-tool-palette-dialog-layout" :class="orientationClass">
      <!-- Title bar: title + close / dock / collapse actions -->
      <div
        ref="titleBarElement"
        class="ml-tool-palette-title-bar"
        :style="titleBarBorderStyle"
      >
        <!-- Top edge resize handle when bottom-docked -->
        <div
          v-if="currentDockSide === 'bottom'"
          class="ml-tool-palette-edge-resize ml-tool-palette-edge-resize--top"
        />

        <!-- Displayed title -->
        <span class="ml-tool-palette-title">{{ displayedTitle }}</span>

        <!-- Actions: top-right when horizontally docked -->
        <div class="ml-tool-palette-title-actions">
          <!-- Collapse toggle -->
          <ml-collapse
            class="ml-tool-palette-dialog-icon ml-tool-palette-action-collapse"
            v-model="collapsed"
            :reverse="collapseReverse"
            :direction="collapseDirection"
            :disabled="disabled"
          />

          <!-- Dock side menu -->
          <el-dropdown
            v-if="showDockMenu"
            class="ml-tool-palette-dock-dropdown ml-tool-palette-action-dock"
            trigger="click"
            :placement="dockMenuPlacement"
            :disabled="disabled"
            @command="handleDockSideSelect"
            @mousedown.stop
          >
            <el-icon
              :size="18"
              class="ml-tool-palette-dialog-icon ml-tool-palette-dock-btn"
              :title="moreMenuLabel"
              :aria-label="moreMenuLabel"
              role="button"
              tabindex="0"
              @mousedown.stop
              @click.stop
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 1024 1024"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M600.704 64a32 32 0 0 1 30.464 22.208l35.2 109.376c14.784 7.232 28.928 15.36 42.432 24.512l112.384-24.192a32 32 0 0 1 34.432 15.36L944.32 364.8a32 32 0 0 1-4.032 37.504l-77.12 85.12a357.12 357.12 0 0 1 0 49.024l77.12 85.248a32 32 0 0 1 4.032 37.504l-88.704 153.6a32 32 0 0 1-34.432 15.296L708.8 803.904c-13.44 9.088-27.648 17.28-42.368 24.512l-35.264 109.376A32 32 0 0 1 600.704 960H423.296a32 32 0 0 1-30.464-22.208L357.696 828.48a351.616 351.616 0 0 1-42.56-24.64l-112.32 24.256a32 32 0 0 1-34.432-15.36L88.64 659.2a32 32 0 0 1 4.032-37.504l77.12-85.248a357.12 357.12 0 0 1 0-48.896l-77.12-85.248A32 32 0 0 1 88.64 364.8l88.704-153.6a32 32 0 0 1 34.432-15.296l112.32 24.256c13.568-9.152 27.776-17.408 42.56-24.64l35.2-109.312A32 32 0 0 1 423.232 64H600.64zm-23.424 64H446.72l-36.352 113.088l-24.512 11.968a294.113 294.113 0 0 0-34.816 20.096l-22.656 15.36l-116.224-25.088l-65.28 113.152l79.68 88.192l-1.92 27.136a293.12 293.12 0 0 0 0 40.192l1.92 27.136l-79.808 88.192l65.344 113.152l116.224-25.024l22.656 15.296a294.113 294.113 0 0 0 34.816 20.096l24.512 11.968L446.72 896h130.688l36.48-113.152l24.448-11.904a288.282 288.282 0 0 0 34.752-20.096l22.592-15.296l116.288 25.024l65.28-113.152l-79.744-88.192l1.92-27.136a293.12 293.12 0 0 0 0-40.256l-1.92-27.136l79.808-88.128l-65.344-113.152l-116.288 24.96l-22.592-15.232a287.616 287.616 0 0 0-34.752-20.096l-24.448-11.904L577.28 128zM512 320a192 192 0 1 1 0 384a192 192 0 0 1 0-384zm0 64a128 128 0 1 0 0 256a128 128 0 0 0 0-256z"
                />
              </svg>
            </el-icon>
            <template #dropdown>
              <el-dropdown-menu class="ml-tool-palette-dock-menu">
                <el-dropdown-item
                  v-for="side in resolvedDockSides"
                  :key="side"
                  :command="side"
                  :class="{ 'is-selected': currentDockSide === side }"
                >
                  <span class="ml-tool-palette-dock-menu-item">
                    <svg
                      v-if="side === 'float'"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="8"
                        height="8"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                      <rect
                        x="6"
                        y="6"
                        width="8"
                        height="8"
                        fill="var(--el-bg-color, #fff)"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                    </svg>
                    <svg
                      v-else-if="side === 'left'"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                      <rect
                        x="2.5"
                        y="2.5"
                        width="3.5"
                        height="11"
                        fill="currentColor"
                      />
                    </svg>
                    <svg
                      v-else-if="side === 'top'"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                      <rect
                        x="2.5"
                        y="2.5"
                        width="11"
                        height="4"
                        fill="currentColor"
                      />
                    </svg>
                    <svg
                      v-else-if="side === 'bottom'"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                      <rect
                        x="2.5"
                        y="9.5"
                        width="11"
                        height="4"
                        fill="currentColor"
                      />
                    </svg>
                    <svg
                      v-else
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                      <rect
                        x="10"
                        y="2.5"
                        width="3.5"
                        height="11"
                        fill="currentColor"
                      />
                    </svg>
                    <span>{{ dockSideTitles[side] }}</span>
                  </span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- Close button -->
          <el-icon
            :size="18"
            class="ml-tool-palette-dialog-icon ml-tool-palette-action-close"
            @click="!disabled && handleClose()"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 1024 1024"
            >
              <path
                fill="currentColor"
                d="M764.288 214.592L512 466.88L259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512L214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"
              />
            </svg>
          </el-icon>
        </div>
      </div>

      <!-- Main content area -->
      <div class="ml-tool-palette-content">
        <!-- Tabs if provided -->
        <ml-overflow-tabs
          v-if="hasTabs"
          v-model="activeTab"
          :tabs="overflowTabs"
          :closable="closable"
          class="ml-tool-palette-tabs"
          @tab-close="handleTabClose"
        >
          <div
            v-for="tab in props.tabs"
            :key="tab.name"
            v-show="activeTab === tab.name"
            class="ml-tool-palette-tab-pane"
            role="tabpanel"
          >
            <slot :name="`tab-${tab.name}`" />
          </div>
        </ml-overflow-tabs>

        <!-- Default slot content if no tabs -->
        <div v-else class="ml-tool-palette-default-content">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'

import { DockSide, WIDTH_OF_TITLE_BAR } from '../composables/types'
import { useBoundingRect } from '../composables/useBoundingRect'
import { DragOptions } from '../composables/useDrag'
import MlCollapse from './MlCollapse.vue'
import type { MlOverflowTab } from './MlOverflowTab'
import MlOverflowTabs from './MlOverflowTabs.vue'

/**
 * Tab definition for tool palette
 */
export interface MlToolPaletteTab {
  /**
   * Unique name identifier for the tab
   */
  name: string
  /**
   * Display label for the tab
   */
  label: string
  /**
   * Title to display in the title bar when this tab is active
   */
  title?: string
  /**
   * Whether this tab can be closed. Overrides the component-level
   * `closable` prop when set.
   */
  closable?: boolean
}

/** Public alias for dock side values. */
export type MlToolPaletteDockSide = DockSide

const DEFAULT_DOCK_SIDES: DockSide[] = [
  'float',
  'left',
  'top',
  'bottom',
  'right'
]

/**
 * Properties of MlToolPalette component
 */
interface Props {
  /**
   * The title of tool palette dialog
   */
  title?: string
  /**
   * Array of tab definitions. If provided, the tool palette will display tabs.
   */
  tabs?: MlToolPaletteTab[]
  /**
   * The minimum distance from the left side of the tool palette to the left side of the window
   */
  leftOffset?: number
  /**
   * The minimum distance from the right side of the tool palette to the right side of the window
   */
  rightOffset?: number
  /**
   * The minimum distance from the top side of the tool palette to the top side of the window
   */
  topOffset?: number
  /**
   * The minimum distance from the bottom side of the tool palette to the bottom side of the window
   */
  bottomOffset?: number
  /** Disable all interactions for this component */
  disabled?: boolean
  /**
   * Whether to show the dock menu (⋮) button in the title bar.
   * @default true
   */
  showDockMenu?: boolean
  /**
   * Which dock-side options to offer. Defaults to float / left / top / bottom / right.
   */
  dockSides?: DockSide[]
  /**
   * Accessible label for the dock menu button.
   * @default 'Dock side'
   */
  moreMenuLabel?: string
  /**
   * Whether tabs show a close button by default.
   * Individual tabs can override via {@link MlToolPaletteTab.closable}.
   * @default true
   */
  closable?: boolean
}

/** Events emitted by the tool palette */
interface Events {
  /**
   * Trigger this event when the tool palette closed.
   * @param pos The left and top position of the tool palette before closed
   */
  (e: 'close', pos: { x: number; y: number }): void
  /**
   * Trigger this event when the active tab changes.
   * @param tabName The name of the newly active tab
   */
  (e: 'tab-change', tabName: string): void
  /**
   * Trigger this event when a tab is closed.
   * @param tabName The name of the closed tab
   */
  (e: 'tab-close', tabName: string): void
  /**
   * Trigger this event when dock side changes (via menu or drag-to-dock).
   * @param side The new dock side
   */
  (e: 'dock-change', side: DockSide): void
}

// Attributes of tool palette component
const props = withDefaults(defineProps<Props>(), {
  title: '',
  tabs: undefined,
  leftOffset: 0,
  rightOffset: 0,
  topOffset: 0,
  bottomOffset: 0,
  disabled: false,
  showDockMenu: true,
  dockSides: undefined,
  moreMenuLabel: 'Dock side',
  closable: true
})
// Flag to control whether the tool palette is visible
const visible = defineModel({ default: true })
// Active tab name (only used when tabs are provided)
const activeTab = defineModel<string>('activeTab', { default: '' })
// Controllable dock side (optional v-model:dock-side)
const dockSideModel = defineModel<DockSide | undefined>('dockSide')
const emit = defineEmits<Events>()

const dockSideTitles: Record<DockSide, string> = {
  float: 'Undock into separate window',
  left: 'Dock to left',
  top: 'Dock to top',
  bottom: 'Dock to bottom',
  right: 'Dock to right'
}

// Check if tabs are provided
const hasTabs = computed(() => {
  return props.tabs && props.tabs.length > 0
})

const resolvedDockSides = computed(() => {
  const sides = props.dockSides?.length ? props.dockSides : DEFAULT_DOCK_SIDES
  return sides
})

const showDockMenu = computed(() => props.showDockMenu !== false)

// Map tool palette tabs to overflow tab definitions
const overflowTabs = computed<MlOverflowTab[]>(() => {
  return (props.tabs ?? []).map(tab => ({
    name: tab.name,
    label: tab.label,
    closable: tab.closable
  }))
})

// Initialize active tab to first tab if tabs are provided and no active tab is set
onMounted(() => {
  if (
    hasTabs.value &&
    !activeTab.value &&
    props.tabs &&
    props.tabs.length > 0
  ) {
    activeTab.value = props.tabs[0].name
  }
})

// Watch for tabs prop changes and initialize active tab if needed
watch(
  () => props.tabs,
  (newTabs: MlToolPaletteTab[] | undefined) => {
    if (newTabs && newTabs.length > 0 && !activeTab.value) {
      activeTab.value = newTabs[0].name
    }
  },
  { immediate: true }
)

// Emit tab-change when the active tab changes (skip initial assignment)
watch(activeTab, (tabName, previousTabName) => {
  if (
    !previousTabName ||
    !tabName ||
    tabName === previousTabName ||
    props.disabled
  ) {
    return
  }
  emit('tab-change', tabName)
})

// Tab close handler
const handleTabClose = (tabName: string) => {
  if (props.disabled) return

  const closingLastTab = (props.tabs?.length ?? 0) <= 1
  emit('tab-close', tabName)

  // Close the palette when the last tab is closed
  if (closingLastTab) {
    handleClose()
    return
  }

  // Switch to another tab if active tab is closed
  if (activeTab.value === tabName && props.tabs) {
    const currentIndex = props.tabs.findIndex(t => t.name === tabName)
    if (currentIndex >= 0) {
      const nextTab =
        props.tabs[currentIndex + 1] || props.tabs[currentIndex - 1]
      if (nextTab) activeTab.value = nextTab.name
    }
  }
}

// Used by scoped CSS via v-bind
const collapsedWidth = `${WIDTH_OF_TITLE_BAR}px`
// Flag to indicate whether the tool palette is collapsed
const collapsed = ref<boolean>(false)
// Referernce to title bar HTML element of tool palette
const titleBarElement = ref<HTMLElement | null>(null)
// Reference to tool palette HTML element
const toolPaletteElement = ref<HTMLElement | null>(null)

// Stable inset computed — avoid `ref()` inside `computed()`, which recreated
// offset state on every prop invalidation and broke right-edge docking clamps.
const dragOffset = computed(() => ({
  left: props.leftOffset,
  right: props.rightOffset,
  top: props.topOffset,
  bottom: props.bottomOffset
}))
const dragOptions = computed<DragOptions>(() => ({
  // ComputedRef is assignment-compatible with Ref for .value reads used by
  // useDrag / useDragEx / useBoundingRect.
  offset: dragOffset as unknown as DragOptions['offset']
}))

// Compute bounding rect and orientation for layout
const {
  rect: toolPaletteRect,
  orientation,
  reversed,
  dockSide: internalDockSide,
  setDockSide
} = useBoundingRect(toolPaletteElement, titleBarElement, collapsed, dragOptions)

const currentDockSide = computed<DockSide>(() => internalDockSide.value)

const isHorizontalDocked = computed(
  () =>
    currentDockSide.value === 'top' || currentDockSide.value === 'bottom'
)

const collapseDirection = computed<'horizontal' | 'vertical'>(() =>
  isHorizontalDocked.value ? 'vertical' : 'horizontal'
)

/** Right / bottom docks flip the collapse arrow direction. */
const collapseReverse = computed(
  () =>
    currentDockSide.value === 'right' || currentDockSide.value === 'bottom'
)

const orientationClass = computed(() => {
  if (currentDockSide.value === 'float') {
    // Horizontal title bar only while docked to top/bottom.
    return orientation.value === 'top' || orientation.value === 'bottom'
      ? 'left'
      : orientation.value
  }
  return currentDockSide.value
})

const dockMenuPlacement = computed(() => {
  if (orientationClass.value === 'right') return 'left-start'
  if (
    orientationClass.value === 'top' ||
    orientationClass.value === 'bottom'
  ) {
    return 'bottom-start'
  }
  return 'right-start'
})

// Keep optional v-model:dock-side in sync with drag/menu changes
watch(
  internalDockSide,
  (side, prev) => {
    if (side === prev) return
    if (dockSideModel.value !== side) {
      dockSideModel.value = side
    }
    emit('dock-change', side)
  }
)

// Apply external v-model:dock-side
watch(
  dockSideModel,
  side => {
    if (side == null || side === internalDockSide.value) return
    setDockSide(side)
  }
)

// Resized style for container — guard undefined until useInitialRect runs so
// invalid `undefinedpx` values do not fall through to CSS `left` and snap the
// palette back to the left edge while docking right.
const resizedStyle = computed(() => ({
  left:
    toolPaletteRect.value.left != null
      ? `${toolPaletteRect.value.left}px`
      : undefined,
  top:
    toolPaletteRect.value.top != null
      ? `${toolPaletteRect.value.top}px`
      : undefined,
  width:
    toolPaletteRect.value.width != null
      ? `${toolPaletteRect.value.width}px`
      : undefined,
  height:
    toolPaletteRect.value.height != null
      ? `${toolPaletteRect.value.height}px`
      : undefined
}))

// Border style for title bar based on orientation
const titleBarBorderStyle = computed(() => {
  if (isHorizontalDocked.value) {
    return {
      borderBottom: '1px solid var(--el-border-color)',
      borderLeft: null,
      borderRight: null
    }
  }
  return reversed.value
    ? { borderLeft: '1px solid var(--el-border-color)', borderRight: null }
    : { borderLeft: null, borderRight: '1px solid var(--el-border-color)' }
})

// Compute the displayed title (from active tab or component title)
const displayedTitle = computed(() => {
  // If tabs are provided and there's an active tab, use the active tab's title
  if (hasTabs.value && activeTab.value && props.tabs) {
    const activeTabData = props.tabs.find(tab => tab.name === activeTab.value)
    if (activeTabData?.title) return activeTabData.title
  }
  return props.title
})

const handleDockSideSelect = (side: DockSide) => {
  if (props.disabled) return
  setDockSide(side)
}

// Close tool palette
const handleClose = () => {
  visible.value = false
  const element = toolPaletteElement.value
  emit('close', {
    x: element ? element.clientLeft : 0,
    y: element ? element.clientTop : 0
  })
}
</script>

<style scoped>
.ml-tool-palette-dialog {
  cursor: default;
  width: 300px;
  min-width: v-bind(collapsedWidth);
  position: fixed;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color);
}

.ml-tool-palette-dialog.is-horizontal-docked {
  min-width: 0;
  min-height: v-bind(collapsedWidth);
}

/* Hit-test strip for height resize on top/bottom docks */
.ml-tool-palette-edge-resize {
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  z-index: 5;
  cursor: ns-resize;
}

.ml-tool-palette-edge-resize--top {
  top: 0;
}

.ml-tool-palette-edge-resize--bottom {
  bottom: 0;
}

/* Disabled overlay to prevent interactions */
.ml-tool-palette-disabled {
  pointer-events: none;
  opacity: 0.6;
}

.ml-tool-palette-dialog-icon {
  border-bottom: 1px solid var(--el-border-color);
  cursor: default;
  box-sizing: content-box;
  padding: 4px 0;
}

.ml-tool-palette-dialog-icon:hover {
  color: var(--el-color-primary);
}

.ml-tool-palette-dialog-layout {
  display: flex;
  height: 100%;
}

.ml-tool-palette-dialog-layout.top,
.ml-tool-palette-dialog-layout.bottom {
  flex-direction: column;
}

.ml-tool-palette-title-bar {
  width: v-bind(collapsedWidth);
  display: flex;
  justify-content: left;
  align-items: center;
  cursor: move;
  writing-mode: vertical-rl;
  text-align: center;
  background-color: var(--el-fill-color);
}

/* Side dock: keep Close → Gear → Collapse → Title along the vertical bar */
.ml-tool-palette-dialog-layout.left .ml-tool-palette-title-actions,
.ml-tool-palette-dialog-layout.right .ml-tool-palette-title-actions {
  display: contents;
}

.ml-tool-palette-dialog-layout.left .ml-tool-palette-title,
.ml-tool-palette-dialog-layout.right .ml-tool-palette-title {
  order: 4;
}

.ml-tool-palette-dialog-layout.left .ml-tool-palette-action-close,
.ml-tool-palette-dialog-layout.right .ml-tool-palette-action-close {
  order: 1;
}

.ml-tool-palette-dialog-layout.left .ml-tool-palette-action-dock,
.ml-tool-palette-dialog-layout.right .ml-tool-palette-action-dock {
  order: 2;
}

.ml-tool-palette-dialog-layout.left .ml-tool-palette-action-collapse,
.ml-tool-palette-dialog-layout.right .ml-tool-palette-action-collapse {
  order: 3;
}

.ml-tool-palette-dialog-layout.top .ml-tool-palette-title-bar,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-title-bar {
  width: 100%;
  height: v-bind(collapsedWidth);
  writing-mode: horizontal-tb;
  flex-direction: row;
  justify-content: flex-start;
  position: relative;
}

/* Top / bottom dock: centered title, actions clustered top-right */
.ml-tool-palette-dialog-layout.top .ml-tool-palette-title,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-title {
  order: 1;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 120px);
  margin: 0;
  text-align: center;
  pointer-events: none;
}

.ml-tool-palette-dialog-layout.top .ml-tool-palette-title-actions,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-title-actions {
  order: 2;
  display: inline-flex;
  flex: 0 0 auto;
  flex-direction: row;
  align-items: stretch;
  align-self: stretch;
  margin-left: auto;
  z-index: 1;
}

.ml-tool-palette-dialog-layout.top .ml-tool-palette-action-collapse,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-action-collapse {
  order: 1;
}

.ml-tool-palette-dialog-layout.top .ml-tool-palette-action-dock,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-action-dock {
  order: 2;
}

.ml-tool-palette-dialog-layout.top .ml-tool-palette-action-close,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-action-close {
  order: 3;
}

.ml-tool-palette-dialog-layout.top .ml-tool-palette-dialog-icon,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-dialog-icon {
  border-bottom: none;
  border-right: 1px solid var(--el-border-color);
  padding: 0 4px;
}

.ml-tool-palette-dialog-layout.top
  .ml-tool-palette-title-actions
  .ml-tool-palette-dialog-icon:last-child,
.ml-tool-palette-dialog-layout.bottom
  .ml-tool-palette-title-actions
  .ml-tool-palette-dialog-icon:last-child {
  border-right: none;
}

.ml-tool-palette-title {
  pointer-events: none; /* Prevents the text from interfering with mousedown */
  margin-top: 10px;
  margin-bottom: 10px;
  font-size: small;
  user-select: none; /* Prevent text selection */
  white-space: nowrap; /* Prevent text from wrapping to the next line */
  overflow: hidden; /* Hide the overflowing text */
  text-overflow: ellipsis; /* Show three dots (...) for overflowing text */
}

.ml-tool-palette-content {
  user-select: none; /* Prevent text selection */
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--el-fill-color);
  overflow: hidden; /* Hides content when width becomes 0 */
  min-height: 0;
  min-width: 0;
}

.ml-tool-palette-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-height: 0;
}

.ml-tool-palette-tabs :deep(.ml-overflow-tabs-body) {
  overflow: auto;
}

.ml-tool-palette-tab-pane {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.ml-tool-palette-default-content {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.ml-tool-palette-dock-dropdown {
  display: inline-flex;
  outline: none;
}

.ml-tool-palette-title-bar :deep(.el-tooltip__trigger) {
  display: inline-flex;
  outline: none;
}

.ml-tool-palette-dock-btn {
  outline: none;
  cursor: pointer;
}

/* When direction is 'left' */
.ml-tool-palette-dialog-layout.left .ml-tool-palette-title-bar {
  order: 1;
}
.ml-tool-palette-dialog-layout.left .ml-tool-palette-content {
  order: 2;
}

/* Right orientation */
.ml-tool-palette-dialog-layout.right .ml-tool-palette-title-bar {
  order: 2;
}
.ml-tool-palette-dialog-layout.right .ml-tool-palette-content {
  order: 1;
}

/* Top / bottom orientation */
.ml-tool-palette-dialog-layout.top .ml-tool-palette-title-bar,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-title-bar {
  order: 1;
}
.ml-tool-palette-dialog-layout.top .ml-tool-palette-content,
.ml-tool-palette-dialog-layout.bottom .ml-tool-palette-content {
  order: 2;
}
</style>

<style>
.ml-tool-palette-dock-menu .el-dropdown-menu__item.is-selected {
  color: var(--el-color-primary, #409eff);
}

.ml-tool-palette-dock-menu-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ml-tool-palette-dock-menu-item svg {
  flex: 0 0 auto;
}
</style>
