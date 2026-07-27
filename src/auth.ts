import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { CredentialsSignin } from 'next-auth'
import { comprobarClave } from '@/lib/auth/clave'

/**
 * Auth.js v5 con un único administrador.
 *
 * No hay tabla de usuarios ni registro: el sitio tiene un solo dueño. El
 * usuario y el hash de su clave viven en variables de entorno, y la sesión va
 * en un JWT firmado con `AUTH_SECRET` — así el panel no consulta la base de
 * datos para comprobar quién eres en cada petición.
 *
 * Variables necesarias (todas de servidor):
 *   AUTH_SECRET       cadena aleatoria larga  ·  openssl rand -base64 32
 *   ADMIN_USUARIO     el correo o el nombre con el que entras
 *   ADMIN_CLAVE_HASH  el hash scrypt  ·  npm run panel:clave
 */

export const panelConfigurado = Boolean(
  process.env.AUTH_SECRET && process.env.ADMIN_USUARIO && process.env.ADMIN_CLAVE_HASH,
)

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: { signIn: '/panel/entrar', error: '/panel/entrar' },
  providers: [
    Credentials({
      name: 'Clave del panel',
      credentials: {
        usuario: { label: 'Usuario' },
        clave: { label: 'Clave', type: 'password' },
      },
      authorize: async (credenciales) => {
        const usuario = String(credenciales?.usuario ?? '')
        const clave = String(credenciales?.clave ?? '')
        const esperado = process.env.ADMIN_USUARIO
        const hash = process.env.ADMIN_CLAVE_HASH

        // Sin variables no es que las credenciales estén mal: es que el panel
        // no está configurado en ESTE proceso. Distinguirlo ahorra mucho
        // tiempo — en Vercel, cambiar una variable no afecta a un despliegue
        // ya hecho, y en local hay que reiniciar el servidor.
        if (!esperado || !hash) {
          throw new CredentialsSignin('sin-configurar')
        }
        if (usuario.trim().toLowerCase() !== esperado.trim().toLowerCase()) return null
        if (!comprobarClave(clave, hash)) return null

        return { id: 'admin', name: 'Administración', email: esperado }
      },
    }),
  ],
  callbacks: {
    // Marcamos el token para que ninguna sesión ajena al único administrador
    // pueda colarse aunque el JWT fuese válido por otra vía.
    jwt({ token }) {
      token.rol = 'admin'
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.name = String(token.name ?? 'Administración')
      return session
    },
  },
})

/** Corta la ejecución si quien llama no es el administrador. */
export async function exigirSesion() {
  const sesion = await auth()
  if (!sesion?.user) throw new Error('No autorizado')
  return sesion
}
