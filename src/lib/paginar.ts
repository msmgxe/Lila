/**
 * Motor de paginación.
 *
 * Reparte un volumen en pliegos. La regla dura del encargo: **un poema largo
 * ocupa varios pliegos, pero el corte cae SIEMPRE entre estrofas**. Nunca se
 * parte un verso y nunca se parte una estrofa.
 *
 * Es determinista y se ejecuta en el servidor, de modo que el resultado es
 * idéntico en build (SSG) y en cliente. No mide el DOM: mide "líneas". Medir
 * el DOM obligaría a paginar en el navegador, y entonces cada dispositivo
 * cortaría el poema por un sitio distinto y las URLs por pliego dejarían de
 * ser estables. Ver docs/ADR-002.
 */

import type { Libro, Pliego, Poema } from './tipos'

/**
 * Presupuesto de una página, medido en «alturas de verso».
 *
 * Calibrado sobre el pliego real: 720 px de alto menos los rellenos deja unos
 * 650 px útiles, y cada verso ocupa 18.24 px × 1.95 de interlínea ≈ 35.6 px.
 * Eso da 18.3. Se deja en 17 para que en portátiles de 800 px de alto —donde el
 * pliego se queda en ~615 px— la página siga cabiendo.
 *
 * Cuando no cabe, no se corta nada: `.hoja-int` desplaza. El reparto está para
 * que eso casi nunca haga falta, no para garantizar lo imposible (el servidor
 * no conoce la pantalla). Ver docs/ADR-002.
 *
 * Si se cambia la tipografía del poema, se recalibra aquí y en ningún otro sitio.
 */
const PRESUPUESTO = 17

/** Costes, en la misma unidad: cuántos versos «ocupa» cada elemento. */
const COSTE = {
  /** La etiqueta de la forma («soneto», «verso libre»). */
  forma: 0.6,
  /** Cada línea del título, que es bastante más grande que un verso. */
  lineaDeTitulo: 1.3,
  /** Margen inferior del título. */
  margenTitulo: 0.6,
  dedicatoria: 1.2,
  notaAutor: 1.4,
  /** La viñeta de cierre, solo en el primer pliego del poema. */
  vineta: 1.7,
  /** El pie con los temas y el botón de seguir. */
  pie: 1.0,
  /** El blanco que separa una estrofa de la siguiente. */
  separacionEstrofa: 0.6,
} as const

/** Caracteres que caben en una línea de título antes de que doble. */
const ANCHO_TITULO = 16

function costeDeTitulo(titulo: string): number {
  const lineas = Math.min(3, Math.max(1, Math.ceil(titulo.length / ANCHO_TITULO)))
  return COSTE.forma + lineas * COSTE.lineaDeTitulo + COSTE.margenTitulo
}

/**
 * Hasta dónde se estira una página antes que partir un poema.
 *
 * Un soneto son catorce versos y una sola respiración: partirlo en dos pliegos
 * lo estropea. Cuando el poema entero se pasa poco del presupuesto, en vez de
 * cortarlo se compone más apretado —que es lo que hace un tipógrafo— y cabe.
 */
const ESTIRAMIENTO = 1.3

export type Densidad = 'normal' | 'denso' | 'muy-denso'

function densidadDe(coste: number): Densidad {
  if (coste <= PRESUPUESTO) return 'normal'
  if (coste <= PRESUPUESTO * 1.18) return 'denso'
  return 'muy-denso'
}

function costeDeEstrofas(estrofas: string[][], desde: number, hasta: number): number {
  let total = 0
  for (let i = desde; i <= hasta; i++) {
    total += estrofas[i].length + COSTE.separacionEstrofa
  }
  return total
}

/**
 * Reparte las estrofas de un poema en grupos que caben en una página, y dice
 * con qué densidad hay que componer cada uno.
 *
 * Una estrofa nunca se parte: si no cabe entera, empieza página nueva.
 */
export function repartirEstrofas(
  poema: Poema,
): Array<{ rango: [number, number]; densidad: Densidad; vineta: boolean }> {
  if (poema.estrofas.length === 0) {
    return [{ rango: [0, 0], densidad: 'normal', vineta: false }]
  }

  const cabecera = costeDeTitulo(poema.titulo) + COSTE.pie
  const extras =
    (poema.dedicatoria ? COSTE.dedicatoria : 0) + (poema.notaAutor ? COSTE.notaAutor : 0)

  // ¿Cabe el poema entero apretándolo un poco? La viñeta es lo primero que se
  // sacrifica: es un adorno, y la obra de verdad está en la plancha.
  const enteroSinVineta =
    cabecera + extras + costeDeEstrofas(poema.estrofas, 0, poema.estrofas.length - 1)
  if (enteroSinVineta <= PRESUPUESTO * ESTIRAMIENTO) {
    const conVineta = enteroSinVineta + COSTE.vineta
    const cabeLaVineta = conVineta <= PRESUPUESTO
    return [
      {
        rango: [0, poema.estrofas.length - 1],
        densidad: densidadDe(cabeLaVineta ? conVineta : enteroSinVineta),
        vineta: cabeLaVineta,
      },
    ]
  }

  // Poema largo: se reparte, cortando siempre entre estrofas.
  const cortes: Array<[number, number]> = []
  let inicio = 0
  let acumulado = cabecera + extras + COSTE.vineta

  for (let i = 0; i < poema.estrofas.length; i++) {
    const coste = poema.estrofas[i].length + COSTE.separacionEstrofa

    // La primera estrofa de una página entra siempre, aunque se pase: es
    // preferible una página que desplaza a partir una estrofa por la mitad.
    if (i > inicio && acumulado + coste > PRESUPUESTO) {
      cortes.push([inicio, i - 1])
      inicio = i
      // Las continuaciones no repiten dedicatoria, nota ni viñeta.
      acumulado = cabecera + coste
    } else {
      acumulado += coste
    }
  }
  cortes.push([inicio, poema.estrofas.length - 1])

  return cortes.map(([a, b], parte) => {
    const base = cabecera + (parte === 0 ? extras + COSTE.vineta : 0)
    return {
      rango: [a, b] as [number, number],
      densidad: densidadDe(base + costeDeEstrofas(poema.estrofas, a, b)),
      vineta: parte === 0,
    }
  })
}

/**
 * Convierte un volumen entero en la secuencia de pliegos que el lector recorre:
 *
 *   portada · índice · [poemas, cada uno en 1..n pliegos] · colofón
 *
 * La portada, el índice y el colofón vienen de la dirección A (Códice); los
 * pliegos de poema, de la dirección E (Biblioteca).
 */
export function paginarLibro(libro: Libro): Pliego[] {
  const pliegos: Pliego[] = []
  let folio = libro.paginaBase

  const empujar = (p: Omit<Pliego, 'n' | 'folio'>) => {
    pliegos.push({ ...p, n: pliegos.length, folio })
    folio += 2 // un pliego = dos caras
  }

  empujar({ tipo: 'portada' })
  empujar({ tipo: 'indice' })

  const publicados = [...libro.poemas]
    .filter((p) => p.publicado)
    .sort((a, b) => a.orden - b.orden)

  for (const poema of publicados) {
    const grupos = repartirEstrofas(poema)
    grupos.forEach((grupo, parte) => {
      empujar({
        tipo: 'poema',
        poema,
        estrofas: grupo.rango,
        densidad: grupo.densidad,
        vineta: grupo.vineta,
        parte,
        partes: grupos.length,
        // Si el poema tiene varias planchas, cada pliego muestra la suya;
        // si tiene una sola, se repite con un fundido.
        plancha: poema.planchas[Math.min(parte, poema.planchas.length - 1)] ?? null,
      })
    })
  }

  empujar({ tipo: 'colofon' })
  return pliegos
}

/** Índice del primer pliego de un poema dado. -1 si no está. */
export function pliegoDePoema(pliegos: Pliego[], poemaSlug: string): number {
  return pliegos.findIndex(
    (p) => p.tipo === 'poema' && p.parte === 0 && p.poema?.slug === poemaSlug,
  )
}

/** Entradas del índice: una por poema, no una por pliego. */
export function entradasDeIndice(pliegos: Pliego[]) {
  return pliegos
    .filter((p) => p.tipo === 'poema' && p.parte === 0)
    .map((p) => ({
      n: p.n,
      folio: p.folio,
      titulo: p.poema!.titulo,
      slug: p.poema!.slug,
      forma: p.poema!.forma,
    }))
}
