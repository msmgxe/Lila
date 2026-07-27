import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // El contenido público se sirve estático (SSG/ISR). Ver docs/ADR-001.
  experimental: {
    // Las tipografías se autoalojan vía next/font; nada externo en runtime.
    serverActions: {
      /**
       * Por defecto Next corta el cuerpo de una Server Action en 1 MB, y una
       * foto de móvil lo pasa sin despeinarse. El corte ocurre ANTES de que
       * corra nuestro código, así que no había forma de avisar: el envío se
       * caía y la pantalla no decía nada. Era exactamente el síntoma — «no
       * graba ni cambia nada, y no hay mensaje».
       *
       * 8 MB deja sitio al .docx y a la imagen juntos. Los topes de verdad
       * —4 MB el documento, 6 MB la imagen— siguen en `subirCapitulo`, que sí
       * puede explicarse.
       */
      bodySizeLimit: '8mb',
    },
  },
}

export default config
