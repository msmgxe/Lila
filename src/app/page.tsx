import { obtenerAutor, obtenerLibros } from '@/lib/datos'
import { agruparEnPoemarios } from '@/lib/poemarios'
import { CarruselPoemarios } from '@/componentes/CarruselPoemarios'
import { ElAutor } from '@/componentes/ElAutor'
import { Cabecera } from '@/componentes/Cabecera'
import { Pie } from '@/componentes/Pie'
import { AUTOR, OBRA } from '@/lib/contenido/pentapoemario'

/**
 * La portada: la vitrina de poemarios.
 *
 * Antes se entraba directamente al anaquel de capítulos. Ahora la puerta es el
 * poemario —el nivel que la obra tiene de verdad— y desde ahí se baja a los
 * capítulos y de ahí al poema. Tres escalones, uno por cada nivel, en lugar de
 * saltarse el primero.
 *
 * Es un componente de servidor: los datos se resuelven aquí y el carrusel los
 * recibe ya listos, así que el navegador no consulta nada.
 */

export const revalidate = 3600

export default async function PaginaInicio() {
  const [libros, autor] = await Promise.all([obtenerLibros(), obtenerAutor()])
  const poemarios = agruparEnPoemarios(libros)

  return (
    <>
      <Cabecera />
      <main className="marco-vitrina">
        <CarruselPoemarios poemarios={poemarios} titulo={OBRA} autor={AUTOR} />
      </main>

      {/* Debajo del poemario, nunca encima: quien llega de redes viene a leer
          un poema, no una biografía. */}
      {autor && <ElAutor autor={autor} />}
      {/* El año se calcula en el servidor: `new Date()` dentro de un componente
          cliente desajusta la hidratación. */}
      <Pie anio={new Date().getFullYear()} />
    </>
  )
}
