<script setup lang="ts">
import {
  CopyDocument,
  Delete,
  DocumentChecked,
  Edit,
  Scissor,
  Search,
  ZoomIn,
  ZoomOut
} from '@element-plus/icons-vue'
import {
  MlButtonData,
  MlStatusBar,
  MlToggleButton,
  MlToggleButtonData,
  MlToolBar
} from '@mlightcad/ui-components'
import { useFullscreen } from '@vueuse/core'
import { markRaw, reactive, ref } from 'vue'

import fullScreen from '../svgs/full-screen.svg'

const { isFullscreen, toggle } = useFullscreen()

const toolBarData = reactive<MlButtonData[]>([
  /**
   * =========================
   * Edit (has sub toolbar)
   * =========================
   */
  {
    icon: markRaw(Edit),
    text: 'Edit',
    description: 'Edit related operations',
    children: [
      {
        icon: markRaw(CopyDocument),
        text: 'Copy',
        command: 'edit.copy',
        description: 'Copy selected entities'
      },
      {
        icon: markRaw(Scissor),
        text: 'Cut',
        command: 'edit.cut',
        description: 'Cut selected entities'
      },
      {
        icon: markRaw(DocumentChecked),
        text: 'Paste',
        command: 'edit.paste',
        description: 'Paste from clipboard'
      }
    ]
  },

  /**
   * =========================
   * Delete (single action)
   * =========================
   */
  {
    icon: markRaw(Delete),
    text: 'Delete',
    command: 'delete',
    description: 'Delete selected entities'
  },

  /**
   * =========================
   * Search / Zoom (has sub toolbar)
   * =========================
   */
  {
    icon: markRaw(Search),
    text: 'Search',
    description: 'Search & navigation tools',
    children: [
      {
        icon: markRaw(Search),
        text: 'Find',
        command: 'search.find',
        description: 'Find entities by property'
      },
      {
        icon: markRaw(ZoomIn),
        text: 'Zoom In',
        command: 'view.zoomIn',
        description: 'Zoom in drawing'
      },
      {
        icon: markRaw(ZoomOut),
        text: 'Zoom Out',
        command: 'view.zoomOut',
        description: 'Zoom out drawing'
      }
    ]
  }
])

const statusBarData = [
  {
    label: 'model',
    value: 'model'
  },
  {
    label: 'layout 1',
    value: 'layout1'
  },
  {
    label: 'layout 2',
    value: 'layout2'
  }
]

const toggleFullScreenButtonData: MlToggleButtonData = {
  onIcon: fullScreen,
  offIcon: fullScreen,
  onTooltip: 'Click to quit full screen mode',
  offTooltip: 'Click to switch to full screen mode'
}

const currentModel = ref('model')

const handleCommand = (command: string) => {
  console.log(command)
}
</script>

<template>
  <ml-tool-bar
    class="horizontal-toolbar-container"
    :items="toolBarData"
    direction="horizontal"
    @click="handleCommand"
  />
  <ml-tool-bar
    class="vertical-toolbar-container"
    :items="toolBarData"
    direction="vertical"
    size="small"
    @click="handleCommand"
  />
  <ml-status-bar>
    <!-- Left Slot Content -->
    <template #left>
      <el-segmented v-model="currentModel" :options="statusBarData" />
    </template>

    <!-- Right Slot Content -->
    <template #right>
      <ml-toggle-button
        :v-model="!isFullscreen"
        :data="toggleFullScreenButtonData"
        @click="toggle"
      />
    </template>
  </ml-status-bar>
</template>

<style scoped>
.horizontal-toolbar-container {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
}

.vertical-toolbar-container {
  position: fixed;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
