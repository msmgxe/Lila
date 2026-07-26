import Link from 'next/link'
import { notFound } from 'next/navigation'
import { panelLibro } from '@/lib/db/panel'
import { FormularioPoema } from '../../../../FormularioPoema'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string; poema: string }> }

export default async function EditarPoema({ params }: Props) {
  const { slug, poema: poemaSlug } = await params
  const libro = await panelLibro(slug)
  if (!libro) notFound()

  // `nuevo` es la ruta de alta, no un poema con ese slug.
  const esNuevo = poemaSlug === 'nuevo'
  const poema = esNuevo ? undefined : libro.poemas.find((p) => p.slug === poemaSlug)
  if (!esNuevo && !poema) notFound()

  return (
    <>
      <p className="et" style={{ marginBottom: '.7rem' }}>
        <Link href={`/panel/libro/${libro.slug}`} style={{ color: 'inherit' }}>
          ← {libro.titulo}
        </Link>
      </p>
      <h1>{poema ? poema.titulo : 'Nuevo poema'}</h1>
      <p className="sub">
        {libro.volumen} · {libro.titulo}
      </p>

      <FormularioPoema libro={libro} poema={poema} />
    </>
  )
}
