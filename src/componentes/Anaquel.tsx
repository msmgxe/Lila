'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AUTOR, OBRA } from '@/lib/contenido/pentapoemario'
import { categoriasDe, librosVisibles } from '@/lib/categorias'
import { Cabecera } from './Cabecera'
import { Pie } from './Pie'
import type { Libro } from '@/lib/tipos'

/**
 * El anaquel. Recibe los volúmenes ya resueltos por el Server Component: aquí
 * no hay acceso a datos, solo el filtro por categoría, que es puro estado de
 * interfaz y no merece un viaje al servidor.
 */
export function Anaquel({ libros, anio }: { libros: Libro[]; anio: number }) {
  const [filtro, setFiltro] = useState<string>('todos')

  const categorias = useMemo(() => categoriasDe(libros), [libros])
  // Un poemario oculto no aparece en el anaquel aunque sus capítulos estén
  // publicados: ocultarlo es justamente eso.
  const alaVista = useMemo(() => librosVisibles(libros), [libros])
  const visibles = useMemo(
    () =>
      alaVista.filter((l) =>
        filtro === 'todos'
          ? true
          : filtro === 'sin-clasificar'
            ? l.categoria === null
            : l.categoria?.slug === filtro,
      ),
    [alaVista, filtro],
  )

  // La «nueva incorporación» es el último volumen del orden, que es como el
  // poeta los ordena: el más reciente va al final.
  const nuevo = alaVista[alaVista.length - 1]

  return (
    <>
      <Cabecera />
      <section className="biblioteca">
      <aside className="lateral">
        <h2>Índice general</h2>
        <div className="et sub">{OBRA}</div>

        {/* Con una sola categoría el filtro no filtraría nada, y `categoriasDe`
            devuelve una lista vacía: la barra se queda solo con los enlaces. */}
        <ul className="nav">
          {categorias.map((c) => (
            <li key={c.clave}>
              <button
                type="button"
                onClick={() => setFiltro(c.clave)}
                aria-current={c.clave === filtro}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d={c.icono} />
                </svg>
                {c.nombre}
              </button>
            </li>
          ))}
        </ul>

        <div className="abajo">
          <button className="cta" type="button">
            Adquirir el manuscrito
          </button>
          <div className="mini">
            <button type="button">Ajustes</button>
            <button type="button">Contacto</button>
          </div>
        </div>
      </aside>

      <main className="anaquel" id="contenido">
        <h1>El anaquel del poeta</h1>
        <p className="intro">
          Un lugar para la palabra escrita. Cada capítulo reúne cinco poemas de cinco
          versos, con la plancha que los acompaña. Elige uno y ábrelo: se lee, se busca y
          se escucha.
        </p>

        <div className="rejilla">
          {visibles.length > 0 ? (
            visibles.map((libro, i) => {
              const n = libro.poemas.filter((p) => p.publicado).length
              return (
                <Link
                  key={libro.id}
                  href={`/${libro.slug}`}
                  className={`tomo t${(libro.orden ?? i) % 4}`}
                >
                  {/* La portada va como banda superior y SIN recortar. Son
                      tarjetas apaisadas con su propia tipografía: llenar con
                      ellas una ficha vertical obliga a un recorte que se come
                      su texto y lo cruza con el nuestro. */}
                  <span className="banda">
                    {libro.portadaUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={libro.portadaUrl} alt="" aria-hidden="true" />
                    )}
                  </span>
                  <span className="ficha">
                    <span className="centro">
                      <span className="vol">{libro.volumen}</span>
                      <span className="tt">{libro.titulo}</span>
                      <span className="au">{AUTOR}</span>
                    </span>
                    <span className="cn">
                      {n || '—'} {n === 1 ? 'poema' : 'poemas'}
                    </span>
                  </span>
                </Link>
              )
            })
          ) : (
            <p style={{ color: 'var(--neutro)', fontStyle: 'italic' }}>
              Todavía no hay volúmenes en esta categoría.
            </p>
          )}
        </div>

        <div className="tiras">
          <div className="tira">
            <span className="et">Nueva incorporación</span>
            <h3>{nuevo?.titulo ?? '—'}</h3>
            <p>{nuevo?.descripcion ?? ''}</p>
            {nuevo && (
              <Link className="btn" href={`/${nuevo.slug}`}>
                Ver detalle
              </Link>
            )}
          </div>

          <div className="tira centrada">
            <div className="disco">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M4 5h7a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-7a2 2 0 00-2 2v12a2 2 0 012-2h7z" />
              </svg>
            </div>
            <h3>Sala de lectura</h3>
            <p>Entra en el modo de estudio sin distracciones.</p>
            {alaVista[0] && (
              <Link className="btn" href={`/${alaVista[0].slug}?sala=1`}>
                Entrar
              </Link>
            )}
          </div>

          <div className="tira centrada">
            <div className="disco">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M12 3v13.5M12 3a4 4 0 003 3.8M12 3a4 4 0 01-3 3.8" />
                <circle cx="9" cy="18" r="3" />
                <circle cx="18" cy="15" r="3" />
              </svg>
            </div>
            <h3>Recital</h3>
            <p>Escucha los poemas leídos en voz alta, verso a verso.</p>
            {alaVista[0]?.poemas[0] && (
              <Link
                className="btn"
                href={`/${alaVista[0].slug}/${alaVista[0].poemas[0].slug}?narrar=1`}
              >
                Escuchar
              </Link>
            )}
          </div>
        </div>
      </main>
      </section>
      <Pie anio={anio} />
    </>
  )
}
