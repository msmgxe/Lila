'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { construirCola, type Emision } from '@/lib/voz/prosodia'
import type { Voz } from '@/lib/tipos'

/**
 * Narración en el navegador (Web Speech API).
 *
 * Es la voz de la maqueta, no la definitiva. La Fase 4 sustituye esto por audio
 * pregenerado con un proveedor de TTS y cacheado en el almacenamiento de
 * objetos — pero la prosodia (dónde y cuánto se calla) ya sale de
 * `lib/voz/prosodia`, que es el módulo que compartirán las dos. Cuando llegue
 * el audio real, `audios[]` del poema tendrá URL y este hook cede el paso.
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
  const [versoActivo, setVersoActivo] = useState<number | null>(null)
  const [disponible, setDisponible] = useState(false)

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activo = useRef(false)
  // Guardamos velocidad y voz en refs para que cambiarlas a mitad de lectura no
  // reinicie la cola: se aplican a partir del siguiente verso.
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
    // Algunos navegadores cargan las voces de forma asíncrona.
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
    setVersoActivo(null)
  }, [])

  const narrar = useCallback(
    (estrofas: string[][], titulo: string, incluirTitulo: boolean) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        alAvisar?.('Este navegador no tiene síntesis de voz.')
        return
      }
      parar()

      const cola: Emision[] = construirCola(estrofas, { titulo, incluirTitulo })
      if (cola.length === 0) return

      const todas = window.speechSynthesis.getVoices().filter((v) => /^es/i.test(v.lang))
      const patron = vozRef.current === 'femenina' ? FEM : MASC
      const elegida = todas.find((v) => patron.test(v.name)) ?? todas[0] ?? null
      if (!elegida) {
        alAvisar?.('No hay voces en español instaladas; se usa la voz por defecto.')
      }
      // Si la voz encontrada no es del género pedido, ajustamos el tono como
      // respaldo. No es ideal, pero es mejor que leer con la voz equivocada.
      const acorde = elegida ? patron.test(elegida.name) : false

      activo.current = true
      setNarrando(true)

      let i = 0
      const siguiente = () => {
        if (!activo.current || i >= cola.length) {
          parar()
          return
        }
        const emision = cola[i++]
        setVersoActivo(emision.indiceVerso)

        const u = new SpeechSynthesisUtterance(emision.texto)
        if (elegida) u.voice = elegida
        u.lang = elegida?.lang ?? 'es-ES'
        u.rate = velocidadRef.current
        u.pitch = acorde ? 1 : vozRef.current === 'femenina' ? 1.25 : 0.75
        u.onend = () => {
          temporizador.current = setTimeout(siguiente, emision.pausaMs / velocidadRef.current)
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

  return { narrando, versoActivo, narrar, parar, disponible }
}
