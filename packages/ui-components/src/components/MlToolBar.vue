<template>
  <el-button-group class="ml-toolbar-group" :direction="direction">
    <template v-for="(item, index) in items" :key="index">
      <!-- ================= Button with sub toolbar ================= -->
      <el-popover
        v-if="item.children?.length"
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
          :direction="direction"
          @mouseenter="openPopover(index)"
          @mouseleave="closePopover"
        >
          <el-tooltip
            v-for="(child, cIndex) in item.children"
            :key="cIndex"
            :content="buttonTooltip(child)"
            :auto-close="3000"
            :show-after="1000"
            :hide-after="0"
          >
            <el-button
              class="ml-toolbar-button"
              :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
              @click="handleSubCommand(child.command)"
            >
              <div>
                <el-icon :size="buttonIconSize">
                  <component :is="child.icon" />
                </el-icon>
                <div v-if="isShowButtonText" class="ml-toolbar-button-text">
                  {{ child.text }}
                </div>
              </div>
            </el-button>
          </el-tooltip>
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
                  <component :is="item.icon" />
                </el-icon>
                <div v-if="isShowButtonText" class="ml-toolbar-button-text">
                  {{ item.text }}
                </div>
              </div>
            </el-tooltip>
          </el-button>
        </template>
      </el-popover>

      <!-- ================= Normal button ================= -->
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
          @click="handleCommand(item.command)"
        >
          <div>
            <el-icon :size="buttonIconSize">
              <component :is="item.icon" />
            </el-icon>
            <div v-if="isShowButtonText" class="ml-toolbar-button-text">
              {{ item.text }}
            </div>
          </div>
        </el-button>
      </el-tooltip>
    </template>
  </el-button-group>
</template>

<script setup lang="ts">
import { Component, computed, ref } from 'vue'

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
   * Icon represented by one vue component
   */
  icon: Component
  /**
   * Text shown below icon
   */
  text: string
  /**
   * Command string which will be passed to click event as event arguments
   */
  command: string
  /**
   * Tooltips content when hover
   */
  description?: string
  /**
   * Sub toolbar data. If this property is set, the button will have a sub toolbar.
   */
  children?: MlButtonData[]
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
}

const props = withDefaults(defineProps<Props>(), {
  size: 'large',
  direction: 'horizontal'
})

const emit = defineEmits<{
  (e: 'click', command?: string): void
}>()

const buttonIconSize = computed(() => (props.size === 'small' ? 20 : 30))

const buttonSize = computed(() => {
  if (props.size === 'small') return 30
  if (props.size === 'medium') return 50
  return 70
})

const isShowButtonText = computed(() => props.size === 'large')

const buttonTooltip = (item: MlButtonData) => item.description ?? item.text

const activePopoverIndex = ref<number | null>(null)

const openPopover = (index: number) => {
  activePopoverIndex.value = index
}

const closePopover = () => {
  activePopoverIndex.value = null
}

const handleCommand = (command?: string) => {
  if (command) emit('click', command)
}

const handleSubCommand = (command?: string) => {
  if (command) emit('click', command)
  closePopover() // 👈 hide sub toolbar after click
}

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
  return props.direction === 'horizontal' && item.children
    ? item.children.length * buttonSize.value
    : buttonSize.value
}

const getSubToolbarMaxWidth = (item: MlButtonData) => {
  return props.direction === 'vertical' && item.children ? buttonSize.value : 0
}
</script>

<style scoped>
.ml-toolbar-group {
  background-color: var(--el-fill-color);
}

.ml-sub-toolbar-group {
  background-color: var(--el-bg-color);
}

.ml-toolbar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
}

.ml-toolbar-button-text {
  margin-top: 5px;
}
</style>
