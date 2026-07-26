import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { obtenerLibro, obtenerLibros } from '@/lib/datos'
import { paginarLibro, pliegoDePoema } from '@/lib/paginar'
import { textoPlano } from '@/lib/texto'
import { Lector } from '@/componentes/lector/Lector'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ libro: string; poema: string }> }

/** Una entrada estática por poema publicado: cada pliego tiene URL propia. */
export async function generateStaticParams() {
  const libros = await obtenerLibros()
  return libros.flatMap((l) =>
    l.poemas.filter((p) => p.publicado).map((p) => ({ libro: l.slug, poema: p.slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { libro: libroSlug, poema: poemaSlug } = await params
  const libro = await obtenerLibro(libroSlug)
  const poema = libro?.poemas.find((p) => p.slug === poemaSlug)
  if (!libro || !poema) return { title: 'Poema no encontrado' }

  // Los dos primeros versos como descripción: es lo que mejor representa al
  // poema en una tarjeta compartida.
  const arranque = poema.estrofas[0]?.slice(0, 2).join(' / ') ?? textoPlano(poema.estrofas)

  return {
    title: poema.titulo,
    description: `${arranque} — ${poema.forma}, ${libro.titulo}.`,
    keywords: poema.temas,
    openGraph: {
      title: `${poema.titulo} · ${libro.titulo}`,
      description: arranque,
      type: 'article',
      authors: ['A. Vélez'],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function PaginaPoema({ params }: Props) {
  const { libro: libroSlug, poema: poemaSlug } = await params
  const libro = await obtenerLibro(libroSlug)
  if (!libro) notFound()

  const pliegos = paginarLibro(libro)
  const inicial = pliegoDePoema(pliegos, poemaSlug)
  if (inicial < 0) notFound()

  return <Lector libro={libro} pliegos={pliegos} inicial={inicial} />
}
