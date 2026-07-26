/**
 * Genera las variables de entorno del panel.
 *
 *   npm run panel:clave
 *
 * Pide una clave, la cifra con scrypt e imprime las tres líneas que hay que
 * pegar en .env.local. La clave en claro no se guarda en ningún sitio.
 */

import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { cifrarClave } from '../src/lib/auth/clave'

async function principal() {
  const rl = createInterface({ input: stdin, output: stdout })

  console.log('\n  Alta del administrador del panel\n')
  const usuario = (await rl.question('  Usuario (tu correo): ')).trim()
  const clave = (await rl.question('  Clave: ')).trim()
  const repetida = (await rl.question('  Repite la clave: ')).trim()
  rl.close()

  if (!usuario) throw new Error('El usuario no puede quedar vacío.')
  if (clave.length < 10) {
    throw new Error('Usa al menos 10 caracteres: esta clave abre todo el panel.')
  }
  if (clave !== repetida) throw new Error('Las dos claves no coinciden.')

  console.log('\n  ── Pega estas tres líneas en .env.local ──────────────────\n')
  console.log(`AUTH_SECRET="${randomBytes(32).toString('base64')}"`)
  console.log(`ADMIN_USUARIO="${usuario}"`)
  console.log(`ADMIN_CLAVE_HASH="${cifrarClave(clave)}"`)
  console.log('\n  ─────────────────────────────────────────────────────────')
  console.log('\n  En Vercel, añádelas también en Settings → Environment Variables.')
  console.log('  Ninguna lleva el prefijo NEXT_PUBLIC_: son de servidor.\n')
}

principal().catch((e) => {
  console.error(`\n  ✗ ${e.message}\n`)
  process.exit(1)
})
