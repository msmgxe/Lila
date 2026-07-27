'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { exigirSesion, signIn, signOut } from '@/auth'
import * as panel from '@/lib/db/panel'
import { aCuerpo, aEstrofas } from '@/lib/texto'
import { esColorValido } from '@/lib/color'

/**
 * Acciones del panel.
 *
 * **Cada una comprueba la sesión por su cuenta.** El layout de /panel también
 * redirige a quien no ha entrado, pero eso solo protege la vista: una Server
 * Action es un endpoint POST con su propia dirección, y se puede invocar sin
 * pasar por ninguna página. Confiar en el layout sería dejar la puerta abierta.
 */

async function autorizar() {
  await exigirSesion()
}

/**
 * Refresca lo que el visitante ve. Se llama tras cada cambio publicable.
 *
 * ── Por qué se revalida el layout entero y no ruta por ruta ─────────────────
 * Antes esto listaba las rutas a mano: `/`, el capítulo y el poema. Funcionaba
 * hasta que apareció `/poemario/[slug]`, que no estaba en la lista — y como
 * todas las páginas públicas llevan `revalidate = 3600`, subir una portada
 * desde el panel se veía al momento en el panel y tardaba UNA HORA en salir en
 * el sitio. El síntoma desde fuera: «hago los cambios y no se refresca».
 *
 * El problema de fondo es que la lista hay que acordarse de ampliarla cada vez
 * que nace una ruta, y olvidarse no rompe nada de forma visible: solo deja el
 * sitio desfasado un rato. Es el peor tipo de fallo.
 *
 * `revalidatePath('/', 'layout')` invalida TODO lo que cuelga del layout raíz.
 * Es un mazazo, y aquí es el correcto: son unas decenas de páginas, las escribe
 * una sola persona y los cambios son contados. El coste de regenerarlas de más
 * no se acerca al de que la obra se vea vieja.
 */
function refrescarSitio(libroSlug?: string, poemaSlug?: string) {
  revalidatePath('/', 'layout')

  // Y además las concretas: `layout` cubre las rutas ya generadas, pero estas
  // dos son dinámicas y conviene nombrarlas para que caigan seguro.
  if (libroSlug) {
    revalidatePath(`/${libroSlug}`)
    if (poemaSlug) revalidatePath(`/${libroSlug}/${poemaSlug}`)
  }
}

/* ─────────────────────────────── sesión ─────────────────────────────────── */

export interface EstadoEntrada {
  error: string
  /** Se devuelve para no obligar a reescribir el usuario tras un fallo. */
  usuario: string
}

export async function entrar(
  _estado: EstadoEntrada | undefined,
  datos: FormData,
): Promise<EstadoEntrada | undefined> {
  const usuario = String(datos.get('usuario') ?? '')
  try {
    await signIn('credentials', {
      usuario,
      clave: datos.get('clave'),
      redirectTo: '/panel',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      // `code` llega desde `CredentialsSignin` en auth.ts.
      const codigo = (error as { code?: string }).code
      const motivos: Record<string, string> = {
        'sin-configurar':
          'El panel no tiene configuradas sus variables. Si acabas de cambiarlas: ' +
          'en local reinicia el servidor, y en Vercel vuelve a desplegar — las ' +
          'variables no se aplican a un despliegue que ya estaba hecho.',
        'hash-invalido':
          'ADMIN_CLAVE_HASH no contiene un hash válido, así que ninguna clave puede ' +
          'funcionar. Tiene que ser «sal:hash» en hexadecimal, 161 caracteres, tal y ' +
          'como lo imprime «npm run panel:clave» — no tu clave escrita directamente, ' +
          'y sin comillas alrededor.',
      }
      return { error: motivos[codigo ?? ''] ?? 'Usuario o clave incorrectos.', usuario }
    }
    // signIn lanza un redirect por diseño; hay que dejarlo pasar.
    throw error
  }
}

export async function salir() {
  await signOut({ redirectTo: '/panel/entrar' })
}

/* ─────────────────────────────── volúmenes ──────────────────────────────── */

function texto(datos: FormData, campo: string): string {
  return String(datos.get(campo) ?? '').trim()
}
function textoONulo(datos: FormData, campo: string): string | null {
  const v = texto(datos, campo)
  return v.length > 0 ? v : null
}
function numeroONulo(datos: FormData, campo: string): number | null {
  const v = texto(datos, campo)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function guardarLibro(datos: FormData) {
  await autorizar()
  const id = texto(datos, 'id')
  const titulo = texto(datos, 'titulo')
  if (!titulo) throw new Error('El volumen necesita un título.')

  const campos = {
    volumen: texto(datos, 'volumen') || titulo,
    titulo,
    subtitulo: textoONulo(datos, 'subtitulo'),
    descripcion: textoONulo(datos, 'descripcion'),
    categoriaId: textoONulo(datos, 'categoriaId'),
    orden: numeroONulo(datos, 'orden') ?? 0,
    colorAcento: textoONulo(datos, 'colorAcento'),
    portadaUrl: direccionDeImagen(datos, 'portadaUrl'),
    anio: numeroONulo(datos, 'anio'),
    paginaBase: numeroONulo(datos, 'paginaBase') ?? 1,
    publicado: datos.get('publicado') === 'on',
  }

  let slug: string
  if (id) {
    slug = texto(datos, 'slug') || (await panel.slugLibreLibro(titulo, id))
    await panel.actualizarLibro(id, { ...campos, slug })
  } else {
    slug = await panel.slugLibreLibro(titulo)
    await panel.crearLibro({ ...campos, slug })
  }

  refrescarSitio(slug)
  redirect(`/panel/libro/${slug}`)
}

export async function alternarLibro(datos: FormData) {
  await autorizar()
  await panel.alternarPublicacionLibro(texto(datos, 'id'))
  refrescarSitio(texto(datos, 'slug'))
}

export async function eliminarLibro(datos: FormData) {
  await autorizar()
  await panel.borrarLibro(texto(datos, 'id'))
  refrescarSitio()
  redirect('/panel')
}

/* ─────────────────────────────── poemas ─────────────────────────────────── */

export async function guardarPoema(datos: FormData) {
  await autorizar()
  const id = texto(datos, 'id')
  const libroId = texto(datos, 'libroId')
  const libroSlug = texto(datos, 'libroSlug')
  const titulo = texto(datos, 'titulo')
  const cuerpoCrudo = String(datos.get('cuerpo') ?? '')

  if (!titulo) throw new Error('El poema necesita un título.')
  if (!cuerpoCrudo.trim()) throw new Error('El poema no puede quedarse sin versos.')

  // Ida y vuelta por el mismo par de funciones que usa el sitio: así lo que se
  // guarda es exactamente lo que se va a leer, con sus estrofas intactas.
  const cuerpo = aCuerpo(aEstrofas(cuerpoCrudo))

  const campos = {
    libroId,
    titulo,
    cuerpo,
    forma: texto(datos, 'forma') || 'verso libre',
    dedicatoria: textoONulo(datos, 'dedicatoria'),
    notaAutor: textoONulo(datos, 'notaAutor'),
    anio: numeroONulo(datos, 'anio'),
    temas: texto(datos, 'temas')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    publicado: datos.get('publicado') === 'on',
  }

  let slug: string
  if (id) {
    slug = texto(datos, 'slug') || (await panel.slugLibre(libroId, titulo, id))
    await panel.actualizarPoema(id, { ...campos, slug })
  } else {
    slug = await panel.slugLibre(libroId, titulo)
    await panel.crearPoema({
      ...campos,
      slug,
      orden: await panel.siguienteOrden(libroId),
    })
  }

  refrescarSitio(libroSlug, slug)
  redirect(`/panel/libro/${libroSlug}/${slug}`)
}

export async function alternarPoema(datos: FormData) {
  await autorizar()
  await panel.alternarPublicacionPoema(texto(datos, 'id'))
  refrescarSitio(texto(datos, 'libroSlug'), texto(datos, 'slug'))
}

export async function eliminarPoema(datos: FormData) {
  await autorizar()
  const libroSlug = texto(datos, 'libroSlug')
  await panel.borrarPoema(texto(datos, 'id'))
  refrescarSitio(libroSlug)
  redirect(`/panel/libro/${libroSlug}`)
}

export async function moverPoema(datos: FormData) {
  await autorizar()
  const direccion = texto(datos, 'direccion') === 'arriba' ? -1 : 1
  await panel.moverPoema(texto(datos, 'id'), direccion)
  refrescarSitio(texto(datos, 'libroSlug'))
}

/* ─────────────────────────────── planchas ───────────────────────────────── */

export async function guardarPlancha(datos: FormData) {
  await autorizar()
  const id = textoONulo(datos, 'id')
  await panel.guardarPlancha(
    {
      poemaId: texto(datos, 'poemaId'),
      numero: texto(datos, 'numero') || 'Plancha',
      titulo: texto(datos, 'titulo') || 'Sin título',
      tecnica: texto(datos, 'tecnica') || 'técnica no indicada',
      url: textoONulo(datos, 'url'),
      promptGeneracion: textoONulo(datos, 'promptGeneracion'),
      orden: numeroONulo(datos, 'orden') ?? 0,
    },
    id ?? undefined,
  )
  refrescarSitio(texto(datos, 'libroSlug'), texto(datos, 'poemaSlug'))
}

export async function eliminarPlancha(datos: FormData) {
  await autorizar()
  await panel.borrarPlancha(texto(datos, 'id'))
  refrescarSitio(texto(datos, 'libroSlug'), texto(datos, 'poemaSlug'))
}

/* ────────────────────────────── poemarios ───────────────────────────────── */

export async function guardarCategoria(datos: FormData) {
  await autorizar()
  const id = texto(datos, 'id')
  const nombre = texto(datos, 'nombre')
  if (!nombre) throw new Error('El poemario necesita un nombre.')

  // Un color mal escrito se descarta en vez de guardarse: acabaría en el
  // `style` del contenedor y dejaría la sección entera sin teñir o rota. Sin
  // color válido manda la paleta Lila, que es el comportamiento de siempre.
  const color = textoONulo(datos, 'colorAcento')

  const campos = {
    nombre,
    lema: textoONulo(datos, 'lema'),
    descripcion: textoONulo(datos, 'descripcion'),
    portadaUrl: textoONulo(datos, 'portadaUrl'),
    colorAcento: esColorValido(color) ? color : null,
    orden: numeroONulo(datos, 'orden') ?? 0,
    visible: datos.get('visible') === 'on',
  }

  if (id) {
    await panel.actualizarCategoria(id, campos)
  } else {
    await panel.crearCategoria({ ...campos, slug: await panel.slugLibreCategoria(nombre) })
  }
  refrescarSitio()
  revalidatePath('/panel/poemarios')
  redirect('/panel/poemarios')
}

/** Enseña u oculta el poemario entero, con todos sus capítulos. */
export async function alternarCategoria(datos: FormData) {
  await autorizar()
  await panel.alternarVisibilidadCategoria(texto(datos, 'id'))
  refrescarSitio()
  revalidatePath('/panel/poemarios')
}

export async function eliminarCategoria(datos: FormData) {
  await autorizar()
  // Los capítulos NO se borran: se quedan sin poemario asignado.
  await panel.borrarCategoria(texto(datos, 'id'))
  refrescarSitio()
  revalidatePath('/panel/poemarios')
  redirect('/panel/poemarios')
}

/* ─────────────────── subir un capítulo desde un Word ────────────────────── */

export interface EstadoImportacion {
  error?: string
  aviso?: string[]
  /** Qué se hizo con cada poema, para enseñarlo tras guardar. */
  altas?: string[]
  ediciones?: string[]
  intactos?: string[]
  portada?: string
}

/** Word rara vez pasa de unos cientos de kB; el tope corta un envío absurdo. */
const TOPE_DOCX = 4 * 1024 * 1024
const TOPE_IMAGEN = 6 * 1024 * 1024
const IMAGENES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Lee un .docx y vuelca sus poemas en un capítulo. Opcionalmente, su portada.
 *
 * Las dos cosas van en la misma acción porque van en el mismo formulario: el
 * poeta sube el capítulo entero de una vez. Cada una puede ir sola.
 *
 * Nada de esto borra poemas — ver `importarCapitulo`—, así que equivocarse de
 * documento se arregla subiendo el bueno.
 */
export async function subirCapitulo(
  _previo: EstadoImportacion | undefined,
  datos: FormData,
): Promise<EstadoImportacion> {
  await autorizar()

  const libroId = String(datos.get('libroId') ?? '')
  const slug = String(datos.get('slug') ?? '')
  if (!libroId || !slug) return { error: 'Falta el capítulo al que subir.' }

  const documento = datos.get('documento')
  const imagen = datos.get('portada')
  const hayDocumento = documento instanceof File && documento.size > 0
  const hayImagen = imagen instanceof File && imagen.size > 0

  if (!hayDocumento && !hayImagen) {
    return { error: 'Elige un documento de Word, una imagen, o las dos cosas.' }
  }

  const estado: EstadoImportacion = {}

  if (hayDocumento) {
    const archivo = documento as File
    if (archivo.size > TOPE_DOCX) {
      return { error: `El documento pesa demasiado (máximo ${TOPE_DOCX / 1024 / 1024} MB).` }
    }
    if (!archivo.name.toLowerCase().endsWith('.docx')) {
      return {
        error:
          'El archivo debe ser .docx. Si el tuyo es .doc, ábrelo en Word y usa ' +
          '«Guardar como» → «Documento de Word (.docx)».',
      }
    }

    let leidos
    try {
      const bytes = new Uint8Array(await archivo.arrayBuffer())
      const { leerDocx, revisarForma } = await import('@/lib/docx')
      const lectura = leerDocx(bytes)
      leidos = lectura.poemas
      estado.aviso = [...lectura.avisos, ...revisarForma(lectura.poemas)]
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se ha podido leer.' }
    }

    try {
      const resumen = await panel.importarCapitulo(libroId, leidos)
      estado.altas = resumen.altas
      estado.ediciones = resumen.ediciones
      estado.intactos = resumen.intactos
    } catch (error) {
      return { error: explicar(error, 'guardar los poemas') }
    }
  }

  if (hayImagen) {
    const archivo = imagen as File
    if (archivo.size > TOPE_IMAGEN) {
      return {
        ...estado,
        error: `La imagen pesa demasiado (máximo ${TOPE_IMAGEN / 1024 / 1024} MB).`,
      }
    }
    if (!IMAGENES.includes(archivo.type)) {
      return { ...estado, error: 'La imagen debe ser JPG, PNG, WebP o AVIF.' }
    }
    const bytes = Buffer.from(await archivo.arrayBuffer())
    try {
      await panel.guardarPortada(libroId, slug, archivo.type, bytes)
    } catch (error) {
      return { ...estado, error: explicar(error, 'guardar la portada') }
    }
    estado.portada = `${archivo.name} · ${(bytes.length / 1024).toFixed(0)} kB`
  }

  refrescarSitio(slug)
  // `libro`, en singular: la carpeta es (privado)/libro/[slug]. Con `libros`
  // esto revalidaba una ruta que no existe — no falla, simplemente no hace
  // nada, que es la clase de error que sobrevive meses.
  revalidatePath(`/panel/libro/${slug}`)
  revalidatePath('/panel')
  return estado
}

/**
 * Traduce un error de base de datos a algo que se pueda leer y arreglar.
 *
 * Dos casos merecen mensaje propio porque tienen solución concreta y el error
 * en crudo no la insinúa: la tabla `portadas` es de una migración posterior a
 * la puesta en marcha, y la conexión puede no estar configurada.
 */
function explicar(error: unknown, haciendo: string): string {
  const texto = error instanceof Error ? error.message : String(error)

  if (/relation .*portadas.* does not exist/i.test(texto)) {
    return (
      'Falta aplicar la última migración de la base de datos: la tabla de portadas ' +
      'todavía no existe. Ejecuta «npm run db:migrar» con DATABASE_URL configurada.'
    )
  }
  if (/DATABASE_URL|no hay conexión/i.test(texto)) {
    return 'No hay conexión con la base de datos. Revisa DATABASE_URL.'
  }
  return `No se ha podido ${haciendo}: ${texto}`
}

/**
 * Una dirección de imagen, o un error que explique por qué no lo es.
 *
 * Guardar «cap03.jpeg» tal cual parecía inofensivo y no lo era: el navegador lo
 * resuelve contra la página actual, así que el capítulo acababa apuntando a
 * `/panel/libro/cap03.jpeg`, que no existe. No fallaba nada — simplemente la
 * portada no salía en ningún sitio, y desde fuera eso se lee como «la subida no
 * funciona».
 *
 * Escribir un nombre de archivo ahí es lo natural cuando uno acaba de elegir
 * ese archivo dos campos más arriba. Así que en vez de aceptarlo en silencio,
 * se para y se dice qué hacer.
 */
function direccionDeImagen(datos: FormData, campo: string): string | null {
  const valor = textoONulo(datos, campo)
  if (!valor) return null
  if (valor.startsWith('/') || /^https?:\/\//i.test(valor)) return valor

  throw new Error(
    `«${valor}» no es una dirección, es un nombre de archivo, y así el capítulo se ` +
      'queda sin imagen. Para poner una portada usa «Subir al capítulo» ahí arriba: ' +
      'elige la imagen y pulsa el botón, y este campo se rellena solo. Si la imagen ' +
      'ya está en otro sitio, pega su dirección completa (empieza por / o por https://).',
  )
}
