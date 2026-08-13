<template>
  <el-button-group
    class="ml-toolbar-group"
    :class="toolbarDirectionClass"
    :direction="direction"
  >
    <template v-for="(item, index) in visibleItems" :key="index">
      <!-- ================= Separator ================= -->
      <span v-if="isSeparator(item)" class="ml-toolbar-separator" />

      <!-- ================= Button with sub toolbar ================= -->
      <el-popover
        v-else-if="item.children?.length"
        :visible="activePopoverIndex === index"
        trigger="manual"
        :placement="popoverPlacement"
        :show-arrow="true"
        :teleported="true"
        :popper-style="{
          minWidth: getSubToolbarMinWidth(item) + 'px',
          maxWidth: getSubToolbarMaxWidth(item) + 'px',
          '--el-popover-padding': '0px',
          '--el-popover-border-width': '0px',
          '--el-popover-border-color': 'transparent'
        }"
        @mouseenter="openPopover(index)"
        @mouseleave="closePopover"
      >
        <!-- Sub toolbar -->
        <el-button-group
          class="ml-sub-toolbar-group"
          :class="toolbarDirectionClass"
          :direction="direction"
          @mouseenter="openPopover(index)"
          @mouseleave="closePopover"
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
                :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
                @click="handleSubCommand(child)"
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

        <!-- Reference -->
        <template #reference>
          <el-button
            class="ml-toolbar-button"
            :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
            @mouseenter="openPopover(index)"
            @mouseleave="closePopover"
          >
            <el-tooltip
              :content="buttonTooltip(item)"
              :auto-close="3000"
              :show-after="1000"
              :hide-after="0"
            >
              <div>
                <el-icon :size="buttonIconSize">
                  <component :is="resolvedIcon(item)" />
                </el-icon>
                <div v-if="isShowButtonText" class="ml-toolbar-button-text">
                  {{ resolvedText(item) }}
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
      <el-icon :size="collapseButtonIconSize" class="ml-toolbar-collapse-icon">
        <component :is="collapseButtonIcon" />
      </el-icon>
    </el-button>
  </el-button-group>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'

import ArrowDown from '../svgs/arrow-down.svg'
import ArrowLeft from '../svgs/arrow-left.svg'
import ArrowRight from '../svgs/arrow-right.svg'
import ArrowUp from '../svgs/arrow-up.svg'
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
   * Sub toolbar data. If this property is set, the button will have a sub toolbar.
   * Children may also include separators.
   */
  children?: MlButtonData[]
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
   * Placement of sub toolbar (popover)
   * - vertical toolbar: left / right variants
   * - horizontal toolbar: top / bottom variants
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

const buttonSize = computed(() => {
  if (props.size === 'small') return 30
  if (props.size === 'medium') return 50
  return 70
})

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

const activePopoverIndex = ref<number | null>(null)
const isCollapsed = ref(false)

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

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
  closePopover()
}

/**
 * Internal toggle state map
 */
const toggleStateMap = ref<Record<string, boolean>>({})

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

watch(
  () => props.items,
  items => {
    initToggleState(items)
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

const handleSubCommand = (item: MlButtonData) => {
  handleItemClick(item)
  closePopover()
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

/**
 * Resolve icon (toggle-aware)
 */
const resolvedIcon = (item: MlButtonData) => {
  if (!item.toggle) return item.icon
  return isToggleOn(item) ? item.toggle.on.icon : item.toggle.off.icon
}

/**
 * Resolve text (toggle-aware)
 */
const resolvedText = (item: MlButtonData) => {
  if (!item.toggle) return item.text
  return isToggleOn(item) ? item.toggle.on.text : item.toggle.off.text
}

/**
 * Resolve tooltip (toggle-aware)
 */
const buttonTooltip = (item: MlButtonData) => {
  if (!item.toggle) {
    return item.description ?? item.text
  }
  return isToggleOn(item)
    ? (item.toggle.on.description ?? item.toggle.on.text)
    : (item.toggle.off.description ?? item.toggle.off.text)
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
</script>

<style scoped>
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
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
</style>
