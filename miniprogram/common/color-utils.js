module.exports = {
  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return r + ', ' + g + ', ' + b
  },

  lighten(hex, amt) {
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)
    r = Math.round(r + (255 - r) * amt)
    g = Math.round(g + (255 - g) * amt)
    b = Math.round(b + (255 - b) * amt)
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  },

  darken(hex, amt) {
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)
    r = Math.round(r * (1 - amt))
    g = Math.round(g * (1 - amt))
    b = Math.round(b * (1 - amt))
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  },
}
