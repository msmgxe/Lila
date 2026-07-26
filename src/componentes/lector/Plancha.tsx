'use client'

import { arteDePlancha } from '@/lib/arte'
import type { Libro, Pliego } from '@/lib/tipos'

/**
 * La página izquierda del pliego: la obra plástica que acompaña al poema, con
 * su cartela (número, título, técnica).
 *
 * Mientras no haya obra subida se pinta un motivo generativo determinista,
 * teñido con el color del volumen — **y sin cartela**. Una cartela que ponga
 * «pieza no asignada» debajo de cada poema no informa de nada y ensucia el
 * pliego; el hueco callado se lee como lo que es.
 */
export function Plancha({
  pliego,
  libro,
  fundido,
}: {
  pliego: Pliego
  libro: Libro
  fundido: boolean
}) {
  const plancha = pliego.tipo === 'poema' ? pliego.plancha : null
  const semilla =
    pliego.tipo === 'poema' && pliego.poema
      ? `${pliego.poema.slug}-${pliego.parte ?? 0}`
      : `${libro.slug}-${pliego.tipo}`

  return (
    <figure className="plancha" style={{ opacity: fundido ? 0 : 1 }}>
      <div className="arte-caja">
        {plancha?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plancha.url} alt={`${plancha.titulo} — ${plancha.tecnica}`} />
        ) : (
          <div
            // El SVG lo generamos nosotros a partir de una semilla fija y de un
            // color validado: no hay entrada libre de usuario en esta cadena.
            dangerouslySetInnerHTML={{
              __html: arteDePlancha(semilla, pliego.tipo !== 'poema', libro.colorAcento),
            }}
          />
        )}
      </div>

      {plancha && (
        <figcaption className="pie">
          <span className="badge">{plancha.numero}</span>
          <h4>{plancha.titulo}</h4>
          <div className="tec">{plancha.tecnica}</div>
        </figcaption>
      )}
    </figure>
  )
}
