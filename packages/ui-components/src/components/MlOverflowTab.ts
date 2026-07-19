/**
 * Tab definition for {@link MlOverflowTabs}.
 */
export interface MlOverflowTab {
  /** Stable tab identifier. */
  name: string
  /** Display label. */
  label: string
  /**
   * Whether this tab shows a close button.
   * Overrides the component-level `closable` prop when set.
   */
  closable?: boolean
}
