import 'server-only'

import { and, asc, eq, sql } from 'drizzle-orm'
import { exigirDb } from './cliente'
import { libros, poemas, planchas, registro } from './esquema'
import { aCuerpo, aEstrofas, slugificar } from '../texto'
import type { Libro, Poema } from '../tipos'

/**
 * Consultas del panel.
 *
 * Se separan de `consultas.ts` a propósito: aquello sirve el sitio público y
 * solo lee lo publicado; esto ve también los borradores y escribe. Mezclarlos
 * invita a que un `where publicado = true` se caiga sin que nadie se entere.
 */

/* ─────────────────────────────── lectura ────────────────────────────────── */

/** Todos los volúmenes, publicados o no, con sus poemas. */
export async function panelLibros(): Promise<Libro[]> {
  const db = exigirDb()
  const filas = await db.query.libros.findMany({
    orderBy: [asc(libros.orden), asc(libros.titulo)],
    with: {
      poemas: {
        orderBy: [asc(poemas.orden)],
        with: { planchas: { orderBy: [asc(planchas.orden)] }, audios: true },
      },
    },
  })
  return filas.map(mapear)
}

export async function panelLibro(slug: string): Promise<Libro | null> {
  const db = exigirDb()
  const fila = await db.query.libros.findFirst({
    where: eq(libros.slug, slug),
    with: {
      poemas: {
        orderBy: [asc(poemas.orden)],
        with: { planchas: { orderBy: [asc(planchas.orden)] }, audios: true },
      },
    },
  })
  return fila ? mapear(fila) : null
}

/* ─────────────────────────────── escritura ──────────────────────────────── */

export interface DatosLibro {
  slug: string
  volumen: string
  titulo: string
  subtitulo: string | null
  descripcion: string | null
  categoria: string
  orden: number
  colorAcento: string | null
  portadaUrl: string | null
  anio: number | null
  paginaBase: number
  publicado: boolean
}

export async function crearLibro(datos: DatosLibro) {
  const db = exigirDb()
  const [fila] = await db.insert(libros).values(datos).returning({ id: libros.id })
  await anotar('libro', fila.id, 'alta', { slug: datos.slug })
  return fila.id
}

export async function actualizarLibro(id: string, datos: Partial<DatosLibro>) {
  const db = exigirDb()
  await db
    .update(libros)
    .set({ ...datos, actualizadoEn: new Date() })
    .where(eq(libros.id, id))
  await anotar('libro', id, 'edición', datos)
}

export async function borrarLibro(id: string) {
  const db = exigirDb()
  // Los poemas y sus planchas caen con él por la clave foránea (ON DELETE CASCADE).
  await db.delete(libros).where(eq(libros.id, id))
  await anotar('libro', id, 'baja', null)
}

export interface DatosPoema {
  libroId: string
  slug: string
  titulo: string
  /** Texto tal cual lo escribe el poeta: \n entre versos, \n\n entre estrofas. */
  cuerpo: string
  forma: string
  dedicatoria: string | null
  notaAutor: string | null
  anio: number | null
  temas: string[]
  orden: number
  publicado: boolean
}

export async function crearPoema(datos: DatosPoema) {
  const db = exigirDb()
  const [fila] = await db.insert(poemas).values(datos).returning({ id: poemas.id })
  await anotar('poema', fila.id, 'alta', { slug: datos.slug })
  return fila.id
}

export async function actualizarPoema(id: string, datos: Partial<DatosPoema>) {
  const db = exigirDb()
  await db
    .update(poemas)
    .set({ ...datos, actualizadoEn: new Date() })
    .where(eq(poemas.id, id))
  await anotar('poema', id, 'edición', { titulo: datos.titulo })
}

export async function borrarPoema(id: string) {
  const db = exigirDb()
  await db.delete(poemas).where(eq(poemas.id, id))
  await anotar('poema', id, 'baja', null)
}

/** Publica o retira un poema. Devuelve el estado en el que queda. */
export async function alternarPublicacionPoema(id: string) {
  const db = exigirDb()
  const [fila] = await db
    .update(poemas)
    .set({ publicado: sql`NOT ${poemas.publicado}`, actualizadoEn: new Date() })
    .where(eq(poemas.id, id))
    .returning({ publicado: poemas.publicado })
  await anotar('poema', id, fila.publicado ? 'publicación' : 'retirada', null)
  return fila.publicado
}

export async function alternarPublicacionLibro(id: string) {
  const db = exigirDb()
  const [fila] = await db
    .update(libros)
    .set({ publicado: sql`NOT ${libros.publicado}`, actualizadoEn: new Date() })
    .where(eq(libros.id, id))
    .returning({ publicado: libros.publicado })
  await anotar('libro', id, fila.publicado ? 'publicación' : 'retirada', null)
  return fila.publicado
}

/** Sube o baja un poema dentro de su volumen intercambiando el orden. */
export async function moverPoema(id: string, direccion: -1 | 1) {
  const db = exigirDb()
  const actual = await db.query.poemas.findFirst({ where: eq(poemas.id, id) })
  if (!actual) return

  const hermanos = await db.query.poemas.findMany({
    where: eq(poemas.libroId, actual.libroId),
    orderBy: [asc(poemas.orden)],
  })
  const i = hermanos.findIndex((p) => p.id === id)
  const j = i + direccion
  if (j < 0 || j >= hermanos.length) return

  // Se reescribe todo el bloque: así el orden queda compacto (0,1,2…) aunque
  // viniera con huecos de ediciones anteriores.
  const reordenados = [...hermanos]
  ;[reordenados[i], reordenados[j]] = [reordenados[j], reordenados[i]]
  for (const [n, p] of reordenados.entries()) {
    if (p.orden !== n) {
      await db.update(poemas).set({ orden: n }).where(eq(poemas.id, p.id))
    }
  }
}

/* ─────────────────────────────── planchas ───────────────────────────────── */

export interface DatosPlancha {
  poemaId: string
  numero: string
  titulo: string
  tecnica: string
  url: string | null
  promptGeneracion: string | null
  orden: number
}

export async function guardarPlancha(datos: DatosPlancha, id?: string) {
  const db = exigirDb()
  if (id) {
    await db.update(planchas).set(datos).where(eq(planchas.id, id))
    await anotar('plancha', id, 'edición', { titulo: datos.titulo })
    return id
  }
  const [fila] = await db.insert(planchas).values(datos).returning({ id: planchas.id })
  await anotar('plancha', fila.id, 'alta', { titulo: datos.titulo })
  return fila.id
}

export async function borrarPlancha(id: string) {
  const db = exigirDb()
  await db.delete(planchas).where(eq(planchas.id, id))
  await anotar('plancha', id, 'baja', null)
}

/* ─────────────────────────────── registro ───────────────────────────────── */

/**
 * Deja constancia de cada cambio. Es la tabla `registro` del encargo: sirve
 * para saber qué se tocó y cuándo cuando algo aparece o desaparece del sitio.
 */
async function anotar(
  entidad: string,
  entidadId: string,
  accion: string,
  detalle: unknown,
) {
  try {
    const db = exigirDb()
    await db.insert(registro).values({
      entidad,
      entidadId,
      accion,
      detalle: detalle as never,
    })
  } catch {
    // El registro es auditoría, no la operación: si falla, no se tumba la
    // edición que el poeta acaba de hacer.
  }
}

export async function ultimosMovimientos(limite = 12) {
  const db = exigirDb()
  return db.query.registro.findMany({
    orderBy: (r, { desc }) => [desc(r.creadoEn)],
    limit: limite,
  })
}

/* ─────────────────────────────── ayudas ─────────────────────────────────── */

/** Genera un slug libre dentro del volumen, añadiendo -2, -3… si hace falta. */
export async function slugLibre(libroId: string, titulo: string, excluirId?: string) {
  const db = exigirDb()
  const base = slugificar(titulo) || 'poema'
  const usados = new Set(
    (
      await db.query.poemas.findMany({
        where: eq(poemas.libroId, libroId),
        columns: { slug: true, id: true },
      })
    )
      .filter((p) => p.id !== excluirId)
      .map((p) => p.slug),
  )
  if (!usados.has(base)) return base
  for (let n = 2; n < 500; n++) {
    if (!usados.has(`${base}-${n}`)) return `${base}-${n}`
  }
  return `${base}-${Date.now()}`
}

export async function slugLibreLibro(titulo: string, excluirId?: string) {
  const db = exigirDb()
  const base = slugificar(titulo) || 'volumen'
  const usados = new Set(
    (await db.query.libros.findMany({ columns: { slug: true, id: true } }))
      .filter((l) => l.id !== excluirId)
      .map((l) => l.slug),
  )
  if (!usados.has(base)) return base
  for (let n = 2; n < 500; n++) {
    if (!usados.has(`${base}-${n}`)) return `${base}-${n}`
  }
  return `${base}-${Date.now()}`
}

export async function siguienteOrden(libroId: string) {
  const db = exigirDb()
  const filas = await db.query.poemas.findMany({
    where: eq(poemas.libroId, libroId),
    columns: { orden: true },
  })
  return filas.reduce((m, p) => Math.max(m, p.orden + 1), 0)
}

export { aCuerpo, aEstrofas }

/* ─────────────────────────────── mapeo ──────────────────────────────────── */

type FilaPoema = typeof poemas.$inferSelect & {
  planchas: (typeof planchas.$inferSelect)[]
  audios: { id: string; voz: string; url: string; duracionMs: number | null }[]
}
type FilaLibro = typeof libros.$inferSelect & { poemas: FilaPoema[] }

function mapear(fila: FilaLibro): Libro {
  return {
    id: fila.id,
    slug: fila.slug,
    volumen: fila.volumen,
    titulo: fila.titulo,
    subtitulo: fila.subtitulo,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    orden: fila.orden,
    colorAcento: fila.colorAcento,
    portadaUrl: fila.portadaUrl,
    anio: fila.anio,
    publicado: fila.publicado,
    paginaBase: fila.paginaBase,
    poemas: fila.poemas.map(
      (p): Poema => ({
        id: p.id,
        slug: p.slug,
        titulo: p.titulo,
        estrofas: aEstrofas(p.cuerpo),
        forma: p.forma,
        dedicatoria: p.dedicatoria,
        notaAutor: p.notaAutor,
        anio: p.anio,
        temas: p.temas ?? [],
        orden: p.orden,
        publicado: p.publicado,
        planchas: p.planchas.map((pl) => ({
          id: pl.id,
          numero: pl.numero,
          titulo: pl.titulo,
          tecnica: pl.tecnica,
          url: pl.url,
          orden: pl.orden,
        })),
        audios: p.audios.map((a) => ({
          id: a.id,
          voz: a.voz as 'masculina' | 'femenina',
          url: a.url,
          duracionMs: a.duracionMs,
        })),
      }),
    ),
  }
}

export { and }
