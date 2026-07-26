import type { Voz } from '../tipos'

/**
 * Reconocer si una voz del sistema es de hombre o de mujer.
 *
 * La API del navegador **no dice el género**: solo da un nombre y un idioma. Hay
 * que deducirlo del nombre, y ahí es donde fallaba: la lista original solo tenía
 * nombres de persona en español (Jorge, Diego, Pablo…) y macOS lleva años
 * sirviendo voces que se llaman Reed, Rocko, Grandpa o Shelley. Ninguna casaba,
 * así que «masculina» acababa usando Paulina con el tono bajado — y macOS apenas
 * atiende al tono, de modo que sonaba igual.
 *
 * Aun con la lista ampliada esto seguirá fallando en algún sistema, porque
 * depende de nombres propios. Por eso el lector **enseña qué voz está usando y
 * deja elegir otra a mano**: la heurística acierta casi siempre, y cuando no,
 * se ve y se corrige.
 */

const MASCULINAS =
  /\b(jorge|diego|pablo|ra[uú]l|carlos|juan|[aá]lvaro|enrique|miguel|javier|antonio|male|mascul|hombre|eddy|grandpa|reed|rocko|arthur|daniel|fred|alex|thomas|jacques|yannick)\b/i

const FEMENINAS =
  /\b(m[oó]nica|paulina|helena|laura|sabina|elvira|dalia|marisol|esperanza|luc[ií]a|pen[eé]lope|ang[eé]lica|marisa|female|femen|mujer|flo|grandma|sandy|shelley|superstar|samantha|karen|tessa|victoria|amelie|anna)\b/i

export interface VozDelSistema {
  uri: string
  nombre: string
  idioma: string
  /** null cuando el nombre no permite deducirlo. */
  genero: Voz | null
  /** Instalada en el equipo (suena sin conexión y responde mejor al tono). */
  local: boolean
}

export function generoDe(nombre: string): Voz | null {
  if (MASCULINAS.test(nombre)) return 'masculina'
  if (FEMENINAS.test(nombre)) return 'femenina'
  return null
}

/** Las voces en español que hay instaladas, ordenadas por utilidad. */
export function vocesEnEspanol(todas: SpeechSynthesisVoice[]): VozDelSistema[] {
  return todas
    .filter((v) => /^es/i.test(v.lang))
    .map((v) => ({
      uri: v.voiceURI,
      nombre: v.name,
      idioma: v.lang,
      genero: generoDe(v.name),
      local: v.localService,
    }))
    .sort((a, b) => {
      // Primero las que sí sabemos de qué género son: son las únicas con las
      // que el conmutador M/F puede hacer su trabajo.
      if (!!a.genero !== !!b.genero) return a.genero ? -1 : 1
      if (a.local !== b.local) return a.local ? -1 : 1
      return a.nombre.localeCompare(b.nombre, 'es')
    })
}

/**
 * La mejor voz para el género pedido. Devuelve también si de verdad es de ese
 * género o es un apaño, para poder decírselo al lector en vez de disimularlo.
 */
export function elegirVoz(
  voces: VozDelSistema[],
  genero: Voz,
): { voz: VozDelSistema | null; acorde: boolean } {
  const delGenero = voces.filter((v) => v.genero === genero)
  if (delGenero.length > 0) {
    // Con varias, gana la instalada en el equipo: responde mejor y no depende
    // de la conexión.
    return { voz: delGenero.find((v) => v.local) ?? delGenero[0], acorde: true }
  }
  // Sin ninguna del género pedido: se coge cualquiera y se compensa con el tono.
  return { voz: voces[0] ?? null, acorde: false }
}
