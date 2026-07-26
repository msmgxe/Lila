import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { obtenerLibro, obtenerLibros } from '@/lib/datos'
import { paginarLibro } from '@/lib/paginar'
import { Lector } from '@/componentes/lector/Lector'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ libro: string }> }

/** Prerenderiza un volumen por cada libro publicado. */
export async function generateStaticParams() {
  const libros = await obtenerLibros()
  return libros.map((l) => ({ libro: l.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { libro: slug } = await params
  const libro = await obtenerLibro(slug)
  if (!libro) return { title: 'Volumen no encontrado' }

  return {
    title: libro.titulo,
    description: libro.descripcion ?? libro.subtitulo ?? undefined,
    openGraph: {
      title: `${libro.titulo} · ${libro.volumen}`,
      description: libro.descripcion ?? undefined,
      type: 'book',
    },
  }
}

/** El volumen abierto por su portada. */
export default async function PaginaLibro({ params }: Props) {
  const { libro: slug } = await params
  const libro = await obtenerLibro(slug)
  if (!libro) notFound()

  // La paginación se calcula en el servidor: así el corte entre estrofas es el
  // mismo en todos los dispositivos y las URLs por pliego son estables.
  const pliegos = paginarLibro(libro)

  return <Lector libro={libro} pliegos={pliegos} inicial={0} />
}
