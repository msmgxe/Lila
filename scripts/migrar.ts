/**
 * Aplica las migraciones pendientes de ./drizzle.
 *
 *   npm run db:generar   → crea el SQL a partir de src/lib/db/esquema.ts
 *   npm run db:migrar    → lo aplica a la base de datos
 *
 * Correr SIEMPRE primero en una rama de Neon, nunca directamente en la
 * principal. Ver docs/GUIA-BASE-DE-DATOS.md, apartado «Ramas».
 */

import { drizzle } from 'drizzle-orm/neon-serverless'
import { migrate } from 'drizzle-orm/neon-serverless/migrator'
import { conexionDirecta, ok } from './_conexion'

async function principal() {
  const pool = conexionDirecta()
  const db = drizzle(pool)

  console.log('\n  Aplicando migraciones…\n')
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    ok('migraciones al día')
    console.log('\n  Ahora:  npm run db:semilla\n')
  } finally {
    await pool.end()
  }
}

principal().catch((e) => {
  console.error(
    '\n  ✗ La migración ha fallado:\n',
    e,
    '\n\n  Si el error menciona «spanish_unaccent», ejecuta antes:\n' +
      '    npm run db:extensiones\n',
  )
  process.exit(1)
})
