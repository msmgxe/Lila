import { NextResponse } from 'next/server'
import { leerPortada } from '@/lib/db/panel'

/**
 * Sirve la portada de un capítulo desde la base de datos.
 *
 * Es la contrapartida de la tabla `portadas`: ahí están los bytes, aquí salen.
 * Toda la razón por la que guardarlos en Postgres no cuesta caro está en esta
 * cabecera de caché — el CDN de Vercel pide cada imagen una vez por región y no
 * vuelve, así que Neon ve un puñado de consultas al día, no una por visita.
 *
 * `immutable` es seguro porque la dirección lleva `?v=<marca de tiempo>`, que
 * `guardarPortada` cambia cada vez que se sube una imagen nueva.
 */
export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  let portada
  try {
    portada = await leerPortada(slug)
  } catch {
    // Sin base de datos —o dormida— esto no puede tumbar el anaquel: la ficha
    // del capítulo se dibuja sin imagen, como cuando aún no tiene ninguna.
    return new NextResponse(null, { status: 404 })
  }
  if (!portada) return new NextResponse(null, { status: 404 })

  const etag = `"${portada.actualizadoEn.getTime().toString(36)}"`
  if (peticion.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }

  return new NextResponse(new Uint8Array(portada.bytes), {
    headers: {
      'Content-Type': portada.mime,
      'Content-Length': String(portada.bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    },
  })
}
