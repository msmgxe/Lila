import Link from 'next/link'
import { panelCategorias } from '@/lib/db/panel'
import { FormularioLibro } from '../../../FormularioLibro'

export const dynamic = 'force-dynamic'

/**
 * Alta de un capítulo.
 *
 * Acepta `?poemario=<id>` para llegar con el poemario ya elegido. Se entra aquí
 * desde la ficha de un poemario concreto, y hacer volver a seleccionarlo en un
 * desplegable de veinte es pedir que alguien se equivoque tarde o temprano —y
 * un capítulo colocado en el poemario que no era no da ningún error: se guarda
 * tan contento y aparece donde no toca.
 */
export default async function NuevoLibro({
  searchParams,
}: {
  searchParams: Promise<{ poemario?: string }>
}) {
  const { poemario } = await searchParams
  const categorias = await panelCategorias()
  const elegido = categorias.find((c) => c.id === poemario)

  return (
    <>
      <p className="miga">
        <Link href="/panel">Inicio del panel</Link>
        {elegido && (
          <>
            {' › '}
            <Link href={`/panel/poemario/${elegido.slug}`}>{elegido.nombre}</Link>
          </>
        )}
        {' › '}Nuevo capítulo
      </p>
      <h1>Nuevo capítulo</h1>
      <p className="sub">
        Un capítulo agrupa poemas y se abre como un libro, con su portada, su índice y su
        colofón.{' '}
        {elegido ? (
          <>
            Va a entrar en <strong>{elegido.nombre}</strong>.
          </>
        ) : (
          'Pertenece a un poemario.'
        )}
      </p>
      <FormularioLibro categorias={categorias} categoriaPorDefecto={poemario} />

      <div className="recuadro" style={{ marginTop: '1.4rem' }}>
        <p>
          Guarda primero el capítulo con su título. Al hacerlo se abre su pantalla, y
          desde ahí subes el Word con los poemas y la imagen de portada.
        </p>
      </div>
    </>
  )
}
