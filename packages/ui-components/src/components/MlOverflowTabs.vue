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
                @click="selectTab(tab.name)"
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

import { useLocale } from '../locale'
import type { MlOverflowTab } from './MlOverflowTab'

export type { MlOverflowTab } from './MlOverflowTab'

const OVERFLOW_BTN_WIDTH = 28
const DEFAULT_ACTIONS_WIDTH = 28

const props = withDefaults(
  defineProps<{
    tabs: MlOverflowTab[]
    /**
     * Optional aria/title for the overflow button.
     * Falls back to the current locale (`overflowTabs.moreTabs`).
     */
    moreTabsLabel?: string
    /**
     * Optional aria/title for tab close buttons.
     * Falls back to the current locale (`overflowTabs.closeTab`).
     */
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
    moreTabsLabel: undefined,
    closeTabLabel: undefined,
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

const { locale } = useLocale()

const resolvedMoreTabsLabel = computed(
  () => props.moreTabsLabel ?? locale.value.overflowTabs.moreTabs
)

const resolvedCloseTabLabel = computed(
  () => props.closeTabLabel ?? locale.value.overflowTabs.closeTab
)

const resolvedActionsWidth = computed(() => {
  if (!hasActions.value) return 0
  return props.actionsWidth ?? DEFAULT_ACTIONS_WIDTH
})

const tabsWrapRef = ref<HTMLElement | null>(null)
const actionsRef = ref<HTMLElement | null>(null)
const overflowTabIds = ref<string[]>([])
const tabButtonRefs = new Map<string, HTMLElement>()
/** Last known positive widths; bridges transient 0-width measure frames. */
const tabWidthCache = new Map<string, number>()
let tabOverflowFrame: number | undefined
let tabOverflowObserver: ResizeObserver | undefined
let tabOverflowGeneration = 0
let tabOverflowRetries = 0

const overflowTabs = computed(() => {
  return props.tabs.filter(tab => overflowTabIds.value.includes(tab.name))
})

const overflowContainsActive = computed(() => {
  return overflowTabIds.value.includes(activeTab.value)
})

const setTabButtonRef = (name: string, el: unknown) => {
  // Vue calls the previous inline ref with null when its identity changes.
  // Deleting here drops a button that the next measure still needs.
  if (el instanceof HTMLElement) tabButtonRefs.set(name, el)
}

const pruneTabButtonRefs = (tabList: MlOverflowTab[]) => {
  const names = new Set(tabList.map(tab => tab.name))
  for (const name of [...tabButtonRefs.keys()]) {
    if (names.has(name)) continue
    tabButtonRefs.delete(name)
    tabWidthCache.delete(name)
  }
}

const readTabWidth = (name: string) => {
  const el = tabButtonRefs.get(name)
  // Detached nodes (stale refs between null/rebind) report 0.
  const live = el?.isConnected ? el.offsetWidth : 0
  if (live > 0) {
    tabWidthCache.set(name, live)
    return live
  }
  return tabWidthCache.get(name) ?? 0
}

const isTabClosable = (tab: MlOverflowTab) => {
  return tab.closable ?? props.closable
}

const selectTab = (tabName: unknown) => {
  // ElDropdown @command may forward (command, instance, event); only the
  // command string is meaningful here.
  if (typeof tabName !== 'string') return
  if (!props.tabs.some(tab => tab.name === tabName)) return
  // Show the chosen tab before the async measure. Selecting the tab that
  // is already active does not notify the watcher, so a tab left in the
  // overflow menu would otherwise stay hidden.
  if (overflowTabIds.value.includes(tabName)) {
    overflowTabIds.value = overflowTabIds.value.filter(id => id !== tabName)
  }
  if (activeTab.value !== tabName) {
    activeTab.value = tabName
  }
  // Always remeasure: same-value selects still need the active tab unhidden.
  rescheduleUpdateTabOverflow({ resetRetries: true })
}

const closeTab = (tabName: string) => {
  emit('tab-close', tabName)
}

const scheduleUpdateTabOverflow = (options?: { resetRetries?: boolean }) => {
  if (options?.resetRetries !== false) tabOverflowRetries = 0
  if (tabOverflowFrame !== undefined) return
  tabOverflowFrame = requestAnimationFrame(() => {
    tabOverflowFrame = undefined
    void updateTabOverflow()
  })
}

const rescheduleUpdateTabOverflow = (options?: { resetRetries?: boolean }) => {
  if (tabOverflowFrame !== undefined) {
    cancelAnimationFrame(tabOverflowFrame)
    tabOverflowFrame = undefined
  }
  scheduleUpdateTabOverflow(options)
}

const updateTabOverflow = async () => {
  const generation = ++tabOverflowGeneration
  const wrap = tabsWrapRef.value
  const tabList = props.tabs
  pruneTabButtonRefs(tabList)
  if (!wrap || tabList.length === 0) {
    overflowTabIds.value = []
    return
  }

  const previousOverflow = overflowTabIds.value
  // Measure with all tabs visible (same approach as dock panel).
  overflowTabIds.value = []
  await nextTick()
  // A newer selection started while we were waiting. Its pass owns the result.
  if (generation !== tabOverflowGeneration) return

  const wrapWidth = wrap.clientWidth
  if (wrapWidth <= 0) {
    overflowTabIds.value = previousOverflow
    return
  }

  const actionsWidth =
    actionsRef.value?.offsetWidth || resolvedActionsWidth.value

  const widths = new Map(tabList.map(tab => [tab.name, readTabWidth(tab.name)]))
  // No live or cached width yet (hidden tab / mid-rebind). Retry a few frames
  // instead of laying out from zeros, which would hide the chosen tab.
  const missingWidth = tabList.some(tab => (widths.get(tab.name) ?? 0) <= 0)
  if (missingWidth) {
    if (tabOverflowRetries < 4) {
      tabOverflowRetries += 1
      overflowTabIds.value = previousOverflow
      rescheduleUpdateTabOverflow({ resetRetries: false })
      return
    }
    // Give up this pass; keep the prior strip rather than showing a broken one.
    tabOverflowRetries = 0
    overflowTabIds.value = previousOverflow
    return
  }
  tabOverflowRetries = 0

  const totalWidth = tabList.reduce(
    (sum, tab) => sum + (widths.get(tab.name) ?? 0),
    0
  )

  if (totalWidth + actionsWidth <= wrapWidth) {
    if (generation !== tabOverflowGeneration) return
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

  if (generation !== tabOverflowGeneration) return
  overflowTabIds.value = tabList
    .filter(tab => hidden.has(tab.name))
    .map(tab => tab.name)

  await nextTick()
  if (generation !== tabOverflowGeneration) return
  await revealActiveTabIfClipped(wrap, tabList, generation)
}

/**
 * The overflow button is hidden while tabs are measured, then shown again.
 * If that button is wider than the reserved slot, the active tab can stay
 * clipped. Keep hiding leading tabs until it fits (or nothing else can hide).
 */
const revealActiveTabIfClipped = async (
  wrap: HTMLElement,
  tabList: MlOverflowTab[],
  generation: number
) => {
  const list = wrap.querySelector<HTMLElement>('.ml-overflow-tabs-list')
  if (!list) return

  for (let step = 0; step < tabList.length; step += 1) {
    if (generation !== tabOverflowGeneration) return
    const activeId = activeTab.value
    const activeEl = activeId ? tabButtonRefs.get(activeId) : undefined
    if (!activeEl || activeEl.hidden) return
    const listRight = list.getBoundingClientRect().right
    const tabRight = activeEl.getBoundingClientRect().right
    if (tabRight <= listRight + 1) return
    const leftmost = tabList.find(
      tab => tab.name !== activeId && !overflowTabIds.value.includes(tab.name)
    )
    if (!leftmost) return
    overflowTabIds.value = [...overflowTabIds.value, leftmost.name]
    await nextTick()
  }
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
  tabOverflowGeneration += 1
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
