import { guardarLibro, eliminarLibro } from './acciones'
import Link from 'next/link'
import type { Categoria, Libro } from '@/lib/tipos'

export function FormularioLibro({
  libro,
  categorias,
}: {
  libro?: Libro
  categorias: Categoria[]
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
              defaultValue={libro?.categoria?.id ?? categorias[0]?.id ?? ''}
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
              Se rellena sola al subir una imagen ahí arriba. También admite una
              dirección de fuera si prefieres alojarla en otro sitio.
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
