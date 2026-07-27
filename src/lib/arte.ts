/**
 * Arte generativo de la plancha.
 *
 * Marca el sitio donde irá la obra real del artista. Es determinista a partir
 * de una semilla (el slug del poema), así que el servidor y el cliente pintan
 * exactamente lo mismo y no hay error de hidratación. En cuanto una plancha
 * tenga `url`, este SVG deja de usarse.
 */

/**
 * `acento` es el color del volumen (`libros.color_acento`). Tiñe el fondo para
 * que cada obra tenga su temperatura: el Pentapoemario lila sale lila, sin que
 * haya que dibujar nada a mano.
 */
export function arteDePlancha(semilla: string, apagado = false, acento?: string | null): string {
  let h = 0
  for (const c of semilla) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  const r = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff), (h % 1000) / 1000)

  let formas = ''
  for (let i = 0; i < 9; i++) {
    const cx = (r() * 400).toFixed(0)
    const cy = (r() * 520).toFixed(0)
    const rx = (40 + r() * 180).toFixed(0)
    const ry = (60 + r() * 220).toFixed(0)
    const rot = (r() * 180).toFixed(0)
    const op = (0.05 + r() * 0.13).toFixed(3)
    const gr = (0.6 + r() * 1.6).toFixed(2)
    formas += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="#F4EEF8" stroke-width="${gr}" opacity="${op}"/>`
  }
  for (let i = 0; i < 4; i++) {
    const y = 60 + r() * 400
    const c1 = (y - 90 + r() * 180).toFixed(0)
    const c2 = (y + 60 - r() * 140).toFixed(0)
    const c3 = (y - 30 + r() * 80).toFixed(0)
    const gr = (8 + r() * 26).toFixed(0)
    const op = (0.03 + r() * 0.05).toFixed(3)
    formas += `<path d="M-20 ${y.toFixed(0)} C 120 ${c1}, 260 ${c2}, 420 ${c3}" fill="none" stroke="#C9A6E8" stroke-width="${gr}" opacity="${op}"/>`
  }

  // Solo aceptamos un hexadecimal: el color viene de la base de datos y acaba
  // dentro de un SVG que se inyecta como HTML.
  const tinte = acento && /^#[0-9a-f]{6}$/i.test(acento) ? acento : null
  const claro = tinte ?? (apagado ? '#2b2626' : '#3a3130')
  const id = `g-${semilla.replace(/[^a-z0-9]/gi, '')}`

  return `<svg class="arte" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Motivo generado para acompañar al poema"><defs><radialGradient id="${id}" cx="35%" cy="25%"><stop offset="0" stop-color="${claro}" stop-opacity="${tinte ? 0.55 : 1}"/><stop offset="1" stop-color="#0d0716"/></radialGradient></defs><rect width="400" height="520" fill="#0d0716"/><rect width="400" height="520" fill="url(#${id})"/>${formas}</svg>`
}

/**
 * Viñeta de la dirección A (Códice): la marca de agua discreta que remata la
 * página del poema cuando no hay plancha en juego.
 */
export function vineta(semilla: string): string {
  let h = 0
  for (const c of semilla) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  const r = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff), (h % 1000) / 1000)

  let formas = ''
  for (let i = 0; i < 7; i++) {
    const x = (60 + r() * 280).toFixed(1)
    const y = (20 + r() * 80).toFixed(1)
    const rr = (8 + r() * 34).toFixed(1)
    formas += `<circle cx="${x}" cy="${y}" r="${rr}" fill="none" stroke="#8b5cb8" stroke-width=".8" opacity=".55"/>`
  }
  formas += `<path d="M20 100 Q 200 ${(60 + r() * 40).toFixed(0)} 380 100" fill="none" stroke="#7b3fa8" stroke-width="1" opacity=".45"/>`
  return `<svg class="vineta" viewBox="0 0 400 120" role="presentation" aria-hidden="true">${formas}</svg>`
}
