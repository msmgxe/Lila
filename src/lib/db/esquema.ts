/**
 * Esquema Drizzle — entregable (a) de la Fase 1.
 *
 * Reglas que no se negocian y por qué están así:
 *  · `cuerpo` guarda el poema en texto plano con \n entre versos y \n\n entre
 *    estrofas. Es una sola columna de texto porque el poema es una unidad; si
 *    partiéramos los versos en filas perderíamos el orden exacto y las estrofas
 *    vacías intencionadas. Nada normaliza esos espacios.
 *  · `busqueda` es una columna generada. `unaccent(text)` es STABLE, no
 *    IMMUTABLE, así que NO se puede llamar dentro de una columna generada. En
 *    lugar de pelearse con eso, scripts/extensiones.ts crea una configuración
 *    de búsqueda `spanish_unaccent` que mete el diccionario unaccent en el
 *    pipeline. `to_tsvector(regconfig, text)` sí es IMMUTABLE, así que la
 *    columna generada funciona — y además `ts_headline` con esa misma
 *    configuración devuelve el fragmento CON sus acentos intactos, que es lo
 *    que se enseña al lector. Ese script corre ANTES de la primera migración.
 *  · Ninguna tabla guarda binarios. Las imágenes y los audios viven en el
 *    almacenamiento de objetos y aquí solo hay URLs. Ver docs/ADR-001.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

/** tsvector no tiene tipo nativo en Drizzle; lo declaramos a mano. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

/* ─────────────────────────────── libros ─────────────────────────────────── */

export const libros = pgTable(
  'libros',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    volumen: text('volumen').notNull(),
    titulo: text('titulo').notNull(),
    subtitulo: text('subtitulo'),
    descripcion: text('descripcion'),
    categoria: text('categoria').notNull(),
    orden: integer('orden').notNull().default(0),
    colorAcento: text('color_acento'),
    portadaUrl: text('portada_url'),
    anio: integer('anio'),
    publicado: boolean('publicado').notNull().default(false),
    /** Página con la que arranca el volumen, para numeración continua. */
    paginaBase: integer('pagina_base').notNull().default(1),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('libros_slug_idx').on(t.slug),
    index('libros_categoria_idx').on(t.categoria),
    index('libros_orden_idx').on(t.orden),
  ],
)

/* ─────────────────────────────── poemas ─────────────────────────────────── */

export const poemas = pgTable(
  'poemas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    libroId: uuid('libro_id')
      .notNull()
      .references(() => libros.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    titulo: text('titulo').notNull(),
    /** Versos separados por \n, estrofas por \n\n. Se conserva tal cual. */
    cuerpo: text('cuerpo').notNull(),
    forma: text('forma').notNull().default('verso libre'),
    dedicatoria: text('dedicatoria'),
    notaAutor: text('nota_autor'),
    anio: integer('anio'),
    orden: integer('orden').notNull().default(0),
    temas: text('temas').array().notNull().default(sql`'{}'::text[]`),
    publicado: boolean('publicado').notNull().default(false),
    busqueda: tsvector('busqueda').generatedAlwaysAs(
      sql`to_tsvector('public.spanish_unaccent', coalesce(titulo,'') || ' ' || coalesce(cuerpo,'') || ' ' || array_to_string(temas,' '))`,
    ),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('poemas_libro_slug_idx').on(t.libroId, t.slug),
    index('poemas_libro_orden_idx').on(t.libroId, t.orden),
    // El índice que hace que la búsqueda sea instantánea.
    index('poemas_busqueda_idx').using('gin', t.busqueda),
    // Tolerancia a erratas en el título (pg_trgm).
    index('poemas_titulo_trgm_idx').using('gin', sql`${t.titulo} gin_trgm_ops`),
  ],
)

/* ────────────────────────────── planchas ────────────────────────────────── */

export const planchas = pgTable(
  'planchas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    poemaId: uuid('poema_id')
      .notNull()
      .references(() => poemas.id, { onDelete: 'cascade' }),
    numero: text('numero').notNull(),
    titulo: text('titulo').notNull(),
    tecnica: text('tecnica').notNull(),
    /** URL en Vercel Blob. Nunca el binario. */
    url: text('url'),
    /** El prompt exacto con el que se generó, si es imagen generada. */
    promptGeneracion: text('prompt_generacion'),
    orden: integer('orden').notNull().default(0),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('planchas_poema_orden_idx').on(t.poemaId, t.orden)],
)

/* ─────────────────────────────── audios ─────────────────────────────────── */

export const audios = pgTable(
  'audios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    poemaId: uuid('poema_id')
      .notNull()
      .references(() => poemas.id, { onDelete: 'cascade' }),
    voz: text('voz').notNull(), // 'masculina' | 'femenina'
    proveedor: text('proveedor').notNull(),
    url: text('url').notNull(),
    duracionMs: integer('duracion_ms'),
    /** Hash del SSML: si cambia, hay que regenerar el audio. */
    ssmlHash: text('ssml_hash').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('audios_poema_voz_idx').on(t.poemaId, t.voz)],
)

/* ────────────────────────────── registro ────────────────────────────────── */

export const registro = pgTable(
  'registro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id'),
    accion: text('accion').notNull(),
    detalle: jsonb('detalle_json'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('registro_entidad_idx').on(t.entidad, t.creadoEn)],
)

/* ────────────────────────────── relaciones ──────────────────────────────── */

export const librosRel = relations(libros, ({ many }) => ({
  poemas: many(poemas),
}))

export const poemasRel = relations(poemas, ({ one, many }) => ({
  libro: one(libros, { fields: [poemas.libroId], references: [libros.id] }),
  planchas: many(planchas),
  audios: many(audios),
}))

export const planchasRel = relations(planchas, ({ one }) => ({
  poema: one(poemas, { fields: [planchas.poemaId], references: [poemas.id] }),
}))

export const audiosRel = relations(audios, ({ one }) => ({
  poema: one(poemas, { fields: [audios.poemaId], references: [poemas.id] }),
}))

export const esquema = {
  libros,
  poemas,
  planchas,
  audios,
  registro,
  librosRel,
  poemasRel,
  planchasRel,
  audiosRel,
}
