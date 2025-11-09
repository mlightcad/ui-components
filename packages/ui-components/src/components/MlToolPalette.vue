<template>
  <div
    ref="toolPaletteElement"
    :style="[resizedStyle]"
    class="ml-tool-palette-dialog"
    v-if="visible"
  >
    <div class="ml-tool-palette-dialog-layout" :class="orientation">
      <div ref="titleBarElement" class="ml-tool-palette-title-bar" :style="titleBarBorderStyle">
        <el-icon
          :size="18"
          class="ml-tool-palette-dialog-icon"
          @click="handleClose"
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
        <ml-collapse
          class="ml-tool-palette-dialog-icon"
          v-model="collapsed"
          :reverse="reversed"
        />
        <span class="ml-tool-palette-title">{{ displayedTitle }}</span>
      </div>
      <div class="ml-tool-palette-content">
        <el-tabs
          v-if="hasTabs"
          v-model="activeTab"
          type="border-card"
          class="ml-tool-palette-tabs"
          @tab-remove="handleTabClose"
          @tab-change="handleTabChange"
        >
          <el-tab-pane
            v-for="tab in props.tabs"
            :key="tab.name"
            :name="tab.name"
            :label="tab.label"
          >
            <template #label>
              <span>{{ tab.label }}</span>
            </template>
            <slot :name="`tab-${tab.name}`" />
          </el-tab-pane>
        </el-tabs>
        <div v-else class="ml-tool-palette-default-content">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'

import { WIDTH_OF_TITLE_BAR } from '../composables/types'
import { useBoundingRect } from '../composables/useBoundingRect'
import { DragOptions } from '../composables/useDrag'
import MlCollapse from './MlCollapse.vue'

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
}

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
}

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
}

// Attributes of tool palette component
const props = withDefaults(defineProps<Props>(), {
  title: '',
  tabs: undefined,
  leftOffset: 0,
  rightOffset: 0,
  topOffset: 0,
  bottomOffset: 0
})
// Flag to control whether the tool palette is visible
const visible = defineModel({ default: true })
// Active tab name (only used when tabs are provided)
const activeTab = defineModel<string>('activeTab', { default: '' })
const emit = defineEmits<Events>()

// Check if tabs are provided
const hasTabs = computed(() => {
  return props.tabs && props.tabs.length > 0
})

// Initialize active tab to first tab if tabs are provided and no active tab is set
onMounted(() => {
  if (hasTabs.value && !activeTab.value && props.tabs && props.tabs.length > 0) {
    activeTab.value = props.tabs[0].name
  }
})

// Watch for tabs prop changes and initialize active tab if needed
watch(() => props.tabs, (newTabs: MlToolPaletteTab[] | undefined) => {
  if (newTabs && newTabs.length > 0 && !activeTab.value) {
    activeTab.value = newTabs[0].name
  }
}, { immediate: true })

// This varible is used in CSS
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const collapsedWidth = WIDTH_OF_TITLE_BAR
// Flag to indicate whether the tool palette is collapsed
const collapsed = ref<boolean>(false)
// Referernce to title bar HTML element of tool palette
const titleBarElement = ref<HTMLElement | null>(null)
// Reference to tool palette HTML element
const toolPaletteElement = ref<HTMLElement | null>(null)

const dragOptions = computed<DragOptions>(() => {
  return {
    offset: ref({
      left: props.leftOffset,
      right: props.rightOffset,
      top: props.topOffset,
      bottom: props.bottomOffset
    })
  }
})
const {
  rect: toolPaletteRect,
  orientation,
  reversed
} = useBoundingRect(toolPaletteElement, titleBarElement, collapsed, dragOptions)

// Resized style
const resizedStyle = computed(() => {
  return {
    left: `${toolPaletteRect.value.left}px`,
    top: `${toolPaletteRect.value.top}px`,
    width: `${toolPaletteRect.value.width}px`,
    height: `${toolPaletteRect.value.height}px`
  }
})

const titleBarBorderStyle = computed(() => {
  return reversed.value ? {
    borderLeft: '1px solid var(--el-border-color)',
    borderRight: null
  } : {
    borderLeft: null,
    borderRight: '1px solid var(--el-border-color)'
  }
})

// Compute the title to display in the title bar
const displayedTitle = computed(() => {
  // If tabs are provided and there's an active tab, use the active tab's title
  if (hasTabs.value && activeTab.value && props.tabs) {
    const activeTabData = props.tabs.find(tab => tab.name === activeTab.value)
    if (activeTabData && activeTabData.title) {
      return activeTabData.title
    }
  }
  // Otherwise, use the component's title prop
  return props.title
})

const handleClose = () => {
  visible.value = false
  const element = toolPaletteElement.value
  emit('close', {
    x: element ? element.clientLeft : 0,
    y: element ? element.clientTop : 0
  })
}

// Handle tab change
const handleTabChange = (tabName: string) => {
  emit('tab-change', tabName)
}

// Handle tab close
const handleTabClose = (tabName: string) => {
  emit('tab-close', tabName)
  
  // If closing the active tab, switch to another tab
  if (activeTab.value === tabName && props.tabs) {
    const currentIndex = props.tabs.findIndex(t => t.name === tabName)
    if (currentIndex >= 0) {
      // Try to switch to next tab, or previous if at the end
      const nextTab = props.tabs[currentIndex + 1] || props.tabs[currentIndex - 1]
      if (nextTab) {
        activeTab.value = nextTab.name
      }
    }
  }
}

</script>

<style scoped>
.ml-tool-palette-dialog {
  cursor: default;
  width: 300px;
  min-width: var(--collapsed-width);
  position: fixed;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color);
}

.ml-tool-palette-dialog-icon {
  border-bottom: 1px solid var(--el-border-color);
  cursor: default; /* Override parent move cursor on icon */
}

.ml-tool-palette-dialog-icon:hover {
  color: var(--el-color-primary);
}

.ml-tool-palette-dialog-layout {
  display: flex;
  height: 100%;
}

.ml-tool-palette-title-bar {
  width: var(--collapsed-width);
  display: flex;
  justify-content: left;
  align-items: center;
  cursor: move; /* Draggable cursor on the left part */
  writing-mode: vertical-rl; /* Vertically align the text */
  text-align: center;
  background-color: var(--el-fill-color);
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
}

.ml-tool-palette-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

.ml-tool-palette-tabs :deep(.el-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ml-tool-palette-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
  order: 1;
  flex-shrink: 0;
  position: relative;
}

.ml-tool-palette-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
  padding: 0;
  order: 2;
  min-height: 0;
  position: relative;
}

.ml-tool-palette-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: auto;
}

.ml-tool-palette-default-content {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

/* When direction is 'left' */
.ml-tool-palette-dialog-layout.left .ml-tool-palette-title-bar {
  order: 1;
}

.ml-tool-palette-dialog-layout.left .ml-tool-palette-content {
  order: 2;
}

/* When direction is 'right' */
.ml-tool-palette-dialog-layout.right .ml-tool-palette-title-bar {
  order: 2;
}

.ml-tool-palette-dialog-layout.right .ml-tool-palette-content {
  order: 1;
}
</style>
