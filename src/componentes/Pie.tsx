import Link from 'next/link'
import { SITIO } from '@/lib/sitio'
import { AUTOR, OBRA } from '@/lib/contenido/pentapoemario'

/**
 * Pie del sitio. Cierra el anaquel y las páginas sueltas.
 *
 * El año se pasa desde fuera: calcularlo aquí con `new Date()` haría la página
 * dinámica y perdería el prerenderizado estático, que es la decisión de
 * rendimiento más importante del proyecto.
 */
export function Pie({ anio }: { anio: number }) {
  return (
    <footer className="pie-sitio">
      <div className="columnas">
        <div>
          <span className="marca">{SITIO.nombre}</span>
          <p>{SITIO.descripcion}</p>
        </div>

        <div>
          <span className="et">La obra</span>
          <ul>
            <li>{OBRA}</li>
            <li>{AUTOR}</li>
          </ul>
        </div>

        <div>
          <span className="et">Navegar</span>
          <ul>
            <li>
              <Link href="/">El anaquel</Link>
            </li>
            <li>
              <Link href="/sobre-la-obra">Sobre la obra</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="linea-final">
        <span>
          © {anio} {AUTOR}
        </span>
        <span>Todos los derechos reservados</span>
      </div>
    </footer>
  )
}
