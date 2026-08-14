import Link from 'next/link'
import { colorDelPoemario } from '@/lib/color'
import { lemaDe, type Poemario } from '@/lib/poemarios'

/**
 * La ficha de un poemario: portada grande a la izquierda, capítulos a la
 * derecha. Es el paso entre la vitrina y la lectura.
 *
 * La lista de capítulos es la misma pieza que usa el panel —`ListaCapitulos`,
 * abajo—, con otro destino en cada enlace. Se comparte a propósito: cuando el
 * poeta ordena sus capítulos en el panel, lo que ve es exactamente lo que verá
 * el visitante, no una aproximación.
 *
 * Es un componente de servidor: aquí no hay estado ni eventos, solo enlaces.
 */
export function FichaPoemario({ poemario }: { poemario: Poemario }) {
  const { categoria, capitulos, cuantosPoemas, portadaUrl } = poemario

  return (
    <div className="ficha-poemario" style={colorDelPoemario(categoria.colorAcento)}>
      <section className="ficha-portada">
        {portadaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portadaUrl} alt="" className="ficha-fondo" aria-hidden="true" />
        )}
        <div className="ficha-texto">
          <h1>{categoria.nombre}</h1>
          <p className="ficha-lema">{lemaDe(poemario)}</p>
          {categoria.descripcion && <p className="ficha-descripcion">{categoria.descripcion}</p>}
          <p className="ficha-cifras">
            {capitulos.length} {capitulos.length === 1 ? 'capítulo' : 'capítulos'} ·{' '}
            {cuantosPoemas} {cuantosPoemas === 1 ? 'poema' : 'poemas'}
          </p>
        </div>
        {capitulos[0] && (
          <Link className="ficha-abrir" href={`/${capitulos[0].slug}`}>
            Empezar a leer
          </Link>
        )}
      </section>

      {/*
       * Los capítulos, en dos alturas: la tira para encontrarlos por su portada
       * —que es como se reconocen, porque llevan su número dibujado— y la lista
       * para recorrerlos con el título entero delante.
       *
       * Es la misma disposición que el panel, y eso importa: el poeta ordena
       * los capítulos viendo exactamente lo que va a ver quien lea. Antes esta
       * página los apilaba en una columna estrecha a la derecha, con los
       * títulos recortados y media pantalla en blanco a partir del sexto.
       */}
      <section className="ficha-capitulos">
        <header>
          <h2>Capítulos</h2>
          <span className="et">{capitulos.length}</span>
        </header>

        {capitulos.length === 0 ? (
          <div className="recuadro">
            <p>Este poemario todavía no tiene capítulos.</p>
          </div>
        ) : (
          <>
            <div className="tira-portadas" aria-label="Capítulos por su portada">
              {capitulos.map((c) => (
                <Link key={c.id} className="portada-cap" href={`/${c.slug}`}>
                  <span className="tapa">
                    {c.portadaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.portadaUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="sin-portada">{c.orden + 1}</span>
                    )}
                  </span>
                  <b>{c.titulo}</b>
                </Link>
              ))}
            </div>

            <ol className="indice-capitulos">
              {capitulos.map((c) => {
                const n = c.poemas.filter((p) => p.publicado).length
                return (
                  <li key={c.id}>
                    <Link href={`/${c.slug}`}>
                      <span className="num">{String(c.orden + 1).padStart(2, '0')}</span>
                      <span className="titulo">{c.titulo}</span>
                      <span className="cuantos">
                        {n} {n === 1 ? 'poema' : 'poemas'}
                      </span>
                      <span className="ir" aria-hidden="true">
                        Leer →
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </section>
    </div>
  )
}
