<script setup lang="ts">
import {
  Aim,
  CopyDocument,
  Crop,
  Delete,
  DocumentChecked,
  Edit,
  EditPen,
  FullScreen,
  Hide,
  Minus,
  ScaleToOriginal,
  Scissor,
  View,
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
   * Draw (sticky + followChild)
   * Parent button toggles the sub-toolbar. Clicking the canvas does not
   * close it. Choosing a child updates selectedCommand on this item, so
   * both toolbars that share toolBarData stay in sync.
   * =========================
   */
  {
    icon: markRaw(EditPen),
    text: 'Draw',
    description: 'Sticky drawing tools — click to pin, click again to close',
    childrenType: 'sticky',
    followChild: true,
    selectedCommand: 'draw.line',
    children: [
      {
        icon: markRaw(Minus),
        text: 'Line',
        command: 'draw.line',
        description: 'Draw a line'
      },
      {
        icon: markRaw(Crop),
        text: 'Rect',
        command: 'draw.rect',
        description: 'Draw a rectangle'
      },
      {
        icon: markRaw(Aim),
        text: 'Circle',
        command: 'draw.circle',
        description: 'Draw a circle'
      }
    ]
  },

  /**
   * =========================
   * Edit (dismissible sub-toolbar)
   * Clicking the canvas or another area closes it.
   * =========================
   */
  {
    icon: markRaw(Edit),
    text: 'Edit',
    description: 'Dismissible edit tools — click canvas to close',
    childrenType: 'dismissible',
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

  { type: 'separator' },

  /**
   * =========================
   * Visibility (toggle button)
   * =========================
   */
  {
    command: 'view.visibility',
    toggle: {
      value: true, // initial state: visible
      on: {
        icon: markRaw(View),
        text: 'Show',
        description: 'Show entity'
      },
      off: {
        icon: markRaw(Hide),
        text: 'Hide',
        description: 'Hide entity'
      }
    }
  },

  /**
   * =========================
   * View (popover menu + followChild)
   * Shows a menu instead of a toolbar. Clicking the canvas closes it.
   * selectedCommand is shared via toolBarData with the other toolbar.
   * =========================
   */
  {
    icon: markRaw(ZoomIn),
    text: 'View',
    description: 'View commands as a popover menu',
    childrenType: 'menu',
    followChild: true,
    selectedCommand: 'view.zoomIn',
    children: [
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
      },
      { type: 'separator' },
      {
        icon: markRaw(FullScreen),
        text: 'Fit',
        command: 'view.fit',
        description: 'Fit drawing to view'
      },
      {
        icon: markRaw(ScaleToOriginal),
        text: 'Actual',
        command: 'view.actual',
        description: 'Zoom to actual size'
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

const handleCommand = (cmd: string) => {
  console.log(cmd)
}

const handleToggle = (cmd: string, value: boolean) => {
  if (cmd === 'view.visibility') {
    console.log('visibility: ', value)
  }
}
</script>

<template>
  <ml-tool-bar
    class="horizontal-toolbar-container"
    :items="toolBarData"
    direction="horizontal"
    placement="top"
    collapsible
    @click="handleCommand"
    @toggle="handleToggle"
  />
  <ml-tool-bar
    class="vertical-toolbar-container"
    :items="toolBarData"
    direction="vertical"
    placement="left"
    size="small"
    collapsible
    @click="handleCommand"
    @toggle="handleToggle"
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
