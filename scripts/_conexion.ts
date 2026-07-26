import { config } from 'dotenv'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'

config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

// En Node hace falta un WebSocket; en el navegador lo trae el propio entorno.
neonConfig.webSocketConstructor = ws

/**
 * Los scripts usan SIEMPRE la cadena DIRECTA (sin `-pooler`).
 * El pooler no admite bien las sentencias DDL largas ni las transacciones de
 * migración; la aplicación en runtime sí usa la agrupada.
 */
export function conexionDirecta() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) {
    console.error(
      '\n  ✗ Falta DATABASE_URL_UNPOOLED (o DATABASE_URL) en .env.local\n' +
        '    Copia .env.example a .env.local y pega las cadenas de Neon.\n' +
        '    Guía paso a paso: docs/GUIA-BASE-DE-DATOS.md\n',
    )
    process.exit(1)
  }
  if (url.includes('-pooler')) {
    console.warn(
      '  ⚠ Estás usando la cadena agrupada (-pooler) para un script.\n' +
        '    Funciona, pero lo correcto es DATABASE_URL_UNPOOLED.\n',
    )
  }
  return new Pool({ connectionString: url })
}

export function ok(mensaje: string) {
  console.log(`  ✓ ${mensaje}`)
}
