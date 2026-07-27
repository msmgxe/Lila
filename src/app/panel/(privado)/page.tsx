import Link from 'next/link'
import { panelLibros, ultimosMovimientos } from '@/lib/db/panel'
import { alternarLibro } from '../acciones'

export const dynamic = 'force-dynamic'

export default async function PaginaPanel() {
  const libros = await panelLibros()
  const movimientos = await ultimosMovimientos(8)

  const poemas = libros.flatMap((l) => l.poemas)
  const publicados = poemas.filter((p) => p.publicado).length

  return (
    <>
      <h1>Capítulos</h1>
      <p className="sub">
        {libros.length} {libros.length === 1 ? 'volumen' : 'volúmenes'} · {poemas.length}{' '}
        {poemas.length === 1 ? 'poema' : 'poemas'} · {publicados} en el sitio
        {poemas.length - publicados > 0 && `, ${poemas.length - publicados} en borrador`}
      </p>

      <div className="acciones-form" style={{ border: 0, margin: '0 0 1.4rem', padding: 0 }}>
        <Link className="bt fuerte" href="/panel/libro/nuevo">
          Nuevo capítulo
        </Link>
        <Link className="bt" href="/panel/poemarios">
          Poemarios
        </Link>
      </div>

      <div className="tarjetas">
        {libros.map((libro) => {
          const n = libro.poemas.length
          const pub = libro.poemas.filter((p) => p.publicado).length
          return (
            <article
              key={libro.id}
              className={`tarjeta ${libro.publicado ? 'es-publicado' : 'es-borrador'}`}
            >
              <div className="principal">
                <Link className="titulo" href={`/panel/libro/${libro.slug}`}>
                  {libro.titulo}
                </Link>
                <div className="meta">
                  {libro.categoria?.nombre ?? 'sin poemario'} · {n} {n === 1 ? 'poema' : 'poemas'}
                  {pub !== n && ` (${pub} publicados)`} · desde la página {libro.paginaBase}
                </div>
              </div>

              <span className={`pastilla ${libro.publicado ? 'publicado' : 'borrador'}`}>
                {libro.publicado ? 'En el sitio' : 'Borrador'}
              </span>

              <div className="acciones">
                <form action={alternarLibro}>
                  <input type="hidden" name="id" value={libro.id} />
                  <input type="hidden" name="slug" value={libro.slug} />
                  <button className="bt menudo" type="submit">
                    {libro.publicado ? 'Retirar' : 'Publicar'}
                  </button>
                </form>
                <Link className="bt menudo" href={`/panel/libro/${libro.slug}`}>
                  Abrir
                </Link>
              </div>
            </article>
          )
        })}

        {libros.length === 0 && (
          <div className="recuadro">
            <h2>Todavía no hay nada</h2>
            <p>
              Crea el primer volumen, o vuelca la obra que ya está en el proyecto con{' '}
              <code>npm run db:semilla</code>.
            </p>
          </div>
        )}
      </div>

      {movimientos.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2>Últimos cambios</h2>
          <table className="tabla-reg">
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td>
                    {new Date(m.creadoEn).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    {m.accion} · {m.entidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
