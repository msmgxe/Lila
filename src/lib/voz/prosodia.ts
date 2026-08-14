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

const PAUSA = {
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

/* ────────────────────────── entonación de la frase ──────────────────────── */

/**
 * Cómo se dice un verso, no solo dónde se calla.
 *
 * Un verso como «¡qué maravillosa estación la breve primavera!» no es una línea
 * más: es una proclama, y dicha con el mismo tono que la anterior suena a
 * recitado de memoria. El sintetizador recibe los signos —nunca se le han
 * quitado—, pero con `pitch` y `rate` fijos los pronuncia todos igual.
 */
export type Tono = 'exclamativa' | 'interrogativa' | 'enunciativa'

/**
 * Multiplicadores sobre el tono y la velocidad de base.
 *
 * Son suaves a propósito. Web Speech no sabe de curvas de entonación: aplica un
 * `pitch` PLANO a toda la emisión, así que pasarse convierte la exclamación en
 * un grito agudo de principio a fin, que suena peor que leerla lisa. Lo que se
 * busca es que se note que ese verso es otra cosa, no hacer teatro.
 *
 * La exclamación además se dice un poco más rápida —así se lanza una proclama—
 * y la pregunta un poco más lenta, que es como se deja una pregunta en el aire.
 */
export const ENTONACION: Record<Tono, { pitch: number; rate: number }> = {
  exclamativa: { pitch: 1.14, rate: 1.05 },
  interrogativa: { pitch: 1.09, rate: 0.97 },
  enunciativa: { pitch: 1, rate: 1 },
}

/** Detecta el tono por los signos que el poeta escribió. */
function tonoDelVerso(verso: string): Tono {
  const t = limpiarMarcas(verso).trim()
  // Vale tanto el par completo «¡…!» como el signo suelto al final: en esta
  // obra hay versos que abren interrogación y no la cierran hasta más abajo.
  if (/[¡!]/.test(t)) return 'exclamativa'
  if (/[¿?]/.test(t)) return 'interrogativa'
  return 'enunciativa'
}

/**
 * El texto tal y como hay que entregárselo al sintetizador.
 *
 * En español la entonación se decide por el signo de APERTURA: sin el «¿», el
 * motor no sabe que viene una pregunta hasta que ya la ha dicho entera y llana.
 * El poeta abre interrogación en un verso y a veces no la cierra —«¿por qué ya
 * nada ni nadie se encuentran en su lugar,»—, y como ahora cada verso es su
 * propia emisión, al motor le llega un signo huérfano y se atraganta o lo lee
 * plano.
 *
 * Aquí se cierra lo que quedó abierto, y se abre lo que llega cerrado sin
 * abrir. **Solo para la voz**: el verso impreso conserva la puntuación del
 * poeta, letra por letra. Nadie ve esto; solo se oye.
 */
function textoParaVoz(verso: string): string {
  let t = limpiarMarcas(verso).trim()
  if (t === '') return t

  for (const [abre, cierra] of [
    ['¿', '?'],
    ['¡', '!'],
  ] as const) {
    const tieneApertura = t.includes(abre)
    const tieneCierre = t.includes(cierra)
    if (tieneApertura && !tieneCierre) {
      // Abre y no cierra: se cierra al final. Si el verso terminaba en coma,
      // la coma SE SUSTITUYE en vez de conservarse — «…en su lugar?,» hace
      // tropezar al motor, y la coma solo decía «esto sigue», que ya lo dice
      // la pausa entre versos.
      t = t.replace(/[,;:]$/, '') + cierra
    } else if (!tieneApertura && tieneCierre) {
      // Cierra sin abrir: la frase venía del verso anterior. Se abre al
      // principio para que el motor entone la parte que le toca decir.
      t = abre + t
    }
  }
  return t
}

/** Qué trozo del texto pronunciado corresponde a qué verso de la página. */
interface Tramo {
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
  /** Cómo se dice: exclamación, pregunta o enunciado. Ver `ENTONACION`. */
  tono: Tono
}

/**
 * Decide la pausa que sigue a una emisión que termina en este verso.
 * Solo se llama cuando la emisión SE CIERRA aquí.
 */
function pausaTrasVerso(verso: string, finDeEstrofa: boolean): number {
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
 * Parte un alejandrino en sus dos hemistiquios.
 * Corta en el espacio más cercano al centro; si no hay uno razonable, no corta.
 */
function hemistiquios(verso: string): [string, string] | null {
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
      tono: tonoDelVerso(opciones.titulo),
    })
  }

  // Acumulador de la emisión en curso.
  let piezas: string[] = []
  let tramos: Tramo[] = []
  let versos: number[] = []
  let largo = 0

  // El tono de la emisión en curso. Al agrupar varios versos —solo pasa cuando
  // uno se pasa del tope de caracteres— manda el primero que no sea neutro:
  // una exclamación partida en dos sigue siendo una exclamación.
  let tono: Tono = 'enunciativa'

  const cerrar = (pausaMs: number) => {
    if (piezas.length === 0) return
    frases.push({ texto: piezas.join(' '), pausaMs, versos, tramos, tono })
    piezas = []
    tramos = []
    versos = []
    largo = 0
    tono = 'enunciativa'
  }

  let indice = 0
  estrofas.forEach((estrofa) => {
    estrofa.forEach((verso, j) => {
      const finDeEstrofa = j === estrofa.length - 1
      // `textoParaVoz` y no `limpiarMarcas`: cierra los signos que el poeta
      // dejó abiertos, para que el motor sepa entonar. Solo afecta a la voz.
      const limpio = textoParaVoz(verso)

      // Un verso que se pasa del tope se emite solo: unirlo agravaría el problema.
      if (largo > 0 && largo + limpio.length + 1 > MAX_CARACTERES) {
        cerrar(PAUSA.tecnica)
      }

      const inicio = largo === 0 ? 0 : largo + 1
      piezas.push(limpio)
      const suyo = tonoDelVerso(verso)
      if (tono === 'enunciativa') tono = suyo
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

      // Aquí sí hay curva de entonación de verdad: un proveedor de pago sabe
      // qué hacer con `<prosody>` y con `<emphasis>`, mientras que Web Speech
      // solo puede subir el tono de la emisión entera. El porcentaje sale del
      // mismo `ENTONACION`, para que la maqueta y el audio final no se separen.
      const e = ENTONACION[f.tono]
      const dicho =
        f.tono === 'enunciativa'
          ? `<s>${texto}</s>`
          : `<prosody pitch="+${Math.round((e.pitch - 1) * 100)}%" rate="${Math.round(e.rate * 100)}%">` +
            (f.tono === 'exclamativa'
              ? `<emphasis level="strong"><s>${texto}</s></emphasis>`
              : `<s>${texto}</s>`) +
            `</prosody>`
      return `${dicho}<break time="${f.pausaMs}ms"/>`
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
