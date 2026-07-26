'use client'

import { AUTOR } from '@/lib/contenido/pentapoemario'
import { vineta } from '@/lib/arte'
import { limpiarMarcas, romano } from '@/lib/texto'
import type { Libro, Pliego } from '@/lib/tipos'

interface Props {
  libro: Libro
  pliego: Pliego
  entradas: Array<{ n: number; folio: number; titulo: string; slug: string; forma: string }>
  /** Versos que se están leyendo, dentro de esta página. Suelen ser varios:
   *  los encabalgados se leen de corrido, en una sola emisión. */
  versosActivos: number[]
  narrando: boolean
  capital: boolean
  alIr: (n: number) => void
  /** Solo para las caras de la hoja que gira: sin interacción ni resaltados. */
  inerte?: boolean
}

/**
 * La página derecha: el papel. Cuatro tipos de pliego —portada, índice, poema y
 * colofón—. Los tres que no son poema vienen de la dirección A (Códice); el
 * pliego de poema, de la E (Biblioteca).
 */
export function PaginaPliego({
  libro,
  pliego,
  entradas,
  versosActivos,
  narrando,
  capital,
  alIr,
  inerte = false,
}: Props) {
  return (
    <>
      <div className="folio">Página {String(pliego.folio).padStart(3, '0')}</div>
      <div className="hoja-int">
        {pliego.tipo === 'portada' && <Portada libro={libro} />}

        {pliego.tipo === 'indice' && (
          <>
            <div className="forma-et">Índice</div>
            <h2 className="tit">Contenido</h2>
            <div className="regla" />
            <ul className="idx-pag">
              {entradas.map((e) => (
                <li key={e.slug}>
                  <button type="button" onClick={() => !inerte && alIr(e.n)} tabIndex={inerte ? -1 : 0}>
                    <span className="t">{e.titulo}</span>
                    <span className="pt" />
                    <span className="pg">{String(e.folio).padStart(3, '0')}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="pie-pag">
              <span>
                {entradas.length} {entradas.length === 1 ? 'pieza' : 'piezas'} · {libro.categoria}
              </span>
            </div>
          </>
        )}

        {pliego.tipo === 'poema' && (
          <PoemaPliego
            pliego={pliego}
            libro={libro}
            versosActivos={versosActivos}
            narrando={narrando}
            capital={capital}
            alIr={alIr}
            inerte={inerte}
          />
        )}

        {pliego.tipo === 'colofon' && <Colofon libro={libro} />}
      </div>
    </>
  )
}

function Portada({ libro }: { libro: Libro }) {
  return (
    <div className="portada-vol">
      <div className="vol">{libro.volumen}</div>
      <div className="filete">
        <h1>{libro.titulo}</h1>
        {libro.subtitulo && <p className="et" style={{ marginTop: '.9rem' }}>{libro.subtitulo}</p>}
      </div>
      {libro.descripcion && <p className="desc">{libro.descripcion}</p>}
      <div className="au">{AUTOR}</div>
    </div>
  )
}

function Colofon({ libro }: { libro: Libro }) {
  const cuantos = libro.poemas.filter((p) => p.publicado).length
  return (
    <div className="portada-vol">
      <div className="filete" style={{ borderTop: 0, borderBottom: 0 }}>
        <p className="desc" style={{ maxWidth: '30ch' }}>
          Aquí acaba el <em>{libro.titulo.toLowerCase()}</em>, con {cuantos}{' '}
          {cuantos === 1 ? 'poema' : 'poemas'}.
        </p>
      </div>
      <div className="au">
        {AUTOR}
        <br />
        {libro.volumen} · {libro.anio ?? ''}
      </div>
    </div>
  )
}

function PoemaPliego({
  pliego,
  libro,
  versosActivos,
  narrando,
  capital,
  alIr,
  inerte,
}: {
  pliego: Pliego
  libro: Libro
  versosActivos: number[]
  narrando: boolean
  capital: boolean
  alIr: (n: number) => void
  inerte: boolean
}) {
  const poema = pliego.poema!
  const [desde, hasta] = pliego.estrofas!
  const esContinuacion = (pliego.parte ?? 0) > 0

  // Numeración de versos continua dentro de la página: es la que usa el
  // resaltado de la narración, que sólo conoce esta página.
  let contador = 0

  const clases = ['poema', pliego.densidad ?? 'normal']
  if (capital && !esContinuacion) clases.push('capitular')
  if (narrando) clases.push('enfocando')

  return (
    <>
      <div className="forma-et">{poema.forma}</div>
      <h2 className="tit">
        {poema.titulo}
        {esContinuacion && <span className="sigue"> (sigue)</span>}
      </h2>

      {/* La dedicatoria se ve pero NO se lee en voz alta. */}
      {poema.dedicatoria && !esContinuacion && (
        <p className="dedic" data-no-leer>
          {poema.dedicatoria}
        </p>
      )}

      <div className={clases.join(' ')}>
        {poema.estrofas.slice(desde, hasta + 1).map((estrofa, e) => (
          <div className="estrofa" key={`${desde + e}`}>
            {estrofa.map((verso, v) => {
              const indice = contador++
              return (
                <span
                  key={v}
                  className={`verso${!inerte && versosActivos.includes(indice) ? ' leyendo' : ''}`}
                >
                  {/* Las marcas manuales del poeta (/ y //) no se imprimen. */}
                  {limpiarMarcas(verso)}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      {/* La nota del autor tampoco se lee en voz alta. */}
      {poema.notaAutor && !esContinuacion && (
        <p className="nota-autor" data-no-leer>
          {poema.notaAutor}
        </p>
      )}

      {/* La viñeta es lo primero que se sacrifica cuando la página va justa:
          el servidor ya ha decidido si cabe. */}
      {pliego.vineta && (
        <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: vineta(poema.slug) }} />
      )}

      <div className="pie-pag">
        {/* Los temas cuando los hay; si no, la referencia del volumen — el pie
            nunca se queda vacío. */}
        <span>
          {pliego.partes && pliego.partes > 1
            ? `Fragmento ${romano((pliego.parte ?? 0) + 1)} de ${pliego.partes} · ${libro.categoria}`
            : poema.temas.length > 0
              ? poema.temas.slice(0, 3).join(' · ')
              : `${libro.volumen} · ${libro.titulo}`}
        </span>
        <button
          className="der"
          type="button"
          onClick={() => !inerte && alIr(pliego.n + 1)}
          tabIndex={inerte ? -1 : 0}
        >
          Seguir →
        </button>
      </div>
    </>
  )
}
