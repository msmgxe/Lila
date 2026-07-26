import Link from 'next/link'
import { FormularioLibro } from '../../../FormularioLibro'

export const dynamic = 'force-dynamic'

export default function NuevoLibro() {
  return (
    <>
      <p className="et" style={{ marginBottom: '.7rem' }}>
        <Link href="/panel" style={{ color: 'inherit' }}>
          ← Volúmenes
        </Link>
      </p>
      <h1>Nuevo volumen</h1>
      <p className="sub">
        Un volumen agrupa poemas y se abre como un libro, con su portada, su índice y su
        colofón.
      </p>
      <FormularioLibro />
    </>
  )
}
