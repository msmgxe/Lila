/**
 * Prosodia del verso — la pieza que separa una lectura de poesía de una lectura
 * de lista de la compra.
 *
 * Este módulo NO sintetiza nada. Solo decide **qué se dice de una tirada y
 * dónde se calla**. Lo usan dos consumidores:
 *
 *   1. El reproductor del navegador (Web Speech), hoy, en `useNarracion`.
 *   2. El generador de SSML de la Fase 4, que produce el audio definitivo.
 *
 * Al compartir estas funciones, la maqueta y el audio final respiran igual.
 *
 * ── Cómo se reparte la lectura ──────────────────────────────────────────────
 * **Cada verso es una frase y se lee como tal**: se dice entero y después la
 * voz calla antes de empezar el siguiente. Es la decisión del poeta, y en esta
 * obra tiene sentido — son poemas de cinco versos donde cada línea se sostiene
 * sola, y la mayoría no llevan puntuación ninguna.
 *
 * Cuánto calla depende de cómo cierre el verso:
 *   · con punto o similar → la pausa más larga dentro de la estrofa;
 *   · con coma o inciso   → intermedia;
 *   · sin puntuación      → la de respiración, que es la de por defecto;
 *   · fin de estrofa      → la más larga de todas.
 *
 * Hubo una versión que unía los versos sin puntuación en una sola emisión, para
 * que el motor no cerrara cada línea con entonación de final. Sonaba más
 * continuo, pero se perdía el silencio entre versos, que es lo que hace que un
 * poema se oiga como un poema. Se ha vuelto a verso por verso a propósito.
 */

import { limpiarMarcas, marcaDePausa } from '../texto'

export const PAUSA = {
  /** Tras punto, exclamación, interrogación o puntos suspensivos. */
  frase: 620,
  /** Tras coma, punto y coma, dos puntos o raya. */
  coma: 520,
  /** Fin de verso sin puntuación: la pausa de respiración. */
  verso: 420,
  /** Al terminar una estrofa. */
  estrofa: 950,
  /** Después del título. */
  titulo: 800,
  /** Corte forzado por longitud, no por sentido: el mínimo audible. */
  tecnica: 200,
  /** Cesura interior de un alejandrino. Solo se usa en SSML. */
  cesura: 160,
} as const

/**
 * Tope de caracteres por emisión. Algunas voces se atragantan o se cortan solas
 * con textos muy largos. Solo salta si una estrofa se alarga sin puntuar.
 */
const MAX_CARACTERES = 320

/** Un verso largo (alejandrino 7+7) pide un respiro a mitad. */
const UMBRAL_ALEJANDRINO = 34

const CIERRA_FRASE = /[.!?…]["»)\]]?$/
const CIERRA_INCISO = /[,;:—–]["»)\]]?$/

/** Qué trozo del texto pronunciado corresponde a qué verso de la página. */
export interface Tramo {
  inicio: number
  fin: number
  verso: number
}

/** Lo que se le entrega al sintetizador de una sola vez. */
export interface Frase {
  /** El texto que se pronuncia: normalmente un verso. */
  texto: string
  /** Milisegundos de silencio DESPUÉS de pronunciarlo. */
  pausaMs: number
  /** Índices de los versos que abarca, para resaltarlos. */
  versos: number[]
  /** Posiciones dentro de `texto`, para afinar el resaltado verso a verso. */
  tramos: Tramo[]
  /** El título del poema no es un verso: no se resalta ni se cuenta. */
  esTitulo?: boolean
}

/**
 * Decide la pausa que sigue a una emisión que termina en este verso.
 * Solo se llama cuando la emisión SE CIERRA aquí.
 */
export function pausaTrasVerso(verso: string, finDeEstrofa: boolean): number {
  const marca = marcaDePausa(verso)
  if (marca === 'larga') return PAUSA.estrofa
  if (marca === 'breve') return PAUSA.coma

  if (finDeEstrofa) return PAUSA.estrofa

  const t = limpiarMarcas(verso).trim()
  if (CIERRA_FRASE.test(t)) return PAUSA.frase
  if (CIERRA_INCISO.test(t)) return PAUSA.coma
  // Un verso que no cierra con puntuación también se para: menos, pero se para.
  return PAUSA.verso
}

/**
 * ¿Se cierra la emisión al acabar este verso? **Siempre.**
 *
 * Cada verso es una frase: se dice entero, la voz calla, y empieza el
 * siguiente. La función se mantiene por claridad y porque el generador de SSML
 * de la Fase 4 la usa para decidir dónde va cada `<break>`.
 */
export function cierraEmision(_verso: string): boolean {
  return true
}

/**
 * Parte un alejandrino en sus dos hemistiquios.
 * Corta en el espacio más cercano al centro; si no hay uno razonable, no corta.
 */
export function hemistiquios(verso: string): [string, string] | null {
  const t = limpiarMarcas(verso).trim()
  if (t.length < UMBRAL_ALEJANDRINO) return null

  const centro = Math.floor(t.length / 2)
  let mejor = -1
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== ' ') continue
    if (mejor === -1 || Math.abs(i - centro) < Math.abs(mejor - centro)) mejor = i
  }
  if (mejor === -1 || Math.abs(mejor - centro) > t.length * 0.18) return null
  return [t.slice(0, mejor), t.slice(mejor + 1)]
}

/**
 * Agrupa los versos de una página en las emisiones que se le pasarán a la voz.
 *
 * `estrofas` son solo las de ESTA página: un poema largo se lee por pliegos.
 * `incluirTitulo` es false en las continuaciones.
 */
export function construirFrases(
  estrofas: string[][],
  opciones: { titulo?: string; incluirTitulo: boolean },
): Frase[] {
  const frases: Frase[] = []

  if (opciones.incluirTitulo && opciones.titulo) {
    frases.push({
      texto: opciones.titulo,
      pausaMs: PAUSA.titulo,
      versos: [],
      tramos: [],
      esTitulo: true,
    })
  }

  // Acumulador de la emisión en curso.
  let piezas: string[] = []
  let tramos: Tramo[] = []
  let versos: number[] = []
  let largo = 0

  const cerrar = (pausaMs: number) => {
    if (piezas.length === 0) return
    frases.push({ texto: piezas.join(' '), pausaMs, versos, tramos })
    piezas = []
    tramos = []
    versos = []
    largo = 0
  }

  let indice = 0
  estrofas.forEach((estrofa) => {
    estrofa.forEach((verso, j) => {
      const finDeEstrofa = j === estrofa.length - 1
      const limpio = limpiarMarcas(verso).trim()

      // Un verso que se pasa del tope se emite solo: unirlo agravaría el problema.
      if (largo > 0 && largo + limpio.length + 1 > MAX_CARACTERES) {
        cerrar(PAUSA.tecnica)
      }

      const inicio = largo === 0 ? 0 : largo + 1
      piezas.push(limpio)
      tramos.push({ inicio, fin: inicio + limpio.length, verso: indice })
      versos.push(indice)
      largo = inicio + limpio.length
      indice++

      // Un verso, una emisión. Se cierra siempre.
      cerrar(pausaTrasVerso(verso, finDeEstrofa))
    })
  })
  cerrar(PAUSA.estrofa)

  return frases
}

/**
 * Serializa las mismas emisiones a SSML, para el proveedor de TTS de la Fase 4.
 *
 * Aquí sí se marca la cesura de los alejandrinos: `<break>` dentro de una frase
 * no rompe la entonación, mientras que en Web Speech obligaría a partir la
 * emisión y sonaría peor que no hacerlo. Es la única diferencia entre los dos
 * caminos, y está aquí a propósito.
 */
export function aSSML(frases: Frase[], opciones: { idioma?: string } = {}): string {
  const escapar = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const cuerpo = frases
    .map((f) => {
      const partes = f.tramos.map((t) => {
        const verso = f.texto.slice(t.inicio, t.fin)
        const mitades = hemistiquios(verso)
        return mitades
          ? `${escapar(mitades[0])}<break time="${PAUSA.cesura}ms"/>${escapar(mitades[1])}`
          : escapar(verso)
      })
      const texto = partes.length > 0 ? partes.join(' ') : escapar(f.texto)
      return `<s>${texto}</s><break time="${f.pausaMs}ms"/>`
    })
    .join('\n')

  return `<speak xml:lang="${opciones.idioma ?? 'es-ES'}">\n${cuerpo}\n</speak>`
}

/**
 * Hash estable del SSML. Va a la columna `audios.ssml_hash`: si el poeta edita
 * un verso, el hash cambia y el panel sabe que hay que regenerar el audio.
 */
export function hashSSML(ssml: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < ssml.length; i++) {
    h ^= ssml.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
