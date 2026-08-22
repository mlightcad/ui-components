import {
  computed,
  inject,
  type InjectionKey,
  type MaybeRef,
  provide,
  type Ref,
  ref,
  toValue
} from 'vue'

import { ar } from './ar'
import { cs } from './cs'
import { en } from './en'
import { tr } from './tr'
import type { MlLocale, MlLocaleName, MlLocalePartial } from './types'
import { zh } from './zh'

export { ar } from './ar'
export { cs } from './cs'
export { en } from './en'
export { tr } from './tr'
export { zh } from './zh'
/** @deprecated Use {@link zh}. Kept as an alias of the `'zh'` pack. */
export { zh as zhCn } from './zh'
export type { MlLocale, MlLocaleName, MlLocalePartial } from './types'

/** Built-in packs keyed by cad-viewer locale id. */
export const locales: Record<MlLocaleName, MlLocale> = {
  en,
  zh,
  tr,
  cs,
  ar
}

const LOCALE_NAMES = new Set<string>(Object.keys(locales))

export function isMlLocaleName(value: string): value is MlLocaleName {
  return LOCALE_NAMES.has(value)
}

/** Injection key used by {@link provideLocale} / {@link useLocale}. */
export const localeContextKey: InjectionKey<Ref<MlLocale>> = Symbol('mlLocale')

const globalLocale = ref<MlLocale>(en)

export type MlLocaleInput = MlLocaleName | MlLocale | MlLocalePartial

/**
 * Merge a partial locale onto a base pack. Missing keys keep the base value.
 */
export function mergeLocale(base: MlLocale, patch?: MlLocalePartial): MlLocale {
  if (!patch) return base
  return {
    name: patch.name ?? base.name,
    toolPalette: {
      moreMenu: patch.toolPalette?.moreMenu ?? base.toolPalette.moreMenu,
      dock: {
        ...base.toolPalette.dock,
        ...patch.toolPalette?.dock
      }
    },
    overflowTabs: {
      ...base.overflowTabs,
      ...patch.overflowTabs
    }
  }
}

function resolveLocale(locale: MlLocaleInput): MlLocale {
  if (typeof locale === 'string') {
    return locales[locale] ?? en
  }
  return mergeLocale(en, locale)
}

/**
 * Set the global default locale for all components that do not have a
 * nearer {@link provideLocale} in the Vue tree.
 *
 * Accepts a cad-viewer locale id (`'en'` | `'zh'` | `'tr'` | `'cs'` | `'ar'`),
 * a full pack, or a partial pack merged onto English defaults.
 *
 * @example
 * ```ts
 * import { setLocale } from '@mlightcad/ui-components'
 * setLocale('zh')
 * ```
 */
export function setLocale(locale: MlLocaleInput) {
  globalLocale.value = resolveLocale(locale)
}

/** Current global locale (the fallback used when nothing is provided). */
export function getLocale(): MlLocale {
  return globalLocale.value
}

/**
 * Provide a locale for the current component tree. Accepts a ref or computed
 * so the UI updates when the app language changes.
 *
 * @example
 * ```ts
 * const locale = computed(() => i18n.locale.value)
 * provideLocale(locale)
 * ```
 */
export function provideLocale(locale: MaybeRef<MlLocaleInput>) {
  const localeRef = computed(() => resolveLocale(toValue(locale)))
  provide(localeContextKey, localeRef)
  return localeRef
}

/**
 * Resolve the active locale: nearest provided locale, else the global locale.
 */
export function useLocale() {
  const locale = inject(localeContextKey, globalLocale)
  return { locale }
}

export { globalLocale }
