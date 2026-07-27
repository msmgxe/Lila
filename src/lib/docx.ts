import { unzipSync, strFromU8 } from 'fflate'

/**
 * Lector de .docx — la puerta por la que entra la obra al sitio.
 *
 * El poeta escribe en Word. Un .docx es un ZIP con XML dentro, así que aquí se
 * abre el ZIP, se saca `word/document.xml` y se recorren sus párrafos.
 *
 * ── La única regla que importa ──────────────────────────────────────────────
 * **El título de cada poema es lo que va en negrita.** No hay estilos de
 * encabezado en estos documentos ni numeración fiable: la negrita es la señal.
 *
 * Y tiene una trampa que costó dos intentos. Word parte un párrafo en «runs»
 * cada vez que cambia cualquier cosa —el corrector ortográfico, un idioma, una
 * marca de revisión—, así que un título en negrita puede llegar en tres trozos:
 *
 *     <w:r><w:rPr><w:b/></w:rPr><w:t>P</w:t></w:r>
 *     <w:r><w:rPr><w:b/></w:rPr><w:t>úrpura</w:t></w:r>
 *     <w:r><w:rPr><w:b/></w:rPr><w:t> letanía</w:t></w:r>
 *
 * Si se abre un poema nuevo en CADA run en negrita, el resultado es «úrpura
 * letanía» y la P se pierde. Un poema nuevo empieza solo cuando la negrita
 * ARRANCA —cuando el run anterior no estaba en negrita—; mientras siga, el
 * texto se añade al título que ya hay.
 *
 * El segundo tropiezo: un run en negrita que solo contiene un espacio se
 * descartaba por «vacío», y salía «Platónicaensoñación». Un run en negrita con
 * espacios cuenta si ya estamos dentro de un título.
 *
 * Lo que no está en negrita son versos. Un párrafo vacío separa estrofas.
 *
 * No lleva `server-only` a propósito, al contrario que `lib/db/*`: aquí no hay
 * secretos ni conexión a nada, es una función pura de bytes a poemas. Lo que la
 * mantiene fuera del navegador es el `'use server'` de quien la llama. A cambio
 * se puede probar contra los .docx de verdad —`npm run docx:probar`—, que es
 * como se cazaron las dos trampas de arriba.
 */

/** Un poema tal y como venía en el documento, sin validar todavía. */
export interface PoemaLeido {
  titulo: string
  estrofas: string[][]
}

/** Lo que se le enseña al poeta antes de guardar nada. */
export interface LecturaDocx {
  poemas: PoemaLeido[]
  /**
   * El encabezado del documento, si lo hay: «Poemas del capítulo 3 del
   * Pentapoemario lila». Va en negrita como los títulos, pero no lleva versos
   * debajo — y por eso se distingue. Se ofrece como título del capítulo.
   */
  encabezado?: string
  /** Problemas que NO impiden guardar, pero que conviene mirar. */
  avisos: string[]
}

/** `<w:t>` conserva los espacios solo si lleva `xml:space="preserve"`. */
const RE_PARRAFO = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g
const RE_RUN = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g
const RE_TEXTO = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g
const RE_PROPIEDADES = /<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/
/** `<w:b/>` pone negrita; `<w:b w:val="0"/>` la quita explícitamente. */
const RE_NEGRITA = /<w:b(?:\s[^>]*)?\/?>/
const RE_NEGRITA_APAGADA = /<w:b\s[^>]*w:val="(?:0|false|off)"/

function desescapar(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

/** Word usa comillas y guiones tipográficos; se respetan, pero no los dobles espacios. */
function normalizar(s: string): string {
  return s.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim()
}

/**
 * El título, tal y como se titula el poema.
 *
 * En los documentos, tres de los cuarenta títulos acaban en punto —«Pleonasmo
 * del deseo.»— y los otros treinta y siete no. Es puntuación de mecanografía,
 * no parte del título: en el sitio ninguno lo lleva.
 *
 * Quitarlo aquí no es cosmética. Al subir un capítulo, los poemas se emparejan
 * POR TÍTULO; si el documento dijera «Pleonasmo del deseo.» y en el sitio
 * estuviera «Pleonasmo del deseo», no se reconocerían y saldría un poema
 * duplicado en lugar de una edición.
 *
 * Los signos que sí dicen algo —interrogación, exclamación, puntos
 * suspensivos— se respetan.
 */
function limpiarTitulo(bruto: string): string {
  return normalizar(bruto).replace(/\s*[.,;:]+$/, '')
}

interface Run {
  texto: string
  negrita: boolean
}

function leerRuns(parrafoXml: string): Run[] {
  const runs: Run[] = []
  for (const m of parrafoXml.matchAll(RE_RUN)) {
    const cuerpo = m[1]
    const props = RE_PROPIEDADES.exec(cuerpo)?.[1] ?? ''
    const negrita = RE_NEGRITA.test(props) && !RE_NEGRITA_APAGADA.test(props)

    let texto = ''
    for (const t of cuerpo.matchAll(RE_TEXTO)) texto += desescapar(t[1])
    // Un salto de línea manual (Mayús+Intro) separa versos dentro de un párrafo.
    if (/<w:br\b/.test(cuerpo)) texto += '\n'

    if (texto !== '') runs.push({ texto, negrita })
  }
  return runs
}

/**
 * Extrae los poemas de un .docx.
 *
 * No valida nada de la obra —eso es decisión de quien llame—: aquí solo se lee
 * lo que el documento dice. Los avisos señalan lo que probablemente esté mal.
 */
export function leerDocx(archivo: Uint8Array): LecturaDocx {
  let documento: string
  try {
    const zip = unzipSync(archivo, { filter: (f) => f.name === 'word/document.xml' })
    const crudo = zip['word/document.xml']
    if (!crudo) {
      throw new Error(
        'El archivo no parece un .docx: no lleva dentro «word/document.xml». ' +
          'Si lo guardaste como .doc antiguo o como .odt, vuelve a guardarlo desde Word ' +
          'eligiendo «Documento de Word (.docx)».',
      )
    }
    documento = strFromU8(crudo)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('El archivo no parece')) throw error
    throw new Error(
      'No se ha podido abrir el archivo. Comprueba que es un .docx y que no está dañado.',
    )
  }

  const poemas: PoemaLeido[] = []
  const avisos: string[] = []

  let actual: PoemaLeido | null = null
  let estrofa: string[] = []
  let enTitulo = false

  const cerrarEstrofa = () => {
    if (estrofa.length > 0 && actual) actual.estrofas.push(estrofa)
    estrofa = []
  }

  for (const p of documento.matchAll(RE_PARRAFO)) {
    const runs = leerRuns(p[1])

    // Párrafo vacío: separa estrofas. También cierra un título abierto.
    if (runs.length === 0 || runs.every((r) => r.texto.trim() === '')) {
      enTitulo = false
      cerrarEstrofa()
      continue
    }

    // Un párrafo puede llevar varios versos si se usó Mayús+Intro.
    let versoEnCurso = ''
    const volcarVerso = () => {
      const v = normalizar(versoEnCurso)
      versoEnCurso = ''
      if (v === '') return
      if (!actual) {
        // Versos antes del primer título: el documento no empieza como debe.
        avisos.push(`Hay texto antes del primer título en negrita: «${v.slice(0, 40)}».`)
        return
      }
      estrofa.push(v)
    }

    for (const run of runs) {
      if (run.negrita) {
        if (run.texto.trim() !== '') {
          if (!enTitulo) {
            // Arranca la negrita: empieza un poema nuevo.
            volcarVerso()
            cerrarEstrofa()
            actual = { titulo: run.texto, estrofas: [] }
            poemas.push(actual)
            enTitulo = true
          } else {
            // En CRUDO, sin normalizar. Normalizar aquí recorta, y el espacio
            // que se recorta es justo el que separa este run del siguiente:
            // «Papas calientes » + «y» salía «Papas calientesy». El título se
            // normaliza una sola vez, al terminar de leerlo.
            actual!.titulo += run.texto
          }
        } else if (enTitulo) {
          // Run en negrita con solo espacios: separa palabras del título.
          actual!.titulo += ' '
        }
        continue
      }

      enTitulo = false
      for (const trozo of run.texto.split('\n')) {
        if (run.texto.includes('\n') && trozo !== run.texto.split('\n')[0]) volcarVerso()
        versoEnCurso += trozo
      }
      if (run.texto.endsWith('\n')) volcarVerso()
    }

    volcarVerso()
    // Fin de párrafo sin línea en blanco: sigue la misma estrofa.
  }
  cerrarEstrofa()

  for (const poema of poemas) {
    poema.titulo = limpiarTitulo(poema.titulo)
    poema.estrofas = poema.estrofas.filter((e) => e.length > 0)
  }

  // Los documentos de la obra abren con una línea en negrita —«Poemas del
  // capítulo 3 del Pentapoemario lila»— que el lector ve como un poema más
  // porque la señal es la misma. Se distingue por lo único que la distingue de
  // verdad: no lleva ni un verso debajo. Al ir la primera, es el encabezado.
  let encabezado: string | undefined
  if (poemas.length > 1 && poemas[0].estrofas.length === 0) {
    encabezado = poemas.shift()!.titulo
  }

  // Cualquier OTRO título sin versos sí es un problema: o el poema se quedó
  // vacío, o una línea que debía ser verso salió en negrita sin querer.
  for (const poema of poemas) {
    if (poema.estrofas.length === 0) {
      avisos.push(
        `«${poema.titulo}» no tiene ningún verso debajo. Comprueba que los versos ` +
          'de ese poema no estén en negrita.',
      )
    }
  }

  if (poemas.length === 0) {
    throw new Error(
      'No se ha encontrado ningún poema. Los títulos deben ir en NEGRITA y los versos ' +
        'sin negrita, con una línea en blanco entre estrofas.',
    )
  }

  return { poemas, encabezado, avisos }
}

/**
 * Comprueba la lectura contra la forma del *Pentapoemario*: cinco poemas de
 * cinco versos con el título empezando por la misma letra.
 *
 * No bloquea nada — el poeta puede tener un capítulo a medias o querer romper
 * su propia regla. Solo avisa, y avisa con la cifra concreta para que se sepa
 * si el fallo es del documento o del lector.
 */
export function revisarForma(poemas: PoemaLeido[]): string[] {
  const avisos: string[] = []

  if (poemas.length !== 5) {
    avisos.push(`Se han leído ${poemas.length} poemas; un capítulo suele tener 5.`)
  }

  for (const p of poemas) {
    const versos = p.estrofas.reduce((n, e) => n + e.length, 0)
    if (versos !== 5) {
      avisos.push(`«${p.titulo}» tiene ${versos} versos; lo habitual son 5.`)
    }
  }

  const iniciales = new Set(
    poemas.map((p) => p.titulo.trim().charAt(0).toUpperCase()).filter(Boolean),
  )
  if (iniciales.size > 1) {
    avisos.push(
      `Los títulos no empiezan todos por la misma letra: ${[...iniciales].join(', ')}.`,
    )
  }

  return avisos
}
