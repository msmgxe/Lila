import type { Metadata } from 'next'
import './panel.css'

export const metadata: Metadata = {
  title: 'Panel',
  // El panel no se indexa nunca.
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Envoltura común de /panel. NO comprueba la sesión: si lo hiciera, la propia
 * pantalla de entrada quedaría dentro del muro y habría un bucle de redirección.
 * El control está en el layout del grupo (privado).
 */
export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  return children
}
