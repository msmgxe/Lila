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
          <Link href="/panel">Volúmenes</Link>
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
