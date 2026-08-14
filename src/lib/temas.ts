/**
 * Los temas del sitio.
 *
 * Un tema son **cinco colores y una tipografía de titulares**. Nada más: todo
 * el sitio lee esas variables, así que cambiar de tema no toca ni una regla de
 * estilo. Es la misma idea que `colorDelPoemario`, un escalón más arriba — allí
 * se tiñe una sección, aquí el sitio entero.
 *
 * ── Por qué `acentoTexto` va aparte ────────────────────────────────────────
 * Es la regla que más cuesta ver y la que rompe los temas hechos deprisa: un
 * color que brilla sobre el fondo oscuro casi nunca se lee sobre el papel
 * claro. El lila de la casa da 1.8:1 sobre el malva —no cumple ni de lejos—,
 * así que el texto acentuado necesita su propia versión oscurecida. Cada tema
 * trae la suya, comprobada contra su propio papel.
 *
 * Este módulo NO lleva `server-only`: lo leen el layout (servidor) y la vista
 * previa del panel (cliente). Son datos, no secretos.
 */

export interface Tema {
  clave: string
  nombre: string
  nota: string
  /** La sala: el fondo de todo lo que no es papel. */
  fondo: string
  /** Tinta y superficies elevadas. */
  secundario: string
  /** El papel del poema. Siempre claro, incluso en los temas oscuros. */
  primario: string
  /**
   * El texto sobre el fondo del sitio.
   *
   * Va aparte de `primario` desde que existe un tema claro. Antes eran el
   * mismo valor y funcionaba por casualidad: con la sala oscura, el color del
   * papel servía también de texto. En cuanto el fondo se aclara, ese mismo
   * valor se vuelve invisible sobre él.
   */
  texto: string
  /** Resalte sobre fondo oscuro. NO vale para texto sobre papel. */
  terciario: string
  /** Etiquetas y texto secundario. */
  neutro: string
  /** Texto acentuado SOBRE PAPEL. Oscurecido hasta cumplir 4.5:1. */
  acentoTexto: string
  /** Cuál de las familias cargadas usa para titulares y poemas. */
  display: 'playfair' | 'cormorant' | 'garamond' | 'instrument' | 'archivo'
  /** Lo que se lee en el panel. */
  tipografias: string
}

export const TEMAS: Tema[] = [
  {
    clave: 'lila',
    nombre: 'Lila',
    nota: 'el de siempre',
    fondo: '#150C22', secundario: '#2A1B3D', primario: '#F4EEF8',
    texto: '#F4EEF8',
    terciario: '#C9A6E8', neutro: '#8A7E99', acentoTexto: '#7B3FA8',
    display: 'playfair', tipografias: 'Playfair Display · Archivo',
  },
  {
    clave: 'nube-rosa',
    nombre: 'Nube rosa',
    nota: 'el nombre del sitio, hecho color',
    fondo: '#1A0E18', secundario: '#3A1E33', primario: '#FBEEF5',
    texto: '#FBEEF5',
    terciario: '#E8A6C9', neutro: '#9A8090', acentoTexto: '#A8306B',
    display: 'playfair', tipografias: 'Playfair Display · Archivo',
  },
  {
    clave: 'tinta-y-hueso',
    nombre: 'Tinta y hueso',
    nota: 'sobrio, casi sin color',
    fondo: '#0F1116', secundario: '#1E222B', primario: '#F2EFE9',
    texto: '#F2EFE9',
    terciario: '#B9C2D0', neutro: '#7C8493', acentoTexto: '#3D4757',
    display: 'cormorant', tipografias: 'Cormorant Garamond · Archivo',
  },
  {
    clave: 'ocre',
    nombre: 'Ocre',
    nota: 'cálido, de taller',
    fondo: '#191108', secundario: '#33240F', primario: '#F7F0E2',
    texto: '#F7F0E2',
    terciario: '#E0B060', neutro: '#95866B', acentoTexto: '#8A5A12',
    display: 'garamond', tipografias: 'EB Garamond · Archivo',
  },
  {
    clave: 'verdemar',
    nombre: 'Verdemar',
    nota: 'frío y vegetal',
    fondo: '#081614', secundario: '#122E2A', primario: '#EAF5F1',
    texto: '#EAF5F1',
    terciario: '#7FD1B9', neutro: '#77918A', acentoTexto: '#136B52',
    display: 'instrument', tipografias: 'Instrument Serif · Archivo',
  },
  {
    clave: 'indigo',
    nombre: 'Índigo',
    nota: 'nocturno, de mar abierto',
    fondo: '#080D1F', secundario: '#141E42', primario: '#EDF0FB',
    texto: '#EDF0FB',
    terciario: '#8FA8F0', neutro: '#7C86A6', acentoTexto: '#2F45A8',
    display: 'playfair', tipografias: 'Playfair Display · Archivo',
  },
  {
    clave: 'cardenal',
    nombre: 'Cardenal',
    nota: 'el más intenso',
    fondo: '#180809', secundario: '#361214', primario: '#F9EEEE',
    texto: '#F9EEEE',
    terciario: '#E08A8A', neutro: '#9A7B7B', acentoTexto: '#9E2222',
    display: 'garamond', tipografias: 'EB Garamond · Archivo',
  },
  {
    clave: 'grafito',
    nombre: 'Grafito',
    nota: 'neutro del todo; la obra pone el color',
    fondo: '#121212', secundario: '#242424', primario: '#F0F0F0',
    texto: '#F0F0F0',
    terciario: '#B8B8B8', neutro: '#808080', acentoTexto: '#3A3A3A',
    display: 'instrument', tipografias: 'Instrument Serif · Archivo',
  },
  {
    clave: 'papel',
    nombre: 'Papel',
    nota: 'crema y oro viejo, como un pliego impreso',
    /*
     * Tomado del portafolio: crema cálida, tinta parda y oro viejo, con
     * Cormorant Garamond —la misma que usa aquel— para los titulares.
     *
     * Con dos ajustes, y conviene decir por qué. Allí el oro es #B0894F y
     * decora: bordes, filetes, marcas pequeñas. Aquí ese mismo color hace de
     * botón y de resalte, y sobre la crema da 2.8:1 — por debajo del 3.0 que
     * necesita un elemento con el que se interactúa. Se oscurece a 3.7:1
     * conservando el tono, y el acento de texto baja aún más porque leer pide
     * 4.5:1. El neutro sube de 3.8 a 4.5 por lo mismo.
     *
     * Es el ÚNICO tema con el fondo claro, y por eso el único donde `texto` no
     * es el papel sino la tinta.
     */
    fondo: '#F5EFE4', secundario: '#33281F', primario: '#F7F2E9',
    texto: '#33281F',
    terciario: '#9A7433', neutro: '#7E6A54', acentoTexto: '#7F5D24',
    display: 'cormorant', tipografias: 'Cormorant Garamond · Archivo',
  },
  {
    clave: 'sin-serifa',
    nombre: 'Sin serifa',
    nota: 'contemporáneo; una sola familia',
    fondo: '#101014', secundario: '#1F1F26', primario: '#F4F4F7',
    texto: '#F4F4F7',
    terciario: '#A8A0F0', neutro: '#82828F', acentoTexto: '#4A3FB0',
    display: 'archivo', tipografias: 'Archivo, en dos pesos',
  },
]

export const TEMA_POR_DEFECTO = 'lila'

export function buscarTema(clave: string | null | undefined): Tema {
  return TEMAS.find((t) => t.clave === clave) ?? TEMAS[0]
}

/**
 * Las declaraciones CSS de un tema, para inyectarlas en `:root`.
 *
 * Se escriben en un `<style>` del layout y no en `globals.css` porque el tema
 * se elige en la base de datos: el CSS es el mismo para todos y lo que cambia
 * son estos cinco valores.
 *
 * `--tipo-display` se apunta a la variable de la familia elegida, que el layout
 * ya ha declarado con `next/font`. Así la tipografía cambia con el tema sin que
 * ninguna regla de estilo se entere.
 */
export function cssDelTema(tema: Tema): string {
  return `:root{
  --fondo:${tema.fondo};
  --secundario:${tema.secundario};
  --primario:${tema.primario};
  --texto:${tema.texto};
  --terciario:${tema.terciario};
  --neutro:${tema.neutro};
  --tinta-acento:${tema.acentoTexto};
  --acento:${tema.terciario};
  --acento-texto:${tema.acentoTexto};
  --tipo-display:var(--fuente-${tema.display});
}`
}
