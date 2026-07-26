'use client'

import { useActionState } from 'react'
import { entrar } from '../acciones'

export function FormularioEntrada() {
  const [estado, accion, pendiente] = useActionState(entrar, undefined)

  return (
    <form action={accion} className="form">
      <div className="campo">
        <label htmlFor="usuario">Usuario</label>
        {/* `key` fuerza a React a recrear el campo con el valor devuelto: si no,
            al reintentar tras un fallo el usuario aparece vacío y hay que
            volver a escribirlo. */}
        <input
          key={estado?.usuario ?? ''}
          id="usuario"
          name="usuario"
          type="text"
          autoComplete="username"
          defaultValue={estado?.usuario ?? ''}
          required
          autoFocus
        />
      </div>

      <div className="campo">
        <label htmlFor="clave">Clave</label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {estado?.error && <p className="error">{estado.error}</p>}

      <button className="bt fuerte" type="submit" disabled={pendiente}>
        {pendiente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
