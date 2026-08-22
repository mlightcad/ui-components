import type { DockSide } from '../composables/types'

/**
 * Canonical locale ids shipped with this library. Same set as cad-viewer's
 * `AcApLocale`. `'zh-cn'` / `'zh-CN'` are accepted as input aliases of `'zh'`
 * (see {@link MlLocaleId}).
 */
export type MlLocaleName = 'en' | 'zh' | 'tr' | 'cs' | 'ar'

/**
 * Locale ids accepted by `setLocale` / `provideLocale` / plugin `locale`.
 * `'zh-cn'` and `'zh-CN'` are treated as `'zh'`.
 */
export type MlLocaleId = MlLocaleName | 'zh-cn' | 'zh-CN'

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
