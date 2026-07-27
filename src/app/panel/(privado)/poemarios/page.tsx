import Link from 'next/link'
import { panelCategorias } from '@/lib/db/panel'
import { alternarCategoria, eliminarCategoria, guardarCategoria } from '../../acciones'

export const dynamic = 'force-dynamic'

/**
 * Los poemarios. Cada uno agrupa capítulos y se puede **ocultar entero** del
 * sitio sin tocar sus capítulos uno a uno: es lo que hace falta para tener
 * varias obras a la vez y decidir cuáles están a la vista.
 */
export default async function PaginaPoemarios() {
  const categorias = await panelCategorias()

  return (
    <>
      <h1>Poemarios</h1>
      <p className="sub">
        Cada poemario agrupa capítulos. Ocultar uno lo retira del anaquel con todos sus
        capítulos dentro, sin despublicarlos: al volver a mostrarlo, todo reaparece como
        estaba.
      </p>

      <div className="tarjetas" style={{ marginBottom: '2.6rem' }}>
        {categorias.map((c) => (
          <article
            key={c.id}
            className={`tarjeta ${c.visible ? 'es-publicado' : 'es-borrador'}`}
          >
            <div className="principal">
              <span className="titulo">{c.nombre}</span>
              <div className="meta">
                {c.cuantos} {c.cuantos === 1 ? 'capítulo' : 'capítulos'} · /{c.slug}
                {c.descripcion ? ` · ${c.descripcion}` : ''}
              </div>
            </div>

            <span className={`pastilla ${c.visible ? 'publicado' : 'borrador'}`}>
              {c.visible ? 'A la vista' : 'Oculto'}
            </span>

            <div className="acciones">
              <form action={alternarCategoria}>
                <input type="hidden" name="id" value={c.id} />
                <button className="bt menudo" type="submit">
                  {c.visible ? 'Ocultar' : 'Mostrar'}
                </button>
              </form>
              <form action={eliminarCategoria}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  className="bt menudo peligro"
                  type="submit"
                  title="Los capítulos no se borran: se quedan sin poemario"
                >
                  Borrar
                </button>
              </form>
            </div>
          </article>
        ))}

        {categorias.length === 0 && (
          <div className="recuadro">
            <p>
              Todavía no hay ningún poemario. Crea el primero aquí abajo y después asigna
              los capítulos desde <Link href="/panel">Capítulos</Link>.
            </p>
          </div>
        )}
      </div>

      <section>
        <h2>Nuevo poemario</h2>
        <form action={guardarCategoria} className="form">
          <div className="fila">
            <div className="campo">
              <label htmlFor="nombre">Nombre</label>
              <input id="nombre" name="nombre" type="text" placeholder="Multiversos" required />
              <span className="pista">Es el título grande de su ficha y del carrusel.</span>
            </div>
            <div className="campo">
              <label htmlFor="orden">Orden</label>
              <input id="orden" name="orden" type="number" defaultValue={categorias.length} />
              <span className="pista">De menor a mayor en la barra lateral.</span>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="lema">Lema</label>
            <input
              id="lema"
              name="lema"
              type="text"
              placeholder="Ocho capítulos · cuarenta poemas"
            />
            <span className="pista">
              La línea corta bajo el nombre. Si la dejas vacía se cuenta lo que hay.
            </span>
          </div>

          <div className="campo">
            <label htmlFor="descripcion">Descripción</label>
            <input id="descripcion" name="descripcion" type="text" />
            <span className="pista">Un par de líneas dentro de la ficha del poemario.</span>
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="portadaUrl">Imagen del poemario</label>
              <input
                id="portadaUrl"
                name="portadaUrl"
                type="text"
                placeholder="/portadas/capitulo-2.jpg"
              />
              <span className="pista">
                Es la lámina del carrusel. Si la dejas vacía se usa la del primer capítulo
                que tenga una.
              </span>
            </div>
            <div className="campo">
              <label htmlFor="colorAcento">Color del poemario</label>
              <input id="colorAcento" name="colorAcento" type="text" placeholder="#C9A6E8" />
              <span className="pista">
                Tiñe su carrusel y su ficha. Vacío = el lila del sitio. El tono para texto se
                calcula solo, oscurecido hasta que se lea sobre el papel.
              </span>
            </div>
          </div>

          <div className="campo interruptor">
            <input id="visible" name="visible" type="checkbox" defaultChecked />
            <label htmlFor="visible">A la vista en el sitio</label>
          </div>

          <div className="acciones-form">
            <button className="bt fuerte" type="submit">
              Crear poemario
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
