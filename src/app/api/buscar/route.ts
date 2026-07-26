import { NextResponse } from 'next/server'
import { buscar } from '@/lib/datos'

/**
 * Búsqueda global. Es una de las cuatro rutas que el encargo prevé escribir a
 * mano (Neon no genera API REST).
 *
 * Runtime Node.js: el driver de Neon y `server-only` conviven mejor aquí, y la
 * latencia añadida es irrelevante para una consulta con índice GIN.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(peticion: Request) {
  const q = new URL(peticion.url).searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }
  // Tope defensivo: una consulta absurdamente larga no debe llegar al motor.
  if (q.length > 120) {
    return NextResponse.json({ error: 'Consulta demasiado larga' }, { status: 400 })
  }

  try {
    const resultados = await buscar(q)
    return NextResponse.json(
      { resultados },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    // No filtramos el detalle del error al cliente: podría revelar el esquema.
    console.error('[buscar]', error)
    return NextResponse.json({ error: 'La búsqueda ha fallado' }, { status: 500 })
  }
}
