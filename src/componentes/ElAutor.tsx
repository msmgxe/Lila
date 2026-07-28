import type { Hito, VideoAutor } from '@/lib/db/panel'
import { CarruselVideos } from './CarruselVideos'

/**
 * La sección del autor — propuesta 04, «La línea».
 *
 * Retrato en redondo, y debajo la trayectoria contada como lo que es: una
 * sucesión. Es la única de las seis propuestas en la que el orden significa
 * algo, y por eso aquí la línea y los puntos están justificados, mientras que
 * en las otras habrían sido adorno.
 *
 * Va **debajo del poemario**, nunca encima: la obra sigue siendo la entrada, y
 * quien llega de redes viene a leer un poema, no una biografía. Solo aparece
 * cuando el autor la ha marcado visible y tiene algo que contar.
 */

export interface DatosDelAutor {
  nombre: string
  titular: string | null
  intro: string | null
  retratoUrl: string | null
  hitos: Hito[]
  videos: VideoAutor[]
}


export function ElAutor({ autor }: { autor: DatosDelAutor }) {
  const { nombre, titular, intro, retratoUrl, videos } = autor

  // Un hito con etiqueta pero sin nada debajo es uno que se añadió y aún no se
  // ha escrito. Pintarlo deja un punto en la línea con un hueco al lado, que se
  // lee como que falta algo — y falta, pero eso es asunto del panel, no del
  // visitante.
  const hitos = autor.hitos.filter((h) => h.titulo.trim() || h.texto.trim())

  return (
    <section className="el-autor" aria-labelledby="titulo-autor">
      <div className="autor-halo" aria-hidden="true" />

      <header className="autor-cabeza">
        <div className="autor-retrato">
          {retratoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={retratoUrl} alt={`Retrato de ${nombre}`} loading="lazy" />
          ) : (
            <span aria-hidden="true">{nombre.charAt(0)}</span>
          )}
        </div>
        <div>
          <span className="et">Trayectoria</span>
          <h2 id="titulo-autor">{nombre}</h2>
          {titular && <p className="autor-titular">{titular}</p>}
          {intro && <p className="autor-intro">{intro}</p>}
        </div>
      </header>

      {hitos.length > 0 && (
        <ol className="autor-linea">
          {hitos.map((hito, i) => (
            <li key={i}>
              <span className="autor-etiqueta">{hito.etiqueta}</span>
              <h3>{hito.titulo}</h3>
              {hito.texto && <p>{hito.texto}</p>}
            </li>
          ))}
        </ol>
      )}

      <CarruselVideos videos={videos} />

    </section>
  )
}
