'use client'

import { useEffect, useState } from 'react'

/**
 * Botón flotante para volver al principio de la página.
 *
 * Nace de un problema concreto: un poemario puede tener cincuenta capítulos, y
 * volver arriba a crear el siguiente eran muchas vueltas de rueda. Aparece solo
 * cuando hay algo a lo que volver —tras pasar de una pantalla y media— y se
 * quita en cuanto se está arriba, para no tapar contenido sin necesidad.
 *
 * `scroll-behavior: smooth` ya está puesto en el documento, pero aquí se pide
 * explícitamente y se respeta `prefers-reduced-motion`: para quien marea el
 * desplazamiento animado, el salto instantáneo es la versión buena.
 */
export function SubirArriba({ etiqueta = 'Volver arriba' }: { etiqueta?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const mirar = () => setVisible(window.scrollY > window.innerHeight * 1.5)
    mirar()
    // `passive`: este oyente no llama a preventDefault, y decírselo al navegador
    // le deja desplazar sin esperar a que termine.
    window.addEventListener('scroll', mirar, { passive: true })
    return () => window.removeEventListener('scroll', mirar)
  }, [])

  return (
    <button
      type="button"
      className={`subir-arriba${visible ? ' visible' : ''}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        })
      }
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{etiqueta}</span>
    </button>
  )
}
