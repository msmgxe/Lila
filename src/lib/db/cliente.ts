import 'server-only' // ← si alguien importa esto desde un componente cliente, la build falla

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { esquema } from './esquema'

/**
 * Cliente de base de datos. Solo servidor.
 *
 * Usamos el driver HTTP (`neon-http`): una consulta = una petición HTTP, sin
 * conexión persistente. Es lo correcto en funciones serverless y para lecturas
 * sueltas. Si en el futuro hiciera falta una transacción de varias sentencias,
 * se abre un cliente WebSocket aparte (`drizzle-orm/neon-serverless`).
 *
 * La cadena es SIEMPRE la agrupada (la que lleva `-pooler` en el host). La
 * directa se reserva para migraciones y scripts.
 */

export const hayBaseDeDatos = Boolean(process.env.DATABASE_URL)

function crear() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return drizzle(neon(url), { schema: esquema, casing: 'snake_case' })
}

export const db = crear()

/** Igual que `db` pero lanza si no hay base de datos. Para rutas que la exigen. */
export function exigirDb() {
  if (!db) {
    throw new Error(
      'Falta DATABASE_URL. Copia .env.example a .env.local y rellena la cadena de Neon.',
    )
  }
  return db
}
