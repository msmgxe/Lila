/**
 * Identidad del sitio.
 *
 * Estaba repetida en cinco sitios —la barra del lector, la del panel, la
 * pantalla de entrada y los metadatos— y cambiarla obligaba a buscarla por todo
 * el proyecto. Aquí se cambia una vez.
 *
 * `NOMBRE` se escribe como se lee. La barra superior lo pone en versalitas por
 * CSS (`text-transform`), no escribiéndolo en mayúsculas: así el mismo valor
 * sirve para el título de la pestaña y para las tarjetas al compartir.
 */

export const SITIO = {
  nombre: 'Nubenauta Rosa',
  lema: 'el anaquel del poeta',
  descripcion:
    'Obra reunida. Cada capítulo agrupa cinco poemas de cinco versos, con la plancha que los acompaña. Se lee, se busca y se escucha.',
} as const

/** Prefijo de las claves de `localStorage`, para no chocar con otros sitios. */
export const CLAVE = 'lila'
