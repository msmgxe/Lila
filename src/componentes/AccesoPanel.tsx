'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { entrar } from '@/app/panel/acciones'
import { CampoClave } from './CampoClave'

/**
 * Acceso al panel desde la cabecera del sitio.
 *
 * Un botón discreto arriba a la derecha que abre un modal con el formulario.
 * Sigue existiendo `/panel/entrar` como página propia —Auth.js redirige ahí
 * cuando caduca la sesión, y conviene que esa dirección funcione sola— pero
 * desde el sitio se entra sin cambiar de página.
 *
 * Es el MISMO formulario y la MISMA acción de servidor que la página: no hay
 * una segunda ruta de autenticación que mantener ni que revisar.
 */
export function AccesoPanel() {
  const [abierto, setAbierto] = useState(false)
  const [montado, setMontado] = useState(false)
  const [estado, accion, pendiente] = useActionState(entrar, undefined)
  const dialogo = useRef<HTMLDivElement>(null)
  const abridor = useRef<HTMLButtonElement>(null)

  useEffect(() => setMontado(true), [])

  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
      // El foco no debe poder salirse del modal mientras está abierto.
      if (e.key !== 'Tab' || !dialogo.current) return
      const focos = dialogo.current.querySelectorAll<HTMLElement>(
        'input, button, [href], select, textarea',
      )
      if (focos.length === 0) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alPulsar)
    // El primer campo recibe el foco al abrir; al cerrar vuelve al botón.
    dialogo.current?.querySelector<HTMLElement>('input')?.focus()
    return () => {
      document.removeEventListener('keydown', alPulsar)
      abridor.current?.focus()
    }
  }, [abierto])

  return (
    <>
      <button
        ref={abridor}
        type="button"
        className="acceso-btn"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="10.5" width="16" height="10" rx="1.5" />
          <path d="M8 10.5V7a4 4 0 018 0v3.5" />
        </svg>
        Acceder
      </button>

      {abierto &&
        montado &&
        createPortal(
          <div
            className="modal-acceso"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAbierto(false)
            }}
          >
            <div
              className="caja-acceso"
              ref={dialogo}
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-acceso"
            >
              <button
                type="button"
                className="cerrar-acceso"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                ×
              </button>

              <span className="et">Administración de la obra</span>
              <h2 id="titulo-acceso">Acceder</h2>

              <form action={accion} className="form-acceso">
                <div className="campo-acceso">
                  <label htmlFor="acc-usuario">Usuario</label>
                  <input
                    key={estado?.usuario ?? ''}
                    id="acc-usuario"
                    name="usuario"
                    type="text"
                    autoComplete="username"
                    defaultValue={estado?.usuario ?? ''}
                    required
                  />
                </div>

                <CampoClave id="acc-clave" />

                {estado?.error && <p className="error-acceso">{estado.error}</p>}

                <button className="cta-acceso" type="submit" disabled={pendiente}>
                  {pendiente ? 'Entrando…' : 'Entrar'}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
