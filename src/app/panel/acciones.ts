'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { exigirSesion, signIn, signOut } from '@/auth'
import * as panel from '@/lib/db/panel'
import { aCuerpo, aEstrofas } from '@/lib/texto'

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

/** Refresca lo que el visitante ve. Se llama tras cada cambio publicable. */
function refrescarSitio(libroSlug?: string, poemaSlug?: string) {
  revalidatePath('/')
  if (libroSlug) {
    revalidatePath(`/${libroSlug}`)
    if (poemaSlug) revalidatePath(`/${libroSlug}/${poemaSlug}`)
  }
  revalidatePath('/panel')
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
      const sinConfigurar = (error as { code?: string }).code === 'sin-configurar'
      return {
        error: sinConfigurar
          ? 'El panel no tiene configuradas sus variables. Si acabas de cambiarlas: en local reinicia el servidor, y en Vercel vuelve a desplegar — las variables no se aplican a un despliegue ya hecho.'
          : 'Usuario o clave incorrectos.',
        usuario,
      }
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
    portadaUrl: textoONulo(datos, 'portadaUrl'),
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

  const campos = {
    nombre,
    descripcion: textoONulo(datos, 'descripcion'),
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
