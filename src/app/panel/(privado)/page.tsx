import Link from 'next/link'
import { panelLibros, ultimosMovimientos } from '@/lib/db/panel'
import { agruparEnPoemarios, lemaDe } from '@/lib/poemarios'
import { colorDelPoemario } from '@/lib/color'

export const dynamic = 'force-dynamic'

/**
 * La entrada del panel: los poemarios, igual que la portada del sitio.
 *
 * Antes esto era una lista plana de capítulos, que servía cuando solo había un
 * poemario y dejaba de servir en cuanto hubiera dos. Ahora se entra por el
 * mismo escalón por el que entra el visitante —poemario, capítulo, poema— y por
 * eso se ve parecido: el poeta ordena lo que se va a ver, no una lista aparte
 * que hay que traducir mentalmente a lo que se verá.
 *
 * Sí hay una diferencia deliberada: aquí NO se oculta nada. La portada enseña
 * lo publicado; el panel enseña también los borradores y los poemarios
 * invisibles, marcados.
 */
export default async function PaginaPanel() {
  const libros = await panelLibros()
  const movimientos = await ultimosMovimientos(6)
  const poemarios = agruparEnPoemarios(libros)

  const poemas = libros.flatMap((l) => l.poemas)
  const publicados = poemas.filter((p) => p.publicado).length
  const huerfanos = libros.filter((l) => !l.categoria)

  return (
    <>
      <h1>Poemarios</h1>
      <p className="sub">
        {poemarios.length} {poemarios.length === 1 ? 'poemario' : 'poemarios'} ·{' '}
        {libros.length} {libros.length === 1 ? 'capítulo' : 'capítulos'} · {poemas.length}{' '}
        {poemas.length === 1 ? 'poema' : 'poemas'} · {publicados} en el sitio
        {poemas.length - publicados > 0 && `, ${poemas.length - publicados} en borrador`}
      </p>

      <div className="acciones-form" style={{ border: 0, margin: '0 0 1.6rem', padding: 0 }}>
        <Link className="bt fuerte" href="/panel/libro/nuevo">
          Nuevo capítulo
        </Link>
        <Link className="bt" href="/panel/poemarios">
          Gestionar poemarios
        </Link>
      </div>

      <div className="rejilla-poemarios">
        {poemarios.map((poemario) => {
          const sinPublicar = poemario.capitulos.filter((c) => !c.publicado).length
          return (
            <Link
              key={poemario.categoria.slug}
              className={`tarjeta-poemario${poemario.categoria.visible ? '' : ' oculto'}`}
              href={`/panel/poemario/${poemario.categoria.slug}`}
              style={colorDelPoemario(poemario.categoria.colorAcento)}
            >
              <span className="tp-imagen">
                {poemario.portadaUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={poemario.portadaUrl} alt="" />
                ) : (
                  <span className="tp-inicial">{poemario.categoria.nombre.charAt(0)}</span>
                )}
              </span>
              <span className="tp-texto">
                <strong>{poemario.categoria.nombre}</strong>
                <em>{lemaDe(poemario)}</em>
                <span className="tp-estado">
                  {!poemario.categoria.visible && <b className="marca oculta">Oculto</b>}
                  {sinPublicar > 0 && <b className="marca borrador">{sinPublicar} sin publicar</b>}
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      {huerfanos.length > 0 && (
        <div className="recuadro" style={{ marginTop: '1.6rem' }}>
          <p>
            <strong>
              {huerfanos.length} {huerfanos.length === 1 ? 'capítulo' : 'capítulos'} sin poemario.
            </strong>{' '}
            Se leen igual, agrupados por su volumen, pero asignarlos deja claro dónde van:
            abre el capítulo y elige uno en «Poemario».
          </p>
        </div>
      )}

      {movimientos.length > 0 && (
        <section style={{ marginTop: '2.4rem' }}>
          <h2>Últimos cambios</h2>
          <ul className="movimientos">
            {movimientos.map((m) => (
              <li key={m.id}>
                <span className="et">{m.entidad}</span> {m.accion}
                <time>{new Date(m.creadoEn).toLocaleString('es-ES')}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
