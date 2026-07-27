import Link from 'next/link'
import { AUTOR, OBRA } from '@/lib/contenido/pentapoemario'
import type { Libro } from '@/lib/tipos'

/**
 * La portada del sitio — dirección «La galería».
 *
 * Un mosaico a sangre con las portadas de capítulo y el título en medio. Es lo
 * primero que ve alguien que llega de redes y todavía no sabe qué es esto: entra
 * por color, no por letra pequeña.
 *
 * Debajo sigue el anaquel completo, con su filtro y sus fichas, así que **no
 * sustituye a nada**: solo añade la puerta que faltaba. Los enlaces llevan
 * directamente a cada capítulo, que se abre como el libro que ya era.
 */
export function Portada({ libros }: { libros: Libro[] }) {
  const conPortada = libros.filter((l) => l.portadaUrl)
  // El mosaico necesita cuatro piezas para cuadrar. Si aún no hay tantas
  // portadas, se repiten las que haya en lugar de dejar huecos.
  const piezas =
    conPortada.length > 0
      ? Array.from({ length: 4 }, (_, i) => conPortada[i % conPortada.length])
      : []

  const poemas = libros.reduce((n, l) => n + l.poemas.filter((p) => p.publicado).length, 0)
  const primero = libros[0]

  return (
    <section className="portada-sitio" aria-labelledby="titulo-obra">
      {piezas.length > 0 && (
        <div className="mosaico" aria-hidden="true">
          {piezas.map((l, i) => (
            <figure key={i} className={`m${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.portadaUrl!} alt="" />
            </figure>
          ))}
        </div>
      )}

      <div className="rotulo-obra">
        <span className="et">{AUTOR}</span>
        <h1 id="titulo-obra">
          Pentapoemario
          <em>lila</em>
        </h1>
        <p>
          {libros.length} capítulos. Cinco poemas cada uno. Cinco versos cada poema.
          Todos los títulos empiezan por la misma letra.
        </p>
        <div className="acciones-obra">
          {primero && (
            <Link className="cta-obra" href={`/${primero.slug}`}>
              Abrir el primer capítulo
            </Link>
          )}
          <a className="cta-obra secundaria" href="#anaquel">
            Ver los {libros.length} capítulos
          </a>
        </div>
        <span className="cifras-obra">
          {poemas} poemas · {poemas * 5} versos · se lee, se busca y se escucha
        </span>
      </div>
    </section>
  )
}

/**
 * Las dos salas que siguen al mosaico: un poema entero y la lectura en voz alta.
 * Enseñan lo que el sitio hace antes de pedirle a nadie que entre.
 */
export function Salas({ libros }: { libros: Libro[] }) {
  // Se prefiere un capítulo CON portada: esta sala es a dos columnas y sin
  // imagen se queda media fila vacía. Si ninguno la tiene, vale cualquiera y
  // la sección pasa a una sola columna.
  const conImagen = libros.find((l) => l.portadaUrl && l.poemas.some((p) => p.publicado))
  const libro = conImagen ?? libros.find((l) => l.poemas.some((p) => p.publicado))
  const poema = libro?.poemas.find((p) => p.publicado)
  if (!libro || !poema) return null

  return (
    <div className="salas">
      <section className={`sala-obra${libro.portadaUrl ? '' : ' a-una-columna'}`}>
        <div>
          <span className="et">Así se lee</span>
          <h2>{poema.titulo}</h2>
          <p className="versos-muestra">
            {poema.estrofas[0]?.map((verso, i) => <span key={i}>{verso}</span>)}
          </p>
          <Link className="enlace-sala" href={`/${libro.slug}/${poema.slug}`}>
            Abrir este poema →
          </Link>
        </div>
        {libro.portadaUrl && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={libro.portadaUrl} alt={`Portada de ${libro.titulo}`} />
          </figure>
        )}
      </section>

      <section className="sala-obra invertida">
        <div>
          <span className="et">Así suena</span>
          <h2>Una voz que respeta el verso</h2>
          <p className="texto-sala">
            La lectura en voz alta no se detiene al final de cada línea: solo donde hay
            puntuación. Los versos que quedan abiertos se leen de corrido con el
            siguiente, como una frase. Es lo que separa una lectura de poesía de una
            lectura de lista.
          </p>
          <Link
            className="enlace-sala"
            href={`/${libro.slug}/${poema.slug}?narrar=1`}
          >
            Escuchar un poema →
          </Link>
        </div>
        <div className="onda" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ height: `${18 + ((i * 37) % 64)}%` }} />
          ))}
        </div>
      </section>
    </div>
  )
}

export { OBRA }
