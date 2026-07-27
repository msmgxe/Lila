'use client'

import { useId, useState } from 'react'

/**
 * Campo de clave con ojito para verla mientras se escribe.
 *
 * Lo usan los dos sitios por los que se entra —el modal de la cabecera y la
 * página `/panel/entrar`—, y por eso vive aquí: son el mismo campo, y si el
 * ojito estuviera en uno solo se notaría al pasar de uno a otro.
 *
 * El botón no entra en el orden de tabulación (`tabIndex={-1}`): quien navega
 * con el teclado va del usuario a la clave y de ahí a Entrar, y un botón en
 * medio le obliga a un tabulador de más cada vez. Se sigue pudiendo pulsar con
 * el ratón, y quien lo necesite con teclado lo alcanza igual desde el botón de
 * cerrar. `aria-label` cambia con el estado para que un lector de pantalla diga
 * qué va a pasar, no qué se ve ahora.
 */
export function CampoClave({
  id,
  name = 'clave',
  etiqueta = 'Clave',
  autoFocus,
}: {
  id?: string
  name?: string
  etiqueta?: string
  autoFocus?: boolean
}) {
  const generado = useId()
  const idCampo = id ?? generado
  const [visible, setVisible] = useState(false)

  return (
    <div className="campo-acceso">
      <label htmlFor={idCampo}>{etiqueta}</label>
      <div className="clave-con-ojo">
        <input
          id={idCampo}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          className="ojo"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar la clave' : 'Ver la clave'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? <OjoTachado /> : <Ojo />}
        </button>
      </div>
    </div>
  )
}

function Ojo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

function OjoTachado() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10.6 6.2A9.9 9.9 0 0112 6c6.4 0 10 6 10 6a18 18 0 01-3 3.7M6.5 7.9A17.4 17.4 0 002 12s3.6 6.5 10 6.5a10 10 0 003.4-.6" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}
