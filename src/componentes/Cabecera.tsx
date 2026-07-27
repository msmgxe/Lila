import Link from 'next/link'
import { SITIO } from '@/lib/sitio'
import { AUTOR } from '@/lib/contenido/pentapoemario'

/**
 * Cabecera del sitio. Solo aparece en el anaquel y en las páginas sueltas: el
 * lector tiene la suya propia, porque ahí manda el pliego y una cabecera de más
 * le robaría alto a la página del poema.
 */
export function Cabecera() {
  return (
    <header className="cabecera-sitio">
      <Link className="marca" href="/">
        {SITIO.nombre}
      </Link>
      <span className="et sep">{AUTOR}</span>
      <nav>
        <Link href="/">Anaquel</Link>
        <Link href="/sobre-la-obra">Sobre la obra</Link>
      </nav>
    </header>
  )
}
