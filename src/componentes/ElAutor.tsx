import type { Hito, VideoAutor } from '@/lib/db/panel'

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

/**
 * Convierte un enlace de YouTube o Vimeo en su dirección para incrustar.
 *
 * Se pega el enlace normal —el que sale al pulsar «Compartir»— y aquí se
 * traduce. Pedirle a nadie que averigüe la dirección «de incrustar» es pedirle
 * que se pelee con la interfaz de YouTube; y pegar la normal en un `<iframe>`
 * no funciona, así que sin esto la sección se quedaría en blanco sin decir por
 * qué. Lo que no reconoce se deja tal cual: puede ser un mp4 propio.
 */
export function urlParaIncrustar(url: string): { tipo: 'iframe' | 'video'; src: string } {
  const t = url.trim()

  const youtube = t.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  if (youtube) return { tipo: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtube[1]}` }

  const vimeo = t.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` }

  return { tipo: 'video', src: t }
}

export function ElAutor({ autor }: { autor: DatosDelAutor }) {
  const { nombre, titular, intro, retratoUrl, hitos, videos } = autor

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

      {videos.length > 0 && (
        <div className="autor-videos">
          {videos.map((video, i) => {
            const { tipo, src } = urlParaIncrustar(video.url)
            return (
              <figure key={i} className="autor-video">
                {tipo === 'iframe' ? (
                  <iframe
                    src={src}
                    title={video.titulo || `Vídeo ${i + 1}`}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  /*
                   * `muted` + `playsInline` no son adorno: sin los dos, iOS se
                   * niega a reproducir solo y deja un rectángulo negro. Y
                   * `preload="metadata"` para que la página no se traiga cuatro
                   * vídeos enteros antes de que nadie los mire.
                   */
                  <video src={src} loop muted playsInline preload="metadata" controls />
                )}
                {video.titulo && <figcaption>{video.titulo}</figcaption>}
              </figure>
            )
          })}
        </div>
      )}
    </section>
  )
}
