import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Archivo } from 'next/font/google'
import './globals.css'

/**
 * Tipografías autoalojadas con next/font: se descargan en build y se sirven
 * desde nuestro dominio, así que no hay petición a Google en runtime ni salto
 * de maquetación al cargar.
 *
 * Playfair Display para titulares y poemas (los poemas en cursiva, como en la
 * referencia). Archivo para la interfaz: una grotesca con carácter para las
 * versalitas muy interletradas. Nada de Inter, Roboto ni fuentes de sistema.
 */
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--tipo-display',
  display: 'swap',
})

const ui = Archivo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--tipo-ui',
  display: 'swap',
})

/**
 * Base para las URLs absolutas de los metadatos. Se resuelve en el servidor, así
 * que no necesita prefijo NEXT_PUBLIC_ — de hecho el encargo prohíbe ese prefijo
 * para todo. En Vercel, VERCEL_PROJECT_PRODUCTION_URL viene dada.
 */
const baseUrl =
  process.env.SITIO_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Aurelia · el anaquel del poeta',
    template: '%s · Aurelia',
  },
  description:
    'Obra reunida. Cada volumen agrupa los poemas por forma y por época, con la plancha que los acompaña. Se lee, se busca y se escucha.',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'Aurelia',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0E0C0C',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${ui.variable}`}>
      <body>
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  )
}
