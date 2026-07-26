import { redirect } from 'next/navigation'
import { auth, panelConfigurado } from '@/auth'
import { SITIO } from '@/lib/sitio'
import { FormularioEntrada } from './FormularioEntrada'

export const dynamic = 'force-dynamic'

export default async function PaginaEntrar() {
  if (await auth()) redirect('/panel')

  if (!panelConfigurado) {
    return (
      <main className="entrar">
        <div className="caja" style={{ width: 'min(40rem, 100%)' }}>
          <h1>El panel no está configurado</h1>
          <p className="sub">Faltan las tres variables que identifican al administrador.</p>
          <div className="recuadro alerta" style={{ marginBottom: 0 }}>
            <p>
              Ejecuta este comando, contesta a las preguntas y pega las tres líneas que
              imprime en tu archivo <code>.env.local</code>:
            </p>
            <pre>npm run panel:clave</pre>
            <p>
              Después reinicia el servidor. En Vercel, añade además esas tres variables en{' '}
              <strong>Settings → Environment Variables</strong>.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="entrar">
      <div className="caja">
        <h1>{SITIO.nombre}</h1>
        <p className="sub">Administración de la obra</p>
        <FormularioEntrada />
      </div>
    </main>
  )
}
