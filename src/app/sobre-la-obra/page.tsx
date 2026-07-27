import type { Metadata } from 'next'
import Link from 'next/link'
import { Cabecera } from '@/componentes/Cabecera'
import { Pie } from '@/componentes/Pie'
import { obtenerLibros } from '@/lib/datos'
import { AUTOR, OBRA } from '@/lib/contenido/pentapoemario'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Sobre la obra',
  description: `${OBRA}, de ${AUTOR}. Cinco poemas por capítulo, cinco versos por poema.`,
}

export default async function SobreLaObra() {
  const libros = await obtenerLibros()
  const poemas = libros.reduce((n, l) => n + l.poemas.filter((p) => p.publicado).length, 0)
  const versos = libros.reduce(
    (n, l) =>
      n + l.poemas.reduce((m, p) => m + p.estrofas.reduce((k, e) => k + e.length, 0), 0),
    0,
  )

  return (
    <>
      <Cabecera />
      <main className="pagina-texto" id="contenido">
        <span className="et">La obra</span>
        <h1>{OBRA}</h1>

        <p>
          <em>{AUTOR}</em>. {libros.length} capítulos, {poemas} poemas, {versos} versos.
        </p>

        <h2>La forma</h2>
        <p>
          Cinco poemas por capítulo y cinco versos por poema. Todos los títulos empiezan
          por la misma letra — no es una casualidad tipográfica, es la restricción de la
          obra, y se sostiene a lo largo de los cuarenta poemas.
        </p>

        <h2>Cómo leerla</h2>
        <p>
          Cada capítulo se abre como un libro: portada, índice y poemas, con la numeración
          de página corrida de un capítulo al siguiente. Se pasa página con las flechas del
          teclado, con los botones o arrastrando el dedo.
        </p>
        <p>
          El <em>modo Sala</em> cambia la biblioteca oscura por una galería clara de una
          sola columna, para leer sin nada alrededor. La <em>letra capital</em> abre el
          poema como en un libro antiguo. Las dos cosas se recuerdan de una visita a otra.
        </p>

        <h2>La voz</h2>
        <p>
          Los poemas se pueden escuchar. La lectura respeta la forma del verso: cada línea
          se dice entera y después la voz calla, porque en esta obra cada verso se sostiene
          solo. El silencio se alarga donde hay punto o coma, y más aún al cerrar la
          estrofa. Es lo que separa una lectura de poesía de una lectura de lista.
        </p>

        <h2>Las planchas</h2>
        <p>
          Cada poema puede llevar una obra plástica a su izquierda. Mientras no la tenga,
          se dibuja un motivo generado a partir de su propio título, con el color del
          capítulo.
        </p>

        <Link href="/" className="cta volver">
          Ir al anaquel
        </Link>
      </main>
      <Pie anio={new Date().getFullYear()} />
    </>
  )
}
