import type { Metadata, Viewport } from 'next'
import {
  Playfair_Display,
  Archivo,
  Cormorant_Garamond,
  EB_Garamond,
  Instrument_Serif,
} from 'next/font/google'
import { SITIO } from '@/lib/sitio'
import { cssDelTema } from '@/lib/temas'
import { obtenerTema } from '@/lib/datos'
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
  variable: '--fuente-playfair',
  display: 'swap',
})

const ui = Archivo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--tipo-ui',
  display: 'swap',
})

/*
 * Las otras tres familias de titulares, para los temas que las piden.
 *
 * Se declaran TODAS aquí aunque cada tema use una: `next/font` las descarga en
 * compilación y las sirve desde nuestro dominio, así que la alternativa —cargar
 * la del tema activo— obligaría a recompilar para cambiar de tema, que es justo
 * lo que se quiere evitar. El coste es unos kilobytes de CSS con las
 * declaraciones; los archivos solo se piden si alguna regla los usa, y solo una
 * lo hace: `--tipo-display` apunta a la del tema.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--fuente-cormorant',
  display: 'swap',
})

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--fuente-garamond',
  display: 'swap',
})

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--fuente-instrument',
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
    default: `${SITIO.nombre} · ${SITIO.lema}`,
    template: `%s · ${SITIO.nombre}`,
  },
  description: SITIO.descripcion,
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: SITIO.nombre,
  },
  robots: { index: true, follow: true },
}

// `themeColor` sale del tema, en el <head> de abajo: aquí quedaría fijo.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = await obtenerTema()

  return (
    <html
      lang="es"
      className={[
        display.variable,
        ui.variable,
        cormorant.variable,
        garamond.variable,
        instrument.variable,
      ].join(' ')}
      data-tema={tema.clave}
    >
      <head>
        {/*
         * El tema, en un `<style>` del documento y no en `globals.css`.
         *
         * El CSS es el mismo para todos los temas: lo único que cambia son
         * estos cinco valores, y viven en la base de datos. Va en el `<head>` y
         * no en el cuerpo para que el navegador lo tenga ANTES de pintar — si
         * llegara después se vería un parpadeo del tema anterior, que es el
         * defecto clásico de los conmutadores de tema.
         */}
        <style dangerouslySetInnerHTML={{ __html: cssDelTema(tema) }} />
        <meta name="theme-color" content={tema.fondo} />
      </head>
      <body>
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  )
}
