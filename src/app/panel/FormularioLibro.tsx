import { guardarLibro, eliminarLibro } from './acciones'
import Link from 'next/link'
import type { Categoria, Libro } from '@/lib/tipos'

export function FormularioLibro({
  libro,
  categorias,
  categoriaPorDefecto,
}: {
  libro?: Libro
  categorias: Categoria[]
  /** Id del poemario con el que llega el alta desde la ficha de un poemario. */
  categoriaPorDefecto?: string
}) {
  return (
    <>
      <form action={guardarLibro} className="form">
        {libro && <input type="hidden" name="id" value={libro.id} />}
        {libro && <input type="hidden" name="slug" value={libro.slug} />}

        <div className="fila">
          <div className="campo">
            <label htmlFor="titulo">Título del volumen</label>
            <input id="titulo" name="titulo" type="text" defaultValue={libro?.titulo} required />
          </div>
          <div className="campo">
            <label htmlFor="volumen">Obra o colección</label>
            <input
              id="volumen"
              name="volumen"
              type="text"
              defaultValue={libro?.volumen}
              placeholder="Pentapoemario lila"
            />
            <span className="pista">Se ve en pequeño sobre el título, en la portada.</span>
          </div>
        </div>

        <div className="fila">
          <div className="campo">
            <label htmlFor="subtitulo">Subtítulo</label>
            <input
              id="subtitulo"
              name="subtitulo"
              type="text"
              defaultValue={libro?.subtitulo ?? ''}
            />
          </div>
          <div className="campo">
            <label htmlFor="categoriaId">Poemario</label>
            <select
              id="categoriaId"
              name="categoriaId"
              defaultValue={libro?.categoria?.id ?? categoriaPorDefecto ?? ''}
            >
              <option value="">— Sin poemario —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.visible ? '' : ' (oculto)'}
                </option>
              ))}
            </select>
            <span className="pista">
              El poemario al que pertenece este capítulo. Se crean y se ocultan desde{' '}
              <Link href="/panel/poemarios">Poemarios</Link>.
            </span>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            defaultValue={libro?.descripcion ?? ''}
            rows={3}
          />
          <span className="pista">Se lee en la portada del volumen.</span>
        </div>

        <div className="fila">
          <div className="campo">
            <label htmlFor="orden">Orden</label>
            <input
              id="orden"
              name="orden"
              type="number"
              defaultValue={libro?.orden ?? 0}
            />
            <span className="pista">De menor a mayor en el anaquel.</span>
          </div>
          <div className="campo">
            <label htmlFor="paginaBase">Primera página</label>
            <input
              id="paginaBase"
              name="paginaBase"
              type="number"
              defaultValue={libro?.paginaBase ?? 1}
            />
            <span className="pista">
              Para que la numeración siga siendo continua entre volúmenes.
            </span>
          </div>
          <div className="campo">
            <label htmlFor="anio">Año</label>
            <input id="anio" name="anio" type="number" defaultValue={libro?.anio ?? ''} />
          </div>
        </div>

        {/* Los dos archivos, SOLO al dar de alta.
            La portada cuelga del id del capítulo por clave ajena, así que hasta
            ahora no había forma de elegirla antes de que el capítulo existiera:
            en esta pantalla no aparecía ningún selector y la pregunta obvia era
            «¿y dónde subo la imagen?». Ahora se eligen aquí y se guardan en
            cuanto el capítulo nace, en el mismo botón.

            Al EDITAR no se repiten: ahí manda «Subir desde Word», que además
            informa de qué poema entró y cuál cambió. Dos sitios para lo mismo
            en la misma página es peor que uno. */}
        {!libro && (
          <div className="fila">
            <div className="campo">
              <label htmlFor="imagenPortada">Imagen de portada</label>
              <input
                id="imagenPortada"
                name="imagenPortada"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
              />
              <span className="pista">JPG, PNG, WebP o AVIF, hasta 6 MB. Opcional.</span>
            </div>

            <div className="campo">
              <label htmlFor="documentoPoemas">Poemas (.docx)</label>
              <input
                id="documentoPoemas"
                name="documentoPoemas"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
              <span className="pista">
                Cada título en negrita y los versos debajo sin negrita. Opcional: también
                puedes subirlo después. Los poemas entran como borrador.
              </span>
            </div>
          </div>
        )}

        <div className="fila">
          {libro && (
            <div className="campo">
              <label htmlFor="imagenPortada">Cambiar la imagen de portada</label>
              <input
                id="imagenPortada"
                name="imagenPortada"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
              />
              <span className="pista">
                O súbela desde «Subir desde Word», ahí arriba, junto con los poemas.
              </span>
              {libro.portadaUrl && (
                <span className="previa-campo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={libro.portadaUrl} alt="" />
                  <span className="pista">La que tiene ahora.</span>
                </span>
              )}
            </div>
          )}

          <div className="campo">
            <label htmlFor="colorAcento">Color del volumen</label>
            <input
              id="colorAcento"
              name="colorAcento"
              type="text"
              defaultValue={libro?.colorAcento ?? ''}
              placeholder="#8B5CF6"
            />
            <span className="pista">
              Tiñe el motivo generado de los poemas que aún no tienen plancha.
            </span>
          </div>
        </div>

        {/* La dirección, en segundo plano: se rellena sola y casi nunca hay que
            tocarla. Estaba arriba y como campo de texto libre, que es lo que
            llevó a escribir ahí el nombre del archivo. */}
        <details className="avanzado">
          <summary>Dirección de la portada (no hace falta tocarla)</summary>
          <div className="campo">
            <input
              id="portadaUrl"
              name="portadaUrl"
              type="text"
              /* La clave la refresca cuando una subida cambia el valor: sin
                 ella React conserva el `defaultValue` del primer pintado. */
              key={libro?.portadaUrl ?? 'sin-portada'}
              defaultValue={libro?.portadaUrl ?? ''}
              placeholder="/portadas/capitulo-2.jpg"
            />
            <span className="pista">
              Se rellena sola al elegir una imagen arriba. Solo sirve para apuntar a una
              imagen alojada fuera: tiene que empezar por <code>/</code> o por{' '}
              <code>https://</code>. El nombre de un archivo —«cap03.jpeg»— no vale.
            </span>
          </div>
        </details>

        <div className="campo interruptor">
          <input
            id="publicado"
            name="publicado"
            type="checkbox"
            defaultChecked={libro?.publicado ?? false}
          />
          <label htmlFor="publicado">Visible en el sitio</label>
        </div>

        <div className="acciones-form">
          <button className="bt fuerte" type="submit">
            Guardar
          </button>
        </div>
      </form>

      {libro && (
        <form
          action={eliminarLibro}
          className="acciones-form"
          style={{ marginTop: '2.5rem' }}
        >
          <input type="hidden" name="id" value={libro.id} />
          <div>
            <p className="pista" style={{ marginBottom: '.5rem' }}>
              Borrar el volumen se lleva por delante sus {libro.poemas.length} poemas y sus
              planchas. No hay deshacer.
            </p>
            <button className="bt peligro" type="submit">
              Borrar el volumen
            </button>
          </div>
        </form>
      )}
    </>
  )
}
