import Link from 'next/link'
import { traerTema } from '@/lib/db/panel'
import { TEMAS, TEMA_POR_DEFECTO } from '@/lib/temas'
import { guardarTema } from '../../acciones'

export const dynamic = 'force-dynamic'

/**
 * Los ajustes del sitio. Hoy, el tema.
 *
 * Cada tema se enseña APLICADO —la plancha, el poema sobre papel y la barra—
 * en vez de como una fila de cuadrados de color: una paleta suelta no dice cómo
 * va a quedar un poema encima, que es lo único que importa aquí.
 */
export default async function PaginaAjustes() {
  const actual = (await traerTema()) ?? TEMA_POR_DEFECTO

  return (
    <>
      <p className="miga">
        <Link href="/panel">Inicio del panel</Link> › Ajustes
      </p>
      <h1>Tema del sitio</h1>
      <p className="sub">
        Un tema son cinco colores y una tipografía de titulares. Cambia el sitio entero
        —portada, lector y panel— en cuanto lo guardas. Nada del contenido se toca.
      </p>

      <div className="rejilla-temas">
        {TEMAS.map((tema) => {
          const elegido = tema.clave === actual
          return (
            <form action={guardarTema} key={tema.clave} className={elegido ? 'elegido' : ''}>
              <input type="hidden" name="tema" value={tema.clave} />
              <button
                type="submit"
                className="tarjeta-tema"
                style={
                  {
                    '--t-fondo': tema.fondo,
                    '--t-secundario': tema.secundario,
                    '--t-primario': tema.primario,
                    '--t-terciario': tema.terciario,
                    '--t-neutro': tema.neutro,
                    '--t-acento': tema.acentoTexto,
                  } as React.CSSProperties
                }
                aria-pressed={elegido}
              >
                <span className="tt-cabeza">
                  <b>{tema.nombre}</b>
                  <em>{tema.nota}</em>
                  {elegido && <span className="tt-marca">En uso</span>}
                </span>

                {/* La misma muestra que en la propuesta: plancha, papel y barra. */}
                <span className="tt-muestra">
                  <span className="tt-plancha">❧</span>
                  <span className="tt-papel">
                    <span className="tt-et">Pentapoema</span>
                    <span className="tt-titulo">Púrpura letanía</span>
                    <span className="tt-verso">Invocación sagrada sin fe no salva ni cura</span>
                    <span className="tt-verso">confinadas aquellas fábulas para dormir</span>
                  </span>
                </span>

                <span className="tt-barra">
                  <span className="tt-pastilla">Narrar</span>
                  <span className="tt-cta">Leer</span>
                </span>

                <span className="tt-tipos">{tema.tipografias}</span>
              </button>
            </form>
          )
        })}
      </div>
    </>
  )
}
