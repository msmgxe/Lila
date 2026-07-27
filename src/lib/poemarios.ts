import type { Categoria, Libro } from './tipos'

/**
 * El nivel que faltaba: el poemario.
 *
 * La jerarquía de la obra es **poemario → capítulo → poema**. En la base de
 * datos el poemario es una fila de `categorias` y el capítulo una de `libros`,
 * que apunta a la suya. Hasta ahora el sitio entraba por el capítulo y el
 * poemario solo servía para filtrar; con el carrusel pasa a ser la portada.
 *
 * Los poemarios se **derivan de los capítulos ya cargados**, en vez de
 * consultarse aparte. Tres razones, y la tercera es la que decide:
 *
 *   1. Una consulta menos, y la de capítulos ya trae su categoría.
 *   2. Un poemario sin capítulos publicados no debe salir en la portada, y
 *      derivándolo eso pasa solo: si no hay capítulos, no hay poemario.
 *   3. Funciona con la red de seguridad. Cuando Neon no responde y se sirve el
 *      archivo del proyecto, esto sigue dando poemarios — una consulta aparte
 *      devolvería una portada vacía justo cuando más falta hace que no lo esté.
 */

export interface Poemario {
  categoria: Categoria
  capitulos: Libro[]
  /** Poemas publicados en todo el poemario. Se enseña en la ficha. */
  cuantosPoemas: number
  /** La imagen del poemario, o la del primer capítulo que tenga una. */
  portadaUrl: string | null
}

/**
 * Para los capítulos que aún no están asignados a ningún poemario.
 *
 * No se descartan: la obra es lo que hay, y un capítulo huérfano tiene que
 * poder leerse. Se agrupan bajo su `volumen`, que en esta obra es justo el
 * nombre del poemario —«Pentapoemario lila»—, así que en la práctica el
 * visitante no nota la diferencia.
 */
function poemarioDelVolumen(volumen: string): Categoria {
  return {
    id: `volumen:${volumen}`,
    slug: 'obra',
    nombre: volumen,
    lema: null,
    descripcion: null,
    portadaUrl: null,
    colorAcento: null,
    orden: 0,
    visible: true,
  }
}

export function agruparEnPoemarios(capitulos: Libro[]): Poemario[] {
  const porSlug = new Map<string, Poemario>()

  for (const capitulo of capitulos) {
    const categoria = capitulo.categoria ?? poemarioDelVolumen(capitulo.volumen)
    const previo = porSlug.get(categoria.slug)
    if (previo) {
      previo.capitulos.push(capitulo)
    } else {
      porSlug.set(categoria.slug, {
        categoria,
        capitulos: [capitulo],
        cuantosPoemas: 0,
        portadaUrl: null,
      })
    }
  }

  const poemarios = [...porSlug.values()]

  for (const poemario of poemarios) {
    poemario.capitulos.sort((a, b) => a.orden - b.orden)
    poemario.cuantosPoemas = poemario.capitulos.reduce(
      (n, c) => n + c.poemas.filter((p) => p.publicado).length,
      0,
    )
    // El poemario enseña su propia imagen si la tiene; si no, se presenta con
    // la del primer capítulo que lleve una. Es preferible a un hueco.
    poemario.portadaUrl =
      poemario.categoria.portadaUrl ??
      poemario.capitulos.find((c) => c.portadaUrl)?.portadaUrl ??
      null
  }

  return poemarios.sort(
    (a, b) =>
      a.categoria.orden - b.categoria.orden ||
      a.categoria.nombre.localeCompare(b.categoria.nombre, 'es'),
  )
}

export function buscarPoemario(capitulos: Libro[], slug: string): Poemario | null {
  return agruparEnPoemarios(capitulos).find((p) => p.categoria.slug === slug) ?? null
}

/**
 * La línea corta bajo el nombre en el carrusel.
 *
 * Si el poemario no la tiene escrita, se cuenta lo que hay. Es información real
 * y evita una ficha muda, que en un carrusel de portadas canta mucho.
 */
export function lemaDe(poemario: Poemario): string {
  if (poemario.categoria.lema) return poemario.categoria.lema
  const c = poemario.capitulos.length
  const p = poemario.cuantosPoemas
  return `${c} ${c === 1 ? 'capítulo' : 'capítulos'} · ${p} ${p === 1 ? 'poema' : 'poemas'}`
}
