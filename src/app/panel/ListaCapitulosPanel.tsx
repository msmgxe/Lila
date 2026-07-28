'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { alternarLibro, moverLibro } from './acciones'

/**
 * Los capítulos en el panel: carrusel arriba, tabla abajo.
 *
 * Es la propuesta C de `propuestas/04-lista-de-capitulos.html`, y separa las
 * dos cosas distintas que se hacen en esta pantalla:
 *
 *   · **encontrar** un capítulo — arriba, por su portada, que es como se
 *     reconocen de un vistazo porque llevan su número dibujado;
 *   · **administrarlo** — abajo, en filas de una línea donde caben veinte en
 *     pantalla en vez de seis.
 *
 * ── Lo que se arregló por el camino ────────────────────────────────────────
 * La lista anterior recortaba los títulos a «Capítulo …»: las flechas y el
 * rótulo «EN EL SITIO» se comían el ancho y el título se quedaba con lo que
 * sobraba. Un título cortado obliga a abrir el capítulo para saber cuál es, que
 * es justo lo contrario de lo que hace una lista.
 *
 * Tres decisiones, las tres para devolverle el sitio al título:
 *   · el estado pasa a ser un PUNTO de color —verde publicado, ámbar
 *     borrador—, con la palabra en letra pequeña al lado. La palabra no sobra:
 *     quien no distingue el verde del ámbar se quedaría sin la información;
 *   · las acciones son iconos y se encienden al pasar por encima. En reposo la
 *     tabla se lee; al acercarse, se opera;
 *   · el título ocupa la columna que crece, y llega a dos líneas antes de
 *     recortarse.
 */

export interface CapituloDelPanel {
  id: string
  slug: string
  titulo: string
  orden: number
  publicado: boolean
  portadaUrl: string | null
  poemas: Array<{ publicado: boolean }>
}

/** Ignora mayúsculas y tildes: buscar «cuarto» encuentra «Capítulo cuarto». */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    // \u0300-\u036f: los diacríticos que NFD separa de su letra.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const Ojo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)
const Lapiz = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
  </svg>
)

export function ListaCapitulosPanel({
  capitulos,
  poemarioId,
}: {
  capitulos: CapituloDelPanel[]
  poemarioId?: string
}) {
  const [busca, setBusca] = useState('')
  const [soloBorradores, setSoloBorradores] = useState(false)

  const visibles = useMemo(() => {
    const q = normalizar(busca.trim())
    return capitulos.filter((c) => {
      if (soloBorradores && c.publicado) return false
      if (!q) return true
      return normalizar(c.titulo).includes(q) || normalizar(c.slug).includes(q)
    })
  }, [capitulos, busca, soloBorradores])

  const sinPublicar = capitulos.filter((c) => !c.publicado).length
  // Mover solo tiene sentido sobre la lista COMPLETA: con un filtro puesto,
  // «subir» pasaría por encima de un capítulo que no se está viendo y el
  // resultado parecería aleatorio.
  const puedeMover = visibles.length === capitulos.length
  const nuevoHref = poemarioId ? `/panel/libro/nuevo?poemario=${poemarioId}` : '/panel/libro/nuevo'

  return (
    <div className="gestor-capitulos">
      <div className="gestor-barra">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar entre ${capitulos.length} capítulos…`}
          aria-label="Buscar capítulos"
        />
        {sinPublicar > 0 && (
          <button
            type="button"
            className={`bt${soloBorradores ? ' fuerte' : ''}`}
            onClick={() => setSoloBorradores((v) => !v)}
          >
            Sin publicar ({sinPublicar})
          </button>
        )}
      </div>

      {/* ── Arriba: encontrar por la imagen ─────────────────────────────── */}
      <div className="gestor-tira" aria-label="Capítulos por su portada">
        <Link className="tarjeta-nueva" href={nuevoHref}>
          <span className="hueco">+</span>
          <b>Nuevo capítulo</b>
        </Link>

        {visibles.map((c) => (
          <Link key={c.id} className="tarjeta-cap" href={`/panel/libro/${c.slug}`}>
            <span className="tapa">
              {c.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.portadaUrl} alt="" loading="lazy" />
              ) : (
                <span className="sin-portada">{c.orden + 1}</span>
              )}
              <i
                className={`punto ${c.publicado ? 'si' : 'no'}`}
                title={c.publicado ? 'En el sitio' : 'Borrador'}
              />
            </span>
            <b>{c.titulo}</b>
          </Link>
        ))}
      </div>

      {/* ── Abajo: administrar ──────────────────────────────────────────── */}
      {visibles.length === 0 ? (
        <div className="recuadro">
          <p>Ningún capítulo coincide con «{busca}».</p>
        </div>
      ) : (
        <table className="tabla-capitulos">
          <thead>
            <tr>
              <th className="col-n">Nº</th>
              <th>Título</th>
              <th className="col-p">Poemas</th>
              <th className="col-e">Estado</th>
              <th className="col-a">
                <span className="visualmente-oculto">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => {
              const pub = c.poemas.filter((p) => p.publicado).length
              const total = c.poemas.length
              return (
                <tr key={c.id}>
                  <td className="col-n">{String(c.orden + 1).padStart(2, '0')}</td>
                  <td>
                    <Link className="titulo-cap" href={`/panel/libro/${c.slug}`}>
                      {c.titulo}
                    </Link>
                  </td>
                  <td className="col-p">
                    {total === 0 ? '—' : total === pub ? total : `${pub} de ${total}`}
                  </td>
                  <td className="col-e">
                    {/* El botón ES el estado: pulsarlo publica o retira. Un
                        rótulo que además hace algo se entiende antes que un
                        rótulo y un botón separados diciendo lo mismo. */}
                    <form action={alternarLibro}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="slug" value={c.slug} />
                      <button
                        type="submit"
                        className="estado-cap"
                        title={
                          c.publicado
                            ? 'Está en el sitio. Pulsa para retirarlo.'
                            : 'Es un borrador. Pulsa para publicarlo.'
                        }
                      >
                        <i className={`punto ${c.publicado ? 'si' : 'no'}`} />
                        {c.publicado ? 'En el sitio' : 'Borrador'}
                      </button>
                    </form>
                  </td>
                  <td className="col-a">
                    <div className="acciones-cap">
                      {puedeMover && (
                        <>
                          <form action={moverLibro}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="direccion" value="arriba" />
                            <button className="ico" type="submit" title="Subir" aria-label="Subir">
                              ↑
                            </button>
                          </form>
                          <form action={moverLibro}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="direccion" value="abajo" />
                            <button className="ico" type="submit" title="Bajar" aria-label="Bajar">
                              ↓
                            </button>
                          </form>
                        </>
                      )}
                      <Link className="ico" href={`/panel/libro/${c.slug}`} title="Editar">
                        <Lapiz />
                      </Link>
                      {c.publicado && (
                        <Link
                          className="ico"
                          href={`/${c.slug}`}
                          target="_blank"
                          title="Ver en el sitio"
                        >
                          <Ojo />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {busca && (
        <p className="pista" style={{ marginTop: '.8rem' }}>
          {visibles.length} de {capitulos.length}. Borra la búsqueda para poder reordenar.
        </p>
      )}
    </div>
  )
}
