import Link from 'next/link'
import { notFound } from 'next/navigation'
import { panelLibros } from '@/lib/db/panel'
import { buscarPoemario, lemaDe } from '@/lib/poemarios'
import { colorDelPoemario } from '@/lib/color'
import { ListaCapitulos } from '@/componentes/FichaPoemario'
import { alternarLibro } from '../../../acciones'

export const dynamic = 'force-dynamic'

/**
 * Un poemario en el panel: portada a la izquierda, capítulos a la derecha.
 *
 * Es la MISMA disposición que ve el visitante, y la lista de capítulos es
 * literalmente el mismo componente —`ListaCapitulos`— con otro destino en cada
 * enlace y unos botones colgados detrás. Eso es lo que hace que ordenar aquí
 * signifique algo: lo que el poeta mueve es lo que se va a ver, no una lista
 * paralela que hay que imaginarse traducida.
 *
 * La diferencia deliberada: aquí no se esconde nada. Los capítulos en borrador
 * salen marcados en vez de desaparecer, porque el panel es donde se comprueba
 * qué falta por publicar.
 */
export default async function PaginaPoemarioPanel({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const poemario = buscarPoemario(await panelLibros(), slug)
  if (!poemario) notFound()

  const { categoria, capitulos, cuantosPoemas, portadaUrl } = poemario

  return (
    <div style={colorDelPoemario(categoria.colorAcento)}>
      <p className="miga">
        <Link href="/panel">Poemarios</Link> › {categoria.nombre}
      </p>

      <div className="ficha-poemario ficha-panel">
        <section className="ficha-portada">
          {portadaUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={portadaUrl} alt="" className="ficha-fondo" aria-hidden="true" />
          )}
          <div className="ficha-texto">
            <h1>{categoria.nombre}</h1>
            <p className="ficha-lema">{lemaDe(poemario)}</p>
            {categoria.descripcion && (
              <p className="ficha-descripcion">{categoria.descripcion}</p>
            )}
            <p className="ficha-cifras">
              {capitulos.length} {capitulos.length === 1 ? 'capítulo' : 'capítulos'} ·{' '}
              {cuantosPoemas} {cuantosPoemas === 1 ? 'poema publicado' : 'poemas publicados'}
              {!categoria.visible && ' · poemario oculto en el sitio'}
            </p>
          </div>
          <div className="ficha-botones">
            <Link className="bt" href="/panel/poemarios">
              Editar el poemario
            </Link>
            {categoria.visible && (
              <Link className="bt" href={`/poemario/${categoria.slug}`} target="_blank">
                Ver en el sitio
              </Link>
            )}
          </div>
        </section>

        <section className="ficha-capitulos">
          <header>
            <h2>Capítulos</h2>
            <Link className="bt fuerte" href="/panel/libro/nuevo">
              Nuevo
            </Link>
          </header>

          <ListaCapitulos
            capitulos={capitulos}
            destino={(c) => `/panel/libro/${c.slug}`}
            subtitulo={(c) => {
              const pub = c.poemas.filter((p) => p.publicado).length
              const total = c.poemas.length
              return total === pub
                ? `${total} ${total === 1 ? 'poema' : 'poemas'}`
                : `${pub} de ${total} publicados`
            }}
            extra={(capitulo) => (
              <form action={alternarLibro} className="fila-acciones">
                <input type="hidden" name="id" value={capitulo.id} />
                <button
                  className={`marca ${capitulo.publicado ? 'publicado' : 'borrador'}`}
                  type="submit"
                  title={
                    capitulo.publicado
                      ? 'Está en el sitio. Pulsa para retirarlo.'
                      : 'Es un borrador. Pulsa para publicarlo.'
                  }
                >
                  {capitulo.publicado ? 'En el sitio' : 'Borrador'}
                </button>
              </form>
            )}
          />
        </section>
      </div>
    </div>
  )
}
