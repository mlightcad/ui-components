export interface Rect {
  left?: number | null
  top?: number | null
  width?: number | null
  height?: number | null
}

/**
 * The minimum distance from the border of one element to the border of the window
 */
export interface Offset {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Position {
  x: number
  y: number
}

export type Orientation = 'left' | 'right' | 'top' | 'bottom'

/**
 * Dock position of the tool palette.
 * - `left` / `right` / `top` / `bottom`: snapped to that window edge
 * - `float`: undocked floating panel
 */
export type DockSide = Orientation | 'float'

// Width of the title bar of the tool palette
export const WIDTH_OF_TITLE_BAR = 20
