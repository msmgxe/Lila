import Link from 'next/link'
import { panelCategorias } from '@/lib/db/panel'
import { FormularioLibro } from '../../../FormularioLibro'

export const dynamic = 'force-dynamic'

export default async function NuevoLibro() {
  const categorias = await panelCategorias()
  return (
    <>
      <p className="et" style={{ marginBottom: '.7rem' }}>
        <Link href="/panel" style={{ color: 'inherit' }}>
          ← Volúmenes
        </Link>
      </p>
      <h1>Nuevo capítulo</h1>
      <p className="sub">
        Un capítulo agrupa poemas y se abre como un libro, con su portada, su índice y su
        colofón. Pertenece a un poemario.
      </p>
      <FormularioLibro categorias={categorias} />
    </>
  )
}
