import 'server-only'

import { and, asc, eq, sql } from 'drizzle-orm'
import { exigirDb } from './cliente'
import { ajustes, autor, categorias, libros, medios, poemas, planchas, portadas, registro } from './esquema'

/** Solo hay un autor. Ver el comentario de la tabla en `esquema.ts`. */
const CLAVE_AUTOR = 'principal'
import { aCuerpo, aEstrofas, slugificar } from '../texto'
import type { Categoria, Libro, Poema } from '../tipos'

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
      categoria: true,
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
      categoria: true,
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
  categoriaId: string | null
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

/**
 * Sube o baja un capítulo dentro de su poemario.
 *
 * Mismo criterio que `moverPoema`: se reescribe el bloque entero para que el
 * orden quede compacto (0,1,2…) aunque viniera con huecos. Con cincuenta
 * capítulos, un orden con agujeros hace que dos acaben empatados y el listado
 * baile de una carga a otra.
 *
 * Los capítulos sin poemario se mueven entre ellos: si no, un huérfano no se
 * podría colocar nunca.
 */
export async function moverLibro(id: string, direccion: -1 | 1) {
  const db = exigirDb()
  const actual = await db.query.libros.findFirst({ where: eq(libros.id, id) })
  if (!actual) return

  const hermanos = await db.query.libros.findMany({
    where: actual.categoriaId
      ? eq(libros.categoriaId, actual.categoriaId)
      : sql`${libros.categoriaId} IS NULL`,
    orderBy: [asc(libros.orden), asc(libros.titulo)],
  })
  const i = hermanos.findIndex((l) => l.id === id)
  const j = i + direccion
  if (j < 0 || j >= hermanos.length) return

  const reordenados = [...hermanos]
  ;[reordenados[i], reordenados[j]] = [reordenados[j], reordenados[i]]
  for (const [n, l] of reordenados.entries()) {
    if (l.orden !== n) {
      await db.update(libros).set({ orden: n }).where(eq(libros.id, l.id))
    }
  }
  await anotar('libro', id, 'orden', { hacia: direccion === -1 ? 'arriba' : 'abajo' })
}

/* ────────────────────────────── categorías ──────────────────────────────── */

export async function panelCategorias(): Promise<Array<Categoria & { cuantos: number }>> {
  const db = exigirDb()
  const filas = await db.query.categorias.findMany({
    orderBy: [asc(categorias.orden), asc(categorias.nombre)],
    with: { libros: { columns: { id: true } } },
  })
  return filas.map((c) => ({ ...mapearCategoria(c)!, cuantos: c.libros.length }))
}

export interface DatosCategoria {
  slug: string
  nombre: string
  lema: string | null
  descripcion: string | null
  portadaUrl: string | null
  /** Nulo = la paleta del sitio. Ver `colorDelPoemario` en lib/color.ts. */
  colorAcento: string | null
  orden: number
  visible: boolean
}

export async function crearCategoria(datos: DatosCategoria) {
  const db = exigirDb()
  const [fila] = await db.insert(categorias).values(datos).returning({ id: categorias.id })
  await anotar('categoria', fila.id, 'alta', { nombre: datos.nombre })
  return fila.id
}

export async function actualizarCategoria(id: string, datos: Partial<DatosCategoria>) {
  const db = exigirDb()
  await db
    .update(categorias)
    .set({ ...datos, actualizadoEn: new Date() })
    .where(eq(categorias.id, id))
  await anotar('categoria', id, 'edición', datos)
}

/** Enseña u oculta el poemario entero en el sitio. */
export async function alternarVisibilidadCategoria(id: string) {
  const db = exigirDb()
  const [fila] = await db
    .update(categorias)
    .set({ visible: sql`NOT ${categorias.visible}`, actualizadoEn: new Date() })
    .where(eq(categorias.id, id))
    .returning({ visible: categorias.visible })
  await anotar('categoria', id, fila.visible ? 'mostrada' : 'ocultada', null)
  return fila.visible
}

/** Los capítulos NO se borran: se quedan sin categoría (ON DELETE SET NULL). */
export async function borrarCategoria(id: string) {
  const db = exigirDb()
  await db.delete(categorias).where(eq(categorias.id, id))
  await anotar('categoria', id, 'baja', null)
}

export async function slugLibreCategoria(nombre: string, excluirId?: string) {
  const db = exigirDb()
  const base = slugificar(nombre) || 'poemario'
  const usados = new Set(
    (await db.query.categorias.findMany({ columns: { slug: true, id: true } }))
      .filter((c) => c.id !== excluirId)
      .map((c) => c.slug),
  )
  if (!usados.has(base)) return base
  for (let n = 2; n < 500; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`
  return `${base}-${Date.now()}`
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
type FilaLibro = typeof libros.$inferSelect & {
  poemas: FilaPoema[]
  categoria: typeof categorias.$inferSelect | null
}

/**
 * De fila de `categorias` a `Categoria`.
 *
 * El parámetro se tipa DESDE el esquema, no con la forma escrita a mano que
 * había: así, al añadir una columna, el compilador señala este punto en vez de
 * dejar que la columna nueva se pierda por el camino en silencio.
 */
function mapearCategoria(c: typeof categorias.$inferSelect | null): Categoria | null {
  return c
    ? {
        id: c.id,
        slug: c.slug,
        nombre: c.nombre,
        lema: c.lema,
        descripcion: c.descripcion,
        portadaUrl: c.portadaUrl,
        colorAcento: c.colorAcento,
        orden: c.orden,
        visible: c.visible,
      }
    : null
}

function mapear(fila: FilaLibro): Libro {
  return {
    id: fila.id,
    slug: fila.slug,
    volumen: fila.volumen,
    titulo: fila.titulo,
    subtitulo: fila.subtitulo,
    descripcion: fila.descripcion,
    categoria: mapearCategoria(fila.categoria),
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

/* ──────────────────── importar un capítulo desde Word ───────────────────── */

/** Un poema tal y como sale del .docx, listo para guardar. */
export interface PoemaImportado {
  titulo: string
  estrofas: string[][]
}

export interface ResumenImportacion {
  altas: string[]
  ediciones: string[]
  intactos: string[]
}

/**
 * Vuelca en un capítulo los poemas leídos de un documento de Word.
 *
 * Es la operación delicada del panel, así que conviene ser explícito con las
 * dos decisiones que la gobiernan:
 *
 * **1. Empareja por título, no por posición.** Si el poeta reordena los poemas
 * dentro del documento, o mete uno nuevo en medio, emparejar por posición
 * machacaría el poema equivocado. Por título, cada uno va a su sitio.
 *
 * **2. No borra nada.** Un poema que está en el sitio y ya no está en el
 * documento se queda como está, y se informa de ello. Un .docx incompleto —el
 * poeta abrió el de otro capítulo por error— no puede vaciar un capítulo
 * entero. Para quitar un poema está su propio botón, que pregunta.
 *
 * El orden sí se rehace según el documento: es lo que el poeta acaba de decidir
 * al escribirlo.
 */
export async function importarCapitulo(
  libroId: string,
  leidos: PoemaImportado[],
): Promise<ResumenImportacion> {
  const db = exigirDb()

  const existentes = await db
    .select({ id: poemas.id, titulo: poemas.titulo, slug: poemas.slug, cuerpo: poemas.cuerpo })
    .from(poemas)
    .where(eq(poemas.libroId, libroId))

  // La comparación de títulos ignora mayúsculas, tildes y espacios de más:
  // «Púrpura Letanía» y «púrpura letanía» son el mismo poema.
  const llave = (s: string) =>
    s
      .normalize('NFD')
      // \u0300-\u036f son los diacríticos que NFD separa de su letra.
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

  const porTitulo = new Map(existentes.map((p) => [llave(p.titulo), p]))
  const vistos = new Set<string>()
  const resumen: ResumenImportacion = { altas: [], ediciones: [], intactos: [] }

  for (const [i, leido] of leidos.entries()) {
    const cuerpo = aCuerpo(leido.estrofas)
    const previo = porTitulo.get(llave(leido.titulo))

    if (previo) {
      vistos.add(previo.id)
      // Si el texto no ha cambiado, no se toca: así el registro del panel no se
      // llena de «edición» falsas cada vez que se resube el mismo documento.
      if (previo.cuerpo === cuerpo && previo.titulo === leido.titulo) {
        await db.update(poemas).set({ orden: i }).where(eq(poemas.id, previo.id))
        resumen.intactos.push(leido.titulo)
        continue
      }
      await db
        .update(poemas)
        .set({ titulo: leido.titulo, cuerpo, orden: i, actualizadoEn: new Date() })
        .where(eq(poemas.id, previo.id))
      await anotar('poema', previo.id, 'edición', { desde: 'word', titulo: leido.titulo })
      resumen.ediciones.push(leido.titulo)
      continue
    }

    const slug = await slugLibre(libroId, leido.titulo)
    const [fila] = await db
      .insert(poemas)
      .values({
        libroId,
        slug,
        titulo: leido.titulo,
        cuerpo,
        forma: 'libre',
        dedicatoria: null,
        notaAutor: null,
        anio: null,
        temas: [],
        orden: i,
        // Entra como borrador: el poeta lo revisa y lo publica cuando quiera.
        publicado: false,
      })
      .returning({ id: poemas.id })
    await anotar('poema', fila.id, 'alta', { desde: 'word', slug })
    resumen.altas.push(leido.titulo)
  }

  for (const p of existentes) {
    if (!vistos.has(p.id)) resumen.intactos.push(`${p.titulo} (no venía en el documento)`)
  }

  return resumen
}

/* ─────────────────────────── portada del capítulo ───────────────────────── */

/**
 * Guarda los bytes de la portada y apunta el capítulo a ella.
 *
 * Las dos cosas van juntas a propósito: una portada guardada a la que nadie
 * apunta no la ve nadie, y un `portadaUrl` que apunta a bytes que no existen da
 * un 404 en el anaquel.
 */
export async function guardarPortada(
  libroId: string,
  slug: string,
  mime: string,
  bytes: Buffer,
) {
  const db = exigirDb()
  await db
    .insert(portadas)
    .values({ libroId, mime, bytes, actualizadoEn: new Date() })
    .onConflictDoUpdate({
      target: portadas.libroId,
      set: { mime, bytes, actualizadoEn: new Date() },
    })
  // La marca de tiempo en la dirección obliga al navegador a pedirla de nuevo:
  // sin ella, la caché de un año le seguiría enseñando la portada anterior.
  await db
    .update(libros)
    .set({ portadaUrl: `/portadas/${slug}?v=${Date.now()}`, actualizadoEn: new Date() })
    .where(eq(libros.id, libroId))
  await anotar('libro', libroId, 'portada', { bytes: bytes.length, mime })
}

/** Los bytes de una portada, para la ruta que la sirve. */
export async function leerPortada(slug: string) {
  const db = exigirDb()
  const [fila] = await db
    .select({
      mime: portadas.mime,
      bytes: portadas.bytes,
      actualizadoEn: portadas.actualizadoEn,
    })
    .from(portadas)
    .innerJoin(libros, eq(libros.id, portadas.libroId))
    .where(eq(libros.slug, slug))
    .limit(1)
  return fila ?? null
}

/* ─────────────────────────────── el autor ───────────────────────────────── */

export interface Hito {
  etiqueta: string
  titulo: string
  texto: string
}
export interface VideoAutor {
  titulo: string
  url: string
}
export interface DatosAutor {
  nombre: string
  titular: string | null
  intro: string | null
  retratoUrl: string | null
  hitos: Hito[]
  videos: VideoAutor[]
  visible: boolean
}

/** La fila del autor, o null si aún no se ha creado. */
export async function traerAutor() {
  const db = exigirDb()
  const [fila] = await db.select().from(autor).where(eq(autor.clave, CLAVE_AUTOR)).limit(1)
  return fila ?? null
}

/**
 * Guarda la sección del autor. Alta y edición son lo mismo: como solo hay una
 * fila, `onConflictDoUpdate` evita tener que preguntar antes si existe.
 */
export async function guardarAutor(datos: DatosAutor) {
  const db = exigirDb()
  await db
    .insert(autor)
    .values({ clave: CLAVE_AUTOR, ...datos, actualizadoEn: new Date() })
    .onConflictDoUpdate({
      target: autor.clave,
      set: { ...datos, actualizadoEn: new Date() },
    })
  await anotar('autor', CLAVE_AUTOR, 'edición', { hitos: datos.hitos.length })
}

/* ─────────────────────────────── medios ─────────────────────────────────── */

/** Guarda una imagen suelta y devuelve la dirección con la que servirla. */
export async function guardarMedio(clave: string, mime: string, bytes: Buffer) {
  const db = exigirDb()
  await db
    .insert(medios)
    .values({ clave, mime, bytes, actualizadoEn: new Date() })
    .onConflictDoUpdate({ target: medios.clave, set: { mime, bytes, actualizadoEn: new Date() } })
  // La marca de tiempo obliga al navegador a pedirla de nuevo: sin ella, la
  // caché de un año le seguiría enseñando la imagen anterior.
  return `/medios/${clave}?v=${Date.now()}`
}

export async function leerMedio(clave: string) {
  const db = exigirDb()
  const [fila] = await db
    .select({ mime: medios.mime, bytes: medios.bytes, actualizadoEn: medios.actualizadoEn })
    .from(medios)
    .where(eq(medios.clave, clave))
    .limit(1)
  return fila ?? null
}

/* ─────────────────────────────── ajustes ────────────────────────────────── */

const CLAVE_AJUSTES = 'sitio'

/** El tema elegido, o null si nunca se ha tocado. */
export async function traerTema(): Promise<string | null> {
  const db = exigirDb()
  const [fila] = await db
    .select({ tema: ajustes.tema })
    .from(ajustes)
    .where(eq(ajustes.clave, CLAVE_AJUSTES))
    .limit(1)
  return fila?.tema ?? null
}

export async function guardarTema(tema: string) {
  const db = exigirDb()
  await db
    .insert(ajustes)
    .values({ clave: CLAVE_AJUSTES, tema, actualizadoEn: new Date() })
    .onConflictDoUpdate({ target: ajustes.clave, set: { tema, actualizadoEn: new Date() } })
  await anotar('ajustes', CLAVE_AJUSTES, 'tema', { tema })
}
