import 'server-only'

import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from './cliente'
import { categorias, libros, poemas, planchas, audios } from './esquema'
import { aEstrofas } from '../texto'
import type { Categoria, Libro, Poema, ResultadoBusqueda, Voz } from '../tipos'

/* ───────────────────────── lectura del catálogo ─────────────────────────── */

export async function traerLibrosPublicados(): Promise<Libro[]> {
  if (!db) return []

  const filas = await db.query.libros.findMany({
    where: eq(libros.publicado, true),
    orderBy: [asc(libros.orden), asc(libros.titulo)],
    with: {
      categoria: true,
      poemas: {
        where: eq(poemas.publicado, true),
        orderBy: [asc(poemas.orden)],
        with: {
          planchas: { orderBy: [asc(planchas.orden)] },
          audios: true,
        },
      },
    },
  })

  return filas.map(mapearLibro)
}

export async function traerLibro(slug: string): Promise<Libro | null> {
  if (!db) return null

  const fila = await db.query.libros.findFirst({
    where: and(eq(libros.slug, slug), eq(libros.publicado, true)),
    with: {
      categoria: true,
      poemas: {
        where: eq(poemas.publicado, true),
        orderBy: [asc(poemas.orden)],
        with: {
          planchas: { orderBy: [asc(planchas.orden)] },
          audios: true,
        },
      },
    },
  })

  return fila ? mapearLibro(fila) : null
}

/* ─────────────────────────────── búsqueda ───────────────────────────────── */

/**
 * Búsqueda full-text en español, insensible a acentos y mayúsculas.
 *
 * · `websearch_to_tsquery` acepta la sintaxis que la gente ya conoce de un
 *   buscador: comillas para frase exacta, `-` para excluir, OR.
 * · La configuración `spanish_unaccent` normaliza acentos en el índice Y en la
 *   consulta, así que «cancion» encuentra «canción».
 * · `ts_headline` corre sobre el texto ORIGINAL, de modo que el fragmento que
 *   se enseña conserva sus acentos y su puntuación.
 * · Si no hay coincidencia full-text, cae a similitud por trigramas sobre el
 *   título (pg_trgm), que es lo que salva las erratas.
 *
 *   Dos detalles medidos, no supuestos:
 *   `similarity()` compara las cadenas ENTERAS, así que «cancon» contra
 *   «Canción de prueba» da 0.25 y nunca salta — el título es mucho más largo
 *   que la consulta. `word_similarity()` busca la consulta como palabra dentro
 *   del título y da 0.571, que es lo que queremos.
 *
 *   Y el umbral va escrito aquí en lugar de usar el operador `<%`, porque ese
 *   operador lee `pg_trgm.word_similarity_threshold`, que es estado de sesión;
 *   con el driver HTTP de Neon cada consulta es una petición independiente y
 *   ese ajuste no sobrevive. Además su valor por omisión (0.6) deja fuera
 *   precisamente el caso de una letra bailada.
 */

/**
 * Umbral del respaldo por erratas. Calibrado: «cancon»→«Canción de prueba»
 * puntúa 0.571 y una consulta sin relación puntúa 0.
 */
const UMBRAL_ERRATA = 0.45
export async function buscar(consulta: string, limite = 40): Promise<ResultadoBusqueda[]> {
  if (!db) return []
  const q = consulta.trim()
  if (q.length < 2) return []

  const filas = await db.execute<{
    libro_slug: string
    libro_titulo: string
    libro_volumen: string
    poema_slug: string
    poema_titulo: string
    fragmento: string
    rango: number
  }>(sql`
    WITH consulta AS (
      SELECT websearch_to_tsquery('public.spanish_unaccent', ${q}) AS tq
    )
    SELECT
      l.slug              AS libro_slug,
      l.titulo            AS libro_titulo,
      l.volumen           AS libro_volumen,
      p.slug              AS poema_slug,
      p.titulo            AS poema_titulo,
      ts_headline(
        'public.spanish_unaccent',
        p.cuerpo,
        c.tq,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=14, ShortWord=2, MaxFragments=1, FragmentDelimiter=" … "'
      )                   AS fragmento,
      GREATEST(
        ts_rank(p.busqueda, c.tq),
        word_similarity(public.f_unaccent(${q}), public.f_unaccent(p.titulo)) * 0.5
      )                   AS rango
    FROM poemas p
    JOIN libros l ON l.id = p.libro_id
    CROSS JOIN consulta c
    WHERE p.publicado = true
      AND l.publicado = true
      AND (
        p.busqueda @@ c.tq
        OR word_similarity(public.f_unaccent(${q}), public.f_unaccent(p.titulo))
             > ${UMBRAL_ERRATA}
      )
    ORDER BY rango DESC, l.orden, p.orden
    LIMIT ${limite}
  `)

  return (filas.rows ?? []).map((f) => ({
    libroSlug: f.libro_slug,
    libroTitulo: f.libro_titulo,
    libroVolumen: f.libro_volumen,
    poemaSlug: f.poema_slug,
    poemaTitulo: f.poema_titulo,
    fragmento: f.fragmento,
  }))
}

/* ───────────────────────────── escritura ────────────────────────────────── */

/** Guarda la URL de un audio ya generado. La usará el panel de la Fase 5. */
export async function registrarAudio(datos: {
  poemaId: string
  voz: Voz
  proveedor: string
  url: string
  duracionMs: number | null
  ssmlHash: string
}) {
  if (!db) throw new Error('Sin base de datos')
  await db
    .insert(audios)
    .values(datos)
    .onConflictDoUpdate({
      target: [audios.poemaId, audios.voz],
      set: {
        url: datos.url,
        proveedor: datos.proveedor,
        duracionMs: datos.duracionMs,
        ssmlHash: datos.ssmlHash,
      },
    })
}

/* ─────────────────────────────── mapeo ──────────────────────────────────── */

type FilaPoema = typeof poemas.$inferSelect & {
  planchas: (typeof planchas.$inferSelect)[]
  audios: (typeof audios.$inferSelect)[]
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

function mapearLibro(fila: FilaLibro): Libro {
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
    poemas: fila.poemas.map(mapearPoema),
  }
}

function mapearPoema(fila: FilaPoema): Poema {
  return {
    id: fila.id,
    slug: fila.slug,
    titulo: fila.titulo,
    // El cuerpo se guarda con \n y \n\n; aquí se separa sin tocar los espacios.
    estrofas: aEstrofas(fila.cuerpo),
    forma: fila.forma,
    dedicatoria: fila.dedicatoria,
    notaAutor: fila.notaAutor,
    anio: fila.anio,
    temas: fila.temas ?? [],
    orden: fila.orden,
    publicado: fila.publicado,
    planchas: fila.planchas.map((p) => ({
      id: p.id,
      numero: p.numero,
      titulo: p.titulo,
      tecnica: p.tecnica,
      url: p.url,
      orden: p.orden,
    })),
    audios: fila.audios.map((a) => ({
      id: a.id,
      voz: a.voz as Voz,
      url: a.url,
      duracionMs: a.duracionMs,
    })),
  }
}
