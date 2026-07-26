'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { ResultadoBusqueda } from '@/lib/tipos'

/**
 * Búsqueda global sobre toda la obra. Atajo: `/`.
 *
 * El trabajo pesado (unaccent, ts_headline, índice GIN) ocurre en el servidor,
 * en /api/buscar. Aquí sólo se pide con un pequeño retardo y se agrupa por
 * volumen, que es como el lector espera verlo.
 */
export function Buscador({
  abierto,
  alAbrir,
  alCerrar,
  campoRef,
}: {
  abierto: boolean
  alAbrir: () => void
  alCerrar: () => void
  campoRef: React.RefObject<HTMLInputElement | null>
}) {
  const [consulta, setConsulta] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [cargando, setCargando] = useState(false)
  const [montado, setMontado] = useState(false)
  const abortar = useRef<AbortController | null>(null)

  useEffect(() => setMontado(true), [])

  useEffect(() => {
    const q = consulta.trim()
    if (q.length < 2) {
      setResultados([])
      setCargando(false)
      return
    }
    setCargando(true)
    const t = setTimeout(async () => {
      abortar.current?.abort()
      const ctrl = new AbortController()
      abortar.current = ctrl
      try {
        const r = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!r.ok) throw new Error(String(r.status))
        setResultados((await r.json()).resultados ?? [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResultados([])
      } finally {
        setCargando(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [consulta])

  // Agrupar por volumen: los resultados llegan ya ordenados por relevancia.
  const grupos = resultados.reduce<Record<string, { volumen: string; titulo: string; items: ResultadoBusqueda[] }>>(
    (acc, r) => {
      acc[r.libroSlug] ??= { volumen: r.libroVolumen, titulo: r.libroTitulo, items: [] }
      acc[r.libroSlug].items.push(r)
      return acc
    },
    {},
  )

  const visible = abierto && consulta.trim().length >= 2

  return (
    <>
      <div className="buscador">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={campoRef}
          type="search"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value)
            // Escribir abre los resultados: no hace falta pulsar nada más.
            if (e.target.value.trim().length >= 2) alAbrir()
            else alCerrar()
          }}
          placeholder="Buscar en la obra…"
          aria-label="Buscar en toda la obra"
        />
      </div>

      {/* El modal va por portal a <body> y no donde está el campo: la barra
          superior lleva `backdrop-filter`, y eso la convierte en bloque
          contenedor de sus descendientes `position: fixed`. Dentro de ella, un
          `inset: 0` se ceñiría a la barra en vez de a la pantalla. */}
      {visible &&
        montado &&
        createPortal(
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Resultados de búsqueda"
            onClick={(e) => {
              if (e.target === e.currentTarget) alCerrar()
            }}
          >
          <div className="in">
            <h2>Búsqueda</h2>
            <div className="et meta">
              {cargando
                ? 'Buscando…'
                : `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'} · ${consulta}`}
            </div>

            {!cargando && resultados.length === 0 && (
              <p className="vacio">
                Nada por aquí. Prueba con «casa», «mar», «tiempo» o «sal».
              </p>
            )}

              {Object.entries(grupos).map(([slug, g]) => (
                <section className="grupo" key={slug}>
                  <div className="et">
                    {g.volumen} · {g.titulo}
                  </div>
                  {g.items.map((r) => (
                    <article key={`${slug}-${r.poemaSlug}`}>
                      <Link href={`/${r.libroSlug}/${r.poemaSlug}`} onClick={alCerrar}>
                        <h3>{r.poemaTitulo}</h3>
                        {/* El fragmento viene del servidor con <mark> ya escapado. */}
                        <p dangerouslySetInnerHTML={{ __html: r.fragmento }} />
                      </Link>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
