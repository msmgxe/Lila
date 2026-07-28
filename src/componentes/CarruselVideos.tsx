'use client'

import { useCallback, useEffect, useState } from 'react'
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
  const total = videos.length

  const ir = useCallback(
    (paso: number) => setCentro((c) => (c + paso + total) % total),
    [total],
  )

  // Deslizar con el dedo. Solo horizontal: el vertical es de la página.
  const [inicio, setInicio] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    // Si el centro apunta más allá del final —porque se quitó un vídeo— se
    // recoloca en vez de dejar la vitrina en blanco.
    if (centro >= total && total > 0) setCentro(0)
  }, [centro, total])

  if (total === 0) return null

  const actual = videos[centro]

  return (
    <section className="vitrina-videos" aria-roledescription="carrusel" aria-label="Vídeos">
      <div
        className="vitrina-pista"
        onTouchStart={(e) => setInicio({ x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!inicio) return
          const dx = e.changedTouches[0].clientX - inicio.x
          const dy = e.changedTouches[0].clientY - inicio.y
          setInicio(null)
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1)
        }}
      >
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
                // Pulsar una lateral la trae al centro. La del centro no hace
                // nada aquí: ahí manda el reproductor.
                if (!alFrente) setCentro(i)
              }}
            >
              <div className="lamina-marco">
                {alFrente ? (
                  tipo === 'iframe' ? (
                    <iframe
                      src={src}
                      title={video.titulo || `Vídeo ${i + 1}`}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    /* `muted` + `playsInline`: sin los dos, iOS se niega a
                       reproducir y deja un rectángulo negro. */
                    <video src={src} loop muted playsInline preload="metadata" controls />
                  )
                ) : miniatura ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={miniatura} alt="" loading="lazy" />
                ) : (
                  <span className="lamina-sin-miniatura" aria-hidden="true">
                    ▶
                  </span>
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
              onClick={() => setCentro(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
