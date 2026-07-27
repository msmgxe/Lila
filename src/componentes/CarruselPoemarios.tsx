'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { colorDelPoemario } from '@/lib/color'
import type { Poemario } from '@/lib/poemarios'

/**
 * El carrusel de poemarios: la portada del sitio.
 *
 * Tarjetas en profundidad — la del centro de frente, las de al lado giradas y
 * retranqueadas—, con la ficha del poemario debajo. Es una vitrina: la obra se
 * presenta por su imagen antes que por su letra pequeña, que es como llega
 * alguien desde redes.
 *
 * ── Lo que hace que esto no sea solo un efecto ──────────────────────────────
 * **Cada tarjeta es un enlace de verdad.** El giro es `transform`, no una
 * imagen recortada: el buscador ve ocho enlaces a ocho poemarios, y quien
 * navega con el teclado los recorre en orden. Un carrusel que se pinta con
 * `<div onClick>` no es navegable ni indexable, y aquí la obra tiene que serlo.
 *
 * **La legibilidad manda sobre el efecto**, como en el resto del sitio: con
 * `prefers-reduced-motion` las transiciones desaparecen —el carrusel sigue
 * funcionando, solo que sin animar— y por debajo de 900 px se cae a una
 * columna, sin perspectiva, porque en un móvil las tarjetas giradas quedan a
 * dos dedos de ancho y no se ve ninguna.
 */
export function CarruselPoemarios({
  poemarios,
  titulo,
  autor,
}: {
  poemarios: Poemario[]
  titulo: string
  autor: string
}) {
  const [centro, setCentro] = useState(0)
  const router = useRouter()
  const pista = useRef<HTMLDivElement>(null)

  const total = poemarios.length
  const ir = useCallback(
    (paso: number) => setCentro((c) => (c + paso + total) % total),
    [total],
  )

  // Flechas del teclado: el gesto que espera cualquiera ante una fila de cosas.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      // Si el foco está escribiendo en algún sitio, las flechas son suyas.
      const activo = document.activeElement
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') ir(1)
      if (e.key === 'ArrowLeft') ir(-1)
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [ir])

  // Deslizar con el dedo. Solo horizontal: el vertical es de la página.
  const inicio = useRef<{ x: number; y: number } | null>(null)
  const alTocar = {
    onTouchStart: (e: React.TouchEvent) => {
      inicio.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!inicio.current) return
      const dx = e.changedTouches[0].clientX - inicio.current.x
      const dy = e.changedTouches[0].clientY - inicio.current.y
      inicio.current = null
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1)
    },
  }

  if (total === 0) return null

  const actual = poemarios[centro]

  return (
    <section
      className="vitrina"
      aria-roledescription="carrusel"
      aria-label="Poemarios"
      style={colorDelPoemario(actual.categoria.colorAcento)}
    >
      <header className="vitrina-rotulo">
        <span className="et">{autor}</span>
        <h1>{titulo}</h1>
      </header>

      <div className="vitrina-pista" ref={pista} {...alTocar}>
        {poemarios.map((poemario, i) => {
          // Distancia con la vuelta dada: con seis poemarios, el 5 está a uno
          // del 0, no a cinco. Sin esto el salto de la última a la primera
          // atraviesa toda la baraja.
          let d = i - centro
          if (d > total / 2) d -= total
          if (d < -total / 2) d += total

          const fuera = Math.abs(d) > 2
          return (
            <article
              key={poemario.categoria.slug}
              className={`lamina${d === 0 ? ' al-frente' : ''}`}
              aria-hidden={fuera}
              style={
                {
                  '--d': d,
                  // Las de más allá de la tercera no se pintan: estorban al
                  // ratón y no se ven. Se quedan detrás, transparentes.
                  opacity: fuera ? 0 : undefined,
                  pointerEvents: fuera ? 'none' : undefined,
                  zIndex: 10 - Math.abs(d),
                } as React.CSSProperties
              }
              onClick={() => {
                // Pulsar una lateral la trae al centro en vez de abrirla: es lo
                // que espera quien está ojeando, y evita entrar sin querer.
                if (d !== 0) setCentro(i)
              }}
            >
              <Link
                href={`/poemario/${poemario.categoria.slug}`}
                tabIndex={d === 0 ? 0 : -1}
                onClick={(e) => {
                  if (d !== 0) {
                    e.preventDefault()
                    setCentro(i)
                  }
                }}
              >
                {poemario.portadaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poemario.portadaUrl} alt="" loading={d === 0 ? 'eager' : 'lazy'} />
                ) : (
                  <span className="lamina-sin-imagen" aria-hidden="true">
                    {poemario.categoria.nombre.charAt(0)}
                  </span>
                )}
                <div className="lamina-pie">
                  <h2>{poemario.categoria.nombre}</h2>
                  <p>{poemario.capitulos.length} capítulos</p>
                </div>
              </Link>
            </article>
          )
        })}
      </div>

      <div className="vitrina-ficha">
        <button type="button" onClick={() => ir(-1)} aria-label="Poemario anterior">
          ‹
        </button>

        <Link href={`/poemario/${actual.categoria.slug}`} className="vitrina-ficha-cuerpo">
          {actual.portadaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={actual.portadaUrl} alt="" />
          )}
          <span>
            <strong>{actual.categoria.nombre}</strong>
            <em>{actual.categoria.descripcion ?? `${actual.cuantosPoemas} poemas`}</em>
          </span>
        </Link>

        <button type="button" onClick={() => ir(1)} aria-label="Poemario siguiente">
          ›
        </button>
      </div>

      {/* La tira de capítulos del poemario destacado.
          No sobraba: con un solo poemario el carrusel es una lámina suelta y la
          portada se queda desierta. Y con varios sigue valiendo — enseña lo que
          hay dentro antes de entrar, que es lo que hace que alguien entre. */}
      {actual.capitulos.length > 0 && (
        <div className="vitrina-tira" aria-label={`Capítulos de ${actual.categoria.nombre}`}>
          {actual.capitulos.map((capitulo, i) => (
            <Link key={capitulo.id} href={`/${capitulo.slug}`} className="tira-capitulo">
              {capitulo.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capitulo.portadaUrl} alt="" loading="lazy" />
              ) : (
                <span className="tira-numero">{i + 1}</span>
              )}
              <span className="tira-titulo">{capitulo.titulo}</span>
            </Link>
          ))}
        </div>
      )}

      {total > 1 && (
        <div className="vitrina-puntos" role="tablist" aria-label="Elegir poemario">
          {poemarios.map((p, i) => (
            <button
              key={p.categoria.slug}
              type="button"
              role="tab"
              aria-selected={i === centro}
              aria-label={p.categoria.nombre}
              className={i === centro ? 'activo' : ''}
              onClick={() => setCentro(i)}
              onDoubleClick={() => router.push(`/poemario/${p.categoria.slug}`)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
