'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { construirFrases, type Frase , ENTONACION} from '@/lib/voz/prosodia'
import { elegirVoz, vocesEnEspanol, type VozDelSistema } from '@/lib/voz/voces'
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
 * suene como una lista. Cada verso va en su propia emisión, con su pausa detrás
 * y el motor los lee de corrido.
 *
 * El resaltado se afina con `onboundary`, que avisa palabra a palabra de por
 * dónde va. Si el navegador no lo emite —pasa con algunas voces de red— se
 * queda iluminada la frase completa, que es exactamente lo que se está
 * leyendo. Degrada sin mentir.
 */

interface Opciones {
  voz: Voz
  velocidad: number
  /** URI de una voz concreta elegida a mano. Manda sobre el conmutador M/F. */
  vozPreferida?: string | null
  alAvisar?: (mensaje: string) => void
}

export function useNarracion({ voz, velocidad, vozPreferida, alAvisar }: Opciones) {
  const [narrando, setNarrando] = useState(false)
  const [versosActivos, setVersosActivos] = useState<number[]>([])
  const [disponible, setDisponible] = useState(false)
  /** Las voces en español del sistema, para poder enseñarlas y elegirlas. */
  const [voces, setVoces] = useState<VozDelSistema[]>([])

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activo = useRef(false)
  // Velocidad y voz en refs para que cambiarlas a mitad de lectura no reinicie
  // la cola: se aplican a partir de la frase siguiente.
  const velocidadRef = useRef(velocidad)
  const vozRef = useRef(voz)
  const preferidaRef = useRef(vozPreferida)

  useEffect(() => {
    velocidadRef.current = velocidad
  }, [velocidad])
  useEffect(() => {
    vozRef.current = voz
  }, [voz])
  useEffect(() => {
    preferidaRef.current = vozPreferida
  }, [vozPreferida])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setDisponible(true)
    // La lista tarda en llegar en algunos navegadores: se guarda en estado en
    // cuanto aparece, para poder enseñarla sin esperar a que se pulse «Narrar».
    const leer = () => setVoces(vocesEnEspanol(window.speechSynthesis.getVoices()))
    leer()
    window.speechSynthesis.addEventListener('voiceschanged', leer)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', leer)
  }, [])

  /** Qué voz sonaría ahora mismo, para poder enseñarlo en la interfaz. */
  const vozActual =
    voces.find((v) => v.uri === vozPreferida) ?? elegirVoz(voces, voz).voz ?? null

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

      const todas = window.speechSynthesis.getVoices()
      const disponibles = vocesEnEspanol(todas)
      const aMano = preferidaRef.current
        ? disponibles.find((v) => v.uri === preferidaRef.current)
        : undefined
      const { voz: escogida, acorde: acordeAuto } = elegirVoz(disponibles, vozRef.current)
      const ficha = aMano ?? escogida
      const acorde = aMano ? aMano.genero === vozRef.current : acordeAuto
      const elegida = ficha ? (todas.find((v) => v.voiceURI === ficha.uri) ?? null) : null

      if (!elegida) {
        alAvisar?.('No hay voces en español instaladas; se usa la voz por defecto.')
      } else if (!acorde) {
        // No se disimula: se dice qué voz suena y por qué no es la pedida.
        alAvisar?.(
          `Tu sistema no tiene voz ${vozRef.current} en español. Suena «${ficha!.nombre}» con el tono ajustado.`,
        )
      }

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
        // Sin voz del género pedido, el tono es lo único que queda. No todos los
        // motores lo atienden, de ahí el aviso de arriba.
        const base = acorde ? 1 : vozRef.current === 'femenina' ? 1.35 : 0.6

        /*
         * Y encima, la entonación de ESTE verso.
         *
         * Web Speech no entiende de curvas: aplica un `pitch` plano a toda la
         * emisión. Pero como cada verso es su propia emisión, subir el tono en
         * una exclamación basta para que se oiga como lo que es —una proclama—
         * en vez de como una línea más de una lista. Es el ajuste que separa
         * «¡qué maravillosa estación la breve primavera!» de leerla de carrerilla.
         */
        const entonacion = ENTONACION[frase.tono]
        u.rate = velocidadRef.current * entonacion.rate
        // El tope de `pitch` es 2 en la especificación; la voz masculina parte
        // de 0.6 y no llega, pero la femenina de 1.35 sí se pasaría.
        u.pitch = Math.min(2, base * entonacion.pitch)

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

  return { narrando, versosActivos, narrar, parar, disponible, voces, vozActual }
}
