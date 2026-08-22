import type { App } from 'vue'

import MlCollapse from './components/MlCollapse.vue'
import MlDropdown from './components/MlDropdown.vue'
import MlLanguage from './components/MlLanguage.vue'
import MlOverflowTabs from './components/MlOverflowTabs.vue'
import MlStatusBar from './components/MlStatusBar.vue'
import MlToggleButton from './components/MlToggleButton.vue'
import MlToolBar from './components/MlToolBar.vue'
import MlToolPalette from './components/MlToolPalette.vue'
import {
  globalLocale,
  localeContextKey,
  type MlLocaleInput,
  setLocale
} from './locale'

export {
  MlCollapse,
  MlDropdown,
  MlLanguage,
  MlOverflowTabs,
  MlStatusBar,
  MlToggleButton,
  MlToolBar,
  MlToolPalette
}
export type { MlDropdownMenuItem } from './components/MlDropdown.vue'
export type { MlOverflowTab } from './components/MlOverflowTab'
export type { MlToggleButtonData } from './components/MlToggleButton.vue'
export type { MlButtonData, MlSubToolbarType } from './components/MlToolBar.vue'
export type {
  MlToolPaletteDockSide,
  MlToolPaletteTab
} from './components/MlToolPalette.vue'
export {
  ar,
  cs,
  en,
  getLocale,
  isMlLocaleName,
  localeContextKey,
  locales,
  mergeLocale,
  provideLocale,
  setLocale,
  tr,
  useLocale,
  zh,
  zhCn
} from './locale'
export type {
  MlLocale,
  MlLocaleId,
  MlLocaleInput,
  MlLocaleName,
  MlLocalePartial
} from './locale'

export interface MlUiComponentsOptions {
  /** Default locale for built-in chrome strings. Locale id, pack, or partial. */
  locale?: MlLocaleInput
}

// Optionally, export them as a plugin for Vue
export default {
  install(app: App, options?: MlUiComponentsOptions) {
    app.component('MlCollapse', MlCollapse)
    app.component('MlDropdown', MlDropdown)
    app.component('MlLanguage', MlLanguage)
    app.component('MlOverflowTabs', MlOverflowTabs)
    app.component('MlStatusBar', MlStatusBar)
    app.component('MlToggleButton', MlToggleButton)
    app.component('MlToolBar', MlToolBar)
    app.component('MlToolPalette', MlToolPalette)
    if (options?.locale) {
      setLocale(options.locale)
    }
    app.provide(localeContextKey, globalLocale)
  }
}
