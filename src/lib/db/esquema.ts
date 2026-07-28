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

/** `bytea` para los bytes de una imagen. Ver la tabla `portadas`. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

/* ───────────────────────────── categorías ───────────────────────────────── */

/**
 * Un poemario. Agrupa capítulos y se puede ocultar entero del sitio con
 * `visible`, sin tener que despublicar sus capítulos uno a uno.
 */
export const categorias = pgTable(
  'categorias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    nombre: text('nombre').notNull(),
    /** La línea corta bajo el nombre en el carrusel. «Ocho capítulos, cuarenta poemas». */
    lema: text('lema'),
    descripcion: text('descripcion'),
    /** La imagen con la que el poemario se presenta en el carrusel de la portada. */
    portadaUrl: text('portada_url'),
    /**
     * El color del poemario. Nulo significa «el del sitio», que es lo que hay
     * hoy: la paleta Lila manda mientras nadie diga otra cosa. Cuando lleva
     * valor, el carrusel y la ficha del poemario se tiñen con él sin que haya
     * que tocar una sola regla de CSS — se inyecta como variable.
     */
    colorAcento: text('color_acento'),
    orden: integer('orden').notNull().default(0),
    visible: boolean('visible').notNull().default(true),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('categorias_slug_idx').on(t.slug),
    index('categorias_orden_idx').on(t.orden),
  ],
)

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
    // ON DELETE SET NULL y no CASCADE: borrar un poemario por error no puede
    // llevarse por delante los capítulos con todos sus poemas dentro.
    categoriaId: uuid('categoria_id').references(() => categorias.id, {
      onDelete: 'set null',
    }),
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
    index('libros_categoria_idx').on(t.categoriaId),
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
    // `f_unir` en vez de `array_to_string`: el segundo es STABLE y Postgres no
    // admite nada que no sea IMMUTABLE en una columna generada. Ver el paso
    // correspondiente en scripts/extensiones.ts.
    busqueda: tsvector('busqueda').generatedAlwaysAs(
      sql`to_tsvector('public.spanish_unaccent', coalesce(titulo,'') || ' ' || coalesce(cuerpo,'') || ' ' || public.f_unir(temas))`,
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

export const categoriasRel = relations(categorias, ({ many }) => ({
  libros: many(libros),
}))

/* ───────────────────────────── portadas ─────────────────────────────────── */

/**
 * Los bytes de la portada de un capítulo, subida desde el panel.
 *
 * Guardar imágenes en Postgres es, en general, mala idea, y así se dijo cuando
 * se diseñó `planchas` —que sigue guardando solo URLs—. Aquí se hace lo
 * contrario a propósito, y conviene dejar escrito por qué:
 *
 *   · Son OCHO imágenes, una por capítulo, no una biblioteca creciente.
 *   · La alternativa era Vercel Blob, que obliga a enlazar un almacén a mano
 *     desde la web. Eso dejaba la función muerta hasta que alguien hiciera ese
 *     clic, y lo que se pidió fue poder subir la imagen.
 *   · Van en TABLA APARTE, no en una columna de `libros`. Ninguna consulta del
 *     anaquel ni del lector las toca: solo la ruta `/portadas/[slug]`, que las
 *     sirve con caché de un año. Al CDN llegan una vez por región.
 *
 * `libros.portadaUrl` sigue siendo una URL de texto y sigue mandando: al subir
 * una imagen se le pone `/portadas/<slug>`, y quien prefiera alojarla fuera solo
 * tiene que pegar ahí otra dirección. El día que haya un almacén de verdad, se
 * cambian las URLs y esta tabla se vacía sin tocar nada más.
 */
export const portadas = pgTable('portadas', {
  // El libro ES la clave: un capítulo tiene una portada, no varias.
  libroId: uuid('libro_id')
    .primaryKey()
    .references(() => libros.id, { onDelete: 'cascade' }),
  mime: text('mime').notNull(),
  bytes: bytea('bytes').notNull(),
  /** Para el ETag: cambia la portada, cambia el ETag, se recarga la caché. */
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
})

export const librosRel = relations(libros, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [libros.categoriaId],
    references: [categorias.id],
  }),
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

/* ─────────────────────────────── el autor ───────────────────────────────── */

/**
 * La sección del autor: retrato, trayectoria y vídeos. **Una sola fila.**
 *
 * `clave` es siempre `'principal'` y es la clave primaria: así no hay forma de
 * acabar con dos filas peleándose por ser la buena, que es el fallo clásico de
 * las tablas de un solo registro. Si algún día hay más de un autor, deja de ser
 * fija y el resto no cambia.
 *
 * Los hitos y los vídeos van en `jsonb` y no en tablas propias a propósito: son
 * listas cortas que se editan enteras de una vez —se añade uno, se cambia el
 * orden, se borra otro— y partirlas en tablas obligaría a un formulario por
 * fila y a una acción por movimiento, para nada.
 *
 * Los vídeos son URLs, no bytes. Un vídeo pesa megas: guardarlo aquí llenaría
 * Neon y haría lento cada despliegue. El retrato sí va en `medios`, como las
 * portadas de capítulo, porque es una imagen y pesa kilos.
 */
export const autor = pgTable('autor', {
  clave: text('clave').primaryKey(),
  nombre: text('nombre').notNull(),
  /** La línea bajo el nombre: «Poeta, dibujante y profesor de arte». */
  titular: text('titular'),
  /** Un párrafo corto encima de la línea de tiempo. */
  intro: text('intro'),
  retratoUrl: text('retrato_url'),
  /** [{ etiqueta, titulo, texto }] — la línea de tiempo, en orden. */
  hitos: jsonb('hitos').$type<Array<{ etiqueta: string; titulo: string; texto: string }>>().notNull().default([]),
  /** [{ titulo, url, portadaUrl }] — la tira de vídeos cortos. */
  videos: jsonb('videos').$type<Array<{ titulo: string; url: string; portadaUrl?: string }>>().notNull().default([]),
  visible: boolean('visible').notNull().default(false),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
})

/* ─────────────────────────────── ajustes ────────────────────────────────── */

/**
 * Ajustes del sitio. Una sola fila, como `autor` y por la misma razón: con la
 * clave fija como primaria no hay forma de acabar con dos peleándose por ser la
 * buena.
 *
 * Hoy solo guarda el tema. Cuando haga falta otro ajuste global —el idioma, el
 * aviso de cookies— entra aquí y no en una tabla nueva por cada cosa.
 */
export const ajustes = pgTable('ajustes', {
  clave: text('clave').primaryKey(),
  /** La clave de un tema de `lib/temas.ts`. Si no existe, manda el primero. */
  tema: text('tema').notNull().default('lila'),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
})

/* ─────────────────────────────── medios ─────────────────────────────────── */

/**
 * Imágenes sueltas que no cuelgan de ningún capítulo: hoy, el retrato del
 * autor. Mismo trato que `portadas` —bytes en Postgres, servidos con caché de
 * un año— y por las mismas razones, que están escritas allí arriba.
 *
 * La clave la pone quien la guarda: `autor-retrato`, `autor-video-2-portada`…
 * Es un texto y no un id generado porque así la ruta que la sirve se puede
 * escribir sin consultar nada.
 */
export const medios = pgTable('medios', {
  clave: text('clave').primaryKey(),
  mime: text('mime').notNull(),
  bytes: bytea('bytes').notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
})

export const portadasRel = relations(portadas, ({ one }) => ({
  libro: one(libros, { fields: [portadas.libroId], references: [libros.id] }),
}))

export const esquema = {
  ajustes,
  autor,
  medios,
  categorias,
  categoriasRel,
  libros,
  portadas,
  portadasRel,
  poemas,
  planchas,
  audios,
  registro,
  librosRel,
  poemasRel,
  planchasRel,
  audiosRel,
}
