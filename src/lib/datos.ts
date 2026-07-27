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

/**
 * La obra nunca falta.
 *
 * Tres redes de seguridad, de fuera hacia dentro:
 *  1. sin `DATABASE_URL`, se sirve el archivo del proyecto;
 *  2. si la consulta falla —Neon dormido, red caída, migración a medias—, se
 *     sirve el archivo y se anota el error, en vez de tumbar la página. Esto
 *     importa sobre todo en la compilación: un fallo pasajero de red no puede
 *     hacer que un despliegue entero se caiga;
 *  3. si la base responde pero está vacía, también.
 *
 * El precio es que un problema de base de datos pasa desapercibido para el
 * visitante. A cambio, el sitio no se cae nunca. Para una obra que solo se lee,
 * es el intercambio correcto — y el error queda en el registro del servidor.
 */
export async function obtenerLibros(): Promise<Libro[]> {
  if (!hayBaseDeDatos) return LIBROS_PENTAPOEMARIO
  try {
    const libros = await traerLibrosPublicados()
    return libros.length > 0 ? libros : LIBROS_PENTAPOEMARIO
  } catch (error) {
    console.error('[datos] la base no respondió; se sirve el archivo:', error)
    return LIBROS_PENTAPOEMARIO
  }
}

export async function obtenerLibro(slug: string): Promise<Libro | null> {
  const delArchivo = () => LIBROS_PENTAPOEMARIO.find((l) => l.slug === slug) ?? null
  if (!hayBaseDeDatos) return delArchivo()
  try {
    return (await traerLibro(slug)) ?? delArchivo()
  } catch (error) {
    console.error('[datos] la base no respondió; se sirve el archivo:', error)
    return delArchivo()
  }
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
    try {
      const resultados = await buscarEnDb(q)
      if (resultados.length > 0) return resultados
    } catch (error) {
      console.error('[buscar] la base no respondió; se busca en el archivo:', error)
    }
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
