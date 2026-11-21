<template>
  <div class="ml-overflow-tabs">
    <div class="ml-overflow-tabs-header">
      <div ref="tabsWrapRef" class="ml-overflow-tabs-wrap">
        <div class="ml-overflow-tabs-list" role="tablist">
          <button
            v-for="tab in stripTabs"
            :key="tab.name"
            :ref="
              (el: Element | ComponentPublicInstance | null) =>
                setTabButtonRef(tab.name, el)
            "
            type="button"
            class="ml-overflow-tab"
            role="tab"
            :aria-selected="activeTab === tab.name"
            :class="{
              'is-active': activeTab === tab.name,
              'is-overflow-hidden': isOverflowHidden(tab.name),
              'is-measure-probe': isMeasureProbe(tab.name)
            }"
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
        <!--
          Fixed-width gutter so » never shares pixels with the last title.
          Collapses to 0 when every tab fits.
        -->
        <div
          class="ml-overflow-tabs-more"
          :class="{ 'is-visible': overflowTabIds.length > 0 }"
        >
          <el-dropdown
            v-show="overflowTabIds.length > 0"
            trigger="click"
            teleported
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
        </div>
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
/** Sub-pixel / border slack so the last title never paints under ». */
const LAYOUT_SLACK = 8

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
/**
 * While true, overflow tabs are taken out of flex flow and measured as
 * off-strip probes — never shown in the title bar (that would duplicate the
 * » menu). Overflow ids stay intact so ElDropdown is not torn down mid-click.
 */
const isMeasuring = ref(false)
/**
 * When the active tab was brought in from the » menu (it is not inside the
 * natural leading window), pin it as the rightmost visible tab — same as
 * Chrome DevTools' overflow strip.
 */
const pinActiveToEnd = ref(false)
const tabButtonRefs = new Map<string, HTMLElement>()
/** Last known positive widths; bridges transient 0-width measure frames. */
const tabWidthCache = new Map<string, number>()
/** Widths from the last successful measure; used by clip repair. */
let lastTabWidths = new Map<string, number>()
let tabOverflowFrame: number | undefined
let tabOverflowObserver: ResizeObserver | undefined
let tabOverflowGeneration = 0
let tabOverflowRetries = 0

const overflowTabs = computed(() => {
  // Menu must only list titles that are hidden from the strip.
  return props.tabs.filter(tab => overflowTabIds.value.includes(tab.name))
})

const overflowContainsActive = computed(() => {
  return overflowTabIds.value.includes(activeTab.value)
})

const isOverflowHidden = (name: string) => {
  return !isMeasuring.value && overflowTabIds.value.includes(name)
}

const isMeasureProbe = (name: string) => {
  return isMeasuring.value && overflowTabIds.value.includes(name)
}

/**
 * Render order for the title strip. When a » menu pick is pinned, move that
 * tab to the end of the DOM so it sits immediately left of ». Keep this order
 * while measuring too — flipping back to natural order mid-measure thrashs
 * layout and makes » overlap the last title.
 */
const stripTabs = computed(() => {
  if (!pinActiveToEnd.value) return props.tabs
  const activeId = activeTab.value
  const active = props.tabs.find(tab => tab.name === activeId)
  if (!active) return props.tabs
  return [...props.tabs.filter(tab => tab.name !== activeId), active]
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
  // Drop in-flight measures that still hold a stale overflow snapshot.
  tabOverflowGeneration += 1
  if (activeTab.value !== tabName) {
    activeTab.value = tabName
  }
  // Do not mutate overflowTabIds here: removing the clicked item (or
  // clearing the list in measure) unmounts the open ElDropdown and can
  // swallow the selection. Remeasure reveals the active tab instead.
  rescheduleUpdateTabOverflow({ resetRetries: true })
}

const closeTab = (tabName: string) => {
  emit('tab-close', tabName)
}

/**
 * Chrome DevTools-style strip:
 * - Take a consecutive leading window that fits.
 * - If the active tab is already in that window, keep natural order.
 * - Otherwise pin the active tab as the last visible title (right before »)
 *   and fill the remaining width with a leading prefix — so choosing from
 *   » both activates the tab and makes it the last tab in the title bar.
 */
const computeOverflowLayout = (
  tabList: MlOverflowTab[],
  widths: Map<string, number>,
  availableWidth: number,
  activeId: string
) => {
  const widthOf = (id: string) => widths.get(id) ?? 0

  const leadingWindow: string[] = []
  let used = 0
  for (const tab of tabList) {
    const width = widthOf(tab.name)
    if (width <= 0 || used + width > availableWidth) break
    leadingWindow.push(tab.name)
    used += width
  }

  let visible: string[]
  let pinToEnd = false
  if (leadingWindow.includes(activeId)) {
    // Active already fits in the natural leading strip — keep list order.
    visible = leadingWindow
  } else {
    // » pick (or any late tab): keep a leading prefix, then the active tab
    // as the final visible title immediately before ».
    pinToEnd = true
    const activeWidth = widthOf(activeId)
    const budget = Math.max(0, availableWidth - activeWidth)
    const lead: string[] = []
    used = 0
    for (const tab of tabList) {
      if (tab.name === activeId) continue
      const width = widthOf(tab.name)
      if (width <= 0 || used + width > budget) break
      lead.push(tab.name)
      used += width
    }
    visible = [...lead, activeId]
  }

  const visibleSet = new Set(visible)
  return {
    overflowIds: tabList
      .filter(tab => !visibleSet.has(tab.name))
      .map(tab => tab.name),
    pinActiveToEnd: pinToEnd
  }
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

const readActionsWidth = () => {
  const el = actionsRef.value
  if (el?.isConnected) {
    const width = el.getBoundingClientRect().width
    if (width > 0) return width
  }
  return resolvedActionsWidth.value
}

const updateTabOverflow = async () => {
  const generation = ++tabOverflowGeneration
  const wrap = tabsWrapRef.value
  const tabList = props.tabs
  pruneTabButtonRefs(tabList)
  if (!wrap || tabList.length === 0) {
    overflowTabIds.value = []
    pinActiveToEnd.value = false
    isMeasuring.value = false
    return
  }

  // Probe overflow tabs off-flow (see is-measure-probe) so they never flash
  // into the title bar while still listed in the » menu.
  isMeasuring.value = true
  try {
    await nextTick()
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })
    if (generation !== tabOverflowGeneration) return

    const wrapWidth = wrap.clientWidth
    if (wrapWidth <= 0) return

    const widths = new Map(
      tabList.map(tab => [tab.name, readTabWidth(tab.name)])
    )
    // No live or cached width yet (hidden tab / mid-rebind). Retry a few frames
    // instead of laying out from zeros, which would hide the chosen tab.
    const missingWidth = tabList.some(tab => (widths.get(tab.name) ?? 0) <= 0)
    if (missingWidth) {
      if (tabOverflowRetries < 4) {
        tabOverflowRetries += 1
        rescheduleUpdateTabOverflow({ resetRetries: false })
        return
      }
      // Give up this pass; keep the prior strip rather than showing a broken one.
      tabOverflowRetries = 0
      return
    }
    tabOverflowRetries = 0
    lastTabWidths = widths

    const totalWidth = tabList.reduce(
      (sum, tab) => sum + (widths.get(tab.name) ?? 0),
      0
    )

    // Budget from the wrap, not list.clientWidth — list size depends on whether
    // the » gutter is open and caused » to overlap the last title.
    const actionsWidth = readActionsWidth()
    const innerWidth = Math.max(0, wrapWidth - actionsWidth)

    if (totalWidth <= innerWidth) {
      if (generation !== tabOverflowGeneration) return
      overflowTabIds.value = []
      pinActiveToEnd.value = false
      return
    }

    const activeId = activeTab.value || tabList[0].name
    const availableWidth = Math.max(
      0,
      innerWidth - OVERFLOW_BTN_WIDTH - LAYOUT_SLACK
    )

    if (generation !== tabOverflowGeneration) return
    const layout = computeOverflowLayout(
      tabList,
      widths,
      availableWidth,
      activeId
    )
    overflowTabIds.value = layout.overflowIds
    pinActiveToEnd.value = layout.pinActiveToEnd

    // Clip checks need the real hidden set (probes off).
    isMeasuring.value = false
    await nextTick()
    if (generation !== tabOverflowGeneration) return
    await revealActiveTabIfClipped(wrap, tabList, generation)
  } finally {
    // Always release the measuring flag for this generation. Leaving it stuck
    // true (early return before the old try block) put overflow titles back
    // into the strip while they were still in the » menu.
    if (generation === tabOverflowGeneration) {
      isMeasuring.value = false
    }
  }
}

/**
 * After the overflow gutter opens, the active tab can still sit under the
 * list's right edge. Recompute with a tighter budget (same Chrome-style layout).
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
    if (
      !activeEl ||
      activeEl.classList.contains('is-overflow-hidden') ||
      !activeEl.isConnected
    ) {
      return
    }
    const listRight = list.getBoundingClientRect().right
    const tabRight = activeEl.getBoundingClientRect().right
    const overflowPx = tabRight - listRight
    if (overflowPx <= 1) return
    const tighter = Math.max(
      0,
      list.clientWidth - overflowPx - LAYOUT_SLACK
    )
    const layout = computeOverflowLayout(
      tabList,
      lastTabWidths,
      tighter,
      activeId || tabList[0].name
    )
    overflowTabIds.value = layout.overflowIds
    pinActiveToEnd.value = layout.pinActiveToEnd
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
  position: relative;
}

.ml-overflow-tabs-more {
  flex: 0 0 0;
  width: 0;
  min-width: 0;
  overflow: hidden;
  align-self: stretch;
}

.ml-overflow-tabs-more.is-visible {
  flex: 0 0 28px;
  width: 28px;
  overflow: visible;
}

.ml-overflow-tabs-more :deep(.el-dropdown) {
  display: inline-flex;
  width: 100%;
  height: 100%;
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

.ml-overflow-tab.is-overflow-hidden {
  display: none !important;
}

/* Off-flow width probe — must not occupy strip space or appear beside ». */
.ml-overflow-tab.is-measure-probe {
  position: absolute;
  left: 0;
  top: 0;
  visibility: hidden;
  pointer-events: none;
  display: inline-flex !important;
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
