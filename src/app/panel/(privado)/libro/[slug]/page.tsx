import Link from 'next/link'
import { notFound } from 'next/navigation'
import { panelCategorias, panelLibro } from '@/lib/db/panel'
import { paginarLibro } from '@/lib/paginar'
import { FormularioLibro } from '../../../FormularioLibro'
import { SubirCapitulo } from '../../../SubirCapitulo'
import { alternarPoema, moverPoema } from '../../../acciones'
import { SubirArriba } from '@/componentes/SubirArriba'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function PaginaLibroPanel({ params }: Props) {
  const { slug } = await params
  const libro = await panelLibro(slug)
  if (!libro) notFound()
  const categorias = await panelCategorias()

  // Se pagina con los publicados, que es lo que verá el visitante.
  const pliegos = paginarLibro(libro).filter((p) => p.tipo === 'poema')

  return (
    <>
      <p className="miga">
        <Link href="/panel">Inicio del panel</Link>
        {libro.categoria && (
          <>
            {' › '}
            <Link href={`/panel/poemario/${libro.categoria.slug}`}>{libro.categoria.nombre}</Link>
          </>
        )}
        {' › '}
        {libro.titulo}
      </p>

      {/* La barra de «y ahora qué».
          Al guardar un capítulo se aterriza aquí, y hasta ahora la única salida
          era una flecha pequeña arriba del todo. Con la lista de poemas de por
          medio, quien acaba de subir un Word tiene que decidir dos cosas —
          revisar lo que ha entrado, o volver a por el siguiente capítulo— y las
          dos estaban escondidas. */}
      <nav className="siguiente-paso">
        {libro.categoria && (
          <>
            <Link className="bt" href={`/panel/poemario/${libro.categoria.slug}`}>
              ← Todos los capítulos
            </Link>
            <Link
              className="bt fuerte"
              href={`/panel/libro/nuevo?poemario=${libro.categoria.id}`}
            >
              + Crear otro capítulo
            </Link>
          </>
        )}
        {libro.publicado && (
          <Link className="bt" href={`/${libro.slug}`} target="_blank">
            Ver en el sitio ↗
          </Link>
        )}
      </nav>
      <h1>{libro.titulo}</h1>
      <p className="sub">
        {libro.categoria?.nombre ?? 'sin poemario'} · {libro.poemas.length}{' '}
        {libro.poemas.length === 1 ? 'poema' : 'poemas'} ·{' '}
        {libro.publicado ? 'visible en el sitio' : 'en borrador'}
      </p>

      <section style={{ marginBottom: '3rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '.7rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '1.2rem',
          }}
        >
          <h2 style={{ margin: 0, flex: 1 }}>Poemas</h2>
          <Link className="bt fuerte" href={`/panel/libro/${libro.slug}/nuevo`}>
            Nuevo poema
          </Link>
          {libro.publicado && (
            <Link className="bt" href={`/${libro.slug}`} target="_blank" rel="noopener">
              Ver el volumen ↗
            </Link>
          )}
        </div>

        <div className="tarjetas">
          {libro.poemas.map((poema, i) => {
            const versos = poema.estrofas.flat().length
            const trozos = pliegos.filter((p) => p.poema?.id === poema.id).length
            return (
              <article
                key={poema.id}
                className={`tarjeta ${poema.publicado ? 'es-publicado' : 'es-borrador'}`}
              >
                <div className="principal">
                  <Link
                    className="titulo"
                    href={`/panel/libro/${libro.slug}/${poema.slug}`}
                  >
                    {poema.titulo}
                  </Link>
                  <div className="meta">
                    {poema.forma} · {poema.estrofas.length}{' '}
                    {poema.estrofas.length === 1 ? 'estrofa' : 'estrofas'} · {versos} versos
                    {trozos > 1 && ` · ocupa ${trozos} pliegos`}
                    {poema.planchas.length > 0 &&
                      ` · ${poema.planchas.length} ${poema.planchas.length === 1 ? 'plancha' : 'planchas'}`}
                  </div>
                </div>

                <span className={`pastilla ${poema.publicado ? 'publicado' : 'borrador'}`}>
                  {poema.publicado ? 'Publicado' : 'Borrador'}
                </span>

                <div className="acciones">
                  <form action={moverPoema}>
                    <input type="hidden" name="id" value={poema.id} />
                    <input type="hidden" name="libroSlug" value={libro.slug} />
                    <input type="hidden" name="direccion" value="arriba" />
                    <button
                      className="bt menudo"
                      type="submit"
                      disabled={i === 0}
                      aria-label="Subir"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moverPoema}>
                    <input type="hidden" name="id" value={poema.id} />
                    <input type="hidden" name="libroSlug" value={libro.slug} />
                    <input type="hidden" name="direccion" value="abajo" />
                    <button
                      className="bt menudo"
                      type="submit"
                      disabled={i === libro.poemas.length - 1}
                      aria-label="Bajar"
                    >
                      ↓
                    </button>
                  </form>
                  <form action={alternarPoema}>
                    <input type="hidden" name="id" value={poema.id} />
                    <input type="hidden" name="libroSlug" value={libro.slug} />
                    <input type="hidden" name="slug" value={poema.slug} />
                    <button className="bt menudo" type="submit">
                      {poema.publicado ? 'Retirar' : 'Publicar'}
                    </button>
                  </form>
                </div>
              </article>
            )
          })}

          {libro.poemas.length === 0 && (
            <div className="recuadro">
              <p>Este volumen todavía no tiene poemas.</p>
            </div>
          )}
        </div>
      </section>

      <SubirCapitulo libroId={libro.id} slug={libro.slug} />

      <section>
        <h2>Datos del volumen</h2>
        <FormularioLibro libro={libro} categorias={categorias} />
      </section>
      <SubirArriba etiqueta="Arriba" />
    </>
  )
}
