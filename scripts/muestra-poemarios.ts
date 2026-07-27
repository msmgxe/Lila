/**
 * Poemarios de muestra, para ver el carrusel con varias láminas.
 *
 *   npm run muestra:poner     los crea
 *   npm run muestra:quitar    los borra, con todo lo suyo
 *
 * ── Por qué existe y por qué se puede borrar de un tirón ────────────────────
 * El carrusel de la portada no se puede juzgar con un solo poemario: se ve una
 * lámina suelta y no hay giro, ni profundidad, ni paso de una a otra. Esto
 * rellena la vitrina para poder mirarla.
 *
 * **Nada de esto pretende pasar por obra del poeta.** Los nombres llevan
 * «(muestra)», los poemas dicen en su propio texto que son de relleno, y todo
 * cuelga de tres slugs que empiezan por `muestra-`, que es justo lo que borra
 * el comando de quitar. No queda nada suelto.
 *
 * Cada uno lleva un color distinto a propósito: es la manera de ver, sin tocar
 * una línea de CSS, que la vitrina y la ficha se tiñen con el color del
 * poemario y que el tono para texto se recalcula solo hasta ser legible.
 */
import { conexionDirecta, ok } from './_conexion'

const PREFIJO = 'muestra-'

const MUESTRAS = [
  {
    slug: `${PREFIJO}multiversos`,
    nombre: 'Multiversos (muestra)',
    lema: 'Tres capítulos · quince poemas',
    descripcion: 'Poemario de muestra. Cámbialo o bórralo desde el panel.',
    portadaUrl: '/portadas/capitulo-13.jpg',
    colorAcento: '#5FB3D9',
    orden: 1,
    capitulos: ['Primer tránsito', 'Segundo tránsito', 'Tercer tránsito'],
  },
  {
    slug: `${PREFIJO}raiz-y-ceniza`,
    nombre: 'Raíz y ceniza (muestra)',
    lema: 'Dos capítulos · diez poemas',
    descripcion: 'Poemario de muestra. Cámbialo o bórralo desde el panel.',
    portadaUrl: '/portadas/capitulo-16.jpg',
    colorAcento: '#E0873F',
    orden: 2,
    capitulos: ['Lo que arde', 'Lo que queda'],
  },
  {
    slug: `${PREFIJO}cuaderno-de-agua`,
    nombre: 'Cuaderno de agua (muestra)',
    lema: 'Dos capítulos · diez poemas',
    descripcion: 'Poemario de muestra. Cámbialo o bórralo desde el panel.',
    portadaUrl: '/portadas/capitulo-20.jpg',
    colorAcento: '#7FC29B',
    orden: 3,
    capitulos: ['Corriente', 'Remanso'],
  },
]

/**
 * El cuerpo de un poema de muestra.
 *
 * Cinco versos, como manda la obra, pero que dicen lo que son. Inventar versos
 * y colgárselos al poeta sería lo peor que podría hacer este script: alguien
 * los leería como suyos.
 */
function cuerpoDeMuestra(n: number): string {
  return [
    `Este es un poema de muestra, el ${n}.`,
    'No lo ha escrito nadie: rellena el hueco',
    'para que se vea cómo queda la página.',
    'Cámbialo desde el panel, o borra',
    'el poemario entero y no quedará rastro.',
  ].join('\n')
}

async function poner() {
  const pool = conexionDirecta()

  for (const m of MUESTRAS) {
    const { rows } = await pool.query(
      `INSERT INTO categorias (slug, nombre, lema, descripcion, portada_url, color_acento, orden, visible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (slug) DO UPDATE SET
         nombre = excluded.nombre, lema = excluded.lema,
         descripcion = excluded.descripcion, portada_url = excluded.portada_url,
         color_acento = excluded.color_acento, orden = excluded.orden,
         actualizado_en = now()
       RETURNING id`,
      [m.slug, m.nombre, m.lema, m.descripcion, m.portadaUrl, m.colorAcento, m.orden],
    )
    const categoriaId = rows[0].id

    for (const [i, titulo] of m.capitulos.entries()) {
      const slugCapitulo = `${m.slug}-${i + 1}`
      const { rows: libro } = await pool.query(
        `INSERT INTO libros (slug, volumen, titulo, categoria_id, orden, portada_url, publicado, pagina_base)
         VALUES ($1,$2,$3,$4,$5,$6,true,1)
         ON CONFLICT (slug) DO UPDATE SET
           titulo = excluded.titulo, categoria_id = excluded.categoria_id,
           orden = excluded.orden, portada_url = excluded.portada_url,
           actualizado_en = now()
         RETURNING id`,
        [slugCapitulo, m.nombre, titulo, categoriaId, i, m.portadaUrl],
      )
      const libroId = libro[0].id

      for (let p = 1; p <= 5; p++) {
        await pool.query(
          `INSERT INTO poemas (libro_id, slug, titulo, cuerpo, forma, temas, orden, publicado)
           VALUES ($1,$2,$3,$4,'libre',ARRAY[]::text[],$5,true)
           ON CONFLICT (libro_id, slug) DO UPDATE SET
             titulo = excluded.titulo, cuerpo = excluded.cuerpo, actualizado_en = now()`,
          [libroId, `poema-de-muestra-${p}`, `Poema de muestra ${p}`, cuerpoDeMuestra(p), p - 1],
        )
      }
    }
    console.log(`    ${m.nombre}  ${m.capitulos.length} capítulos  ${m.colorAcento}`)
  }

  ok(`${MUESTRAS.length} poemarios de muestra puestos`)
  console.log('    Para quitarlos:  npm run muestra:quitar\n')
  await pool.end()
}

async function quitar() {
  const pool = conexionDirecta()
  // Los poemas y los capítulos caen solos por ON DELETE CASCADE; se borran
  // primero los capítulos porque la categoría los deja huérfanos (SET NULL) y
  // se quedarían sueltos en el anaquel.
  const { rows: libros } = await pool.query(
    `DELETE FROM libros WHERE slug LIKE $1 RETURNING slug`,
    [`${PREFIJO}%`],
  )
  const { rows: cats } = await pool.query(
    `DELETE FROM categorias WHERE slug LIKE $1 RETURNING slug`,
    [`${PREFIJO}%`],
  )
  ok(`quitados ${cats.length} poemarios y ${libros.length} capítulos de muestra`)
  await pool.end()
}

const accion = process.argv[2] === 'quitar' ? quitar : poner
accion().catch((e) => {
  console.error(`\n  ✗ ${e.message}\n`)
  process.exit(1)
})
