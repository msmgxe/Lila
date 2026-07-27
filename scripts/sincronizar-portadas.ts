/**
 * Pone al día en la base de datos las portadas y los datos del poemario que
 * `contenido:importar` deja en el archivo del proyecto.
 *
 *   npm run contenido:portadas
 *
 * Hacen falta los dos pasos porque son dos sitios distintos: el importador
 * reescribe `src/lib/contenido/pentapoemario.ts`, que es la semilla y la red de
 * seguridad, pero lo que el sitio sirve cuando Neon responde es la base. Sin
 * esto, se añade una portada, se ve en local sin base de datos, y en producción
 * sigue el hueco — que es exactamente lo que pasó con los capítulos 1, 3, 4 y 6.
 *
 * No inventa nada: solo copia al capítulo de la base la portada que el archivo
 * le asigna, y solo si en la base está vacía. Una portada puesta desde el panel
 * manda sobre esta, porque es más reciente y más deliberada.
 */
import { conexionDirecta, ok } from './_conexion'
import { LIBROS_PENTAPOEMARIO, CATEGORIA_PENTAPOEMARIO } from '../src/lib/contenido/pentapoemario'

async function principal() {
  const pool = conexionDirecta()

  let puestas = 0
  let respetadas = 0
  for (const libro of LIBROS_PENTAPOEMARIO) {
    if (!libro.portadaUrl) continue
    const { rows } = await pool.query(
      `UPDATE libros SET portada_url = $1, actualizado_en = now()
        WHERE slug = $2 AND portada_url IS NULL
        RETURNING slug`,
      [libro.portadaUrl, libro.slug],
    )
    if (rows.length > 0) {
      puestas++
      console.log(`    ${libro.slug} → ${libro.portadaUrl}`)
    } else {
      respetadas++
    }
  }

  const cat = CATEGORIA_PENTAPOEMARIO
  await pool.query(
    `UPDATE categorias
        SET lema = coalesce(lema, $1),
            portada_url = coalesce(portada_url, $2),
            actualizado_en = now()
      WHERE slug = $3`,
    [cat.lema, cat.portadaUrl, cat.slug],
  )

  ok(`${puestas} portadas puestas, ${respetadas} ya las tenían`)
  console.log('    poemario al día: lema e imagen\n')
  await pool.end()
}

principal().catch((e) => {
  console.error(`\n  ✗ ${e.message}\n`)
  process.exit(1)
})
