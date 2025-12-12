<script setup lang="ts">
import { Menu as IconMenu } from '@element-plus/icons-vue'
import {
  MlDropdownMenuItem,
  MlLanguage,
  MlToolPalette,
  MlToolPaletteTab
} from '@mlightcad/ui-components'
import { ref } from 'vue'
import { reactive } from 'vue'

import { toggleDark } from '~/composables'

const dialogVisible = ref(false)
const toolPaletteVisible = ref<boolean>(true)
const activeTab = ref<string>('blocks')
const data = reactive<MlDropdownMenuItem[]>([
  {
    name: 'en',
    text: 'English'
  },
  {
    name: 'zh',
    text: '中文'
  }
])

const tabs = reactive<MlToolPaletteTab[]>([
  {
    name: 'blocks',
    label: 'Blocks',
    title: 'Blocks Palette'
  },
  {
    name: 'hatches',
    label: 'Hatches',
    title: 'Hatches Palette'
  },
  {
    name: 'tools',
    label: 'Tools',
    title: 'Custom Tools'
  },
  {
    name: 'layers',
    label: 'Layers',
    title: 'Layers Manager'
  },
  {
    name: 'properties',
    label: 'Properties',
    title: 'Properties Panel'
  },
  {
    name: 'styles',
    label: 'Styles',
    title: 'Styles Editor'
  }
])

const handleToolPalette = () => {
  toolPaletteVisible.value = true
}

const handleClicked = () => {
  dialogVisible.value = true
}

const handleTabChange = (tabName: string) => {
  console.log('Tab changed to:', tabName)
}

const handleTabClose = (tabName: string) => {
  console.log('Tab closed:', tabName)
  const index = tabs.findIndex((t: MlToolPaletteTab) => t.name === tabName)
  if (index >= 0) {
    tabs.splice(index, 1)
    // If the closed tab was active, switch to another tab
    if (activeTab.value === tabName && tabs.length > 0) {
      activeTab.value = tabs[0].name
    }
  }
}
</script>

<template>
  <el-menu class="el-menu-demo" mode="horizontal">
    <el-menu-item index="1">MlightCAD</el-menu-item>
    <el-menu-item index="2" @click="handleToolPalette">
      <el-icon><icon-menu /></el-icon>
    </el-menu-item>
    <el-menu-item h="full" @click="toggleDark()">
      <button
        class="border-none w-full bg-transparent cursor-pointer"
        style="height: var(--el-menu-item-height)"
      >
        <i inline-flex i="dark:ep-moon ep-sunny" />
      </button>
    </el-menu-item>
    <el-menu-item>
      <ml-language :languages="data" current="en" />
    </el-menu-item>
  </el-menu>
  <ml-tool-palette
    class="tool-palette"
    v-model="toolPaletteVisible"
    v-model:active-tab="activeTab"
    title="Tool Palette"
    :tabs="tabs"
    :top-offset="60"
    :bottom-offset="30"
    @tab-change="handleTabChange"
    @tab-close="handleTabClose"
  >
    <template #tab-blocks>
      <div class="tool-palette-tab-content">
        <h3>Blocks</h3>
        <p>This is the Blocks tab content.</p>
        <el-button @click="handleClicked">Block 1</el-button>
        <el-button @click="handleClicked">Block 2</el-button>
        <el-button @click="handleClicked">Block 3</el-button>
      </div>
      <el-dialog
        v-model="dialogVisible"
        title="Tips"
        width="400"
        center
        draggable
      >
        <span>This is a message</span>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="dialogVisible = false">Cancel</el-button>
            <el-button type="primary" @click="dialogVisible = false">
              Confirm
            </el-button>
          </div>
        </template>
      </el-dialog>
    </template>
    <template #tab-hatches>
      <div class="tool-palette-tab-content">
        <h3>Hatches</h3>
        <p>This is the Hatches tab content.</p>
        <el-button @click="handleClicked">Hatch Pattern 1</el-button>
        <el-button @click="handleClicked">Hatch Pattern 2</el-button>
        <el-button @click="handleClicked">Hatch Pattern 3</el-button>
      </div>
    </template>
    <template #tab-tools>
      <div class="tool-palette-tab-content">
        <h3>Custom Tools</h3>
        <p>This is the Tools tab content.</p>
        <el-button @click="handleClicked">Custom Tool 1</el-button>
        <el-button @click="handleClicked">Custom Tool 2</el-button>
        <el-button @click="handleClicked">Custom Tool 3</el-button>
      </div>
    </template>
    <template #tab-layers>
      <div class="tool-palette-tab-content">
        <h3>Layers</h3>
        <p>This is the Layers tab content.</p>
        <el-button @click="handleClicked">Layer 1</el-button>
        <el-button @click="handleClicked">Layer 2</el-button>
      </div>
    </template>
    <template #tab-properties>
      <div class="tool-palette-tab-content">
        <h3>Properties</h3>
        <p>This is the Properties tab content.</p>
        <el-button @click="handleClicked">Property 1</el-button>
        <el-button @click="handleClicked">Property 2</el-button>
      </div>
    </template>
    <template #tab-styles>
      <div class="tool-palette-tab-content">
        <h3>Styles</h3>
        <p>This is the Styles tab content.</p>
        <el-button @click="handleClicked">Style 1</el-button>
        <el-button @click="handleClicked">Style 2</el-button>
      </div>
    </template>
  </ml-tool-palette>
</template>

<style scoped>
.tool-palette {
  position: fixed;
  left: 2px;
  top: 150px;
  width: 300px;
  height: 500px;
}

.tool-palette-tab-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-palette-tab-content h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.tool-palette-tab-content p {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
