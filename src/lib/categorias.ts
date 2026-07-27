import type { Categoria, Libro } from './tipos'

/**
 * La barra de categorías del anaquel.
 *
 * Sale de los datos, no de una lista escrita a mano: el poeta crea los
 * poemarios desde el panel y aquí aparecen solos. Los marcados como no visibles
 * no salen — ni ellos ni sus capítulos.
 */

const ICONO_POR_DEFECTO = 'M4 7h16M4 12h10M4 17h13'

/** Iconos por slug conocido; los demás usan el genérico. */
const ICONOS: Record<string, string> = {
  todos: 'M4 5h7a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-7a2 2 0 00-2 2v12a2 2 0 012-2h7z',
  'pentapoemario-lila': 'M12 3l2.4 6.4L21 12l-6.6 2.6L12 21l-2.4-6.4L3 12l6.6-2.6z',
  multiversos: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.4 2.5 15.6 0 18',
}

export interface EntradaCategoria {
  clave: string
  nombre: string
  icono: string
  cuantos: number
}

/** Los capítulos que el visitante puede ver: los de poemarios visibles. */
export function librosVisibles(libros: Libro[]): Libro[] {
  return libros.filter((l) => l.categoria === null || l.categoria.visible)
}

export function categoriasDe(libros: Libro[]): EntradaCategoria[] {
  const vistas = new Map<string, { categoria: Categoria; cuantos: number }>()
  let sueltos = 0

  for (const libro of librosVisibles(libros)) {
    if (!libro.categoria) {
      sueltos++
      continue
    }
    const ya = vistas.get(libro.categoria.slug)
    if (ya) ya.cuantos++
    else vistas.set(libro.categoria.slug, { categoria: libro.categoria, cuantos: 1 })
  }

  const total = vistas.size + (sueltos > 0 ? 1 : 0)
  // Con una sola, el filtro no filtraría nada: sobra.
  if (total < 2) return []

  const salida: EntradaCategoria[] = [
    {
      clave: 'todos',
      nombre: 'Toda la obra',
      icono: ICONOS.todos,
      cuantos: librosVisibles(libros).length,
    },
  ]

  for (const { categoria, cuantos } of [...vistas.values()].sort(
    (a, b) => a.categoria.orden - b.categoria.orden,
  )) {
    salida.push({
      clave: categoria.slug,
      nombre: categoria.nombre,
      icono: ICONOS[categoria.slug] ?? ICONO_POR_DEFECTO,
      cuantos,
    })
  }

  if (sueltos > 0) {
    salida.push({
      clave: 'sin-clasificar',
      nombre: 'Sin clasificar',
      icono: ICONO_POR_DEFECTO,
      cuantos: sueltos,
    })
  }

  return salida
}
