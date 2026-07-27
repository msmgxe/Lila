import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { obtenerLibros } from '@/lib/datos'
import { agruparEnPoemarios, buscarPoemario, lemaDe } from '@/lib/poemarios'
import { FichaPoemario } from '@/componentes/FichaPoemario'
import { Cabecera } from '@/componentes/Cabecera'
import { Pie } from '@/componentes/Pie'

export const revalidate = 3600

/**
 * La ficha de un poemario: portada y capítulos.
 *
 * Es el escalón entre la vitrina y el lector. La ruta es `/poemario/<slug>` y
 * no `/<slug>`, que ya es la del capítulo: un segmento fijo delante evita que
 * un poemario y un capítulo se peleen por la misma dirección el día que
 * alguien los llame igual.
 */

export async function generateStaticParams() {
  const poemarios = agruparEnPoemarios(await obtenerLibros())
  return poemarios.map((p) => ({ slug: p.categoria.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const poemario = buscarPoemario(await obtenerLibros(), slug)
  if (!poemario) return {}
  return {
    title: poemario.categoria.nombre,
    description: poemario.categoria.descripcion ?? lemaDe(poemario),
    openGraph: {
      title: poemario.categoria.nombre,
      images: poemario.portadaUrl ? [poemario.portadaUrl] : undefined,
    },
  }
}

export default async function PaginaPoemario({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const poemario = buscarPoemario(await obtenerLibros(), slug)
  if (!poemario) notFound()

  return (
    <>
      <Cabecera />
      <main className="marco-poemario">
        <FichaPoemario poemario={poemario} />
      </main>
      <Pie anio={new Date().getFullYear()} />
    </>
  )
}
