import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { hayBaseDeDatos } from '@/lib/db/cliente'
import { SITIO } from '@/lib/sitio'
import { salir } from '../acciones'

export const dynamic = 'force-dynamic'

/**
 * El muro. Todo lo que cuelga de este grupo exige sesión.
 *
 * Ojo: esto protege las VISTAS. Las Server Actions se comprueban una a una en
 * `acciones.ts`, porque son endpoints propios y no pasan por este layout.
 */
export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const sesion = await auth()
  if (!sesion?.user) redirect('/panel/entrar')

  return (
    <div className="panel">
      <header className="panel-barra">
        <Link className="marca" href="/panel" style={{ color: 'inherit', textDecoration: 'none' }}>
          {SITIO.nombre}
        </Link>
        <span className="et">panel</span>
        <div className="sep" />
        <nav>
          <Link href="/panel">Inicio del panel</Link>
          <Link href="/panel/poemarios">Poemarios</Link>
          <Link href="/panel/autor">El autor</Link>
          {/* Con la palabra al lado, no solo el icono.
              Estaba como un «⚙» suelto, y en una barra con letra de 0.7 rem e
              interletrado ancho eso sale como un punto de diez píxeles: el
              enlace existía y no había manera de verlo. Un icono se sostiene
              solo cuando su significado es evidente, y una tuerca perdida en
              una fila de texto no lo es. */}
          <Link className="con-icono" href="/panel/ajustes">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.9 15.5a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V22a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H2a2 2 0 110-4h.2a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H8.5a1.7 1.7 0 001-1.6V2a2 2 0 114 0v.2a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.6 1H22a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1.1z" />
            </svg>
            Tema
          </Link>
          <Link href="/" target="_blank" rel="noopener">
            Ver el sitio ↗
          </Link>
        </nav>
        <form action={salir}>
          <button className="bt menudo" type="submit">
            Salir
          </button>
        </form>
      </header>

      <div className="panel-cuerpo">
        {!hayBaseDeDatos && (
          <div className="recuadro alerta">
            <h2>El panel necesita la base de datos</h2>
            <p>
              Sin <code>DATABASE_URL</code> el sitio funciona —sirve la obra desde el
              archivo del proyecto— pero no se puede editar nada: no hay dónde guardar.
            </p>
            <p>
              Móntala siguiendo <code>docs/GUIA-BASE-DE-DATOS.md</code>. Son quince minutos
              y el último paso es un solo comando:
            </p>
            <pre>npm run db:preparar</pre>
          </div>
        )}
        {hayBaseDeDatos && children}
      </div>
    </div>
  )
}
