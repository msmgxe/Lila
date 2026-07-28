/**
 * Contraste de los diez temas, calculado con la fórmula de la WCAG.
 *
 *   npm run temas:probar
 *
 * Existe porque el contraste no se juzga a ojo: un tema se ve «bien» en la
 * pantalla de quien lo elige y resulta ilegible en la de otro. Comprueba las
 * cuatro parejas que de verdad se leen en el sitio, y falla si alguna baja del
 * mínimo — así un tema nuevo no puede entrar roto.
 */
import { TEMAS } from '../src/lib/temas'

const rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

function lum([r, g, b]: [number, number, number]): number {
  const c = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
}

function contraste(a: string, b: string): number {
  const [alto, bajo] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x)
  return (alto + 0.05) / (bajo + 0.05)
}

/** 4.5 para texto normal, 3.0 para texto grande y elementos de interfaz. */
const PAREJAS = [
  { nombre: 'texto sobre el fondo', de: 't.texto', a: 't.fondo', min: 4.5 },
  { nombre: 'poema sobre el papel', de: 't.secundario', a: 't.primario', min: 4.5 },
  { nombre: 'acento sobre el papel', de: 't.acentoTexto', a: 't.primario', min: 4.5 },
  { nombre: 'resalte sobre el fondo', de: 't.terciario', a: 't.fondo', min: 3.0 },
  { nombre: 'etiquetas sobre el fondo', de: 't.neutro', a: 't.fondo', min: 3.0 },
]

let fallos = 0
for (const t of TEMAS) {
  const valores = PAREJAS.map((p) => {
    const de = (t as unknown as Record<string, string>)[p.de.slice(2)]
    const a = (t as unknown as Record<string, string>)[p.a.slice(2)]
    const r = contraste(de, a)
    if (r < p.min) fallos++
    return { ...p, r }
  })
  const mal = valores.filter((v) => v.r < v.min)
  console.log(`\n  ${mal.length ? '✗' : '✓'} ${t.nombre}`)
  for (const v of valores) {
    const marca = v.r < v.min ? '✗' : ' '
    console.log(`    ${marca} ${v.nombre.padEnd(26)} ${v.r.toFixed(1)}:1  (mínimo ${v.min})`)
  }
}

console.log(fallos === 0 ? '\n  Los diez temas cumplen.\n' : `\n  ${fallos} pareja(s) por debajo del mínimo.\n`)
process.exit(fallos === 0 ? 0 : 1)
