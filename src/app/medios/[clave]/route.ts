import { NextResponse } from 'next/server'
import { leerMedio } from '@/lib/db/panel'

/**
 * Sirve una imagen suelta de la tabla `medios` — hoy, el retrato del autor.
 * Gemela de `/portadas/[slug]`, y con la misma caché de un año: la dirección
 * lleva `?v=<marca de tiempo>`, así que `immutable` es seguro.
 */
export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ clave: string }> },
) {
  const { clave } = await params

  let medio
  try {
    medio = await leerMedio(clave)
  } catch {
    return new NextResponse(null, { status: 404 })
  }
  if (!medio) return new NextResponse(null, { status: 404 })

  const etag = `"${medio.actualizadoEn.getTime().toString(36)}"`
  if (peticion.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }

  return new NextResponse(new Uint8Array(medio.bytes), {
    headers: {
      'Content-Type': medio.mime,
      'Content-Length': String(medio.bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    },
  })
}
