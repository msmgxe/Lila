import Link from 'next/link'
import { traerAutor } from '@/lib/db/panel'
import { FormularioAutor } from '../../FormularioAutor'
import { AUTOR } from '@/lib/contenido/pentapoemario'

export const dynamic = 'force-dynamic'

/**
 * La sección del autor. Va debajo del poemario en la portada, y aquí se
 * escribe: retrato, trayectoria y vídeos.
 *
 * Empieza oculta a propósito. Una biografía a medias publicada es peor que
 * ninguna, y aquí no hay prisa: se rellena con calma y se muestra cuando esté.
 */
export default async function PaginaAutor() {
  const autor = await traerAutor()

  return (
    <>
      <p className="miga">
        <Link href="/panel">Inicio del panel</Link> › El autor
      </p>
      <h1>El autor</h1>
      <p className="sub">
        Se ve debajo del carrusel de poemarios, en la portada. Retrato, trayectoria en
        línea de tiempo y vídeos cortos.
        {!autor?.visible && ' Ahora mismo está oculta.'}
      </p>

      <FormularioAutor
        autor={
          autor ?? {
            // Un primer borrador para no empezar en blanco: el nombre ya se
            // sabe, y los tres hitos son los que nos contó el poeta.
            nombre: AUTOR,
            titular: 'Poeta, dibujante y profesor de arte',
            intro: null,
            retratoUrl: null,
            hitos: [
              { etiqueta: 'Los inicios', titulo: '', texto: '' },
              { etiqueta: 'La enseñanza', titulo: '', texto: '' },
              { etiqueta: 'Hoy', titulo: '', texto: '' },
            ],
            videos: [],
            visible: false,
          }
        }
      />
    </>
  )
}
