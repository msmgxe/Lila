'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { urlParaIncrustar } from './incrustar'
/** El tipo se declara aquí y no se importa de `db/panel`: ese módulo empieza
 *  por `server-only`, y un componente de cliente no debe tocarlo ni para un
 *  tipo — basta la referencia para arrastrarlo al grafo del navegador. */
export interface VideoAutor {
  titulo: string
  url: string
}

/**
 * Los vídeos del autor, en carrusel.
 *
 * En rejilla se veían pequeños y en dos filas desordenadas —la última fila a
 * medias—. En una tira que se desplaza caben del tamaño que pide un vídeo, y el
 * conjunto se lee como una colección y no como un sobrante de maquetación.
 *
 * ── Por qué NO es el carrusel de los poemarios ─────────────────────────────
 * Aquel apila las láminas en 3D con `rotateY` y `translateZ`. Aquí no sirve:
 * dentro de cada tarjeta hay un `<iframe>` de YouTube, y un iframe metido en un
 * contexto 3D se repinta mal en varios navegadores —bordes borrosos, el clic
 * cayendo donde no toca— y en algunos deja de reproducir. Así que esto es un
 * desplazamiento horizontal de toda la vida, con anclaje y flechas: el mismo
 * gesto, sin pelearse con el reproductor de otro.
 */
export function CarruselVideos({ videos }: { videos: VideoAutor[] }) {
  const pista = useRef<HTMLDivElement>(null)
  const [alPrincipio, setAlPrincipio] = useState(true)
  const [alFinal, setAlFinal] = useState(false)

  /** Enciende o apaga las flechas según quede sitio hacia cada lado. */
  const mirarBordes = useCallback(() => {
    const el = pista.current
    if (!el) return
    setAlPrincipio(el.scrollLeft <= 2)
    // El margen de 2 px absorbe los redondeos del navegador: sin él, la flecha
    // de la derecha se queda encendida para siempre en algunos zooms.
    setAlFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    mirarBordes()
    const el = pista.current
    if (!el) return
    el.addEventListener('scroll', mirarBordes, { passive: true })
    window.addEventListener('resize', mirarBordes)
    return () => {
      el.removeEventListener('scroll', mirarBordes)
      window.removeEventListener('resize', mirarBordes)
    }
  }, [mirarBordes])

  const ir = (paso: -1 | 1) => {
    const el = pista.current
    if (!el) return
    // Se avanza casi una pantalla, no una tarjeta: con tres a la vista, ir de
    // una en una obliga a pulsar seis veces para recorrer seis vídeos.
    el.scrollBy({
      left: paso * el.clientWidth * 0.85,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }

  if (videos.length === 0) return null

  return (
    <div className="autor-carrusel">
      {videos.length > 1 && (
        <button
          type="button"
          className="flecha izquierda"
          onClick={() => ir(-1)}
          disabled={alPrincipio}
          aria-label="Vídeos anteriores"
        >
          ‹
        </button>
      )}

      <div className="autor-videos" ref={pista}>
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
                 * `muted` + `playsInline`: sin los dos, iOS se niega a
                 * reproducir y deja un rectángulo negro. `preload="metadata"`
                 * para que la página no se traiga los vídeos enteros antes de
                 * que nadie los mire.
                 */
                <video src={src} loop muted playsInline preload="metadata" controls />
              )}
              {video.titulo && <figcaption>{video.titulo}</figcaption>}
            </figure>
          )
        })}
      </div>

      {videos.length > 1 && (
        <button
          type="button"
          className="flecha derecha"
          onClick={() => ir(1)}
          disabled={alFinal}
          aria-label="Vídeos siguientes"
        >
          ›
        </button>
      )}
    </div>
  )
}
