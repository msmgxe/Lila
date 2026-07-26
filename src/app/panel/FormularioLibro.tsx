import { guardarLibro, eliminarLibro } from './acciones'
import type { Libro } from '@/lib/tipos'

export function FormularioLibro({ libro }: { libro?: Libro }) {
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
            <label htmlFor="categoria">Categoría</label>
            <input
              id="categoria"
              name="categoria"
              type="text"
              defaultValue={libro?.categoria ?? 'pentapoemas'}
            />
            <span className="pista">
              Agrupa la estantería. La barra lateral del anaquel se arma sola con las que
              haya; si solo hay una, no se muestra el filtro.
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

        <div className="fila">
          <div className="campo">
            <label htmlFor="portadaUrl">Portada</label>
            <input
              id="portadaUrl"
              name="portadaUrl"
              type="text"
              defaultValue={libro?.portadaUrl ?? ''}
              placeholder="/portadas/capitulo-2.jpg"
            />
            <span className="pista">
              Ruta dentro de <code>public/</code> o dirección completa.
            </span>
          </div>
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
