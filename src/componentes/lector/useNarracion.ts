'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { construirFrases, type Frase } from '@/lib/voz/prosodia'
import type { Voz } from '@/lib/tipos'

/**
 * Narración en el navegador (Web Speech API).
 *
 * Es la voz de la maqueta, no la definitiva. La Fase 4 la sustituye por audio
 * pregenerado con un proveedor de TTS — pero la prosodia ya sale de
 * `lib/voz/prosodia`, que es el módulo que comparten los dos.
 *
 * Lo importante de aquí: **a la voz se le entrega una frase entera, no un
 * verso**. El sintetizador cierra cada emisión con entonación descendente,
 * como si fuera una oración; darle los versos de uno en uno hace que un poema
 * suene como una lista. Los versos encabalgados van unidos en una sola emisión
 * y el motor los lee de corrido.
 *
 * El resaltado se afina con `onboundary`, que avisa palabra a palabra de por
 * dónde va. Si el navegador no lo emite —pasa con algunas voces de red— se
 * queda iluminada la frase completa, que es exactamente lo que se está
 * leyendo. Degrada sin mentir.
 */

const FEM =
  /(m[oó]nica|paulina|helena|laura|sabina|elvira|dalia|marisol|esperanza|luc[ií]a|female|femen)/i
const MASC = /(jorge|diego|pablo|ra[uú]l|carlos|juan|[aá]lvaro|enrique|male|mascul)/i

interface Opciones {
  voz: Voz
  velocidad: number
  alAvisar?: (mensaje: string) => void
}

export function useNarracion({ voz, velocidad, alAvisar }: Opciones) {
  const [narrando, setNarrando] = useState(false)
  const [versosActivos, setVersosActivos] = useState<number[]>([])
  const [disponible, setDisponible] = useState(false)

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activo = useRef(false)
  // Velocidad y voz en refs para que cambiarlas a mitad de lectura no reinicie
  // la cola: se aplican a partir de la frase siguiente.
  const velocidadRef = useRef(velocidad)
  const vozRef = useRef(voz)

  useEffect(() => {
    velocidadRef.current = velocidad
  }, [velocidad])
  useEffect(() => {
    vozRef.current = voz
  }, [voz])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setDisponible(true)
    const alCambiar = () => setDisponible(true)
    window.speechSynthesis.addEventListener('voiceschanged', alCambiar)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', alCambiar)
  }, [])

  const parar = useCallback(() => {
    activo.current = false
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = null
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* algunos navegadores lanzan si no hay nada en curso */
    }
    setNarrando(false)
    setVersosActivos([])
  }, [])

  const narrar = useCallback(
    (estrofas: string[][], titulo: string, incluirTitulo: boolean) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        alAvisar?.('Este navegador no tiene síntesis de voz.')
        return
      }
      parar()

      const frases: Frase[] = construirFrases(estrofas, { titulo, incluirTitulo })
      if (frases.length === 0) return

      const todas = window.speechSynthesis.getVoices().filter((v) => /^es/i.test(v.lang))
      const patron = vozRef.current === 'femenina' ? FEM : MASC
      const elegida = todas.find((v) => patron.test(v.name)) ?? todas[0] ?? null
      if (!elegida) {
        alAvisar?.('No hay voces en español instaladas; se usa la voz por defecto.')
      }
      // Si la voz encontrada no es del género pedido, se ajusta el tono como
      // respaldo. No es ideal, pero es mejor que leer con la voz equivocada.
      const acorde = elegida ? patron.test(elegida.name) : false

      activo.current = true
      setNarrando(true)

      let i = 0
      const siguiente = () => {
        if (!activo.current || i >= frases.length) {
          parar()
          return
        }
        const frase = frases[i++]
        // De entrada se ilumina la frase entera; `onboundary` la irá afinando.
        setVersosActivos(frase.versos)

        const u = new SpeechSynthesisUtterance(frase.texto)
        if (elegida) u.voice = elegida
        u.lang = elegida?.lang ?? 'es-ES'
        u.rate = velocidadRef.current
        u.pitch = acorde ? 1 : vozRef.current === 'femenina' ? 1.25 : 0.75

        u.onboundary = (e) => {
          if (!activo.current || frase.tramos.length === 0) return
          const pos = e.charIndex ?? 0
          const tramo =
            frase.tramos.find((t) => pos >= t.inicio && pos < t.fin) ??
            // Entre dos versos (el espacio que los une): se mantiene el último
            // que ya había empezado.
            [...frase.tramos].reverse().find((t) => t.inicio <= pos)
          if (tramo) setVersosActivos([tramo.verso])
        }

        u.onend = () => {
          temporizador.current = setTimeout(siguiente, frase.pausaMs / velocidadRef.current)
        }
        u.onerror = () => {
          temporizador.current = setTimeout(siguiente, 120)
        }
        window.speechSynthesis.speak(u)
      }
      siguiente()
    },
    [parar, alAvisar],
  )

  // Cortar la voz si se abandona la página: si no, sigue hablando sola.
  useEffect(() => {
    const alSalir = () => parar()
    window.addEventListener('beforeunload', alSalir)
    window.addEventListener('pagehide', alSalir)
    return () => {
      window.removeEventListener('beforeunload', alSalir)
      window.removeEventListener('pagehide', alSalir)
      parar()
    }
  }, [parar])

  return { narrando, versosActivos, narrar, parar, disponible }
}
