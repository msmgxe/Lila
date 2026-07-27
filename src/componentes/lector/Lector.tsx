'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { entradasDeIndice } from '@/lib/paginar'
import type { Libro, Pliego, Voz } from '@/lib/tipos'
import { CLAVE, SITIO } from '@/lib/sitio'
import { PaginaPliego } from './PaginaPliego'
import { Plancha } from './Plancha'
import { Buscador } from './Buscador'
import { useNarracion } from './useNarracion'

const DURACION_GIRO = 800
const DURACION_DESLIZ = 400
/** Rango del tempo de lectura. 0.5 se sigue entendiendo; por encima de 1.5 la
 *  voz se atropella y el verso deja de oírse como verso. */
const VELOCIDAD_MIN = 0.5
const VELOCIDAD_MAX = 1.5
const VELOCIDAD_PASO = 0.1

interface Props {
  libro: Libro
  pliegos: Pliego[]
  inicial: number
}

function hayGenero(genero: 'masculina' | 'femenina'): boolean {
  if (typeof window === 'undefined') return false;
  const voces = window.speechSynthesis?.getVoices() ?? [];
  return voces.some((v) => {
    const nombre = v.name.toLowerCase();
    if (genero === 'masculina') {
      return nombre.includes('male') || nombre.includes('hombre') || nombre.includes('masculin');
    }
    return nombre.includes('female') || nombre.includes('mujer') || nombre.includes('femenin');
  });
}

export function Lector({ libro, pliegos, inicial }: Props) {
  /* ── estado de navegación ────────────────────────────────────────────── */
  const [n, setN] = useState(inicial)
  const [planchaN, setPlanchaN] = useState(inicial)
  const [fundido, setFundido] = useState(false)
  const [giro, setGiro] = useState<{ frente: number; adelante: boolean } | null>(null)
  const [animando, setAnimando] = useState(false)

  /* ── preferencias del lector (se recuerdan) ──────────────────────────── */
  const [voz, setVoz] = useState<Voz>('femenina')
  const [vozPreferida, setVozPreferida] = useState<string | null>(null)
  const [velocidad, setVelocidad] = useState(1)
  const [sala, setSala] = useState(false)
  const [capital, setCapital] = useState(false)
  const [indiceAbierto, setIndiceAbierto] = useState(true)
  const [marcado, setMarcado] = useState(false)

  /* ── entorno ─────────────────────────────────────────────────────────── */
  const [movil, setMovil] = useState(false)
  const [reducido, setReducido] = useState(false)

  const [aviso, setAviso] = useState<string | null>(null)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [narrarAlEntrar, setNarrarAlEntrar] = useState(false)

  const giroRef = useRef<HTMLDivElement>(null)
  const pliegoRef = useRef<HTMLDivElement>(null)
  const mesaRef = useRef<HTMLDivElement>(null)
  const campoBusqueda = useRef<HTMLInputElement>(null)
  const relojes = useRef<ReturnType<typeof setTimeout>[]>([])
  const avisoReloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  const entradas = useMemo(() => entradasDeIndice(pliegos), [pliegos])
  const pliego = pliegos[n]

  const avisar = useCallback((mensaje: string) => {
    setAviso(mensaje)
    if (avisoReloj.current) clearTimeout(avisoReloj.current)
    avisoReloj.current = setTimeout(() => setAviso(null), 3200)
  }, [])

  const { narrando, versosActivos, narrar, parar, disponible, voces, vozActual } =
    useNarracion({ voz, velocidad, vozPreferida, alAvisar: avisar })

  /* ── lectura del entorno y de las preferencias guardadas ─────────────── */

  useEffect(() => {
    const mMovil = window.matchMedia('(max-width: 860px)')
    const mReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sincronizar = () => {
      setMovil(mMovil.matches)
      setReducido(mReduce.matches)
      // En móvil el cajón del índice arranca cerrado: tapa el pliego entero.
      if (mMovil.matches) setIndiceAbierto(false)
    }
    sincronizar()
    mMovil.addEventListener('change', sincronizar)
    mReduce.addEventListener('change', sincronizar)
    return () => {
      mMovil.removeEventListener('change', sincronizar)
      mReduce.removeEventListener('change', sincronizar)
    }
  }, [])

  useEffect(() => {
    try {
      const g = localStorage.getItem(`${CLAVE}:voz`)
      if (g === 'masculina' || g === 'femenina') setVoz(g)
      const v = Number(localStorage.getItem(`${CLAVE}:velocidad`))
      if (v >= VELOCIDAD_MIN && v <= VELOCIDAD_MAX) setVelocidad(v)
      setVozPreferida(localStorage.getItem(`${CLAVE}:vozPreferida`))
      setSala(localStorage.getItem(`${CLAVE}:sala`) === '1')
      setCapital(localStorage.getItem(`${CLAVE}:capital`) === '1')
    } catch {
      /* modo privado o almacenamiento bloqueado: se usan los valores por defecto */
    }
    // Atajos desde el anaquel: ?sala=1 y ?narrar=1
    const params = new URLSearchParams(window.location.search)
    if (params.get('sala') === '1') setSala(true)
    if (params.get('narrar') === '1') setNarrarAlEntrar(true)
  }, [])

  const guardar = (clave: string, valor: string) => {
    try {
      localStorage.setItem(`${CLAVE}:${clave}`, valor)
    } catch {
      /* sin persistencia; la sesión sigue funcionando igual */
    }
  }

  /* ── navegación entre pliegos ────────────────────────────────────────── */

  const limpiarRelojes = useCallback(() => {
    relojes.current.forEach(clearTimeout)
    relojes.current = []
  }, [])

  /** ¿Toca giro 3D, o una transición más discreta? */
  const sinGiro = sala || movil || reducido

  const ir = useCallback(
    (destino: number) => {
      const d = Math.max(0, Math.min(pliegos.length - 1, destino))
      if (d === n || animando) return
      parar()
      limpiarRelojes()

      if (sinGiro) {
        if (sala && !reducido) {
          // Deslizamiento silencioso — dirección B (Sala blanca).
          const el = pliegoRef.current
          const clase = d > n ? 'sale-izq' : 'sale-der'
          setAnimando(true)
          el?.classList.add(clase)
          relojes.current.push(
            setTimeout(() => {
              setN(d)
              setPlanchaN(d)
              el?.classList.remove(clase)
              setAnimando(false)
            }, DURACION_DESLIZ),
          )
        } else {
          setN(d)
          setPlanchaN(d)
        }
        return
      }

      // Giro 3D sobre la hoja derecha — dirección E (Biblioteca).
      const adelante = d > n
      setAnimando(true)
      setGiro({ frente: adelante ? n : d, adelante })
      // Yendo hacia delante, la página de debajo ya muestra el destino: es lo
      // que se descubre según gira la hoja.
      if (adelante) setN(d)

      // La plancha no gira: cambia con un fundido, a mitad del giro.
      relojes.current.push(setTimeout(() => setFundido(true), 300))
      relojes.current.push(
        setTimeout(() => {
          setPlanchaN(d)
          setFundido(false)
        }, 480),
      )
      relojes.current.push(
        setTimeout(() => {
          setGiro(null)
          setAnimando(false)
          if (!adelante) setN(d)
        }, DURACION_GIRO),
      )
    },
    [n, animando, pliegos.length, sinGiro, sala, reducido, parar, limpiarRelojes],
  )

  useEffect(() => () => limpiarRelojes(), [limpiarRelojes])

  /* Arranca la animación de la hoja en cuanto React ha pintado las dos caras. */
  useLayoutEffect(() => {
    const el = giroRef.current
    if (!el) return
    if (!giro) {
      el.classList.remove('on')
      el.style.transform = ''
      return
    }
    el.style.transition = 'none'
    el.style.transform = `rotateY(${giro.adelante ? 0 : -180}deg)`
    el.classList.add('on')
    void el.offsetWidth // fuerza el reflow para que el navegador no funda los dos estados
    const id = requestAnimationFrame(() => {
      el.style.transition = ''
      el.style.transform = `rotateY(${giro.adelante ? -180 : 0}deg)`
    })
    return () => cancelAnimationFrame(id)
  }, [giro])

  /* La URL sigue al pliego: cada poema tiene la suya y se puede compartir.
     replaceState y no pushState — el botón «atrás» devuelve al anaquel, que es
     lo que espera quien llega de fuera, en vez de deshacer página a página. */
  useEffect(() => {
    const p = pliegos[n]
    const url =
      p.tipo === 'poema' && p.poema ? `/${libro.slug}/${p.poema.slug}` : `/${libro.slug}`
    if (window.location.pathname !== url) window.history.replaceState(null, '', url)
  }, [n, pliegos, libro.slug])

  /* Cada pliego empieza por arriba. */
  useEffect(() => {
    pliegoRef.current?.querySelector('.hoja-int')?.scrollTo({ top: 0 })
    pliegoRef.current?.scrollTo({ top: 0 })
  }, [n])

  /* ¿Está marcada esta página? */
  useEffect(() => {
    try {
      setMarcado(localStorage.getItem(`${CLAVE}:marcador`) === `${libro.slug}:${n}`)
    } catch {
      /* sin almacenamiento */
    }
  }, [libro.slug, n])

  /* El verso que se lee tiene que estar a la vista. */
  useEffect(() => {
    if (versosActivos.length === 0) return
    const versos = pliegoRef.current?.querySelectorAll('.pagina .verso')
    // Con la frase entera iluminada, se sigue al primero de sus versos.
    const el = versos?.[versosActivos[0]] as HTMLElement | undefined
    if (!el) return
    const caja = el.closest('.hoja-int') ?? el.closest('.pliego')
    if (!caja) return
    const r = el.getBoundingClientRect()
    const rc = caja.getBoundingClientRect()
    if (r.top < rc.top + 20 || r.bottom > rc.bottom - 20) {
      el.scrollIntoView({ block: 'center', behavior: reducido ? 'auto' : 'smooth' })
    }
    // `join` y no el array: si no, el efecto se dispara en cada render.
  }, [versosActivos.join(','), reducido])

  /* ── narración ───────────────────────────────────────────────────────── */

  const alternarNarracion = useCallback(() => {
    if (narrando) {
      parar()
      return
    }
    const p = pliegos[n]
    if (p.tipo !== 'poema' || !p.poema || !p.estrofas) return
    const [desde, hasta] = p.estrofas
    narrar(
      p.poema.estrofas.slice(desde, hasta + 1),
      p.poema.titulo,
      (p.parte ?? 0) === 0, // el título sólo se lee en el primer pliego del poema
    )
  }, [narrando, parar, narrar, pliegos, n])

  /* Llegada desde «Recital»: arranca la lectura sola, una sola vez. */
  useEffect(() => {
    if (!narrarAlEntrar || !disponible) return
    setNarrarAlEntrar(false)
    const t = setTimeout(alternarNarracion, 500)
    return () => clearTimeout(t)
  }, [narrarAlEntrar, disponible, alternarNarracion])

  const cambiarVoz = (g: Voz) => {
    setVoz(g)
    guardar('voz', g)
    if (narrando) avisar('La voz cambia en la próxima lectura.')
  }

  const cambiarVelocidad = (v: number) => {
    const limitada = Math.min(VELOCIDAD_MAX, Math.max(VELOCIDAD_MIN, Math.round(v * 10) / 10))
    setVelocidad(limitada)
    guardar('velocidad', String(limitada))
  }

  const cambiarVozPreferida = (uri: string) => {
    const valor = uri || null
    setVozPreferida(valor)
    try {
      if (valor) localStorage.setItem(`${CLAVE}:vozPreferida`, valor)
      else localStorage.removeItem(`${CLAVE}:vozPreferida`)
    } catch {
      /* sin persistencia */
    }
    if (narrando) avisar('La voz cambia en la próxima lectura.')
  }

  /* ── teclado ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement
      const enCampo = destino.tagName === 'INPUT' || destino.tagName === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (buscadorAbierto) {
          setBuscadorAbierto(false)
          campoBusqueda.current?.blur()
        } else if (narrando) {
          parar()
        }
        return
      }
      if (e.key === '/' && !enCampo) {
        e.preventDefault()
        setBuscadorAbierto(true)
        campoBusqueda.current?.focus()
        return
      }
      if (enCampo) return

      if (e.key === 'ArrowRight' || e.key === 'PageDown') ir(n + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') ir(n - 1)
      else if (e.key === 'Home') ir(0)
      else if (e.key === 'End') ir(pliegos.length - 1)
      else if (e.key === ' ' && pliego.tipo === 'poema') {
        e.preventDefault()
        alternarNarracion()
      }
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [ir, n, pliegos.length, pliego.tipo, alternarNarracion, buscadorAbierto, narrando, parar])

  /* ── arrastre táctil ─────────────────────────────────────────────────── */

  useEffect(() => {
    const el = mesaRef.current
    if (!el) return
    let x0: number | null = null
    let y0 = 0
    const inicio = (e: TouchEvent) => {
      x0 = e.touches[0].clientX
      y0 = e.touches[0].clientY
    }
    const fin = (e: TouchEvent) => {
      if (x0 === null) return
      const dx = e.changedTouches[0].clientX - x0
      const dy = e.changedTouches[0].clientY - y0
      // Solo si el gesto es claramente horizontal: si no, es un scroll.
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) ir(n + (dx < 0 ? 1 : -1))
      x0 = null
    }
    el.addEventListener('touchstart', inicio, { passive: true })
    el.addEventListener('touchend', fin, { passive: true })
    return () => {
      el.removeEventListener('touchstart', inicio)
      el.removeEventListener('touchend', fin)
    }
  }, [ir, n])

  /* ── acciones de la barra ────────────────────────────────────────────── */

  const marcar = () => {
    try {
      if (marcado) {
        localStorage.removeItem(`${CLAVE}:marcador`)
        setMarcado(false)
        avisar('Marcador retirado.')
      } else {
        localStorage.setItem(`${CLAVE}:marcador`, `${libro.slug}:${n}`)
        setMarcado(true)
        avisar(`Marcador puesto en la página ${pliego.folio}.`)
      }
    } catch {
      avisar('No se ha podido guardar el marcador en este navegador.')
    }
  }

  const compartir = async () => {
    const url = window.location.href
    const titulo =
      pliego.tipo === 'poema' && pliego.poema
        ? `${pliego.poema.titulo} — ${libro.titulo}`
        : libro.titulo
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url })
      } else {
        await navigator.clipboard.writeText(url)
        avisar('Dirección copiada al portapapeles.')
      }
    } catch {
      /* el usuario canceló el diálogo de compartir: no es un error */
    }
  }

  const alternarSala = () => {
    const v = !sala
    setSala(v)
    guardar('sala', v ? '1' : '0')
    avisar(v ? 'Sala de lectura: sin distracciones.' : 'De vuelta a la biblioteca.')
  }

  const alternarCapital = () => {
    const v = !capital
    setCapital(v)
    guardar('capital', v ? '1' : '0')
  }

  /* ── render ──────────────────────────────────────────────────────────── */

  const progreso = ((n + 1) / pliegos.length) * 100

  return (
    <section className="lector" data-sala={sala ? 'true' : 'false'}>
      <header className="topbar">
        <button
          className="ic"
          type="button"
          onClick={() => setIndiceAbierto((v) => !v)}
          aria-label={indiceAbierto ? 'Cerrar el índice' : 'Abrir el índice del volumen'}
          aria-expanded={indiceAbierto}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <Link className="marca" href="/">
          {SITIO.nombre}
        </Link>

        <Buscador
          abierto={buscadorAbierto}
          alAbrir={() => setBuscadorAbierto(true)}
          alCerrar={() => setBuscadorAbierto(false)}
          campoRef={campoBusqueda}
        />

        <div className="narr">
          <svg
            style={{ width: 15, height: 15, opacity: 0.7 }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M4 9v6h4l5 4V5L8 9zM17 9a4 4 0 010 6" />
          </svg>
          <span className="lb">Narración</span>
          <div className="sw" role="group" aria-label="Voz de la narración">
            <button
              type="button"
              onClick={() => cambiarVoz('masculina')}
              aria-pressed={voz === 'masculina'}
              title={
                hayGenero('masculina')
                  ? 'Voz masculina'
                  : 'Tu sistema no tiene voz masculina en español'
              }
              disabled={voces.length === 0}
            >
              M
            </button>
            <button
              type="button"
              onClick={() => cambiarVoz('femenina')}
              aria-pressed={voz === 'femenina'}
              title={
                hayGenero('femenina')
                  ? 'Voz femenina'
                  : 'Tu sistema no tiene voz femenina en español'
              }
              disabled={voces.length === 0}
            >
              F
            </button>
          </div>

          {/* Qué voz suena de verdad, y cómo cambiarla. La API no dice el género
              de cada voz —hay que deducirlo del nombre— así que el conmutador
              M/F acierta casi siempre pero no siempre. Aquí se ve y se corrige. */}
          {voces.length > 0 && (
            <select
              className="sel-voz"
              value={vozPreferida ?? ''}
              onChange={(e) => cambiarVozPreferida(e.target.value)}
              aria-label="Elegir la voz del sistema"
              title={vozActual ? `Suena «${vozActual.nombre}»` : undefined}
            >
              <option value="">
                {vozActual ? vozActual.nombre : 'Automática'}
                {vozActual && !hayGenero(voz) ? ' (no es del género pedido)' : ''}
              </option>
              {voces.map((v) => (
                <option key={v.uri} value={v.uri}>
                  {v.nombre}
                  {v.genero ? ` · ${v.genero}` : ' · género desconocido'}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <div className="progreso">
        <i style={{ width: `${progreso}%` }} />
      </div>

      <div className="cuerpo-lector">
        <aside className={`indice${indiceAbierto ? '' : ' cerrado'}`} aria-label="Índice del volumen">
          <h3>{libro.titulo}</h3>
          <div className="et sub">
            {libro.volumen} · {libro.categoria}
          </div>
          <ol>
            {entradas.map((e) => (
              <li key={e.slug}>
                <button
                  type="button"
                  onClick={() => {
                    ir(e.n)
                    if (movil) setIndiceAbierto(false)
                  }}
                  aria-current={
                    pliego.tipo === 'poema' && pliego.poema?.slug === e.slug ? 'true' : 'false'
                  }
                >
                  <span className="ti">{e.titulo}</span>
                  <span className="np">{String(e.folio).padStart(3, '0')}</span>
                </button>
              </li>
            ))}
          </ol>
          <Link className="volver" href="/">
            ← Volver al anaquel
          </Link>
        </aside>

        <div className="mesa" ref={mesaRef} id="contenido">
          <div className="pliego" ref={pliegoRef}>
            <Plancha pliego={pliegos[planchaN]} libro={libro} fundido={fundido} />

            <section className="pagina" aria-live="polite">
              <PaginaPliego
                libro={libro}
                pliego={pliego}
                entradas={entradas}
                versosActivos={versosActivos}
                narrando={narrando}
                capital={capital}
                alIr={ir}
              />
            </section>

            {/* La hoja que gira. Sólo existe mientras dura la animación. */}
            <div className="giro" ref={giroRef} aria-hidden="true">
              <div className="cara frente">
                {giro && (
                  <PaginaPliego
                    libro={libro}
                    pliego={pliegos[giro.frente]}
                    entradas={entradas}
                    versosActivos={[]}
                    narrando={false}
                    capital={capital}
                    alIr={() => { }}
                    inerte
                  />
                )}
              </div>
              <div className="cara dorso">
                <span>~</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="herr">
        <button
          className="hbtn"
          type="button"
          onClick={alternarNarracion}
          disabled={pliego.tipo !== 'poema' || !disponible}
          aria-pressed={narrando}
          title={disponible ? 'Leer el poema en voz alta (barra espaciadora)' : 'Sin voz en este navegador'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            {narrando ? (
              <path d="M7 6h3v12H7zM14 6h3v12h-3z" />
            ) : (
              <>
                <path d="M4 9v6h4l5 4V5L8 9z" />
                <path d="M17 9a4 4 0 010 6" />
              </>
            )}
          </svg>
          <span>{narrando ? 'Detener' : 'Narrar'}</span>
        </button>

        <div className="tempo">
          <button type="button" onClick={() => ir(n - 1)} disabled={n === 0} aria-label="Pliego anterior">
            ‹
          </button>
          <button
            className="hbtn"
            type="button"
            onClick={() => cambiarVelocidad(velocidad + VELOCIDAD_PASO)}
            style={{ minWidth: 66 }}
            aria-label={`Tempo de lectura: ${velocidad.toFixed(1)} por uno. Pulsa para cambiar.`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>{velocidad.toFixed(1)}×</span>
          </button>
          <button
            type="button"
            onClick={() => ir(n + 1)}
            disabled={n >= pliegos.length - 1}
            aria-label="Pliego siguiente"
          >
            ›
          </button>
        </div>

        <button
          className="hbtn"
          type="button"
          onClick={alternarSala}
          aria-pressed={sala}
          title="Sala de lectura: fondo claro, una sola columna, sin giro"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="3" y="4" width="18" height="16" rx="1" />
            <path d="M8 9h8M8 13h5" />
          </svg>
          <span>Sala</span>
        </button>

        <button
          className="hbtn"
          type="button"
          onClick={alternarCapital}
          aria-pressed={capital}
          title="Letra capital al inicio del poema"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M5 20V6h5a4 4 0 010 8H5M14 20h5M16.5 4v16" />
          </svg>
          <span>Capital</span>
        </button>

        <button className="hbtn" type="button" onClick={marcar} aria-pressed={marcado} title="Marcar esta página">
          <svg viewBox="0 0 24 24" fill={marcado ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
            <path d="M6 4h12v16l-6-4-6 4z" />
          </svg>
          <span>Marcar</span>
        </button>

        <button className="hbtn" type="button" onClick={compartir} title="Compartir esta página">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M12 16V4M12 4L8 8M12 4l4 4M5 14v5a1 1 0 001 1h12a1 1 0 001-1v-5" />
          </svg>
          <span>Compartir</span>
        </button>
      </footer>

      <div className={`aviso${aviso ? ' on' : ''}`} role="status" aria-live="polite">
        {aviso}
      </div>
    </section>
  )
}
