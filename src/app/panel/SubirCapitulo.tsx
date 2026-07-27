'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { subirCapitulo, type EstadoImportacion } from './acciones'

/**
 * Subir un capítulo entero desde el Word en el que se escribió, y su portada.
 *
 * Es la puerta por la que la obra entra al sitio sin pasar por un editor: el
 * poeta escribe en Word como siempre y aquí lo suelta.
 *
 * ── Lo aprendido a base de que no funcionara ────────────────────────────────
 * Esta pantalla ha fallado dos veces en silencio, y las dos veces el síntoma
 * fue el mismo desde fuera: «elijo la imagen y no pasa nada».
 *
 *   1. El botón llevaba una clase inexistente y salía pegado al texto de al
 *      lado. No parecía un botón, así que no se pulsaba.
 *   2. Next corta el cuerpo de una Server Action en 1 MB por defecto. Una foto
 *      lo pasa, y el corte ocurre antes de que llegue a correr nuestro código:
 *      el envío se caía sin dejar rastro en pantalla.
 *
 * De ahí las tres reglas que gobiernan este componente:
 *   · el peso se comprueba en el navegador, ANTES de enviar nada;
 *   · el botón dice qué va a hacer, y mientras lo hace se ve que lo hace;
 *   · el resultado —bien o mal— sale siempre, y sale arriba, donde se mira.
 */

const TOPE_IMAGEN = 6 * 1024 * 1024
const TOPE_DOCX = 4 * 1024 * 1024

function pesa(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} kB`
}

export function SubirCapitulo({ libroId, slug }: { libroId: string; slug: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoImportacion | undefined, FormData>(
    subirCapitulo,
    undefined,
  )
  const [doc, setDoc] = useState<File | null>(null)
  const [img, setImg] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const router = useRouter()
  const resultado = useRef<HTMLDivElement>(null)
  const formulario = useRef<HTMLFormElement>(null)

  /*
   * Al terminar bien: refrescar y llevar la vista al resultado.
   *
   * Lo primero, porque la página ya estaba pintada y sin refrescar el campo
   * «Dirección de la portada» de más abajo sigue enseñando el valor anterior:
   * parece que no ha pasado nada aunque haya pasado. Lo segundo, porque el
   * formulario es largo y el aviso puede quedar fuera de la pantalla.
   */
  useEffect(() => {
    if (!estado || estado.error) return
    // Vaciar el formulario. Si no, la previsualización sigue diciendo «todavía
    // sin guardar» y el botón «Guardar la imagen» debajo de un aviso que acaba
    // de decir «Guardado»: dos mensajes que se contradicen en la misma
    // pantalla, y el segundo invita a pulsar otra vez por si acaso.
    formulario.current?.reset()
    setDoc(null)
    setImg(null)
    setPrevia(null)
    router.refresh()
    resultado.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [estado, router])

  // Se comprueba aquí y no solo en el servidor: si pasa del tope, el envío se
  // cae por debajo y no hay manera de contarlo.
  const problemaLocal =
    img && img.size > TOPE_IMAGEN
      ? `La imagen pesa ${pesa(img.size)} y el tope son ${pesa(TOPE_IMAGEN)}. Redúcela antes de subirla.`
      : doc && doc.size > TOPE_DOCX
        ? `El documento pesa ${pesa(doc.size)} y el tope son ${pesa(TOPE_DOCX)}.`
        : null

  const nadaElegido = !doc && !img
  const hecho = estado && !estado.error

  return (
    <section className="subir-capitulo">
      <h2>Subir desde Word</h2>
      <p className="pista">
        El documento debe llevar cada <strong>título en negrita</strong> y los versos
        debajo sin negrita, con una línea en blanco entre estrofas. Puedes subir solo la
        imagen, solo el documento, o los dos a la vez.
      </p>

      {/* El resultado va ARRIBA del formulario a propósito: abajo quedaba fuera
          de la pantalla y no se llegaba a ver que había salido bien. */}
      <div ref={resultado}>
        {estado?.error && (
          <div className="recuadro aviso-error">
            <p>
              <strong>No se ha guardado.</strong> {estado.error}
            </p>
          </div>
        )}

        {hecho && (
          <div className="recuadro aviso-bien">
            <p>
              <strong>Guardado.</strong>
              {estado.portada && ` Portada nueva: ${estado.portada}.`}
            </p>
            <Lista titulo="Poemas nuevos (entran como borrador)" cosas={estado.altas} />
            <Lista titulo="Actualizados" cosas={estado.ediciones} />
            <Lista titulo="Sin cambios" cosas={estado.intactos} />
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
      </div>

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
              onChange={(e) => setDoc(e.target.files?.[0] ?? null)}
            />
            {doc && (
              <span className="pista">
                {doc.name} · {pesa(doc.size)}
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="portada">Imagen de portada</label>
            <input
              id="portada"
              name="portada"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setImg(f)
                setPrevia(f ? URL.createObjectURL(f) : null)
              }}
            />
            {img && (
              <span className="pista">
                {img.name} · {pesa(img.size)}
              </span>
            )}
          </div>
        </div>

        {previa && (
          <figure className="previa-portada">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previa} alt="" />
            <figcaption className="pista">
              Elegida, <strong>todavía sin guardar</strong>. Pulsa el botón de abajo.
            </figcaption>
          </figure>
        )}

        {problemaLocal && (
          <div className="recuadro aviso-error">
            <p>{problemaLocal}</p>
          </div>
        )}

        <div className="acciones-form">
          <button
            className="bt fuerte"
            type="submit"
            disabled={pendiente || nadaElegido || problemaLocal !== null}
          >
            {pendiente
              ? 'Guardando…'
              : nadaElegido
                ? 'Elige un archivo'
                : img && doc
                  ? 'Guardar imagen y poemas'
                  : img
                    ? 'Guardar la imagen'
                    : 'Guardar los poemas'}
          </button>
          <span className="pista">
            No se borra ningún poema. Los que ya estaban se actualizan por su título; los
            nuevos entran como borrador para que los revises antes de publicarlos.
          </span>
        </div>
      </form>
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
