import { obtenerLibros } from '@/lib/datos'
import { Anaquel } from '@/componentes/Anaquel'

/**
 * El anaquel: la puerta de entrada. Primero se ven los volúmenes, luego se abre
 * uno. Es un Server Component — los datos se resuelven en el servidor y viajan
 * al cliente ya listos.
 */

// Revalidación por tiempo. Al publicar desde el panel (Fase 5) se llamará
// además a revalidatePath para que el cambio salga al momento.
export const revalidate = 3600

export default async function PaginaAnaquel() {
  const libros = await obtenerLibros()
  // El año se calcula en build y viaja como prop: llamar a `new Date()` dentro
  // de un componente cliente provocaría un desajuste de hidratación.
  return <Anaquel libros={libros} anio={new Date().getFullYear()} />
}
