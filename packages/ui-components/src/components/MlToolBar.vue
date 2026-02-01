<template>
  <el-button-group class="ml-toolbar-group" :direction="direction">
    <template v-for="(item, index) in items" :key="index">
      <el-popover
        v-if="item.children?.length"
        trigger="hover"
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
      >
        <!-- Sub toolbar -->
        <el-button-group class="ml-sub-toolbar-group" :direction="direction">
          <el-tooltip
            v-for="(child, cIndex) in item.children"
            :key="cIndex"
            :content="buttonTooltip(child)"
            :show-after="1000"
            :hide-after="0"
          >
            <el-button
              class="ml-toolbar-button"
              :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
              @click="handleCommand(child.command)"
            >
              <el-icon :size="buttonIconSize">
                <component :is="child.icon" />
              </el-icon>
              <div v-if="isShowButtonText" class="ml-toolbar-button-text">
                {{ child.text }}
              </div>
            </el-button>
          </el-tooltip>
        </el-button-group>

        <!-- Reference -->
        <template #reference>
          <el-button
            class="ml-toolbar-button"
            :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
          >
            <el-tooltip
              :content="buttonTooltip(item)"
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
        :show-after="1000"
        :hide-after="0"
      >
        <el-button
          class="ml-toolbar-button"
          :style="{ width: buttonSize + 'px', height: buttonSize + 'px' }"
          @click="handleCommand(item.command)"
        >
          <el-icon :size="buttonIconSize">
            <component :is="item.icon" />
          </el-icon>
          <div v-if="isShowButtonText" class="ml-toolbar-button-text">
            {{ item.text }}
          </div>
        </el-button>
      </el-tooltip>
    </template>
  </el-button-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { MlIconType } from './types'

/**
 * Data to descibe button appearance
 */
export interface MlButtonData {
  /**
   * Icon represented by one vue component
   */
  icon: MlIconType
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

const handleCommand = (command?: string) => {
  if (command) emit('click', command)
}

const popoverPlacement = computed(() =>
  props.direction === 'vertical' ? 'right-start' : 'bottom-start'
)

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
  border-radius: 4px;
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
