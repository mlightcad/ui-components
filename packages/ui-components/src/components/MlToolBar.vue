<template>
  <div ref="toolbarRootRef" class="ml-toolbar" :style="toolbarCssVars">
    <el-button-group
      class="ml-toolbar-group"
      :class="toolbarDirectionClass"
      :direction="direction"
    >
      <template v-for="(item, index) in visibleItems" :key="index">
        <!-- ================= Separator ================= -->
        <span v-if="isSeparator(item)" class="ml-toolbar-separator" />

        <!-- ================= Button with sub toolbar / menu ================= -->
        <el-popover
          v-else-if="item.children?.length"
          :visible="activePopoverIndex === index"
          trigger="manual"
          :placement="popoverPlacement"
          :show-arrow="true"
          :teleported="true"
          :popper-class="getPopoverClass(item)"
          :popper-style="getPopoverStyle(item)"
        >
          <!-- Sub toolbar (sticky / dismissible) -->
          <el-button-group
            v-if="!isMenu(item)"
            class="ml-sub-toolbar-group"
            :class="toolbarDirectionClass"
            :direction="direction"
          >
            <template v-for="(child, cIndex) in item.children" :key="cIndex">
              <span v-if="isSeparator(child)" class="ml-toolbar-separator" />
              <el-tooltip
                v-else
                :content="buttonTooltip(child)"
                :auto-close="3000"
                :show-after="1000"
                :hide-after="0"
              >
                <el-button
                  class="ml-toolbar-button"
                  :class="{
                    'is-selected': isChildSelected(item, index, child)
                  }"
                  :style="{
                    width: buttonSize + 'px',
                    height: buttonSize + 'px'
                  }"
                  @click="handleSubCommand(item, index, child)"
                >
                  <div>
                    <el-icon :size="buttonIconSize">
                      <component :is="resolvedIcon(child)" />
                    </el-icon>
                    <div v-if="isShowButtonText" class="ml-toolbar-button-text">
                      {{ resolvedText(child) }}
                    </div>
                  </div>
                </el-button>
              </el-tooltip>
            </template>
          </el-button-group>

          <!-- Popover menu -->
          <ul v-else class="ml-toolbar-menu" role="menu">
            <template v-for="(child, cIndex) in item.children" :key="cIndex">
              <li
                v-if="isSeparator(child)"
                class="ml-toolbar-menu-separator"
                role="separator"
              />
              <li
                v-else
                class="ml-toolbar-menu-item"
                :class="{ 'is-selected': isChildSelected(item, index, child) }"
                role="menuitem"
                @click="handleSubCommand(item, index, child)"
              >
                <el-icon :size="menuIconSize">
                  <component :is="resolvedIcon(child)" />
                </el-icon>
                <span class="ml-toolbar-menu-item-text">
                  {{ resolvedText(child) }}
                </span>
              </li>
            </template>
          </ul>

          <!-- Reference -->
          <template #reference>
            <el-button
              class="ml-toolbar-button ml-toolbar-button--has-children"
              :class="[
                `ml-toolbar-button--flyout-${flyoutSide}`,
                { 'is-open': activePopoverIndex === index }
              ]"
              :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
              :aria-pressed="
                isSticky(item) ? activePopoverIndex === index : undefined
              "
              @click="handleParentClick(index)"
            >
              <el-tooltip
                :content="buttonTooltip(item, index)"
                :auto-close="3000"
                :show-after="1000"
                :hide-after="0"
              >
                <div>
                  <el-icon :size="buttonIconSize">
                    <component :is="resolvedIcon(item, index)" />
                  </el-icon>
                  <div v-if="isShowButtonText" class="ml-toolbar-button-text">
                    {{ resolvedText(item, index) }}
                  </div>
                </div>
              </el-tooltip>
            </el-button>
          </template>
        </el-popover>

        <!-- ================= Normal / Toggle button ================= -->
        <el-tooltip
          v-else
          :content="buttonTooltip(item)"
          :auto-close="3000"
          :show-after="1000"
          :hide-after="0"
        >
          <el-button
            class="ml-toolbar-button"
            :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
            @click="handleItemClick(item)"
          >
            <div>
              <el-icon :size="buttonIconSize">
                <component :is="resolvedIcon(item)" />
              </el-icon>
              <div v-if="isShowButtonText" class="ml-toolbar-button-text">
                {{ resolvedText(item) }}
              </div>
            </div>
          </el-button>
        </el-tooltip>
      </template>

      <!-- Collapse at end: bottom for vertical (left/right), right for horizontal (top/bottom) -->
      <el-button
        v-if="collapsible"
        class="ml-toolbar-button ml-toolbar-collapse-button"
        :style="collapseButtonStyle"
        @click="toggleCollapsed"
      >
        <el-icon
          :size="collapseButtonIconSize"
          class="ml-toolbar-collapse-icon"
        >
          <component :is="collapseButtonIcon" />
        </el-icon>
      </el-button>
    </el-button-group>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ArrowDown from '../svgs/arrow-down.svg'
import ArrowLeft from '../svgs/arrow-left.svg'
import ArrowRight from '../svgs/arrow-right.svg'
import ArrowUp from '../svgs/arrow-up.svg'

let popoverUid = 0
type VerticalPlacement =
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'

type HorizontalPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'

/**
 * How a parent button presents its `children`.
 * - sticky: parent acts as a switch; the sub-toolbar stays open until the
 *   same button is clicked again, or another parent that opens children is
 *   clicked. Outside clicks do not close it.
 * - dismissible: sub-toolbar closes when the user clicks the canvas or any
 *   other area outside the popover.
 * - menu: children are shown as a popover menu (not a toolbar). Outside
 *   clicks close it, same as dismissible.
 */
export type MlSubToolbarType = 'sticky' | 'dismissible' | 'menu'

/**
 * Data to descibe button appearance
 */
export interface MlButtonData {
  /**
   * Item type.
   * - button: normal / toggle / popover button (default)
   * - separator: visual divider between buttons
   */
  type?: 'button' | 'separator'
  /**
   * Command string which will be passed to click event as event arguments.
   * Not required when `type` is `'separator'` or when the item only has `children`.
   */
  command?: string
  /**
   * Sub toolbar / menu items. If this property is set, the button will open
   * children according to {@link childrenType}.
   * Children may also include separators.
   */
  children?: MlButtonData[]
  /**
   * Presentation of `children`.
   * @default 'dismissible'
   */
  childrenType?: MlSubToolbarType
  /**
   * When true, children represent a selection. After a child is chosen, this
   * button's icon, text, and tooltip follow that child.
   */
  followChild?: boolean
  /**
   * Initial selected child `command` when {@link followChild} is true.
   */
  selectedCommand?: string
  /**
   * Toggle button configuration.
   * If this property is set, the button becomes a toggle button.
   */
  toggle?: {
    /**
     * Initial toggle value
     */
    value?: boolean
    /**
     * Appearance when toggle is ON
     */
    on: {
      icon: Component
      text: string
      description: string
    }
    /**
     * Appearance when toggle is OFF
     */
    off: {
      icon: Component
      text: string
      description: string
    }
  }
  /**
   * Icon represented by one vue component
   * ⚠️ Ignored when toggle is defined
   */
  icon?: Component
  /**
   * Text shown below icon
   * ⚠️ Ignored when toggle is defined
   */
  text?: string
  /**
   * Tooltips content when hover
   * ⚠️ Ignored when toggle is defined
   */
  description?: string
}

/**
 * Properties of MlToolBar component
 */
interface Props {
  /**
   * An array of button data
   */
  items: MlButtonData[]
  /**
   * Button size.
   * - small: 30px
   * - medium: 50px
   * - large: 70px
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Layout type.
   * - vertical: arrange button vertically
   * - horizontal: arrange button horizontally
   */
  direction?: 'vertical' | 'horizontal'
  /**
   * Placement of the sub-toolbar popover, and of the parent-button flyout mark.
   * Use the side toward the canvas (opposite the toolbar dock): right dock →
   * `left`, left dock → `right`, top dock → `bottom`, bottom dock → `top`.
   */
  placement?: VerticalPlacement | HorizontalPlacement
  /**
   * Show a collapse button and allow the toolbar to be toggled open/closed.
   */
  collapsible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'large',
  direction: 'horizontal',
  collapsible: false
})

const emit = defineEmits<{
  (e: 'click', command?: string): void
  (e: 'toggle', command: string, value: boolean): void
}>()

const buttonIconSize = computed(() => (props.size === 'small' ? 20 : 30))

const menuIconSize = computed(() => (props.size === 'small' ? 14 : 16))

const buttonSize = computed(() => {
  if (props.size === 'small') return 30
  if (props.size === 'medium') return 50
  return 70
})

/**
 * AutoCAD-style flyout mark edge length. Scales with {@link buttonSize} so the
 * triangle stays in the icon padding and does not overlap the glyph.
 */
const flyoutMarkSize = computed(() => {
  if (props.size === 'small') return 5
  if (props.size === 'medium') return 9
  return 12
})

const flyoutMarkInset = computed(() => (props.size === 'small' ? 1 : 2))

const toolbarCssVars = computed(() => ({
  '--ml-toolbar-flyout-mark-size': `${flyoutMarkSize.value}px`,
  '--ml-toolbar-flyout-mark-inset': `${flyoutMarkInset.value}px`
}))

const collapseButtonShortSide = computed(() => buttonSize.value / 3)

const collapseButtonIconSize = computed(() =>
  Math.max(8, Math.floor(collapseButtonShortSide.value) - 2)
)

const isShowButtonText = computed(() => props.size === 'large')

const toolbarDirectionClass = computed(() =>
  props.direction === 'vertical'
    ? 'ml-toolbar-group--vertical'
    : 'ml-toolbar-group--horizontal'
)

const separatorSize = computed(() => 7)

const isSeparator = (item: MlButtonData) => item.type === 'separator'

const childrenType = (item: MlButtonData): MlSubToolbarType =>
  item.childrenType ?? 'dismissible'

const isSticky = (item: MlButtonData) => childrenType(item) === 'sticky'

const isMenu = (item: MlButtonData) => childrenType(item) === 'menu'

const closesOnOutsideClick = (item: MlButtonData) => {
  const type = childrenType(item)
  return type === 'dismissible' || type === 'menu'
}

const activePopoverIndex = ref<number | null>(null)
const isCollapsed = ref(false)
const toolbarRootRef = ref<HTMLElement | null>(null)
const popoverScopeClass = `ml-toolbar-popover-${++popoverUid}`

const visibleItems = computed(() =>
  props.collapsible && isCollapsed.value ? [] : props.items
)

const collapseButtonStyle = computed(() => ({
  width:
    props.direction === 'horizontal'
      ? `${collapseButtonShortSide.value}px`
      : `${buttonSize.value}px`,
  height:
    props.direction === 'vertical'
      ? `${collapseButtonShortSide.value}px`
      : `${buttonSize.value}px`
}))

const openPopover = (index: number) => {
  activePopoverIndex.value = index
}

const closePopover = () => {
  activePopoverIndex.value = null
}

const handleParentClick = (index: number) => {
  if (activePopoverIndex.value === index) {
    closePopover()
    return
  }
  openPopover(index)
}

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
  closePopover()
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (activePopoverIndex.value === null) return
  const item = visibleItems.value[activePopoverIndex.value]
  if (!item || !closesOnOutsideClick(item)) return

  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest(`.${popoverScopeClass}`)) return

  const root = toolbarRootRef.value
  if (root?.contains(target)) {
    // Another flyout parent in this toolbar switches via its own click handler.
    if (target.closest('.ml-toolbar-button--has-children')) return
    closePopover()
    return
  }

  closePopover()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})

/**
 * Internal toggle state map
 */
const toggleStateMap = ref<Record<string, boolean>>({})

/**
 * Last selected child command for parents with {@link MlButtonData.followChild}.
 */
const selectedChildCommandMap = ref<Record<string, string>>({})

const parentStateKey = (item: MlButtonData, index: number) =>
  item.command ?? `__parent_${index}`

const initToggleState = (items: MlButtonData[]) => {
  items.forEach(item => {
    if (item.command && item.toggle) {
      if (typeof item.toggle.value === 'boolean') {
        toggleStateMap.value[item.command] = item.toggle.value
      } else if (toggleStateMap.value[item.command] === undefined) {
        toggleStateMap.value[item.command] = false
      }
    }
    if (item.children?.length) {
      initToggleState(item.children)
    }
  })
}

const initFollowChildState = (items: MlButtonData[]) => {
  items.forEach((item, index) => {
    if (!item.followChild) return
    const key = parentStateKey(item, index)
    if (selectedChildCommandMap.value[key] !== undefined) return
    if (item.selectedCommand) {
      selectedChildCommandMap.value[key] = item.selectedCommand
    }
  })
}

watch(
  () => props.items,
  items => {
    initToggleState(items)
    initFollowChildState(items)
  },
  { immediate: true }
)

watch(
  () => props.collapsible,
  collapsible => {
    if (!collapsible) isCollapsed.value = false
  }
)

const handleItemClick = (item: MlButtonData) => {
  if (isSeparator(item) || !item.command) return
  if (item.toggle) {
    const current =
      typeof item.toggle.value === 'boolean'
        ? item.toggle.value
        : !!toggleStateMap.value[item.command]
    const next = !current
    toggleStateMap.value[item.command] = next
    emit('toggle', item.command, next)
  } else {
    emit('click', item.command)
  }
}

const handleSubCommand = (
  parent: MlButtonData,
  parentIndex: number,
  child: MlButtonData
) => {
  handleItemClick(child)
  if (parent.followChild && child.command) {
    selectedChildCommandMap.value[parentStateKey(parent, parentIndex)] =
      child.command
  }
  if (!isSticky(parent)) {
    closePopover()
  }
}

const selectedChild = (item: MlButtonData, index: number) => {
  if (!item.followChild || !item.children?.length) return undefined
  const command = selectedChildCommandMap.value[parentStateKey(item, index)]
  if (!command) return undefined
  return item.children.find(
    child => !isSeparator(child) && child.command === command
  )
}

const isChildSelected = (
  parent: MlButtonData,
  parentIndex: number,
  child: MlButtonData
) => {
  if (!parent.followChild || !child.command) return false
  return (
    selectedChildCommandMap.value[parentStateKey(parent, parentIndex)] ===
    child.command
  )
}

/**
 * Resolve current toggle state. `toggle.value` is treated as a controlled
 * state when it is a boolean, so parent updates (for example after a command)
 * are reflected on both root and submenu buttons.
 */
const isToggleOn = (item: MlButtonData) => {
  if (!item.toggle || !item.command) return false
  if (typeof item.toggle.value === 'boolean') return item.toggle.value
  return !!toggleStateMap.value[item.command]
}

const appearanceIcon = (item: MlButtonData) => {
  if (!item.toggle) return item.icon
  return isToggleOn(item) ? item.toggle.on.icon : item.toggle.off.icon
}

const appearanceText = (item: MlButtonData) => {
  if (!item.toggle) return item.text
  return isToggleOn(item) ? item.toggle.on.text : item.toggle.off.text
}

const appearanceTooltip = (item: MlButtonData) => {
  if (!item.toggle) {
    return item.description ?? item.text
  }
  return isToggleOn(item)
    ? (item.toggle.on.description ?? item.toggle.on.text)
    : (item.toggle.off.description ?? item.toggle.off.text)
}

/**
 * Resolve icon (toggle-aware, followChild-aware for parents)
 */
const resolvedIcon = (item: MlButtonData, index?: number) => {
  if (typeof index === 'number') {
    const child = selectedChild(item, index)
    if (child) return appearanceIcon(child)
  }
  return appearanceIcon(item)
}

/**
 * Resolve text (toggle-aware, followChild-aware for parents)
 */
const resolvedText = (item: MlButtonData, index?: number) => {
  if (typeof index === 'number') {
    const child = selectedChild(item, index)
    if (child) return appearanceText(child)
  }
  return appearanceText(item)
}

/**
 * Resolve tooltip (toggle-aware, followChild-aware for parents)
 */
const buttonTooltip = (item: MlButtonData, index?: number) => {
  if (typeof index === 'number') {
    const child = selectedChild(item, index)
    if (child) return appearanceTooltip(child)
  }
  return appearanceTooltip(item)
}

/**
 * Arrow points toward the content when expanded (collapse inward),
 * and toward the open direction when collapsed.
 * Horizontal (top/bottom): button on the right → left / right.
 * Vertical (left/right): button on the bottom → up / down.
 */
const collapseButtonIcon = computed(() => {
  if (props.direction === 'horizontal') {
    return isCollapsed.value ? ArrowRight : ArrowLeft
  }
  return isCollapsed.value ? ArrowDown : ArrowUp
})

const popoverPlacement = computed(() => {
  const verticalDefaults: VerticalPlacement = 'right-start'
  const horizontalDefaults: HorizontalPlacement = 'bottom-start'

  if (!props.placement) {
    return props.direction === 'vertical'
      ? verticalDefaults
      : horizontalDefaults
  }

  // Direction-aware validation
  if (
    props.direction === 'vertical' &&
    (props.placement.startsWith('left') || props.placement.startsWith('right'))
  ) {
    return props.placement
  }

  if (
    props.direction === 'horizontal' &&
    (props.placement.startsWith('top') || props.placement.startsWith('bottom'))
  ) {
    return props.placement
  }

  // Fallback if placement doesn't match direction
  return props.direction === 'vertical' ? verticalDefaults : horizontalDefaults
})

/**
 * Corner of the flyout mark, matching the side the sub-toolbar opens toward
 * (from {@link popoverPlacement}).
 */
const flyoutSide = computed(() => {
  const placement = popoverPlacement.value
  if (placement.startsWith('left')) return 'left'
  if (placement.startsWith('right')) return 'right'
  if (placement.startsWith('top')) return 'top'
  return 'bottom'
})

const getPopoverClass = (item: MlButtonData) =>
  [
    'ml-toolbar-popover',
    popoverScopeClass,
    isMenu(item) ? 'ml-toolbar-popover--menu' : 'ml-toolbar-popover--toolbar'
  ].join(' ')

const getSubToolbarMinWidth = (item: MlButtonData) => {
  if (props.direction !== 'horizontal' || !item.children) {
    return buttonSize.value
  }
  return item.children.reduce(
    (width, child) =>
      width + (isSeparator(child) ? separatorSize.value : buttonSize.value),
    0
  )
}

const getSubToolbarMaxWidth = (item: MlButtonData) => {
  return props.direction === 'vertical' && item.children ? buttonSize.value : 0
}

const getPopoverStyle = (item: MlButtonData) => {
  if (isMenu(item)) {
    return {
      minWidth: '148px',
      '--el-popover-padding': '4px 0'
    }
  }
  return {
    minWidth: getSubToolbarMinWidth(item) + 'px',
    maxWidth: getSubToolbarMaxWidth(item) + 'px',
    '--el-popover-padding': '0px',
    '--el-popover-border-width': '0px',
    '--el-popover-border-color': 'transparent'
  }
}
</script>

<style scoped>
.ml-toolbar {
  display: inline-flex;
}

.ml-toolbar-group {
  display: inline-flex;
  background-color: var(--el-fill-color);
}

.ml-toolbar-group--vertical {
  flex-direction: column;
}

.ml-sub-toolbar-group {
  background-color: var(--el-bg-color);
}

.ml-toolbar-separator {
  flex-shrink: 0;
  align-self: stretch;
  pointer-events: none;
  background-color: var(--el-border-color);
}

.ml-toolbar-group--horizontal > .ml-toolbar-separator {
  width: 1px;
  margin: 6px 3px;
}

.ml-toolbar-group--vertical > .ml-toolbar-separator {
  height: 1px;
  width: auto;
  margin: 3px 6px;
}

.ml-toolbar-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
  overflow: visible;
}

.ml-toolbar-button.is-open,
.ml-toolbar-button.is-selected {
  color: var(--el-button-hover-text-color);
  background-color: var(--el-button-hover-bg-color);
  border-color: var(--el-button-hover-border-color);
}

/* Flyout mark: right triangle in the corner toward the sub-toolbar. Size
   comes from --ml-toolbar-flyout-mark-* so it tracks small / medium / large. */
.ml-toolbar-button--has-children::after {
  content: '';
  position: absolute;
  width: var(--ml-toolbar-flyout-mark-size, 5px);
  height: var(--ml-toolbar-flyout-mark-size, 5px);
  background: currentColor;
  pointer-events: none;
}

.ml-toolbar-button--flyout-left::after {
  left: var(--ml-toolbar-flyout-mark-inset, 1px);
  bottom: var(--ml-toolbar-flyout-mark-inset, 1px);
  clip-path: polygon(0 100%, 0 0, 100% 100%);
}

.ml-toolbar-button--flyout-right::after {
  right: var(--ml-toolbar-flyout-mark-inset, 1px);
  bottom: var(--ml-toolbar-flyout-mark-inset, 1px);
  clip-path: polygon(100% 100%, 0 100%, 100% 0);
}

.ml-toolbar-button--flyout-bottom::after {
  right: var(--ml-toolbar-flyout-mark-inset, 1px);
  bottom: var(--ml-toolbar-flyout-mark-inset, 1px);
  clip-path: polygon(100% 100%, 0 100%, 100% 0);
}

.ml-toolbar-button--flyout-top::after {
  right: var(--ml-toolbar-flyout-mark-inset, 1px);
  top: var(--ml-toolbar-flyout-mark-inset, 1px);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}

.ml-toolbar-collapse-button {
  min-width: 0;
  padding: 0;
}

.ml-toolbar-collapse-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ml-toolbar-button-text {
  margin-top: 5px;
}

.ml-toolbar-menu {
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 140px;
}

.ml-toolbar-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.ml-toolbar-menu-item:hover,
.ml-toolbar-menu-item.is-selected {
  background-color: var(--el-fill-color-light);
}

.ml-toolbar-menu-item-text {
  font-size: 13px;
  line-height: 1.4;
}

.ml-toolbar-menu-separator {
  height: 1px;
  margin: 4px 8px;
  background-color: var(--el-border-color);
  list-style: none;
}
</style>

<style>
.ml-toolbar-popover--toolbar.el-popper {
  min-width: unset;
  background: transparent;
  box-shadow: none;
}

.ml-toolbar-popover--menu.el-popper {
  min-width: 148px;
  padding: 4px 0;
}
</style>
