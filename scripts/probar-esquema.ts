/**
 * Prueba el esquema completo contra un Postgres de verdad, sin tocar Neon.
 *
 *   npm run db:probar
 *
 * Levanta PGlite —Postgres compilado a WebAssembly, en memoria— y ejecuta ahí
 * exactamente lo mismo que se ejecutaría contra la base de producción: las
 * extensiones, la migración generada por Drizzle y las consultas reales.
 *
 * Existe porque una migración solo falla cuando se aplica, y aplicarla a ciegas
 * en Neon es la peor forma de descubrir un error. De hecho esta prueba ya cazó
 * uno: `array_to_string` es STABLE y tumbaba la columna generada.
 *
 * No sustituye a probar en una rama de Neon —PGlite no es idéntico— pero coge
 * los fallos de SQL antes de que cuesten nada.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { PASOS } from './extensiones'

const RAIZ = join(import.meta.dirname, '..')

let fallos = 0
const ok = (m: string) => console.log(`  ✓ ${m}`)
const mal = (m: string) => {
  console.log(`  ✗ ${m}`)
  fallos++
}

async function principal() {
  const db = await PGlite.create({ extensions: { unaccent, pg_trgm, pgcrypto } })
  console.log('\n  Probando el esquema sobre PGlite…\n')

  /* 1. Las extensiones, con los mismos pasos que usa el script de verdad. */
  for (const [nombre, sql] of PASOS) {
    await db.exec(sql)
    ok(nombre)
  }

  const { rows: acentos } = await db.query<{ c: boolean }>(
    `SELECT to_tsvector('public.spanish_unaccent','canción') @@
            websearch_to_tsquery('public.spanish_unaccent','cancion') AS c`,
  )
  acentos[0].c ? ok('«cancion» encuentra «canción»') : mal('la configuración no quita acentos')

  /* 2. TODAS las migraciones del repositorio, en orden y tal cual están.
        No solo la primera: lo que Neon va a ejecutar es la cadena entera, y una
        migración posterior puede chocar con lo que dejó la anterior. */
  const migraciones = readdirSync(join(RAIZ, 'drizzle'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const nombre of migraciones) {
    const sql = readFileSync(join(RAIZ, 'drizzle', nombre), 'utf8')
    for (const sentencia of sql.split('--> statement-breakpoint')) {
      if (sentencia.trim()) await db.exec(sentencia)
    }
    ok(`drizzle/${nombre} se aplica sin errores`)
  }

  const { rows: idx } = await db.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'poemas'`,
  )
  const nombres = idx.map((i) => i.indexname)
  nombres.includes('poemas_busqueda_idx')
    ? ok('índice GIN de búsqueda creado')
    : mal('falta poemas_busqueda_idx')
  nombres.includes('poemas_titulo_trgm_idx')
    ? ok('índice de trigramas del título creado')
    : mal('falta poemas_titulo_trgm_idx')

  /* 3. La columna generada se rellena y respeta los saltos del poema. */
  await db.query(
    `INSERT INTO categorias (slug, nombre, visible) VALUES ('prueba-poemario','Poemario de prueba',true)`,
  )
  const { rows: [cat] } = await db.query<{ id: string }>(
    `SELECT id FROM categorias WHERE slug='prueba-poemario'`,
  )
  await db.query(
    `INSERT INTO libros (slug, volumen, titulo, categoria_id, publicado, pagina_base)
     VALUES ('prueba','Obra','Volumen de prueba',$1,true,1)`,
    [cat.id],
  )
  const { rows: [libro] } = await db.query<{ id: string }>(
    `SELECT id FROM libros WHERE slug='prueba'`,
  )
  const cuerpo = 'Toda la noche estuvo el mar\ndiciendo una palabra.\n\nAl amanecer\nla había olvidado.'
  await db.query(
    `INSERT INTO poemas (libro_id, slug, titulo, cuerpo, forma, temas, publicado)
     VALUES ($1,'cancion','Canción de prueba',$2,'pentapoema',ARRAY['memoria','noche'],true)`,
    [libro.id, cuerpo],
  )

  const { rows: [gen] } = await db.query<{ lleno: boolean; cuerpo: string }>(
    `SELECT busqueda IS NOT NULL AS lleno, cuerpo FROM poemas LIMIT 1`,
  )
  gen.lleno ? ok('la columna generada `busqueda` se rellena sola') : mal('`busqueda` vacía')
  gen.cuerpo === cuerpo
    ? ok('el cuerpo vuelve byte a byte: los saltos no se tocan')
    : mal('el cuerpo ha cambiado al pasar por la base de datos')

  /* 4. La consulta de búsqueda real, la misma de src/lib/db/consultas.ts. */
  const buscar = (q: string) =>
    db.query<{ titulo: string; fragmento: string }>(
      `WITH consulta AS (SELECT websearch_to_tsquery('public.spanish_unaccent', $1) AS tq)
       SELECT p.titulo,
         ts_headline('public.spanish_unaccent', p.cuerpo, c.tq,
           'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=14, ShortWord=2, MaxFragments=1') AS fragmento
       FROM poemas p JOIN libros l ON l.id = p.libro_id CROSS JOIN consulta c
       WHERE p.publicado AND l.publicado
         AND (p.busqueda @@ c.tq
              OR word_similarity(public.f_unaccent($1), public.f_unaccent(p.titulo)) > 0.45)
       ORDER BY GREATEST(ts_rank(p.busqueda, c.tq),
                word_similarity(public.f_unaccent($1), public.f_unaccent(p.titulo)) * 0.5) DESC
       LIMIT 5`,
      [q],
    )

  const sinAcento = await buscar('cancion')
  sinAcento.rows.length > 0
    ? ok('búsqueda sin acentos: «cancion» → «' + sinAcento.rows[0].titulo + '»')
    : mal('«cancion» no encuentra «Canción de prueba»')

  const enCuerpo = await buscar('habia')
  if (enCuerpo.rows.length > 0) {
    const f = enCuerpo.rows[0].fragmento
    f.includes('había')
      ? ok('ts_headline devuelve el fragmento CON sus tildes')
      : mal(`el fragmento perdió los acentos: ${f}`)
    f.includes('<mark>') ? ok('el término va resaltado') : mal('el fragmento no trae <mark>')
  } else {
    mal('«habia» no encuentra «había»')
  }

  const conErrata = await buscar('cancon')
  conErrata.rows.length > 0
    ? ok('tolerancia a erratas: «cancon» encuentra el poema')
    : mal('el respaldo por trigramas no responde a una errata')

  const porTema = await buscar('memoria')
  porTema.rows.length > 0
    ? ok('los temas entran en la búsqueda')
    : mal('buscar por tema no devuelve nada')

  /* 5. Restricciones. */
  try {
    await db.query(
      `INSERT INTO poemas (libro_id, slug, titulo, cuerpo) VALUES ($1,'cancion','Otro','x')`,
      [libro.id],
    )
    mal('admitió dos poemas con el mismo slug en un volumen')
  } catch {
    ok('el slug es único dentro de cada volumen')
  }

  // Borrar el poemario NO puede llevarse los capítulos: solo los desasigna.
  await db.query(`DELETE FROM categorias WHERE id = $1`, [cat.id])
  const { rows: [tras] } = await db.query<{ n: number; sinCat: number }>(
    `SELECT count(*)::int AS n, count(*) FILTER (WHERE categoria_id IS NULL)::int AS "sinCat" FROM libros`,
  )
  tras.n === 1 && tras.sinCat === 1
    ? ok('borrar un poemario deja sus capítulos sin categoría, no los borra')
    : mal(`al borrar el poemario quedaron ${tras.n} capítulos (${tras.sinCat} sin categoría)`)

  /* ── portadas: los bytes tienen que volver idénticos ─────────────────────
     bytea es el sitio donde una imagen se corrompe en silencio: basta con que
     el driver la trate como texto en algún tramo y la imagen sale rota sin que
     nada falle. Se comprueba byte a byte, con un PNG de verdad. */
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  await db.query(`INSERT INTO portadas (libro_id, mime, bytes) VALUES ($1, $2, $3)`, [
    libro.id,
    'image/png',
    png,
  ])
  const { rows: [portada] } = await db.query<{ bytes: Uint8Array; mime: string }>(
    `SELECT bytes, mime FROM portadas WHERE libro_id = $1`,
    [libro.id],
  )
  const vuelta = Buffer.from(portada.bytes)
  vuelta.equals(png)
    ? ok(`la portada vuelve byte a byte (${png.length} B, ${portada.mime})`)
    : mal(`la portada volvió cambiada: ${vuelta.length} B frente a ${png.length} B`)

  await db.query(`DELETE FROM libros WHERE id = $1`, [libro.id])
  const { rows: [quedan] } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM poemas`,
  )
  quedan.n === 0
    ? ok('al borrar un volumen caen sus poemas (ON DELETE CASCADE)')
    : mal(`quedaron ${quedan.n} poemas huérfanos`)

  const { rows: [portadasQuedan] } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM portadas`,
  )
  portadasQuedan.n === 0
    ? ok('y también su portada')
    : mal(`quedaron ${portadasQuedan.n} portadas huérfanas`)

  await db.close()
  console.log(fallos === 0 ? '\n  Esquema correcto.\n' : `\n  ${fallos} fallo(s).\n`)
  process.exit(fallos === 0 ? 0 : 1)
}

principal().catch((e) => {
  console.error('\n  ✗ La prueba se ha roto:\n', e, '\n')
  process.exit(1)
})
