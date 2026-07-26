/**
 * Prosodia del verso — la pieza que separa una lectura de poesía de una lectura
 * de lista de la compra.
 *
 * Este módulo NO sintetiza nada. Solo decide **dónde y cuánto se calla**. Lo
 * usan dos consumidores distintos:
 *
 *   1. El reproductor del navegador (Web Speech), hoy, en `useNarracion`.
 *   2. El generador de SSML de la Fase 4, que produce el audio definitivo y lo
 *      cachea en el almacenamiento de objetos.
 *
 * Al compartir esta función, la maqueta y el audio final respiran igual.
 *
 * Reglas del encargo:
 *   · fin de verso            ≈ 250–350 ms
 *   · fin de estrofa          ≈ 700–900 ms
 *   · encabalgamiento         → pausa mínima (el verso no cierra y la frase sigue)
 *   · cesura en alejandrinos  → pausa breve a mitad de verso
 *   · el título se lee, seguido de pausa larga
 *   · dedicatoria y notas del autor NO se leen
 */

import { limpiarMarcas, marcaDePausa } from '../texto'

export const PAUSA = {
  /** El verso cierra con punto, exclamación o interrogación. */
  frase: 340,
  /** El verso cierra con coma, punto y coma, dos puntos o raya. */
  coma: 280,
  /** El verso no cierra: la frase continúa en el siguiente. Encabalgamiento. */
  encabalgamiento: 90,
  /** Última línea de una estrofa. */
  estrofa: 800,
  /** Después del título. */
  titulo: 700,
  /** Cesura interior de un alejandrino. */
  cesura: 160,
} as const

/** Un verso largo (alejandrino 7+7) pide un respiro a mitad. */
const UMBRAL_ALEJANDRINO = 34

export interface Emision {
  /** El texto que se pronuncia. */
  texto: string
  /** Milisegundos de silencio DESPUÉS de pronunciarlo. */
  pausaMs: number
  /** Índice del verso en la página, o null si es el título. */
  indiceVerso: number | null
}

/**
 * Decide la pausa que sigue a un verso.
 *
 * El caso importante es el último: si el verso no termina en signo de
 * puntuación, la frase sigue en el verso siguiente — es un encabalgamiento y
 * ahí casi no se para. Ante la duda, pausa mínima.
 */
export function pausaTrasVerso(verso: string, finDeEstrofa: boolean): number {
  const marca = marcaDePausa(verso)
  if (marca === 'larga') return PAUSA.estrofa
  if (marca === 'breve') return PAUSA.coma

  if (finDeEstrofa) return PAUSA.estrofa

  const t = limpiarMarcas(verso).trim()
  if (/[.!?…]["»)]?$/.test(t)) return PAUSA.frase
  if (/[,;:—–]["»)]?$/.test(t)) return PAUSA.coma
  return PAUSA.encabalgamiento
}

/**
 * Parte un alejandrino en sus dos hemistiquios para poder meter la cesura.
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
  // Solo si el corte cae razonablemente centrado.
  if (mejor === -1 || Math.abs(mejor - centro) > t.length * 0.18) return null
  return [t.slice(0, mejor), t.slice(mejor + 1)]
}

/**
 * Construye la cola de emisiones de una página de poema.
 *
 * `estrofas` son solo las de ESTA página (un poema largo se lee por pliegos).
 * `incluirTitulo` es false en las continuaciones.
 */
export function construirCola(
  estrofas: string[][],
  opciones: { titulo?: string; incluirTitulo: boolean },
): Emision[] {
  const cola: Emision[] = []

  if (opciones.incluirTitulo && opciones.titulo) {
    cola.push({ texto: opciones.titulo, pausaMs: PAUSA.titulo, indiceVerso: null })
  }

  let indice = 0
  estrofas.forEach((estrofa) => {
    estrofa.forEach((verso, j) => {
      const finDeEstrofa = j === estrofa.length - 1
      const limpio = limpiarMarcas(verso)
      const partes = hemistiquios(limpio)

      if (partes) {
        // El verso se emite en dos trozos, pero resalta como un solo verso.
        cola.push({ texto: partes[0], pausaMs: PAUSA.cesura, indiceVerso: indice })
        cola.push({
          texto: partes[1],
          pausaMs: pausaTrasVerso(verso, finDeEstrofa),
          indiceVerso: indice,
        })
      } else {
        cola.push({
          texto: limpio,
          pausaMs: pausaTrasVerso(verso, finDeEstrofa),
          indiceVerso: indice,
        })
      }
      indice++
    })
  })

  return cola
}

/**
 * Serializa la misma cola a SSML, para el proveedor de TTS de la Fase 4.
 * Ya está aquí para que el día que se conecte ElevenLabs o Google no haya que
 * reinventar la prosodia: es exactamente la misma.
 */
export function aSSML(cola: Emision[], opciones: { idioma?: string } = {}): string {
  const escapar = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const cuerpo = cola
    .map((e) => `${escapar(e.texto)}<break time="${e.pausaMs}ms"/>`)
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
