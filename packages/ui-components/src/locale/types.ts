import type { DockSide } from '../composables/types'

/**
 * Locale ids shipped with this library. Same set as cad-viewer's `AcApLocale`.
 */
export type MlLocaleName = 'en' | 'zh' | 'tr' | 'cs' | 'ar'

/**
 * Locale messages for built-in chrome of this library (menus, aria labels).
 * App-owned strings (tab titles, toolbar button text, etc.) stay with the
 * consuming application.
 */
export interface MlLocale {
  /** Locale identifier. Matches cad-viewer: `'en'` | `'zh'` | `'tr'` | `'cs'` | `'ar'`. */
  name: MlLocaleName
  toolPalette: {
    /** Accessible label for the dock-side menu button. */
    moreMenu: string
    /** Labels for each dock-side menu item. */
    dock: Record<DockSide, string>
  }
  overflowTabs: {
    /** Accessible label for the overflow (`»`) button. */
    moreTabs: string
    /** Accessible label for tab close buttons. */
    closeTab: string
  }
}

export type MlLocalePartial = {
  [K in keyof MlLocale]?: MlLocale[K] extends object
    ? {
        [P in keyof MlLocale[K]]?: MlLocale[K][P] extends object
          ? Partial<MlLocale[K][P]>
          : MlLocale[K][P]
      }
    : MlLocale[K]
}
