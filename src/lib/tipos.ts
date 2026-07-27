/**
 * Tipos del dominio. Son los que viajan del servidor al cliente, así que todo
 * lo que hay aquí tiene que ser serializable (nada de Date sin convertir, nada
 * de funciones). Ver docs/ADR-003.
 */

/**
 * Una categoría agrupa capítulos: en la práctica, **un poemario**.
 *
 * Empezó siendo una simple cadena en cada volumen, pero eso no permite ni
 * nombrarlas bien, ni ordenarlas, ni —sobre todo— **ocultar una entera** sin
 * tocar uno por uno sus capítulos. Ahora es una entidad con su propia tabla,
 * que es lo que hace falta para tener varios poemarios a la vez y decidir
 * cuáles se ven.
 */
export interface Categoria {
  id: string
  slug: string
  nombre: string
  /** La línea corta bajo el nombre en el carrusel. */
  lema: string | null
  descripcion: string | null
  portadaUrl: string | null
  /** Nulo = la paleta del sitio. Ver `colorDelPoemario` en lib/color.ts. */
  colorAcento: string | null
  orden: number
  /** Si está en false, ni ella ni sus capítulos aparecen en el sitio. */
  visible: boolean
}

export type Voz = 'masculina' | 'femenina'

/** La obra plástica que acompaña al poema. */
export interface Plancha {
  id: string
  numero: string
  titulo: string
  tecnica: string
  /** URL en el almacenamiento de objetos. Null mientras no haya obra subida. */
  url: string | null
  orden: number
}

export interface Audio {
  id: string
  voz: Voz
  url: string
  duracionMs: number | null
}

export interface Poema {
  id: string
  slug: string
  titulo: string
  /**
   * Cuerpo del poema como matriz de estrofas, cada una con sus versos.
   * En la base de datos se guarda como texto con \n y \n\n; esta forma es la
   * que usa la aplicación. Los saltos NUNCA se normalizan.
   */
  estrofas: string[][]
  forma: string
  dedicatoria: string | null
  notaAutor: string | null
  anio: number | null
  temas: string[]
  orden: number
  publicado: boolean
  planchas: Plancha[]
  audios: Audio[]
}

export interface Libro {
  id: string
  slug: string
  volumen: string
  titulo: string
  subtitulo: string | null
  descripcion: string | null
  /** Null mientras el capítulo no se ha asignado a ningún poemario. */
  categoria: Categoria | null
  orden: number
  colorAcento: string | null
  portadaUrl: string | null
  anio: number | null
  publicado: boolean
  /** Número de página con el que arranca el volumen (numeración continua). */
  paginaBase: number
  poemas: Poema[]
}

/* ── Paginación: el resultado de repartir un volumen en pliegos ──────────── */

export type TipoPliego = 'portada' | 'indice' | 'poema' | 'colofon'

export interface Pliego {
  /** Índice del pliego dentro del volumen. */
  n: number
  tipo: TipoPliego
  /** Número de folio que se imprime en la esquina. */
  folio: number
  /** Solo en tipo 'poema'. */
  poema?: Poema
  /** Rango de estrofas [desde, hasta] que caen en este pliego. */
  estrofas?: [number, number]
  /** Con qué apretura se compone esta página. La calcula el servidor. */
  densidad?: 'normal' | 'denso' | 'muy-denso'
  /** Si esta página lleva la viñeta de cierre. */
  vineta?: boolean
  /** 0 = primer pliego del poema; >0 = continuación. */
  parte?: number
  /** Total de pliegos que ocupa el poema. */
  partes?: number
  /** La plancha que se muestra a la izquierda. */
  plancha?: Plancha | null
}

export interface ResultadoBusqueda {
  libroSlug: string
  libroTitulo: string
  libroVolumen: string
  poemaSlug: string
  poemaTitulo: string
  /** Fragmento con <mark> alrededor del término. Ya viene escapado. */
  fragmento: string
}
