import type { CSSProperties } from 'react'

/**
 * El color de un poemario.
 *
 * Hoy manda la paleta Lila y todo se ve igual. Pero cada poemario puede llevar
 * el suyo, y esto es lo que hace que cambiarlo sea gratis: en vez de repartir
 * colores por el CSS, se inyectan **variables** en el elemento que envuelve la
 * sección. Todo lo de dentro ya lee esas variables, así que teñir un poemario
 * entero es poner un `style` en su contenedor y nada más.
 *
 * La regla de contraste de la obra sigue mandando: el lila `--terciario` da
 * 1.8:1 sobre el papel y no vale para texto. Por eso hay DOS variables y no
 * una — `--acento` para fondos y adornos sobre oscuro, y `--acento-texto`,
 * oscurecido, para texto sobre papel. Quien elija un color en el panel no tiene
 * por qué saber nada de esto: el segundo se calcula solo.
 */

/** El de la casa: el lila que el Pentapoemario lleva en el nombre. */
export const COLOR_SITIO = '#C9A6E8'
export const COLOR_SITIO_TEXTO = '#7B3FA8'

/** Acepta `#abc` y `#aabbcc`. Cualquier otra cosa se ignora, y manda la casa. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function esColorValido(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && HEX.test(valor.trim())
}

function aRgb(hex: string): [number, number, number] {
  const limpio = hex.trim().slice(1)
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio
  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ]
}

/** Luminancia relativa de la WCAG. La necesita `contraste`. */
function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

function contraste(a: [number, number, number], b: [number, number, number]): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

const PAPEL = aRgb('#F4EEF8')

/* ── Conversión a HSL y vuelta, para poder bajar solo la luminosidad ──────── */

function aHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      : max === gn
        ? ((bn - rn) / d + 2) / 6
        : ((rn - gn) / d + 4) / 6
  return [h, s, l]
}

function deHsl([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const canal = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [
    Math.round(canal(h + 1 / 3) * 255),
    Math.round(canal(h) * 255),
    Math.round(canal(h - 1 / 3) * 255),
  ]
}

/**
 * Oscurece el color hasta que sea legible sobre el papel malva.
 *
 * Un color bonito para un fondo casi nunca vale para texto: el lila de la casa
 * da 1.8:1 y hace falta 4.5:1. En vez de pedirle al poeta dos colores —o peor,
 * dejarle elegir uno ilegible—, se toma el suyo y se le baja la luminosidad
 * hasta que cumple.
 *
 * Baja SOLO la luminosidad, en HSL. Multiplicar los tres canales, que es lo
 * evidente, también apaga la saturación y devuelve un color lavado que ya no se
 * reconoce como el del poemario. El tono y la viveza son justo lo que lo
 * identifica; lo único que sobra es el brillo.
 */
export function colorParaTextoSobrePapel(hex: string): string {
  const [h, s, l] = aHsl(aRgb(hex))
  let luz = l
  let rgb = aRgb(hex)
  // 100 pasos de 1% llegan a negro desde cualquier punto de partida.
  for (let i = 0; i < 100 && contraste(rgb, PAPEL) < 4.5; i++) {
    luz = Math.max(0, luz - 0.01)
    rgb = deHsl([h, s, luz])
  }
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Las variables que tiñen una sección entera.
 *
 * Se pone en el `style` del contenedor del poemario. Sin color propio devuelve
 * un objeto vacío: entonces las variables globales de `globals.css` siguen
 * mandando y no se hereda nada raro.
 */
export function colorDelPoemario(colorAcento: string | null | undefined): CSSProperties {
  if (!esColorValido(colorAcento)) return {}
  const acento = colorAcento!.trim()
  return {
    '--acento': acento,
    '--acento-texto': colorParaTextoSobrePapel(acento),
  } as CSSProperties
}
