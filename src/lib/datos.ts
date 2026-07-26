import 'server-only'

/**
 * Capa de acceso a datos. **Todo lo público del sitio pasa por aquí, y aquí es
 * servidor.** Ningún componente cliente importa este módulo: reciben los datos
 * ya resueltos por props. Así `DATABASE_URL` no puede acabar en un bundle del
 * navegador — `server-only` hace fallar la build si alguien lo intenta.
 *
 * Si no hay `DATABASE_URL` configurada, el sitio funciona igual con el
 * contenido de muestra. Es deliberado: permite revisar el diseño y navegar el
 * lector completo antes de tener Neon montado, y hace que `next build` no
 * dependa de que la base de datos esté despierta.
 */

import { hayBaseDeDatos } from './db/cliente'
import { buscar as buscarEnDb, traerLibro, traerLibrosPublicados } from './db/consultas'
import { LIBROS_PENTAPOEMARIO } from './contenido/pentapoemario'
import { sinAcentos, escaparHtml, textoPlano } from './texto'
import type { Libro, ResultadoBusqueda } from './tipos'

export const origenDeDatos: 'neon' | 'archivo' = hayBaseDeDatos ? 'neon' : 'archivo'

export async function obtenerLibros(): Promise<Libro[]> {
  if (!hayBaseDeDatos) return LIBROS_PENTAPOEMARIO
  const libros = await traerLibrosPublicados()
  // Red de seguridad: si la base está vacía (aún sin semilla), no dejamos el
  // sitio en blanco.
  return libros.length > 0 ? libros : LIBROS_PENTAPOEMARIO
}

export async function obtenerLibro(slug: string): Promise<Libro | null> {
  if (!hayBaseDeDatos) return LIBROS_PENTAPOEMARIO.find((l) => l.slug === slug) ?? null
  const libro = await traerLibro(slug)
  return libro ?? LIBROS_PENTAPOEMARIO.find((l) => l.slug === slug) ?? null
}

/**
 * Búsqueda. Con Neon usa el índice GIN y `ts_headline`; sin Neon hace lo mismo
 * en memoria sobre el contenido de muestra, para que la maqueta se pueda probar
 * entera. Las dos ramas devuelven exactamente la misma forma.
 */
export async function buscar(consulta: string): Promise<ResultadoBusqueda[]> {
  const q = consulta.trim()
  if (q.length < 2) return []
  if (hayBaseDeDatos) {
    const resultados = await buscarEnDb(q)
    if (resultados.length > 0) return resultados
  }
  return buscarEnMuestra(q)
}

function buscarEnMuestra(consulta: string): ResultadoBusqueda[] {
  const nq = sinAcentos(consulta)
  const salida: ResultadoBusqueda[] = []

  for (const libro of LIBROS_PENTAPOEMARIO) {
    for (const poema of libro.poemas) {
      if (!poema.publicado) continue
      const cuerpo = textoPlano(poema.estrofas)
      const campo = sinAcentos(`${poema.titulo} ${cuerpo} ${poema.temas.join(' ')}`)
      if (!campo.includes(nq)) continue

      const pos = sinAcentos(cuerpo).indexOf(nq)
      let fragmento: string
      if (pos >= 0) {
        const a = Math.max(0, pos - 55)
        const b = Math.min(cuerpo.length, pos + nq.length + 70)
        fragmento =
          (a > 0 ? '… ' : '') +
          escaparHtml(cuerpo.slice(a, pos)) +
          '<mark>' +
          escaparHtml(cuerpo.slice(pos, pos + nq.length)) +
          '</mark>' +
          escaparHtml(cuerpo.slice(pos + nq.length, b)) +
          (b < cuerpo.length ? ' …' : '')
      } else {
        fragmento = '<em>coincide en el título o en los temas</em>'
      }

      salida.push({
        libroSlug: libro.slug,
        libroTitulo: libro.titulo,
        libroVolumen: libro.volumen,
        poemaSlug: poema.slug,
        poemaTitulo: poema.titulo,
        fragmento,
      })
    }
  }
  return salida
}
