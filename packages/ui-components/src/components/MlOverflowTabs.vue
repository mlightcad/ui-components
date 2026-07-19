<template>
  <div class="ml-overflow-tabs">
    <div class="ml-overflow-tabs-header">
      <div ref="tabsWrapRef" class="ml-overflow-tabs-wrap">
        <div class="ml-overflow-tabs-list" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            :ref="
              (el: Element | ComponentPublicInstance | null) =>
                setTabButtonRef(tab.name, el)
            "
            type="button"
            class="ml-overflow-tab"
            role="tab"
            :hidden="overflowTabIds.includes(tab.name)"
            :aria-selected="activeTab === tab.name"
            :class="{ 'is-active': activeTab === tab.name }"
            @click="selectTab(tab.name)"
          >
            <span class="ml-overflow-tab-label">{{ tab.label }}</span>
            <span
              v-if="isTabClosable(tab)"
              class="ml-overflow-tab-close"
              role="button"
              tabindex="-1"
              :title="resolvedCloseTabLabel"
              :aria-label="resolvedCloseTabLabel"
              @click.stop="closeTab(tab.name)"
            >
              ×
            </span>
          </button>
        </div>
        <el-dropdown
          v-show="overflowTabIds.length > 0"
          trigger="click"
          @command="selectTab"
        >
          <button
            type="button"
            class="ml-overflow-tab-overflow-btn"
            :class="{ 'is-active': overflowContainsActive }"
            :title="resolvedMoreTabsLabel"
            :aria-label="resolvedMoreTabsLabel"
          >
            »
          </button>
          <template #dropdown>
            <el-dropdown-menu class="ml-overflow-tab-overflow-menu">
              <el-dropdown-item
                v-for="tab in overflowTabs"
                :key="tab.name"
                :command="tab.name"
                :class="{ 'is-selected': activeTab === tab.name }"
              >
                <span class="ml-overflow-tab-overflow-item">
                  <span class="ml-overflow-tab-label">{{ tab.label }}</span>
                  <span
                    v-if="isTabClosable(tab)"
                    class="ml-overflow-tab-close"
                    role="button"
                    tabindex="-1"
                    :title="resolvedCloseTabLabel"
                    :aria-label="resolvedCloseTabLabel"
                    @click.stop.prevent="closeTab(tab.name)"
                  >
                    ×
                  </span>
                </span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div
          v-if="hasActions"
          ref="actionsRef"
          class="ml-overflow-tabs-actions"
        >
          <slot name="actions" />
        </div>
      </div>
    </div>
    <div class="ml-overflow-tabs-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch
} from 'vue'

import type { MlOverflowTab } from './MlOverflowTab'

export type { MlOverflowTab } from './MlOverflowTab'

const OVERFLOW_BTN_WIDTH = 28
const DEFAULT_ACTIONS_WIDTH = 28

const props = withDefaults(
  defineProps<{
    tabs: MlOverflowTab[]
    /** Optional aria/title for the overflow button. */
    moreTabsLabel?: string
    /** Optional aria/title for tab close buttons. */
    closeTabLabel?: string
    /**
     * Show close buttons on tabs. Individual tabs can override via
     * {@link MlOverflowTab.closable}.
     */
    closable?: boolean
    /**
     * Reserved width (px) for the trailing `#actions` slot when measuring
     * overflow. Defaults to 28 when the slot is used.
     */
    actionsWidth?: number
  }>(),
  {
    moreTabsLabel: 'More tabs',
    closeTabLabel: 'Close tab',
    closable: false,
    actionsWidth: undefined
  }
)

const emit = defineEmits<{
  (e: 'tab-close', tabName: string): void
}>()

const activeTab = defineModel<string>({ default: '' })
const slots = useSlots()

const hasActions = computed(() => !!slots.actions)

const resolvedMoreTabsLabel = computed(
  () => props.moreTabsLabel || 'More tabs'
)

const resolvedCloseTabLabel = computed(
  () => props.closeTabLabel || 'Close tab'
)

const resolvedActionsWidth = computed(() => {
  if (!hasActions.value) return 0
  return props.actionsWidth ?? DEFAULT_ACTIONS_WIDTH
})

const tabsWrapRef = ref<HTMLElement | null>(null)
const actionsRef = ref<HTMLElement | null>(null)
const overflowTabIds = ref<string[]>([])
const tabButtonRefs = new Map<string, HTMLElement>()
let tabOverflowFrame: number | undefined
let tabOverflowObserver: ResizeObserver | undefined

const overflowTabs = computed(() => {
  return props.tabs.filter(tab => overflowTabIds.value.includes(tab.name))
})

const overflowContainsActive = computed(() => {
  return overflowTabIds.value.includes(activeTab.value)
})

const setTabButtonRef = (name: string, el: unknown) => {
  if (el instanceof HTMLElement) {
    tabButtonRefs.set(name, el)
  } else {
    tabButtonRefs.delete(name)
  }
}

const isTabClosable = (tab: MlOverflowTab) => {
  return tab.closable ?? props.closable
}

const selectTab = (tabName: string) => {
  activeTab.value = tabName
}

const closeTab = (tabName: string) => {
  emit('tab-close', tabName)
}

const scheduleUpdateTabOverflow = () => {
  if (tabOverflowFrame !== undefined) return
  tabOverflowFrame = requestAnimationFrame(() => {
    tabOverflowFrame = undefined
    void updateTabOverflow()
  })
}

const updateTabOverflow = async () => {
  const wrap = tabsWrapRef.value
  const tabList = props.tabs
  if (!wrap || tabList.length === 0) {
    overflowTabIds.value = []
    return
  }

  // Measure with all tabs visible (same approach as dock panel).
  overflowTabIds.value = []
  await nextTick()

  const wrapWidth = wrap.clientWidth
  if (wrapWidth <= 0) return

  const actionsWidth =
    actionsRef.value?.offsetWidth || resolvedActionsWidth.value

  const widths = new Map(
    tabList.map(tab => [
      tab.name,
      tabButtonRefs.get(tab.name)?.offsetWidth ?? 0
    ])
  )
  const totalWidth = tabList.reduce(
    (sum, tab) => sum + (widths.get(tab.name) ?? 0),
    0
  )

  if (totalWidth + actionsWidth <= wrapWidth) {
    overflowTabIds.value = []
    return
  }

  const activeId = activeTab.value || tabList[0].name
  const availableWidth = wrapWidth - OVERFLOW_BTN_WIDTH - actionsWidth
  const visible = new Set(tabList.map(tab => tab.name))
  const hidden = new Set<string>()

  const sumVisibleWidth = () =>
    tabList
      .filter(tab => visible.has(tab.name))
      .reduce((sum, tab) => sum + (widths.get(tab.name) ?? 0), 0)

  while (visible.size > 1 && sumVisibleWidth() > availableWidth) {
    let hideId: string | undefined
    for (let index = tabList.length - 1; index >= 0; index -= 1) {
      const id = tabList[index].name
      if (id === activeId || !visible.has(id)) continue
      hideId = id
      break
    }
    if (!hideId) break
    visible.delete(hideId)
    hidden.add(hideId)
  }

  if (!visible.has(activeId)) {
    hidden.delete(activeId)
    visible.add(activeId)
    while (visible.size > 1 && sumVisibleWidth() > availableWidth) {
      let hideId: string | undefined
      for (let index = tabList.length - 1; index >= 0; index -= 1) {
        const id = tabList[index].name
        if (id === activeId || !visible.has(id)) continue
        hideId = id
        break
      }
      if (!hideId) break
      visible.delete(hideId)
      hidden.add(hideId)
    }
  }

  overflowTabIds.value = tabList
    .filter(tab => hidden.has(tab.name))
    .map(tab => tab.name)
}

watch(
  [activeTab, () => props.tabs, resolvedActionsWidth, () => props.closable],
  ([current, tabList]) => {
    if (tabList.length > 0 && !tabList.some(tab => tab.name === current)) {
      activeTab.value = tabList[0].name
    }
    scheduleUpdateTabOverflow()
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  if (!tabsWrapRef.value) return
  tabOverflowObserver = new ResizeObserver(() => {
    scheduleUpdateTabOverflow()
  })
  tabOverflowObserver.observe(tabsWrapRef.value)
  if (actionsRef.value) {
    tabOverflowObserver.observe(actionsRef.value)
  }
  scheduleUpdateTabOverflow()
})

onBeforeUnmount(() => {
  if (tabOverflowFrame !== undefined) {
    cancelAnimationFrame(tabOverflowFrame)
    tabOverflowFrame = undefined
  }
  tabOverflowObserver?.disconnect()
  tabOverflowObserver = undefined
})
</script>

<style scoped>
.ml-overflow-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.ml-overflow-tabs-header {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--el-border-color, #dcdfe6);
  background: var(--el-bg-color, #ffffff);
  min-height: 28px;
}

.ml-overflow-tabs-wrap {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-width: 0;
}

.ml-overflow-tabs-list {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.ml-overflow-tabs-wrap :deep(.el-dropdown) {
  flex: 0 0 auto;
  display: inline-flex;
  align-self: stretch;
}

.ml-overflow-tabs-actions {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: stretch;
  align-self: stretch;
}

.ml-overflow-tab {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--el-text-color-secondary, #606266);
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.ml-overflow-tab[hidden] {
  display: none;
}

.ml-overflow-tab:hover {
  color: var(--el-text-color-primary, #303133);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
}

.ml-overflow-tab.is-active {
  color: var(--el-text-color-primary, #303133);
  border-bottom-color: var(--el-color-primary, #409eff);
}

.ml-overflow-tab-label {
  min-width: 0;
}

.ml-overflow-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  font-size: 14px;
  line-height: 1;
  color: var(--el-text-color-secondary, #606266);
  cursor: pointer;
}

.ml-overflow-tab-close:hover {
  color: var(--el-color-primary, #409eff);
  background: var(--el-fill-color, rgba(0, 0, 0, 0.06));
}

.ml-overflow-tab-overflow-item {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.ml-overflow-tab-overflow-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 100%;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--el-text-color-secondary, #606266);
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.ml-overflow-tab-overflow-btn:hover,
.ml-overflow-tab-overflow-btn.is-active {
  color: var(--el-text-color-primary, #303133);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
}

.ml-overflow-tab-overflow-btn.is-active {
  border-bottom-color: var(--el-color-primary, #409eff);
}

.ml-overflow-tabs-body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style>

<style>
.ml-overflow-tab-overflow-menu .el-dropdown-menu__item.is-selected {
  color: var(--el-color-primary, #409eff);
}
</style>
