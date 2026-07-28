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
      </p>

      {/* El aviso va aquí arriba y no en una línea perdida: que la sección esté
          escrita y no se vea es exactamente el tipo de cosa que se descubre
          tarde, preguntando por qué no sale en la web. */}
      {!autor?.visible && (
        <div className="recuadro avisos-subida" style={{ marginBottom: '1.6rem' }}>
          <p>
            <strong>Esta sección no se está viendo en el sitio.</strong> Rellena lo que
            quieras y marca «Mostrar la sección en el sitio», ahí abajo, antes de guardar.
          </p>
        </div>
      )}

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
