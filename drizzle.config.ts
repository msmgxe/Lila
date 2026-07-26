import { defineConfig } from 'drizzle-kit'
import { config as cargarEnv } from 'dotenv'

cargarEnv({ path: '.env.local', quiet: true })
cargarEnv({ path: '.env', quiet: true })

// Las migraciones van SIEMPRE por la cadena directa (sin pooler).
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

export default defineConfig({
  schema: './src/lib/db/esquema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: url ?? '' },
  verbose: true,
  strict: true,
})
