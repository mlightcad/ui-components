# Common UI Component Libaray

This is one common UI component library based on Element Plus.

## Components

The following components are included in this package.

- Tool Palette: one dockable, resizable, and floating window, which is quite similar to AutoCAD Tool Palette.
- Toolbar: one toolbar which can be easily customized by one array of button data.

[**🌐 Live Demo**](https://mlightcad.gitlab.io/ui-components/).

### Tool Palette

AutoCAD uses [tool palettes](https://help.autodesk.com/view/ACD/2025/ENU/?guid=GUID-167A8594-92CB-4FCC-B72C-0F546383E97C) to organize blocks, hatches, and custom tools in a tabbed window. Tool Palette component is quite similar to one in AutoCAD. It supports the following features.

- Dockable: dock to the left or right side of the window
- Folderable: roll open or closed as your need
- Auto-hide: roll open and closed as the cursor moves across it. When this option is cleared, the full tool palette stays open continuously.

<img src="./doc/palette.jpg" alt="Tool Palette Example">

You can customize tool palette by the following properties.

```javascript
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
```

Tabs in tool palette are described by the following data structure.

```javascript
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
```

Four `offsetXXX` properties are used to set the minimum distance from the side of the tool palette to the side of the window. It is quite useful if you want the tool palette is shown within certain area. For example, one web page has one title bar at the top of window, one status bar at the bottom of window, and one canvas area between the title bar and the status bar. The height of the title bar is 60px and the height of the status bar is 20px. Then you can set `topOffset` to 60 and `bottomOffset` to 20 to let the tool palette are shown and moved within canvas area only.

#### Basic Usage

```javascript
<script lang="ts" setup>
import { MlToolPalette } from '@mlightcad/ui-components'
const toolPaletteVisible = ref<boolean>(false)
</script>

<template>
  <ml-tool-palette
    class="tool-palette"
    v-model="toolPaletteVisible"
    title="Tool Palette Test"
    :top-offset="60"
    :bottom-offset="20"
  >
    <span>Tool Palette Test</span>
  </ml-tool-palette>
</template>

<style scoped>
.tool-palette {
  position: fixed;
  top: 55px;
  width: 400px;
}
</style>
```

#### Using Tabs

Tool Palette supports multiple tabs to organize different content. Each tab can have its own content and title. When a tab becomes active, its `title` (if provided) will be displayed in the title bar of the tool palette.

```javascript
<script lang="ts" setup>
import { MlToolPalette, MlToolPaletteTab } from '@mlightcad/ui-components'
import { ref, reactive } from 'vue'

const toolPaletteVisible = ref<boolean>(true)
const activeTab = ref<string>('blocks')

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
  }
])

const handleTabChange = (tabName: string) => {
  console.log('Tab changed to:', tabName)
}

const handleTabClose = (tabName: string) => {
  console.log('Tab closed:', tabName)
  const index = tabs.findIndex(t => t.name === tabName)
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
  <ml-tool-palette
    class="tool-palette"
    v-model="toolPaletteVisible"
    v-model:active-tab="activeTab"
    title="Tool Palette"
    :tabs="tabs"
    :top-offset="60"
    :bottom-offset="20"
    @tab-change="handleTabChange"
    @tab-close="handleTabClose"
  >
    <template #tab-blocks>
      <div class="tab-content">
        <h3>Blocks</h3>
        <p>This is the Blocks tab content.</p>
        <el-button>Block 1</el-button>
        <el-button>Block 2</el-button>
      </div>
    </template>
    <template #tab-hatches>
      <div class="tab-content">
        <h3>Hatches</h3>
        <p>This is the Hatches tab content.</p>
        <el-button>Hatch Pattern 1</el-button>
        <el-button>Hatch Pattern 2</el-button>
      </div>
    </template>
    <template #tab-tools>
      <div class="tab-content">
        <h3>Custom Tools</h3>
        <p>This is the Tools tab content.</p>
        <el-button>Custom Tool 1</el-button>
        <el-button>Custom Tool 2</el-button>
      </div>
    </template>
  </ml-tool-palette>
</template>

<style scoped>
.tool-palette {
  position: fixed;
  top: 55px;
  width: 400px;
  height: 500px;
}

.tab-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
```

**Tab Features:**

- **Closeable tabs**: Each tab has a close icon that can be clicked to close the tab
- **Active tab title**: When a tab is active, its `title` property (if provided) is displayed in the title bar
- **Tab switching**: Use `v-model:active-tab` to control which tab is active
- **Tab events**:
  - `@tab-change`: Emitted when the active tab changes
  - `@tab-close`: Emitted when a tab is closed
- **Tab content**: Use named slots `#tab-{name}` to provide content for each tab
- **Overflow handling**: When there are many tabs, Element Plus automatically handles overflow with a dropdown menu

### Toolbar

Toolbar component has the following features.

- Define button list by one array of `MlButtonData`
- Arrange button vertically or horizontally
- Support three kinds of button size
- **Support toggle buttons with two states (on / off)**
- **Support sub-toolbars** with an AutoCAD-style corner flyout mark that scales with button size
- **Support three child presentations**: sticky toolbar, dismissible toolbar, and popover menu
- **Support `followChild`**: parent button icon/text follow the selected child
- **Support separators between buttons**
- **Optionally support collapsing / expanding the toolbar**

<img src="./doc/toolbar.jpg" width="423" height="223" alt="Toolbar Example">

Features above can be customized by the following properties.

```
/**
 * Properties of MLToolBar component
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
   * Placement of the sub-toolbar popover, and of the parent-button flyout mark.
   * Use the side toward the canvas (opposite the toolbar dock): right dock →
   * `left`, left dock → `right`, top dock → `bottom`, bottom dock → `top`.
   */
  placement?: VerticalPlacement | HorizontalPlacement
  /**
   * Show a collapse button to toggle the toolbar open and closed.
   * The collapse button uses one-third of the normal button width or height.
   */
  collapsible?: boolean
}
```

#### Button Definition

Buttons in toolbar are described by the following data structure.  
Property `icon` can be an icon provided by Element Plus or an icon imported through `vite-svg-loader`.

```
/**
 * Data to descibe button appearance
 */
export interface MlButtonData {
  /**
   * Item type.
   * - button: normal / toggle / popover button (default)
   * - separator: visual divider between buttons
   */
  type?: 'button' | 'separator'
  /**
   * Command string which will be passed to click event as event arguments.
   * Not required when `type` is `'separator'` or when the item only has `children`.
   */
  command?: string
  /**
   * Sub toolbar / menu items. If this property is set, the button will open
   * children according to `childrenType`.
   * Children may also include separators.
   */
  children?: MlButtonData[]
  /**
   * Presentation of `children`.
   * - sticky: parent acts as a switch; stays open until clicked again or
   *   another parent that opens children is clicked. Outside clicks do not close it.
   * - dismissible: toolbar that closes when the user clicks the canvas or
   *   any other area outside the popover (default)
   * - menu: children are shown as a popover menu (not a toolbar). Outside
   *   clicks close it, same as dismissible.
   */
  childrenType?: 'sticky' | 'dismissible' | 'menu'
  /**
   * When true, children represent a selection. After a child is chosen, this
   * button's icon, text, and tooltip follow that child.
   */
  followChild?: boolean
  /**
   * Initial selected child `command` when `followChild` is true.
   */
  selectedCommand?: string
  /**
   * Toggle button configuration.
   * If this property is set, the button becomes a toggle button.
   */
  toggle?: {
    /**
     * Initial toggle value
     */
    value?: boolean
    /**
     * Appearance when toggle is ON
     */
    on: {
      icon: Component
      text: string
      description: string
    }
    /**
     * Appearance when toggle is OFF
     */
    off: {
      icon: Component
      text: string
      description: string
    }
  }
  /**
   * Icon represented by one vue component
   * ⚠️ Ignored when toggle is defined
   */
  icon?: Component
  /**
   * Text shown below icon
   * ⚠️ Ignored when toggle is defined
   */
  text?: string
  /**
   * Tooltips content when hover
   * ⚠️ Ignored when toggle is defined
   */
  description?: string
}
```

#### Events

Toolbar emits the following events:

```
@click(command: string)
@toggle(command: string, value: boolean)
```

- `click`: emitted when a normal button or sub-button is clicked
- `toggle`: emitted when a toggle button changes state

#### Basic Usage

```
<script setup lang="ts">
import '@mlightcad/ui-components/dist/style.css'
import { MlButtonData, MlToolbar } from '@mlightcad/ui-components'
import { reactive } from 'vue'
import { Delete, Edit, Search } from '@element-plus/icons-vue'

const data = reactive<MlButtonData[]>([
  {
    icon: Edit,
    text: 'Edit',
    command: 'edit',
    description: 'This is description for edit button'
  },
  {
    icon: Delete,
    text: 'Delete',
    command: 'delete',
    description: 'This is description for delete button'
  },
  {
    icon: Search,
    text: 'Search',
    command: 'search',
    description: 'This is description for search button'
  }
])

const handleCommand = (command: string) => {
  console.log(command)
}
</script>

<template>
  <ml-toolbar
    :items="data"
    direction="vertical"
    collapsible
    @click="handleCommand"
  />
</template>
```

#### Separator Example

Insert `{ type: 'separator' }` into the `items` (or `children`) array to draw a divider between buttons. Separators work in both horizontal and vertical toolbars.

```
const data = reactive<MlButtonData[]>([
  {
    icon: Edit,
    text: 'Edit',
    command: 'edit'
  },
  { type: 'separator' },
  {
    icon: Delete,
    text: 'Delete',
    command: 'delete'
  }
])
```

#### Toggle Button Example

Toolbar supports **toggle buttons** that have two states and can display different icons and texts for each state.

```
import { View, Hide } from '@element-plus/icons-vue'

const data = reactive<MlButtonData[]>([
  {
    command: 'view.visibility',
    toggle: {
      value: true,
      on: {
        icon: View,
        text: 'Show'
        description: 'Shows entity'
      },
      off: {
        icon: Hide,
        text: 'Hide'
        description: 'Shows entity'
      }
    }
  }
])
```

```
<ml-toolbar
  :items="data"
  @toggle="(command, value) => {
    console.log(command, value)
  }"
/>
```

- Initial state is controlled by `toggle.value`
- Clicking the button switches between **on / off**
- Icon and text are updated automatically
- Current state is emitted via `@toggle`

#### Sub-toolbar Types

Buttons with `children` open on **click**. Only one child popover is open at a time; clicking another parent that has children closes the previous one.

**Sticky toolbar** — parent button is a switch. Clicking the canvas does not close it.

```
{
  icon: EditPen,
  text: 'Draw',
  childrenType: 'sticky',
  followChild: true,
  selectedCommand: 'draw.line',
  children: [
    { icon: Minus, text: 'Line', command: 'draw.line' },
    { icon: Crop, text: 'Rect', command: 'draw.rect' }
  ]
}
```

**Dismissible toolbar** — clicking the canvas or any other area closes it (default).

```
{
  icon: Edit,
  text: 'Edit',
  childrenType: 'dismissible',
  children: [
    { icon: CopyDocument, text: 'Copy', command: 'edit.copy' },
    { icon: Scissor, text: 'Cut', command: 'edit.cut' }
  ]
}
```

**Popover menu** — children are listed as a menu instead of a toolbar. Outside clicks close it.

```
{
  icon: ZoomIn,
  text: 'View',
  childrenType: 'menu',
  followChild: true,
  children: [
    { icon: ZoomIn, text: 'Zoom In', command: 'view.zoomIn' },
    { icon: ZoomOut, text: 'Zoom Out', command: 'view.zoomOut' }
  ]
}
```

#### Notes

- Parent buttons with a sub-toolbar show a small right triangle in the corner toward the sub-toolbar. Set `placement` to the side the submenu should open (the opposite of the toolbar dock: right dock → `left`, bottom dock → `top`). The mark scales with `size` (`small` 5px, `medium` 9px, `large` 12px).
- Toggle buttons, sub-toolbars, and separators can coexist with normal buttons
- Toggle state is internally managed by the toolbar (uncontrolled by default)
- Insert `{ type: 'separator' }` in `items` or `children` to add a divider between buttons
- Set `followChild: true` so the parent icon (and text/tooltip) tracks the last selected child. Use `selectedCommand` for the initial selection.
