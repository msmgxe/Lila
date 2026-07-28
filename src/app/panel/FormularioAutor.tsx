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
 * ── Por qué los campos SÍ están controlados ────────────────────────────────
 * La primera versión los dejaba sin controlar —`defaultValue` y a correr— para
 * no repintar en cada tecla. Parecía sensato y estaba mal: al subir o quitar un
 * hito, el estado se reordenaba pero **lo escrito no se movía**. React reutiliza
 * los nodos del DOM cuando la clave es la posición, y `defaultValue` solo se
 * mira al montarlos. Desde fuera: los botones «no funcionan».
 *
 * Ahora el estado es la única verdad y cada fila lleva un identificador propio
 * que no depende de dónde esté. Con cinco filas, repintar no cuesta nada.
 *
 * Se puede arrastrar y también usar las flechas. Las dos cosas: arrastrar es más
 * cómodo con el ratón, pero el arrastre de HTML no funciona en móvil ni con
 * teclado, así que quitarlas dejaría fuera a quien no usa ratón.
 */
/**
 * Una fila con identificador propio.
 *
 * La clave de React NO puede ser la posición: al reordenar, la posición 1 pasa
 * a contener otra cosa y React, viendo la misma clave, se limita a actualizar el
 * nodo que ya había —conservando lo escrito en él—. Con un identificador que
 * viaja con la fila, React mueve el nodo entero, que es lo que se pidió.
 */
type Fila<T> = T & { id: string }

let contador = 0
function conId<T>(filas: T[]): Fila<T>[] {
  return filas.map((f) => ({ ...f, id: `f${contador++}` }))
}

/** Intercambia una fila con su vecina. Fuera de rango, no hace nada. */
function mover<T>(filas: T[], i: number, paso: -1 | 1): T[] {
  const j = i + paso
  if (i < 0 || j < 0 || j >= filas.length) return filas
  const copia = [...filas]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}

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
  const [hitos, setHitos] = useState<Fila<Hito>[]>(() =>
    conId(autor?.hitos.length ? autor.hitos : [{ etiqueta: '', titulo: '', texto: '' }]),
  )
  const [videos, setVideos] = useState<Fila<VideoAutor>[]>(() => conId(autor?.videos ?? []))
  const [previa, setPrevia] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState<string | null>(null)

  const cambiarHito = (id: string, campo: keyof Hito, valor: string) =>
    setHitos((h) => h.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const quitarHito = (id: string) => setHitos((h) => h.filter((f) => f.id !== id))
  const moverHito = (id: string, paso: -1 | 1) =>
    setHitos((h) => mover(h, h.findIndex((f) => f.id === id), paso))

  /** Suelta la fila arrastrada justo donde está la de destino. */
  const soltarSobre = (idDestino: string) =>
    setHitos((h) => {
      if (!arrastrando || arrastrando === idDestino) return h
      const desde = h.findIndex((f) => f.id === arrastrando)
      const hasta = h.findIndex((f) => f.id === idDestino)
      if (desde < 0 || hasta < 0) return h
      const copia = [...h]
      const [fila] = copia.splice(desde, 1)
      copia.splice(hasta, 0, fila)
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
            onClick={() =>
              setHitos((h) => [...h, ...conId([{ etiqueta: '', titulo: '', texto: '' }])])
            }
          >
            + Añadir hito
          </button>
        </header>
        <p className="pista">
          Van en este orden en el sitio. La etiqueta es lo que se lee en lila —un año, «Los
          inicios», «Hoy»—.
        </p>

        {hitos.map((hito) => (
          <div
            className={`fila-editable${arrastrando === hito.id ? ' arrastrando' : ''}`}
            key={hito.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              soltarSobre(hito.id)
              setArrastrando(null)
            }}
          >
            {/* Solo el asa arrastra, no la fila entera: si arrastrase toda,
                seleccionar texto dentro de un campo iniciaría un arrastre. */}
            <span
              className="asa"
              draggable
              onDragStart={() => setArrastrando(hito.id)}
              onDragEnd={() => setArrastrando(null)}
              title="Arrastrar para ordenar"
              aria-hidden="true"
            >
              ⠿
            </span>
            <div className="campo">
              <label>Etiqueta</label>
              <input
                type="text"
                name="hito-etiqueta"
                value={hito.etiqueta}
                onChange={(e) => cambiarHito(hito.id, 'etiqueta', e.target.value)}
                placeholder="Los inicios"
              />
            </div>
            <div className="campo">
              <label>Título</label>
              <input
                type="text"
                name="hito-titulo"
                value={hito.titulo}
                onChange={(e) => cambiarHito(hito.id, 'titulo', e.target.value)}
                placeholder="El dibujo primero"
              />
            </div>
            <div className="campo crece">
              <label>Texto</label>
              <input
                type="text"
                name="hito-texto"
                value={hito.texto}
                onChange={(e) => cambiarHito(hito.id, 'texto', e.target.value)}
              />
            </div>
            <div className="mandos">
              <button
                className="ico"
                type="button"
                onClick={() => moverHito(hito.id, -1)}
                title="Subir"
                aria-label="Subir este hito"
              >
                ↑
              </button>
              <button
                className="ico"
                type="button"
                onClick={() => moverHito(hito.id, 1)}
                title="Bajar"
                aria-label="Bajar este hito"
              >
                ↓
              </button>
              <button
                className="ico"
                type="button"
                onClick={() => quitarHito(hito.id)}
                title="Quitar"
                aria-label="Quitar este hito"
              >
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
            onClick={() => setVideos((v) => [...v, ...conId([{ titulo: '', url: '' }])])}
          >
            + Añadir vídeo
          </button>
        </header>
        <p className="pista">
          Pega el enlace tal cual de YouTube o Vimeo —el de «Compartir»— y se incrusta solo.
          También vale la dirección de un <code>.mp4</code> propio. Se guardan como enlaces y
          no como archivo: un vídeo pesa megas y llenaría la base de datos.
        </p>

        {videos.map((video) => (
          <div className="fila-editable" key={video.id}>
            <div className="campo">
              <label>Título</label>
              <input
                type="text"
                name="video-titulo"
                value={video.titulo}
                onChange={(e) =>
                  setVideos((v) =>
                    v.map((f) => (f.id === video.id ? { ...f, titulo: e.target.value } : f)),
                  )
                }
                placeholder="Dibujando"
              />
            </div>
            <div className="campo crece">
              <label>Enlace</label>
              <input
                type="text"
                name="video-url"
                value={video.url}
                onChange={(e) =>
                  setVideos((v) =>
                    v.map((f) => (f.id === video.id ? { ...f, url: e.target.value } : f)),
                  )
                }
                placeholder="https://youtu.be/…"
              />
            </div>
            <div className="mandos">
              <button
                className="ico"
                type="button"
                onClick={() => setVideos((v) => v.filter((f) => f.id !== video.id))}
                title="Quitar"
                aria-label="Quitar este vídeo"
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
