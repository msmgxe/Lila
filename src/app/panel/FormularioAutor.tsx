'use client'

import { useState } from 'react'
import { guardarAutor } from './acciones'
import type { Hito, VideoAutor } from '@/lib/db/panel'

/**
 * La sección del autor, editable.
 *
 * Los hitos y los vídeos son listas que crecen, así que el formulario deja
 * añadir y quitar filas sin recargar. Van como campos repetidos con el mismo
 * nombre —`hito-etiqueta`, `hito-titulo`…— y la acción los recompone por
 * posición: `FormData.getAll` los devuelve en el orden del documento, que es el
 * orden en que se ven. Reordenar en pantalla reordena de verdad, sin una acción
 * por movimiento ni una tabla aparte.
 *
 * El estado de React solo lleva CUÁNTAS filas hay y su contenido inicial; lo
 * que se guarda es lo que haya escrito en los campos al enviar. Controlar cada
 * letra desde React aquí no aportaría nada y volvería a pintar el formulario
 * entero en cada tecla.
 */
export function FormularioAutor({
  autor,
}: {
  autor: {
    nombre: string
    titular: string | null
    intro: string | null
    retratoUrl: string | null
    hitos: Hito[]
    videos: VideoAutor[]
    visible: boolean
  } | null
}) {
  const [hitos, setHitos] = useState<Hito[]>(
    autor?.hitos.length ? autor.hitos : [{ etiqueta: '', titulo: '', texto: '' }],
  )
  const [videos, setVideos] = useState<VideoAutor[]>(autor?.videos ?? [])
  const [previa, setPrevia] = useState<string | null>(null)

  const quitarHito = (i: number) => setHitos((h) => h.filter((_, j) => j !== i))
  const moverHito = (i: number, paso: -1 | 1) =>
    setHitos((h) => {
      const j = i + paso
      if (j < 0 || j >= h.length) return h
      const copia = [...h]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })

  return (
    <form action={guardarAutor} className="form">
      <div className="fila">
        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" type="text" defaultValue={autor?.nombre ?? ''} required />
        </div>
        <div className="campo">
          <label htmlFor="titular">Titular</label>
          <input
            id="titular"
            name="titular"
            type="text"
            defaultValue={autor?.titular ?? ''}
            placeholder="Poeta, dibujante y profesor de arte"
          />
          <span className="pista">La línea que va bajo el nombre.</span>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="intro">Presentación</label>
        <textarea id="intro" name="intro" rows={3} defaultValue={autor?.intro ?? ''} />
        <span className="pista">Un párrafo corto, encima de la línea de tiempo.</span>
      </div>

      <div className="fila">
        <div className="campo">
          <label htmlFor="retrato">Retrato</label>
          <input
            id="retrato"
            name="retrato"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => {
              const f = e.target.files?.[0]
              setPrevia(f ? URL.createObjectURL(f) : null)
            }}
          />
          <span className="pista">Se ve en redondo. Cuadrada queda mejor. Hasta 6 MB.</span>
          {(previa || autor?.retratoUrl) && (
            <span className="previa-campo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previa ?? autor!.retratoUrl!}
                alt=""
                style={{ borderRadius: '50%' }}
              />
              <span className="pista">
                {previa ? 'Elegido, todavía sin guardar.' : 'El que hay ahora.'}
              </span>
            </span>
          )}
          <input type="hidden" name="retratoUrl" value={autor?.retratoUrl ?? ''} />
        </div>
      </div>

      {/* ── la línea de tiempo ──────────────────────────────────────────── */}
      <section className="lista-editable">
        <header>
          <h2>Trayectoria</h2>
          <button
            type="button"
            className="bt"
            onClick={() => setHitos((h) => [...h, { etiqueta: '', titulo: '', texto: '' }])}
          >
            + Añadir hito
          </button>
        </header>
        <p className="pista">
          Van en este orden en el sitio. La etiqueta es lo que se lee en lila —un año, «Los
          inicios», «Hoy»—.
        </p>

        {hitos.map((hito, i) => (
          <div className="fila-editable" key={i}>
            <div className="campo">
              <label>Etiqueta</label>
              <input type="text" name="hito-etiqueta" defaultValue={hito.etiqueta} placeholder="Los inicios" />
            </div>
            <div className="campo">
              <label>Título</label>
              <input type="text" name="hito-titulo" defaultValue={hito.titulo} placeholder="El dibujo primero" />
            </div>
            <div className="campo crece">
              <label>Texto</label>
              <input type="text" name="hito-texto" defaultValue={hito.texto} />
            </div>
            <div className="mandos">
              <button className="ico" type="button" onClick={() => moverHito(i, -1)} title="Subir">
                ↑
              </button>
              <button className="ico" type="button" onClick={() => moverHito(i, 1)} title="Bajar">
                ↓
              </button>
              <button className="ico" type="button" onClick={() => quitarHito(i)} title="Quitar">
                ×
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ── los vídeos ──────────────────────────────────────────────────── */}
      <section className="lista-editable">
        <header>
          <h2>Vídeos</h2>
          <button
            type="button"
            className="bt"
            onClick={() => setVideos((v) => [...v, { titulo: '', url: '' }])}
          >
            + Añadir vídeo
          </button>
        </header>
        <p className="pista">
          Pega el enlace tal cual de YouTube o Vimeo —el de «Compartir»— y se incrusta solo.
          También vale la dirección de un <code>.mp4</code> propio. Se guardan como enlaces y
          no como archivo: un vídeo pesa megas y llenaría la base de datos.
        </p>

        {videos.map((video, i) => (
          <div className="fila-editable" key={i}>
            <div className="campo">
              <label>Título</label>
              <input type="text" name="video-titulo" defaultValue={video.titulo} placeholder="Dibujando" />
            </div>
            <div className="campo crece">
              <label>Enlace</label>
              <input type="text" name="video-url" defaultValue={video.url} placeholder="https://youtu.be/…" />
            </div>
            <div className="mandos">
              <button
                className="ico"
                type="button"
                onClick={() => setVideos((v) => v.filter((_, j) => j !== i))}
                title="Quitar"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="campo interruptor">
        <input id="visible" name="visible" type="checkbox" defaultChecked={autor?.visible ?? false} />
        <label htmlFor="visible">Mostrar la sección en el sitio</label>
      </div>

      <div className="acciones-form">
        <button className="bt fuerte" type="submit">
          Guardar
        </button>
        <span className="pista">La sección aparece bajo el carrusel de poemarios.</span>
      </div>
    </form>
  )
}
