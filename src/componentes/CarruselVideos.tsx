'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { miniaturaDe, urlParaIncrustar } from './incrustar'

/** El tipo se declara aquí y no se importa de `db/panel`: ese módulo empieza
 *  por `server-only`, y un componente de cliente no debe tocarlo ni para un
 *  tipo — basta la referencia para arrastrarlo al grafo del navegador. */
export interface VideoAutor {
  titulo: string
  url: string
}

/**
 * Los vídeos del autor, en la misma vitrina que los poemarios.
 *
 * Láminas en profundidad —la del centro de frente, las de al lado giradas y
 * retranqueadas—, con vuelta completa: desde la última se sigue a la primera sin
 * llegar a ningún tope. Debajo, los mismos puntos para saltar a una concreta.
 *
 * ── Cómo se resuelve el problema de meter vídeos en 3D ─────────────────────
 * Un `<iframe>` de YouTube dentro de un contexto 3D se repinta mal en varios
 * navegadores —bordes borrosos, el clic cayendo donde no toca— y en alguno deja
 * de reproducir. Por eso la primera versión de esto era una tira plana.
 *
 * La salida no es renunciar al giro: es que **solo la lámina del centro sea un
 * reproductor**. Las de los lados son la miniatura del vídeo, una imagen, y una
 * imagen gira sin quejarse. El reproductor de verdad aparece cuando la lámina
 * llega al frente, que es cuando alguien puede pulsarlo.
 *
 * Sale gratis una mejora que no se buscaba: la página deja de traerse seis
 * reproductores de YouTube —con su JavaScript y sus cookies— para enseñar uno.
 */
export function CarruselVideos({ videos }: { videos: VideoAutor[] }) {
  const [centro, setCentro] = useState(0)
  /**
   * Qué vídeo se está reproduciendo. Null = ninguno, y entonces TODAS las
   * láminas son imágenes.
   *
   * Esto no es un capricho de rendimiento: en un móvil la lámina central ocupa
   * casi toda la pantalla, y un `<iframe>` se traga los eventos táctiles. Con
   * el reproductor puesto de entrada no había DÓNDE deslizar — el dedo caía
   * siempre dentro de YouTube y el carrusel no se enteraba. Con la miniatura
   * delante, el gesto llega; el reproductor aparece cuando alguien lo pide.
   */
  const [reproduciendo, setReproduciendo] = useState<number | null>(null)
  const total = videos.length

  const ir = useCallback(
    (paso: number) => {
      // Cambiar de lámina apaga el reproductor: si no, el vídeo anterior
      // seguiría sonando desde una lámina girada que ya no se ve.
      setReproduciendo(null)
      setCentro((c) => (c + paso + total) % total)
    },
    [total],
  )

  const saltarA = (i: number) => {
    setReproduciendo(null)
    setCentro(i)
  }

  /*
   * Deslizar con el dedo. Solo horizontal: el vertical es de la página.
   *
   * En `useRef` y NO en `useState`, que es como estaba y por lo que no
   * funcionaba: `setInicio` programa un repintado, y si el dedo va rápido el
   * `touchend` llega antes de que React lo confirme. Su función lee entonces el
   * valor viejo —null— y se sale sin hacer nada. Con una referencia el dato está
   * disponible en el acto, que es lo que pide un gesto. Es lo mismo que hace el
   * carrusel de poemarios, y por eso aquel sí respondía.
   */
  const inicio = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    // Si el centro apunta más allá del final —porque se quitó un vídeo— se
    // recoloca en vez de dejar la vitrina en blanco.
    if (centro >= total && total > 0) setCentro(0)
  }, [centro, total])

  if (total === 0) return null

  const actual = videos[centro]

  return (
    <section
      className="vitrina-videos"
      aria-roledescription="carrusel"
      aria-label="Vídeos"
      /* El gesto se escucha en la SECCIÓN entera, no solo en la pista: así
         también vale deslizar sobre la ficha, los puntos o los márgenes, que en
         un móvil es donde queda sitio libre para el pulgar. */
      onTouchStart={(e) => {
        inicio.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }}
      onTouchEnd={(e) => {
        if (!inicio.current) return
        const dx = e.changedTouches[0].clientX - inicio.current.x
        const dy = e.changedTouches[0].clientY - inicio.current.y
        inicio.current = null
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1)
      }}
    >
      <div className="vitrina-pista">
        {videos.map((video, i) => {
          // Distancia con la vuelta dada: con seis vídeos, el quinto está a uno
          // del primero, no a cinco. Sin esto el salto del último al primero
          // atraviesa toda la baraja y se ve el mazo entero pasar.
          let d = i - centro
          if (d > total / 2) d -= total
          if (d < -total / 2) d += total

          const fuera = Math.abs(d) > 2
          const alFrente = d === 0
          const { tipo, src } = urlParaIncrustar(video.url)
          const miniatura = miniaturaDe(video.url)

          return (
            <article
              key={i}
              className={`lamina-video${alFrente ? ' al-frente' : ''}`}
              aria-hidden={fuera}
              style={
                {
                  '--d': d,
                  opacity: fuera ? 0 : undefined,
                  pointerEvents: fuera ? 'none' : undefined,
                  zIndex: 10 - Math.abs(d),
                } as React.CSSProperties
              }
              onClick={() => {
                // Una lateral viene al centro; la central arranca su vídeo.
                if (!alFrente) saltarA(i)
                else setReproduciendo(i)
              }}
            >
              <div className="lamina-marco">
                {reproduciendo === i ? (
                  tipo === 'iframe' ? (
                    <iframe
                      // `autoplay=1` porque ya ha habido una pulsación: se ha
                      // pedido el vídeo, no hay que pedirlo dos veces.
                      src={`${src}?autoplay=1&rel=0`}
                      title={video.titulo || `Vídeo ${i + 1}`}
                      allow="autoplay; accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    /* `playsInline`: sin él, iOS abre el vídeo a pantalla
                       completa en vez de reproducirlo en su sitio. */
                    <video src={src} autoPlay loop playsInline controls />
                  )
                ) : (
                  <>
                    {miniatura ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={miniatura} alt="" loading="lazy" />
                    ) : (
                      <span className="lamina-sin-miniatura" aria-hidden="true">
                        ▶
                      </span>
                    )}
                    {alFrente && (
                      <button
                        type="button"
                        className="lamina-reproducir"
                        aria-label={`Reproducir ${video.titulo || `vídeo ${i + 1}`}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setReproduciendo(i)
                        }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8 5.5v13l11-6.5z" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
              {video.titulo && <p className="lamina-video-pie">{video.titulo}</p>}
            </article>
          )
        })}
      </div>

      <div className="vitrina-ficha">
        <button type="button" onClick={() => ir(-1)} aria-label="Vídeo anterior">
          ‹
        </button>
        <span className="vitrina-ficha-cuerpo">
          <span>
            <strong>{actual.titulo || `Vídeo ${centro + 1}`}</strong>
            <em>
              {centro + 1} de {total}
            </em>
          </span>
        </span>
        <button type="button" onClick={() => ir(1)} aria-label="Vídeo siguiente">
          ›
        </button>
      </div>

      {total > 1 && (
        <div className="vitrina-puntos" role="tablist" aria-label="Elegir vídeo">
          {videos.map((v, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === centro}
              aria-label={v.titulo || `Vídeo ${i + 1}`}
              className={i === centro ? 'activo' : ''}
              onClick={() => saltarA(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
