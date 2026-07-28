'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { alternarLibro, moverLibro } from './acciones'

/**
 * La lista de capítulos del panel: buscar, ordenar y publicar.
 *
 * Es hermana de `ListaCapitulos` —comparte sus clases, así que se ve igual que
 * en el sitio— pero es de cliente y hace tres cosas más que allí no pintan
 * nada. Se separó cuando quedó claro que un poemario puede llegar a cincuenta
 * capítulos:
 *
 *   · **buscar**, porque a partir de veinte, encontrar uno con la rueda del
 *     ratón es más lento que escribir tres letras;
 *   · **subir y bajar**, porque el orden de los capítulos es el del libro y
 *     hasta ahora solo se podía cambiar escribiendo un número a mano dentro de
 *     cada capítulo, de uno en uno;
 *   · **publicar o retirar** sin entrar.
 *
 * El filtro es de cliente a propósito: son datos que ya están en la página, y
 * pedirlos otra vez al servidor por cada letra escrita sería más lento y más
 * caro que recorrer un array de cincuenta.
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

export function ListaCapitulosPanel({ capitulos }: { capitulos: CapituloDelPanel[] }) {
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

  return (
    <>
      <div className="filtro-capitulos">
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

      {visibles.length === 0 ? (
        <div className="recuadro">
          <p>Ningún capítulo coincide con «{busca}».</p>
        </div>
      ) : (
        <ol className="lista-capitulos">
          {visibles.map((capitulo) => {
            const pub = capitulo.poemas.filter((p) => p.publicado).length
            const total = capitulo.poemas.length
            // Mover solo tiene sentido sobre la lista COMPLETA: con un filtro
            // puesto, «subir» movería el capítulo por encima de uno que no se
            // está viendo y el resultado parecería aleatorio.
            const puedeMover = visibles.length === capitulos.length

            return (
              <li key={capitulo.id}>
                <Link href={`/panel/libro/${capitulo.slug}`}>
                  <span className="miniatura">
                    {capitulo.portadaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={capitulo.portadaUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="miniatura-numero">{capitulo.orden + 1}</span>
                    )}
                  </span>
                  <span className="lista-texto">
                    <strong>{capitulo.titulo}</strong>
                    <em>
                      {total === 0
                        ? 'sin poemas todavía'
                        : total === pub
                          ? `${total} ${total === 1 ? 'poema' : 'poemas'}`
                          : `${pub} de ${total} publicados`}
                    </em>
                  </span>
                </Link>

                <div className="fila-acciones">
                  {puedeMover && (
                    <>
                      <form action={moverLibro}>
                        <input type="hidden" name="id" value={capitulo.id} />
                        <input type="hidden" name="direccion" value="arriba" />
                        <button className="bt icono" type="submit" title="Subir" aria-label="Subir">
                          ↑
                        </button>
                      </form>
                      <form action={moverLibro}>
                        <input type="hidden" name="id" value={capitulo.id} />
                        <input type="hidden" name="direccion" value="abajo" />
                        <button className="bt icono" type="submit" title="Bajar" aria-label="Bajar">
                          ↓
                        </button>
                      </form>
                    </>
                  )}
                  <form action={alternarLibro}>
                    <input type="hidden" name="id" value={capitulo.id} />
                    <input type="hidden" name="slug" value={capitulo.slug} />
                    <button
                      className={`marca ${capitulo.publicado ? 'publicado' : 'borrador'}`}
                      type="submit"
                      title={
                        capitulo.publicado
                          ? 'Está en el sitio. Pulsa para retirarlo.'
                          : 'Es un borrador. Pulsa para publicarlo.'
                      }
                    >
                      {capitulo.publicado ? 'En el sitio' : 'Borrador'}
                    </button>
                  </form>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {busca && (
        <p className="pista" style={{ marginTop: '.8rem' }}>
          {visibles.length} de {capitulos.length}. Borra la búsqueda para poder reordenar.
        </p>
      )}
    </>
  )
}
