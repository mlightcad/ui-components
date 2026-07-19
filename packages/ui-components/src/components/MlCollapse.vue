<template>
  <el-icon :size="iconSize" @click="handleClicked">
    <component :is="icon" />
  </el-icon>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import arrowDown from '../svgs/arrow-down.svg'
import arrowLeft from '../svgs/arrow-left.svg'
import arrowRight from '../svgs/arrow-right.svg'
import arrowUp from '../svgs/arrow-up.svg'

/**
 * Properties of MlCllapse component
 */
interface Props {
  /**
   * Size of collapse icon
   */
  size?: number
  /**
   * Flag whether to reverse direction of icon
   * - horizontal: reverse left/right (right-docked)
   * - vertical: reverse up/down (bottom-docked)
   */
  reverse?: boolean
  /**
   * Arrow axis. Use `vertical` when the palette is docked to top/bottom.
   */
  direction?: 'horizontal' | 'vertical'
}

interface Events {
  /**
   * Trigger this event when collapse icon state changed.
   * @param isCollapsed New collapse icon state
   */
  (e: 'change', isCollapsed: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 18,
  reverse: false,
  direction: 'horizontal'
})
const isCollapsed = defineModel({ default: true })
const emit = defineEmits<Events>()

const icon = computed(() => {
  if (props.direction === 'vertical') {
    // Top dock: collapsed → down (expand), expanded → up (collapse)
    // Bottom dock (reverse): collapsed → up, expanded → down
    if (props.reverse) {
      return isCollapsed.value ? arrowUp : arrowDown
    }
    return isCollapsed.value ? arrowDown : arrowUp
  }
  if (props.reverse) {
    return isCollapsed.value ? arrowLeft : arrowRight
  }
  return isCollapsed.value ? arrowRight : arrowLeft
})

// Icon size
const iconSize = computed(() => {
  return `${props.size}px`
})

const handleClicked = () => {
  emit('change', isCollapsed.value)
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped></style>
