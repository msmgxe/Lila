/**
 * Vuelca la obra en la base de datos.
 *
 *   npm run db:semilla
 *
 * Es idempotente: reescribe por slug, así que se puede repetir sin duplicar.
 * No borra nada que no venga en el archivo de contenido.
 */

import { drizzle } from 'drizzle-orm/neon-serverless'
import { eq } from 'drizzle-orm'
import { conexionDirecta, ok } from './_conexion'
import { categorias, libros, poemas, planchas } from '../src/lib/db/esquema'
import {
  CATEGORIA_PENTAPOEMARIO,
  LIBROS_PENTAPOEMARIO,
} from '../src/lib/contenido/pentapoemario'
import { aCuerpo } from '../src/lib/texto'

async function principal() {
  const pool = conexionDirecta()
  const db = drizzle(pool, { casing: 'snake_case' })

  console.log('\n  Sembrando la obra…\n')
  try {
    // Primero el poemario: los capítulos apuntan a él.
    const [cat] = await db
      .insert(categorias)
      .values({
        slug: CATEGORIA_PENTAPOEMARIO.slug,
        nombre: CATEGORIA_PENTAPOEMARIO.nombre,
        descripcion: CATEGORIA_PENTAPOEMARIO.descripcion,
        orden: CATEGORIA_PENTAPOEMARIO.orden,
        visible: CATEGORIA_PENTAPOEMARIO.visible,
      })
      .onConflictDoUpdate({
        target: categorias.slug,
        set: {
          nombre: CATEGORIA_PENTAPOEMARIO.nombre,
          descripcion: CATEGORIA_PENTAPOEMARIO.descripcion,
          actualizadoEn: new Date(),
        },
      })
      .returning({ id: categorias.id })
    ok(`poemario «${CATEGORIA_PENTAPOEMARIO.nombre}»`)

    for (const libro of LIBROS_PENTAPOEMARIO) {
      const [fila] = await db
        .insert(libros)
        .values({
          slug: libro.slug,
          volumen: libro.volumen,
          titulo: libro.titulo,
          subtitulo: libro.subtitulo,
          descripcion: libro.descripcion,
          categoriaId: cat.id,
          orden: libro.orden,
          colorAcento: libro.colorAcento,
          portadaUrl: libro.portadaUrl,
          anio: libro.anio,
          publicado: libro.publicado,
          paginaBase: libro.paginaBase,
        })
        .onConflictDoUpdate({
          target: libros.slug,
          set: {
            volumen: libro.volumen,
            titulo: libro.titulo,
            subtitulo: libro.subtitulo,
            descripcion: libro.descripcion,
            categoriaId: cat.id,
            orden: libro.orden,
            paginaBase: libro.paginaBase,
            publicado: libro.publicado,
            actualizadoEn: new Date(),
          },
        })
        .returning({ id: libros.id })

      ok(`${libro.volumen} — ${libro.titulo}`)

      for (const poema of libro.poemas) {
        const [filaPoema] = await db
          .insert(poemas)
          .values({
            libroId: fila.id,
            slug: poema.slug,
            titulo: poema.titulo,
            // Aquí es donde el poema se convierte en texto: \n entre versos,
            // \n\n entre estrofas. Nada normaliza esos espacios.
            cuerpo: aCuerpo(poema.estrofas),
            forma: poema.forma,
            dedicatoria: poema.dedicatoria,
            notaAutor: poema.notaAutor,
            anio: poema.anio,
            orden: poema.orden,
            temas: poema.temas,
            publicado: poema.publicado,
          })
          .onConflictDoUpdate({
            target: [poemas.libroId, poemas.slug],
            set: {
              titulo: poema.titulo,
              cuerpo: aCuerpo(poema.estrofas),
              forma: poema.forma,
              dedicatoria: poema.dedicatoria,
              notaAutor: poema.notaAutor,
              anio: poema.anio,
              orden: poema.orden,
              temas: poema.temas,
              publicado: poema.publicado,
              actualizadoEn: new Date(),
            },
          })
          .returning({ id: poemas.id })

        // Las planchas se reemplazan en bloque: son pocas y así no quedan
        // huérfanas si se renumeran.
        await db.delete(planchas).where(eq(planchas.poemaId, filaPoema.id))
        if (poema.planchas.length > 0) {
          await db.insert(planchas).values(
            poema.planchas.map((p) => ({
              poemaId: filaPoema.id,
              numero: p.numero,
              titulo: p.titulo,
              tecnica: p.tecnica,
              url: p.url,
              orden: p.orden,
            })),
          )
        }
        ok(`   · ${poema.titulo}`)
      }
    }

    // Verificación: que la columna generada y el índice funcionan de verdad.
    const { rows } = await pool.query(
      `SELECT titulo FROM poemas
       WHERE busqueda @@ websearch_to_tsquery('public.spanish_unaccent','cancion')
          OR busqueda @@ websearch_to_tsquery('public.spanish_unaccent','pagina')
          OR busqueda @@ websearch_to_tsquery('public.spanish_unaccent','memoria')
       LIMIT 3`,
    )
    ok(`búsqueda operativa (${rows.length} coincidencia(s) de prueba)`)

    const total = LIBROS_PENTAPOEMARIO.reduce((n, l) => n + l.poemas.length, 0)
    console.log(`\n  Listo: ${LIBROS_PENTAPOEMARIO.length} volúmenes, ${total} poemas.\n`)
  } finally {
    await pool.end()
  }
}

principal().catch((e) => {
  console.error('\n  ✗ La semilla ha fallado:\n', e, '\n')
  process.exit(1)
})
