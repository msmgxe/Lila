import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // El contenido público se sirve estático (SSG/ISR). Ver docs/ADR-001.
  experimental: {
    // Las tipografías se autoalojan vía next/font; nada externo en runtime.
  },
}

export default config
