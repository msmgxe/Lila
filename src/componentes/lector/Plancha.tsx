'use client'

import { arteDePlancha } from '@/lib/arte'
import type { Pliego } from '@/lib/tipos'

/**
 * La página izquierda del pliego: la obra plástica que acompaña al poema, con
 * su cartela (número, título, técnica).
 *
 * Mientras no haya obra real subida, se pinta un SVG generativo determinista
 * que marca el sitio. En cuanto `plancha.url` tenga valor, se muestra la imagen.
 */
export function Plancha({ pliego, fundido }: { pliego: Pliego; fundido: boolean }) {
  const plancha = pliego.plancha

  const contenido = (() => {
    if (pliego.tipo !== 'poema' || !plancha) {
      return {
        semilla: `${pliego.tipo}-${pliego.n}`,
        apagado: true,
        badge: pliego.tipo === 'portada' ? 'Frontispicio' : 'Sin plancha',
        titulo: pliego.tipo === 'portada' ? 'Cubierta del volumen' : 'Pieza no asignada',
        tecnica: 'pendiente de catalogación',
        url: null as string | null,
      }
    }
    return {
      semilla: `${pliego.poema!.slug}-${pliego.parte ?? 0}`,
      apagado: false,
      badge: plancha.numero,
      titulo: plancha.titulo,
      tecnica: plancha.tecnica,
      url: plancha.url,
    }
  })()

  return (
    <figure className="plancha" style={{ opacity: fundido ? 0 : 1 }}>
      {/* La caja lleva clase y no estilos en línea: en el modo sala el CSS
          necesita convertirla en una banda con proporción propia, y un estilo
          en línea se lo impediría. */}
      <div className="arte-caja">
        {contenido.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contenido.url} alt={`${contenido.titulo} — ${contenido.tecnica}`} />
        ) : (
          <div
            // El SVG lo generamos nosotros a partir de una semilla fija: no hay
            // entrada de usuario en esta cadena.
            dangerouslySetInnerHTML={{
              __html: arteDePlancha(contenido.semilla, contenido.apagado),
            }}
          />
        )}
      </div>
      <figcaption className="pie">
        <span className="badge">{contenido.badge}</span>
        <h4>{contenido.titulo}</h4>
        <div className="tec">{contenido.tecnica}</div>
      </figcaption>
    </figure>
  )
}
