/**
 * Utilidades de texto. Sin dependencias de servidor: se usan en ambos lados.
 */

/** Quita acentos y baja a minúsculas. Espejo en cliente de `unaccent` de Postgres. */
export function sinAcentos(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function escaparHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/**
 * Convierte el `cuerpo` almacenado (texto con \n y \n\n) en estrofas de versos.
 * No toca los espacios interiores del verso: solo separa.
 */
export function aEstrofas(cuerpo: string): string[][] {
  return cuerpo
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((bloque) => bloque.split('\n').filter((v) => v.length > 0))
    .filter((estrofa) => estrofa.length > 0)
}

/** El camino inverso, para guardar. */
export function aCuerpo(estrofas: string[][]): string {
  return estrofas.map((e) => e.join('\n')).join('\n\n')
}

export function textoPlano(estrofas: string[][]): string {
  return estrofas.flat().join(' ')
}

const ROMANOS = [
  '',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
]

export function romano(n: number): string {
  return ROMANOS[n] ?? String(n)
}

export function slugificar(s: string): string {
  return sinAcentos(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Marcas manuales del poeta para ajustar la lectura a mano:
 *   `/`  pausa breve      `//` pausa larga
 * Son invisibles en el render y solo las lee el motor de voz.
 */
export function limpiarMarcas(verso: string): string {
  return verso.replace(/\s*\/\/?\s*$/g, '').trimEnd()
}

export function marcaDePausa(verso: string): 'breve' | 'larga' | null {
  if (/\/\/\s*$/.test(verso)) return 'larga'
  if (/(?<!\/)\/\s*$/.test(verso)) return 'breve'
  return null
}
