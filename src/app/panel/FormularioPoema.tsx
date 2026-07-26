import { guardarPoema, eliminarPoema, guardarPlancha, eliminarPlancha } from './acciones'
import { repartirEstrofas } from '@/lib/paginar'
import { construirFrases, aSSML, hashSSML, type Frase } from '@/lib/voz/prosodia'
import { aCuerpo } from '@/lib/texto'
import type { Libro, Poema } from '@/lib/tipos'

/**
 * Editor de poema.
 *
 * Además de los campos, enseña dos cosas que el poeta no puede adivinar de otro
 * modo y que decide el servidor:
 *   · en cuántos pliegos va a caer el poema y por dónde se corta;
 *   · dónde va a callar la voz al leerlo.
 * Las dos se calculan con las MISMAS funciones que usa el sitio, así que lo que
 * se ve aquí es lo que va a pasar de verdad.
 */
export function FormularioPoema({ libro, poema }: { libro: Libro; poema?: Poema }) {
  const cuerpo = poema ? aCuerpo(poema.estrofas) : ''

  return (
    <>
      <form action={guardarPoema} className="form">
        {poema && <input type="hidden" name="id" value={poema.id} />}
        {poema && <input type="hidden" name="slug" value={poema.slug} />}
        <input type="hidden" name="libroId" value={libro.id} />
        <input type="hidden" name="libroSlug" value={libro.slug} />

        <div className="fila">
          <div className="campo">
            <label htmlFor="titulo">Título</label>
            <input id="titulo" name="titulo" type="text" defaultValue={poema?.titulo} required />
          </div>
          <div className="campo">
            <label htmlFor="forma">Forma</label>
            <input
              id="forma"
              name="forma"
              type="text"
              defaultValue={poema?.forma ?? 'pentapoema'}
            />
            <span className="pista">Se imprime en versalitas sobre el título.</span>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="cuerpo">Versos</label>
          <textarea
            id="cuerpo"
            name="cuerpo"
            className="versos"
            defaultValue={cuerpo}
            required
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <span className="pista">
            Un verso por línea. <strong>Una línea en blanco separa estrofas</strong>, y el
            corte de página cae siempre entre ellas — nunca dentro. Los espacios se
            respetan tal cual: nada los normaliza.
            <br />
            Para ajustar la lectura en voz alta a mano: <code>/</code> al final de un verso
            marca una pausa breve y <code>//</code> una larga. No se imprimen.
          </span>
        </div>

        <div className="fila">
          <div className="campo">
            <label htmlFor="dedicatoria">Dedicatoria</label>
            <input
              id="dedicatoria"
              name="dedicatoria"
              type="text"
              defaultValue={poema?.dedicatoria ?? ''}
            />
            <span className="pista">Se ve, pero no se lee en voz alta.</span>
          </div>
          <div className="campo">
            <label htmlFor="anio">Año</label>
            <input id="anio" name="anio" type="number" defaultValue={poema?.anio ?? ''} />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="notaAutor">Nota del autor</label>
          <textarea
            id="notaAutor"
            name="notaAutor"
            defaultValue={poema?.notaAutor ?? ''}
            rows={2}
          />
          <span className="pista">Tampoco se lee en voz alta.</span>
        </div>

        <div className="campo">
          <label htmlFor="temas">Temas</label>
          <input
            id="temas"
            name="temas"
            type="text"
            defaultValue={poema?.temas.join(', ') ?? ''}
            placeholder="noche, memoria, mar"
          />
          <span className="pista">
            Separados por comas. Entran en la búsqueda y se ven al pie del poema.
          </span>
        </div>

        <div className="campo interruptor">
          <input
            id="publicado"
            name="publicado"
            type="checkbox"
            defaultChecked={poema?.publicado ?? false}
          />
          <label htmlFor="publicado">Visible en el sitio</label>
        </div>

        <div className="acciones-form">
          <button className="bt fuerte" type="submit">
            Guardar
          </button>
          {poema?.publicado && libro.publicado && (
            <a
              className="bt"
              href={`/${libro.slug}/${poema.slug}`}
              target="_blank"
              rel="noopener"
            >
              Ver en el sitio ↗
            </a>
          )}
        </div>
      </form>

      {poema && <Previsiones poema={poema} />}
      {poema && <Planchas libro={libro} poema={poema} />}

      {poema && (
        <form action={eliminarPoema} className="acciones-form" style={{ marginTop: '2.5rem' }}>
          <input type="hidden" name="id" value={poema.id} />
          <input type="hidden" name="libroSlug" value={libro.slug} />
          <button className="bt peligro" type="submit">
            Borrar el poema
          </button>
        </form>
      )}
    </>
  )
}

/** Cómo va a quedar maquetado y cómo se va a leer. */
function Previsiones({ poema }: { poema: Poema }) {
  const grupos = repartirEstrofas(poema)
  const frases: Frase[] = construirFrases(poema.estrofas, {
    titulo: poema.titulo,
    incluirTitulo: true,
  })
  const ssml = aSSML(frases)
  const versos = poema.estrofas.reduce((n, e) => n + e.length, 0)
  // Un verso encabalgado es el que NO cierra su emisión: va unido al siguiente.
  const encabalgamientos = frases.reduce((n, f) => n + Math.max(0, f.versos.length - 1), 0)

  return (
    <section style={{ marginTop: '2.6rem' }}>
      <h2>Cómo va a quedar</h2>

      <div className="recuadro">
        <p style={{ marginBottom: '.8rem' }}>
          <strong>
            {grupos.length === 1
              ? 'Cabe entero en un pliego.'
              : `Ocupa ${grupos.length} pliegos.`}
          </strong>{' '}
          El corte cae siempre entre estrofas.
        </p>
        <div className="pliegos-previa">
          {grupos.map((g, i) => {
            const versos = poema.estrofas
              .slice(g.rango[0], g.rango[1] + 1)
              .reduce((n, e) => n + e.length, 0)
            const primero = poema.estrofas[g.rango[0]]?.[0] ?? ''
            return (
              <div className="linea" key={i}>
                <span className="n">Pliego {i + 1}</span>
                <span>
                  «{primero.slice(0, 46)}
                  {primero.length > 46 ? '…' : ''}» · {versos} versos
                </span>
                <span className="dens">
                  {g.densidad === 'normal' ? 'holgado' : g.densidad.replace('-', ' ')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="recuadro">
        <p style={{ marginBottom: '.6rem' }}>
          <strong>Lectura en voz alta.</strong> {versos} versos se dicen en{' '}
          {frases.filter((f) => !f.esTitulo).length}{' '}
          {frases.filter((f) => !f.esTitulo).length === 1 ? 'tirada' : 'tiradas'}, porque
          hay {encabalgamientos}{' '}
          {encabalgamientos === 1 ? 'encabalgamiento' : 'encabalgamientos'}: versos que no
          cierran con puntuación y se leen de corrido con el siguiente, sin pausa. La
          dedicatoria y la nota del autor no entran.
        </p>
        <div className="pliegos-previa" style={{ marginBottom: '.8rem' }}>
          {frases
            .filter((f) => !f.esTitulo)
            .map((f, i) => (
              <div className="linea" key={i}>
                <span className="n">Tirada {i + 1}</span>
                <span>
                  «{f.texto.slice(0, 70)}
                  {f.texto.length > 70 ? '…' : ''}»
                </span>
                <span className="dens">{f.pausaMs} ms</span>
              </div>
            ))}
        </div>
        <p className="pista" style={{ fontSize: '.72rem' }}>
          Huella del SSML: <code>{hashSSML(ssml)}</code>. Cuando cambies un verso, cambia la
          huella y el audio guardado queda marcado como viejo.
        </p>
        <details style={{ marginTop: '.8rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '.8rem', color: '#a49f99' }}>
            Ver el SSML que se enviará al proveedor de voz
          </summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{ssml}</pre>
        </details>
      </div>
    </section>
  )
}

/** Alta y edición de las planchas del poema. */
function Planchas({ libro, poema }: { libro: Libro; poema: Poema }) {
  return (
    <section style={{ marginTop: '2.6rem' }}>
      <h2>Planchas</h2>
      <p className="sub" style={{ marginBottom: '1.2rem' }}>
        La obra que acompaña al poema, en la página izquierda del pliego. Sin ninguna, se
        pinta un motivo generado con el color del volumen.
      </p>

      <div className="tarjetas" style={{ marginBottom: '1.4rem' }}>
        {poema.planchas.map((p) => (
          <article className="tarjeta" key={p.id}>
            <div className="principal">
              <span className="titulo">{p.titulo}</span>
              <div className="meta">
                {p.numero} · {p.tecnica} · {p.url ? 'con imagen' : 'sin imagen'}
              </div>
            </div>
            <form action={eliminarPlancha}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="libroSlug" value={libro.slug} />
              <input type="hidden" name="poemaSlug" value={poema.slug} />
              <button className="bt menudo peligro" type="submit">
                Quitar
              </button>
            </form>
          </article>
        ))}
      </div>

      <form action={guardarPlancha} className="form">
        <input type="hidden" name="poemaId" value={poema.id} />
        <input type="hidden" name="libroSlug" value={libro.slug} />
        <input type="hidden" name="poemaSlug" value={poema.slug} />
        <input type="hidden" name="orden" value={poema.planchas.length} />

        <div className="fila">
          <div className="campo">
            <label htmlFor="pl-numero">Número</label>
            <input id="pl-numero" name="numero" type="text" placeholder="Plancha I" />
          </div>
          <div className="campo">
            <label htmlFor="pl-titulo">Título de la obra</label>
            <input id="pl-titulo" name="titulo" type="text" />
          </div>
        </div>
        <div className="fila">
          <div className="campo">
            <label htmlFor="pl-tecnica">Técnica</label>
            <input
              id="pl-tecnica"
              name="tecnica"
              type="text"
              placeholder="óleo sobre lienzo, 120 × 90"
            />
          </div>
          <div className="campo">
            <label htmlFor="pl-url">Imagen</label>
            <input id="pl-url" name="url" type="text" placeholder="/planchas/mi-obra.jpg" />
            <span className="pista">
              Ruta dentro de <code>public/</code> o dirección completa.
            </span>
          </div>
        </div>
        <div className="acciones-form">
          <button className="bt" type="submit">
            Añadir plancha
          </button>
        </div>
      </form>
    </section>
  )
}
