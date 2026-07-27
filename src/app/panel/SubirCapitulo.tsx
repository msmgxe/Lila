'use client'

import { useActionState, useRef, useState } from 'react'
import { subirCapitulo, type EstadoImportacion } from './acciones'

/**
 * Subir un capítulo entero desde el Word en el que se escribió, y su portada.
 *
 * Es la puerta por la que la obra entra al sitio sin pasar por un editor: el
 * poeta escribe en Word como siempre y aquí lo suelta. Hasta ahora los poemas
 * se importaban con un script de línea de comandos, que sirve una vez y no
 * sirve nunca más.
 *
 * Dos cosas se dicen en pantalla y no en un comentario, porque son las que
 * quitan el miedo a pulsar el botón:
 *   · no borra nada;
 *   · lo que entra nuevo entra como borrador.
 */
export function SubirCapitulo({ libroId, slug }: { libroId: string; slug: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoImportacion | undefined, FormData>(
    subirCapitulo,
    undefined,
  )
  const [nombreDoc, setNombreDoc] = useState('')
  const [nombreImg, setNombreImg] = useState('')
  const [previa, setPrevia] = useState<string | null>(null)
  const formulario = useRef<HTMLFormElement>(null)

  const hecho =
    estado && !estado.error && (estado.altas || estado.ediciones || estado.portada)

  return (
    <section className="subir-capitulo">
      <h2>Subir desde Word</h2>
      <p className="pista">
        El documento debe llevar cada <strong>título en negrita</strong> y los versos
        debajo sin negrita, con una línea en blanco entre estrofas. Es como ya están
        escritos los capítulos.
      </p>

      <form action={accion} ref={formulario} className="form">
        <input type="hidden" name="libroId" value={libroId} />
        <input type="hidden" name="slug" value={slug} />

        <div className="fila">
          <div className="campo">
            <label htmlFor="documento">Documento (.docx)</label>
            <input
              id="documento"
              name="documento"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setNombreDoc(e.target.files?.[0]?.name ?? '')}
            />
            {nombreDoc && <span className="pista">{nombreDoc}</span>}
          </div>

          <div className="campo">
            <label htmlFor="portada">Portada del capítulo</label>
            <input
              id="portada"
              name="portada"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => {
                const f = e.target.files?.[0]
                setNombreImg(f?.name ?? '')
                setPrevia(f ? URL.createObjectURL(f) : null)
              }}
            />
            {nombreImg && <span className="pista">{nombreImg}</span>}
          </div>
        </div>

        {previa && (
          <figure className="previa-portada">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previa} alt="" />
            <figcaption className="pista">Así se verá en el anaquel.</figcaption>
          </figure>
        )}

        <div className="acciones">
          <button className="btn primario" type="submit" disabled={pendiente}>
            {pendiente ? 'Leyendo…' : 'Subir'}
          </button>
          <span className="pista">
            No se borra ningún poema. Los que ya estaban se actualizan por su título; los
            nuevos entran como borrador para que los revises antes de publicarlos.
          </span>
        </div>
      </form>

      {estado?.error && <p className="error">{estado.error}</p>}

      {hecho && (
        <div className="recuadro resultado-subida">
          <p>
            <strong>Listo.</strong>
          </p>
          <Lista titulo="Poemas nuevos (sin publicar)" cosas={estado.altas} />
          <Lista titulo="Actualizados" cosas={estado.ediciones} />
          <Lista titulo="Sin cambios" cosas={estado.intactos} />
          {estado.portada && <p className="pista">Portada guardada: {estado.portada}</p>}
        </div>
      )}

      {estado?.aviso && estado.aviso.length > 0 && (
        <div className="recuadro avisos-subida">
          <p>
            <strong>Comprueba esto:</strong> el documento se ha leído igualmente, pero no
            encaja con la forma habitual de la obra.
          </p>
          <ul>
            {estado.aviso.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Lista({ titulo, cosas }: { titulo: string; cosas?: string[] }) {
  if (!cosas || cosas.length === 0) return null
  return (
    <>
      <p className="et">
        {titulo} ({cosas.length})
      </p>
      <ul>
        {cosas.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </>
  )
}
