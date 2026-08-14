'use client'

import { useState } from 'react'

/**
 * «¿No puedes entrar?» — la recuperación de la clave.
 *
 * ── Por qué no hay «te envío un enlace al correo» ──────────────────────────
 * Porque no habría a dónde enviarlo. Mandar correo pide un proveedor —Resend,
 * un SMTP— con su cuenta, su dominio verificado y su clave; el sitio no tiene
 * ninguno. Poner el botón sin eso detrás sería peor que no ponerlo: se pulsa,
 * no llega nada, y quien está bloqueado se queda esperando un correo que nunca
 * se envió.
 *
 * Y para un sitio de UN SOLO administrador que además tiene el proyecto en su
 * ordenador, el correo daría una vuelta larga para llegar al mismo sitio: la
 * clave se regenera con un comando. Eso es la recuperación. Lo que faltaba no
 * era el mecanismo — era que estuviera escrito donde uno se queda atascado.
 *
 * Se despliega en el sitio y no lleva a otra página: quien no puede entrar ya
 * está donde tiene que estar, y mandarlo a una pantalla nueva solo añade un
 * paso a alguien que ya está bloqueado.
 */
export function AyudaClave() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="ayuda-clave">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        ¿No puedes entrar?
      </button>

      {abierto && (
        <div className="ayuda-cuerpo">
          <p>
            La clave no se guarda en ninguna parte —solo su huella cifrada—, así que no hay
            forma de recuperarla: se pone una nueva.
          </p>
          <p>
            En la carpeta del proyecto, en una terminal:
          </p>
          <code>npm run panel:clave</code>
          <p>
            Pide el correo y la clave nueva, la escribe en tu ordenador y, si le dices que
            sí, la sube también a Vercel. Después hay que <strong>volver a desplegar</strong>:
            cambiar una variable no toca el sitio que ya está publicado.
          </p>
          <code>npx vercel --prod</code>
          <p className="nota">
            No hay «enviar un enlace al correo» porque el sitio no tiene proveedor de correo
            contratado. Se puede añadir; es un servicio aparte.
          </p>
        </div>
      )}
    </div>
  )
}
