const parseHex = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const luminance = ([r, g, b]: [number, number, number]): number => {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

/** Returns near-black or white, whichever has more contrast on `bg`. */
export const readableOn = (bg: string): string => {
  const rgb = parseHex(bg)
  if (!rgb) return '#ffffff'
  const L = luminance(rgb)
  const contrastWhite = 1.05 / (L + 0.05)
  const contrastDark = (L + 0.05) / (luminance([17, 17, 17]) + 0.05)
  return contrastDark >= contrastWhite ? '#111111' : '#ffffff'
}

/** "#336699" + 0.12 -> "rgba(51, 102, 153, 0.12)". Falls back to the input. */
export const withAlpha = (hex: string, alpha: number): string => {
  const rgb = parseHex(hex)
  return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})` : hex
}
