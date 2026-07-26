/**
 * Prepara la base de datos ANTES de la primera migración.
 *
 * Crea las extensiones y —lo importante— la configuración de búsqueda
 * `spanish_unaccent`. La columna generada `poemas.busqueda` depende de ella, así
 * que si esto no se ejecuta primero, la migración falla.
 *
 *   npm run db:extensiones
 *
 * Es idempotente: se puede ejecutar tantas veces como haga falta.
 */

import { conexionDirecta, ok } from './_conexion'

const PASOS: Array<[string, string]> = [
  [
    'extensión unaccent (búsqueda sin acentos)',
    `CREATE EXTENSION IF NOT EXISTS unaccent;`,
  ],
  [
    'extensión pg_trgm (tolerancia a erratas)',
    `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
  ],
  [
    'extensión pgcrypto (uuid por defecto)',
    `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
  ],
  [
    'función f_unaccent, marcada IMMUTABLE',
    // unaccent(text) es STABLE y no vale dentro de una columna generada ni de un
    // índice. La variante de dos argumentos, con el diccionario explícito, sí es
    // IMMUTABLE. Este envoltorio es el que usan los índices trigram.
    `CREATE OR REPLACE FUNCTION public.f_unaccent(text)
       RETURNS text
       LANGUAGE sql
       IMMUTABLE PARALLEL SAFE STRICT
     AS $func$ SELECT public.unaccent('public.unaccent', $1) $func$;`,
  ],
  [
    'configuración de búsqueda spanish_unaccent',
    // Mete el diccionario unaccent en el pipeline del español. Así el índice y
    // la consulta se normalizan igual, y ts_headline puede trabajar sobre el
    // texto ORIGINAL sin perder los acentos del fragmento que se enseña.
    // No existe CREATE ... IF NOT EXISTS para esto, de ahí el bloque DO.
    `DO $do$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_ts_config c
         JOIN pg_namespace n ON n.oid = c.cfgnamespace
         WHERE c.cfgname = 'spanish_unaccent' AND n.nspname = 'public'
       ) THEN
         CREATE TEXT SEARCH CONFIGURATION public.spanish_unaccent (COPY = pg_catalog.spanish);
         ALTER TEXT SEARCH CONFIGURATION public.spanish_unaccent
           ALTER MAPPING FOR hword, hword_part, word
           WITH unaccent, spanish_stem;
       END IF;
     END
     $do$;`,
  ],
]

async function principal() {
  const pool = conexionDirecta()
  console.log('\n  Preparando la base de datos…\n')
  try {
    for (const [nombre, sql] of PASOS) {
      await pool.query(sql)
      ok(nombre)
    }

    // Comprobación real: que la configuración hace lo que decimos.
    const { rows } = await pool.query(
      `SELECT to_tsvector('public.spanish_unaccent','canción') @@
              websearch_to_tsquery('public.spanish_unaccent','cancion') AS coincide`,
    )
    if (!rows[0]?.coincide) {
      throw new Error('spanish_unaccent no normaliza los acentos como debería')
    }
    ok('comprobado: «cancion» encuentra «canción»')

    console.log('\n  Listo. Ahora:  npm run db:migrar\n')
  } finally {
    await pool.end()
  }
}

principal().catch((e) => {
  console.error('\n  ✗ Ha fallado la preparación:\n', e, '\n')
  process.exit(1)
})
