import type { Libro } from './tipos'

/**
 * Las categorías del anaquel salen de los datos, no de una lista fija.
 *
 * Con una constante escrita a mano, el día que el poeta añade un volumen de una
 * forma nueva desde el panel, la barra lateral no se entera; y al revés, salen
 * filtros que no llevan a ningún sitio. Derivándolas, la barra siempre coincide
 * con lo que hay publicado.
 */

const ICONOS: Record<string, string> = {
  todos: 'M4 5h7a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-7a2 2 0 00-2 2v12a2 2 0 012-2h7z',
  pentapoemas: 'M12 3l2.4 6.4L21 12l-6.6 2.6L12 21l-2.4-6.4L3 12l6.6-2.6z',
  sonetos: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
  'verso libre': 'M4 7h16M4 12h10M4 17h13',
  breves: 'M12 3l2.4 6.4L21 12l-6.6 2.6L12 21l-2.4-6.4L3 12l6.6-2.6z',
  borradores: 'M4 6h11M4 12h16M4 18h8M17 4l3 3-7 7-3.5.5.5-3.5z',
}

/** Icono genérico para una categoría que aún no tiene el suyo. */
const ICONO_POR_DEFECTO = 'M4 7h16M4 12h10M4 17h13'

export interface Categoria {
  clave: string
  nombre: string
  icono: string
  cuantos: number
}

export function categoriasDe(libros: Libro[]): Categoria[] {
  const cuenta = new Map<string, number>()
  for (const libro of libros) {
    cuenta.set(libro.categoria, (cuenta.get(libro.categoria) ?? 0) + 1)
  }

  const salida: Categoria[] = [
    { clave: 'todos', nombre: 'Biblioteca', icono: ICONOS.todos, cuantos: libros.length },
  ]

  for (const [clave, cuantos] of [...cuenta].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    salida.push({
      clave,
      nombre: clave.charAt(0).toUpperCase() + clave.slice(1),
      icono: ICONOS[clave] ?? ICONO_POR_DEFECTO,
      cuantos,
    })
  }

  // Con una sola categoría, el filtro no filtra nada: sobra.
  return salida.length > 2 ? salida : []
}
